const User = require("../models/User.model");
const { createNotification } = require("../middleware/createNotification");

/**
 * Cron job để tự động unban users khi hết thời gian cấm bình luận
 * Chạy mỗi 10 phút
 */
const unbanExpiredCommentBans = async () => {
  try {
    const now = new Date();

    // Tìm users có comment ban đã hết hạn
    const expiredBans = await User.find({
      commentBannedUntil: { $lte: now, $ne: null }
    }).select('_id fullName displayName commentBannedUntil');

    if (expiredBans.length === 0) {
      console.log(`[${new Date().toISOString()}] No expired comment bans to unban`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Found ${expiredBans.length} expired comment bans to unban`);

    // Unban từng user
    for (const user of expiredBans) {
      try {
        // Update user - set commentBannedUntil = null
        await User.findByIdAndUpdate(user._id, {
          $set: { commentBannedUntil: null }
        });

        // Gửi notification thông báo đã được unban
        await createNotification(
          user._id,
          'moderation',
          'Đã hết thời gian cấm bình luận',
          'Thời gian cấm bình luận của bạn đã kết thúc. Bạn có thể bình luận lại bình thường.',
          {
            unbannedAt: now,
            autoUnbanned: true
          }
        );

        console.log(`Auto-unbanned comment ban for user ${user._id} (${user.fullName || user.displayName})`);
      } catch (userError) {
        console.error(`Error auto-unbanning user ${user._id}:`, userError);
      }
    }

    console.log(`[${new Date().toISOString()}] Successfully auto-unbanned ${expiredBans.length} users`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in unbanExpiredCommentBans:`, error);
  }
};

/**
 * Cron job để kiểm tra và cập nhật reputation score
 * Chạy mỗi ngày
 */
const updateReputationScores = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Tìm users có violations trong 30 ngày qua
    const usersWithViolations = await User.aggregate([
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'userId',
          as: 'violations'
        }
      },
      {
        $match: {
          'violations.moderationStatus': 'rejected',
          'violations.moderatedAt': { $gte: thirtyDaysAgo }
        }
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          reputationScore: 1,
          violationCount: { $size: '$violations' }
        }
      }
    ]);

    console.log(`[${new Date().toISOString()}] Found ${usersWithViolations.length} users with recent violations`);

    // Có thể thêm logic để giảm reputation score dần theo thời gian
    // Hoặc tăng reputation score cho users không vi phạm trong thời gian dài

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in updateReputationScores:`, error);
  }
};

module.exports = {
  unbanExpiredCommentBans,
  updateReputationScores
};
