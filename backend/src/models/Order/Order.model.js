const mongoose = require("mongoose");
const { Types } = mongoose;

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    fullName: { type: String, trim: true },
    street: { type: String, required: true },
    ward: { type: String, required: true },
    province: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderGuid: {
      type: String,
      default: () => require("crypto").randomUUID(),
      unique: true,
      index: true,
    },
    renterId: { type: Types.ObjectId, ref: "User", required: true },
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    itemId: { type: Types.ObjectId, ref: "Item", required: true },
    itemSnapshot: {
      title: String,
      images: [String],
      basePrice: Number,
      priceUnit: String,
    },
    unitCount: { type: Number, min: 1 },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startAt;
        },
        message: "endAt must be greater than startAt",
      },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    discount: {
      // Public discount
      code: String,
      type: { type: String, enum: ["percent", "fixed"] },
      value: Number,
      amountApplied: { type: Number, default: 0, min: 0 },
      // Private discount (secondary)
      secondaryCode: String,
      secondaryType: { type: String, enum: ["percent", "fixed"] },
      secondaryValue: Number,
      secondaryAmountApplied: { type: Number, default: 0, min: 0 },
      // Total discount amount
      totalAmountApplied: { type: Number, default: 0, min: 0 },
    },
    finalAmount: { type: Number, min: 0 },
    depositAmount: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "VND", enum: ["VND", "USD"] },
    rentalDuration: { type: Number, min: 1 },
    rentalUnit: {
      type: String,
      enum: ["giờ", "ngày", "tuần", "tháng"],
    },
    shippingAddress: addressSchema,
    paymentMethod: {
      type: String,
      enum: ["Wallet"],
      default: "Wallet",
    },
    paymentStatus: {
      type: String,
      enum: ["not_paid", "paid", "refunded", "failed"],
      default: "not_paid",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "delivery",
        "received",
        "progress",
        "returned",
        "completed",
        "cancelled",
        "disputed",
      ],
      default: "pending",
      index: true,
    },
    contractId: { type: Types.ObjectId, ref: "Contract" },
    isContractSigned: { type: Boolean, default: false },
    disputeId: {
      type: Types.ObjectId,
      ref: "OrderReport",
      default: null,
    },
    returnInfo: {
      returnedAt: Date,
      confirmedBy: { type: Types.ObjectId, ref: "User" },
      conditionStatus: {
        type: String,
        enum: ["Good", "SlightlyDamaged", "HeavilyDamaged", "Lost"],
      },
      notes: String,
      damageFee: { type: Number, default: 0, min: 0 },
    },
    lifecycle: {
      createdAt: { type: Date, default: Date.now },
      confirmedAt: Date,
      startedAt: Date,
      completedAt: Date,
      canceledAt: Date,
    },
    cancelReason: String,
    isDeleted: { type: Boolean, default: false },
    // Thêm trường liên quan hoàn tiền
    isRefunded: { type: Boolean, default: false, index: true }, // Đơn đã hoàn tiền chưa
    refundedAt: { type: Date, default: null }, // Thời điểm hoàn tiền
  },
  { timestamps: true }
);

orderSchema.index({ renterId: 1, createdAt: -1 });
orderSchema.index({ ownerId: 1, createdAt: -1 });
orderSchema.index({ itemId: 1, orderStatus: 1 });
orderSchema.index({ startAt: 1, endAt: 1 });
orderSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("Order", orderSchema);
