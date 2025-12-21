const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },

    theme: {
      snowfall: { type: Boolean, default: false },
      decorations: { type: Boolean, default: false },
      countdownEnabled: { type: Boolean, default: false }, 
      countdownTargetDate: { type: Date },
      countdownType: {
        type: String,
        enum: ["default", "christmas", "newyear", "tet", "national-day"],
        default: "default",
      }, 

      decorationEmojis: { type: [String], default: [] },

      cardTitle: { type: String },
      cardMessage: { type: String },
      badgeText: { type: String },

      buttonText1: { type: String, default: "Khám Phá Sản Phẩm" },
      buttonLink1: { type: String, default: "/products" },
      buttonText2: { type: String },
      buttonLink2: { type: String },

      displayType: {
        type: String,
        enum: [
          "christmas-tree",
          "peach-blossom",
          "apricot-blossom",
          "both-tet-trees",
          "vietnam-flag",
          "halloween-pumpkin",
          "none",
        ],
        default: "christmas-tree",
      },
      featureImageUrl: { type: String },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Event", EventSchema);
