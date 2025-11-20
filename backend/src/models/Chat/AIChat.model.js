const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AIMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "model"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    productSuggestions: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: "Item" },
        title: { type: String },
        price: { type: Number },
        detail: { type: String },
        rating: { type: Number },
        distance: { type: String },
      },
    ],
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    // Lưu products để có thể dùng lại trong context (khi hỏi "tốt nhất" sau khi đã list)
    products: { type: Schema.Types.Mixed, default: [] }, // Array of products
    recommendations: { type: Schema.Types.Mixed, default: [] }, // Array of recommendations
    bestProduct: { type: Schema.Types.Mixed, default: null }, // Single best product
  },
  { _id: false, strict: false } // strict: false để cho phép lưu dynamic fields
);

const AIChatSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User", 
    required: true,
  },
  sessionId: { type: String, required: true, unique: true },
  messages: [AIMessageSchema], 
  status: {
    type: String,
    enum: ["active", "completed", "expired"],
    default: "active",
  }, 
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

AIChatSchema.index({ userId: 1, sessionId: 1 });
AIChatSchema.index({ userId: 1, "messages.timestamp": -1 }); // Query lịch sử mới nhất

AIChatSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = model("AIChat", AIChatSchema);
