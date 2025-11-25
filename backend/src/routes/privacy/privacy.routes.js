// routes/privacy/privacy.routes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware/auth");
const {
  getActivePrivacy,
  getPrivacyHistory,
  createPrivacy,
  updatePrivacy,
  togglePrivacyActive,
  deletePrivacy,
} = require("../../controller/privacy/privacy.controller");

// Public
router.get("/active", getActivePrivacy);

// Admin
router.get("/history", authenticateToken, getPrivacyHistory);
router.post("/", authenticateToken, createPrivacy);
router.put("/", authenticateToken, updatePrivacy);
router.put("/:id/toggle-active", authenticateToken, togglePrivacyActive);
router.delete("/:id", authenticateToken, deletePrivacy);

module.exports = router;
