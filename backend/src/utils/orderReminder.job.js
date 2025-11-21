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
      try {
        await sendEmail(
          order.ownerId.email,
          "Nhắc nhở chuẩn bị hàng để bàn giao",
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 20px;">
              <h2 style="color: #1e40af; margin: 0; font-size: 20px;">📦 Nhắc nhở bàn giao hàng</h2>
            </div>
            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
                Chào <strong>${order.ownerId.fullName || order.ownerId.email}</strong>,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Đơn hàng <strong>#${order._id}</strong> đã đến thời gian bắt đầu thuê.
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Hãy chuẩn bị và bàn giao vật phẩm đúng lịch cho người thuê.
              </p>
              <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                Trân trọng,<br>
                <strong>Đội ngũ RetroTrade</strong>
              </p>
            </div>
          </div>
        `
        );

        // Mark order as notified
        await Order.findByIdAndUpdate(order._id, { notifiedStart: true });

        console.log(
          `🔔 Reminder sent for order ${order._id} → owner: ${order.ownerId.email}`
        );
      } catch (emailError) {
        console.error(`❌ Failed to send email for order ${order._id}:`, emailError);
        // Continue with other orders even if one fails
      }
    }
  } catch (err) {
    console.error("❌ Cron reminder job failed:", err);
  }
});
