const cron = require("node-cron");
const Report = require("../models/Order/Reports.model");
const User = require("../models/User.model");
const { createNotification } = require("../middleware/createNotification");

/**
 * Kiểm tra và xử lý các tranh chấp chưa được xử lý
 * 
 * Logic:
 * 1. Tìm tranh chấp Pending quá 24 giờ → Gửi nhắc nhở cho tất cả moderator
 * 2. Tìm tranh chấp In Progress quá 48 giờ → Tự động unassign và thông báo
 * 3. Nếu có > 10 tranh chấp chưa xử lý → Cảnh báo admin
 */
const checkPendingDisputes = async () => {
  try {
    const now = new Date();
    
    // Tranh chấp Pending quá 24 giờ - gửi nhắc nhở cho moderator
    const pendingReminderTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const pendingDisputes = await Report.find({
      type: "dispute",
      status: "Pending",
      createdAt: { $lte: pendingReminderTime }
    })
      .populate("orderId", "orderGuid")
      .populate("reporterId", "fullName email")
      .populate("reportedUserId", "fullName email");

    if (pendingDisputes.length > 0) {

      const moderators = await User.find({
        role: "moderator",
        isActive: { $ne: false },
        isDeleted: { $ne: true }
      }).select("_id fullName email");

      for (const dispute of pendingDisputes) {
        const hoursPending = Math.floor((now - dispute.createdAt) / (1000 * 60 * 60));
        
        for (const mod of moderators) {
          await createNotification(
            mod._id,
            "Dispute Reminder",
            "⚠️ Tranh chấp chưa được xử lý",
            `Tranh chấp về đơn hàng #${dispute.orderId?.orderGuid || 'N/A'} đã chờ xử lý ${hoursPending} giờ. Vui lòng xem và xử lý sớm.`,
            {
              type: "dispute",
              disputeId: dispute._id,
              orderId: dispute.orderId?._id || dispute.orderId,
              orderGuid: dispute.orderId?.orderGuid,
              status: "Pending",
              hoursPending: hoursPending,
              priority: "high"
            }
          );
        }
      }
    }

    // Tranh chấp In Progress quá 48 giờ - tự động unassign và thông báo
    const inProgressTimeout = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    const staleDisputes = await Report.find({
      type: "dispute",
      status: "In Progress",
      assignedAt: { $lte: inProgressTimeout }
    })
      .populate("orderId", "orderGuid")
      .populate("assignedBy", "fullName email")
      .populate("reporterId", "fullName email")
      .populate("reportedUserId", "fullName email");

    if (staleDisputes.length > 0) {

      for (const dispute of staleDisputes) {
        try {
          const assignedModerator = dispute.assignedBy;
          const assignedModeratorName = assignedModerator?.fullName || assignedModerator?.email || "Moderator";
          const hoursInProgress = Math.floor((now - dispute.assignedAt) / (1000 * 60 * 60));
          const orderGuid = dispute.orderId?.orderGuid || "N/A";

          // Unassign tranh chấp
          dispute.status = "Pending";
          dispute.assignedBy = null;
          dispute.assignedAt = null;
          await dispute.save();

          // Thông báo cho moderator đã bị unassign
          if (assignedModerator?._id) {
            await createNotification(
              assignedModerator._id,
              "Dispute Auto-Unassigned",
              "Tranh chấp đã được tự động trả lại",
              `Tranh chấp về đơn hàng #${orderGuid} đã được tự động trả lại vì chưa được xử lý sau ${hoursInProgress} giờ. Tranh chấp hiện có thể được moderator khác nhận xử lý.`,
              {
                type: "dispute",
                disputeId: dispute._id,
                orderId: dispute.orderId?._id || dispute.orderId,
                orderGuid: orderGuid,
                reason: "timeout",
                hoursInProgress: hoursInProgress
              }
            );
          }

          // Thông báo cho tất cả moderator khác (và cả moderator vừa bị unassign)
          const allModerators = await User.find({
            role: "moderator",
            isActive: { $ne: false },
            isDeleted: { $ne: true }
          }).select("_id fullName email");

          for (const mod of allModerators) {
            await createNotification(
              mod._id,
              "Dispute Available",
              "🔄 Tranh chấp đã được trả lại - Có thể nhận xử lý",
              `Tranh chấp về đơn hàng #${orderGuid} đã được tự động trả lại từ ${assignedModeratorName} (chưa xử lý sau ${hoursInProgress} giờ). Bạn có thể nhận xử lý tranh chấp này.`,
              {
                type: "dispute",
                disputeId: dispute._id,
                orderId: dispute.orderId?._id || dispute.orderId,
                orderGuid: orderGuid,
                previousAssignedBy: assignedModerator?._id || assignedModerator,
                hoursInProgress: hoursInProgress,
                autoUnassigned: true
              }
            );
          }

          // Thông báo cho người liên quan
          const reporterId = dispute.reporterId?._id || dispute.reporterId;
          const reportedUserId = dispute.reportedUserId?._id || dispute.reportedUserId;

          if (reporterId) {
            await createNotification(
              reporterId,
              "Dispute Status Update",
              "Cập nhật trạng thái tranh chấp",
              `Tranh chấp về đơn hàng #${orderGuid} đã được trả lại để moderator khác xử lý. Chúng tôi sẽ xử lý sớm nhất có thể.`,
              {
                type: "dispute",
                disputeId: dispute._id,
                orderId: dispute.orderId?._id || dispute.orderId,
                orderGuid: orderGuid,
                status: "Pending"
              }
            );
          }

          if (reportedUserId) {
            await createNotification(
              reportedUserId,
              "Dispute Status Update",
              "Cập nhật trạng thái tranh chấp",
              `Tranh chấp về đơn hàng #${orderGuid} đã được trả lại để moderator khác xử lý. Chúng tôi sẽ xử lý sớm nhất có thể.`,
              {
                type: "dispute",
                disputeId: dispute._id,
                orderId: dispute.orderId?._id || dispute.orderId,
                orderGuid: orderGuid,
                status: "Pending"
              }
            );
          }

        } catch (disputeError) {
        }
      }
    }

    // Thông báo cho admin nếu có quá nhiều tranh chấp chưa xử lý
    const totalPending = await Report.countDocuments({
      type: "dispute",
      status: "Pending"
    });

    const totalInProgress = await Report.countDocuments({
      type: "dispute",
      status: "In Progress"
    });

    // Nếu có hơn 10 tranh chấp chưa xử lý, thông báo cho admin
    if (totalPending + totalInProgress > 10) {
      const admins = await User.find({
        role: "admin",
        isActive: { $ne: false },
        isDeleted: { $ne: true }
      }).select("_id fullName email");

      for (const admin of admins) {
        await createNotification(
          admin._id,
          "Dispute Alert",
          "⚠️ Cảnh báo: Nhiều tranh chấp chưa xử lý",
          `Hiện có ${totalPending} tranh chấp đang chờ và ${totalInProgress} tranh chấp đang xử lý. Vui lòng kiểm tra và phân công moderator xử lý.`,
          {
            type: "admin_alert",
            totalPending: totalPending,
            totalInProgress: totalInProgress,
            totalUnresolved: totalPending + totalInProgress
          }
        );
      }
    }

  } catch (error) {
  }
};

/**
 * Tự động gán tranh chấp cho moderator có ít tranh chấp nhất
 * 
 * Logic tự động gán:
 * 1. Tìm tranh chấp Pending quá 48 giờ (chưa được moderator nào nhận)
 * 2. Đếm số tranh chấp In Progress của từng moderator (workload)
 * 3. Sắp xếp moderator theo workload tăng dần
 * 4. Gán tranh chấp cho moderator có workload thấp nhất
 * 5. Cập nhật workload sau mỗi lần gán để đảm bảo phân bổ công bằng
 * 6. Giới hạn 5 tranh chấp mỗi lần chạy để tránh quá tải
 * 
 * Ví dụ:
 * - Moderator A: 2 tranh chấp đang xử lý
 * - Moderator B: 1 tranh chấp đang xử lý
 * - Moderator C: 0 tranh chấp đang xử lý
 * → Tranh chấp đầu tiên sẽ được gán cho Moderator C (workload = 0)
 * → Sau khi gán, C có workload = 1, tiếp theo sẽ gán cho B hoặc C (cùng workload = 1)
 */
const autoAssignOldDisputes = async () => {
  try {
    const now = new Date();
    
    // Tìm tranh chấp Pending quá 48 giờ (chưa được moderator nào nhận)
    const autoAssignTime = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const oldPendingDisputes = await Report.find({
      type: "dispute",
      status: "Pending",
      createdAt: { $lte: autoAssignTime }
    })
      .populate("orderId", "orderGuid")
      .limit(5); // Giới hạn 5 tranh chấp mỗi lần chạy để tránh quá tải

    if (oldPendingDisputes.length === 0) {
      return;
    }

    // Lấy tất cả moderator đang hoạt động
    const moderators = await User.find({
      role: "moderator",
      isActive: { $ne: false },
      isDeleted: { $ne: true }
    }).select("_id fullName email");

    if (moderators.length === 0) {
      return;
    }

    // Tính workload: Đếm số tranh chấp In Progress của mỗi moderator
    // Workload càng thấp → moderator càng rảnh → ưu tiên gán tranh chấp
    const moderatorWorkloads = await Promise.all(
      moderators.map(async (mod) => {
        const inProgressCount = await Report.countDocuments({
          type: "dispute",
          status: "In Progress",
          assignedBy: mod._id
        });
        return {
          moderator: mod,
          workload: inProgressCount
        };
      })
    );

    // Gán từng tranh chấp cho moderator có ít việc nhất
    // Sau mỗi lần gán, cập nhật workload để lần gán tiếp theo chọn đúng moderator
    for (let i = 0; i < oldPendingDisputes.length; i++) {
      const dispute = oldPendingDisputes[i];
      
      // Sắp xếp lại theo workload tăng dần (moderator có ít việc nhất lên đầu)
      // Nếu workload bằng nhau, ưu tiên theo thứ tự ID để đảm bảo tính nhất quán
      moderatorWorkloads.sort((a, b) => {
        if (a.workload === b.workload) {
          return a.moderator._id.toString().localeCompare(b.moderator._id.toString());
        }
        return a.workload - b.workload;
      });
      
      // Chọn moderator có workload thấp nhất tại thời điểm này
      const selectedModerator = moderatorWorkloads[0];

      try {
        // Cập nhật trạng thái tranh chấp
        dispute.status = "In Progress";
        dispute.assignedBy = selectedModerator.moderator._id;
        dispute.assignedAt = new Date();
        await dispute.save();
        
        // Cập nhật workload ngay sau khi gán
        // Điều này đảm bảo lần gán tiếp theo sẽ chọn moderator khác nếu có nhiều tranh chấp
        selectedModerator.workload += 1;

        const orderGuid = dispute.orderId?.orderGuid || "N/A";

        // Thông báo cho moderator được gán
        await createNotification(
          selectedModerator.moderator._id,
          "Dispute Auto-Assigned",
          "📋 Tranh chấp đã được tự động gán cho bạn",
          `Tranh chấp về đơn hàng #${orderGuid} đã được tự động gán cho bạn vì đã chờ xử lý quá 48 giờ. Vui lòng xem và xử lý sớm.`,
          {
            type: "dispute",
            disputeId: dispute._id,
            orderId: dispute.orderId?._id || dispute.orderId,
            orderGuid: orderGuid,
            autoAssigned: true,
            hoursPending: Math.floor((now - dispute.createdAt) / (1000 * 60 * 60))
          }
        );

      } catch (assignError) {
      }
    }
  } catch (error) {
  }
};

module.exports = {
  checkPendingDisputes,
  autoAssignOldDisputes
};

