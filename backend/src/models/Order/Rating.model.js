const mongoose = require("mongoose");
const { Types } = mongoose;

const ratingSchema = new mongoose.Schema(
  {
    orderId: {
      type: Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    itemId: {
      type: Types.ObjectId,
      ref: "Item",
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
    videos: [{ type: String }],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "ratings",
  }
);


ratingSchema.index({ itemId: 1, rating: -1 });
ratingSchema.index({ renterId: 1, createdAt: -1 });
ratingSchema.index({ orderId: 1, itemId: 1, renterId: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);
