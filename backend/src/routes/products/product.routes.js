const express = require("express");
const {
  addProduct,
  updateProduct,
  deleteProduct,
  getUserProducts,
  getProductById,
  getUserAddresses,
  setDefaultAddress,
} = require("../../controller/products/product.controller");

const {
  getPendingProducts,
  getPendingProductDetails,
  approveProduct,
  rejectProduct,
  getTopProductsForHighlight,
  toggleHighlight,
} = require("../../controller/products/moderator.product.controller");

const {
  listAllItems,
  getProductByProductId,
  searchProduct,
  viewFeatureProduct,
  listSearchTags,
  getProductsByOwnerIdWithHighViewCount,
  getPublicStoreByUserGuid,
  getProductsByCategoryId,
  getHighlightedProducts,
  getComparableProducts,
  getRatingByOwnerId
} = require("../../controller/products/productPublic.controller");

const {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
} = require("../../controller/products/favorites.controller");
const ratingController = require("../../controller/order/rating.controller");
const { upload } = require("../../middleware/upload.middleware");
const { authenticateToken } = require("../../middleware/auth");

const router = express.Router();

//moderator
router.get("/pending", authenticateToken, getPendingProducts);
router.get("/pending/:id", authenticateToken, getPendingProductDetails);
router.put("/pending/:id/approve", authenticateToken, approveProduct);
router.put("/pending/:id/reject", authenticateToken, rejectProduct);
router.get("/top-for-highlight", authenticateToken, getTopProductsForHighlight);
router.put("/approve/:id/highlight", authenticateToken, toggleHighlight);

//product public
router.get("/product/public", listAllItems);
router.get("/products/public/highlighted", getHighlightedProducts);
router.get("/product/search", searchProduct);
router.get("/product/featured", viewFeatureProduct);
router.get("/product/tags", listSearchTags);
router.get("/product/:id", getProductByProductId);
router.get('/owner/:ownerId/top-viewed', getProductsByOwnerIdWithHighViewCount);
router.get('/store/:userGuid', getPublicStoreByUserGuid);
router.get('/product/category/:categoryId', getProductsByCategoryId);
router.get('/compare/:productId/:categoryId', getComparableProducts);
router.post('/:productId/favorite', authenticateToken, addToFavorites);
router.delete('/:productId/favorite', authenticateToken, removeFromFavorites);
router.get('/favorites', authenticateToken, getFavorites);

// Rating
router.post("/rating/",authenticateToken, upload.array("images", 5), ratingController.createRating);
router.put("/rating/:id",authenticateToken, ratingController.updateRating);
router.delete("/rating/:id",authenticateToken, ratingController.deleteRating);
router.get("/rating/item/:itemId", ratingController.getRatingsByItem);
router.get("/rating/item/:itemId/stats", ratingController.getRatingStats);
router.get("/rating/owner/:ownerId", getRatingByOwnerId);
//owner
router.get("/user", authenticateToken, getUserProducts);
router.get("/user/addresses",authenticateToken, getUserAddresses);
router.post("/addresses/default", authenticateToken, setDefaultAddress);
router.post("/user/add", authenticateToken, addProduct);
router.get("/user/:id", authenticateToken, getProductById);
router.put(
  "/user/:id",
  authenticateToken,
  upload.array("images", 10),
  updateProduct
);
router.delete("/user/:id", authenticateToken, deleteProduct);


module.exports = router;
