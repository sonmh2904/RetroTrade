const Rating = require("../../models/Order/Rating.model");
const Item = require("../../models/Product/Item.model");
const { uploadToCloudinary } = require("../../middleware/upload.middleware"); 
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

    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      const uploaded = await uploadToCloudinary(
        req.files,
        "retrotrade/ratings"
      );
      imageUrls = uploaded.map((img) => img.Url);
    }

    const newRating = await Rating.create({
      orderId,
      itemId,
      renterId,
      rating,
      comment,
      images: imageUrls,
    });

    res.status(201).json({
      message: "Đánh giá thành công!",
      rating: newRating,
    });
  } catch (err) {
    console.error("❌ Lỗi upload hoặc tạo đánh giá:", err);
    res.status(500).json({ message: "Lỗi khi tạo đánh giá." });
  }
};

exports.updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Rating.findById(id);
    if (!review)
      return res.status(404).json({ message: "Không tìm thấy đánh giá." });

    const userId = req.user._id;
    if (review.renterId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền chỉnh sửa đánh giá này.",
      });
    }

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    // Nếu có ảnh mới
    if (req.files && req.files.length > 0) {
      const uploaded = await uploadToCloudinary(
        req.files,
        "retrotrade/ratings"
      );

      const imageUrls = uploaded.map((img) => img.Url);

      review.images = imageUrls; // ghi đè

      // nếu muốn append
      // review.images.push(...imageUrls);
    }

    review.isEdited = true;
    await review.save();

    res.json({
      message: "Cập nhật đánh giá thành công!",
      rating: review,
    });
  } catch (err) {
    console.error("❌ Lỗi khi update rating:", err);
    res.status(500).json({ message: "Lỗi khi cập nhật đánh giá." });
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
