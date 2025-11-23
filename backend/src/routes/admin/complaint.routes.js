const express = require("express");
const router = express.Router();
const complaintController = require("../../controller/auth/complaint.controller");
const { authenticateToken, authorizeRoles } = require("../../middleware/auth");
const pagination = require("../../middleware/pagination");

// Admin routes for complaints
router.get("/", authenticateToken, authorizeRoles("admin", "moderator"), pagination(), complaintController.getAllComplaints);
router.get("/:id", authenticateToken, authorizeRoles("admin", "moderator"), complaintController.getComplaintById);
router.post("/:id/handle", authenticateToken, authorizeRoles("admin", "moderator"), complaintController.handleComplaint);

module.exports = router;

