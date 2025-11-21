const express = require("express");
const router = express.Router();
const dashboardController = require("../../controller/moderator/dashboard.controller");
const { authenticateToken, authorizeRoles } = require("../../middleware/auth");

// Get dashboard statistics
router.get("/stats", authenticateToken, authorizeRoles("moderator"), dashboardController.getDashboardStats);

module.exports = router;

