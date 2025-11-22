
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const Notification = require("../../models/Notification.model");
const AuditLog = require("../../models/AuditLog.model");
require("dotenv").config();


const _payosPkg = require("@payos/node");
const PayOS = _payosPkg?.PayOS ?? _payosPkg?.default ?? _payosPkg;
let payos;

try {
  payos = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
  );
  console.log("PayOS initialized");
} catch (err) {
  console.error("Không thể khởi tạo máy khách PayOS:", err && (err.message || err));
}


const getMyWallet = async (req, res) => {
  try {
    if (!req.user)
      return res
        .status(401)
        .json({ message: "Chưa đăng nhập hoặc token không hợp lệ" });

    const userId = req.user._id;
    const userRole = req.user.role;

    // Chỉ user thường mới có ví ngoài, admin không
    if (userRole === 'admin') {
      return res.status(403).json({
        message: "Admin không được truy cập endpoint này"
      });
    }
    let wallet = await Wallet.findOne({ userId });
    if (!wallet)
      wallet = await Wallet.create({ userId, currency: "VND", balance: 0 });

    return res.status(200).json(wallet);
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return res
      .status(500)
      .json({ message: "Lỗi server khi lấy số dư ví.", error: error.message });
  }
};

const depositToWallet = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập hoặc token không hợp lệ" });

    const { amount, note } = req.body;
    const MAX_AMOUNT = 10000000; // ví dụ 10 triệu
    if (!amount || isNaN(amount) || amount <= 0 || !Number.isInteger(Number(amount)) || Number(amount) > MAX_AMOUNT) {
      return res.status(400).json({ message: "Số tiền không hợp lệ!" });
    }


    // Lấy hoặc tạo ví người dùng
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, currency: "VND", balance: 0 });
    }

    // Tạo mã order code duy nhất
    const orderCodeNumber = Date.now();
    const orderCode = String(orderCodeNumber);
    console.log("Creating deposit tx with orderCode:", orderCode, "for user:", userId);

    // Tạo giao dịch nạp tiền ban đầu với balanceAfter tạm thời null
    const tx = await WalletTransaction.create({
      walletId: wallet._id,
      orderCode,
      typeId: "deposit",// nap tien 
      amount: Number(amount),
      balanceAfter: null,
      note,
      createdAt: new Date(),
    });

    const frontUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const payload = {
      orderCode: orderCodeNumber,
      amount,
      description: `Nạp ví: ${note || ""}`.slice(0, 200),
      returnUrl: `${frontUrl}/wallet/paymentsuccess`,
      cancelUrl: `${frontUrl}/wallet/paymentcancel`,
    };

    if (!payos || !payos.paymentRequests?.create)
      throw new Error("PayOS client chưa khởi tạo đúng");

    let response;
    try {
      response = await payos.paymentRequests.create(payload);
      console.log("PayOS payment request created:", response);
    } catch (err) {
      console.error("Lỗi khi gọi payos.paymentRequests.create:", err);
      return res.status(500).json({ message: "Lỗi tạo link thanh toán", error: err });
    }

    // Lưu link và mã QR vào giao dịch (nếu cần)
    tx.payUrl = response?.checkoutUrl || null;
    tx.qrCode = response?.qrCode || null;
    await tx.save();

    // TRẢ KẾT QUẢ ĐẦY ĐỦ CHO FRONTEND (lấy trực tiếp từ response)
    return res.status(201).json({
      message: "Tạo giao dịch nạp ví thành công",
      checkoutUrl: response?.checkoutUrl ?? null,
      qrCode: response?.qrCode ?? null,  // string QR, frontend render ảnh
      data: response,
      orderCode,
      amount,
    });
  } catch (error) {
    console.error("Lỗi tạo giao dịch nạp ví:", error);
    return res.status(500).json({ message: "Lỗi tạo giao dịch nạp ví", error: error.message });
  }
};

const handlePayOSWebhook = async (req, res) => {
  try {
    console.log("Received PayOS webhook body:", JSON.stringify(req.body, null, 2));
    const raw = req.body || {};
    const data = raw.data || raw;

    // LUÔN convert orderCode về chuỗi
    const orderCodeRaw = data.orderCode ?? data.orderId ?? raw.orderCode ?? raw.orderId ?? "";
    const orderCode = String(orderCodeRaw).trim();
    const statusRaw = String(data.code || raw.code || data.status || raw.status || "").toUpperCase();
    const amount = Number(data.amount || raw.amount || 0);

    console.log("Webhook parsed:", { orderCode, statusRaw, amount });

    // Chỉ xử lý nếu trạng thái là thành công
    const ok = statusRaw === "00" || statusRaw === "PAID" || statusRaw.includes("PAID");
    if (!ok) {
      console.log("Webhook không báo thanh toán hoàn tất, bỏ qua.", statusRaw);
      return res.status(200).json({ message: "Bỏ qua: không được thanh toán" });
    }

    // Chỉ truy vấn theo chuỗi
    const query = {
      typeId: "deposit",
      orderCode: orderCode
    };
    console.log("Searching WalletTransaction with query:", JSON.stringify(query));

    const transaction = await WalletTransaction.findOne(query);
    if (!transaction) {
      console.warn("Không tìm thấy WalletTransaction cho:", { orderCode });
      return res.status(200).json({ message: "Không có giao dịch khớp, bị bỏ qua" });
    }

    if (transaction.balanceAfter !== null) {
      console.log("Giao dịch đã xử lý trước đó:", transaction._id);
      return res.status(200).json({ message: "Giao dịch đã xử lý." });
    }

    const wallet = await Wallet.findById(transaction.walletId);
    if (!wallet) {
      console.warn("Wallet không tồn tại:", transaction.walletId);
      return res.status(404).json({ message: "Wallet không tồn tại." });
    }

    wallet.balance = (Number(wallet.balance) || 0) + (amount || Number(transaction.amount));
    wallet.updatedAt = new Date();
    await wallet.save();

    transaction.balanceAfter = wallet.balance;
    transaction.note = (transaction.note || "") + "Nạp Tiền";
    await transaction.save();

    // BỔ SUNG: Notification nạp tiền thành công
    await Notification.create({
      user: wallet.userId,
      notificationType: "Wallet Deposit Success",
      title: "Thành công nạp tiền vào ví",
      body: `Bạn vừa nạp thành công ${amount.toLocaleString()} vào ví. Số dư mới: ${wallet.balance.toLocaleString()} VND.`,
      metaData: JSON.stringify({ amount, orderCode, balance: wallet.balance }),
      isRead: false
    });

    // BỔ SUNG: Log cập nhật ví
    await AuditLog.create({
      TableName: "Wallet",
      PrimaryKeyValue: wallet._id.toString(),
      Operation: "UPDATE",
      ChangedByUserId: wallet.userId,
      ChangedAt: new Date(),
      ChangeSummary: `Nạp tiền: +${amount} VND (orderCode: ${orderCode}), số dư mới ${wallet.balance} VND`
    });

    // BỔ SUNG: Log tạo transaction nạp tiền
    await AuditLog.create({
      TableName: "WalletTransaction",
      PrimaryKeyValue: transaction._id.toString(),
      Operation: "INSERT",
      ChangedByUserId: wallet.userId,
      ChangedAt: new Date(),
      ChangeSummary: `Tạo transaction nạp tiền: ${amount} VND (orderCode: ${orderCode})`
    });

    console.log("Nạp tiền thành công:", transaction.orderCode, "wallet:", wallet._id, "newBalance:", wallet.balance);
    return res.status(200).json({ message: "Nạp tiền thành công và đã cộng vào ví." });
  } catch (error) {
    console.error("Lỗi xử lý webhook PayOS:", error);
    return res.status(500).json({ message: "Lỗi xử lý webhook PayOS", error: error.message });
  }
};
// người dùng  tạo yêu cầu rút tiền từ ví
const withdrawFromWallet = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { amount, note, bankAccountId } = req.body;

    const n = Number(amount);
    if (!amount || isNaN(n) || n <= 0 || !Number.isInteger(n)) {
      return res.status(400).json({ message: "Số tiền không hợp lệ!" });
    }



    if (!bankAccountId)
      return res.status(400).json({ message: "Vui lòng chọn tài khoản ngân hàng!" });

    // Lấy ví người dùng
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: "Không tìm thấy ví" });
    }

    // Kiểm tra số dư
    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Số dư ví không đủ!" });
    }

    // Tạo mã giao dịch
    const orderCodeNumber = Date.now();
    const orderCode = String(orderCodeNumber);

    // Tạo giao dịch rút tiền với trạng thái pending
    const tx = await WalletTransaction.create({
      walletId: wallet._id,
      orderCode,
      typeId: "withdraw",// rút tiền
      amount: -Number(amount),
      balanceAfter: null, // Chưa trừ tiền, chờ admin duyệt
      note: "Rút tiền",
      bankAccountId,
      status: "pending", // Chờ admin duyệt
      createdAt: new Date(),
    });

    //  Notification tạo lệnh rút tiền
    await Notification.create({
      user: wallet.userId,
      notificationType: "Wallet Withdraw Requested",
      title: "Yêu cầu rút tiền",
      body: `Bạn vừa yêu cầu rút ${Math.abs(amount).toLocaleString()} VND. Vui lòng chờ admin duyệt.`,
      metaData: JSON.stringify({ amount, orderCode, bankAccountId }),
      isRead: false
    });

    //  Log tạo transaction rút tiền
    await AuditLog.create({
      TableName: "WalletTransaction",
      PrimaryKeyValue: tx._id.toString(),
      Operation: "INSERT",
      ChangedByUserId: wallet.userId,
      ChangedAt: new Date(),
      ChangeSummary: `Tạo transaction rút tiền: ${amount} VND (orderCode: ${orderCode})`
    });

    return res.status(201).json({
      message: "Tạo yêu cầu rút tiền thành công. Vui lòng chờ admin xét duyệt.",
      transaction: tx,
    });
  } catch (error) {
    console.error("Lỗi tạo yêu cầu rút tiền:", error);
    return res.status(500).json({ message: "Lỗi tạo yêu cầu rút tiền", error: error.message });
  }
};
// Lấy 3 giao dịch gần nhất của ví người dùng
const getRecentWalletTransactions = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ message: "Không tìm thấy ví" });

    let transactions = await WalletTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'orderId',
        select: 'itemSnapshot.title', // lấy tên sản phẩm cho USER_PAYMENT
      })
      .lean();


    transactions = transactions.filter(tx => {
      if (tx.typeId === "deposit") {
        return tx.balanceAfter !== null;
      }
      return true; // Cho withdraw, USER_PAYMENT, các loại khác hiện hết
    });

    transactions = transactions.slice(0, 3);

    res.json({ message: "OK", transactions });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy lịch sử giao dịch", error: error.message });
  }
};

const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ message: "Không tìm thấy ví" });

    let transactions = await WalletTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'orderId',
        select: 'itemSnapshot.title', // lấy tên sản phẩm cho USER_PAYMENT
      })
      .lean();


    transactions = transactions.filter(tx => {
      if (tx.typeId === "deposit") {
        return tx.balanceAfter !== null;
      }
      return true; // withdraw, USER_PAYMENT... luôn giữ lại
    });

    res.json({ message: "OK", transactions });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy lịch sử giao dịch", error: error.message });
  }
};



module.exports = {
  getMyWallet,
  depositToWallet,
  handlePayOSWebhook,
  withdrawFromWallet,
  getRecentWalletTransactions,
  getWalletTransactions



};