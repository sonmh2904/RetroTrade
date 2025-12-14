const userAuthRouter = require("../routes/auth/auth.router");
const signatureRouter = require("./auth/signature.routes");

const categoryRouter = require("./products/category.routes");
const productRouter = require("./products/product.routes")
const conditionsRouter = require("./products/conditions.routes");
const priceUnitsRouter = require("./products/priceUnits.routes");
const uploadproductRouter = require("./products/upload/upload.routes");

const userRouter = require("./user/user.router")
const blogRoutes = require("../routes/blog/post.routes");
const homeRoutes = require("../routes/home/home.routes");

const walletRoutes = require("../routes/wallet/wallet.routes");
const messagesRouter = require("../routes/messages/messages.router");
const cartItemRouter = require("./order/cartItem.routes");
const notificationRouter = require("./community/notification.routes");
const ownerRequestUserRouter = require("./user/ownerRequest/ownerRequest.user.router");
const ownerRequestModeratorRouter = require("./user/ownerRequest/ownerRequest.moderator.routes");
const orderRouter = require("./order/order.routes");
const contractRouter = require("./contract/contract.routes");
const discountRouter = require("./order/discount.routes");
const disputeRouter = require("./order/dispute.routes");
const verificationRequestRouter = require("./moderator/verificationRequest.routes");
const serviceFeeRouter = require("./serviceFee/serviceFee.routes");
const auditRouter = require("./audit/audit.routes");
const loyaltyRouter = require("./loyalty/loyalty.routes");
const treeGameRouter = require("./games/tree.routes");
const adminComplaintRouter = require("./admin/complaint.routes");
const adminDashboardRouter = require("./admin/dashboard.routes");
const moderatorDashboardRouter = require("./moderator/dashboard.routes");
const ownerDashboardRouter = require("./owner/dashboard.routes");
const termsRouter = require("./terms/terms.routes");
const privacyRouter = require("./privacy/privacy.routes");
const privacyTypesRouter = require("./privacy/privacy-types.routes");
const aiRouter = require("./messages/aiChat.routes")
const systemConfigRouter = require("./admin/systemConfig.routes");
const moderationRouter = require("./moderator/moderation.routes");

module.exports = (app) => {
    const api = "/api/v1";
    app.use(api + "/auth", userAuthRouter);
    app.use(api + "/user", userRouter);
    app.use(api + "/signature", signatureRouter);
    app.use(api + "/contract", contractRouter);
    app.use(api + "/terms", termsRouter);
    app.use(api + "/privacy", privacyRouter);
    app.use(api + "/privacy-types", privacyTypesRouter);
    app.use(api + "/categories", categoryRouter);
    app.use(api + "/products", productRouter);
    app.use(api + "/products/upload", uploadproductRouter);
    app.use(api + "/conditions", conditionsRouter);
    app.use(api + "/price-units", priceUnitsRouter);

    app.use(api + "/post", blogRoutes);
    app.use(api + "/home", homeRoutes);
    app.use(api + "/wallet", walletRoutes);
    app.use(api + "/messages", messagesRouter)
    app.use(api + "/ai-chat", aiRouter)
    app.use(api + "/cart", cartItemRouter);

    app.use(api + "/notifications", notificationRouter);
    app.use(api + "/owner-requests-user", ownerRequestUserRouter);
    app.use(api + "/owner-requests-moderator", ownerRequestModeratorRouter);
    app.use(api + "/order", orderRouter);
    app.use(api + "/discounts", discountRouter);
    app.use(api + "/dispute", disputeRouter);
    app.use(api + "/verification-request-moderator", verificationRequestRouter);
    app.use(api + "/serviceFee", serviceFeeRouter);
    app.use(api + "/audit", auditRouter);
    app.use(api + "/loyalty", loyaltyRouter);
    app.use(api + "/tree", treeGameRouter);
    app.use(api + "/admin/complaints", adminComplaintRouter);
    app.use(api + "/admin/dashboard", adminDashboardRouter);
    app.use(api + "/moderator/dashboard", moderatorDashboardRouter);
    app.use(api + "/moderator/moderation", moderationRouter);
    app.use(api + "/owner/dashboard", ownerDashboardRouter);
    app.use(api + "/system-config", systemConfigRouter);
}
