const mongoose = require("mongoose");
const { Types } = mongoose;

const ownerRatingSchema = new mongoose.Schema(
  {
    orderId: {
      type: Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    ownerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    renterId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    images: [
      {
        type: String,
      },
    ],

    videos: [
      {
        type: String,
      },
    ],

    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "owner_ratings",
  }
);

// 1 order chỉ được rate 1 lần cho owner
ownerRatingSchema.index({ orderId: 1, renterId: 1 }, { unique: true });

module.exports = mongoose.model("OwnerRating", ownerRatingSchema);
