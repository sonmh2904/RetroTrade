const express = require("express");
const DisputeController = require("../../controller/order/dispute.controller");
const { authenticateToken, authorizeRoles } = require("../../middleware/auth");
const { upload } = require("../../middleware/upload.middleware");
const router = express.Router();

router.post(
  "/",
  authenticateToken,
  upload.array("evidence", 5),
  DisputeController.createDispute
);
router.get(
  "/",
  authenticateToken,
  authorizeRoles("moderator"),
  DisputeController.getAllDisputes
);
router.get("/my", authenticateToken, DisputeController.getMyDisputes);
router.get("/:id", authenticateToken, DisputeController.getDisputeById);
router.post(
  "/:id/assign",
  authenticateToken,
  authorizeRoles("moderator"),
  DisputeController.assignDispute
);
router.post(
  "/:id/unassign",
  authenticateToken,
  authorizeRoles("moderator"),
  DisputeController.unassignDispute
);
router.put(
  "/:id/resolve",
  authenticateToken,
  authorizeRoles("moderator"),
  DisputeController.resolveDispute
);

module.exports = router;
