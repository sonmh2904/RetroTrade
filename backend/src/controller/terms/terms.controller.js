const Terms = require("../../models/Terms.model");

// Public: Get active terms
exports.getActiveTerms = async (req, res) => {
  try {
    const terms = await Terms.findOne({ isActive: true })
      .sort({ effectiveDate: -1 })
      .populate("createdBy", "fullName email");

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: "Hệ thống chưa có điều khoản active",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      data: terms,
    });
  } catch (error) {
    console.error("Error in getActiveTerms:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi tải điều khoản active: " + error.message,
    });
  }
};

// Admin: Get history
exports.getTermsHistory = async (req, res) => {
  try {
    const history = await Terms.find({ isActive: false })
      .sort({ effectiveDate: -1 })
      .populate("createdBy", "fullName email");

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error in getTermsHistory:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi tải lịch sử: " + error.message,
    });
  }
};

// Admin: Create new
exports.createTerms = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { version, title, sections, effectiveDate, changesSummary } =
      req.body;
    if (!version || !title || !sections?.length || !effectiveDate) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    // Tắt active của điều khoản hiện tại nếu có
    await Terms.updateMany({ isActive: true }, { isActive: false });

    const newTerms = new Terms({
      version,
      title,
      sections,
      effectiveDate: new Date(effectiveDate),
      isActive: true,
      createdBy: req.user._id,
      changesSummary,
    });

    await newTerms.save();

    res.status(201).json({ success: true, data: newTerms });
  } catch (error) {
    console.error("Error in createTerms:", error);
    res
      .status(400)
      .json({ success: false, message: "Lỗi tạo: " + error.message });
  }
};

// Admin: Update
exports.updateTerms = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const oldTerms = await Terms.findOne({ isActive: true });
    if (!oldTerms)
      return res
        .status(404)
        .json({ success: false, message: "Không có bản active" });

    const { title, sections, effectiveDate, changesSummary } = req.body;
    const newVersionNum = parseFloat(oldTerms.version.replace("v", "")) + 0.1;
    const newVersion = `v${newVersionNum.toFixed(1)}`;

    // Tắt active của điều khoản hiện tại (oldTerms)
    await Terms.updateOne({ _id: oldTerms._id }, { isActive: false });

    const newTerms = new Terms({
      version: newVersion,
      title: title || oldTerms.title,
      sections: sections || oldTerms.sections,
      effectiveDate: new Date(effectiveDate || Date.now()),
      isActive: true,
      createdBy: req.user._id,
      changesSummary: changesSummary || `Update từ ${oldTerms.version}`,
    });

    await newTerms.save();

    res.status(200).json({ success: true, data: newTerms });
  } catch (error) {
    console.error("Error in updateTerms:", error);
    res
      .status(400)
      .json({ success: false, message: "Lỗi cập nhật: " + error.message });
  }
};

// Admin: Toggle Active/Inactive
exports.toggleTermsActive = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.params;
    const termsToToggle = await Terms.findById(id);

    if (!termsToToggle)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy điều khoản" });

    if (termsToToggle.isActive) {
      await Terms.findByIdAndUpdate(id, { isActive: false });
      return res.status(200).json({
        success: true,
        message: "Đã tắt active thành công",
        data: { isActive: false },
      });
    }

    // Nếu đang inactive, bật active và tắt active của cái hiện tại 
    const currentActive = await Terms.findOne({ isActive: true });
    if (currentActive && currentActive._id.toString() !== id) {
      await Terms.findByIdAndUpdate(currentActive._id, { isActive: false });
    }

    await Terms.findByIdAndUpdate(id, { isActive: true });

    res.status(200).json({
      success: true,
      message: "Đã bật active thành công",
      data: { isActive: true },
    });
  } catch (error) {
    console.error("Error in toggleTermsActive:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi toggle: " + error.message });
  }
};

// Admin: Delete
exports.deleteTerms = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.params;
    const terms = await Terms.findById(id);

    if (!terms)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });
    if (terms.isActive)
      return res
        .status(400)
        .json({ success: false, message: "Không xóa active" });

    await Terms.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    console.error("Error in deleteTerms:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi xóa: " + error.message });
  }
};
