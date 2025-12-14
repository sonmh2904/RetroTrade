const express = require('express');
const router = express.Router();
const {
  getPendingComments,
  approveComment,
  rejectComment,
  flagComment,
  runAIModeration,
  getModerationStats,
  unbanUserComments,
  runMigration
} = require('../../controller/moderator/moderation.controller');

// Middleware kiểm tra quyền moderator
const { authenticateToken } = require('../../middleware/auth');
const checkModeratorRole = (req, res, next) => {
  if (req.user.role !== 'moderator' && req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Chỉ moderator và admin mới có quyền truy cập'
    });
  }
  next();
};

// Áp dụng middleware cho tất cả routes
router.use(authenticateToken);
router.use(checkModeratorRole);

// Routes cho comment moderation
router.get('/comments', getPendingComments); // Lấy danh sách comments cần moderation
router.post('/comments/:commentId/approve', approveComment); // Duyệt comment
router.post('/comments/:commentId/reject', rejectComment); // Từ chối comment
router.post('/comments/:commentId/flag', flagComment); // Đánh dấu cần review lại
router.post('/comments/:commentId/moderate', runAIModeration); // Chạy AI moderation

// Routes cho user management
router.post('/users/:userId/unban', unbanUserComments); // Bỏ cấm bình luận cho user

// Routes cho thống kê
router.get('/stats', getModerationStats); // Thống kê moderation

// Routes cho admin
router.post('/migrate', runMigration); // Chạy migration (chỉ admin)

module.exports = router;
