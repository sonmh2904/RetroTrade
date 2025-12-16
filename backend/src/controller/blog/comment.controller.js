const Comment = require("../../models/Blog/Comment.model");
const Post = require("../../models/Blog/Post.model");
const User = require("../../models/User.model");
const { moderateContent } = require("../../utils/moderationService");

const getCommentsByPost = async (req, res) => {
  try {
    // Chỉ hiển thị comments đã được approved và không bị deleted
    const comments = await Comment.find({
      postId: req.params.postId,
      isDeleted: false,
      moderationStatus: 'approved'
    })
      .populate("userId", "fullName email avatarUrl reputationScore")
      .populate("parentCommentId", "content userId")
      .sort({ createdAt: 1 }); // Sắp xếp theo thời gian tạo

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
    const userId = req.user._id;
    const { content, parentCommentId } = req.body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Nội dung bình luận không được để trống" });
    }

    if (content.length > 1000) {
      return res.status(400).json({ message: "Nội dung bình luận quá dài (tối đa 1000 ký tự)" });
    }

    // Tạo comment
    const comment = await Comment.create({
      postId: req.params.postId,
      userId: userId,
      content: content.trim(),
      parentCommentId: parentCommentId || null,
    });

    // Chạy AI moderation bất đồng bộ (không block response)
    setImmediate(async () => {
      try {
        // Lấy thông tin post để làm context
        const post = await Post.findById(req.params.postId).select('title content').lean();

        const context = post ?
          `Bài viết: "${post.title}" - ${post.content?.substring(0, 200)}...` :
          null;

        // Chạy AI moderation
        const moderationResult = await moderateContent(content, context);

        // Update comment với kết quả moderation
        comment.aiConfidence = moderationResult.confidence;

        if (moderationResult.isViolation) {
          comment.moderationStatus = 'flagged'; // Đánh dấu để moderator review
          comment.violationType = moderationResult.violationType;
          comment.moderationReason = `AI phát hiện: ${moderationResult.reason}`;
        } else {
          comment.moderationStatus = 'approved'; // Tự động duyệt
        }

        await comment.save();
      } catch (moderationError) {
        console.error("Error during AI moderation:", moderationError);
        // Nếu AI lỗi, để status là pending để moderator check manual
        comment.moderationStatus = 'pending';
        await comment.save();
      }
    });

    // Tăng comment count cho post
    await Post.findByIdAndUpdate(req.params.postId, {
      $inc: { commentCount: 1 },
    });

    // Populate và trả về response
    const populatedComment = await Comment.findById(comment._id)
      .populate("userId", "fullName displayName avatarUrl")
      .populate("parentCommentId", "content userId")
      .lean();

    res.status(201).json({
      message: "Bình luận đã được gửi thành công",
      comment: populatedComment,
      note: "Bình luận sẽ được kiểm duyệt trước khi hiển thị công khai"
    });
  } catch (error) {
    console.error("Lỗi khi thêm bình luận:", error);
    res.status(500).json({ message: "Lỗi server khi thêm bình luận", error: error.message });
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
