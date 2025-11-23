const cron = require("node-cron");
const Order = require("../models/Order/Order.model");
const { sendEmail } = require("./sendEmail");

async function sendStartReminder() {
  console.log("⏰ Cron: Checking confirmed orders nearing start time...");

  const orders = await Order.find({
    orderStatus: "confirmed",
    startAt: { $lte: new Date() },
    notifiedStart: false,
  })
    .populate("renterId", "email fullName")
    .populate("ownerId", "email fullName");

  for (const order of orders) {
    if (!order.ownerId?.email) continue;

    await sendEmail(
      order.ownerId.email,
      "Nhắc nhở chuẩn bị hàng để bàn giao",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 20px;">
          <h2 style="color: #1e40af; margin: 0; font-size: 20px;">📦 Nhắc nhở bàn giao hàng</h2>
        </div>
        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
          <p style="color: #374151; font-size: 16px;">
            Chào <strong>${
              order.ownerId.fullName || order.ownerId.email
            }</strong>,
          </p>
          <p style="color: #374151; font-size: 16px;">Đơn hàng <strong>#${
            order._id
          }</strong> đã đến thời gian bắt đầu thuê.</p>
          <p style="color: #374151; font-size: 16px;">Hãy chuẩn bị và bàn giao vật phẩm đúng lịch.</p>
        </div>
      </div>
    `
    );

    await Order.findByIdAndUpdate(order._id, { notifiedStart: true });

    console.log(`🔔 Reminder sent: ${order._id}`);
  }
}

//  Job hủy đơn quá hạn
async function cancelExpiredPendingOrders() {
  console.log("⏰ Cron: Checking expired pending orders...");
try {
  console.log("🕒 Now (server time):", new Date());
  const now = new Date();

  const orders = await Order.find({
    orderStatus: "pending",
    startAt: { $lte: now },
  });

  for (const order of orders) {
    order.orderStatus = "cancelled";
    order.cancelReason = "Quá ngày thuê của khách ghi trên đơn hàng.";
    await order.save();
    console.log(`❌ Auto-canceled order: ${order._id}`);
  }
} catch (error) {
    console.error("❌ Error in cancelExpiredPendingOrders:", error);
  }
  
}

// === Cron Jobs ===

// Chạy mỗi phút
cron.schedule("* * * * *", sendStartReminder);

// Chạy mỗi 5 phút
cron.schedule("* * * * *", cancelExpiredPendingOrders);

module.exports = { sendStartReminder, cancelExpiredPendingOrders };
