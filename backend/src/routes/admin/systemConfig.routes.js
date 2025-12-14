const express = require("express");
const router = express.Router();
const controller = require("../../controller/admin/systemConfig.controller");
const { authenticateToken, authorizeRoles } = require("../../middleware/auth");


router.get("/owner-upgrade-fee", controller.getOwnerUpgradeFee);

// Admin routes
router.get("/", authenticateToken, authorizeRoles("admin"), controller.getAllConfigs);
router.post("/", authenticateToken, authorizeRoles("admin"), controller.createConfig);
router.put("/:id", authenticateToken, authorizeRoles("admin"), controller.updateConfig);
router.delete("/:id", authenticateToken, authorizeRoles("admin"), controller.deleteConfig);

module.exports = router;

