const Comment = require("../../models/Blog/Comment.model");
const Post = require("../../models/Blog/Post.model");

const getCommentsByPost = async (req, res) => {
  try {
    const comments = await Comment.find({
      postId: req.params.postId,
      isDeleted: false,
    })
      .populate("userId", "fullName email avatarUrl")
      .populate("parentCommentId", "content userId");
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: "Tải bình luận thất bại", error });
  }
};
const getAllComment = async (req, res) => {
  try {
    const comments = await Comment.find()
      .populate("userId", "fullName avatarUrl displayName")
      .populate("postId", "title")
      .populate("parentCommentId", "content userId")
      .sort({ createdAt: -1 });

    const formattedComments = comments.map((c) => ({
      _id: c._id,
      content: c.content,
      user: c.userId,
      postTitle: c.postId?.title || "Unknown",
      parentComment: c.parentCommentId,
      isDeleted: c.isDeleted,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.status(200).json(formattedComments);
  } catch (error) {
    console.error("Error getting all comments:", error);
    res.status(500).json({ message: "Failed to load comments", error });
  }
};

// Lấy chi tiết một comment
const getCommentDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id)
      .populate("userId", "fullName avatarUrl displayName")
      .populate("postId", "title")
      .populate("parentCommentId", "content userId");

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.json({ comment });
  } catch (error) {
    console.error("Error getting comment detail:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

const updateCommentByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Bình luận không tồn tại." });
    }

    if (comment.userId.toString() !== userId.toString() && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Không có quyền chỉnh sửa bình luận này." });
    }

    comment.content = content;
    comment.updatedAt = Date.now();
    await comment.save();

    res
      .status(200)
      .json({ message: "Cập nhật bình luận thành công.", comment });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi cập nhật bình luận.", error: error.message });
  }
};
const deleteCommentByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Bình luận không tồn tại." });
    }

    if (comment.userId.toString() !== userId.toString() && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Không có quyền xóa bình luận này." });
    }

    comment.isDeleted = true;
    comment.content = "[Bình luận đã bị xóa]";
    await comment.save();

    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentCount: -1 },
    });

    res.status(200).json({ message: "Xóa bình luận thành công." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi xóa bình luận.", error: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const comment = await Comment.create({
      postId: req.params.postId,
      userId: req.user._id,
      content: req.body.content,
      parentCommentId: req.body.parentCommentId || null,
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error("Lỗi khi thêm bình luận:", error);
    res.status(400).json({ message: "Không thể thêm bình luận", error });
  }
};

const banComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.isDeleted = !comment.isDeleted;
    comment.updatedAt = Date.now();
    await comment.save();

    res.json({
      message: comment.isDeleted
        ? "Comment has been banned"
        : "Comment has been unbanned",
      comment,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle comment status", error });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    res.json({ message: "Comment deleted permanently" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete comment", error });
  }
};

module.exports = {
  getCommentsByPost,
  addComment,
  deleteComment,
  getAllComment,
  banComment,
  getCommentDetail,
  updateCommentByUser,
  deleteCommentByUser,
};
