const mongoose = require("mongoose");
const { Types } = mongoose;

const loyaltyPointTransactionSchema = new mongoose.Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    points: { type: Number, required: true }, // Số điểm cộng/trừ (có thể âm)
    balance: { type: Number, required: true }, // Số dư sau transaction
    type: {
      type: String,
      enum: [
        "daily_login", // Đăng nhập hàng ngày
        "order_completed", // Đặt hàng thành công
        "order_cancelled", // Hủy đơn (trừ điểm)
        "referral", // Giới thiệu bạn bè
        "game_reward", // Phần thưởng từ mini game (tương lai)
        "admin_adjustment", // Điều chỉnh bởi admin
        "expired", // Điểm hết hạn
        "points_to_discount", // Quy đổi điểm sang discount
      ],
      required: true,
    },
    description: { type: String, required: true },
    orderId: { type: Types.ObjectId, ref: "Order" }, // Nếu liên quan đến order
    expiresAt: Date, // Ngày hết hạn điểm (nếu có)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    }, // Lưu thêm thông tin khác
  },
  { timestamps: true }
);

// Indexes
loyaltyPointTransactionSchema.index({ userId: 1, createdAt: -1 });
loyaltyPointTransactionSchema.index({ userId: 1, type: 1 });
loyaltyPointTransactionSchema.index({ orderId: 1 });

module.exports = mongoose.model("LoyaltyPointTransaction", loyaltyPointTransactionSchema);

