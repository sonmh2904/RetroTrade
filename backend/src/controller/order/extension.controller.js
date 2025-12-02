const mongoose = require("mongoose");
const { Types } = mongoose;
const Order = require("../../models/Order/Order.model");
const ExtensionRequest = require("../../models/Order/ExtensionRequest.model"); 
const Item = require("../../models/Product/Item.model");
const { calculateTotals } = require("../order/calculateRental"); 
const { createNotification } = require("../../middleware/createNotification");
const { logOrderAudit } = require("../../middleware/auditLog.service");

// Helper: Tính phí gia hạn (tái sử dụng calculateTotals, chỉ rental cho phần thêm)
async function calculateExtensionFee(
  item,
  quantity,
  currentEndAt,
  newEndAt,
  priceUnitId
) {
  const extensionStartAt = new Date(currentEndAt); // Bắt đầu từ endAt cũ
  const calc = await calculateTotals(
    item,
    quantity,
    extensionStartAt,
    newEndAt
  );
  if (!calc) return null;

  // Tính duration mới dựa trên unit
  const unitInDays = { 1: 1 / 24, 2: 1, 3: 7, 4: 30 }[priceUnitId] || 1;
  const diffMs = newEndAt - extensionStartAt;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const extensionDuration = Math.ceil(diffDays / unitInDays);

  return {
    extensionFee: calc.rentalAmount, // Chỉ rental, không deposit/serviceFee
    extensionDuration,
    extensionUnit: calc.unitName,
  };
}

// Helper: Tính newEndAt dựa trên duration và unit
function calculateNewEndAt(currentEndAt, extensionDuration, priceUnitId) {
  const newEndAt = new Date(currentEndAt);
  const unitInDays = { 1: 1 / 24, 2: 1, 3: 7, 4: 30 }[priceUnitId] || 1;
  const hoursToAdd = extensionDuration * unitInDays * 24; // Convert to hours
  newEndAt.setHours(newEndAt.getHours() + hoursToAdd);
  return newEndAt;
}

module.exports = {
  // 1. Renter yêu cầu gia hạn (UC-028)
  requestExtension: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const renterId = req.user._id;
      const orderId = req.params.id;
      const { extensionDuration, notes = "" } = req.body; // extensionDuration: số unit (e.g., 1 cho +1 ngày)

      if (!Types.ObjectId.isValid(orderId)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "ID đơn hàng không hợp lệ" });
      }

      if (!extensionDuration || extensionDuration < 1) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Thời gian gia hạn phải lớn hơn 0" });
      }

      const order = await Order.findById(orderId)
        .populate("itemId")
        .session(session);
      if (
        !order ||
        order.isDeleted ||
        order.renterId.toString() !== renterId.toString()
      ) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(403)
          .json({ message: "Không có quyền hoặc đơn không tồn tại" });
      }

      if (order.orderStatus !== "progress") {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Chỉ có thể gia hạn khi đang thuê (progress)" });
      }

      const item = order.itemId;
      if (!item || item.IsDeleted || item.StatusId !== 2) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Sản phẩm không khả dụng" });
      }

      // Tính newEndAt
      const newEndAt = calculateNewEndAt(
        order.endAt,
        extensionDuration,
        item.PriceUnitId
      );

      // Kiểm tra không vượt max duration
      if (order.rentalDuration + extensionDuration > item.MaxRentalDuration) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Không thể gia hạn vượt quá ${
            item.MaxRentalDuration
          } ${getUnitName(item.PriceUnitId)}`,
        });
      }

      // Tính phí gia hạn
      const feeCalc = await calculateExtensionFee(
        item,
        order.unitCount,
        order.endAt,
        newEndAt,
        item.PriceUnitId
      );
      if (!feeCalc) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Không thể tính phí gia hạn" });
      }

      // Kiểm tra pending request cho order này
      const pendingRequest = await ExtensionRequest.findOne({
        orderId: order._id,
        status: "pending",
      }).session(session);
      if (pendingRequest) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Đã có yêu cầu gia hạn đang chờ xử lý" });
      }

      // Tạo ExtensionRequest mới
      const newExtensionRequest = await ExtensionRequest.create(
        [
          {
            orderId: order._id,
            requestedEndAt: newEndAt,
            extensionDuration: feeCalc.extensionDuration,
            extensionUnit: feeCalc.extensionUnit,
            extensionFee: feeCalc.extensionFee,
            status: "pending",
            requestedBy: renterId,
            notes,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      const request = newExtensionRequest[0];

      // Notification cho Owner sử dụng createNotification
      await createNotification(
        order.ownerId,
        "Extension Request",
        "Yêu cầu gia hạn thuê",
        `Người thuê yêu cầu gia hạn đơn #${order.orderGuid} thêm ${
          notes ? notes : ""
        }. Phí: ${feeCalc.extensionFee}đ`,
        {
          orderId: order._id,
          type: "extension_request",
          extensionDuration: feeCalc.extensionDuration,
          extensionUnit: feeCalc.extensionUnit,
          extensionFee: feeCalc.extensionFee,
          requestId: request._id,
        }
      );

      await logOrderAudit({
        orderId: order._id,
        operation: "UPDATE",
        userId: renterId,
        changeSummary: `Yêu cầu gia hạn: +${feeCalc.extensionDuration} ${feeCalc.extensionUnit}, phí: ${feeCalc.extensionFee}đ, notes: ${notes}`,
      });

      return res.status(200).json({
        message: "Yêu cầu gia hạn đã gửi thành công",
        data: {
          requestId: request._id,
          newEndAt: newEndAt.toISOString(),
          extensionFee: feeCalc.extensionFee,
          extensionDuration: feeCalc.extensionDuration,
          extensionUnit: feeCalc.extensionUnit,
        },
      });
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
      console.error("Lỗi yêu cầu gia hạn:", err);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
  },

  // 2. Owner approve gia hạn
  approveExtension: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const ownerId = req.user._id;
      const orderId = req.params.orderId;
      const requestId = req.params.requestId;

      if (
        !Types.ObjectId.isValid(orderId) ||
        !Types.ObjectId.isValid(requestId)
      ) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "ID không hợp lệ" });
      }

      const order = await Order.findById(orderId).session(session);
      if (
        !order ||
        order.isDeleted ||
        order.ownerId.toString() !== ownerId.toString()
      ) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ message: "Không có quyền" });
      }

      const extensionReq = await ExtensionRequest.findOne({
        _id: requestId,
        orderId: order._id,
        status: "pending",
      }).session(session);
      if (!extensionReq) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ message: "Yêu cầu không tồn tại hoặc đã xử lý" });
      }

      // Cập nhật request status
      extensionReq.status = "approved";
      extensionReq.approvedBy = ownerId;
      extensionReq.updatedAt = new Date();
      await extensionReq.save({ session });

      // Update order: endAt mới, totalAmount/finalAmount += extensionFee
      order.endAt = extensionReq.requestedEndAt;
      order.totalAmount += extensionReq.extensionFee;
      order.finalAmount += extensionReq.extensionFee;
      order.rentalDuration += extensionReq.extensionDuration;

      // Cập nhật item RentCount (tăng theo duration mới)
      const item = await Item.findById(order.itemId).session(session);
      if (item) {
        item.RentCount = (item.RentCount || 0) + extensionReq.extensionDuration;
        await item.save({ session });
      }

      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Notification cho Renter sử dụng createNotification
      await createNotification(
        order.renterId,
        "Extension Approved",
        "Gia hạn thuê đã được phê duyệt",
        `Chủ thuê đã phê duyệt gia hạn đơn #${order.orderGuid} thêm ${extensionReq.extensionDuration} ${extensionReq.extensionUnit}. Phí thêm: ${extensionReq.extensionFee}đ`,
        {
          orderId: order._id,
          type: "extension_approved",
          extensionDuration: extensionReq.extensionDuration,
          extensionUnit: extensionReq.extensionUnit,
          extensionFee: extensionReq.extensionFee,
          newEndAt: order.endAt.toISOString(),
        }
      );

      await logOrderAudit({
        orderId: order._id,
        operation: "UPDATE",
        userId: ownerId,
        changeSummary: `Approve gia hạn (ID: ${requestId}): +${extensionReq.extensionDuration} ${extensionReq.extensionUnit}, phí thêm: ${extensionReq.extensionFee}đ`,
      });

      return res.status(200).json({
        message: "Gia hạn đã được phê duyệt thành công",
        data: {
          newEndAt: order.endAt.toISOString(),
          additionalFee: extensionReq.extensionFee,
        },
      });
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
      console.error("Lỗi approve gia hạn:", err);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
  },

  // 3. Owner reject gia hạn
  rejectExtension: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const ownerId = req.user._id;
      const orderId = req.params.orderId;
      const requestId = req.params.requestId;
      const { rejectReason = "" } = req.body;

      if (
        !Types.ObjectId.isValid(orderId) ||
        !Types.ObjectId.isValid(requestId)
      ) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "ID không hợp lệ" });
      }

      const order = await Order.findById(orderId).session(session);
      if (
        !order ||
        order.isDeleted ||
        order.ownerId.toString() !== ownerId.toString()
      ) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ message: "Không có quyền" });
      }

      const extensionReq = await ExtensionRequest.findOne({
        _id: requestId,
        orderId: order._id,
        status: "pending",
      }).session(session);
      if (!extensionReq) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ message: "Yêu cầu không tồn tại hoặc đã xử lý" });
      }

      // Cập nhật status
      extensionReq.status = "rejected";
      extensionReq.approvedBy = ownerId;
      extensionReq.notes += `\nReject reason: ${rejectReason}`;
      extensionReq.updatedAt = new Date();
      await extensionReq.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Notification cho Renter sử dụng createNotification
      await createNotification(
        order.renterId,
        "Extension Rejected",
        "Gia hạn thuê bị từ chối",
        `Chủ thuê đã từ chối gia hạn đơn #${order.orderGuid}. Lý do: ${rejectReason}`,
        {
          orderId: order._id,
          type: "extension_rejected",
          requestId: requestId,
          rejectReason,
        }
      );

      await logOrderAudit({
        orderId: order._id,
        operation: "UPDATE",
        userId: ownerId,
        changeSummary: `Reject gia hạn (ID: ${requestId}): Lý do: ${rejectReason}`,
      });

      return res.status(200).json({ message: "Yêu cầu gia hạn đã bị từ chối" });
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
      console.error("Lỗi reject gia hạn:", err);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
  },

  // Bonus: Lấy danh sách extension requests cho order (cho cả renter/owner xem)
  getExtensionRequests: async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const userId = req.user._id;

      if (!Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: "ID không hợp lệ" });
      }

      const order = await Order.findById(orderId).lean();
      if (!order || order.isDeleted) {
        return res.status(404).json({ message: "Đơn không tồn tại" });
      }

      // Check quyền: renter hoặc owner
      if (
        order.renterId.toString() !== userId.toString() &&
        order.ownerId.toString() !== userId.toString()
      ) {
        return res.status(403).json({ message: "Không có quyền" });
      }

      const requests = await ExtensionRequest.find({ orderId: order._id })
        .populate("requestedBy", "fullName avatarUrl")
        .populate("approvedBy", "fullName avatarUrl")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        message: "OK",
        data: requests,
      });
    } catch (err) {
      console.error("Lỗi lấy extension requests:", err);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
  },
};

// Helper getUnitName (nếu chưa có, copy từ calculateRental)
function getUnitName(unitId) {
  const names = { 1: "giờ", 2: "ngày", 3: "tuần", 4: "tháng" };
  return names[unitId] || "ngày";
}
