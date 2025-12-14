const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null,
  },
  isDeleted: { type: Boolean, default: false },
  // Moderation fields
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  moderationReason: { type: String, default: null },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = AI, id = moderator
  moderatedAt: { type: Date, default: null },
  violationType: {
    type: String,
    enum: ['spam', 'hate_speech', 'harassment', 'inappropriate', 'off_topic', 'troll', 'other'],
    default: null
  },
  aiConfidence: { type: Number, min: 0, max: 1, default: null }, // Độ tin cậy của AI (0-1)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
