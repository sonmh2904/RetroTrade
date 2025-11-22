const express = require("express");
const router = express.Router();
const dashboardController = require("../../controller/admin/dashboard.controller");
const { authenticateToken, authorizeRoles } = require("../../middleware/auth");

router.get(
    "/stats",
    authenticateToken,
    authorizeRoles("admin"),
    dashboardController.getDashboardStats
);

router.get(
    "/revenue",
    authenticateToken,
    authorizeRoles("admin"),
    dashboardController.getRevenueStats
);

router.get(
    "/users",
    authenticateToken,
    authorizeRoles("admin"),
    dashboardController.getUserStats
);

router.get(
    "/orders",
    authenticateToken,
    authorizeRoles("admin"),
    dashboardController.getOrderStats
);

router.get(
    "/products",
    authenticateToken,
    authorizeRoles("admin"),
    dashboardController.getProductStats
);

module.exports = router;

