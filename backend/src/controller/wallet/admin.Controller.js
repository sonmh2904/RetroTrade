const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const User = require("../../models/User.model");
const Order = require("../../models/Order/Order.model");
const Notification = require("../../models/Notification.model");
const AuditLog = require("../../models/AuditLog.model");
const OrderReport = require("../../models/Order/Reports.model");


// view danh sách yêu cầu rút tiền
const getWithdrawalRequests = async (req, res) => {
  try {
    // Kiểm tra role admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const { status } = req.query; // pending, approved, rejected, completed

    const query = { typeId: "withdraw" };
    if (status) query.status = status;

    const requests = await WalletTransaction.find(query)
      .populate('walletId')
      .populate('bankAccountId')
      .populate({
        path: 'walletId',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Lấy danh sách yêu cầu rút tiền thành công",
      data: requests,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách rút tiền:", error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
// Duyệt hoặc từ chối yêu cầu rút tiền (KHÔNG trừ tiền ví ở đây)
const reviewWithdrawalRequest = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const { transactionId } = req.params;
    const { action, adminNote } = req.body; // action: 'approve' | 'reject'

    const transaction = await WalletTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch" });
    }
    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: "Giao dịch đã được xử lý trước đó" });
    }

    if (action === 'approve') {
      transaction.status = 'approved';
      transaction.adminNote = adminNote || 'Đã duyệt';
      transaction.reviewedBy = req.user._id;
      transaction.reviewedAt = new Date();
      await transaction.save();

      let userId;
      if (transaction.walletId && typeof transaction.walletId === 'object' && transaction.walletId.userId) {
        userId = transaction.walletId.userId;
      } else {
        // Nếu chỉ có là ObjectId, truy vấn lại ví để lấy user
        const wallet = await Wallet.findById(transaction.walletId);
        userId = wallet ? wallet.userId : undefined;
      }

      // Notification cho user: duyệt rút tiền
      if (userId) {
        await Notification.create({
          user: userId,
          notificationType: "Wallet Withdraw Approved",
          title: "Yêu cầu rút tiền đã được duyệt",
          body: `Admin đã duyệt yêu cầu rút ${Math.abs(transaction.amount).toLocaleString()} VND của bạn.`,
          metaData: JSON.stringify({
            transactionId: transaction._id,
            amount: Math.abs(transaction.amount),
            adminNote: transaction.adminNote
          }),
          isRead: false
        });
      }

      // Audit log cho admin
      await AuditLog.create({
        TableName: "WalletTransaction",
        PrimaryKeyValue: transaction._id.toString(),
        Operation: "UPDATE",
        ChangedByUserId: req.user._id, // admin thực hiện
        ChangedAt: new Date(),
        ChangeSummary: `Admin duyệt yêu cầu rút tiền (ID: ${transaction._id}, amount: ${Math.abs(transaction.amount)} VND)`
      });

      return res.status(200).json({
        message: "Đã duyệt yêu cầu rút tiền ",
        transaction,
      });
    } else if (action === 'reject') {
      transaction.status = 'rejected';
      transaction.adminNote = adminNote || 'Từ chối';
      transaction.reviewedBy = req.user._id;
      transaction.reviewedAt = new Date();
      await transaction.save();

      let userId;
      if (transaction.walletId && typeof transaction.walletId === 'object' && transaction.walletId.userId) {
        userId = transaction.walletId.userId;
      } else {
        const wallet = await Wallet.findById(transaction.walletId);
        userId = wallet ? wallet.userId : undefined;
      }

      // Notification cho user: bị từ chối
      if (userId) {
        await Notification.create({
          user: userId,
          notificationType: "Wallet Withdraw Rejected",
          title: "Yêu cầu rút tiền bị từ chối",
          body: `Yêu cầu rút ${Math.abs(transaction.amount).toLocaleString()} VND của bạn đã bị từ chối. ${adminNote ? "Lý do: " + adminNote : ""}`,
          metaData: JSON.stringify({
            transactionId: transaction._id,
            amount: Math.abs(transaction.amount),
            adminNote: transaction.adminNote
          }),
          isRead: false
        });
      }

      // Audit log cho admin
      await AuditLog.create({
        TableName: "WalletTransaction",
        PrimaryKeyValue: transaction._id.toString(),
        Operation: "UPDATE",
        ChangedByUserId: req.user._id,
        ChangedAt: new Date(),
        ChangeSummary: `Admin từ chối yêu cầu rút tiền (ID: ${transaction._id}, amount: ${Math.abs(transaction.amount)} VND, lý do: ${adminNote})`
      });

      return res.status(200).json({
        message: "Đã từ chối yêu cầu rút tiền",
        transaction,
      });
    } else {
      return res.status(400).json({ message: "Action không hợp lệ" });
    }
  } catch (error) {
    console.error("Lỗi duyệt yêu cầu rút tiền:", error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Đánh dấu hoàn thành rút tiền (CHỈ TRỪ TIỀN ví ở đây)
const completeWithdrawal = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const { transactionId } = req.params;
    const { adminNote } = req.body;

    const transaction = await WalletTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch" });
    }
    if (transaction.status !== 'approved') {
      return res.status(400).json({ message: "Giao dịch chưa được duyệt" });
    }

    const wallet = await Wallet.findById(transaction.walletId);
    if (!wallet) {
      return res.status(404).json({ message: "Không tìm thấy ví" });
    }
    if (wallet.balance < transaction.amount) {
      return res.status(400).json({ message: "Số dư ví không đủ" });
    }
    wallet.balance -= Math.abs(transaction.amount);
    wallet.updatedAt = new Date();
    transaction.completedAt = new Date();
    await wallet.save();

    transaction.status = 'completed';
    transaction.balanceAfter = wallet.balance;
    transaction.adminNote = (transaction.adminNote || '') + ' | Đã chuyển tiền: ' + (adminNote || '');
    await transaction.save();
    // Lấy userId từ wallet (vì transaction đã có walletId)
    const userId = wallet.userId;

    // Thông báo hoàn thành rút tiền cho user
    await Notification.create({
      user: userId,
      notificationType: "Wallet Withdraw Complete",
      title: "Rút tiền thành công",
      body: `Yêu cầu rút ${Math.abs(transaction.amount).toLocaleString()} VND của bạn đã hoàn tất.
        Số dư ví hiện tại: ${wallet.balance.toLocaleString()} VND.
        Vui lòng kiểm tra tài khoản ngân hàng.`,
      metaData: JSON.stringify({
        transactionId: transaction._id,
        amount: Math.abs(transaction.amount),
        balance: wallet.balance,
        adminNote: transaction.adminNote
      }),
      isRead: false
    });

    // Log kiểm toán thay đổi ví
    await AuditLog.create({
      TableName: "Wallet",
      PrimaryKeyValue: wallet._id.toString(),
      Operation: "UPDATE",
      ChangedByUserId: req.user._id, // admin
      ChangedAt: new Date(),
      ChangeSummary: `Hoàn thành rút tiền ${Math.abs(transaction.amount)} VND, số dư mới: ${wallet.balance}.`
    });

    // Log kiểm toán cập nhật transaction
    await AuditLog.create({
      TableName: "WalletTransaction",
      PrimaryKeyValue: transaction._id.toString(),
      Operation: "UPDATE",
      ChangedByUserId: req.user._id,
      ChangedAt: new Date(),
      ChangeSummary: `Transaction rút tiền chuyển sang trạng thái completed.`
    });

    return res.status(200).json({
      message: " hoàn thành chuyển tiền",
      transaction,
    });
  } catch (error) {
    console.error("Lỗi đánh dấu hoàn thành:", error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
// view tât cả giao dịch ví
const getAllWalletTransactions = async (req, res) => {
  try {
    if (req.user?.role !== 'admin')
      return res.status(403).json({ message: "Không có quyền truy cập" });

    const txs = await WalletTransaction.find()
      .populate({
        path: 'walletId',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('bankAccountId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Lấy tất cả giao dịch ví thành công",
      data: txs,
    });
  } catch (error) {
    console.error("Lỗi lấy all giao dịch ví:", error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
// view ví admin and tao nếu chưa có ví
const getAdminWallet = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        message: "Chỉ admin được truy cập"
      });
    }

    // Lấy ví admin đầu tiên (ví chung của tất cả admin)
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return res.status(404).json({
        message: "Không tìm thấy admin"
      });
    }

    let wallet = await Wallet.findOne({ userId: adminUser._id });

    // Nếu chưa có ví thì tạo
    if (!wallet) {
      wallet = await Wallet.create({
        userId: adminUser._id,
        currency: "VND",
        balance: 0
      });
    }

    return res.status(200).json(wallet);
  } catch (error) {
    console.error("Error fetching admin wallet:", error);
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};
// view hoàn tiền cho 
// const getAllRefundsForAdmin = async (req, res) => {
//   try {
//     // Lấy tất cả đơn hàng trạng thái completed, sắp xếp mới nhất
//     const orders = await Order.find({ orderStatus: "completed" })
//       .populate("renterId", "fullName username role email phone")  // Lấy thông tin người thuê
//       .populate("ownerId", "fullName username role email phone")   // Lấy thông tin chủ đồ
//       .populate("itemId", "DepositAmount Title")                   // Lấy thông tin tiền cọc và tên sản phẩm từ bảng Item
//       .sort({ completedAt: -1 });

//     const data = orders.map(order => {
//       const totalAmount = order.totalAmount ?? 0;                // Tổng tiền đã thanh toán (cọc + phí + thuê)
//       const serviceFee = order.serviceFee ?? 0;                  // Phí dịch vụ
//       const depositAmount = order.itemId?.DepositAmount ?? 0;    // Tiền cọc lấy từ Item trả cho người thuê 

//       // tiền thuê gốc
//       const rentalOriginal = totalAmount - depositAmount - serviceFee;

//       const discountTotal = order.discount?.totalAmountApplied ?? 0;
//       const finalAmount = order.finalAmount ?? (totalAmount - discountTotal);

//       const ownerReceive = rentalOriginal;                  // chủ nhận đủ tiền thuê gốc

//       return {
//         _id: order._id,
//         orderGuid: order.orderGuid,
//         renterName: order.renterId?.fullName || "Không rõ",
//         renterUsername: order.renterId?.username || "Không rõ",
//         renterRole: order.renterId?.role || "Người thuê",
//         ownerName: order.ownerId?.fullName || "Không rõ",
//         ownerUsername: order.ownerId?.username || "Không rõ",
//         ownerRole: order.ownerId?.role || "Chủ đơn",
//         itemTitle: order.itemId?.Title || "Không rõ",              // Tên sản phẩm lấy từ Item
//         totalAmount : finalAmount,                                                // Tổng tiền thanh toán
//         refundedAmount: depositAmount,                             // Tiền hoàn trả cho người thuê (tiền cọc)
//         ownerReceive,                                               // Tiền chủ nhận được sau khi trừ cọc và phí
//         isRefunded: order.isRefunded,
//         refundedAt: order.refundedAt,
//         completedAt: order.completedAt,
//         createdAt: order.createdAt,
//       };
//     });

//     res.json({ success: true, data });
//   } catch (error) {
//     console.error("Lỗi lấy danh sách hoàn tiền:", error);
//     res.status(500).json({ success: false, message: "Lỗi hệ thống" });
//   }
// };
// view hoàn tiền cho
const getAllRefundsForAdmin = async (req, res) => {
  try {
    const orders = await Order.find({
      isRefunded: true,
      orderStatus: { $in: ["completed", "cancelled"] },
    })
      .populate("renterId", "fullName username role email phone")
      .populate("ownerId", "fullName username role email phone")
      .populate("itemId", "DepositAmount Title")
      .sort({ refundedAt: -1 });

    const data = [];

    for (const order of orders) {
      const totalAmount = order.totalAmount ?? 0;
      const serviceFee = order.serviceFee ?? 0;
      const depositAmount = order.itemId?.DepositAmount ?? 0; // D
      const rentalOriginal = totalAmount - depositAmount - serviceFee; // T

      const discountTotal = order.discount?.totalAmountApplied ?? 0;
      const finalAmount = order.finalAmount ?? (totalAmount - discountTotal);

      // ===== CÓ KHIẾU NẠI KHÔNG =====
      let hasDispute = false;
      if (order.disputeId) {
        const dispute = await OrderReport.findById(order.disputeId).select("status");
        if (dispute && dispute.status === "Resolved") {
          hasDispute = true;
        }
      }

      // ===== LẤY TRANSACTION THỰC TẾ =====
      const txs = await WalletTransaction.find({ orderId: order._id });

      const renterRefundFromTx = txs
        .filter((tx) =>
          ["renter_refund", "renter_refund_dispute", "refund_deposit"].includes(tx.typeId)
        )
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      let ownerPaymentFromTx = txs
        .filter((tx) =>
          ["owner_payment", "owner_payment_dispute",].includes(tx.typeId)
        )
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      if (order.orderStatus === "cancelled") {
        ownerPaymentFromTx = 0;
      }

      // ===== Fallback nếu KHÔNG có transaction (data cũ) =====
      let finalRenterRefund = renterRefundFromTx;
      let finalOwnerPayment = ownerPaymentFromTx;

      const hasRefundTx =
        renterRefundFromTx !== 0 || ownerPaymentFromTx !== 0;

      if (!hasRefundTx) {
        if (order.orderStatus === "completed") {
          // completed không khiếu nại: renter nhận lại D, owner nhận T
          finalRenterRefund = depositAmount;
          finalOwnerPayment = rentalOriginal;
        } else if (order.orderStatus === "cancelled") {
          // cancelled: renter nhận lại toàn bộ finalAmount, owner 0
          finalRenterRefund = finalAmount;
          finalOwnerPayment = 0;
        }
      }

      // ===== LABEL TRẠNG THÁI ĐƠN =====
      let refundStatusLabel = "";
      if (order.orderStatus === "completed" && !hasDispute) {
        refundStatusLabel = "Hoàn thành";
      } else if (order.orderStatus === "cancelled" && !hasDispute) {
        refundStatusLabel = "Hủy";
      } else if (order.orderStatus === "completed" && hasDispute) {
        refundStatusLabel = "Hoàn thành (khiếu nại)";
      } else if (order.orderStatus === "cancelled" && hasDispute) {
        refundStatusLabel = "Hủy (khiếu nại)";
      } else {
        refundStatusLabel = "Không rõ";
      }

      data.push({
        _id: order._id,
        orderGuid: order.orderGuid,
        renterName: order.renterId?.fullName || "Không rõ",
        renterUsername: order.renterId?.username || "Không rõ",
        renterRole: order.renterId?.role || "Người thuê",
        ownerName: order.ownerId?.fullName || "Không rõ",
        ownerUsername: order.ownerId?.username || "Không rõ",
        ownerRole: order.ownerId?.role || "Chủ đơn",
        itemTitle: order.itemId?.Title || "Không rõ",
        totalAmount: finalAmount,
        refundedAmount: finalRenterRefund,   // tổng tiền renter đã nhận
        ownerReceive: finalOwnerPayment,     // tổng tiền chủ nhận
        baseRentAmount: rentalOriginal,
        baseDepositAmount: depositAmount,
        orderStatus: order.orderStatus,
        hasDispute,
        refundStatusLabel,
        isRefunded: order.isRefunded,
        refundedAt: order.refundedAt,
        createdAt: order.createdAt,
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Lỗi lấy danh sách hoàn tiền:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống" });
  }
};


module.exports = {
  getWithdrawalRequests,
  reviewWithdrawalRequest,
  completeWithdrawal,
  getAllWalletTransactions,
  getAdminWallet,
  getAllRefundsForAdmin
};