
const User = require("../../models/User.model");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const Order = require('../../models/Order/Order.model.js');
const mongoose = require('mongoose');
const payment = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ error: 'Chưa đăng nhập hoặc token không hợp lệ' });
    }
    const userId = req.user._id;
    const { orderId } = req.body;

    if (!orderId) return res.status(400).json({ error: 'Thiếu orderId' });
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'ID không hợp lệ' });
    }

    try {
        // Kiểu ObjectId cho truy vấn
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const orderObjectId = new mongoose.Types.ObjectId(orderId);

        // 1. Tìm user
        const user = await User.findById(userObjectId);
        if (!user) return res.status(404).json({ error: 'Người dùng không tồn tại' });
        if (user.role === 'admin') {
            return res.status(403).json({ error: 'Admin không được phép thanh toán đơn hàng' });
        }

        // 2. Tìm order
        const order = await Order.findOne({ _id: orderObjectId, isDeleted: { $ne: true } });
        if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại hoặc đã xóa' });
        if (order.paymentStatus === "paid") return res.status(400).json({ error: 'Đơn hàng đã được thanh toán' });

        // 3. Check đúng owner order
        if (order.renterId.toString() !== userObjectId.toString()) {
            return res.status(403).json({ error: 'Không có quyền thanh toán đơn hàng này' });
        }

        // 4. Check wallet user, đủ tiền
        const userWallet = await Wallet.findOne({ userId: user._id });
        if (!userWallet) return res.status(404).json({ error: 'Ví người dùng không tồn tại' });
        if (userWallet.balance < order.totalAmount) {
            return res.status(400).json({ 
                error: 'Ví người dùng không đủ tiền',
                message: `Số dư ví của bạn là ${userWallet.balance.toLocaleString('vi-VN')} VNĐ, nhưng cần ${order.totalAmount.toLocaleString('vi-VN')} VNĐ để thanh toán đơn hàng này. Vui lòng nạp thêm tiền vào ví.`,
                balance: userWallet.balance,
                required: order.totalAmount,
                shortage: order.totalAmount - userWallet.balance
            });
        }

        // 5. Tìm admin/ ví admin
        const adminUser = await User.findOne({ role: 'admin' });
        
        if (!adminUser) return res.status(404).json({ error: 'Không tìm thấy user admin hệ thống' });
        const adminManagedWallet = await Wallet.findOne({ userId: adminUser._id });
        if (!adminManagedWallet) return res.status(404).json({ error: 'Ví quản lý tiền web không tồn tại' });

        // 6. Transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            userWallet.balance -= order.totalAmount;
            await userWallet.save({ session });
            adminManagedWallet.balance += order.totalAmount;
            await adminManagedWallet.save({ session });

            await WalletTransaction.create([{
                walletId: userWallet._id,
                orderId: order._id,
                orderCode: order.orderGuid,
                typeId: "USER_PAYMENT",
                amount: -order.totalAmount,
                balanceAfter: userWallet.balance,
                note: 'Thanh toán đơn hàng thuê, trừ ví người dùng',
                status: 'completed',
                createdAt: new Date()
            }], { session });

            await WalletTransaction.create([{
                walletId: adminManagedWallet._id,
                orderId: order._id,
                orderCode: order.orderGuid + "_admin",
                typeId: "SYSTEM_RECEIVE",
                amount: order.totalAmount,
                balanceAfter: adminManagedWallet.balance,
                note: 'Nhận tiền thanh toán từ user',
                status: 'completed',
                createdAt: new Date()
            }], { session });

            order.paymentStatus = "paid";
            // order.orderStatus = "confirmed";
            order.lifecycle.confirmedAt = new Date();
            await order.save({ session });

            await session.commitTransaction();
            session.endSession();

            return res.json({ success: true, message: 'Thanh toán thành công' });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            // Log đúng lỗi cho backend (1 dòng)
            console.error("Lỗi transaction:", error.message);
            return res.status(500).json({ error: "Lỗi khi thực hiện thanh toán" });
        }
    } catch (error) {
        // Lỗi ngoài business
        console.error("Lỗi ngoài:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    payment,
};
