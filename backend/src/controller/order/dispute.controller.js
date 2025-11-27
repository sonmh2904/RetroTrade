const mongoose = require("mongoose");
const Report = require("../../models/Order/Reports.model.js");
const Order = require("../../models/Order/Order.model.js");
const User = require("../../models/User.model.js");
const { createNotification } = require("../../middleware/createNotification");
const { uploadToCloudinary } = require("../../middleware/upload.middleware");

const createDispute = async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;

    // === 1. Validate orderId ===
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "ID đơn hàng không hợp lệ.",
      });
    }

    // === 2. Tìm đơn hàng + populate ===
    const order = await Order.findById(orderId)
      .populate("renterId", "fullName email avatar")
      .populate("ownerId", "fullName email avatar");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng.",
      });
    }

    // === 3. Không cho tạo Khiếu nạiở trạng thái pending/confirmed ===
    const forbiddenStatuses = [
      "pending",
      "confirmed",
      "disputed",
      "cancelled",
      "completed",
    ];
    if (forbiddenStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Không thể tạo Khiếu nạikhi đơn hàng đang ở trạng thái "${order.orderStatus}".`,
      });
    }

    // === 4. Kiểm tra quyền (chỉ renter hoặc owner mới được tạo) ===
    const userId = req.user._id.toString();
    const renterId = order.renterId._id.toString();
    const ownerId = order.ownerId._id.toString();

    if (userId !== renterId && userId !== ownerId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền tạo Khiếu nạicho đơn hàng này.",
      });
    }

    const reportedUserId = userId === renterId ? ownerId : renterId;

    // === 5. Kiểm tra đã có Khiếu nạiđang xử lý chưa ===
    const existingDispute = await Report.findOne({
      orderId,
      type: "dispute",
      status: { $in: ["Pending", "In Progress", "Reviewed"] },
    });

    if (existingDispute) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng này đã có Khiếu nạiđang được xử lý.",
        disputeId: existingDispute._id,
      });
    }

    // === 6. XỬ LÝ UPLOAD ẢNH BẰNG CHỨNG (QUAN TRỌNG NHẤT) ===
    let evidenceUrls = [];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      try {
        const uploadedResults = await uploadToCloudinary(
          req.files,
          "retrotrade/disputes"
        );
        evidenceUrls = uploadedResults.map((img) => img.Url);
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Không thể upload ảnh bằng chứng. Vui lòng thử lại.",
        });
      }
    }

    // === 7. Tạo Khiếu nại===
    const newDispute = await Report.create({
      orderId,
      reporterId: userId,
      reportedUserId,
      reason,
      description: description?.trim() || "",
      evidence: evidenceUrls,
      type: "dispute",
      status: "Pending",
    });

    // === 8. Cập nhật trạng thái đơn hàng ===
    order.orderStatus = "disputed";
    order.disputeId = newDispute._id;
    await order.save();

    // === 9. Lấy tên người tạo để thông báo ===
    const reporter = await User.findById(userId).select("fullName email");
    const reporterName = reporter?.fullName || reporter?.email || "Người dùng";

    // === 10. Gửi thông báo cho người bị báo cáo ===
    await createNotification(
      reportedUserId,
      "Dispute Created",
      "Có Khiếu nạimới về đơn hàng của bạn",
      `${reporterName} đã tạo Khiếu nạicho đơn hàng #${order.orderGuid}. Lý do: ${reason}`,
      {
        type: "dispute",
        disputeId: newDispute._id,
        orderId,
        orderGuid: order.orderGuid,
      }
    );

    // === 11. Gửi thông báo cho tất cả moderator ===
    const moderators = await User.find({ role: "moderator" }).select(
      "_id fullName"
    );
    for (const mod of moderators) {
      await createNotification(
        mod._id,
        "New Dispute",
        "Có Khiếu nạimới cần xử lý",
        `${reporterName} đã tạo Khiếu nại#${order.orderGuid} – Lý do: ${reason}`,
        {
          type: "dispute",
          disputeId: newDispute._id,
          orderId,
          orderGuid: order.orderGuid,
          reporterId: userId,
          reportedUserId,
        }
      );
    }

    // === 12. Trả về response sạch đẹp cho frontend ===
    return res.status(201).json({
      success: true,
      message: "Tạo Khiếu nạithành công.",
      data: {
        _id: newDispute._id,
        orderId: newDispute.orderId,
        orderGuid: order.orderGuid,
        reporterId: newDispute.reporterId,
        reportedUserId: newDispute.reportedUserId,
        reason: newDispute.reason,
        description: newDispute.description,
        evidence: evidenceUrls, // trả về đúng link ảnh đã upload
        status: newDispute.status,
        createdAt: newDispute.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating dispute:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo Khiếu nại. Vui lòng thử lại sau.",
    });
  }
};

// Lấy danh sách tất cả Khiếu nại
const getAllDisputes = async (req, res) => {
  try {
    const { status, reporterId, orderId } = req.query;

    const query = { type: "dispute" };
    if (status) query.status = status;
    if (reporterId) query.reporterId = reporterId;
    if (orderId) query.orderId = orderId;

    const disputes = await Report.find(query)
      .populate("orderId", "orderGuid orderStatus totalAmount renterId ownerId")
      .populate("reporterId", "fullName email")
      .populate("reportedUserId", "fullName email")
      .populate("assignedBy", "fullName email")
      .populate("handledBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      total: disputes.length,
      data: disputes,
    });
  } catch (error) {
    console.error("Error getting disputes:", error);
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách Khiếu nại.",
      error: error.message,
    });
  }
};

// User lấy danh sách Khiếu nạicủa mình
const getMyDisputes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = {
      type: "dispute",
      $or: [{ reporterId: userId }, { reportedUserId: userId }],
    };
    if (status) query.status = status;

    const disputes = await Report.find(query)
      .populate("orderId", "orderGuid orderStatus totalAmount renterId ownerId")
      .populate("reporterId", "fullName email")
      .populate("reportedUserId", "fullName email")
      .populate("assignedBy", "fullName email")
      .populate("handledBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      total: disputes.length,
      data: disputes,
    });
  } catch (error) {
    console.error("Error getting my disputes:", error);
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách Khiếu nại.",
      error: error.message,
    });
  }
};

// Admin xem chi tiết Khiếu nại
const getDisputeById = async (req, res) => {
  try {
    const dispute = await Report.findById(req.params.id)
      .populate("orderId")
      .populate("reporterId", "fullName email")
      .populate("reportedUserId", "fullName email")
      .populate("assignedBy", "fullName email")
      .populate("handledBy", "fullName email");

    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy Khiếu nại." });
    }

    const order = dispute.orderId;
    if (
      req.user.role !== "moderator" &&
      order?.renterId?.toString() !== req.user._id.toString() &&
      order?.ownerId?.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xem Khiếu nạinày." });
    }

    res.status(200).json({ data: dispute });
  } catch (error) {
    console.error("Error fetching dispute:", error);
    res.status(500).json({
      message: "Lỗi server khi lấy Khiếu nại.",
      error: error.message,
    });
  }
};

// Moderator nhận Khiếu nại(assign)
const assignDispute = async (req, res) => {
  try {
    const dispute = await Report.findById(req.params.id)
      .populate("orderId", "orderGuid")
      .populate("assignedBy", "fullName email");

    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy Khiếu nại." });
    }

    // Chỉ cho phép nhận Khiếu nạikhi status là "Pending"
    if (dispute.status !== "Pending") {
      return res.status(400).json({
        message: `Không thể nhận Khiếu nạinày. Trạng thái hiện tại: ${dispute.status}`,
      });
    }

    // Kiểm tra xem Khiếu nạiđã được moderator khác nhận chưa
    if (dispute.assignedBy) {
      const assignedModerator = await User.findById(dispute.assignedBy).select(
        "fullName email"
      );
      const assignedName =
        assignedModerator?.fullName || assignedModerator?.email || "Moderator";
      return res.status(400).json({
        message: `Khiếu nạinày đã được ${assignedName} nhận xử lý.`,
      });
    }

    // Gán Khiếu nạicho moderator hiện tại
    dispute.status = "In Progress";
    dispute.assignedBy = req.user._id;
    dispute.assignedAt = new Date();
    await dispute.save();

    // Lấy thông tin moderator
    const moderator = await User.findById(req.user._id).select(
      "fullName email"
    );
    const moderatorName =
      moderator?.fullName || moderator?.email || "Moderator";

    const orderGuid = dispute.orderId?.orderGuid || "N/A";

    // Thông báo cho tất cả moderators khác (trừ moderator đã nhận)
    const moderators = await User.find({
      role: "moderator",
      _id: { $ne: req.user._id },
    }).select("_id");

    for (const mod of moderators) {
      await createNotification(
        mod._id,
        "Dispute Assigned",
        "Khiếu nạiđã được nhận xử lý",
        `${moderatorName} đã nhận xử lý Khiếu nạivề đơn hàng #${orderGuid}.`,
        {
          disputeId: dispute._id,
          orderId: dispute.orderId._id || dispute.orderId,
          orderGuid: orderGuid,
          assignedBy: req.user._id,
        }
      );
    }

    res.status(200).json({
      message: "Đã nhận Khiếu nạithành công.",
      data: dispute,
    });
  } catch (error) {
    console.error("Error assigning dispute:", error);
    res.status(500).json({
      message: "Lỗi server khi nhận Khiếu nại.",
      error: error.message,
    });
  }
};

// Moderator trả lại Khiếu nại(unassign) để moderator khác xử lý
const unassignDispute = async (req, res) => {
  try {
    const { reason } = req.body; // Lý do trả lại (optional)
    const dispute = await Report.findById(req.params.id)
      .populate("orderId", "orderGuid")
      .populate("assignedBy", "fullName email");

    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy Khiếu nại." });
    }

    // Chỉ moderator đã nhận mới có thể trả lại
    if (!dispute.assignedBy) {
      return res.status(400).json({
        message: "Khiếu nạinày chưa được moderator nào nhận.",
      });
    }

    if (
      dispute.assignedBy._id?.toString() !== req.user._id.toString() &&
      dispute.assignedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "Bạn không có quyền trả lại Khiếu nạinày. Chỉ moderator đã nhận mới có thể trả lại.",
      });
    }

    // Chỉ cho phép trả lại khi status là "In Progress"
    if (dispute.status !== "In Progress") {
      return res.status(400).json({
        message: `Không thể trả lại Khiếu nạinày. Trạng thái hiện tại: ${dispute.status}`,
      });
    }

    const previousModeratorId = dispute.assignedBy._id || dispute.assignedBy;
    const previousModerator = await User.findById(previousModeratorId).select(
      "fullName email"
    );
    const previousModeratorName =
      previousModerator?.fullName || previousModerator?.email || "Moderator";

    // Trả lại Khiếu nạivề trạng thái "Pending"
    dispute.status = "Pending";
    dispute.assignedBy = null;
    dispute.assignedAt = null;
    await dispute.save();

    const orderGuid = dispute.orderId?.orderGuid || "N/A";

    // Thông báo cho tất cả moderators (bao gồm cả moderator vừa trả lại)
    const moderators = await User.find({ role: "moderator" }).select("_id");
    for (const mod of moderators) {
      await createNotification(
        mod._id,
        "Dispute Unassigned",
        "Khiếu nạiđã được trả lại",
        `${previousModeratorName} đã trả lại Khiếu nạivề đơn hàng #${orderGuid}${
          reason ? `. Lý do: ${reason}` : ""
        }. Khiếu nạihiện có thể được nhận xử lý.`,
        {
          disputeId: dispute._id,
          orderId: dispute.orderId._id || dispute.orderId,
          orderGuid: orderGuid,
          previousAssignedBy: previousModeratorId,
        }
      );
    }

    res.status(200).json({
      message:
        "Đã trả lại Khiếu nạithành công. Khiếu nạihiện có thể được moderator khác nhận xử lý.",
      data: dispute,
    });
  } catch (error) {
    console.error("Error unassigning dispute:", error);
    res.status(500).json({
      message: "Lỗi server khi trả lại Khiếu nại.",
      error: error.message,
    });
  }
};

const resolveDispute = async (req, res) => {
  try {
    const { decision, notes, refundTarget, refundPercentage } = req.body;
    const dispute = await Report.findById(req.params.id)
      .populate("orderId", "orderGuid totalAmount")
      .populate("reporterId", "fullName email")
      .populate("reportedUserId", "fullName email");

    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy Khiếu nại." });
    }

    if (!dispute.assignedBy) {
      return res.status(400).json({
        message:
          "Khiếu nạinày chưa được moderator nào nhận. Vui lòng nhận Khiếu nạitrước khi xử lý.",
      });
    }

    const assignedByValue = dispute.assignedBy._id || dispute.assignedBy;
    if (assignedByValue.toString() !== req.user._id.toString()) {
      const assignedModerator = await User.findById(assignedByValue).select(
        "fullName email"
      );
      const assignedName =
        assignedModerator?.fullName || assignedModerator?.email || "Moderator";
      return res.status(403).json({
        message: `Bạn không có quyền xử lý Khiếu nạinày. Khiếu nạiđã được ${assignedName} nhận xử lý.`,
      });
    }

    if (dispute.status !== "In Progress") {
      return res.status(400).json({
        message: `Không thể xử lý Khiếu nạinày. Trạng thái hiện tại: ${dispute.status}`,
      });
    }

    const parsedPercentageRaw =
      typeof refundPercentage === "number"
        ? refundPercentage
        : Number(refundPercentage);
    const parsedPercentage = Number.isFinite(parsedPercentageRaw)
      ? parsedPercentageRaw
      : 0;

    const allowedPercentages = [0, 10, 25, 50, 100];
    if (!allowedPercentages.includes(parsedPercentage)) {
      return res.status(400).json({
        message: "Phần trăm hoàn chỉ hỗ trợ 0%, 10%, 25%, 50% hoặc 100%.",
      });
    }

    const requireRefund = parsedPercentage > 0;
    if (requireRefund && !["reporter", "reported"].includes(refundTarget)) {
      return res.status(400).json({
        message: "Vui lòng chọn người nhận hoàn tiền hợp lệ.",
      });
    }

    const orderIdValue = dispute.orderId._id || dispute.orderId;
    let orderGuid = dispute.orderId?.orderGuid;
    let orderTotal =
      typeof dispute.orderId?.totalAmount === "number"
        ? dispute.orderId.totalAmount
        : undefined;

    if (!orderGuid || typeof orderTotal !== "number") {
      const orderInfo = await Order.findById(orderIdValue).select(
        "orderGuid totalAmount"
      );
      if (orderInfo) {
        orderGuid = orderGuid || orderInfo.orderGuid;
        orderTotal =
          typeof orderTotal === "number" ? orderTotal : orderInfo.totalAmount;
      }
    }

    orderGuid = orderGuid || "N/A";
    orderTotal = orderTotal || 0;

    let computedRefundAmount = 0;
    if (requireRefund) {
      computedRefundAmount = Math.round((orderTotal * parsedPercentage) / 100);
      if (computedRefundAmount < 0) computedRefundAmount = 0;
      if (orderTotal > 0 && computedRefundAmount > orderTotal) {
        computedRefundAmount = orderTotal;
      }
    }

    const appliedRefundPercentage = requireRefund ? parsedPercentage : 0;
    const appliedRefundTarget = requireRefund ? refundTarget : undefined;

    dispute.status = "Resolved";
    dispute.resolution = {
      decision,
      notes,
      refundAmount: computedRefundAmount,
      refundPercentage: appliedRefundPercentage,
      refundTarget: appliedRefundTarget,
    };
    dispute.handledBy = req.user._id;
    dispute.handledAt = new Date();
    await dispute.save();

    await Order.findByIdAndUpdate(orderIdValue, {
      orderStatus: "completed",
      paymentStatus: computedRefundAmount > 0 ? "refunded" : "paid",
    });

    const moderator = await User.findById(req.user._id).select(
      "fullName email"
    );
    const moderatorName =
      moderator?.fullName || moderator?.email || "Moderator";

    const refundRecipientLabel =
      appliedRefundTarget === "reporter"
        ? "người tố cáo"
        : appliedRefundTarget === "reported"
        ? "người bị tố"
        : "";

    const refundText =
      computedRefundAmount > 0 && refundRecipientLabel
        ? ` và ${refundRecipientLabel} nhận ${appliedRefundPercentage}% (${computedRefundAmount.toLocaleString(
            "vi-VN"
          )} VNĐ)`
        : "";

    const reporterIdValue = dispute.reporterId._id || dispute.reporterId;
    const reportedUserIdValue =
      dispute.reportedUserId._id || dispute.reportedUserId;

    await createNotification(
      reporterIdValue,
      "Dispute Resolved",
      "Khiếu nạiđã được xử lý",
      `Khiếu nạivề đơn hàng #${orderGuid} đã được ${moderatorName} xử lý. Quyết định: ${decision}${refundText}.`,
      {
        disputeId: dispute._id,
        orderId: orderIdValue,
        orderGuid,
        decision,
        refundAmount: computedRefundAmount,
        refundPercentage: appliedRefundPercentage,
        refundTarget: appliedRefundTarget || null,
        handledBy: req.user._id,
      }
    );

    await createNotification(
      reportedUserIdValue,
      "Dispute Resolved",
      "Khiếu nạiđã được xử lý",
      `Khiếu nạivề đơn hàng #${orderGuid} đã được ${moderatorName} xử lý. Quyết định: ${decision}${refundText}.`,
      {
        disputeId: dispute._id,
        orderId: orderIdValue,
        orderGuid,
        decision,
        refundAmount: computedRefundAmount,
        refundPercentage: appliedRefundPercentage,
        refundTarget: appliedRefundTarget || null,
        handledBy: req.user._id,
      }
    );

    res.status(200).json({
      message: "Đã xử lý Khiếu nạithành công.",
      data: dispute,
    });
  } catch (error) {
    console.error("Error resolving dispute:", error);
    res.status(500).json({
      message: "Lỗi server khi xử lý Khiếu nại.",
      error: error.message,
    });
  }
};

module.exports = {
  createDispute,
  getAllDisputes,
  getMyDisputes,
  getDisputeById,
  assignDispute,
  unassignDispute,
  resolveDispute,
};
