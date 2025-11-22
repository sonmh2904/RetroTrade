const UserSignature = require("../../models/UserSignature.model");
const ContractSignature = require("../../models/ContractSignature.model"); // Đảm bảo import này
const cloudinary = require("cloudinary").v2;
const { generateString } = require("../../utils/generateString");
const {
  encryptSignature,
  decryptSignature,
} = require("../../utils/cryptoHelper");
const AuditLog = require("../../models/AuditLog.model");
const { createNotification } = require("../../middleware/createNotification"); 

exports.createSignature = async (req, res) => {
  try {
    const userId = req.user._id;
    const { signatureData } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized - User ID missing" });
    }
    if (!signatureData) {
      return res.status(400).json({ message: "Dữ liệu chữ ký không hợp lệ" });
    }

    const existingSignature = await UserSignature.findOne({
      userId,
      isActive: true,
    });

    let isUsedInContract = false; // Khai báo ngoài để scope toàn hàm
    if (existingSignature) {
      // Check if existing signature is used in any contract
      const usedSig = await ContractSignature.findOne({
        signatureId: existingSignature._id,
        isValid: true,
      });
      isUsedInContract = !!usedSig; // true nếu tồn tại
      if (isUsedInContract) {
        console.warn(
          `Existing signature ${existingSignature._id} is used in contract, creating new one`
        );
      }
    }

    const { iv, encryptedData } = encryptSignature(signatureData);
    const encryptedBuffer = Buffer.from(encryptedData, "hex");

    // Upload image mới lên Cloudinary
    const newPublicId = `sig_${userId}_${generateString(8)}`;
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        signatureData,
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

    let operation = "INSERT";
    let signatureId = null;

    if (existingSignature && !isUsedInContract) {
      // Only update if not used
      // Delete old image from Cloudinary
      const oldPublicId = existingSignature.signatureImagePath
        .split("/")
        .pop()
        ?.split(".")[0];
      if (oldPublicId) {
        await cloudinary.uploader.destroy(oldPublicId, {
          resource_type: "image",
        });
      }

      const updatedSignature = await UserSignature.findOneAndUpdate(
        { userId, isActive: true },
        {
          signatureData: encryptedBuffer,
          iv,
          signatureImagePath: uploadResult.secure_url,
          validFrom: new Date(),
          updatedAt: new Date(),
        },
        { new: true }
      );

      signatureId = updatedSignature._id;
      operation = "UPDATE";
    } else {
      // Tạo mới nếu chưa có hoặc đã sử dụng (tạo signature mới)
      const signature = new UserSignature({
        userId,
        signatureData: encryptedBuffer,
        iv,
        signatureImagePath: uploadResult.secure_url,
      });

      const savedSignature = await signature.save();
      signatureId = savedSignature._id;
    }

    // Log Audit
    if (AuditLog) {
      await AuditLog.create({
        TableName: "UserSignatures",
        PrimaryKeyValue: signatureId.toString(),
        Operation: operation,
        ChangedByUserId: userId,
        ChangedAt: new Date(),
        ChangeSummary: `Signature ${operation.toLowerCase()}d and encrypted`,
      });
    }

    res.status(201).json({
      message: "Chữ ký được cập nhật thành công",
      signatureUrl: uploadResult.secure_url,
      signatureId: signatureId,
      isUsedInContract: false, // New signature is not used yet
    });
  } catch (error) {
    console.error("Create signature error:", error);
    res.status(500).json({
      message: "Lỗi server khi cập nhật chữ ký",
      details: error.message,
    });
  }
};

exports.getSignature = async (req, res) => {
  try {
    const userId = req.user._id;

    const signature = await UserSignature.findOne({
      userId,
      isActive: true,
    }).select("signatureImagePath iv signatureData createdAt validTo isActive");

    if (!signature) {
      return res.status(404).json({ message: "Chưa có chữ ký" });
    }

    // Check if used in any contract
    const isUsedInContract = await ContractSignature.findOne({
      signatureId: signature._id,
      isValid: true,
    });

    // Check if expired
    const now = new Date();
    const isExpired = signature.validTo && now > signature.validTo;
    if (isExpired) {
      // Deactivate the signature
      await UserSignature.findByIdAndUpdate(signature._id, { isActive: false });

      // Notify user to create new signature
      await createNotification(
        userId,
        "Signature Expired",
        "Chữ ký điện tử hết hạn",
        "Chữ ký của bạn đã hết hạn. Vui lòng tạo chữ ký mới để tiếp tục ký hợp đồng.",
        { action: "create_new_signature" }
      );

      return res.status(410).json({
        message: "Chữ ký đã hết hạn",
        isExpired: true,
        expiredAt: signature.validTo,
        isUsedInContract: !!isUsedInContract, // Still return flag even if expired
      });
    }

    let decryptedData = null;
    if (typeof signature.signatureData === "string" || !signature.iv) {
      decryptedData = signature.signatureData;
      console.warn("Using legacy signature data (not encrypted)");
    } else {
      try {
        const encryptedHex = signature.signatureData.toString("hex");
        decryptedData = decryptSignature(encryptedHex, signature.iv);
      } catch (decryptError) {
        console.error(
          "Decrypt error (non-critical for preview):",
          decryptError
        );
        decryptedData = null;
      }
    }

    res.json({
      signatureUrl: signature.signatureImagePath,
      decryptedData: decryptedData || null,
      validTo: signature.validTo,
      isActive: signature.isActive,
      isExpired: false,
      isUsedInContract: !!isUsedInContract, // Return flag for FE to disable edit/delete
    });
  } catch (error) {
    console.error("Get signature error:", error);
    res.status(500).json({ message: "Lỗi lấy chữ ký" });
  }
};

exports.deleteSignature = async (req, res) => {
  try {
    const userId = req.user._id;

    const signatureToDelete = await UserSignature.findOne({
      userId,
      isActive: true,
    });

    if (!signatureToDelete) {
      return res.status(404).json({ message: "Không tìm thấy chữ ký để xóa" });
    }

    // Check if used in any contract
    const isUsedInContract = await ContractSignature.findOne({
      signatureId: signatureToDelete._id,
      isValid: true,
    });

    if (isUsedInContract) {
      return res.status(403).json({
        message:
          "Không thể xóa chữ ký đã được sử dụng trong hợp đồng. Vui lòng tạo chữ ký mới nếu cần.",
      });
    }

    // Delete image from Cloudinary
    const publicId = signatureToDelete.signatureImagePath
      .split("/")
      .pop()
      ?.split(".")[0];
    if (publicId) {
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    }

    const deletedId = signatureToDelete._id;
    await UserSignature.findByIdAndDelete(deletedId);

    // Log Audit: DELETE
    if (AuditLog) {
      await AuditLog.create({
        TableName: "UserSignatures",
        PrimaryKeyValue: deletedId.toString(),
        Operation: "DELETE",
        ChangedByUserId: userId,
        ChangedAt: new Date(),
        ChangeSummary: "Signature deleted and image removed",
      });
    }

    res.json({ message: "Chữ ký đã được xóa thành công" });
  } catch (error) {
    console.error("Delete signature error:", error);
    res.status(500).json({ message: "Lỗi xóa chữ ký" });
  }
};
