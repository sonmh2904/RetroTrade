const mongoose = require("mongoose");

const ownerRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    additionalInfo: {
      type: String,
      maxlength: 1000,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    serviceFeeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    serviceFeePaidAt: {
      type: Date,
    },
    serviceFeeTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },
  },
  {
    collection: "ownerRequests",
    timestamps: {
      createdAt: "CreatedAt",
      updatedAt: "UpdatedAt",
    },
  }
);

// Indexes
ownerRequestSchema.index({ user: 1 });
ownerRequestSchema.index({ status: 1 });
ownerRequestSchema.index({ CreatedAt: -1 });

module.exports = mongoose.model("OwnerRequest", ownerRequestSchema);

