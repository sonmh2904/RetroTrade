const express = require("express");
const { getMyWallet, depositToWallet, handlePayOSWebhook, withdrawFromWallet, getRecentWalletTransactions, getWalletTransactions } = require("../../controller/wallet/wallet.Controller");
const { authenticateToken, authorizeRoles } = require("../../middleware/auth");
const { addBankAccount, getAllBankAccounts, deleteBankAccount, getBankList } = require("../../controller/wallet/bank.Controler");
const { getWithdrawalRequests, reviewWithdrawalRequest, completeWithdrawal, getAllWalletTransactions, getAdminWallet, getAllRefundsForAdmin } = require("../../controller/wallet/admin.Controller");
const { payment } = require("../../controller/wallet/payment.Controller");
const { payExtensionFee } = require("../../controller/wallet/extensionPayment.controller");
const router = express.Router();

// Các router cho người dùng đã xác thực
router.get("/my-wallet", authenticateToken, getMyWallet);
router.post("/deposit", authenticateToken, depositToWallet);
router.post("/payos-webhook", handlePayOSWebhook);
router.post('/add', authenticateToken, addBankAccount);
router.get('/my-banks', authenticateToken, getAllBankAccounts);
router.delete('/delete/:id', authenticateToken, deleteBankAccount);
// người dùng rút tiền từ ví
router.post("/withdraw", authenticateToken, withdrawFromWallet);
router.get('/banks', getBankList); // Lấy danh sách ngân hàng
//  route thanh toán đơn hàng, chỉ người dùng đã xác thực mới được thanh toán
router.post("/order/payment", authenticateToken, payment);
// thanh toán gia hạn
router.post("/order/extension/pay", authenticateToken, payExtensionFee);
router.get("/transactions/recent", authenticateToken, getRecentWalletTransactions); // Lấy 3 giao dịch gần nhất của ví người dùng
router.get("/user/transactions", authenticateToken, getWalletTransactions); // Lấy tất cả giao dịch của ví người dùng


// Các router chỉ admin  có quyền truy cập
router.get("/withdrawal-requests", authenticateToken, authorizeRoles("admin"), getWithdrawalRequests);
router.put("/withdrawal-requests/:transactionId/review", authenticateToken, authorizeRoles("admin"), reviewWithdrawalRequest);
router.put("/withdrawal-requests/:transactionId/complete", authenticateToken, authorizeRoles("admin"), completeWithdrawal);
router.get("/transactions", authenticateToken, authorizeRoles("admin"), getAllWalletTransactions);
router.get("/admin/wallet", authenticateToken, authorizeRoles("admin"), getAdminWallet);
router.get("/admin/refunds",authenticateToken, authorizeRoles("admin"), getAllRefundsForAdmin); // Lấy danh sách hoàn tiền cho admin



module.exports = router; 