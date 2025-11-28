const express = require("express");
const router = express.Router();
const dashboardController = require("../../controller/owner/dashboard.controller");
const { authenticateToken, authorizeRoles } = require("../../middleware/auth");

router.get(
    "/orders",
    authenticateToken,
    authorizeRoles("owner"),
    dashboardController.getOrderByOwnerId
);

router.get(
    "/revenue",
    authenticateToken,
    authorizeRoles("owner"),
    dashboardController.getRevenueByOwnerId
);

module.exports = router;