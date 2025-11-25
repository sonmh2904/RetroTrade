const PrivacyTypes = require("../../models/PrivacyTypes.model");
const Privacy = require("../../models/Privacy.model");

// Admin: Get all privacy types
exports.getPrivacyTypes = async (req, res) => {
  try {
    // Query all, sort by createdAt desc, populate createdBy
    const types = await PrivacyTypes.find({})
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName email");

    res.status(200).json({ success: true, data: types });
  } catch (error) {
    console.error("Error in getPrivacyTypes:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi tải danh sách loại chính sách: " + error.message,
    });
  }
};

// Admin: Create new type
exports.createPrivacyType = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { displayName, iconKey, description } = req.body;
    if (!displayName || !iconKey) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc (displayName/iconKey)",
      });
    }

    //Check duplicate displayName (case-insensitive)
    const existingType = await PrivacyTypes.findOne({
      displayName: { $regex: new RegExp(`^${displayName}$`, "i") },
    });
    if (existingType) {
      return res.status(400).json({
        success: false,
        message: `Loại chính sách "${displayName}" đã tồn tại`,
      });
    }

    // Tạo mới
    const newType = new PrivacyTypes({
      displayName,
      iconKey,
      description,
      createdBy: req.user._id,
    });

    await newType.save();

    const populated = await PrivacyTypes.findById(newType._id).populate(
      "createdBy",
      "fullName email"
    );

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error in createPrivacyType:", error);
    res
      .status(400)
      .json({ success: false, message: "Lỗi tạo: " + error.message });
  }
};

// Admin: Update type (PUT /:id)
exports.updatePrivacyType = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const { displayName, iconKey, description, isActive } = req.body;

    // Tìm type
    const type = await PrivacyTypes.findById(id);
    if (!type) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy loại chính sách" });
    }

    //Check duplicate displayName khi update (nếu thay đổi)
    if (displayName && displayName !== type.displayName) {
      const existingType = await PrivacyTypes.findOne({
        displayName: { $regex: new RegExp(`^${displayName}$`, "i") },
        _id: { $ne: id }, 
      });
      if (existingType) {
        return res.status(400).json({
          success: false,
          message: `Loại chính sách "${displayName}" đã tồn tại`,
        });
      }
    }

    type.displayName = displayName || type.displayName;
    type.iconKey = iconKey || type.iconKey;
    type.description = description || type.description;
    type.isActive = isActive !== undefined ? isActive : type.isActive;

    await type.save();

    const populated = await PrivacyTypes.findById(type._id).populate(
      "createdBy",
      "fullName email"
    );

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error in updatePrivacyType:", error);
    res
      .status(400)
      .json({ success: false, message: "Lỗi cập nhật: " + error.message });
  }
};

// Admin: Toggle active/inactive for type 
exports.deletePrivacyType = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const type = await PrivacyTypes.findById(id);
    if (!type) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy loại chính sách" });
    }

    const newActiveStatus = !type.isActive; 

    //Nếu chuyển sang inactive (xóa mềm), set all related policies to inactive
    if (!newActiveStatus) {
      await Privacy.updateMany(
        { typeId: type._id },
        { isActive: false } 
      );
      console.log(
        `Deactivated ${await Privacy.countDocuments({
          typeId: type._id,
        })} policies for type ${type.displayName}`
      );
    }

    type.isActive = newActiveStatus;
    await type.save();

    const populated = await PrivacyTypes.findById(type._id).populate(
      "createdBy",
      "fullName email"
    );

    const message = newActiveStatus
      ? "Kích hoạt loại chính sách thành công"
      : "Ẩn loại chính sách thành công (các chính sách liên quan đã bị vô hiệu hóa)";

    res.status(200).json({
      success: true,
      data: populated,
      message,
    });
  } catch (error) {
    console.error("Error in deletePrivacyType:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Lỗi cập nhật trạng thái: " + error.message,
      });
  }
};
