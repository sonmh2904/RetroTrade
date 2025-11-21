const mongoose = require("mongoose");
const OwnerRequest = require("../../models/OwnerRequest.model");
const User = require("../../models/User.model");
const AuditLog = require("../../models/AuditLog.model");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const { createNotification } = require("../../middleware/createNotification");
const { sendEmail } = require("../../utils/sendEmail");

const OWNER_REQUEST_SERVICE_FEE = 50000;


module.exports.createOwnerRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reason, additionalInfo } = req.body;

    if (!reason) {
      return res.json({
        code: 400,
        message: "Vui lòng cung cấp lý do yêu cầu",
      });
    }

    // Check if user already has a pending or approved request
    const existingRequest = await OwnerRequest.findOne({
      user: userId,
      status: { $in: ["pending", "approved"] },
    }).sort({ CreatedAt: -1 });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.json({
          code: 400,
          message: "Bạn đã có yêu cầu đang chờ xử lý. Vui lòng chờ người quản lý xét duyệt.",
        });
      } else if (existingRequest.status === "approved") {
        return res.json({
          code: 400,
          message: "Bạn đã có yêu cầu đã được chấp nhận. Vui lòng kiểm tra lại tài khoản của bạn.",
        });
      }
    }

    // Get current user
    const currentUser = await User.findById(userId);
    
    // Only renter can request to become owner
    if (currentUser.role !== "renter") {
      return res.json({
        code: 400,
        message: "Chỉ người dùng với vai trò renter mới có thể yêu cầu đăng kí cho thuê",
      });
    }

    // Check if user has verified ID
    if (!currentUser.isIdVerified) {
      return res.json({
        code: 400,
        message: "Vui lòng xác minh danh tính trước khi yêu cầu đăng kí cho thuê",
      });
    }

    // Check if user has confirmed email
    if (!currentUser.isEmailConfirmed) {
      return res.json({
        code: 400,
        message: "Vui lòng xác minh email trước khi yêu cầu đăng kí cho thuê",
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let userWallet = await Wallet.findOne({ userId }).session(session);
      if (!userWallet) {
        userWallet = await Wallet.create(
          [{ userId, currency: "VND", balance: 0 }],
          { session }
        );
        userWallet = userWallet[0];
      }

      if ((userWallet.balance || 0) < OWNER_REQUEST_SERVICE_FEE) {
        await session.abortTransaction();
        session.endSession();
        return res.json({
          code: 400,
          message: `Số dư ví không đủ để thanh toán phí dịch vụ ${OWNER_REQUEST_SERVICE_FEE.toLocaleString(
            "vi-VN"
          )} VND. Vui lòng nạp thêm tiền vào ví.`,
        });
      }

      const adminUser = await User.findOne({ role: "admin" }).session(session);
      if (!adminUser) {
        throw new Error("Không tìm thấy tài khoản admin hệ thống");
      }

      let adminWallet = await Wallet.findOne({
        userId: adminUser._id,
      }).session(session);
      if (!adminWallet) {
        adminWallet = await Wallet.create(
          [{ userId: adminUser._id, currency: "VND", balance: 0 }],
          { session }
        );
        adminWallet = adminWallet[0];
      }

      userWallet.balance -= OWNER_REQUEST_SERVICE_FEE;
      await userWallet.save({ session });

      adminWallet.balance += OWNER_REQUEST_SERVICE_FEE;
      await adminWallet.save({ session });

      const orderCode = `OWNER_REQ_${Date.now()}`;
      const [userTx] = await WalletTransaction.create(
        [
          {
            walletId: userWallet._id,
            orderCode,
            typeId: "OWNER_REQUEST_FEE",
            amount: -OWNER_REQUEST_SERVICE_FEE,
            balanceAfter: userWallet.balance,
            note: "Phí dịch vụ nâng cấp Owner",
            status: "completed",
            createdAt: new Date(),
          },
        ],
        { session }
      );

      await WalletTransaction.create(
        [
          {
            walletId: adminWallet._id,
            orderCode: `${orderCode}_SYS`,
            typeId: "OWNER_REQUEST_FEE_RECEIVE",
            amount: OWNER_REQUEST_SERVICE_FEE,
            balanceAfter: adminWallet.balance,
            note: `Nhận phí dịch vụ Owner từ ${currentUser.email || currentUser._id}`,
            status: "completed",
            createdAt: new Date(),
          },
        ],
        { session }
      );

      const [ownerRequest] = await OwnerRequest.create(
        [
          {
            user: userId,
            status: "pending",
            reason,
            additionalInfo,
            serviceFeeAmount: OWNER_REQUEST_SERVICE_FEE,
            serviceFeeTransaction: userTx._id,
            serviceFeePaidAt: new Date(),
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // Create audit log for the request
      await AuditLog.create({
        TableName: "OwnerRequest",
        PrimaryKeyValue: ownerRequest._id.toString(),
        Operation: "INSERT",
        ChangedByUserId: userId,
        ChangeSummary: `User ${currentUser.email} created a new owner request. Status: pending.`,
      });

      // Notify user
      await createNotification(
        userId,
        "Owner Request",
        "Yêu cầu cấp quyền cho thuê đã được gửi",
        `Yêu cầu cấp quyền cho thuê của bạn đã được gửi thành công. Đã trừ ${OWNER_REQUEST_SERVICE_FEE.toLocaleString(
          "vi-VN"
        )} VND phí dịch vụ. Vui lòng chờ người quản lý xét duyệt.`,
        { requestId: ownerRequest._id }
      );

      // Notify moderators only
      const moderators = await User.find({ role: "moderator" });
      for (const moderator of moderators) {
        await createNotification(
          moderator._id,
          "Owner Request",
          "Yêu cầu cấp quyền Owner mới",
          `Người dùng ${currentUser.fullName || currentUser.email} đã yêu cầu cấp quyền Owner.`,
          { requestId: ownerRequest._id, userId: userId }
        );
      }

      // Send email to user
      try {
        const emailSubject = "Yêu cầu cấp quyền cho thuê đã được gửi thành công";
        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Yêu cầu cấp quyền cho thuê đã được gửi</h2>
          <p>Xin chào <strong>${currentUser.fullName || currentUser.email}</strong>,</p>
          <p>Yêu cầu cấp quyền cho thuê của bạn đã được gửi thành công và đang chờ người quản lý xét duyệt.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Lý do yêu cầu:</strong></p>
            <p>${reason}</p>
            ${
              additionalInfo
                ? `<p><strong>Thông tin thêm:</strong></p><p>${additionalInfo}</p>`
                : ""
            }
            <p><strong>Phí dịch vụ đã thanh toán:</strong> ${OWNER_REQUEST_SERVICE_FEE.toLocaleString(
              "vi-VN"
            )} VND</p>
          </div>
          <p>Chúng tôi sẽ thông báo cho bạn ngay khi có kết quả xét duyệt.</p>
          <p>Trân trọng,<br>Đội ngũ RetroTrade</p>
        </div>
      `;
        await sendEmail(currentUser.email, emailSubject, emailHtml);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the request if email fails
      }

      return res.json({
        code: 200,
        message: "Yêu cầu đã được gửi thành công",
        data: ownerRequest,
      });
    } catch (paymentError) {
      await session.abortTransaction();
      session.endSession();
      throw paymentError;
    }

  } catch (error) {
    console.error("Error creating owner request:", error);
    return res.json({
      code: 500,
      message: "Gửi yêu cầu thất bại",
      error: error.message,
    });
  }
};

/**
 * Get all owner requests (for admin/moderator)
 */
module.exports.getAllOwnerRequests = async (req, res) => {
  try {
    // Get pagination from middleware or query params directly
    const skip = req.pagination?.skip || parseInt(req.query.skip || '0', 10);
    const limit = req.pagination?.limit || parseInt(req.query.limit || '20', 10);
    const { status } = req.query;

    console.log('getAllOwnerRequests - params:', { skip, limit, status });

    let query = {};
    if (status) query.status = status;

    const [requests, totalItems] = await Promise.all([
      OwnerRequest.find(query)
        .populate("user", "email fullName avatarUrl role phone documents")
        .populate("reviewedBy", "email fullName")
        .sort({ CreatedAt: -1 })
        .skip(skip)
        .limit(limit),
      OwnerRequest.countDocuments(query),
    ]);

    console.log('getAllOwnerRequests - found:', { count: requests.length, totalItems });

    return res.json({
      code: 200,
      message: "Lấy danh sách yêu cầu thành công",
      data: {
        items: requests,
        totalItems,
      },
    });
  } catch (error) {
    console.error("Error getting owner requests:", error);
    return res.json({
      code: 500,
      message: "Lấy danh sách yêu cầu thất bại",
      error: error.message,
    });
  }
};

/**
 * Get user's own requests
 */
module.exports.getMyOwnerRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await OwnerRequest.find({ user: userId })
      .populate("reviewedBy", "email fullName")
      .sort({ CreatedAt: -1 });

    return res.json({
      code: 200,
      message: "Lấy danh sách yêu cầu thành công",
      data: { items: requests },
    });
  } catch (error) {
    console.error("Error getting user's requests:", error);
    return res.json({
      code: 500,
      message: "Lấy danh sách yêu cầu thất bại",
      error: error.message,
    });
  }
};

/**
 * Get single request by ID
 */
module.exports.getOwnerRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await OwnerRequest.findById(id)
      .populate("user", "email fullName avatarUrl role phone bio")
      .populate("reviewedBy", "email fullName");

    if (!request) {
      return res.json({
        code: 404,
        message: "Không tìm thấy yêu cầu",
      });
    }

    return res.json({
      code: 200,
      message: "Lấy thông tin yêu cầu thành công",
      data: request,
    });
  } catch (error) {
    console.error("Error getting request:", error);
    return res.json({
      code: 500,
      message: "Lấy thông tin yêu cầu thất bại",
      error: error.message,
    });
  }
};

/**
 * Approve owner request
 */
module.exports.approveOwnerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user._id;
    const { notes } = req.body;

    const request = await OwnerRequest.findById(id).populate("user");
    if (!request) {
      return res.json({
        code: 404,
        message: "Không tìm thấy yêu cầu",
      });
    }

    if (request.status !== "pending") {
      return res.json({
        code: 400,
        message: "Yêu cầu đã được xử lý",
      });
    }

    // Update request status
    request.status = "approved";
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date();
    if (notes) request.notes = notes;
    await request.save();

    // Create audit log for approval
    await AuditLog.create({
      TableName: "OwnerRequest",
      PrimaryKeyValue: request._id.toString(),
      Operation: "UPDATE",
      ChangedByUserId: reviewerId,
      ChangeSummary: `Moderator approved owner request for user ${request.user.email || request.user._id}. Status changed to approved.`,
    });

    // Update user role
    await User.findByIdAndUpdate(request.user._id, {
      role: "owner",
    });

    // Notify user
    await createNotification(
      request.user._id,
      "Owner Request Approved",
      "Yêu cầu cấp quyền Owner đã được duyệt",
      `Yêu cầu cấp quyền Owner của bạn đã được duyệt thành công. Bạn giờ đã có thể đăng sản phẩm cho thuê.`,
      { requestId: request._id }
    );

    // Send email to user
    try {
      const emailSubject = "Yêu cầu cấp quyền cho thuê đã được duyệt";
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Yêu cầu của bạn đã được duyệt!</h2>
          <p>Xin chào <strong>${request.user.fullName || request.user.email}</strong>,</p>
          <p>Yêu cầu cấp quyền cho thuê của bạn đã được duyệt thành công.</p>
          <div style="background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
            <p><strong>✓ Tài khoản của bạn đã được nâng cấp thành Owner</strong></p>
            <p>Bạn giờ đã có thể đăng sản phẩm cho thuê trên hệ thống RetroTrade.</p>
          </div>
          ${notes ? `<p><strong>Ghi chú từ người quản lý:</strong></p><p>${notes}</p>` : ''}
          <p><a href="http://localhost:3000" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Truy cập website</a></p>
          <p>Trân trọng,<br>Đội ngũ RetroTrade</p>
        </div>
      `;
      await sendEmail(request.user.email, emailSubject, emailHtml);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
    }

    // Reload request with populated fields
    const updatedRequest = await OwnerRequest.findById(id)
      .populate("user", "email fullName avatarUrl role")
      .populate("reviewedBy", "email fullName");

    return res.json({
      code: 200,
      message: "Yêu cầu đã được duyệt thành công",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error approving request:", error);
    return res.json({
      code: 500,
      message: "Duyệt yêu cầu thất bại",
      error: error.message,
    });
  }
};

/**
 * Reject owner request
 */
module.exports.rejectOwnerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user._id;
    const { rejectionReason, notes } = req.body;

    if (!rejectionReason) {
      return res.json({
        code: 400,
        message: "Vui lòng cung cấp lý do từ chối",
      });
    }

    const request = await OwnerRequest.findById(id).populate("user");
    if (!request) {
      return res.json({
        code: 404,
        message: "Không tìm thấy yêu cầu",
      });
    }

    if (request.status !== "pending") {
      return res.json({
        code: 400,
        message: "Yêu cầu đã được xử lý",
      });
    }

    // Update request status
    request.status = "rejected";
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason;
    if (notes) request.notes = notes;
    await request.save();

    // Create audit log for rejection
    await AuditLog.create({
      TableName: "OwnerRequest",
      PrimaryKeyValue: request._id.toString(),
      Operation: "UPDATE",
      ChangedByUserId: reviewerId,
      ChangeSummary: `Moderator rejected owner request for user ${request.user.email || request.user._id}. Reason: ${rejectionReason}`,
    });

    // Notify user
    await createNotification(
      request.user._id,
      "Owner Request Rejected",
      "Yêu cầu cấp quyền Owner bị từ chối",
      `Yêu cầu cấp quyền Owner của bạn đã bị từ chối. Lý do: ${rejectionReason}`,
      { requestId: request._id }
    );

    // Send email to user
    try {
      const emailSubject = "Yêu cầu cấp quyền cho thuê bị từ chối";
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">Yêu cầu của bạn đã bị từ chối</h2>
          <p>Xin chào <strong>${request.user.fullName || request.user.email}</strong>,</p>
          <p>Rất tiếc, yêu cầu cấp quyền cho thuê của bạn đã bị từ chối.</p>
          <div style="background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0;">
            <p><strong>Lý do từ chối:</strong></p>
            <p>${rejectionReason}</p>
            ${notes ? `<p><strong>Ghi chú thêm:</strong></p><p>${notes}</p>` : ''}
          </div>
          <p>Bạn có thể:</p>
          <ul style="line-height: 1.8;">
            <li>Xem xét lại lý do từ chối</li>
            <li>Đảm bảo đã hoàn tất tất cả thông tin xác minh danh tính</li>
            <li>Gửi lại yêu cầu mới sau khi đã khắc phục các vấn đề</li>
          </ul>
          <p><a href="http://localhost:3000/auth/profile" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Xem hồ sơ của tôi</a></p>
          <p>Nếu bạn có câu hỏi, vui lòng liên hệ với chúng tôi.</p>
          <p>Trân trọng,<br>Đội ngũ RetroTrade</p>
        </div>
      `;
      await sendEmail(request.user.email, emailSubject, emailHtml);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
    }

    // Reload request with populated fields
    const updatedRequest = await OwnerRequest.findById(id)
      .populate("user", "email fullName avatarUrl role")
      .populate("reviewedBy", "email fullName");

    return res.json({
      code: 200,
      message: "Yêu cầu đã bị từ chối",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error rejecting request:", error);
    return res.json({
      code: 500,
      message: "Từ chối yêu cầu thất bại",
      error: error.message,
    });
  }
};

/**
 * Cancel owner request (by user)
 */
module.exports.cancelOwnerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const request = await OwnerRequest.findById(id);
    if (!request) {
      return res.json({
        code: 404,
        message: "Không tìm thấy yêu cầu",
      });
    }

    if (request.user.toString() !== userId) {
      return res.json({
        code: 403,
        message: "Bạn không có quyền hủy yêu cầu này",
      });
    }

    if (request.status !== "pending") {
      return res.json({
        code: 400,
        message: "Chỉ có thể hủy yêu cầu đang chờ xử lý",
      });
    }

    request.status = "cancelled";
    await request.save();

    // Create audit log for cancellation
    await AuditLog.create({
      TableName: "OwnerRequest",
      PrimaryKeyValue: request._id.toString(),
      Operation: "UPDATE",
      ChangedByUserId: userId,
      ChangeSummary: `User ${userId} cancelled their owner request. Status changed to cancelled.`,
    });

    // Notify user
    await createNotification(
      userId,
      "Owner Request Cancelled",
      "Yêu cầu cấp quyền cho thuê đã được hủy",
      `Yêu cầu cấp quyền cho thuê của bạn đã được hủy thành công.`,
      { requestId: request._id }
    );

    return res.json({
      code: 200,
      message: "Đã hủy yêu cầu thành công",
      data: request,
    });
  } catch (error) {
    console.error("Error cancelling request:", error);
    return res.json({
      code: 500,
      message: "Hủy yêu cầu thất bại",
      error: error.message,
    });
  }
};

/**
 * Get request statistics (for dashboard)
 */
module.exports.getOwnerRequestStats = async (req, res) => {
  try {
    const stats = await OwnerRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count;
    });

    return res.json({
      code: 200,
      message: "Lấy thống kê thành công",
      data: formattedStats,
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    return res.json({
      code: 500,
      message: "Lấy thống kê thất bại",
      error: error.message,
    });
  }
};

