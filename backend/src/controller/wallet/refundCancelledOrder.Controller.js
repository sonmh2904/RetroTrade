
const mongoose = require("mongoose");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const User = require("../../models/User.model");
const ExtensionRequest = require("../../models/Order/ExtensionRequest.model");
const Notification = require("../../models/Notification.model");

// HOÀN TIỀN KHI YÊU CẦU GIA HẠN BỊ TỪ CHỐI
async function refundExtensionRequest(requestId, session = null) {
  let ownSession = false;
  if (!session) {
    session = await mongoose.startSession();
    ownSession = true;
    session.startTransaction();
  }
  try {
    const request = await ExtensionRequest.findById(requestId)
      .populate({
        path: "orderId",
        populate: { path: "renterId ownerId" }
      })
      .session(session);

    if (!request) throw new Error("Không tìm thấy yêu cầu gia hạn");
    if (request.status !== "rejected" && request.status !== "cancelled")
      throw new Error("Chỉ hoàn tiền khi yêu cầu bị từ chối hoặc hủy");
    if (request.isRefunded) return true;

    const refundAmount = request.extensionFee || 0;
    if (refundAmount <= 0) {
      request.isRefunded = true;
      request.refundedAt = new Date();
      await request.save({ session });
      if (ownSession) await session.commitTransaction();
      return true;
    }

    const order = request.orderId;
    const adminUser = await User.findOne({ role: "admin" }).session(session);
    const adminWallet = await Wallet.findOne({ userId: adminUser._id }).session(session);
    const renterWallet = await Wallet.findOne({ userId: order.renterId }).session(session);

    if (adminWallet.balance < refundAmount)
      throw new Error("Ví hệ thống không đủ tiền hoàn");

    adminWallet.balance -= refundAmount;
    renterWallet.balance += refundAmount;
    await Promise.all([adminWallet.save({ session }), renterWallet.save({ session })]);

    await WalletTransaction.create(
      [
        {
          walletId: adminWallet._id,
          orderId: order._id,
          orderCode: `${order.orderGuid}_ext_refund_admin_${requestId}`,
          typeId: "refund_extension_rejected",
          amount: -refundAmount,
          note: `Hoàn phí gia hạn bị từ chối - Đơn #${order.orderGuid}`,
          status: "completed",
          createdAt: new Date(),
        },
        {
          walletId: renterWallet._id,
          orderId: order._id,
          orderCode: `${order.orderGuid}_ext_refund_renter_${requestId}`,
          typeId: "refund_extension_rejected",
          amount: refundAmount,
          note: `Nhận hoàn phí gia hạn bị từ chối - ${order.itemSnapshot.title}`,
          status: "completed",
          createdAt: new Date(),
        },
      ],
      { session, ordered: true }
    );

    request.isRefunded = true;
    request.refundedAt = new Date();
    await request.save({ session });

    await Notification.create([{
      user: order.renterId,
      notificationType: "Extension Fee Refunded",
      title: "Hoàn tiền phí gia hạn",
      body: `Yêu cầu gia hạn đơn #${order.orderGuid} bị từ chối. ${refundAmount.toLocaleString()} VNĐ đã được hoàn vào ví.`,
      isRead: false,
      createdAt: new Date()
    }], { session });

    if (ownSession) {
      await session.commitTransaction();
      session.endSession();
    }
    return true;
  } catch (error) {
    if (ownSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
}

module.exports = { 
  refundExtensionRequest 
};