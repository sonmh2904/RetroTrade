const OwnerRating = require("../../models/Order/OwnerRating.model");
const Order = require("../../models/Order/Order.model");
const {uploadRatingToCloudinary} = require("../../middleware/uploadRating.middleware");

// CREATE - renter tạo đánh giá owner


exports.createOwnerRating = async (req, res) => {
  try {
    const renterId = req.user._id;
    const { orderId, rating, comment } = req.body;

    // 1. Tìm đơn hàng + kiểm tra quyền + trạng thái hợp lệ để đánh giá
    const order = await Order.findOne({
      _id: orderId,
      renterId: renterId, // phải là người mua đơn này
      orderStatus: { $in: ["completed"] },
    });

    if (!order) {
      return res.status(400).json({
        message: "Bạn cần hoàn thành đơn hàng mới để đánh giá",
      });
    }

    // 2. QUAN TRỌNG NHẤT: Chỉ kiểm tra theo orderId (không quan tâm khách mua bao nhiêu lần)
    const alreadyRated = await OwnerRating.findOne({
      orderId: orderId, // mỗi đơn chỉ được đánh giá 1 lần duy nhất
      // renterId không cần thiết ở đây vì orderId đã đủ unique rồi
    });

    if (alreadyRated) {
      return res.status(400).json({
        message: "Đơn hàng này đã được đánh giá rồi!",
      });
    }

    // 3. Upload ảnh/video nếu có
    let images = [];
    let videos = [];

    if (req.files?.images?.length > 0) {
      const uploaded = await uploadRatingToCloudinary(req.files.images);
      images = uploaded.images || [];
    }
    if (req.files?.videos?.length > 0) {
      const uploaded = await uploadRatingToCloudinary(req.files.videos);
      videos = uploaded.videos || [];
    }

    // 4. Tạo đánh giá mới
    const newRating = await OwnerRating.create({
      orderId,
      ownerId: order.ownerId,
      renterId,
      rating,
      comment,
      images,
      videos,
    });

    return res.status(201).json({
      success: true,
      message: "Đánh giá thành công!",
      data: newRating,
    });

  } catch (error) {
    console.error("Lỗi đánh giá:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Đơn hàng này đã được đánh giá rồi!" });
    }
    return res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getOwnerRatings = async (req, res) => {
  try {
    const { ownerId } = req.params;

    const ratings = await OwnerRating.find({
      ownerId,
      isDeleted: false,
    })
      .populate("renterId", "fullName avatarUrl")
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
exports.updateOwnerRating = async (req, res) => {
  try {
    const renterId = req.user._id;
    const { id } = req.params;
    const { rating, comment, images, videos } = req.body;

    const review = await OwnerRating.findById(id);
    if (!review)
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });

    if (String(review.renterId) !== String(renterId)) {
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

exports.deleteOwnerRating = async (req, res) => {
  try {
    const renterId = req.user._id;
    const { id } = req.params;

    const review = await OwnerRating.findById(id);
    if (!review)
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });

    if (String(review.renterId) !== String(renterId)) {
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
