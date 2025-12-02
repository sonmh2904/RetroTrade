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
    extensionDuration: { type: Number, min: 1 }, // Số lượng unit (e.g., 1 ngày)
    extensionUnit: { type: String, enum: ["giờ", "ngày", "tuần", "tháng"] },
    extensionFee: { type: Number, min: 0 }, // Phí gia hạn (chỉ rentalAmount phần thêm)
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    requestedBy: { type: Types.ObjectId, ref: "User", required: true }, // Renter
    approvedBy: { type: Types.ObjectId, ref: "User" }, // Owner nếu approve/reject
    notes: String, // Lý do gia hạn hoặc reject reason
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExtensionRequest", extensionRequestSchema);
