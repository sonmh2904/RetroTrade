const mongoose = require("mongoose");
const Report = require("../../models/Order/Reports.model.js");
const Order = require("../../models/Order/Order.model.js");
const User = require("../../models/User.model.js");
const { createNotification } = require("../../middleware/createNotification");

const createDispute = async (req, res) => {
  try {
    const { orderId, reason, description, evidenceUrls } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "ID đơn hàng không hợp lệ." });
    }
    // console.log("orderId received:", orderId);
    // console.log("isValid:", mongoose.Types.ObjectId.isValid(orderId));

    const order = await Order.findById(orderId)
      .populate("renterId", "fullName email")
      .populate("ownerId", "fullName email");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }
    const allowedStatuses = ["pending", "confirmed"];
    if (allowedStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        message: `Không thể tạo tranh chấp khi đơn hàng là "${order.orderStatus}"`,
      });
    }

    const userId = req.user._id.toString();
    const renterId = order.renterId._id.toString();
    const ownerId = order.ownerId._id.toString();

    if (userId !== renterId && userId !== ownerId) {
      return res.status(403).json({
        message: "Bạn không có quyền tạo tranh chấp cho đơn hàng này.",
      });
    }

    const reportedUserId = userId === renterId ? ownerId : renterId;

    const existing = await Report.findOne({
      orderId,
      type: "dispute",
      status: { $in: ["Pending", "In Progress", "Reviewed"] },
    });

    if (existing) {
      return res.status(400).json({
        message: "Đơn hàng này đã có tranh chấp đang được xử lý.",
      });
    }

    const newReport = await Report.create({
      orderId,
      reporterId: userId,
      reportedUserId,
      reason,
      description,
      evidenceUrls,
      type: "dispute",
      status: "Pending",
    });

    order.orderStatus = "disputed";
    await order.save();

    // Lấy thông tin người tạo tranh chấp
    const reporter = await User.findById(userId).select("fullName email");
    const reporterName = reporter?.fullName || reporter?.email || "Người dùng";

    // Thông báo cho người bị báo cáo
    await createNotification(
      reportedUserId,
      "Dispute Created",
      "Có tranh chấp mới về đơn hàng của bạn",
      `${reporterName} đã tạo tranh chấp về đơn hàng #${order.orderGuid}. Lý do: ${reason}`,
      {
        disputeId: newReport._id,
        orderId: orderId,
        orderGuid: order.orderGuid,
        reporterId: userId,
      }
    );

    // Thông báo cho tất cả moderators
    const moderators = await User.find({ role: "moderator" }).select("_id");
    for (const moderator of moderators) {
      await createNotification(
        moderator._id,
        "Dispute Created",
        "Có tranh chấp mới cần xử lý",
        `${reporterName} đã tạo tranh chấp về đơn hàng #${order.orderGuid}. Lý do: ${reason}`,
        {
          disputeId: newReport._id,
          orderId: orderId,
          orderGuid: order.orderGuid,
          reporterId: userId,
          reportedUserId: reportedUserId,
        }
      );
    }

    return res.status(201).json({
      message: "Tạo tranh chấp thành công.",
      data: {
        _id: newReport._id,
        orderId: newReport.orderId,
        reporterId: newReport.reporterId,
        reportedUserId: newReport.reportedUserId,
        reason: newReport.reason,
        status: newReport.status,
        createdAt: newReport.createdAt,
        evidence: newReport.evidence || [],
      },
    });
  } catch (error) {
    console.error("Error creating dispute:", error);
    return res.status(500).json({
      message: "Lỗi server khi tạo tranh chấp.",
      error: error.message,
    });
  }
};

// Lấy danh sách tất cả tranh chấp
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
      message: "Lỗi server khi lấy danh sách tranh chấp.",
      error: error.message,
    });
  }
};

// User lấy danh sách tranh chấp của mình
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
      message: "Lỗi server khi lấy danh sách tranh chấp.",
      error: error.message,
    });
  }
};

// Admin xem chi tiết tranh chấp
const getDisputeById = async (req, res) => {
  try {
    const dispute = await Report.findById(req.params.id)
      .populate("orderId", "orderGuid orderStatus totalAmount renterId ownerId")
      .populate("reporterId", "fullName email")
      .populate("reportedUserId", "fullName email")
      .populate("assignedBy", "fullName email")
      .populate("handledBy", "fullName email");

    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy tranh chấp." });
    }

    const order = dispute.orderId;
    if (
      req.user.role !== "moderator" &&
      order?.renterId?.toString() !== req.user._id.toString() &&
      order?.ownerId?.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xem tranh chấp này." });
    }

    res.status(200).json({ data: dispute });
  } catch (error) {
    console.error("Error fetching dispute:", error);
    res.status(500).json({
      message: "Lỗi server khi lấy tranh chấp.",
      error: error.message,
    });
  }
};

// Moderator nhận tranh chấp (assign)
const assignDispute = async (req, res) => {
  try {
    const dispute = await Report.findById(req.params.id)
      .populate("orderId", "orderGuid")
      .populate("assignedBy", "fullName email");

    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy tranh chấp." });
    }

    // Chỉ cho phép nhận tranh chấp khi status là "Pending"
    if (dispute.status !== "Pending") {
      return res.status(400).json({
        message: `Không thể nhận tranh chấp này. Trạng thái hiện tại: ${dispute.status}`,
      });
    }

    // Kiểm tra xem tranh chấp đã được moderator khác nhận chưa
    if (dispute.assignedBy) {
      const assignedModerator = await User.findById(dispute.assignedBy).select(
        "fullName email"
      );
      const assignedName =
        assignedModerator?.fullName || assignedModerator?.email || "Moderator";
      return res.status(400).json({
        message: `Tranh chấp này đã được ${assignedName} nhận xử lý.`,
      });
    }

    // Gán tranh chấp cho moderator hiện tại
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
        "Tranh chấp đã được nhận xử lý",
        `${moderatorName} đã nhận xử lý tranh chấp về đơn hàng #${orderGuid}.`,
        {
          disputeId: dispute._id,
          orderId: dispute.orderId._id || dispute.orderId,
          orderGuid: orderGuid,
          assignedBy: req.user._id,
        }
      );
    }

    res.status(200).json({
      message: "Đã nhận tranh chấp thành công.",
      data: dispute,
    });
  } catch (error) {
    console.error("Error assigning dispute:", error);
    res.status(500).json({
      message: "Lỗi server khi nhận tranh chấp.",
      error: error.message,
    });
  }
};

// Moderator trả lại tranh chấp (unassign) để moderator khác xử lý
const unassignDispute = async (req, res) => {
  try {
    const { reason } = req.body; // Lý do trả lại (optional)
    const dispute = await Report.findById(req.params.id)
      .populate("orderId", "orderGuid")
      .populate("assignedBy", "fullName email");

    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy tranh chấp." });
    }

    // Chỉ moderator đã nhận mới có thể trả lại
    if (!dispute.assignedBy) {
      return res.status(400).json({
        message: "Tranh chấp này chưa được moderator nào nhận.",
      });
    }

    if (
      dispute.assignedBy._id?.toString() !== req.user._id.toString() &&
      dispute.assignedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "Bạn không có quyền trả lại tranh chấp này. Chỉ moderator đã nhận mới có thể trả lại.",
      });
    }

    // Chỉ cho phép trả lại khi status là "In Progress"
    if (dispute.status !== "In Progress") {
      return res.status(400).json({
        message: `Không thể trả lại tranh chấp này. Trạng thái hiện tại: ${dispute.status}`,
      });
    }

    const previousModeratorId = dispute.assignedBy._id || dispute.assignedBy;
    const previousModerator = await User.findById(previousModeratorId).select(
      "fullName email"
    );
    const previousModeratorName =
      previousModerator?.fullName || previousModerator?.email || "Moderator";

    // Trả lại tranh chấp về trạng thái "Pending"
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
        "Tranh chấp đã được trả lại",
        `${previousModeratorName} đã trả lại tranh chấp về đơn hàng #${orderGuid}${
          reason ? `. Lý do: ${reason}` : ""
        }. Tranh chấp hiện có thể được nhận xử lý.`,
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
        "Đã trả lại tranh chấp thành công. Tranh chấp hiện có thể được moderator khác nhận xử lý.",
      data: dispute,
    });
  } catch (error) {
    console.error("Error unassigning dispute:", error);
    res.status(500).json({
      message: "Lỗi server khi trả lại tranh chấp.",
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
      return res.status(404).json({ message: "Không tìm thấy tranh chấp." });
    }

    if (!dispute.assignedBy) {
      return res.status(400).json({
        message:
          "Tranh chấp này chưa được moderator nào nhận. Vui lòng nhận tranh chấp trước khi xử lý.",
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
        message: `Bạn không có quyền xử lý tranh chấp này. Tranh chấp đã được ${assignedName} nhận xử lý.`,
      });
    }

    if (dispute.status !== "In Progress") {
      return res.status(400).json({
        message: `Không thể xử lý tranh chấp này. Trạng thái hiện tại: ${dispute.status}`,
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
      "Tranh chấp đã được xử lý",
      `Tranh chấp về đơn hàng #${orderGuid} đã được ${moderatorName} xử lý. Quyết định: ${decision}${refundText}.`,
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
      "Tranh chấp đã được xử lý",
      `Tranh chấp về đơn hàng #${orderGuid} đã được ${moderatorName} xử lý. Quyết định: ${decision}${refundText}.`,
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
      message: "Đã xử lý tranh chấp thành công.",
      data: dispute,
    });
  } catch (error) {
    console.error("Error resolving dispute:", error);
    res.status(500).json({
      message: "Lỗi server khi xử lý tranh chấp.",
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
