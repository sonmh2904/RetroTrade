const mongoose = require("mongoose");

const discountRedemptionSchema = new mongoose.Schema(
  {
    discountId: { type: mongoose.Schema.Types.ObjectId, ref: "Discount", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    amountApplied: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["applied", "refunded"], default: "applied", index: true },
  },
  { timestamps: true, collection: "discount_redemptions" }
);

discountRedemptionSchema.index({ discountId: 1, userId: 1, createdAt: -1 });

module.exports = mongoose.model("DiscountRedemption", discountRedemptionSchema);

