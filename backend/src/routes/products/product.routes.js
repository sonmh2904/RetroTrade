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
  getSortedItems,
  getProductByProductId,
  searchProduct,
  viewFeatureProduct,
  listSearchTags,
  getProductsByOwnerIdWithHighViewCount,
  getPublicStoreByUserGuid,
  getProductsByCategoryId,
  getHighlightedProducts,
  getComparableProducts,
  getRatingByOwnerId,
  getAllPublicCategories
} = require("../../controller/products/productPublic.controller");

const {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
} = require("../../controller/products/favorites.controller");
const ratingController = require("../../controller/order/rating.controller");
const OwnerRatingController = require("../../controller/order/onwerRating.controller");
const RenterRatingController = require("../../controller/order/renterRating.controller")
const { upload } = require("../../middleware/upload.middleware");
const { authenticateToken } = require("../../middleware/auth");
const { uploadRating } = require("../../middleware/uploadRating.middleware");

const router = express.Router();

//moderator
router.get("/pending", authenticateToken, getPendingProducts);
router.get("/pending/:id", authenticateToken, getPendingProductDetails);
router.put("/pending/:id/approve", authenticateToken, approveProduct);
router.put("/pending/:id/reject", authenticateToken, rejectProduct);
router.get("/top-for-highlight", authenticateToken, getTopProductsForHighlight);
router.put("/approve/:id/highlight", authenticateToken, toggleHighlight);

//product public
router.get("/public/items", listAllItems);
router.get("/public/items/sorted", getSortedItems);
router.get("/public/categories", getAllPublicCategories);
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
router.post(
  "/rating/",
  authenticateToken,
  uploadRating.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 1 },
  ]),
  ratingController.createRating
);
router.put(
  "/rating/:id",
  authenticateToken,
  uploadRating.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 1 }, 
  ]),
  ratingController.updateRating
);
router.delete("/rating/:id",authenticateToken, ratingController.deleteRating);
router.get("/rating/item/:itemId", ratingController.getRatingsByItem);
router.get("/rating/item/:itemId/stats", ratingController.getRatingStats);
router.get("/rating/owner/:ownerId", getRatingByOwnerId);
//Owner Rating
router.post(
  "/owner/rating/",
  authenticateToken,
  uploadRating.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 1 },
  ]),
  OwnerRatingController.createOwnerRating
);
router.get("/owner/rating/:ownerId", OwnerRatingController.getOwnerRatings);
router.put(
  "/owner/rating/:id",
  authenticateToken,
  uploadRating.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 1 },
  ]),
  OwnerRatingController.updateOwnerRating
);
router.delete("/owner/rating/:id", authenticateToken, OwnerRatingController.deleteOwnerRating);

// CREATE - owner đánh giá renter
router.post(
  "/renter/rating/",
  authenticateToken,
  uploadRating.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 1 },
  ]),
  RenterRatingController.createRenterRating
);

// Lấy danh sách đánh giá của renter theo renterId
router.get("/renter/rating/:renterId", RenterRatingController.getRenterRatings);

// UPDATE đánh giá renter
router.put(
  "/renter/rating/:id",
  authenticateToken,
  uploadRating.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 1 },
  ]),
  RenterRatingController.updateRenterRating
);

// DELETE đánh giá renter
router.delete(
  "/renter/rating/:id",
  authenticateToken,
  RenterRatingController.deleteRenterRating
);


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
