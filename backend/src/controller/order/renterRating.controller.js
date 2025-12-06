const RenterRating = require("../../models/Order/RenterRating.model");
const Order = require("../../models/Order/Order.model");
const {
  uploadRatingToCloudinary,
} = require("../../middleware/uploadRating.middleware");

// CREATE - owner tạo đánh giá renter
exports.createRenterRating = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { orderId, rating, comment } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order không tồn tại" });

    if (String(order.ownerId) !== String(ownerId)) {
      return res
        .status(403)
        .json({ message: "Không thể đánh giá đơn của người khác" });
    }

    let images = [];
    let videos = [];

    // Upload ảnh
    if (req.files?.images?.length > 0) {
      const uploaded = await uploadRatingToCloudinary(req.files.images);
      images = uploaded.images || [];
    }

    // Upload video
    if (req.files?.videos?.length > 0) {
      const uploaded = await uploadRatingToCloudinary(req.files.videos);
      videos = uploaded.videos || [];
    }

    const renterRating = await RenterRating.create({
      orderId,
      ownerId,
      renterId: order.renterId,
      rating,
      comment,
      images,
      videos,
    });

    res.json({
      success: true,
      message: "Đánh giá người thuê thành công",
      data: renterRating,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Đơn này đã được đánh giá" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Lấy đánh giá của renter theo renterId
exports.getRenterRatings = async (req, res) => {
  try {
    const { renterId } = req.params;

    const ratings = await RenterRating.find({
      renterId,
      isDeleted: false,
    })
      .populate("ownerId", "fullName avatarUrl")
      .sort({ createdAt: -1 })
      .lean();

    const total = ratings.length;
    const average =
      total > 0
        ? Math.round(
            (ratings.reduce((sum, r) => sum + r.rating, 0) / total) * 10
          ) / 10
        : 0;

    res.json({
      success: true,
      data: {
        ratings,
        total,
        average,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cập nhật đánh giá renter
exports.updateRenterRating = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { id } = req.params;
    const { rating, comment, images, videos } = req.body;

    const review = await RenterRating.findById(id);
    if (!review)
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });

    if (String(review.ownerId) !== String(ownerId)) {
      return res
        .status(403)
        .json({ message: "Không thể chỉnh sửa đánh giá của người khác" });
    }

    // Upload ảnh/video mới
    let newImages = [];
    let newVideos = [];

    if (req.files?.images?.length > 0 || req.files?.videos?.length > 0) {
      const uploaded = await uploadRatingToCloudinary([
        ...(req.files.images || []),
        ...(req.files.videos || []),
      ]);

      newImages = uploaded.images || [];
      newVideos = uploaded.videos || [];
    }

    // MERGE ảnh
    const finalImages =
      Array.isArray(images) && images.length > 0
        ? [...images, ...newImages].slice(0, 5)
        : [...(review.images || []), ...newImages].slice(0, 5);

    // MERGE video (tối đa 1)
    const finalVideos =
      Array.isArray(videos) && videos.length > 0
        ? [...videos, ...newVideos].slice(0, 1)
        : [...(review.videos || []), ...newVideos].slice(0, 1);

    // Cập nhật nội dung
    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;
    review.images = finalImages;
    review.videos = finalVideos;
    review.isEdited = true;

    await review.save();

    res.json({
      success: true,
      message: "Cập nhật đánh giá thành công",
      data: review,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xoá đánh giá renter
exports.deleteRenterRating = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { id } = req.params;

    const review = await RenterRating.findById(id);
    if (!review)
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });

    if (String(review.ownerId) !== String(ownerId)) {
      return res
        .status(403)
        .json({ message: "Không thể xoá đánh giá của người khác" });
    }

    review.isDeleted = true;
    await review.save();

    res.json({ message: "Xoá đánh giá thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
