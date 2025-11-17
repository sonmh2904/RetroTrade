const mongoose = require("mongoose");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const User = require("../../models/User.model");
const Order = require("../../models/Order/Order.model");

// Hàm xử lý logic hoàn tiền theo orderId, có nhận session tùy chọn
async function refundOrder(orderId, session = null) {
    let ownSession = false;
    if (!session) {
        session = await mongoose.startSession();
        ownSession = true;
        session.startTransaction();
    }

    try {
        // Lấy đơn hàng + populate itemId để lấy depositAmount
        const order = await Order.findById(orderId).populate("itemId", "DepositAmount").session(session);
        if (!order || order.orderStatus !== "completed") {
            throw new Error("Đơn hàng chưa hoàn tất!");
        }
        if (order.isRefunded) {
            throw new Error("Đơn hàng đã được hoàn tiền.");
        }
        // Tính toán số tiền hoàn
        const { renterId, ownerId, totalAmount, serviceFee } = order;
        const depositAmount = order.itemId?.DepositAmount ?? 0;
        const ownerReceive = totalAmount - serviceFee - depositAmount;
        const totalOut = depositAmount + ownerReceive;

        const orderCode = order.orderGuid; // Mã đơn hàng cho WalletTransaction

        // Lấy ví các bên
        const adminUser = await User.findOne({ role: "admin" }).session(session);
        if (!adminUser) throw new Error("Không tìm thấy admin");
        const adminWallet = await Wallet.findOne({ userId: adminUser._id }).session(session);
        if (!adminWallet) throw new Error("Không tìm thấy ví của admin");
        const renterWallet = await Wallet.findOne({ userId: renterId }).session(session);
        if (!renterWallet) throw new Error("Không tìm thấy ví của người thuê");
        const ownerWallet = await Wallet.findOne({ userId: ownerId }).session(session);
        if (!ownerWallet) throw new Error("Không tìm thấy ví của chủ đồ");

        if (adminWallet.balance < totalOut) {
            throw new Error("Ví admin không đủ để hoàn tiền! Liên hệ kỹ thuật.");
        }

        // Thay đổi số dư ví
        adminWallet.balance -= totalOut;
        renterWallet.balance += depositAmount;
        ownerWallet.balance += ownerReceive;

        await adminWallet.save({ session });
        await renterWallet.save({ session });
        await ownerWallet.save({ session });

        // Tạo giao dịch lịch sử (thêm ordered:true và orderCode)
        await WalletTransaction.create([
            {
                walletId: adminWallet._id,
                typeId: "payout_renter_refund",
                amount: -depositAmount,
                orderId: order._id,
                orderCode: orderCode + "adminrenter",
                note: "Hoàn tiền cọc cho người thuê",
                status: "completed",
            },
            {
                walletId: adminWallet._id,
                typeId: "payout_owner_payment",
                amount: -ownerReceive,
                orderId: order._id,
                orderCode: orderCode + "adminowner",
                note: "Trả tiền thuê cho chủ đồ",
                status: "completed",
            },
        ], { session, ordered: true });

        await WalletTransaction.create([
            {
                walletId: renterWallet._id,
                typeId: "refund_deposit",
                amount: depositAmount,
                orderId: order._id,
                orderCode: orderCode + "renter",
                note: "Nhận lại tiền cọc",
                status: "completed",
            },
        ], { session, ordered: true });

        await WalletTransaction.create([
            {
                walletId: ownerWallet._id,
                typeId: "owner_payment",
                amount: ownerReceive,
                orderId: order._id,
                orderCode: orderCode + "owner",
                note: "Nhận tiền cho thuê",
                status: "completed",
            },
        ], { session, ordered: true });

        // Đánh dấu đơn đã hoàn tiền
        order.isRefunded = true;
        order.refundedAt = new Date();
        await order.save({ session });

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

// Controller API chỉ xử lý req res, gọi logic hoàn tiền
async function userRefund(req, res) {
    try {
        const { orderId } = req.params;
        const actingUser = req.user;

        if (!actingUser) return res.status(401).json({ message: "Unauthorized" });
        if (!["owner", "renter", "moderator"].includes(actingUser.role)) {
            return res.status(403).json({ message: "Không có quyền hoàn tiền" });
        }
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: "OrderId không hợp lệ" });
        }

        await refundOrder(orderId);
        return res.status(200).json({ success: true, message: "Hoàn tiền đơn hàng thành công" });
    } catch (error) {
        console.error("Lỗi hoàn tiền đơn hàng:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { userRefund, refundOrder };
