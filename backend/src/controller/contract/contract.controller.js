const mongoose = require("mongoose");
const { Types } = mongoose;
const path = require("path");
const User = require("../../models/User.model");
const Contracts = require("../../models/Order/Contracts.model");
const OrderModel = require("../../models/Order/Order.model");
const ContractTemplate = require("../../models/ContractTemplate.model");
const UserSignature = require("../../models/UserSignature.model");
const ContractSignature = require("../../models/ContractSignature.model");
const AuditLog = require("../../models/AuditLog.model");
const cloudinary = require("cloudinary").v2;
const { generateString } = require("../../utils/generateString");
const {
  encryptSignature,
  decryptSignature,
  decryptObject,
} = require("../../utils/cryptoHelper");
const { generatePDF } = require("../../utils/pdfExport");
const { createNotification } = require("../../middleware/createNotification");
const { formatDate, formatTime, formatFull, formatToday } = require("../../utils/vietnamTime");

const getDecryptedIdCardInfo = async (userId) => {
  if (!userId) return null;
  try {
    const user = await User.findById(userId).select(
      "idCardInfoEncrypted idCardInfo fullName"
    );
    if (!user) return null;

    // Ưu tiên dữ liệu đã giải mã từ encrypted field (an toàn hơn)
    if (
      user.idCardInfoEncrypted?.encryptedData &&
      user.idCardInfoEncrypted?.iv
    ) {
      const decryptedJson = decryptObject(
        user.idCardInfoEncrypted.encryptedData.toString("hex"),
        user.idCardInfoEncrypted.iv
      );
      return decryptedJson; // { idNumber, fullName, dateOfBirth, address }
    }

    // Fallback: dùng plaintext nếu có (chỉ dùng khi debug hoặc dữ liệu cũ)
    if (user.idCardInfo?.idNumber) {
      return user.idCardInfo;
    }

    return null;
  } catch (err) {
    console.error("Lỗi giải mã CCCD user:", userId, err.message);
    return null;
  }
};

// Tạo mẫu hợp đồng
exports.createTemplate = async (req, res) => {
  try {
    const {
      templateName,
      description,
      headerContent,
      bodyContent,
      footerContent,
    } = req.body;
    const createdBy = req.user._id;

    const template = new ContractTemplate({
      templateName,
      description,
      headerContent,
      bodyContent,
      footerContent,
      createdBy,
    });

    const savedTemplate = await template.save();

    res.status(201).json({
      message: "Mẫu hợp đồng được tạo thành công",
      templateId: savedTemplate._id,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi tạo mẫu hợp đồng", details: error.message });
  }
};

// Lấy tất cả mẫu hợp đồng
exports.getTemplates = async (req, res) => {
  try {
    const templates = await ContractTemplate.find()
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 });

    res.json({ templates });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi lấy danh sách mẫu hợp đồng",
      details: error.message,
    });
  }
};

// Lấy chi tiết mẫu hợp đồng
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await ContractTemplate.findById(id).populate(
      "createdBy",
      "fullName email"
    );

    if (!template) {
      return res.status(404).json({ message: "Mẫu hợp đồng không tồn tại" });
    }

    res.json({ template });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi lấy chi tiết mẫu hợp đồng",
      details: error.message,
    });
  }
};

// Cập nhật mẫu hợp đồng
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const template = await ContractTemplate.findByIdAndUpdate(
      id,
      { ...updateData, updatedBy: req.user._id },
      { new: true }
    ).populate("createdBy", "fullName email");

    if (!template) {
      return res.status(404).json({ message: "Mẫu hợp đồng không tồn tại" });
    }

    res.json({
      message: "Mẫu hợp đồng được cập nhật thành công",
      template,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi cập nhật mẫu hợp đồng", details: error.message });
  }
};

// Xóa mẫu hợp đồng
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await ContractTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({ message: "Mẫu hợp đồng không tồn tại" });
    }

    res.json({ message: "Mẫu hợp đồng đã được xóa thành công" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi xóa mẫu hợp đồng", details: error.message });
  }
};

const buildFilledContent = (template, dataMap, customClauses = null) => {
  let filledHeader = template.headerContent || "";
  let filledBody = template.bodyContent || "";
  let filledFooter = template.footerContent || "";

  // Replace placeholders in header
  Object.keys(dataMap).forEach((key) => {
    const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    filledHeader = filledHeader.replace(re, dataMap[key] || "");
  });

  // Replace placeholders in body
  Object.keys(dataMap).forEach((key) => {
    const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    filledBody = filledBody.replace(re, dataMap[key] || "");
  });

  // Append custom clauses to body if provided, formatted like other clauses
  if (customClauses && customClauses.trim()) {
    filledBody += `\n---\nĐIỀU KHOẢN BỔ SUNG\n${customClauses}\n---`;
  } else {
    filledBody += `\n---\nĐIỀU KHOẢN BỔ SUNG\nKhông có điều khoản bổ sung.\n---`;
  }

  // Replace placeholders in footer
  Object.keys(dataMap).forEach((key) => {
    const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    filledFooter = filledFooter.replace(re, dataMap[key] || "");
  });

  // Concatenate with preserved newlines (đảm bảo alignment bằng spaces được giữ)
  return `${filledHeader}\n\n${filledBody}\n\n${filledFooter}`;
};

exports.previewTemplate = async (req, res) => {
  try {
    const { orderId, templateId, customClauses } = req.body;
    const userId = req.user._id;

    if (
      !Types.ObjectId.isValid(orderId) ||
      !Types.ObjectId.isValid(templateId)
    ) {
      return res
        .status(400)
        .json({ message: "orderId hoặc templateId không hợp lệ" });
    }

    const order = await OrderModel.findById(orderId)
      .populate("renterId", "fullName email phone")
      .populate("ownerId", "fullName email phone")
      .populate("itemId", "Title Description BasePrice DepositAmount");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const hasAccess = [
      order.renterId._id.toString(),
      order.ownerId._id.toString(),
    ].includes(userId.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const template = await ContractTemplate.findById(templateId);
    if (!template || !template.isActive) {
      return res
        .status(404)
        .json({ message: "Mẫu hợp đồng không tồn tại hoặc không hoạt động" });
    }

    // GIẢI MÃ CCCD CỦA 2 BÊN – CHỈ LẤY SỐ CCCD
    const [renterIdInfo, ownerIdInfo] = await Promise.all([
      getDecryptedIdCardInfo(order.renterId._id),
      getDecryptedIdCardInfo(order.ownerId._id),
    ]);

    const dataMap = {
      // THÔNG TIN 2 BÊN
      ownerName: order.ownerId?.fullName || "N/A",
      ownerEmail: order.ownerId?.email || "N/A",
      ownerPhone: order.ownerId?.phone || "N/A",
      ownerIdCardNumber: ownerIdInfo?.idNumber || "Chưa xác minh danh tính",
      ownerFullNameOnId:
        ownerIdInfo?.fullName || order.ownerId?.fullName || "N/A",

      renterName: order.renterId?.fullName || "N/A",
      renterEmail: order.renterId?.email || "N/A",
      renterPhone: order.renterId?.phone || "N/A",
      renterIdCardNumber: renterIdInfo?.idNumber || "Chưa xác minh danh tính",
      renterFullNameOnId:
        renterIdInfo?.fullName || order.renterId?.fullName || "N/A",

      //THÔNG TIN SẢN PHẨM & THỜI GIAN
      itemTitle: order.itemId?.Title || "N/A",
      itemDescription: order.itemId?.Description || "N/A",
      basePrice: Number(order.itemId?.BasePrice || 0).toLocaleString("vi-VN"),
      unitCount: order.unitCount,
      depositAmount: Number(order.itemId?.DepositAmount || 0).toLocaleString(
        "vi-VN"
      ),
      rentalStartDate: formatDate(order.startAt),
      rentalStartTime: formatTime(order.startAt),
      rentalEndDate: formatDate(order.endAt),
      rentalEndTime: formatTime(order.endAt),
      rentalPeriodFull:
        order.startAt && order.endAt
          ? `${formatFull(order.startAt)} → ${formatFull(order.endAt)}`
          : "N/A",
      rentalDuration: order.rentalDuration || "N/A",
      rentalUnit: order.rentalUnit || "ngày",

      // TIỀN
      rentalAmount: Number(
        order.totalAmount - order.depositAmount - order.serviceFee || 0
      ).toLocaleString("vi-VN"),
      depositAmountFormatted: Number(order.depositAmount || 0).toLocaleString(
        "vi-VN"
      ),
      serviceFeeFormatted: Number(order.serviceFee || 0).toLocaleString(
        "vi-VN"
      ),

      // TỔNG TRƯỚC GIẢM GIÁ
      totalBeforeDiscount: Number(order.totalAmount || 0).toLocaleString(
        "vi-VN"
      ),

      // GIẢM GIÁ
      discountAmount: order.discount?.totalAmountApplied
        ? Number(order.discount.totalAmountApplied).toLocaleString("vi-VN")
        : "0",
      discountCode: order.discount?.code || "Không có",

      // TỔNG SAU GIẢM GIÁ – CHÍNH LÀ SỐ TIỀN PHẢI TRẢ
      finalAmount: Number(
        order.finalAmount || order.totalAmount || 0
      ).toLocaleString("vi-VN"),

      currency: "VND",
      today: formatToday(),
      orderGuid: order.orderGuid || "N/A",
    };

    const filledContent = buildFilledContent(template, dataMap, customClauses);

    return res.status(200).json({
      message: "OK",
      data: {
        previewContent: filledContent,
        templateName: template.templateName,
      },
    });
  } catch (error) {
    console.error("Preview contract error:", error);
    return res.status(500).json({
      message: "Lỗi preview mẫu hợp đồng",
      details: error.message,
    });
  }
};

exports.confirmCreateContract = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { orderId, templateId, customClauses } = req.body;
    const userId = req.user._id;

    if (
      !Types.ObjectId.isValid(orderId) ||
      !Types.ObjectId.isValid(templateId)
    ) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "orderId hoặc templateId không hợp lệ" });
    }

    const order = await OrderModel.findById(orderId)
      .session(session)
      .populate("renterId", "fullName email phone")
      .populate("ownerId", "fullName email phone")
      .populate("itemId", "Title Description BasePrice DepositAmount");

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const hasAccess = [
      order.renterId._id.toString(),
      order.ownerId._id.toString(),
    ].includes(userId.toString());

    if (!hasAccess) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const existingContract = await Contracts.findOne({
      rentalOrderId: orderId,
    }).session(session);
    if (existingContract) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Đơn hàng đã có hợp đồng" });
    }

    const template = await ContractTemplate.findById(templateId).session(
      session
    );
    if (!template || !template.isActive) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ message: "Mẫu hợp đồng không tồn tại hoặc không hoạt động" });
    }

    // GIẢI MÃ CCCD CHO TẠO HỢP ĐỒNG THẬT
    const [renterIdInfo, ownerIdInfo] = await Promise.all([
      getDecryptedIdCardInfo(order.renterId._id),
      getDecryptedIdCardInfo(order.ownerId._id),
    ]);

    const dataMap = {
      //THÔNG TIN 2 BÊN
      ownerName: order.ownerId?.fullName || "N/A",
      ownerEmail: order.ownerId?.email || "N/A",
      ownerPhone: order.ownerId?.phone || "N/A",
      ownerIdCardNumber: ownerIdInfo?.idNumber || "Chưa xác minh danh tính",
      ownerFullNameOnId:
        ownerIdInfo?.fullName || order.ownerId?.fullName || "N/A",

      renterName: order.renterId?.fullName || "N/A",
      renterEmail: order.renterId?.email || "N/A",
      renterPhone: order.renterId?.phone || "N/A",
      renterIdCardNumber: renterIdInfo?.idNumber || "Chưa xác minh danh tính",
      renterFullNameOnId:
        renterIdInfo?.fullName || order.renterId?.fullName || "N/A",

      //THÔNG TIN SẢN PHẨM & THỜI GIAN
      itemTitle: order.itemId?.Title || "N/A",
      itemDescription: order.itemId?.Description || "N/A",
      basePrice: Number(order.itemId?.BasePrice || 0).toLocaleString("vi-VN"),
      unitCount: order.unitCount,
      depositAmount: Number(order.itemId?.DepositAmount || 0).toLocaleString(
        "vi-VN"
      ),
      rentalStartDate: formatDate(order.startAt),
      rentalStartTime: formatTime(order.startAt),
      rentalEndDate: formatDate(order.endAt),
      rentalEndTime: formatTime(order.endAt),

      rentalPeriodFull:
        order.startAt && order.endAt
          ? `${formatFull(order.startAt)} → ${formatFull(order.endAt)}`
          : "N/A",
      rentalDuration: order.rentalDuration || "N/A",
      rentalUnit: order.rentalUnit || "ngày",

      // TIỀN
      rentalAmount: Number(
        order.totalAmount - order.depositAmount - order.serviceFee || 0
      ).toLocaleString("vi-VN"),
      depositAmountFormatted: Number(order.depositAmount || 0).toLocaleString(
        "vi-VN"
      ),
      serviceFeeFormatted: Number(order.serviceFee || 0).toLocaleString(
        "vi-VN"
      ),

      // TỔNG TRƯỚC GIẢM GIÁ
      totalBeforeDiscount: Number(order.totalAmount || 0).toLocaleString(
        "vi-VN"
      ),

      // GIẢM GIÁ
      discountAmount: order.discount?.totalAmountApplied
        ? Number(order.discount.totalAmountApplied).toLocaleString("vi-VN")
        : "0",
      discountCode: order.discount?.code || "Không có",

      // TỔNG SAU GIẢM GIÁ – CHÍNH LÀ SỐ TIỀN PHẢI TRẢ
      finalAmount: Number(
        order.finalAmount || order.totalAmount || 0
      ).toLocaleString("vi-VN"),

      currency: "VND",
      today: formatToday(),
      orderGuid: order.orderGuid || "N/A",
    };

    const filledContent = buildFilledContent(template, dataMap, customClauses);

    const newContract = new Contracts({
      rentalOrderId: orderId,
      ownerId: order.ownerId._id,
      renterId: order.renterId._id,
      templateId: template._id,
      contractContent: filledContent,
      status: "PendingSignature",
    });

    const saved = await newContract.save({ session });
    await session.commitTransaction();

    //Gửi thông báo cho người thuê (renter) khi hợp đồng được tạo
    await createNotification(
      order.renterId._id,
      "Contract Created",
      "Hợp đồng thuê mới",
      `Hợp đồng cho "${
        order.itemId?.Title || "đơn hàng"
      }" đã được tạo. Vui lòng kiểm tra và ký để xác nhận giao dịch.`,
      {
        contractId: saved._id.toString(),
        orderId: orderId.toString(),
        orderGuid: order.orderGuid,
      }
    );

    // Trả về thông tin hợp đồng mới tạo
    const contract = await Contracts.findById(saved._id)
      .populate("templateId", "templateName")
      .populate({
        path: "signatures",
        populate: {
          path: "signatureId",
          select: "signatureImagePath userId",
          populate: { path: "userId", select: "fullName" },
        },
      });

    const signatures = (contract.signatures || []).map((s) => ({
      _id: s._id.toString(),
      signatureUrl: s.signatureId?.signatureImagePath || "",
      signerName: s.signatureId?.userId?.fullName || "Unknown",
      signedAt: s.signedAt,
    }));

    return res.status(201).json({
      message: "Hợp đồng đã được tạo thành công",
      data: {
        contractId: contract._id.toString(),
        status: contract.status,
        content: contract.contractContent,
        templateName: contract.templateId?.templateName,
        signatures,
        isFullySigned: false,
        canSign: true,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("confirmCreateContract error:", error);
    return res
      .status(500)
      .json({ message: "Lỗi tạo hợp đồng", details: error.message });
  } finally {
    session.endSession();
  }
};

exports.getOrCreateContractForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    if (!Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "orderId không hợp lệ" });
    }

    const order = await OrderModel.findById(orderId)
      .populate("renterId", "fullName email phone _id")
      .populate("ownerId", "fullName email phone _id")
      .populate("itemId", "Title Description BasePrice DepositAmount");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const hasAccess = [
      order.renterId._id.toString(),
      order.ownerId._id.toString(),
    ].includes(userId.toString());

    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "Không có quyền truy cập hợp đồng" });
    }

    let contract = await Contracts.findOne({ rentalOrderId: orderId })
      .populate({
        path: "signatures",
        populate: {
          path: "signatureId",
          model: "UserSignature",
          select: "signatureImagePath validFrom validTo isActive iv userId",
          populate: {
            path: "userId",
            select: "_id fullName roleId",
          },
        },
      })
      .populate("templateId", "templateName");

    if (contract) {
      const signatures = (contract.signatures || []).map((s) => {
        const sig =
          s.signatureId && typeof s.signatureId === "object"
            ? {
                _id: s.signatureId._id,
                signatureImagePath: s.signatureId.signatureImagePath,
                validFrom: s.signatureId.validFrom,
                validTo: s.signatureId.validTo,
                isActive: s.signatureId.isActive,
                signerName: s.signatureId.userId?.fullName || "Unknown",
                signerRole: s.signatureId.userId?.roleId || null,
                signerUserId: s.signatureId.userId?._id?.toString() || null,
              }
            : null;

        return {
          _id: s._id?.toString(),
          contractId: s.contractId?.toString() || s.contractId,
          signatureId: sig,
          signedAt: s.signedAt,
          isValid: s.isValid,
          verificationInfo: s.verificationInfo,
          positionX: s.positionX || 0,
          positionY: s.positionY || 0,
        };
      });

      const responseData = {
        hasContract: true,
        data: {
          contractId: contract._id.toString(),
          status: contract.status,
          content: contract.contractContent || "",
          signatures,
          templateName: contract.templateId?.templateName || null,
          signaturesCount: signatures.length,
          isFullySigned: contract.status === "Signed",
          canSign: contract.status === "PendingSignature",
        },
      };

      return res.status(200).json(responseData);
    } else {
      let availableTemplates = [];
      try {
        availableTemplates = await ContractTemplate.find({
          isActive: true,
        }).sort({ createdAt: -1 });
      } catch (err) {
        availableTemplates = [];
      }

      return res.status(200).json({
        hasContract: false,
        availableTemplates: availableTemplates || [],
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Không thể tải hợp đồng, vui lòng thử lại sau",
      details: error.message,
    });
  }
};

exports.getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid contract id" });
    }

    const contract = await Contracts.findById(id)
      .populate("rentalOrderId", "orderGuid totalAmount startAt endAt")
      .populate("ownerId", "fullName email _id")
      .populate("renterId", "fullName email _id")
      .populate({
        path: "signatures",
        populate: {
          path: "signatureId",
          model: "UserSignature",
          select: "signatureImagePath validFrom validTo isActive iv userId",
          populate: { path: "userId", select: "_id fullName" },
        },
      })
      .populate("templateId", "templateName");

    if (!contract) {
      return res.status(404).json({ message: "Hợp đồng không tồn tại" });
    }

    const order = await OrderModel.findById(contract.rentalOrderId);
    if (
      ![order.renterId.toString(), order.ownerId.toString()].includes(
        userId.toString()
      )
    ) {
      return res
        .status(403)
        .json({ message: "Không có quyền xem hợp đồng này" });
    }

    const signatures = (contract.signatures || []).map((s) => ({
      _id: s._id.toString(),
      contractId: s.contractId.toString(),
      signatureId: {
        _id: s.signatureId._id,
        signatureImagePath: s.signatureId.signatureImagePath,
        signerName: s.signatureId.userId?.fullName || "Unknown",
        signerUserId: s.signatureId.userId?._id?.toString() || null,
      },
      signedAt: s.signedAt,
      isValid: s.isValid,
      verificationInfo: s.verificationInfo,
      positionX: s.positionX || 0,
      positionY: s.positionY || 0,
    }));

    res.json({
      message: "OK",
      data: {
        ...contract.toObject(),
        signatures,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi lấy hợp đồng", details: error.message });
  }
};

exports.signContract = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    if (!req.body) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Request body rỗng. Kiểm tra FormData." });
    }

    const {
      contractId,
      useExistingSignature,
      positionX = 0,
      positionY = 0,
    } = req.body;
    let base64SignatureData = req.body.signatureData;

    const userId = req.user._id;
    const useExisting =
      useExistingSignature === "true" || useExistingSignature === true;

    if (!Types.ObjectId.isValid(contractId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid contract id" });
    }

    if (!base64SignatureData && useExisting !== true) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Cần chữ ký mới hoặc sử dụng chữ ký hiện có" });
    }

    const contract = await Contracts.findById(contractId).session(session);
    if (!contract || contract.status === "Signed") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Hợp đồng không hợp lệ để ký" });
    }

    const order = await OrderModel.findById(contract.rentalOrderId)
      .session(session)
      .populate("renterId", "fullName")
      .populate("ownerId", "fullName")
      .populate("itemId", "Title");
    if (
      ![order.renterId._id.toString(), order.ownerId._id.toString()].includes(
        userId.toString()
      )
    ) {
      await session.abortTransaction();
      return res
        .status(403)
        .json({ message: "Không có quyền ký hợp đồng này" });
    }

    const userSignatureIds = await UserSignature.find({
      userId,
      isActive: true,
    })
      .distinct("_id")
      .session(session);
    const existingUserSig = await ContractSignature.findOne({
      contractId: contract._id,
      signatureId: { $in: userSignatureIds },
    }).session(session);

    if (existingUserSig) {
      existingUserSig.positionX = Number(positionX) || 0;
      existingUserSig.positionY = Number(positionY) || 0;
      existingUserSig.verificationInfo = `Updated position at ${new Date().toISOString()}`;
      await existingUserSig.save({ session });

      await session.commitTransaction();

      res.json({
        message: "Vị trí chữ ký đã được cập nhật",
        contractId: contract._id,
        signatureId: existingUserSig.signatureId,
        position: {
          x: existingUserSig.positionX,
          y: existingUserSig.positionY,
        },
      });
      return;
    }

    let userSigId = null;
    let signatureImagePath = null;

    let existingSignature = await UserSignature.findOne({
      userId,
      isActive: true,
    }).session(session);

    if (useExisting) {
      if (!existingSignature) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: "Không tìm thấy chữ ký hiện có" });
      }
      userSigId = existingSignature._id;
      signatureImagePath = existingSignature.signatureImagePath;
    } else if (base64SignatureData) {
      const rawSignatureData = base64SignatureData.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      const { iv, encryptedData } = encryptSignature(rawSignatureData);
      const encryptedBuffer = Buffer.from(encryptedData, "hex");

      const newPublicId = `sig_${userId}_${generateString(8)}`;
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          `data:image/png;base64,${rawSignatureData}`,
          {
            folder: "signatures",
            resource_type: "image",
            public_id: newPublicId,
            overwrite: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
      });

      signatureImagePath = uploadResult.secure_url;

      let operation = "INSERT";
      if (existingSignature) {
        const oldPublicId = existingSignature.signatureImagePath
          .split("/")
          .pop()
          ?.split(".")[0];
        if (oldPublicId) {
          await cloudinary.uploader.destroy(oldPublicId, {
            resource_type: "image",
          });
        }

        existingSignature = await UserSignature.findOneAndUpdate(
          { userId, isActive: true },
          {
            signatureData: encryptedBuffer,
            iv,
            signatureImagePath,
            validFrom: new Date(),
            updatedAt: new Date(),
          },
          { new: true, session }
        );
        userSigId = existingSignature._id;
        operation = "UPDATE";
      } else {
        const newSignature = new UserSignature({
          userId,
          signatureData: encryptedBuffer,
          iv,
          signatureImagePath,
        });
        existingSignature = await newSignature.save({ session });
        userSigId = existingSignature._id;
      }

      await AuditLog.create(
        [
          {
            TableName: "UserSignatures",
            PrimaryKeyValue: userSigId.toString(),
            Operation: operation,
            ChangedByUserId: userId,
            ChangedAt: new Date(),
            ChangeSummary: `Signature ${operation.toLowerCase()}ed for contract signing`,
          },
        ],
        { session }
      );
    }

    //set vị trí chữ ký
    let defaultPositionX = 50; // ở giữa default
    let defaultPositionY = 95; // cách đáy hợp đồng
    const isOwner = userId.toString() === order.ownerId._id.toString();
    if (isOwner) {
      // Trái for owner (BÊN A)
      defaultPositionX = 15;
    } else {
      // Phải for renter (BÊN B)
      defaultPositionX = 60;
    }

    const contractSig = new ContractSignature({
      contractId: contract._id,
      signatureId: userSigId,
      signedAt: new Date(),
      isValid: true,
      positionX: Number(positionX) || defaultPositionX,
      positionY: Number(positionY) || defaultPositionY,
      verificationInfo: `Signed via ${signatureImagePath}`,
    });
    const savedContractSig = await contractSig.save({ session });

    contract.signatures = contract.signatures || [];
    contract.signatures.push(savedContractSig._id);
    contract.signatureDate = new Date();

    const signaturesCount = await ContractSignature.countDocuments({
      contractId: contract._id,
      isValid: true,
    }).session(session);
    if (signaturesCount >= 2) {
      contract.status = "Signed";
    }

    await contract.save({ session });

    await OrderModel.findByIdAndUpdate(
      contract.rentalOrderId,
      { isContractSigned: signaturesCount >= 2 },
      { session }
    );

    await AuditLog.create(
      [
        {
          TableName: "ContractSignatures",
          PrimaryKeyValue: savedContractSig._id.toString(),
          Operation: "INSERT",
          ChangedByUserId: userId,
          ChangedAt: new Date(),
          ChangeSummary: `Contract signed with UserSignature ${userSigId}. Total signatures: ${signaturesCount}`,
        },
      ],
      { session }
    );

    // Gửi thông báo cho 2 bên khi 1 bên ký hợp đồng
    // Xác định bên ký và bên còn lại
    const signerRole = isOwner ? "Chủ sở hữu" : "Người thuê";
    const otherUserId = isOwner ? order.renterId._id : order.ownerId._id;
    const otherRole = isOwner ? "người thuê" : "chủ sở hữu";
    const otherName = isOwner
      ? order.renterId.fullName
      : order.ownerId.fullName;
    const itemTitle = order.itemId?.Title || "đơn hàng";

    // Thông báo cho bên còn lại (other)
    await createNotification(
      otherUserId,
      "Contract Signed",
      "Hợp đồng đã được ký",
      `${signerRole} "${
        order[isOwner ? "ownerId" : "renterId"].fullName
      }" đã ký hợp đồng cho "${itemTitle}". Vui lòng kiểm tra và ký để hoàn tất.`,
      {
        contractId: contract._id.toString(),
        orderId: order._id.toString(),
        orderGuid: order.orderGuid,
        signerName: order[isOwner ? "ownerId" : "renterId"].fullName,
        signerRole: signerRole,
      }
    );

    // Thông báo cho bên vừa ký (signer) để xác nhận hành động của họ
    await createNotification(
      userId,
      "Contract Signed",
      "Xác nhận chữ ký hợp đồng",
      `Bạn đã ký hợp đồng cho "${itemTitle}". Đang chờ ${otherRole} "${otherName}" ký để hoàn tất.`,
      {
        contractId: contract._id.toString(),
        orderId: order._id.toString(),
        orderGuid: order.orderGuid,
        otherName: otherName,
        otherRole: otherRole,
      }
    );

    // Nếu đã ký đủ 2 chữ ký, gửi thông báo hoàn tất cho cả 2 bên
    if (signaturesCount >= 2) {
      await createNotification(
        order.renterId._id,
        "Contract Fully Signed",
        "Hợp đồng hoàn tất",
        `Hợp đồng cho "${itemTitle}" đã được ký đầy đủ bởi cả hai bên.`,
        {
          contractId: contract._id.toString(),
          orderId: order._id.toString(),
          orderGuid: order.orderGuid,
          status: "Signed",
        }
      );

      await createNotification(
        order.ownerId._id,
        "Contract Fully Signed",
        "Hợp đồng hoàn tất",
        `Hợp đồng cho "${itemTitle}" đã được ký đầy đủ bởi cả hai bên.`,
        {
          contractId: contract._id.toString(),
          orderId: order._id.toString(),
          orderGuid: order.orderGuid,
          status: "Signed",
        }
      );
    }

    await session.commitTransaction();

    res.json({
      message: "Hợp đồng đã được ký thành công",
      contractId: contract._id,
      contractSignatureId: savedContractSig._id,
      signatureId: userSigId,
      signatureUrl: signatureImagePath,
      isFullySigned: signaturesCount >= 2,
      isContractSigned: signaturesCount >= 2,
      position: {
        x: savedContractSig.positionX,
        y: savedContractSig.positionY,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    res
      .status(500)
      .json({ message: "Lỗi ký hợp đồng", details: error.message });
  } finally {
    session.endSession();
  }
};

exports.getContractSignatures = async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user._id;

    if (!Types.ObjectId.isValid(contractId)) {
      return res.status(400).json({ message: "Invalid contract id" });
    }

    const contract = await Contracts.findById(contractId);
    if (!contract) {
      return res.status(404).json({ message: "Hợp đồng không tồn tại" });
    }

    const order = await OrderModel.findById(contract.rentalOrderId);
    if (
      ![order.renterId.toString(), order.ownerId.toString()].includes(
        userId.toString()
      )
    ) {
      return res
        .status(403)
        .json({ message: "Không có quyền xem chữ ký hợp đồng này" });
    }

    const signatures = await ContractSignature.find({
      contractId: contract._id,
    })
      .populate(
        "signatureId",
        "signatureImagePath validFrom validTo isActive userId"
      )
      .populate("signatureId.userId", "_id fullName")
      .lean();

    const formattedSignatures = signatures.map((s) => ({
      ...s,
      signatureId: {
        ...s.signatureId,
        signerName: s.signatureId?.userId?.fullName || "Unknown",
        signerUserId: s.signatureId?.userId?._id?.toString() || null,
      },
      positionX: s.positionX || 0,
      positionY: s.positionY || 0,
    }));

    res.json({
      message: "OK",
      signatures: formattedSignatures,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi lấy chữ ký hợp đồng", details: error.message });
  }
};

exports.decryptSignature = async (req, res) => {
  try {
    const { signatureId } = req.params;

    if (!Types.ObjectId.isValid(signatureId)) {
      return res.status(400).json({ message: "Invalid signature id" });
    }

    const userSig = await UserSignature.findById(signatureId).populate(
      "userId",
      "fullName"
    );
    if (!userSig || !userSig.isActive) {
      return res
        .status(404)
        .json({ message: "Signature không tồn tại hoặc không hoạt động" });
    }

    const decryptedData = decryptSignature(
      userSig.signatureData.toString("hex"),
      userSig.iv
    );

    res.json({
      message: "Signature decrypted successfully",
      signatureId: userSig._id,
      userName: userSig.userId.fullName,
      decryptedSignature: decryptedData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi giải mã chữ ký", details: error.message });
  }
};

exports.updateSignaturePosition = async (req, res) => {
  try {
    const { contractSignatureId } = req.params;
    const { positionX, positionY } = req.body;
    const userId = req.user._id;

    if (!Types.ObjectId.isValid(contractSignatureId)) {
      return res
        .status(400)
        .json({ message: "contractSignatureId không hợp lệ" });
    }

    const contractSig = await ContractSignature.findById(
      contractSignatureId
    ).populate("contractId");

    if (!contractSig) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy chữ ký hợp đồng" });
    }

    const contract = await Contracts.findById(
      contractSig.contractId._id || contractSig.contractId
    ).populate("renterId ownerId");

    if (!contract) {
      return res.status(404).json({ message: "Không tìm thấy hợp đồng" });
    }

    const hasAccess = [
      contract.renterId._id.toString(),
      contract.ownerId._id.toString(),
    ].includes(userId.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: "Không có quyền cập nhật" });
    }

    contractSig.positionX = Number(positionX) || 0;
    contractSig.positionY = Number(positionY) || 0;
    await contractSig.save();

    return res.status(200).json({
      message: "Cập nhật vị trí chữ ký thành công",
      data: {
        contractSignatureId: contractSig._id.toString(),
        positionX: contractSig.positionX,
        positionY: contractSig.positionY,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi cập nhật vị trí chữ ký",
      details: error.message,
    });
  }
};

exports.exportContractPDF = async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user._id;

    if (!Types.ObjectId.isValid(contractId)) {
      return res.status(400).json({ message: "Invalid contract id" });
    }

    // Populate full contract với signatures (image URLs) và order
    const contract = await Contracts.findById(contractId)
      .populate({
        path: "rentalOrderId",
        select: "orderGuid totalAmount startAt endAt",
      })
      .populate("ownerId", "fullName email")
      .populate("renterId", "fullName email")
      .populate("templateId", "templateName")
      .populate({
        path: "signatures",
        populate: {
          path: "signatureId",
          model: "UserSignature",
          select: "signatureImagePath",
        },
      });

    if (!contract) {
      return res.status(404).json({ message: "Hợp đồng không tồn tại" });
    }

    const order = await OrderModel.findById(contract.rentalOrderId);
    if (
      ![order.renterId.toString(), order.ownerId.toString()].includes(
        userId.toString()
      )
    ) {
      return res
        .status(403)
        .json({ message: "Không có quyền xuất PDF hợp đồng này" });
    }

    // Build signatures array cho PDF: { imageUrl, positionX, positionY }
    const pdfSignatures = (contract.signatures || [])
      .map((s) => ({
        imageUrl: s.signatureId?.signatureImagePath || "",
        positionX: s.positionX || 0,
        positionY: s.positionY || 0,
      }))
      .filter((sig) => sig.imageUrl && sig.imageUrl.trim());

    // Generate PDF với Puppeteer để signatures ở đúng trang/vị trí
    const pdfBuffer = await generatePDF({
      content: contract.contractContent || "",
      title: `HopDong_${contract.rentalOrderId.orderGuid || contractId}`,
      returnBuffer: true,
      signatures: pdfSignatures,
    });

    // Set headers cho download
    const filename = `HopDong_${
      contract.rentalOrderId.orderGuid || contractId
    }.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Export PDF error:", error);
    res.status(500).json({
      message: "Lỗi xuất PDF hợp đồng",
      details: error.message,
    });
  }
};
