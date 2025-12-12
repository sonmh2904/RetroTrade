const AuditLog = require("../models/AuditLog.model");

exports.logOrderAudit = async ({
  orderId,
  operation, // "INSERT" | "UPDATE" | "DELETE"
  userId,
  changeSummary = "",
  ip = null,
}) => {
  try {
    await AuditLog.create({
      TableName: "Order",
      PrimaryKeyValue: orderId.toString(),
      Operation: operation, // bắt buộc: INSERT / UPDATE / DELETE
      ChangedByUserId: userId,
      ChangedAt: new Date(),
      ChangeSummary: changeSummary || undefined,
      // IP không có trong model cũ → bỏ qua hoặc thêm sau nếu cần
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
    // Không throw → không làm crash flow chính
  }
};
