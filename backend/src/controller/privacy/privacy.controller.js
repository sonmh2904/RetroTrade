const Privacy = require("../../models/Privacy.model");
const PrivacyTypes = require("../../models/PrivacyTypes.model");

// Public: Get active privacy (object keyed by typeId)
exports.getActivePrivacy = async (req, res) => {
  try {
    //Lấy active types
    const activeTypes = await PrivacyTypes.find({ isActive: true }).select(
      "displayName iconKey _id"
    );
    const typeMap = {};
    activeTypes.forEach((t) => (typeMap[t._id.toString()] = t));

    const typeIds = activeTypes.map((t) => t._id);
    // Lấy active privacy
    const activePolicies = await Privacy.find({
      typeId: { $in: typeIds },
      isActive: true,
    })
      .populate("typeId", "displayName iconKey")
      .populate("createdBy", "fullName email")
      .sort({ effectiveDate: -1 });

    //Map policy theo typeId
    const policyObj = {};
    activeTypes.forEach((type) => {
      const policy = activePolicies.find(
        (p) => p.typeId._id.toString() === type._id.toString()
      );
      policyObj[type._id.toString()] = policy
        ? {
            ...policy.toObject(),
            title: policy.typeId.displayName,
            icon: policy.typeId.iconKey,
          }
        : {
            typeId: type._id,
            version: "1.0",
            title: type.displayName,
            sections: [],
            effectiveDate: new Date(),
            isActive: false,
            createdBy: null,
            changesSummary: "Mặc định - chưa cấu hình",
            icon: type.iconKey,
          };
    });

    res.status(200).json({
      success: true,
      data: policyObj,
    });
  } catch (error) {
    console.error("Error in getActivePrivacy:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi tải chính sách active: " + error.message,
    });
  }
};

// Admin: Get history
exports.getPrivacyHistory = async (req, res) => {
  try {
    const history = await Privacy.find({})
      .populate("typeId", "displayName iconKey")
      .populate("createdBy", "fullName email")
      .sort({ effectiveDate: -1 });

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error in getPrivacyHistory:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi tải lịch sử: " + error.message,
    });
  }
};

// Admin: Get all privacy (for management table)
exports.getAllPrivacy = async (req, res) => {
  try {
    //Lấy all
    const privacies = await Privacy.find({})
      .populate("typeId", "displayName iconKey")
      .populate("createdBy", "fullName email")
      .sort({ effectiveDate: -1 });

    res.status(200).json({
      success: true,
      data: privacies,
    });
  } catch (error) {
    console.error("Error in getAllPrivacy:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi tải danh sách chính sách: " + error.message,
    });
  }
};

// Admin: Create new (require typeId, auto active for that type)
exports.createPrivacy = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { typeId, version, sections, effectiveDate, changesSummary } =
      req.body;
    if (!typeId || !version || !sections?.length || !effectiveDate) {
      return res.status(400).json({
        success: false,
        message:
          "Thiếu thông tin bắt buộc (typeId/version/sections/effectiveDate)",
      });
    }

    // Logic: Validate typeId exists và active
    const type = await PrivacyTypes.findById(typeId);
    if (!type || !type.isActive) {
      return res.status(400).json({
        success: false,
        message: "Loại chính sách không tồn tại hoặc không active",
      });
    }

    // Logic: Deactivate existing for this typeId
    await Privacy.updateMany(
      { typeId: type._id, isActive: true },
      { isActive: false }
    );

    // Tạo mới
    const newPrivacy = new Privacy({
      typeId: type._id,
      version,
      sections,
      effectiveDate: new Date(effectiveDate),
      isActive: true,
      createdBy: req.user._id,
      changesSummary,
    });

    await newPrivacy.save();

    // Populate và return
    const populated = await Privacy.findById(newPrivacy._id)
      .populate("typeId", "displayName iconKey")
      .populate("createdBy", "fullName email");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error in createPrivacy:", error);
    res
      .status(400)
      .json({ success: false, message: "Lỗi tạo: " + error.message });
  }
};

// Admin: Update (use typeId, auto new version)
exports.updatePrivacy = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { typeId, sections, effectiveDate, changesSummary } = req.body;
    if (!typeId || !sections?.length || !effectiveDate) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc (typeId/sections/effectiveDate)",
      });
    }

    //Validate typeId
    const type = await PrivacyTypes.findById(typeId);
    if (!type || !type.isActive) {
      return res.status(400).json({
        success: false,
        message: "Loại chính sách không tồn tại hoặc không active",
      });
    }

    //Tìm old active
    const oldPrivacy = await Privacy.findOne({
      typeId: type._id,
      isActive: true,
    });
    if (!oldPrivacy) {
      return res
        .status(404)
        .json({ success: false, message: "Không có bản active cho loại này" });
    }

    //Tạo new version
    const newVersionNum = parseFloat(oldPrivacy.version.replace("v", "")) + 0.1;
    const newVersion = `v${newVersionNum.toFixed(1)}`;

    // Deactivate old
    await Privacy.updateOne({ _id: oldPrivacy._id }, { isActive: false });

    // Tạo new
    const newPrivacy = new Privacy({
      typeId: type._id,
      version: newVersion,
      sections: sections || oldPrivacy.sections,
      effectiveDate: new Date(effectiveDate),
      isActive: true,
      createdBy: req.user._id,
      changesSummary: changesSummary || `Update từ ${oldPrivacy.version}`,
    });

    await newPrivacy.save();

    const populated = await Privacy.findById(newPrivacy._id)
      .populate("typeId", "displayName iconKey")
      .populate("createdBy", "fullName email");

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error in updatePrivacy:", error);
    res
      .status(400)
      .json({ success: false, message: "Lỗi cập nhật: " + error.message });
  }
};

// Admin: Toggle Active/Inactive (per type)
exports.togglePrivacyActive = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const privacyToToggle = await Privacy.findById(id).populate(
      "typeId",
      "displayName iconKey isActive"
    );

    if (!privacyToToggle) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy chính sách" });
    }

    if (privacyToToggle.isActive) {
      //Deactivate (luôn cho phép)
      await Privacy.findByIdAndUpdate(id, { isActive: false });
      return res.status(200).json({
        success: true,
        message: "Đã tắt active thành công",
        data: { isActive: false },
      });
    }

    // Kiểm tra loại chính sách có active không trước khi bật
    if (!privacyToToggle.typeId.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "Loại chính sách đang inactive, không thể bật active cho chính sách này",
      });
    }

    const currentActive = await Privacy.findOne({
      typeId: privacyToToggle.typeId._id,
      isActive: true,
    });
    if (currentActive && currentActive._id.toString() !== id) {
      await Privacy.findByIdAndUpdate(currentActive._id, { isActive: false });
    }

    await Privacy.findByIdAndUpdate(id, { isActive: true });

    // Populate và return
    const updated = await Privacy.findById(id)
      .populate("typeId", "displayName iconKey")
      .populate("createdBy", "fullName email");

    res.status(200).json({
      success: true,
      message: "Đã bật active thành công",
      data: updated,
    });
  } catch (error) {
    console.error("Error in togglePrivacyActive:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi toggle: " + error.message });
  }
};

// Admin: Delete 
exports.deletePrivacy = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const privacy = await Privacy.findById(id);

    if (!privacy) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    }
    if (privacy.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Không xóa bản active" });
    }

    //Xóa vĩnh viễn (nếu inactive)
    await Privacy.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    console.error("Error in deletePrivacy:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi xóa: " + error.message });
  }
};
