const mongoose = require("mongoose");
const { Types } = mongoose;
const Order = require("../../models/Order/Order.model");
const ExtensionRequest = require("../../models/Order/ExtensionRequest.model");
const Item = require("../../models/Product/Item.model");
const { calculateTotals } = require("../order/calculateRental");
const { createNotification } = require("../../middleware/createNotification");
const { logOrderAudit } = require("../../middleware/auditLog.service");
const { validateAndCompute } = require("./discount.controller");
const {
  refundExtensionRequest,
} = require("../wallet/refundCancelledOrder.Controller");


// Helper: Tính phí gia hạn dựa trên khoảng thời gian mới
async function calculateExtensionFee(
  item,
  quantity,
  currentEndAt,
  newEndAt,
  priceUnitId
) {
  const extensionStartAt = new Date(currentEndAt);
  const calc = await calculateTotals(
    item,
    item,
    quantity,
    extensionStartAt,
    newEndAt
  );
  if (!calc) return null;

  const unitInDays = { 1: 1 / 24, 2: 1, 3: 7, 4: 30 }[priceUnitId] || 1;
  const diffMs = newEndAt - extensionStartAt;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const extensionDuration = Math.ceil(diffDays / unitInDays);

  return {
    extensionFee: calc.rentalAmount + calc.serviceFee,
    serviceFee: calc.serviceFee || 0,
    extensionDuration,
    extensionUnit: calc.unitName,
    baseForDiscount: calc.rentalAmount,
  };
}

// Helper: Tính ngày kết thúc mới dựa trên số lượng đơn vị gia hạn
function calculateNewEndAt(currentEndAt, extensionDuration, priceUnitId) {
  const newEndAt = new Date(currentEndAt);
  const unitInDays = { 1: 1 / 24, 2: 1, 3: 7, 4: 30 }[priceUnitId] || 1;
  const hoursToAdd = extensionDuration * unitInDays * 24;
  newEndAt.setHours(newEndAt.getHours() + hoursToAdd);
  return newEndAt;
}

// Helper: Trả về tên đơn vị (giờ/ngày/tuần/tháng)
function getUnitName(unitId) {
  const names = { 1: "giờ", 2: "ngày", 3: "tuần", 4: "tháng" };
  return names[unitId] || "ngày";
}

module.exports = {
  // 1. Renter yêu cầu gia hạn
  requestExtension: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const renterId = req.user._id;
      const orderId = req.params.id;
      const {
        extensionDuration,
        notes = "",
        publicDiscountCode,
        privateDiscountCode,
      } = req.body;

      // Validate đầu vào cơ bản
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

      // Tìm đơn hàng và kiểm tra quyền
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

      // Chỉ được gia hạn khi đơn đang trong trạng thái "đang thuê"
      if (order.orderStatus !== "progress") {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Chỉ có thể gia hạn khi đang thuê" });
      }

      const item = order.itemId;
      if (!item || item.IsDeleted || item.StatusId !== 2) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Sản phẩm hiện không khả dụng" });
      }

      // Tính ngày kết thúc mới
      const newEndAt = calculateNewEndAt(
        order.endAt,
        extensionDuration,
        item.PriceUnitId
      );

      // Kiểm tra không vượt quá thời gian thuê tối đa của sản phẩm
      if (order.rentalDuration + extensionDuration > item.MaxRentalDuration) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Không thể gia hạn vượt quá ${
            item.MaxRentalDuration
          } ${getUnitName(item.PriceUnitId)}`,
        });
      }

      // Tính toán phí gia hạn (dùng hàm chung calculateTotals)
      const extensionStartAt = new Date(order.endAt);
      const calc = await calculateTotals(
        item,
        order.unitCount,
        extensionStartAt,
        newEndAt
      );

      if (!calc) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Không thể tính phí gia hạn" });
      }

      let totalDiscountAmount = 0;
      let discountInfo = null;

      const publicCode = publicDiscountCode?.trim();
      const privateCode = privateDiscountCode?.trim();

      // Áp dụng mã giảm giá công khai (nếu có)
      if (publicCode) {
        const result = await validateAndCompute({
          code: publicCode,
          baseAmount: calc.rentalAmount,
          ownerId: item.OwnerId,
          itemId: item._id,
          userId: renterId,
        });

        if (result.valid && result.amount > 0) {
          totalDiscountAmount += result.amount;
          discountInfo = {
            code: publicCode.toUpperCase(),
            type: result.discount.type,
            value: result.discount.value,
            amountApplied: result.amount,
          };
        }
      }

      // Áp dụng mã giảm giá riêng (nếu còn dư sau mã công khai)
      if (privateCode && totalDiscountAmount < calc.rentalAmount) {
        const remaining = calc.rentalAmount - totalDiscountAmount;
        const result = await validateAndCompute({
          code: privateCode,
          baseAmount: remaining,
          ownerId: item.OwnerId,
          itemId: item._id,
          userId: renterId,
        });

        if (result.valid && result.amount > 0) {
          const applyAmt = Math.min(result.amount, remaining);
          totalDiscountAmount += applyAmt;

          if (!discountInfo) {
            discountInfo = {};
          }
          discountInfo.secondaryCode = privateCode.toUpperCase();
          discountInfo.secondaryType = result.discount.type;
          discountInfo.secondaryValue = result.discount.value;
          discountInfo.secondaryAmountApplied = applyAmt;
          discountInfo.totalAmountApplied = totalDiscountAmount;
        }
      }

      // Phí gia hạn cuối cùng = tiền thuê + phí dịch vụ - giảm giá
      const finalExtensionFee = Math.max(
        0,
        calc.rentalAmount + calc.serviceFee - totalDiscountAmount
      );

      // Không cho tạo mới nếu đã có yêu cầu đang chờ
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

      // Tạo yêu cầu gia hạn mới
      const newExtensionRequest = await ExtensionRequest.create(
        [
          {
            orderId: order._id,
            originalEndAt: order.endAt,
            requestedEndAt: newEndAt,
            extensionDuration: calc.duration,
            extensionUnit: calc.unitName,
            extensionFee: finalExtensionFee,
            serviceFee: calc.serviceFee || 0,
            originalExtensionFee: calc.rentalAmount + calc.serviceFee,
            discount: discountInfo,
            paymentStatus: "unpaid",
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

      // Gửi thông báo cho chủ sản phẩm
      await createNotification(
        order.ownerId,
        "Extension Request",
        "Yêu cầu gia hạn thuê",
        `Người thuê yêu cầu gia hạn đơn #${order.orderGuid} thêm ${
          calc.duration
        } ${
          calc.unitName
        }. Phí: ${finalExtensionFee.toLocaleString()}đ (chưa thanh toán).`,
        {
          orderId: order._id,
          type: "extension_request",
          extensionDuration: calc.duration,
          extensionUnit: calc.unitName,
          extensionFee: finalExtensionFee,
          requestId: request._id,
        }
      );

      await logOrderAudit({
        orderId: order._id,
        operation: "UPDATE",
        userId: renterId,
        changeSummary: `Yêu cầu gia hạn: +${calc.duration} ${
          calc.unitName
        }, phí: ${finalExtensionFee.toLocaleString()}đ${
          discountInfo ? ` (giảm ${totalDiscountAmount.toLocaleString()}đ)` : ""
        }`,
      });

      return res.status(200).json({
        message: "Yêu cầu gia hạn đã gửi thành công",
        data: {
          requestId: request._id,
          newEndAt: newEndAt.toISOString(),
          extensionFee: finalExtensionFee,
          extensionDuration: calc.duration,
          extensionUnit: calc.unitName,
          discount: discountInfo,
        },
      });
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
  },

  // 2. Chủ sản phẩm duyệt yêu cầu gia hạn
  approveExtension: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const ownerId = req.user._id;
      const orderId = req.params.id;
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

      // Bắt buộc phải thanh toán trước khi duyệt
      if (extensionReq.paymentStatus !== "paid") {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Yêu cầu chưa được thanh toán" });
      }

      // Cập nhật trạng thái yêu cầu
      extensionReq.status = "approved";
      extensionReq.approvedBy = ownerId;
      extensionReq.updatedAt = new Date();
      await extensionReq.save({ session });

      // Cập nhật đơn hàng: kéo dài thời gian, cộng thêm phí đã thu
      order.endAt = extensionReq.requestedEndAt;
      order.totalAmount += extensionReq.extensionFee;
      order.finalAmount += extensionReq.extensionFee;
      order.rentalDuration += extensionReq.extensionDuration;
      order.serviceFee += extensionReq.serviceFee || 0;

      // Cập nhật lượt thuê của sản phẩm
      const item = await Item.findById(order.itemId).session(session);
      if (item) {
        item.RentCount = (item.RentCount || 0) + extensionReq.extensionDuration;
        await item.save({ session });
      }

      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Thông báo cho người thuê
      await createNotification(
        order.renterId,
        "Extension Approved",
        "Gia hạn thuê đã được duyệt",
        `Chủ sản phẩm đã duyệt gia hạn đơn #${order.orderGuid} thêm ${extensionReq.extensionDuration} ${extensionReq.extensionUnit}.`,
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
        changeSummary: `Duyệt gia hạn #${requestId}: +${
          extensionReq.extensionDuration
        } ${
          extensionReq.extensionUnit
        }, phí thêm: ${extensionReq.extensionFee.toLocaleString()}đ`,
      });

      return res.status(200).json({
        message: "Gia hạn đã được duyệt thành công",
        data: {
          newEndAt: order.endAt.toISOString(),
          additionalFee: extensionReq.extensionFee,
        },
      });
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
  },

  // 3. Chủ sản phẩm từ chối yêu cầu gia hạn (hoàn tiền nếu đã thanh toán)
  rejectExtension: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const ownerId = req.user._id;
      const orderId = req.params.id;
      const requestId = req.params.requestId;
      const { rejectReason = "" } = req.body;

      if (
        !Types.ObjectId.isValid(orderId) ||
        !Types.ObjectId.isValid(requestId)
      ) {
        throw new Error("ID không hợp lệ");
      }

      const order = await Order.findById(orderId).session(session);
      if (!order || order.ownerId.toString() !== ownerId.toString()) {
        throw new Error("Không có quyền");
      }

      const extensionReq = await ExtensionRequest.findOne({
        _id: requestId,
        orderId: order._id,
        status: "pending",
      }).session(session);

      if (!extensionReq) {
        throw new Error("Yêu cầu không tồn tại hoặc đã xử lý");
      }

      // Cập nhật trạng thái từ chối
      extensionReq.status = "rejected";
      extensionReq.approvedBy = ownerId;
      extensionReq.rejectedReason = rejectReason;
      extensionReq.notes += `\n[Từ chối] Lý do: ${rejectReason}`;
      extensionReq.updatedAt = new Date();
      await extensionReq.save({ session });

      // Nếu đã thanh toán → hoàn tiền tự động
      if (
        extensionReq.paymentStatus === "paid" &&
        extensionReq.extensionFee > 0
      ) {
        await refundExtensionRequest(requestId, session);

        // Khôi phục lại thông tin đơn hàng về trạng thái cũ
        order.endAt = extensionReq.originalEndAt;
        order.totalAmount -= extensionReq.extensionFee;
        order.finalAmount -= extensionReq.extensionFee;
        order.rentalDuration -= extensionReq.extensionDuration;
        order.serviceFee -= extensionReq.serviceFee || 0;
        await order.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      const notifBody =
        extensionReq.paymentStatus === "refunded"
          ? `Yêu cầu gia hạn bị từ chối và đã hoàn ${extensionReq.extensionFee.toLocaleString()}đ vào ví của bạn.`
          : `Yêu cầu gia hạn bị từ chối. Lý do: ${rejectReason || "Không rõ"}`;

      await createNotification(
        order.renterId,
        "Extension Rejected",
        "Gia hạn thuê bị từ chối",
        notifBody,
        { orderId: order._id, requestId, rejectReason }
      );

      await logOrderAudit({
        orderId: order._id,
        operation: "UPDATE",
        userId: ownerId,
        changeSummary: `Từ chối gia hạn #${requestId}${
          extensionReq.paymentStatus === "refunded" ? " - Đã hoàn tiền" : ""
        }`,
      });

      return res.status(200).json({
        message:
          "Từ chối gia hạn thành công" +
          (extensionReq.paymentStatus === "refunded" ? " và đã hoàn tiền" : ""),
      });
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
      return res.status(500).json({ message: err.message || "Lỗi server" });
    }
  },

  // 4. Lấy danh sách yêu cầu gia hạn của một đơn hàng
  getExtensionRequests: async (req, res) => {
    try {
      const { id: orderId } = req.params;
      const userId = req.user._id;

      if (!Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: "ID đơn hàng không hợp lệ" });
      }

      const order = await Order.findById(orderId);
      if (
        !order ||
        order.isDeleted ||
        ![order.renterId.toString(), order.ownerId.toString()].includes(
          userId.toString()
        )
      ) {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      const requests = await ExtensionRequest.find({ orderId })
        .populate({
          path: "requestedBy",
          select: "fullName avatarUrl",
          model: "User",
        })
        .populate({
          path: "approvedBy",
          select: "fullName avatarUrl",
          model: "User",
        })
        .populate({
          path: "orderId",
          select: "startAt endAt rentalDuration itemId",
          populate: {
            path: "itemId",
            select: "Title PriceUnitId",
          },
        })
        .sort({ createdAt: -1 });

      return res.status(200).json({
        code: 200,
        message: "Success",
        data: requests,
      });
    } catch (err) {
      return res.status(500).json({ code: 500, message: "Lỗi server" });
    }
  },
};
