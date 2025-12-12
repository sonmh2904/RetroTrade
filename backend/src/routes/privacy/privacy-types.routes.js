const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware/auth");
const {
  getPrivacyTypes,
  createPrivacyType,
  updatePrivacyType,
  deletePrivacyType,
} = require("../../controller/privacy/privacy-types.controller");

router.get("/", getPrivacyTypes); 
router.get("/active", getPrivacyTypes); 

// Admin: CRUD
router.post("/", authenticateToken, createPrivacyType);
router.put("/", authenticateToken, updatePrivacyType); 
router.put("/:id", authenticateToken, updatePrivacyType); 
router.delete("/:id", authenticateToken, deletePrivacyType);

module.exports = router;
