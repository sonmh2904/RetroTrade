const OwnerRating = require("../../models/Order/OwnerRating.model");
const Order = require("../../models/Order/Order.model");

// CREATE - renter tạo đánh giá owner
exports.createOwnerRating = async (req, res) => {
  try {
    const renterId = req.user._id;
    const { orderId, rating, comment, images } = req.body;

    // kiểm tra order có đúng người thuê không
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order không tồn tại" });

    if (String(order.renterId) !== String(renterId)) {
      return res
        .status(403)
        .json({ message: "Không thể đánh giá đơn của người khác" });
    }

    // tạo đánh giá owner
    const ownerRating = await OwnerRating.create({
      orderId,
      ownerId: order.ownerId,
      renterId,
      rating,
      comment,
      images,
    });

    res.json({ message: "Đánh giá shop thành công", data: ownerRating });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Đơn này đã được đánh giá" });
    }
    res.status(500).json({ message: error.message });
  }
};

// GET ALL for 1 owner
exports.getOwnerRatings = async (req, res) => {
  try {
    const { ownerId } = req.params;

    const ratings = await OwnerRating.find({
      ownerId,
      isDeleted: false,
    })
      .populate("renterId", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ total: ratings.length, data: ratings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE review by renter
exports.updateOwnerRating = async (req, res) => {
  try {
    const renterId = req.user._id;
    const { id } = req.params;
    const { rating, comment, images } = req.body;

    const review = await OwnerRating.findById(id);
    if (!review)
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });

    if (String(review.renterId) !== String(renterId)) {
      return res
        .status(403)
        .json({ message: "Không thể chỉnh sửa đánh giá của người khác" });
    }

    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;
    review.images = images ?? review.images;
    review.isEdited = true;

    await review.save();

    res.json({ message: "Cập nhật đánh giá thành công", data: review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE review (soft delete)
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
