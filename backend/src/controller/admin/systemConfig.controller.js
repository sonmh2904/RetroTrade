const SystemConfig = require("../../models/SystemConfig.model");
const AuditLog = require("../../models/AuditLog.model");

// Lấy tất cả configs (admin)
exports.getAllConfigs = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    
    const configs = await SystemConfig.find(filter)
      .populate("updatedBy", "fullName email")
      .sort({ category: 1, key: 1 });

    res.json({ code: 200, data: configs });
  } catch (error) {
    res.json({ code: 500, message: "Lỗi lấy cấu hình", error: error.message });
  }
};

// Lấy phí nâng cấp owner (public)
exports.getOwnerUpgradeFee = async (req, res) => {
  try {
    const fee = await SystemConfig.getOwnerUpgradeFee();
    res.json({ code: 200, data: { fee } });
  } catch (error) {
    res.json({ code: 500, message: "Lỗi lấy phí", error: error.message });
  }
};

// Tạo config mới (admin)
exports.createConfig = async (req, res) => {
  try {
    const { key, value, valueType, label, description, category } = req.body;
    
    if (!key || value === undefined || !label) {
      return res.json({ code: 400, message: "Thiếu thông tin bắt buộc" });
    }

    const exists = await SystemConfig.findOne({ key: key.toUpperCase() });
    if (exists) {
      return res.json({ code: 400, message: "Key đã tồn tại" });
    }

    const config = await SystemConfig.create({
      key: key.toUpperCase(),
      value,
      valueType: valueType || "number",
      label,
      description,
      category: category || "setting",
      updatedBy: req.user._id,
    });

    await AuditLog.create({
      TableName: "SystemConfig",
      PrimaryKeyValue: config._id.toString(),
      Operation: "INSERT",
      ChangedByUserId: req.user._id,
      ChangeSummary: `Tạo cấu hình: ${key} = ${value}`,
    });

    res.json({ code: 200, message: "Tạo cấu hình thành công", data: config });
  } catch (error) {
    res.json({ code: 500, message: "Lỗi tạo cấu hình", error: error.message });
  }
};

// Cập nhật config (admin)
exports.updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { value, label, description, isActive } = req.body;

    const config = await SystemConfig.findById(id);
    if (!config) {
      return res.json({ code: 404, message: "Không tìm thấy cấu hình" });
    }

    const oldValue = config.value;
    
    if (value !== undefined) config.value = value;
    if (label) config.label = label;
    if (description !== undefined) config.description = description;
    if (isActive !== undefined) config.isActive = isActive;
    config.updatedBy = req.user._id;

    await config.save();

    await AuditLog.create({
      TableName: "SystemConfig",
      PrimaryKeyValue: id,
      Operation: "UPDATE",
      ChangedByUserId: req.user._id,
      ChangeSummary: `Cập nhật ${config.key}: ${oldValue} → ${config.value}`,
    });

    res.json({ code: 200, message: "Cập nhật thành công", data: config });
  } catch (error) {
    res.json({ code: 500, message: "Lỗi cập nhật", error: error.message });
  }
};

// Xóa config (admin)
exports.deleteConfig = async (req, res) => {
  try {
    const config = await SystemConfig.findByIdAndDelete(req.params.id);
    if (!config) {
      return res.json({ code: 404, message: "Không tìm thấy cấu hình" });
    }

    await AuditLog.create({
      TableName: "SystemConfig",
      PrimaryKeyValue: req.params.id,
      Operation: "DELETE",
      ChangedByUserId: req.user._id,
      ChangeSummary: `Xóa cấu hình: ${config.key}`,
    });

    res.json({ code: 200, message: "Xóa thành công" });
  } catch (error) {
    res.json({ code: 500, message: "Lỗi xóa cấu hình", error: error.message });
  }
};

// Seed default configs (internal)
exports.seedDefaultConfigs = async () => {
  const defaults = [
    {
      key: "OWNER_UPGRADE_FEE",
      value: 50000,
      valueType: "number",
      label: "Phí nâng cấp chủ sở hữu",
      description: "Phí người dùng phải trả để nâng cấp lên quyền chủ sở hữu (VND)",
      category: "fee",
    },
  ];

  for (const config of defaults) {
    await SystemConfig.findOneAndUpdate(
      { key: config.key },
      { $setOnInsert: config },
      { upsert: true }
    );
  }
};

