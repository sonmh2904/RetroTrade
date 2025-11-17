const cron = require("node-cron");
const Order = require("../models/Order/Order.model");
const { sendEmail } = require("./sendEmail");

cron.schedule("* * * * *", async () => {
  console.log("⏰ Cron: Checking confirmed orders nearing start time...");

  try {
    
    const orders = await Order.find({
      orderStatus: "confirmed",
      startAt: { $lte: new Date() },
      notifiedStart: false,
    })
      .populate("renterId", "email fullName")
      .populate("ownerId", "email fullName");

    for (const order of orders) {
      if (!order.renterId?.email || !order.ownerId?.email) {
        console.warn(`⚠️ Missing email for order ${order._id}`);
        continue;
      }

      // Gửi email đến chủ sở hữu
     await sendEmail(
       order.ownerId.email,
       "Nhắc nhở chuẩn bị hàng để bàn giao",
       `
    <p>Đơn hàng #${order._id} đã đến thời gian bắt đầu thuê.</p>
    <p>Hãy chuẩn bị và bàn giao vật phẩm đúng lịch.</p>
  `
     );


      console.log(
        `🔔 Reminder sent for order ${order._id} → owner: ${order.ownerId.email}`
      );
    }
  } catch (err) {
    console.error("❌ Cron reminder job failed:", err);
  }
});
