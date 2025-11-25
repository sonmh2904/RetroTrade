const mongoose = require("mongoose");

const privacySectionSchema = new mongoose.Schema(
  {
    icon: {
      type: String,
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
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: [
      {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
      },
    ],
  },
  { _id: false }
);

const privacySchema = new mongoose.Schema(
  {
    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrivacyTypes",
      required: true,
    },
    version: {
      type: String,
      required: true,
      default: "v1.0",
    },
    sections: {
      type: [privacySectionSchema],
      required: true,
      minlength: 1,
      maxlength: 10,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changesSummary: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Privacy", privacySchema);
