const { createNotification } = require("./createNotification");

/**
 * Gửi thông báo khi tạo đơn hàng mới
 * @param {Object} order - order document vừa tạo
 */
const notifyOrderCreated = async (order) => {
  try {
    // Gửi cho người thuê
    await createNotification(
      order.renterId,
      "Order Created",
      "Bạn có một đơn hàng mới",
      `Đơn hàng "${order.itemSnapshot.title}" đã được tạo.`,
      { orderId: order._id, total: order.totalAmount }
    );

    // Gửi cho chủ sở hữu sản phẩm
    await createNotification(
      order.ownerId,
      "Order Created",
      "Bạn có một đơn hàng mới",
      `Sản phẩm "${order.itemSnapshot.title}" vừa có đơn hàng mới.`,
      { orderId: order._id, total: order.totalAmount }
    );
  } catch (error) {
    console.error("Error notifying order created:", error);
  }
};

/**
 * Gửi thông báo khi đơn hàng được xác nhận
 * @param {Object} order - order document
 */
const notifyOrderConfirmed = async (order) => {
  try {
    await createNotification(
      order.renterId,
      "Order Confirmed",
      "Đơn hàng đã được xác nhận",
      `Đơn hàng "${order.itemSnapshot.title}" đã được xác nhận.`,
      { orderId: order._id }
    );

    await createNotification(
      order.ownerId,
      "Order Confirmed",
      "Đơn hàng đã được xác nhận",
      `Đơn hàng "${order.itemSnapshot.title}" đã được xác nhận.`,
      { orderId: order._id }
    );
  } catch (error) {
    console.error("Error notifying order confirmed:", error);
  }
};

/**
 * Gửi thông báo khi đơn hàng hoàn thành
 * @param {Object} order - order document
 */
const notifyOrderCompleted = async (order) => {
  try {
    await createNotification(
      order.renterId,
      "Order Completed",
      "Đơn hàng đã hoàn thành",
      `Đơn hàng "${order.itemSnapshot.title}" đã được hoàn tất.`,
      { orderId: order._id }
    );

    await createNotification(
      order.ownerId,
      "Order Completed",
      "Đơn hàng đã hoàn thành",
      `Đơn hàng "${order.itemSnapshot.title}" đã được hoàn tất.`,
      { orderId: order._id }
    );
  } catch (error) {
    console.error("Error notifying order completed:", error);
  }
};
/**
 * Gửi thông báo khi đơn hàng bắt đầu thuê
 * @param {Object} order - order document
 */
const notifyOrderStarted = async (order) => {
  try {
    await createNotification(
      order.renterId,
      "Order Started",
      "Bắt đầu thuê",
      `Đơn hàng "${order.itemSnapshot.title}" đã được bắt đầu.`,
      { orderId: order._id, startAt: order.lifecycle.startedAt }
    );

    await createNotification(
      order.ownerId,
      "Order Started",
      "Bắt đầu cho thuê",
      `Bạn đã bắt đầu cho thuê sản phẩm "${order.itemSnapshot.title}".`,
      { orderId: order._id, startAt: order.lifecycle.startedAt }
    );
  } catch (error) {
    console.error("Error notifying order started:", error);
  }
};

/**
 * Gửi thông báo khi người thuê trả lại sản phẩm
 * @param {Object} order - order document
 */
const notifyOrderReturned = async (order) => {
  try {
    await createNotification(
      order.renterId,
      "Order Returned",
      "Đã trả sản phẩm",
      `Bạn đã trả sản phẩm "${order.itemSnapshot.title}".`,
      { orderId: order._id, returnedAt: order.returnInfo.returnedAt }
    );

    await createNotification(
      order.ownerId,
      "Order Returned",
      "Sản phẩm đã được trả",
      `Người thuê đã trả sản phẩm "${order.itemSnapshot.title}".`,
      { orderId: order._id, returnedAt: order.returnInfo.returnedAt, notes: order.returnInfo.notes }
    );
  } catch (error) {
    console.error("Error notifying order returned:", error);
  }
};
const notifyOrderCancelled = async (order) => {
  try {
    // Gửi notification cho cả owner và renter
    const users = [order.ownerId, order.renterId];

    for (const userId of users) {
      await createNotification(
        userId,
        "Order Cancelled",
        "Đơn hàng đã bị hủy",
        `Đơn hàng #${order.orderGuid} đã bị hủy.`,
        {
          orderId: order._id,
          orderGuid: order.orderGuid,
          cancelReason: order.cancelReason || "No reason provided",
        }
      );
    }
  } catch (err) {
    console.error("notifyOrderCancelled error:", err);
  }
};

/**
 * Notify user when order is disputed
 * @param {Object} order - Order document
 */
const notifyOrderDisputed = async (order) => {
  try {
    // Gửi notification cho cả owner và renter
    const users = [order.ownerId, order.renterId];

    for (const userId of users) {
      await createNotification(
        userId,
        "Order Disputed",
        "Đơn hàng đang tranh chấp",
        `Đơn hàng #${order.orderGuid} đã được mở tranh chấp.`,
        {
          orderId: order._id,
          orderGuid: order.orderGuid,
          disputeReason: order.disputeReason || "No reason provided",
        }
      );
    }
  } catch (err) {
    console.error("notifyOrderDisputed error:", err);
  }
};


module.exports = {
  notifyOrderCreated,
  notifyOrderConfirmed,
  notifyOrderCompleted,
  notifyOrderStarted,
  notifyOrderReturned,
  notifyOrderCancelled,
  notifyOrderDisputed
};
