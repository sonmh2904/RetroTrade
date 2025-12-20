const cron = require("node-cron");
const VerificationRequest = require("../models/VerificationRequest.model");
const User = require("../models/User.model");
const { createNotification } = require("../middleware/createNotification");

/**
 * Kiểm tra và xử lý các yêu cầu xác minh chưa được xử lý
 * 
 * Logic:
 * 1. Tìm yêu cầu Pending quá 24 giờ → Gửi nhắc nhở cho tất cả moderator
 * 2. Tìm yêu cầu In Progress quá 48 giờ → Tự động unassign và thông báo
 * 3. Nếu có > 10 yêu cầu chưa xử lý → Cảnh báo admin
 */
const checkPendingVerifications = async () => {
  try {
    const now = new Date();
    
    // Yêu cầu Pending quá 24 giờ - gửi nhắc nhở cho moderator
    const pendingReminderTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const pendingVerifications = await VerificationRequest.find({
      status: "Pending",
      createdAt: { $lte: pendingReminderTime }
    })
      .populate("userId", "fullName email");

    if (pendingVerifications.length > 0) {
      const moderators = await User.find({
        role: "moderator",
        isActive: { $ne: false },
        isDeleted: { $ne: true }
      }).select("_id fullName email");

      for (const verification of pendingVerifications) {
        const hoursPending = Math.floor((now - verification.createdAt) / (1000 * 60 * 60));
        const userName = verification.userId?.fullName || verification.userId?.email || "Người dùng";
        
        for (const mod of moderators) {
          await createNotification(
            mod._id,
            "Verification Reminder",
            "⚠️ Yêu cầu xác minh chưa được xử lý",
            `Yêu cầu xác minh từ ${userName} đã chờ xử lý ${hoursPending} giờ. Vui lòng xem và xử lý sớm.`,
            {
              type: "verification",
              requestId: verification._id,
              userId: verification.userId?._id || verification.userId,
              requestGuid: verification.requestGuid,
              status: "Pending",
              hoursPending: hoursPending,
              priority: "high"
            }
          );
        }
      }
    }

    // Yêu cầu In Progress quá 48 giờ - tự động unassign và thông báo
    const inProgressTimeout = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    const staleVerifications = await VerificationRequest.find({
      status: "In Progress",
      assignedAt: { $lte: inProgressTimeout }
    })
      .populate("assignedTo", "fullName email")
      .populate("userId", "fullName email");

    if (staleVerifications.length > 0) {
      for (const verification of staleVerifications) {
        try {
          const assignedModerator = verification.assignedTo;
          const assignedModeratorName = assignedModerator?.fullName || assignedModerator?.email || "Moderator";
          const hoursInProgress = Math.floor((now - verification.assignedAt) / (1000 * 60 * 60));
          const userName = verification.userId?.fullName || verification.userId?.email || "Người dùng";

          // Unassign yêu cầu
          verification.status = "Pending";
          verification.assignedTo = null;
          verification.assignedAt = null;
          await verification.save();

          // Thông báo cho moderator đã bị unassign
          if (assignedModerator?._id) {
            await createNotification(
              assignedModerator._id,
              "Verification Auto-Unassigned",
              "Yêu cầu xác minh đã được tự động trả lại",
              `Yêu cầu xác minh từ ${userName} đã được tự động trả lại vì chưa được xử lý sau ${hoursInProgress} giờ. Yêu cầu hiện có thể được moderator khác nhận xử lý.`,
              {
                type: "verification",
                requestId: verification._id,
                requestGuid: verification.requestGuid,
                userId: verification.userId?._id || verification.userId,
                reason: "timeout",
                hoursInProgress: hoursInProgress
              }
            );
          }

          // Thông báo cho tất cả moderator khác
          const allModerators = await User.find({
            role: "moderator",
            isActive: { $ne: false },
            isDeleted: { $ne: true }
          }).select("_id fullName email");

          for (const mod of allModerators) {
            await createNotification(
              mod._id,
              "Verification Available",
              "🔄 Yêu cầu xác minh đã được trả lại - Có thể nhận xử lý",
              `Yêu cầu xác minh từ ${userName} đã được tự động trả lại từ ${assignedModeratorName} (chưa xử lý sau ${hoursInProgress} giờ). Bạn có thể nhận xử lý yêu cầu này.`,
              {
                type: "verification",
                requestId: verification._id,
                requestGuid: verification.requestGuid,
                userId: verification.userId?._id || verification.userId,
                previousAssignedTo: assignedModerator?._id || assignedModerator,
                hoursInProgress: hoursInProgress,
                autoUnassigned: true
              }
            );
          }

          // Thông báo cho người dùng
          const userId = verification.userId?._id || verification.userId;
          if (userId) {
            await createNotification(
              userId,
              "Verification Status Update",
              "Cập nhật trạng thái yêu cầu xác minh",
              `Yêu cầu xác minh của bạn đã được trả lại để moderator khác xử lý. Chúng tôi sẽ xử lý sớm nhất có thể.`,
              {
                type: "verification",
                requestId: verification._id,
                requestGuid: verification.requestGuid,
                status: "Pending"
              }
            );
          }

        } catch (verificationError) {
        }
      }
    }

    // Thông báo cho admin nếu có quá nhiều yêu cầu chưa xử lý
    const totalPending = await VerificationRequest.countDocuments({
      status: "Pending"
    });

    const totalInProgress = await VerificationRequest.countDocuments({
      status: "In Progress"
    });

    if (totalPending + totalInProgress > 10) {
      const admins = await User.find({
        role: "admin",
        isActive: { $ne: false },
        isDeleted: { $ne: true }
      }).select("_id fullName email");

      for (const admin of admins) {
        await createNotification(
          admin._id,
          "Verification Alert",
          "⚠️ Cảnh báo: Nhiều yêu cầu xác minh chưa xử lý",
          `Hiện có ${totalPending} yêu cầu đang chờ và ${totalInProgress} yêu cầu đang xử lý. Vui lòng kiểm tra và phân công moderator xử lý.`,
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
 * Tự động gán yêu cầu xác minh cho moderator có ít yêu cầu nhất
 * 
 * Logic tự động gán:
 * 1. Tìm yêu cầu Pending quá 48 giờ (chưa được moderator nào nhận)
 * 2. Đếm số yêu cầu In Progress của từng moderator (workload)
 * 3. Sắp xếp moderator theo workload tăng dần
 * 4. Gán yêu cầu cho moderator có workload thấp nhất
 * 5. Cập nhật workload sau mỗi lần gán để đảm bảo phân bổ công bằng
 * 6. Giới hạn 5 yêu cầu mỗi lần chạy để tránh quá tải
 * 
 * Ví dụ:
 * - Moderator A: 2 yêu cầu đang xử lý
 * - Moderator B: 1 yêu cầu đang xử lý
 * - Moderator C: 0 yêu cầu đang xử lý
 * → Yêu cầu đầu tiên sẽ được gán cho Moderator C (workload = 0)
 * → Sau khi gán, C có workload = 1, tiếp theo sẽ gán cho B hoặc C (cùng workload = 1)
 */
const autoAssignOldVerifications = async () => {
  try {
    const now = new Date();
    
    // Tìm yêu cầu Pending quá 48 giờ (chưa được moderator nào nhận)
    const autoAssignTime = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const oldPendingVerifications = await VerificationRequest.find({
      status: "Pending",
      createdAt: { $lte: autoAssignTime }
    })
      .populate("userId", "fullName email")
      .limit(5);

    if (oldPendingVerifications.length === 0) {
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

    // Tính workload: Đếm số yêu cầu In Progress của mỗi moderator
    // Workload càng thấp → moderator càng rảnh → ưu tiên gán yêu cầu
    const moderatorWorkloads = await Promise.all(
      moderators.map(async (mod) => {
        const inProgressCount = await VerificationRequest.countDocuments({
          status: "In Progress",
          assignedTo: mod._id
        });
        return {
          moderator: mod,
          workload: inProgressCount
        };
      })
    );

    // Gán từng yêu cầu cho moderator có ít việc nhất
    // Sau mỗi lần gán, cập nhật workload để lần gán tiếp theo chọn đúng moderator
    for (let i = 0; i < oldPendingVerifications.length; i++) {
      const verification = oldPendingVerifications[i];
      
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
        // Cập nhật trạng thái yêu cầu
        verification.status = "In Progress";
        verification.assignedTo = selectedModerator.moderator._id;
        verification.assignedAt = new Date();
        await verification.save();
        
        // Cập nhật workload ngay sau khi gán
        // Điều này đảm bảo lần gán tiếp theo sẽ chọn moderator khác nếu có nhiều yêu cầu
        selectedModerator.workload += 1;

        const userName = verification.userId?.fullName || verification.userId?.email || "Người dùng";

        // Thông báo cho moderator được gán
        await createNotification(
          selectedModerator.moderator._id,
          "Verification Auto-Assigned",
          "📋 Yêu cầu xác minh đã được tự động gán cho bạn",
          `Yêu cầu xác minh từ ${userName} đã được tự động gán cho bạn vì đã chờ xử lý quá 48 giờ. Vui lòng xem và xử lý sớm.`,
          {
            type: "verification",
            requestId: verification._id,
            requestGuid: verification.requestGuid,
            userId: verification.userId?._id || verification.userId,
            autoAssigned: true,
            hoursPending: Math.floor((now - verification.createdAt) / (1000 * 60 * 60))
          }
        );

      } catch (assignError) {
      }
    }
  } catch (error) {
  }
};

module.exports = {
  checkPendingVerifications,
  autoAssignOldVerifications
};

