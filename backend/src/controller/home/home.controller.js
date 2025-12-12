const Post = require("../../models/Blog/Post.model");

const getHighlightPost = async (req, res) => {
  try {
    const posts = await Post.find({ isFeatured: true, isActive: true })
      .populate("authorId", "name fullName email avatar")
      .populate("categoryId", "name description")
      .populate("tags", "name")
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Tải bài viết nổi bật thất bại", error });
  }
};

module.exports = {
  getHighlightPost,
};