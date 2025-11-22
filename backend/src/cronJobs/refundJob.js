const cron = require('node-cron');
const Order = require('../models/Order/Order.model');
const { refundOrder } = require('../controller/wallet/userRefund.Controller');
const { refundPendingOrder } = require('../controller/wallet/refundCancelledOrder.Controller');

cron.schedule('*/1 * * * *', async () => {
  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const orders = await Order.find({
      orderStatus: "completed",
      isRefunded: false,
      "lifecycle.completedAt": { $gte: twentyFourHoursAgo, $lte: now }
    });

    console.log('Order collection:', Order.collection.collectionName);
    console.log('Orders found:', orders.map(o => ({ id: o._id, isRefunded: o.isRefunded, completedAt: o.lifecycle.completedAt })));
    console.log(`${orders.length} đơn hàng tìm được để test hoàn tiền...`);

    for (const order of orders) {
      console.log(`Kiểm tra đơn ${order._id}, completedAt: ${order.lifecycle.completedAt}`);
      if (order.lifecycle.completedAt <= twoMinutesAgo) {
        console.log(`Bắt đầu hoàn tiền đơn ${order._id}...`);
        try {
          await refundOrder(order._id);
          console.log(`Hoàn tiền tự động cho đơn ${order._id} thành công.`);
        } catch (err) {
          console.error(`Lỗi hoàn tiền đơn ${order._id}:`, err);
        }
      } else {
        console.log(`Đơn ${order._id} chưa đủ 2 phút kể từ khi hoàn thành, bỏ qua.`);
      }
    }
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đơn:', error);
  }
});

// HOÀN TIỀN ĐƠN BỊ HUỶ (cancelled/pending đã thanh toán)
cron.schedule('*/1 * * * *', async () => {
  try {
    const cancelledOrders = await Order.find({
      isRefunded: false,
      paymentStatus: "paid",
      orderStatus: { $in: ["pending", "cancelled"] }
    });

    for (const order of cancelledOrders) {
      try {
        await refundPendingOrder(order._id);
        console.log(`Hoàn tiền tự động cho đơn bị huỷ ${order._id} thành công.`);
      } catch (err) {
        console.error(`Lỗi hoàn tiền đơn bị huỷ ${order._id}:`, err);
      }
    }
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đơn cancelled/pending:', error);
  }
});


module.exports = cron;
