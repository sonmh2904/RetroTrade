const Rating = require("../../models/Order/Rating.model");
const Item = require("../../models/Product/Item.model");
const { uploadRatingToCloudinary } = require("../../middleware/uploadRating.middleware");
const mongoose = require("mongoose");


exports.createRating = async (req, res) => {
  try {
    const { orderId, itemId, renterId, rating, comment } = req.body;

    if (!orderId || !itemId || !renterId || !rating) {
      return res.status(400).json({ message: "Thiếu thông tin cần thiết." });
    }

    const existing = await Rating.findOne({ orderId, itemId, renterId });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Bạn đã đánh giá sản phẩm này rồi." });
    }

   let images = [];
   let videos = [];

   if (req.files.images) {
     const uploadedImages = await uploadRatingToCloudinary(req.files.images);
     images = uploadedImages.images;
   }

   if (req.files.videos) {
     const uploadedVideos = await uploadRatingToCloudinary(req.files.videos);
     videos = uploadedVideos.videos;
   }

    const newRating = await Rating.create({
      orderId,
      itemId,
      renterId,
      rating,
      comment,
      images,
      videos,
    });

    return res.status(201).json({
      message: "Đánh giá thành công!",
      rating: newRating,
    });
  } catch (err) {
    console.error(" Lỗi tạo đánh giá:", err);
    res.status(500).json({ message: "Lỗi khi tạo đánh giá." });
  }
};

exports.updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, images, videos } = req.body;
    const review = await Rating.findById(id);
    if (!review)
      return res.status(404).json({ message: "Không tìm thấy đánh giá." });

    if (review.renterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Không có quyền." });
    }

    // Cập nhật rating & comment
    if (rating !== undefined) review.rating = Number(rating);
    if (comment !== undefined) review.comment = comment?.trim();

    // === XỬ LÝ ẢNH & VIDEO MỚI (nếu có upload) ===
    let newImageUrls = [];
    let newVideoUrls = [];

    if (req.files?.images?.length > 0 || req.files?.videos?.length > 0) {
      const uploaded = await uploadRatingToCloudinary([
        ...(req.files.images || []),
        ...(req.files.videos || []),
      ]);

      newImageUrls = uploaded.images || [];
      newVideoUrls = uploaded.videos || [];
    }

   const finalImages =
     Array.isArray(images) && images.length > 0
       ? [...images, ...newImageUrls].slice(0, 5) // FE gửi danh sách cũ → dùng nó
       : [...(review.images || []), ...newImageUrls].slice(0, 5); // FE không gửi → giữ nguyên cũ + thêm mới

   const finalVideos =
     Array.isArray(videos) && videos.length > 0
       ? [...videos, ...newVideoUrls].slice(0, 1)
       : [...(review.videos || []), ...newVideoUrls].slice(0, 1);
       
    review.images = finalImages;
    review.videos = finalVideos;
    review.isEdited = true;

    await review.save();

    return res.json({
      message: "Cập nhật đánh giá thành công!",
      rating: review,
    });
  } catch (err) {
    console.error("Lỗi update rating:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};


exports.deleteRating = async (req, res) => {
  try {
    const { id } = req.params;
    const renterId = req.user?.id || req.body.renterId; 

    const review = await Rating.findById(id);
    if (!review)
      return res.status(404).json({ message: "Không tìm thấy đánh giá." });


    if (review.renterId.toString() !== renterId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa đánh giá này." });
    }

    if (review.isDeleted) {
      return res.status(400).json({ message: "Đánh giá đã bị xóa trước đó." });
    }

    review.isDeleted = true;
    await review.save();

    res.json({
      message: "Đã xóa đánh giá thành công.",
      deletedId: review._id,
    });
  } catch (err) {
    console.error("Lỗi xóa đánh giá:", err);
    res.status(500).json({ message: "Lỗi khi xóa đánh giá." });
  }
};



exports.getRatingsByItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const ratings = await Rating.find({ itemId, isDeleted: false })
      .populate("renterId", "fullName avatarUrl")
      .populate('orderId')
      .sort({ createdAt: -1 });

    res.json(ratings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách đánh giá." });
  }
};


exports.getRatingStats = async (req, res) => {
  try {
    const { itemId } = req.params;

    const stats = await Rating.aggregate([
      {
        $match: {
          itemId: new mongoose.Types.ObjectId(itemId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    const total = stats.reduce((acc, s) => acc + s.count, 0);
    const avg =
      total > 0
        ? (stats.reduce((acc, s) => acc + s._id * s.count, 0) / total).toFixed(
            1
          )
        : 0;

    res.json({ average: avg, total, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi thống kê đánh giá." });
  }
};
