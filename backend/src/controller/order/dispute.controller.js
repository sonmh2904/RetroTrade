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
    const { decision, notes, refundAmount, refundPercentage, refundTo } = req.body;
    const dispute = await Report.findById(req.params.id)
      .populate("orderId", "orderGuid totalAmount finalAmount")
      .populate("reporterId", "fullName email")
      .populate("reportedUserId", "fullName email");

    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy tranh chấp." });
    }

    // Chỉ moderator đã nhận tranh chấp mới có thể resolve
    if (!dispute.assignedBy) {
      return res.status(400).json({
        message:
          "Tranh chấp này chưa được moderator nào nhận. Vui lòng nhận tranh chấp trước khi xử lý.",
      });
    }

    // Kiểm tra xem moderator hiện tại có phải là người đã nhận không
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

    // Chỉ cho phép resolve khi status là "In Progress"
    if (dispute.status !== "In Progress") {
      return res.status(400).json({
        message: `Không thể xử lý tranh chấp này. Trạng thái hiện tại: ${dispute.status}`,
      });
    }

    // Lấy orderId và order để tính toán hoàn tiền
    const orderIdValue = dispute.orderId._id || dispute.orderId;
    const order = await Order.findById(orderIdValue).select("totalAmount finalAmount");
    
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    // Tính toán refundAmount từ refundPercentage nếu có
    let calculatedRefundAmount = 0;
    if (refundPercentage && refundPercentage > 0) {
      // Sử dụng finalAmount nếu có, nếu không dùng totalAmount
      const baseAmount = order.finalAmount || order.totalAmount;
      calculatedRefundAmount = Math.round((baseAmount * refundPercentage) / 100);
    } else if (refundAmount) {
      calculatedRefundAmount = Number(refundAmount);
    }

    // Validate refundTo nếu có hoàn tiền
    if (calculatedRefundAmount > 0 && !refundTo) {
      return res.status(400).json({
        message: "Vui lòng chỉ định người nhận hoàn tiền (refundTo: 'reporter' hoặc 'reportedUser').",
      });
    }

    if (calculatedRefundAmount > 0 && !["reporter", "reportedUser"].includes(refundTo)) {
      return res.status(400).json({
        message: "refundTo phải là 'reporter' hoặc 'reportedUser'.",
      });
    }

    // Validate refundPercentage
    if (refundPercentage !== undefined && (refundPercentage < 0 || refundPercentage > 100)) {
      return res.status(400).json({
        message: "refundPercentage phải nằm trong khoảng 0-100.",
      });
    }

    dispute.status = "Resolved";
    dispute.resolution = {
      decision,
      notes,
      refundAmount: calculatedRefundAmount,
      refundPercentage: refundPercentage || 0,
      refundTo: calculatedRefundAmount > 0 ? refundTo : null,
    };
    dispute.handledBy = req.user._id;
    dispute.handledAt = new Date();
    await dispute.save();

    await Order.findByIdAndUpdate(orderIdValue, {
      orderStatus: "completed",
      paymentStatus: calculatedRefundAmount > 0 ? "refunded" : "paid",
    });

    // Lấy thông tin moderator xử lý
    const moderator = await User.findById(req.user._id).select(
      "fullName email"
    );
    const moderatorName =
      moderator?.fullName || moderator?.email || "Moderator";

    // Lấy orderGuid (có thể từ populated object hoặc cần query lại)
    let orderGuid = "N/A";
    if (dispute.orderId?.orderGuid) {
      orderGuid = dispute.orderId.orderGuid;
    } else {
      const order = await Order.findById(orderIdValue).select("orderGuid");
      if (order) orderGuid = order.orderGuid;
    }

    // Xác định người nhận hoàn tiền
    const refundRecipientId = calculatedRefundAmount > 0 && refundTo === "reporter" 
      ? (dispute.reporterId._id || dispute.reporterId)
      : calculatedRefundAmount > 0 && refundTo === "reportedUser"
      ? (dispute.reportedUserId._id || dispute.reportedUserId)
      : null;

    const refundText = calculatedRefundAmount > 0
      ? ` và được hoàn tiền ${calculatedRefundAmount.toLocaleString("vi-VN")} VNĐ (${dispute.resolution.refundPercentage}%)`
      : "";

    // Lấy reporterId và reportedUserId (có thể là ObjectId hoặc object đã populate)
    const reporterIdValue = dispute.reporterId._id || dispute.reporterId;
    const reportedUserIdValue =
      dispute.reportedUserId._id || dispute.reportedUserId;

    // Thông báo cho người tạo tranh chấp
    const reporterRefundText = refundRecipientId && refundRecipientId.toString() === reporterIdValue.toString()
      ? ` và bạn được hoàn tiền ${calculatedRefundAmount.toLocaleString("vi-VN")} VNĐ (${dispute.resolution.refundPercentage}%)`
      : calculatedRefundAmount > 0
      ? ` và ${refundTo === "reportedUser" ? "người bị báo cáo" : "người tạo tranh chấp"} được hoàn tiền ${calculatedRefundAmount.toLocaleString("vi-VN")} VNĐ (${dispute.resolution.refundPercentage}%)`
      : "";

    await createNotification(
      reporterIdValue,
      "Dispute Resolved",
      "Tranh chấp đã được xử lý",
      `Tranh chấp về đơn hàng #${orderGuid} đã được ${moderatorName} xử lý. Quyết định: ${decision}${reporterRefundText}.`,
      {
        disputeId: dispute._id,
        orderId: orderIdValue,
        orderGuid: orderGuid,
        decision: decision,
        refundAmount: calculatedRefundAmount,
        refundPercentage: dispute.resolution.refundPercentage,
        refundTo: dispute.resolution.refundTo,
        handledBy: req.user._id,
      }
    );

    // Thông báo cho người bị báo cáo
    const reportedRefundText = refundRecipientId && refundRecipientId.toString() === reportedUserIdValue.toString()
      ? ` và bạn được hoàn tiền ${calculatedRefundAmount.toLocaleString("vi-VN")} VNĐ (${dispute.resolution.refundPercentage}%)`
      : calculatedRefundAmount > 0
      ? ` và ${refundTo === "reporter" ? "người tạo tranh chấp" : "người bị báo cáo"} được hoàn tiền ${calculatedRefundAmount.toLocaleString("vi-VN")} VNĐ (${dispute.resolution.refundPercentage}%)`
      : "";

    await createNotification(
      reportedUserIdValue,
      "Dispute Resolved",
      "Tranh chấp đã được xử lý",
      `Tranh chấp về đơn hàng #${orderGuid} đã được ${moderatorName} xử lý. Quyết định: ${decision}${reportedRefundText}.`,
      {
        disputeId: dispute._id,
        orderId: orderIdValue,
        orderGuid: orderGuid,
        decision: decision,
        refundAmount: calculatedRefundAmount,
        refundPercentage: dispute.resolution.refundPercentage,
        refundTo: dispute.resolution.refundTo,
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
