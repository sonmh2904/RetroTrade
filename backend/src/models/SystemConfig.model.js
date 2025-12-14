const mongoose = require("mongoose");


const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed, // Có thể là số, string, object
      required: true,
    },
    valueType: {
      type: String,
      enum: ["number", "string", "boolean", "json"],
      default: "number",
    },
    label: {
      type: String, // Tên hiển thị
      required: true,
    },
    description: String,
    category: {
      type: String,
      enum: ["fee", "limit", "setting", "other"],
      default: "setting",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "systemConfigs",
  }
);

// Static method để lấy config theo key
systemConfigSchema.statics.getConfig = async function (key, defaultValue = null) {
  const config = await this.findOne({ key: key.toUpperCase(), isActive: true });
  return config ? config.value : defaultValue;
};

// Static method để lấy phí nâng cấp owner
systemConfigSchema.statics.getOwnerUpgradeFee = async function () {
  return await this.getConfig("OWNER_UPGRADE_FEE", 50000);
};

module.exports = mongoose.model("SystemConfig", systemConfigSchema);

