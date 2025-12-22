const mongoose = require("mongoose");
const { Types } = mongoose;

const Order = require("../../models/Order/Order.model");
const ExtensionRequest = require("../../models/Order/ExtensionRequest.model");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const User = require("../../models/User.model");
const Notification = require("../../models/Notification.model");
const AuditLog = require("../../models/AuditLog.model");

const payExtensionFee = async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }

  const renterId = req.user._id;
  const { requestId } = req.body;

  if (!requestId || !Types.ObjectId.isValid(requestId)) {
    return res
      .status(400)
      .json({ error: "Thiếu hoặc ID yêu cầu gia hạn không hợp lệ" });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // 1. Tìm ExtensionRequest + populate order (explicit model, guard null)
    const extensionReq = await ExtensionRequest.findById(requestId)
      .populate({
        path: "orderId",
        model: "Order", 
        populate: { path: "itemId", select: "Title OwnerId" },
      })
      .session(session);

    if (!extensionReq) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Yêu cầu gia hạn không tồn tại" });
    }

    if (extensionReq.paymentStatus === "paid") {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "Phí gia hạn đã được thanh toán trước đó" });
    }

    const order = extensionReq.orderId;

    if (!order || order.isDeleted || !order._id) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ error: "Đơn hàng không tồn tại hoặc populate fail" });
    }

    if (order.renterId.toString() !== renterId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json({ error: "Không có quyền thanh toán yêu cầu này" });
    }

    // 2. Calc amount (from req, no recalc)
    const paymentAmount = extensionReq.extensionFee;

    if (paymentAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "Số tiền thanh toán phải lớn hơn 0" });
    }

    // 3. Find userWallet
    const userWallet = await Wallet.findOne({ userId: renterId }).session(
      session
    );

    if (!userWallet || !userWallet._id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Ví của bạn không tồn tại" });
    }

    if (userWallet.balance < paymentAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "Số dư ví không đủ để thanh toán phí gia hạn",
        message: `Số dư ví của bạn là ${userWallet.balance.toLocaleString(
          "vi-VN"
        )} VNĐ, nhưng cần ${paymentAmount.toLocaleString(
          "vi-VN"
        )} VNĐ để thanh toán phí gia hạn này. Vui lòng nạp thêm tiền vào ví.`,
        balance: userWallet.balance,
        required: paymentAmount,
        shortage: paymentAmount - userWallet.balance,
      });
    }

    // 4. Find adminUser & wallet
    const adminUser = await User.findOne({ role: "admin" }).session(session);

    if (!adminUser || !adminUser._id) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ error: "Không tìm thấy user admin hệ thống" });
    }

    const adminManagedWallet = await Wallet.findOne({
      userId: adminUser._id,
    }).session(session);

    if (!adminManagedWallet || !adminManagedWallet._id) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ error: "Ví quản lý tiền web không tồn tại" });
    }

    // 5. Transfer balance
    userWallet.balance -= paymentAmount;
    adminManagedWallet.balance += paymentAmount;

    await userWallet.save({ session });
    await adminManagedWallet.save({ session });

    // 6. Create WalletTransactions with unique codes 
    const generateUniqueTxCode = (baseCode, suffix) => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 8);
      return `${baseCode}_${suffix}_${timestamp}_${random}`;
    };

    const userTxCode = generateUniqueTxCode(order.orderGuid, "user_ext_pay");
    const adminTxCode = generateUniqueTxCode(order.orderGuid, "admin_ext_pay");

    // User Tx
    const userTx = await WalletTransaction.create(
      [
        {
          walletId: userWallet._id,
          orderId: order._id,
          orderCode: userTxCode,
          typeId: "EXTENSION_PAYMENT",
          amount: -paymentAmount,
          balanceAfter: userWallet.balance,
          note: `Thanh toán phí gia hạn đơn hàng thuê : ${order.itemSnapshot.title}`,
          status: "completed",
          createdAt: new Date(),
        },
      ],
      { session }
    );

    // Admin Tx
    const adminTx = await WalletTransaction.create(
      [
        {
          walletId: adminManagedWallet._id,
          orderId: order._id,
          orderCode: adminTxCode,
          typeId: "SYSTEM_RECEIVE_EXTENSION",
          amount: paymentAmount,
          balanceAfter: adminManagedWallet.balance,
          note: "Nhận phí gia hạn từ đơn hàng thuê",
          status: "completed",
          createdAt: new Date(),
        },
      ],
      { session }
    );

    // 7. Update ExtensionRequest status
    extensionReq.paymentStatus = "paid";
    extensionReq.paidAt = new Date();
    await extensionReq.save({ session });

    // 8. Create Notification 
    await Notification.create(
      [
        {
          user: renterId,
          notificationType: "Extension Paid",
          title: "Thanh toán gia hạn thành công",
          body: `Bạn đã thanh toán thành công ${paymentAmount.toLocaleString(
            "vi-VN"
          )} VNĐ để gia hạn đơn hàng #${order.orderGuid} thêm ${
            extensionReq.extensionDuration
          } ${
            extensionReq.extensionUnit
          }. Yêu cầu đang chờ chủ sản phẩm duyệt.`,
          metaData: JSON.stringify({
            orderId: order._id,
            extensionRequestId: extensionReq._id,
            amount: paymentAmount,
          }),
          isRead: false,
        },
      ],
      { session }
    );

    // 10. AuditLog (update for pay only)
    const userTxId = userTx[0]?._id?.toString() || "unknown_user_tx";
    const adminTxId = adminTx[0]?._id?.toString() || "unknown_admin_tx";
    const userWalletId = userWallet._id.toString();
    const adminWalletId = adminManagedWallet._id.toString();
    const adminUserId = adminUser._id.toString();

    await AuditLog.create(
      [
        {
          TableName: "Wallet",
          PrimaryKeyValue: userWalletId,
          Operation: "UPDATE",
          ChangedByUserId: renterId,
          ChangedAt: new Date(),
          ChangeSummary: `Trừ tiền thanh toán phí gia hạn đơn hàng ${order.orderGuid}: ${paymentAmount} VNĐ (chờ duyệt)`,
        },
        {
          TableName: "Wallet",
          PrimaryKeyValue: adminWalletId,
          Operation: "UPDATE",
          ChangedByUserId: adminUserId,
          ChangedAt: new Date(),
          ChangeSummary: `Cộng tiền phí gia hạn đơn hàng ${order.orderGuid} nhận từ thuê: ${paymentAmount} VNĐ (chờ duyệt)`,
        },
        {
          TableName: "WalletTransaction",
          PrimaryKeyValue: userTxId,
          Operation: "INSERT",
          ChangedByUserId: renterId,
          ChangedAt: new Date(),
          ChangeSummary: `Transaction thanh toán phí gia hạn đơn hàng: -${paymentAmount} VNĐ (chờ duyệt)`,
        },
        {
          TableName: "WalletTransaction",
          PrimaryKeyValue: adminTxId,
          Operation: "INSERT",
          ChangedByUserId: adminUserId,
          ChangedAt: new Date(),
          ChangeSummary: `Transaction admin nhận phí gia hạn đơn hàng: +${paymentAmount} VNĐ (chờ duyệt)`,
        },
      ],
      { session, ordered: true }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: "Thanh toán phí gia hạn thành công (chờ duyệt)",
      data: {
        requestId: extensionReq._id,
        additionalAmount: paymentAmount,
        newBalance: userWallet.balance,
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("Lỗi transaction:", error.message, "Stack:", error.stack);

    return res.status(500).json({
      error: "Lỗi khi thực hiện thanh toán phí gia hạn",
      message: error.message,
      reason: error.reason || "UNKNOWN_ERROR",
    });
  }
};

module.exports = { payExtensionFee };