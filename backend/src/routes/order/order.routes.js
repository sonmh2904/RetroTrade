const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware/auth");
const OrderController = require("../../controller/order/order.controller");
const ExtensionController = require("../../controller/order/extension.controller");



router.get("/", authenticateToken, OrderController.listOrders);
router.get("/owner/", authenticateToken, OrderController.listOrdersByOwner);
router.get("/renter/", authenticateToken, OrderController.listOrdersByRenter);
router.get("/renter/last", authenticateToken, OrderController.getLatestOrderByRenter);
router.get("/owner/last", authenticateToken, OrderController.getLatestOrderByOwner);
router.post("/", authenticateToken, OrderController.createOrder);
router.get("/:id", authenticateToken, OrderController.getOrder);
router.post("/:id/confirm", authenticateToken,OrderController.confirmOrder);
router.post("/:id/start", authenticateToken,OrderController.startOrder);
router.post("/:id/return", authenticateToken,OrderController.renterReturn);
router.post("/:id/complete", authenticateToken,OrderController.ownerComplete);
router.post("/:id/cancel",authenticateToken, OrderController.cancelOrder);
router.post("/:id/dispute", authenticateToken,OrderController.disputeOrder);
router.post("/:id/delivery", authenticateToken, OrderController.startDelivery);
router.post("/:id/received", authenticateToken, OrderController.receiveOrder);

//gia hạn thuê
router.post("/:id/extend", authenticateToken, ExtensionController.requestExtension);
router.get("/:id/extensions", authenticateToken, ExtensionController.getExtensionRequests);
router.post("/:id/extension/:requestId/approve", authenticateToken, ExtensionController.approveExtension);
router.post("/:id/extension/:requestId/reject", authenticateToken, ExtensionController.rejectExtension);


module.exports = router;