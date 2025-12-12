const mongoose = require("mongoose");

const discountAssignmentSchema = new mongoose.Schema(
  {
    discountId: { type: mongoose.Schema.Types.ObjectId, ref: "Discount", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    perUserLimit: { type: Number, default: 1, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "discount_assignments" }
);

discountAssignmentSchema.index({ discountId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("DiscountAssignment", discountAssignmentSchema);


