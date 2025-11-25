const mongoose = require("mongoose");

const privacyTypeSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    iconKey: {
      type: String,
      required: true,
      enum: [
        "FileText",
        "Shield",
        "Clock",
        "AlertCircle",
        "CheckCircle",
        "User",
        "Key",
        "Lock",
        "Mail",
        "Phone",
        "MapPin",
        "CreditCard",
        "DollarSign",
        "Users",
        "Globe",
        "Database",
        "Settings",
        "Info",
        "HelpCircle",
        "Zap",
        "Star",
      ],
    },
    description: {
      type: String,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Ref đến User.model.js
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PrivacyTypes", privacyTypeSchema);
