const mongoose = require("mongoose");
const { Types } = mongoose;
const Order = require("../../models/Order/Order.model");
const ExtensionRequest = require("../../models/Order/ExtensionRequest.model");
const Item = require("../../models/Product/Item.model");
const { calculateTotals } = require("../order/calculateRental");
const { createNotification } = require("../../middleware/createNotification");
const { logOrderAudit } = require("../../middleware/auditLog.service");
const Discount = require("../../models/Discount/Discount.model");
const DiscountAssignment = require("../../models/Discount/DiscountAssignment.model");
const DiscountRedemption = require("../../models/Discount/DiscountRedemption.model");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const User = require("../../models/User.model");

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
    extensionFee: calc.rentalAmount + calc.serviceFee,
    serviceFee: calc.serviceFee || 0, // NEW: Return riêng serviceFee
    extensionDuration,
    extensionUnit: calc.unitName,
    baseForDiscount: calc.rentalAmount, // Để áp dụng discount tương tự order
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

// Helper getUnitName (di chuyển lên global)
function getUnitName(unitId) {
  const names = { 1: "giờ", 2: "ngày", 3: "tuần", 4: "tháng" };
  return names[unitId] || "ngày";
}

// Helper: Validate và tính discount (tái sử dụng từ discount.controller, nhưng inline để đơn giản)
async function validateAndComputeDiscount(
  code,
  baseAmount,
  ownerId,
  itemId,
  userId,
  isPublic = true
) {
  if (!code) return { valid: false, reason: "No code provided" };

  const discount = await Discount.findOne({
    code: code.toUpperCase(),
    isActive: true,
    ownerId: isPublic ? ownerId : userId, // Public: owner, Private: user
    isPublic,
    expiryDate: { $gt: new Date() },
  });

  if (!discount) {
    return { valid: false, reason: "Discount not found or expired" };
  }

  // Kiểm tra usage limit
  if (discount.usedCount >= discount.maxUses) {
    return { valid: false, reason: "Discount usage limit exceeded" };
  }

  // Tính amount
  let amount = 0;
  if (discount.type === "percentage") {
    amount = Math.min(
      baseAmount * (discount.value / 100),
      discount.maxDiscountAmount || Infinity
    );
  } else if (discount.type === "fixed") {
    amount = Math.min(discount.value, baseAmount);
  }

  return {
    valid: true,
    discount,
    amount,
    reason: amount > 0 ? "" : "Discount amount is zero",
  };
}

module.exports = {
  // 1. Renter yêu cầu gia hạn (UC-028) - Cập nhật với discount logic giống createOrder
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
      } = req.body; // Thêm discount codes giống createOrder

      console.log(
        `[requestExtension] OrderId: ${orderId}, RenterId: ${renterId}, Duration: ${extensionDuration}, PublicCode: ${publicDiscountCode}, PrivateCode: ${privateDiscountCode}`
      ); // Enhanced log

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

      // Tính phí gia hạn (base)
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

      let totalDiscountAmount = 0;
      let discountInfo = null;

      const publicCode = publicDiscountCode;
      const privateCode = privateDiscountCode;

      // --- Public Discount ---
      if (publicCode) {
        const result = await validateAndComputeDiscount(
          publicCode,
          feeCalc.baseForDiscount,
          item.OwnerId,
          item._id,
          renterId,
          true // isPublic
        );

        if (result.valid && result.amount > 0) {
          totalDiscountAmount += result.amount;
          discountInfo = {
            code: publicCode.toUpperCase(),
            type: result.discount.type,
            value: result.discount.value,
            amountApplied: result.amount,
            _publicDiscountData: {
              discount: result.discount,
              amount: result.amount,
            },
          };
        } else if (!result.valid) {
          console.log(
            `[DISCOUNT] Public code thất bại: ${publicCode} - Lý do: ${result.reason}`
          );
        }
      }

      // --- Private Discount (chỉ áp dụng nếu còn base để giảm) ---
      if (privateCode && totalDiscountAmount < feeCalc.baseForDiscount) {
        const remainingBase = feeCalc.baseForDiscount - totalDiscountAmount;
        const result = await validateAndComputeDiscount(
          privateCode,
          remainingBase,
          item.OwnerId,
          item._id,
          renterId,
          false // not public
        );

        if (result.valid && result.amount > 0) {
          const applyAmt = Math.min(result.amount, remainingBase);
          totalDiscountAmount += applyAmt;

          if (discountInfo) {
            discountInfo.secondaryCode = privateCode.toUpperCase();
            discountInfo.secondaryType = result.discount.type;
            discountInfo.secondaryValue = result.discount.value;
            discountInfo.secondaryAmountApplied = applyAmt;
            discountInfo.totalAmountApplied = totalDiscountAmount;
          } else {
            discountInfo = {
              code: privateCode.toUpperCase(),
              type: result.discount.type,
              value: result.discount.value,
              amountApplied: applyAmt,
            };
          }
          discountInfo._privateDiscountData = {
            discount: result.discount,
            amount: applyAmt,
          };
        } else if (!result.valid) {
          console.log(
            `[DISCOUNT] Private code thất bại: ${privateCode} - Lý do: ${result.reason}`
          );
        }
      }

      console.log(
        `[requestExtension] Base fee: ${
          feeCalc.extensionFee
        }, Discount: ${totalDiscountAmount}, Final: ${Math.max(
          0,
          feeCalc.extensionFee - totalDiscountAmount
        )}`
      );

      // Tính phí cuối cùng sau discount
      const finalExtensionFee = Math.max(
        0,
        feeCalc.extensionFee - totalDiscountAmount
      );

      const cleanDiscountInfo = discountInfo
        ? {
            code: discountInfo.code,
            type: discountInfo.type,
            value: discountInfo.value,
            amountApplied: discountInfo.amountApplied || 0,
            secondaryCode: discountInfo.secondaryCode,
            secondaryType: discountInfo.secondaryType,
            secondaryValue: discountInfo.secondaryValue,
            secondaryAmountApplied: discountInfo.secondaryAmountApplied || 0,
            totalAmountApplied:
              discountInfo.totalAmountApplied || totalDiscountAmount,
          }
        : null;

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

      // Tạo ExtensionRequest mới với discount
      const newExtensionRequest = await ExtensionRequest.create(
        [
          {
            orderId: order._id,
            originalEndAt: order.endAt, // NEW: Lưu endAt gốc
            requestedEndAt: newEndAt,
            extensionDuration: feeCalc.extensionDuration,
            extensionUnit: feeCalc.extensionUnit,
            extensionFee: finalExtensionFee, // Sau discount
            serviceFee: feeCalc.serviceFee || 0, // NEW
            originalExtensionFee: feeCalc.extensionFee, // Lưu gốc để so sánh
            discount: cleanDiscountInfo || undefined,
            paymentStatus: "unpaid", // NEW
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

      // Cập nhật discount usage (tương tự createOrder)
      const updateDiscountUsage = async (data) => {
        if (!data) return;
        const { discount, amount } = data;

        await Discount.updateOne(
          { _id: discount._id },
          { $inc: { usedCount: 1 } },
          { session: null } // Không cần session vì đã commit
        );

        if (!discount.isPublic) {
          await DiscountAssignment.updateOne(
            { discountId: discount._id, userId: renterId },
            { $inc: { usedCount: 1 } },
            { session: null }
          );
        }

        await DiscountRedemption.create(
          [
            {
              discountId: discount._id,
              userId: renterId,
              orderId: order._id, // Liên kết với order gốc
              extensionRequestId: request._id, // Để phân biệt
              amountApplied: amount,
              status: "applied",
            },
          ],
          { session: null }
        ).catch((err) => console.error("Redemption error:", err));
      };

      await updateDiscountUsage(discountInfo?._publicDiscountData);
      await updateDiscountUsage(discountInfo?._privateDiscountData);

      // Notification cho Owner sử dụng createNotification
      await createNotification(
        order.ownerId,
        "Extension Request",
        "Yêu cầu gia hạn thuê",
        `Người thuê yêu cầu gia hạn đơn #${order.orderGuid} thêm ${
          notes ? notes : ""
        }. Phí: ${finalExtensionFee}đ (giảm ${totalDiscountAmount}đ, chưa thanh toán).`,
        {
          orderId: order._id,
          type: "extension_request",
          extensionDuration: feeCalc.extensionDuration,
          extensionUnit: feeCalc.extensionUnit,
          extensionFee: finalExtensionFee,
          requestId: request._id,
        }
      );

      await logOrderAudit({
        orderId: order._id,
        operation: "UPDATE",
        userId: renterId,
        changeSummary: `Yêu cầu gia hạn: +${feeCalc.extensionDuration} ${feeCalc.extensionUnit}, phí: ${finalExtensionFee}đ (giảm ${totalDiscountAmount}đ), notes: ${notes}`,
      });

      return res.status(200).json({
        message: "Yêu cầu gia hạn đã gửi thành công (chờ thanh toán)",
        data: {
          requestId: request._id,
          newEndAt: newEndAt.toISOString(),
          extensionFee: finalExtensionFee,
          extensionDuration: feeCalc.extensionDuration,
          extensionUnit: feeCalc.extensionUnit,
          discount: cleanDiscountInfo,
        },
      });
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
      console.error("[requestExtension] Error:", err);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
  },

  // 2. Owner approve gia hạn - Kiểm tra paid trước
  approveExtension: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const ownerId = req.user._id;
      const orderId = req.params.orderId;
      const requestId = req.params.requestId;

      console.log(
        `[approveExtension] OrderId: ${orderId}, RequestId: ${requestId}, OwnerId: ${ownerId}`
      );

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

      // NEW: Check paid
      if (extensionReq.paymentStatus !== "paid") {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Yêu cầu chưa được thanh toán" });
      }

      // Cập nhật request status
      extensionReq.status = "approved";
      extensionReq.approvedBy = ownerId;
      extensionReq.updatedAt = new Date();
      await extensionReq.save({ session });

      // Update order: endAt mới, totalAmount/finalAmount += extensionFee (đã discount)
      order.endAt = extensionReq.requestedEndAt;
      order.totalAmount += extensionReq.extensionFee;
      order.finalAmount += extensionReq.extensionFee;
      order.rentalDuration += extensionReq.extensionDuration;
      order.serviceFee += extensionReq.serviceFee || 0;

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
      console.error("[approveExtension] Error:", err);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
  },

  // 3. Owner reject gia hạn - Thêm refund nếu đã áp dụng discount (tương tự cancel order)
  rejectExtension: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const ownerId = req.user._id;
      const orderId = req.params.orderId;
      const requestId = req.params.requestId;
      const { rejectReason = "" } = req.body;

      console.log(
        `[rejectExtension] OrderId: ${orderId}, RequestId: ${requestId}, OwnerId: ${ownerId}, Reason: ${rejectReason}`
      );

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

      // Cập nhật status + rejectedReason
      extensionReq.status = "rejected";
      extensionReq.approvedBy = ownerId;
      extensionReq.rejectedReason = rejectReason;
      extensionReq.notes += `\nReject reason: ${rejectReason}`;
      extensionReq.updatedAt = new Date();

      // NEW: Nếu đã paid, REFUND + revert order
      if (extensionReq.paymentStatus === "paid") {
        console.log(
          `[rejectExtension] Refunding paid request ${requestId}, amount: ${extensionReq.extensionFee}`
        );

        // Tìm wallets
        const userWallet = await Wallet.findOne({
          userId: order.renterId,
        }).session(session);
        const adminUser = await User.findOne({ role: "admin" }).session(
          session
        );
        const adminWallet = await Wallet.findOne({
          userId: adminUser._id,
        }).session(session);

        if (!userWallet || !adminWallet)
          throw new Error("Wallet không tồn tại");

        // Refund: + user, - admin
        userWallet.balance += extensionReq.extensionFee;
        adminWallet.balance -= extensionReq.extensionFee;
        await userWallet.save({ session });
        await adminWallet.save({ session });

        // Create refund tx
        await WalletTransaction.create(
          [
            {
              walletId: userWallet._id,
              orderId: order._id,
              typeId: "EXTENSION_REFUND",
              amount: +extensionReq.extensionFee,
              balanceAfter: userWallet.balance,
              note: `Hoàn tiền phí gia hạn bị reject: ${extensionReq.extensionFee}đ`,
              status: "completed",
            },
            {
              walletId: adminWallet._id,
              orderId: order._id,
              typeId: "SYSTEM_REFUND_EXTENSION",
              amount: -extensionReq.extensionFee,
              balanceAfter: adminWallet.balance,
              note: `Hoàn tiền phí gia hạn bị reject`,
              status: "completed",
            },
          ],
          { session }
        );

        // Revert order: endAt gốc, totalAmount -= fee
        order.endAt = extensionReq.originalEndAt;
        order.totalAmount -= extensionReq.extensionFee;
        order.finalAmount -= extensionReq.extensionFee;
        order.rentalDuration -= extensionReq.extensionDuration;
        order.serviceFee -= extensionReq.serviceFee || 0;

        // Revert discount usage nếu có (tương tự cancel: revert usedCount, xóa redemption)
        if (extensionReq.discount) {
          const revertDiscountUsage = async (data) => {
            if (!data) return;
            const { discount } = data;

            await Discount.updateOne(
              { _id: discount._id },
              { $inc: { usedCount: -1 } },
              { session }
            );

            if (!discount.isPublic) {
              await DiscountAssignment.updateOne(
                { discountId: discount._id, userId: order.renterId },
                { $inc: { usedCount: -1 } },
                { session }
              );
            }

            // Xóa hoặc mark redemption as "reverted"
            await DiscountRedemption.updateMany(
              {
                discountId: discount._id,
                orderId: order._id,
                extensionRequestId: extensionReq._id,
                status: "applied",
              },
              { status: "reverted" },
              { session }
            );
          };

          await revertDiscountUsage(extensionReq.discount._publicDiscountData);
          if (extensionReq.discount._privateDiscountData) {
            await revertDiscountUsage(
              extensionReq.discount._privateDiscountData
            );
          }
        }

        // Update paymentStatus
        extensionReq.paymentStatus = "refunded";
      }

      await extensionReq.save({ session });
      if (extensionReq.paymentStatus === "refunded") {
        await order.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      // Notification cho Renter sử dụng createNotification
      const notifBody =
        extensionReq.paymentStatus === "refunded"
          ? `Chủ thuê đã từ chối gia hạn đơn #${order.orderGuid}. Lý do: ${rejectReason}. Tiền đã được hoàn lại ví.`
          : `Chủ thuê đã từ chối gia hạn đơn #${order.orderGuid}. Lý do: ${rejectReason}`;
      await createNotification(
        order.renterId,
        "Extension Rejected",
        "Gia hạn thuê bị từ chối",
        notifBody,
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
        changeSummary:
          `Reject gia hạn (ID: ${requestId}): Lý do: ${rejectReason}` +
          (extensionReq.paymentStatus === "refunded" ? ", đã hoàn tiền" : ""),
      });

      return res.status(200).json({
        message:
          "Yêu cầu gia hạn đã bị từ chối" +
          (extensionReq.paymentStatus === "refunded" ? " và hoàn tiền" : ""),
      });
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
      console.error("[rejectExtension] Error:", err);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
  },

  // 4. Lấy danh sách yêu cầu gia hạn của đơn
  getExtensionRequests: async (req, res) => {
    try {
      const { id: orderId } = req.params; // Fix: dùng 'id' thay vì 'orderId' theo route
      const userId = req.user._id;

      console.log(
        `[getExtensionRequests] OrderId: ${orderId}, UserId: ${userId}`
      );

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

      // Populate an toàn, fallback nếu User không có fullName
      const requests = await ExtensionRequest.find({ orderId })
        .populate({
          path: "requestedBy",
          select: "fullName avatarUrl", // Chỉ select fields cần
          model: "User",
        })
        .populate({
          path: "approvedBy",
          select: "fullName avatarUrl",
          model: "User",
        })
        .sort({ createdAt: -1 });

      // Fix response format để match frontend ApiResponse
      res.status(200).json({
        code: 200,
        message: "Success",
        data: requests,
      });
    } catch (err) {
      console.error("[getExtensionRequests] Error:", err);
      res.status(500).json({ code: 500, message: "Lỗi server" });
    }
  },
};
