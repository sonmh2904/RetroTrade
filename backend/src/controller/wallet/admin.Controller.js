const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const User = require("../../models/User.model");
const Order = require("../../models/Order/Order.model");

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
    wallet.balance -= transaction.amount;
    wallet.updatedAt = new Date();
    await wallet.save();

    transaction.status = 'completed';
    transaction.balanceAfter = wallet.balance;
    transaction.adminNote = (transaction.adminNote || '') + ' | Đã chuyển tiền: ' + (adminNote || '');
    await transaction.save();

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
const getAllRefundsForAdmin = async (req, res) => {
  try {
    // Lấy tất cả đơn hàng trạng thái completed, sắp xếp mới nhất
    const orders = await Order.find({ orderStatus: "completed" })
      .populate("renterId", "fullName username role email phone")  // Lấy thông tin người thuê
      .populate("ownerId", "fullName username role email phone")   // Lấy thông tin chủ đồ
      .populate("itemId", "DepositAmount Title")                   // Lấy thông tin tiền cọc và tên sản phẩm từ bảng Item
      .sort({ completedAt: -1 });

      const data = orders.map(order => {
      const totalAmount = order.totalAmount ?? 0;                // Tổng tiền đã thanh toán (cọc + phí + thuê)
      const serviceFee = order.serviceFee ?? 0;                  // Phí dịch vụ
      const depositAmount = order.itemId?.DepositAmount ?? 0;    // Tiền cọc lấy từ Item trả cho người thuê 

      // Tiền thực nhận của chủ đồ (trừ phí dịch vụ và tiền cọc)
      const ownerReceive = totalAmount - serviceFee - depositAmount;

      return {
        _id: order._id,
        orderGuid: order.orderGuid,
        renterName: order.renterId?.fullName || "Không rõ",
        renterUsername: order.renterId?.username || "Không rõ",
        renterRole: order.renterId?.role || "Người thuê",
        ownerName: order.ownerId?.fullName || "Không rõ",
        ownerUsername: order.ownerId?.username || "Không rõ",
        ownerRole: order.ownerId?.role || "Chủ đơn",
        itemTitle: order.itemId?.Title || "Không rõ",              // Tên sản phẩm lấy từ Item
        totalAmount,                                                // Tổng tiền thanh toán
        refundedAmount : depositAmount,                             // Tiền hoàn trả cho người thuê (tiền cọc)
        ownerReceive,                                               // Tiền chủ nhận được sau khi trừ cọc và phí
        isRefunded: order.isRefunded,
        refundedAt: order.refundedAt,
        completedAt: order.completedAt,
        createdAt: order.createdAt,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("Lỗi lấy danh sách hoàn tiền:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
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