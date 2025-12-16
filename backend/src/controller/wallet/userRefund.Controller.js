const mongoose = require("mongoose");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const User = require("../../models/User.model");
const Order = require("../../models/Order/Order.model");
const Notification = require("../../models/Notification.model");
const AuditLog = require("../../models/AuditLog.model");
const Report = require("../../models/Order/Reports.model");

// Tiền trong 1 order:
// T = totalAmount - depositAmount - serviceFee  (tiền thuê gốc)
// D = depositAmount                             (tiền cọc)
// F = serviceFee                                (phí admin)

// Nếu KHÔNG có dispute Resolved:
//   - completed: renter +D, owner +T, admin giữ F
//   - cancelled: renter +finalAmount, owner 0, admin chi số đó

// Nếu CÓ dispute Resolved:
//   reporter === owner  (Case 1):
//     comp = D * R
//     if comp >= D:
//       owner: T + D
//       renter: 0
//     else:
//       owner: T + comp
//       renter: D - comp
//     admin: giữ F
//
//   reporter === renter (Case 2):
//     refundToRenter = T * R
//     ownerReceive   = T - refundToRenter
//     renter: refundToRenter + D
//     owner:  ownerReceive
//     admin:  giữ F
//
// Trạng thái:
//   - resolveDispute set orderStatus = "cancelled" hoặc "progress"
//   - refundOrder chỉ chạy khi orderStatus in ["completed","cancelled"]
//     và luôn áp dụng các rule trên.


async function refundOrder(orderId, session = null) {
  let ownSession = false;

  if (!session) {
    session = await mongoose.startSession();
    ownSession = true;
    session.startTransaction();
  }

  try {
    const order = await Order.findById(orderId)
      .populate("itemId", "DepositAmount")
      .session(session);

    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // Chỉ hoàn tiền cho completed hoặc cancelled
    if (!["completed", "cancelled"].includes(order.orderStatus)) {
      throw new Error("Chỉ hoàn tiền cho đơn completed hoặc cancelled");
    }

    if (order.isRefunded) {
      throw new Error("Đơn hàng đã được hoàn tiền");
    }

    const { renterId, ownerId } = order;

    // ===== THÀNH PHẦN TIỀN CƠ BẢN =====
    const depositAmount =
      order.depositAmount ?? order.itemId?.DepositAmount ?? 0; // D
    const serviceFee = order.serviceFee ?? 0; // F
    const totalAmount = order.totalAmount ?? 0;

    const rentAmount = totalAmount - depositAmount - serviceFee; // T

    // Tổng giảm giá áp lên đơn
    const discountTotal = order.discount?.totalAmountApplied ?? 0;

    // Tổng sau giảm (nếu có finalAmount thì ưu tiên dùng)
    const finalTotal = order.finalAmount ?? (totalAmount - discountTotal);

    // Tiền thuê THỰC TRẢ sau giảm, không gồm cọc, không gồm phí
    const rentPaid = finalTotal - depositAmount - serviceFee;    // T_paid >= 0

    // ===== KIỂM TRA DISPUTE RESOLVED =====
    let amountToRenter = 0;
    let amountToOwner = 0;

    let dispute = null;
    if (order.disputeId) {
      dispute = await Report.findById(order.disputeId).session(session);
    }

    const hasResolvedDispute =
      dispute && dispute.status === "Resolved" && dispute.resolution;

    if (!hasResolvedDispute) {
      // ===== KHÔNG CÓ KHIẾU NẠI =====
      if (order.orderStatus === "completed") {
        // Renter +D, Owner +T
        amountToRenter = depositAmount;
        amountToOwner = rentAmount;
      } else if (order.orderStatus === "cancelled") {
        // Hoàn toàn bộ số đã trả cho renter (T + D + F)
        const refundAmount = order.finalAmount ?? order.totalAmount ?? 0;
        amountToRenter = refundAmount;
        amountToOwner = 0;
      }
    } else {
      // ===== CÓ KHIẾU NẠI – ÁP DỤNG CASE 1 / CASE 2 CHO CẢ completed & cancelled =====
      const reporterId =
        typeof dispute.reporterId === "object"
          ? dispute.reporterId.toString()
          : dispute.reporterId.toString();

      const rPercent = dispute.resolution.refundPercentage ?? 0;
      const r = rPercent / 100;

      if (reporterId === renterId.toString()) {
        // ---- CASE 2: RENTER KHIẾU NẠI ----
        // CASE 2: renter khiếu nại – base = tiền thuê THỰC TRẢ
        const baseRent = Math.max(rentPaid, 0);
        const refundToRenter = baseRent * r;
        const ownerReceive = baseRent - refundToRenter;

        amountToRenter = refundToRenter + depositAmount;
        amountToOwner = ownerReceive;
      } else if (reporterId === ownerId.toString()) {
        // ---- CASE 1: OWNER KHIẾU NẠI ----
        // Base = D, không hoàn F
        const comp = depositAmount * r;

        if (comp >= depositAmount) {
          // Chủ ăn hết cọc
          amountToOwner = rentAmount + depositAmount; // T + D
          amountToRenter = 0;
        } else {
          // Chủ ăn 1 phần cọc
          amountToOwner = rentAmount + comp;       // T + D*r
          amountToRenter = depositAmount - comp;   // D*(1-r)
        }
      } else {
        amountToRenter = 0;
        amountToOwner = 0;
      }
    }


    // ==== LOG DEBUG CHI TIẾT ====
    const rPercent =
      dispute && dispute.resolution
        ? dispute.resolution.refundPercentage ?? 0
        : 0;

    console.log("[REFUND_ORDER_RESULT]", {
      orderId: order._id.toString(),
      orderCode: order.orderGuid,
      orderStatus: order.orderStatus,
      hasDispute: !!order.disputeId,
      disputeStatus: dispute?.status || null,
      refundPercentage: rPercent,
      rentAmount, // T
      depositAmount, // D
      serviceFee, // F
      amountToRenter,
      amountToOwner,
    });

    // ===== LẤY VÍ CÁC BÊN =====
    const adminUser = await User.findOne({ role: "admin" }).session(session);
    if (!adminUser) throw new Error("Không tìm thấy admin");

    const adminWallet = await Wallet.findOne({
      userId: adminUser._id,
    }).session(session);
    if (!adminWallet) throw new Error("Không tìm thấy ví của admin");

    const renterWallet = await Wallet.findOne({ userId: renterId }).session(
      session
    );
    if (!renterWallet) throw new Error("Không tìm thấy ví người thuê");

    const ownerWallet = await Wallet.findOne({ userId: ownerId }).session(
      session
    );
    if (!ownerWallet) throw new Error("Không tìm thấy ví chủ đồ");

    const orderCode = order.orderGuid;
    const totalOut = amountToRenter + amountToOwner;

    if (adminWallet.balance < totalOut) {
      throw new Error("Ví admin không đủ để hoàn tiền! Liên hệ kỹ thuật.");
    }

    // ===== CẬP NHẬT SỐ DƯ =====
    adminWallet.balance -= totalOut;
    renterWallet.balance += amountToRenter;
    ownerWallet.balance += amountToOwner;

    await adminWallet.save({ session });
    await renterWallet.save({ session });
    await ownerWallet.save({ session });

    // ===== TRANSACTION =====
    const txDocs = [];

    if (amountToRenter > 0) {
      txDocs.push(
        {
          walletId: adminWallet._id,
          typeId: hasResolvedDispute
            ? "payout_renter_refund_dispute"
            : "payout_renter_refund",
          amount: -amountToRenter,
          orderId: order._id,
          orderCode: orderCode + "_admin_renter",
          note: hasResolvedDispute
            ? `Admin chi tiền hoàn/ bồi thường cho người thuê từ đơn ${order.itemSnapshot?.title || "đơn hàng"}`
            : `Admin hoàn tiền cho người thuê (cọc/đơn huỷ) từ đơn ${order.itemSnapshot?.title || "đơn hàng"}`,
          status: "completed",
        },
        {
          walletId: renterWallet._id,
          typeId: hasResolvedDispute ? "renter_refund_dispute" : "renter_refund",
          amount: amountToRenter,
          orderId: order._id,
          orderCode: orderCode + "_renter",
          note: hasResolvedDispute
            ? `Nhận tiền hoàn/ bồi thường sau khiếu nại cho đơn ${order.itemSnapshot?.title || "đơn hàng"}`
            : `Nhận tiền hoàn cho đơn ${order.itemSnapshot?.title || "đơn hàng"}`,
          status: "completed",
        }
      );
    }

    if (amountToOwner > 0) {
      txDocs.push(
        {
          walletId: adminWallet._id,
          typeId: hasResolvedDispute
            ? "payout_owner_payment_dispute"
            : "payout_owner_payment",
          amount: -amountToOwner,
          orderId: order._id,
          orderCode: orderCode + "_admin_owner",
          note: hasResolvedDispute
            ? `Admin chi tiền cho chủ đồ (sau xử lý khiếu nại) - đơn ${order.itemSnapshot?.title || "đơn hàng"}`
            : `Admin trả tiền thuê cho chủ đồ - đơn ${order.itemSnapshot?.title || "đơn hàng"}`,
          status: "completed",
        },
        {
          walletId: ownerWallet._id,
          typeId: hasResolvedDispute ? "owner_payment_dispute" : "owner_payment",
          amount: amountToOwner,
          orderId: order._id,
          orderCode: orderCode + "_owner",
          note: hasResolvedDispute
            ? `Nhận tiền sau khiếu nại cho đơn ${order.itemSnapshot?.title || "đơn hàng"}`
            : `Nhận tiền cho thuê từ đơn ${order.itemSnapshot?.title || "đơn hàng"}`,
          status: "completed",
        }
      );
    }

    if (txDocs.length > 0) {
      await WalletTransaction.create(txDocs, { session, ordered: true });
    }

    // ===== CẬP NHẬT ORDER =====
    order.isRefunded = true;
    order.refundedAt = new Date();
    await order.save({ session });

    // ===== THÔNG BÁO CHO RENTER/OWNER - LUÔN GỬI =====
    // 1. Notification cho RENTER (LUÔN gửi)
    const renterNoti = {
      user: renterId,
      notificationType: hasResolvedDispute
        ? "Dispute Refund Completed"
        : "Order Refund Completed",
      title: hasResolvedDispute
        ? "Hoàn tiền sau khiếu nại"
        : "Hoàn tiền đơn hàng",
      body: hasResolvedDispute
        ? `Khiếu nại đơn #${orderCode} đã xử lý. Bạn nhận ${amountToRenter.toLocaleString()} VND.${amountToRenter === depositAmount
          ? " (Giữ nguyên cọc - khiếu nại không hợp lệ)"
          : amountToRenter === 0
            ? "(Cọc đã bị trừ hết bồi thường cho chủ đồ)"
            : `(Cọc ${depositAmount.toLocaleString()} VND ${amountToRenter > depositAmount
              ? "+ bồi thường thêm"
              : "- bồi thường"
            })`
        }.`
        : `Đơn #${orderCode} (${order.orderStatus}) đã hoàn tiền.
     Bạn nhận ${amountToRenter.toLocaleString()} VND.
     Số dư ví hiện tại: ${renterWallet.balance.toLocaleString()} VND.`,
      metaData: JSON.stringify({
        orderId: order._id,
        orderCode,
        orderStatus: order.orderStatus,
        hasDispute: hasResolvedDispute,
        amountToRenter,
        depositAmount,
        rentAmount,
      }),
      isRead: false,
    };

    console.log("[NOTI_RENTER_DATA]", renterNoti);
    await Notification.create([renterNoti], { session });


    // 2. Notification cho OWNER (LUÔN gửi)
    const ownerNoti = {
      user: ownerId,
      notificationType: hasResolvedDispute
        ? "Dispute Payment Completed"
        : "Owner Payment Completed",
      title: hasResolvedDispute
        ? "Thanh toán sau khiếu nại"
        : "Kết quả đơn hàng",
      body: hasResolvedDispute
        ? `Khiếu nại đơn #${orderCode} đã xử lý. Bạn nhận ${amountToOwner.toLocaleString()} VND.${amountToOwner === 0
          ? " (Tiền thuê đã bị trừ hết bồi thường cho người thuê)"
          : amountToOwner === rentAmount
            ? " (Giữ nguyên tiền thuê - khiếu nại không hợp lệ)"
            : amountToOwner > rentAmount
              ? `(Tiền thuê ${rentAmount.toLocaleString()} VND + phần cọc bồi thường)`
              : " (Bị trừ tiền thuê do renter khiếu nại)"
        }.`
        : `Đơn #${orderCode} (${order.orderStatus}) đã hoàn tiền.
     Bạn nhận ${amountToOwner.toLocaleString()} VND.
     Số dư ví hiện tại: ${ownerWallet.balance.toLocaleString()} VND.`,
      metaData: JSON.stringify({
        orderId: order._id,
        orderCode,
        orderStatus: order.orderStatus,
        hasDispute: hasResolvedDispute,
        amountToOwner,
        rentAmount,
        depositAmount,
      }),
      isRead: false,
    };

    console.log("[NOTI_OWNER_DATA]", ownerNoti);
    await Notification.create([ownerNoti], { session });


    console.log(
      `[NOTIFICATION] Gửi thông báo hoàn tiền cho renter ${renterId} và owner ${ownerId} của đơn ${orderCode}`
    );
    if (ownSession) {
      await session.commitTransaction();
      session.endSession();
    }

    return true;
  } catch (error) {
    console.error("[REFUND_ORDER_ERROR]", orderId?.toString(), error);
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
