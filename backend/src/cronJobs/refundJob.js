const cron = require("node-cron");
const Order = require("../models/Order/Order.model");
const { refundOrder } = require("../controller/wallet/userRefund.Controller");
const {refundPendingOrder , refundExtensionRequest} = require("../controller/wallet/refundCancelledOrder.Controller");
const ExtensionRequest = require("../models/Order/ExtensionRequest.model");


cron.schedule("*/1 * * * *", async () => {
  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const orders = await Order.find({
      orderStatus: "completed",
      isRefunded: false,
      "lifecycle.completedAt": { $gte: twentyFourHoursAgo, $lte: now },
    });

    console.log("Order collection:", Order.collection.collectionName);
    console.log(
      "Orders found:",
      orders.map((o) => ({
        id: o._id,
        isRefunded: o.isRefunded,
        completedAt: o.lifecycle.completedAt,
      }))
    );
    console.log(`${orders.length} đơn hàng tìm được để test hoàn tiền...`);

    for (const order of orders) {
      console.log(
        `Kiểm tra đơn ${order._id}, completedAt: ${order.lifecycle.completedAt}`
      );
      if (order.lifecycle.completedAt <= twoMinutesAgo) {
        console.log(`Bắt đầu hoàn tiền đơn ${order._id}...`);
        try {
          await refundOrder(order._id);
          console.log(`Hoàn tiền tự động cho đơn ${order._id} thành công.`);
        } catch (err) {
          console.error(`Lỗi hoàn tiền đơn ${order._id}:`, err);
        }
      } else {
        console.log(
          `Đơn ${order._id} chưa đủ 2 phút kể từ khi hoàn thành, bỏ qua.`
        );
      }
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn:", error);
  }
});

// HOÀN TIỀN ĐƠN BỊ HUỶ (cancelled  đã thanh toán)
cron.schedule("*/1 * * * *", async () => {
  try {
    const cancelledOrders = await Order.find({
      isRefunded: false,
      paymentStatus: "paid",
      orderStatus: "cancelled", 
    });

    for (const order of cancelledOrders) {
      try {
        await refundPendingOrder(order._id);
        console.log(
          `Hoàn tiền tự động cho đơn bị huỷ ${order._id} thành công.`
        );
      } catch (err) {
        console.error(`Lỗi hoàn tiền đơn bị huỷ ${order._id}:`, err);
      }
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn cancelled/pending:", error);
  }
});

// 3. TỰ ĐỘNG HOÀN TIỀN KHI YÊU CẦU GIA HẠN BỊ TỪ CHỐI HOẶC QUÁ HẠN
cron.schedule("*/2 * * * *", async () => {  // Chạy mỗi 2 phút (nhẹ server)
  try {
    const expiredTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 giờ không phản hồi

    const pendingOrRejectedRequests = await ExtensionRequest.find({
      isRefunded: false,
      extensionFee: { $gt: 0 },
      $or: [
        { status: "rejected" },
        { 
          status: "pending", 
          createdAt: { $lte: expiredTime }  // Quá 48h không duyệt → tự động coi như reject
        }
      ]
    }).populate("orderId");

    console.log(`[AUTO REFUND EXTENSION] Tìm thấy ${pendingOrRejectedRequests.length} yêu cầu gia hạn cần hoàn tiền`);

    for (const request of pendingOrRejectedRequests) {
      try {
        // Nếu đang pending quá hạn → tự động chuyển thành rejected
        if (request.status === "pending" && request.createdAt <= expiredTime) {
          request.status = "rejected";
          request.notes = (request.notes || "") + "\n[Tự động] Quá hạn 48h không phản hồi";
          await request.save();
        }

        await refundExtensionRequest(request._id);
        console.log(`Hoàn tiền gia hạn tự động thành công: ${request._id} - Đơn #${request.orderId?.orderGuid}`);
      } catch (err) {
        console.error(`Lỗi hoàn tiền gia hạn ${request._id}:`, err.message);
      }
    }
  } catch (error) {
    console.error("Lỗi cron hoàn tiền gia hạn:", error);
  }
});

module.exports = cron;
