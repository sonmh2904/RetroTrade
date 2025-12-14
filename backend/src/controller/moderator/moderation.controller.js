const Comment = require("../../models/Blog/Comment.model");
const User = require("../../models/User.model");
const Post = require("../../models/Blog/Post.model");
const { moderateContent, calculateReputationPenalty, calculateBanDuration } = require("../../utils/moderationService");
const { migrateModerationFields } = require("../../utils/migrateModerationFields");
const { createNotification } = require("../../middleware/createNotification");

/**
 * Lấy danh sách comment cần moderation
 * GET /api/moderator/moderation/comments
 */
const getPendingComments = async (req, res) => {
  try {
    const { skip = 0, limit = 20, status = 'pending' } = req.pagination || {};
    const { search = '', violationType = 'all' } = req.query;

    // Build filter
    const filter = {};

    // Filter by moderation status
    if (status === 'flagged') {
      filter.moderationStatus = 'flagged';
    } else if (status === 'pending') {
      filter.moderationStatus = 'pending';
    } else if (status === 'all') {
      filter.moderationStatus = { $in: ['pending', 'flagged'] };
    }

    // Filter by violation type
    if (violationType && violationType !== 'all') {
      filter.violationType = violationType;
    }

    // Search filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { content: searchRegex },
        { moderationReason: searchRegex }
      ];
    }

    // Query với pagination
    const query = Comment.find(filter)
      .populate("userId", "fullName displayName avatarUrl reputationScore commentBannedUntil")
      .populate("postId", "title authorId")
      .populate("moderatedBy", "fullName displayName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [comments, totalItems] = await Promise.all([
      query.lean(),
      Comment.countDocuments(filter)
    ]);

    // Format response
    const formattedComments = comments.map(comment => ({
      _id: comment._id,
      content: comment.content,
      user: {
        _id: comment.userId?._id,
        fullName: comment.userId?.fullName,
        displayName: comment.userId?.displayName,
        avatarUrl: comment.userId?.avatarUrl,
        reputationScore: comment.userId?.reputationScore || 0,
        isCommentBanned: comment.userId?.commentBannedUntil > new Date()
      },
      post: {
        _id: comment.postId?._id,
        title: comment.postId?.title || 'Bài viết không tồn tại'
      },
      moderationStatus: comment.moderationStatus,
      violationType: comment.violationType,
      moderationReason: comment.moderationReason,
      aiConfidence: comment.aiConfidence,
      moderatedBy: comment.moderatedBy ? {
        _id: comment.moderatedBy._id,
        fullName: comment.moderatedBy.fullName,
        displayName: comment.moderatedBy.displayName
      } : null,
      moderatedAt: comment.moderatedAt,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt
    }));

    return res.json({
      code: 200,
      message: "Lấy danh sách comment cần moderation thành công",
      data: {
        items: formattedComments,
        ...(res.paginationMeta ? res.paginationMeta(totalItems) : {
          page: Math.floor(skip / limit) + 1,
          limit,
          totalItems,
          totalPages: Math.max(Math.ceil(totalItems / limit), 1)
        })
      }
    });
  } catch (error) {
    console.error("Error getting pending comments:", error);
    return res.json({
      code: 500,
      message: "Lỗi server khi lấy danh sách comment",
      error: error.message
    });
  }
};

/**
 * Duyệt comment (approve)
 * POST /api/moderator/moderation/comments/:commentId/approve
 */
const approveComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const moderatorId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.json({
        code: 404,
        message: "Comment không tồn tại"
      });
    }

    if (comment.moderationStatus === 'approved') {
      return res.json({
        code: 400,
        message: "Comment đã được duyệt trước đó"
      });
    }

    // Update comment status
    comment.moderationStatus = 'approved';
    comment.moderatedBy = moderatorId;
    comment.moderatedAt = new Date();
    await comment.save();

    return res.json({
      code: 200,
      message: "Duyệt comment thành công",
      data: comment
    });
  } catch (error) {
    console.error("Error approving comment:", error);
    return res.json({
      code: 500,
      message: "Lỗi server khi duyệt comment",
      error: error.message
    });
  }
};

/**
 * Từ chối comment (reject)
 * POST /api/moderator/moderation/comments/:commentId/reject
 */
const rejectComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason, penaltyUser = true, banDuration = null } = req.body;
    const moderatorId = req.user._id;

    if (!reason || reason.trim().length === 0) {
      return res.json({
        code: 400,
        message: "Cần cung cấp lý do từ chối"
      });
    }

    const comment = await Comment.findById(commentId)
      .populate('userId', 'reputationScore commentBannedUntil fullName')
      .populate('postId', 'title');

    if (!comment) {
      return res.json({
        code: 404,
        message: "Comment không tồn tại"
      });
    }

    if (comment.moderationStatus === 'rejected') {
      return res.json({
        code: 400,
        message: "Comment đã bị từ chối trước đó"
      });
    }

    // Update comment status
    comment.moderationStatus = 'rejected';
    comment.moderationReason = reason.trim();
    comment.moderatedBy = moderatorId;
    comment.moderatedAt = new Date();
    await comment.save();

    // Xử lý penalty cho user nếu được yêu cầu
    if (penaltyUser && comment.userId) {
      const violationType = comment.violationType || 'other';

      // Tính penalty cho reputation score
      const reputationPenalty = calculateReputationPenalty(violationType, 'medium');

      // Lấy lịch sử vi phạm để tính ban duration
      const userViolations = await Comment.find({
        userId: comment.userId._id,
        moderationStatus: 'rejected',
        moderatedAt: { $exists: true }
      }).select('violationType moderatedAt');

      const banHours = banDuration || calculateBanDuration(violationType, userViolations);
      const banUntil = new Date(Date.now() + banHours * 60 * 60 * 1000);

      // Update user
      const user = await User.findById(comment.userId._id);
      if (user) {
        // Giảm reputation score
        user.reputationScore = Math.max(0, (user.reputationScore || 0) - reputationPenalty);

        // Set ban duration nếu chưa bị ban hoặc ban mới lâu hơn
        if (!user.commentBannedUntil || user.commentBannedUntil < banUntil) {
          user.commentBannedUntil = banUntil;
        }

        await user.save();

        // Gửi notification cho user
        try {
          await createNotification(
            user._id,
            'moderation',
            'Cảnh cáo vi phạm quy tắc cộng đồng',
            `Bình luận của bạn đã bị từ chối vì: ${reason}. Điểm uy tín của bạn đã bị trừ ${reputationPenalty.toFixed(1)}. Bạn sẽ bị cấm bình luận đến ${banUntil.toLocaleString('vi-VN')}.`,
            {
              commentId: comment._id,
              violationType,
              reputationPenalty,
              banUntil
            }
          );
        } catch (notifError) {
          console.error("Error creating notification:", notifError);
        }
      }
    }

    return res.json({
      code: 200,
      message: "Từ chối comment thành công",
      data: {
        comment,
        userPenalized: penaltyUser,
        reputationPenalty: penaltyUser ? calculateReputationPenalty(comment.violationType || 'other', 'medium') : 0,
        banDuration: banDuration || (penaltyUser ? calculateBanDuration(comment.violationType || 'other', []) : 0)
      }
    });
  } catch (error) {
    console.error("Error rejecting comment:", error);
    return res.json({
      code: 500,
      message: "Lỗi server khi từ chối comment",
      error: error.message
    });
  }
};

/**
 * Đánh dấu comment cần review lại (flag)
 * POST /api/moderator/moderation/comments/:commentId/flag
 */
const flagComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason } = req.body;
    const moderatorId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.json({
        code: 404,
        message: "Comment không tồn tại"
      });
    }

    comment.moderationStatus = 'flagged';
    comment.moderationReason = reason || 'Cần review lại';
    comment.moderatedBy = moderatorId;
    comment.moderatedAt = new Date();
    await comment.save();

    return res.json({
      code: 200,
      message: "Đánh dấu comment cần review thành công",
      data: comment
    });
  } catch (error) {
    console.error("Error flagging comment:", error);
    return res.json({
      code: 500,
      message: "Lỗi server khi đánh dấu comment",
      error: error.message
    });
  }
};

/**
 * Chạy AI moderation cho comment
 * POST /api/moderator/moderation/comments/:commentId/moderate
 */
const runAIModeration = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId)
      .populate('postId', 'title content');

    if (!comment) {
      return res.json({
        code: 404,
        message: "Comment không tồn tại"
      });
    }

    if (comment.moderationStatus !== 'pending') {
      return res.json({
        code: 400,
        message: "Comment đã được moderation rồi"
      });
    }

    // Tạo context từ post để AI hiểu rõ hơn
    const context = comment.postId ?
      `Bài viết: "${comment.postId.title}" - ${comment.postId.content?.substring(0, 200)}...` :
      null;

    // Chạy AI moderation
    const moderationResult = await moderateContent(comment.content, context);

    // Update comment với kết quả AI
    comment.aiConfidence = moderationResult.confidence;

    if (moderationResult.isViolation) {
      comment.moderationStatus = 'flagged'; // Đánh dấu để moderator review
      comment.violationType = moderationResult.violationType;
      comment.moderationReason = `AI phát hiện: ${moderationResult.reason}`;
    } else {
      comment.moderationStatus = 'approved'; // Tự động duyệt nếu AI cho là OK
    }

    await comment.save();

    return res.json({
      code: 200,
      message: "AI moderation hoàn thành",
      data: {
        comment,
        moderationResult
      }
    });
  } catch (error) {
    console.error("Error running AI moderation:", error);
    return res.json({
      code: 500,
      message: "Lỗi server khi chạy AI moderation",
      error: error.message
    });
  }
};

/**
 * Lấy thống kê moderation
 * GET /api/moderator/moderation/stats
 */
const getModerationStats = async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      pendingCount,
      flaggedCount,
      approvedCount,
      rejectedCount,
      totalViolations,
      recentViolations,
      violationTypes,
      bannedUsers
    ] = await Promise.all([
      // Đếm comments theo status
      Comment.countDocuments({ moderationStatus: 'pending' }),
      Comment.countDocuments({ moderationStatus: 'flagged' }),
      Comment.countDocuments({ moderationStatus: 'approved' }),
      Comment.countDocuments({ moderationStatus: 'rejected' }),

      // Tổng violations
      Comment.countDocuments({ moderationStatus: 'rejected' }),

      // Violations trong 7 ngày qua
      Comment.countDocuments({
        moderationStatus: 'rejected',
        moderatedAt: { $gte: last7Days }
      }),

      // Thống kê loại violation
      Comment.aggregate([
        { $match: { moderationStatus: 'rejected', violationType: { $ne: null } } },
        { $group: { _id: '$violationType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Users đang bị ban comment
      User.countDocuments({ commentBannedUntil: { $gt: now } })
    ]);

    return res.json({
      code: 200,
      message: "Lấy thống kê moderation thành công",
      data: {
        overview: {
          pending: pendingCount,
          flagged: flaggedCount,
          approved: approvedCount,
          rejected: rejectedCount,
          totalProcessed: approvedCount + rejectedCount
        },
        violations: {
          total: totalViolations,
          last7Days: recentViolations,
          byType: violationTypes
        },
        users: {
          currentlyBanned: bannedUsers
        }
      }
    });
  } catch (error) {
    console.error("Error getting moderation stats:", error);
    return res.json({
      code: 500,
      message: "Lỗi server khi lấy thống kê",
      error: error.message
    });
  }
};

/**
 * Unban user comment manually
 * POST /api/moderator/moderation/users/:userId/unban
 */
const unbanUserComments = async (req, res) => {
  try {
    const { userId } = req.params;
    const moderatorId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.json({
        code: 404,
        message: "User không tồn tại"
      });
    }

    if (!user.commentBannedUntil || user.commentBannedUntil <= new Date()) {
      return res.json({
        code: 400,
        message: "User không bị ban comment hoặc đã hết hạn"
      });
    }

    user.commentBannedUntil = null;
    await user.save();

    // Gửi notification
    try {
      await createNotification(
        userId,
        'moderation',
        'Đã được bỏ cấm bình luận',
        'Moderator đã bỏ lệnh cấm bình luận của bạn. Bạn có thể bình luận lại bình thường.',
        {
          moderatorId,
          unbannedAt: new Date()
        }
      );
    } catch (notifError) {
      console.error("Error creating unban notification:", notifError);
    }

    return res.json({
      code: 200,
      message: "Bỏ cấm bình luận thành công",
      data: {
        userId,
        unbannedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Error unbanning user:", error);
    return res.json({
      code: 500,
      message: "Lỗi server khi bỏ cấm",
      error: error.message
    });
  }
};

/**
 * Chạy migration để thêm moderation fields (chỉ admin)
 * POST /api/moderator/moderation/migrate
 */
const runMigration = async (req, res) => {
  try {
    // Chỉ admin mới được chạy migration
    if (req.user.role !== 'admin') {
      return res.json({
        code: 403,
        message: 'Chỉ admin mới có quyền chạy migration'
      });
    }

    await migrateModerationFields();

    return res.json({
      code: 200,
      message: 'Migration hoàn thành thành công'
    });
  } catch (error) {
    console.error("Error running migration:", error);
    return res.json({
      code: 500,
      message: "Lỗi server khi chạy migration",
      error: error.message
    });
  }
};

module.exports = {
  getPendingComments,
  approveComment,
  rejectComment,
  flagComment,
  runAIModeration,
  getModerationStats,
  unbanUserComments,
  runMigration
};
