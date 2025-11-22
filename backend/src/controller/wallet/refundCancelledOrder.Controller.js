
const mongoose = require("mongoose");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const User = require("../../models/User.model");
const Order = require("../../models/Order/Order.model");
const Notification = require("../../models/Notification.model");
const AuditLog = require("../../models/AuditLog.model");

async function refundPendingOrder(orderId, session = null) {
  let ownSession = false;
  if (!session) {
    session = await mongoose.startSession();
    ownSession = true;
    session.startTransaction();
  }
  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    if (!(order.orderStatus === "pending" || order.orderStatus === "cancelled")) throw new Error("Chỉ hoàn tiền cho đơn pending/cancelled");

    if (order.isRefunded) throw new Error("Đơn hàng đã hoàn tiền!");

    // Số tiền hoàn lại cho người thuê
    const refundAmount = order.finalAmount ?? order.totalAmount;

    const adminUser = await User.findOne({ role: "admin" }).session(session);
    if (!adminUser) throw new Error("Không tìm thấy admin");
    const adminWallet = await Wallet.findOne({ userId: adminUser._id }).session(session);
    if (!adminWallet) throw new Error("Không tìm thấy ví admin");
    const renterWallet = await Wallet.findOne({ userId: order.renterId }).session(session);
    if (!renterWallet) throw new Error("Không tìm thấy ví người thuê");

    if (adminWallet.balance < refundAmount) throw new Error("Ví admin không đủ tiền hoàn");

    adminWallet.balance -= refundAmount;
    renterWallet.balance += refundAmount;

    await adminWallet.save({ session });
    await renterWallet.save({ session });

    const [adminTx] = await WalletTransaction.create([{
      walletId: adminWallet._id,
      orderId: order._id,
      orderCode: order.orderGuid + "_admin_cancel",
      typeId: "payout_cancel_refund",
      amount: -refundAmount,
      note: "Hoàn tiền do chủ đồ hủy đơn " + order.itemSnapshot?.title || "đơn hàng",
      status: "completed",
      createdAt: new Date()
    }], { session, ordered: true });

    const [renterTx] = await WalletTransaction.create([{
      walletId: renterWallet._id,
      orderId: order._id,
      orderCode: order.orderGuid + "_renter_refund",
      typeId: "refund_from_cancelled",
      amount: refundAmount,
      note: "Nhận lại tiền đơn thuê bị hủy  " + order.itemSnapshot?.title || "đơn hàng",
      status: "completed",
      createdAt: new Date()
    }], { session, ordered: true });

    order.isRefunded = true;
    order.refundedAt = new Date();
    order.orderStatus = "cancelled"; // cập nhật trạng thái luôn là cancelled
    await order.save({ session });

    await Notification.create({
      user: order.renterId,
      notificationType: "Order Cancelled Refunded",
      title: "Hoàn tiền sau khi đơn thuê bị huỷ",
      body: `Đơn thuê của bạn đã bị huỷ bởi chủ đồ. Số tiền ${refundAmount.toLocaleString()} VNĐ đã được hoàn lại vào ví.`,
      metaData: JSON.stringify({ orderId: order._id, amount: refundAmount, cancelled: true }),
      isRead: false
    });

    await AuditLog.create([
      {
        TableName: "Wallet",
        PrimaryKeyValue: adminWallet._id.toString(),
        Operation: "UPDATE",
        ChangedByUserId: adminUser._id,
        ChangedAt: new Date(),
        ChangeSummary: `Hoàn trả ${refundAmount} VNĐ khi hủy đơn `
      },
      {
        TableName: "Wallet",
        PrimaryKeyValue: renterWallet._id.toString(),
        Operation: "UPDATE",
        ChangedByUserId: adminUser._id,
        ChangedAt: new Date(),
        ChangeSummary: `Nhận hoàn tiền ${refundAmount} VNĐ do hủy đơn thuê trạng thái `
      }
    ], { session, ordered: true });

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

// API hoàn tiền cho đơn đã hủy
const refundCancelledOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "OrderId không hợp lệ" });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }
    if (!(order.orderStatus === "cancelled" || order.orderStatus === "pending") || order.paymentStatus !== "paid") {
      return res.status(400).json({ error: "Chỉ hoàn tiền cho đơn đã bị huỷ hoặc đang chờ và đã thanh toán" });
    }
    if (order.isRefunded) {
      return res.status(400).json({ error: "Đơn đã hoàn tiền rồi!" });
    }
    await refundPendingOrder(orderId);
    return res.status(200).json({ success: true, message: "Hoàn tiền cho đơn hàng bị huỷ thành công" });
  } catch (error) {
    console.error("Lỗi hoàn tiền đơn bị huỷ:", error);
    return res.status(500).json({ error: error.message });
  }
};
module.exports = { refundCancelledOrder, refundPendingOrder };
