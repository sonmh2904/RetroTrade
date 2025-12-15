const express = require("express");
const router = express.Router();
const ownerRequestController = require("../../../controller/user/ownerRequest.controller");
const { authenticateToken, authorizeRoles } = require("../../../middleware/auth");
const pagination = require("../../../middleware/pagination");


//Moderator
router.get("/stats/overview", authenticateToken, authorizeRoles("moderator"), ownerRequestController.getOwnerRequestStats);
router.get("/all", authenticateToken, authorizeRoles("moderator"), pagination(), ownerRequestController.getAllOwnerRequests);
router.put("/:id/assign", authenticateToken, authorizeRoles("moderator"), ownerRequestController.assignOwnerRequest);
router.put("/:id/unassign", authenticateToken, authorizeRoles("moderator"), ownerRequestController.unassignOwnerRequest);
router.put("/:id/approve", authenticateToken, authorizeRoles("moderator"), ownerRequestController.approveOwnerRequest);
router.put("/:id/reject", authenticateToken, authorizeRoles("moderator"), ownerRequestController.rejectOwnerRequest);


module.exports = router;

