const cron = require('node-cron');
const Order = require('../models/Order/Order.model');
const { refundOrder } = require('../controller/wallet/userRefund.Controller');

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

module.exports = cron;
