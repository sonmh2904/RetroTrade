const express = require("express");
const router = express.Router();
const dashboardController = require("../../controller/moderator/dashboard.controller");
const chartController = require("../../controller/moderator/chart.controller");
const { authenticateToken, authorizeRoles } = require("../../middleware/auth");

// Get dashboard statistics
router.get("/stats", authenticateToken, authorizeRoles("moderator"), dashboardController.getDashboardStats);

// Individual statistics endpoints (matching dashboard structure)
router.get("/products/stats", authenticateToken, authorizeRoles("moderator"), chartController.getProductStats);
router.get("/posts/stats", authenticateToken, authorizeRoles("moderator"), chartController.getPostStats);
router.get("/users/stats", authenticateToken, authorizeRoles("moderator"), chartController.getUserStats);
router.get("/comments/stats", authenticateToken, authorizeRoles("moderator"), chartController.getCommentStats);
router.get("/verifications/stats", authenticateToken, authorizeRoles("moderator"), chartController.getVerificationStats);
router.get("/owner-requests/stats", authenticateToken, authorizeRoles("moderator"), chartController.getOwnerRequestStats);
router.get("/complaints/stats", authenticateToken, authorizeRoles("moderator"), chartController.getComplaintStats);
router.get("/reports/stats", authenticateToken, authorizeRoles("moderator"), chartController.getReportStats);

// Chart data endpoints (daily statistics)
router.get("/products/chart", authenticateToken, authorizeRoles("moderator"), chartController.getProductStatsByDate);
router.get("/posts/chart", authenticateToken, authorizeRoles("moderator"), chartController.getPostStatsByDate);
router.get("/users/chart", authenticateToken, authorizeRoles("moderator"), chartController.getUserStatsByDate);

module.exports = router;

