const mongoose = require("mongoose");
const { Types } = mongoose;

const extensionRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    requestedEndAt: { type: Date, required: true },
    originalEndAt: { type: Date },
    extensionDuration: { type: Number, min: 1, required: true },
    extensionUnit: { type: String, enum: ["giờ", "ngày", "tuần", "tháng"] },
    extensionFee: { type: Number, min: 0 }, // Phí gia hạn sau discount
    serviceFee: { type: Number, min: 0, default: 0 },
    originalExtensionFee: { type: Number, min: 0 }, // Phí gốc trước discount
    discount: {
      type: mongoose.Schema.Types.Mixed,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "failed"],
      default: "unpaid",
      index: true,
    },
    paidAt: { type: Date },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    requestedBy: { type: Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Types.ObjectId, ref: "User" },
    notes: String,
    rejectedReason: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExtensionRequest", extensionRequestSchema);
