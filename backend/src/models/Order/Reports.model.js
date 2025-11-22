const mongoose = require("mongoose");
const { Schema, Types } = mongoose;


const reportSchema = new Schema({
  orderId: {
    type: Types.ObjectId,
    ref: "Order",
    required: true,
  },
  reporterId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  reportedUserId: {
    type: Types.ObjectId,
    ref: "User",
  },
  reportedItemId: {
    type: Types.ObjectId,
    ref: "Item",
  },
  reason: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  evidence: {
    type: [String],
    default: [],
  },
  type: {
    type: String,
    enum: ["general", "dispute"],
    default: "dispute",
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Reviewed", "Resolved", "Rejected"],
    default: "Pending",
  },
  resolution: {
    decision: { type: String },
    notes: { type: String },
    refundAmount: { type: Number, default: 0 },
    refundPercentage: { type: Number, default: 0 },
    refundTarget: {
      type: String,
      enum: ["reporter", "reported"],
    },
  },
  assignedBy: {
    type: Types.ObjectId,
    ref: "User",
  },
  assignedAt: {
    type: Date,
  },
  handledBy: {
    type: Types.ObjectId,
    ref: "User",
  },
  handledAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: "reports" // Giữ nguyên collection name để không ảnh hưởng đến dữ liệu hiện có
});

reportSchema.index({ orderId: 1, status: 1 });
reportSchema.index({ reporterId: 1, createdAt: -1 });

// Đổi tên model thành "OrderReport" để tránh xung đột với model "Report" trong Report.model.js
const OrderReport = mongoose.model("OrderReport", reportSchema);

module.exports = OrderReport;
