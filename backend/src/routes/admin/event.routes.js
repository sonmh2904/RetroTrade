const express = require("express");
const router = express.Router();
const controller = require("../../controller/admin/event.controller");
const { authenticateToken, authorizeRoles } = require("../../middleware/auth");
const { upload } = require("../../middleware/upload.middleware.js");

// Public
router.get("/current", controller.getCurrentEvent);

// Admin
router.use(authenticateToken, authorizeRoles("admin"));

router.get("/", controller.getAllEvents);
router.post("/", controller.createEvent);
router.put("/:id", controller.updateEvent);
router.delete("/:id", controller.deleteEvent);
router.patch("/:id/toggle", controller.toggleActive);

router.post("/:id/feature-image", upload.single("featureImage"), controller.uploadFeatureImage);

module.exports = router;