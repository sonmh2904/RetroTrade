const Complaint = require("../../models/Complaint.model");
const User = require("../../models/User.model");
const BanHistory = require("../../models/BanHistory.model");
const { sendEmail } = require("../../utils/sendEmail");
const { createNotification } = require("../../middleware/createNotification");

/**
 * Gửi khiếu nại về tài khoản bị khóa
 */
const submitComplaint = async (req, res) => {
    try {
        const { email, message, subject } = req.body;

        // Validate input
        if (!email || !message) {
            return res.json({
                code: 400,
                message: "Vui lòng nhập đầy đủ email và nội dung khiếu nại"
            });
        }

        // Check if user exists (optional)
        const user = await User.findOne({ email: email.toLowerCase() });

        // Create complaint
        const complaint = await Complaint.create({
            email: email.toLowerCase(),
            userId: user ? user._id : null,
            subject: subject || "Khiếu nại về tài khoản bị khóa",
            message: message.trim(),
            status: 'pending'
        });

        // Send notification to admins
        try {
            const admins = await User.find({ role: 'admin', isDeleted: false });
            
            for (const admin of admins) {
                await createNotification(
                    admin._id,
                    'complaint',
                    'Khiếu nại mới về tài khoản bị khóa',
                    `Người dùng ${email} đã gửi khiếu nại về tài khoản bị khóa. Vui lòng xem xét.`,
                    {
                        link: `/admin/complaints/${complaint._id}`,
                        relatedUserId: user ? user._id : null
                    }
                );

                // Send email to admin (optional)
                try {
                    const emailHtml = `
                        <h2>Khiếu nại mới về tài khoản bị khóa</h2>
                        <p><strong>Email người dùng:</strong> ${email}</p>
                        <p><strong>Chủ đề:</strong> ${complaint.subject}</p>
                        <p><strong>Nội dung:</strong></p>
                        <p>${message}</p>
                        <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                        <p>Vui lòng xem xét và phản hồi người dùng.</p>
                    `;
                    await sendEmail(admin.email, `[RetroTrade] Khiếu nại mới về tài khoản bị khóa - ${email}`, emailHtml);
                } catch (emailError) {
                    console.error("Error sending email to admin:", emailError);
                    // Continue even if email fails
                }
            }
        } catch (notifError) {
            console.error("Error creating notifications:", notifError);
            // Continue even if notification fails
        }

        return res.json({
            code: 200,
            message: "Gửi khiếu nại thành công. Chúng tôi sẽ xem xét và phản hồi bạn trong thời gian sớm nhất.",
            data: {
                complaintId: complaint._id,
                status: complaint.status
            }
        });
    } catch (error) {
        console.error("Error submitting complaint:", error);
        return res.json({
            code: 500,
            message: "Lỗi server khi gửi khiếu nại",
            error: error.message
        });
    }
};

/**
 * Admin: Lấy danh sách khiếu nại ban tài khoản
 */
const getAllComplaints = async (req, res) => {
    try {
        const { skip = 0, limit = 10, page = 1 } = req.pagination || {};
        const { 
            status = 'all',
            search = ''
        } = req.query || {};

        // Build filter
        const filter = {};
        
        // Filter by status
        if (status && status !== 'all' && ['pending', 'reviewing', 'resolved', 'rejected'].includes(status)) {
            filter.status = status;
        }

        // Search filter
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [
                { email: searchRegex },
                { subject: searchRegex },
                { message: searchRegex }
            ];
        }

        // Query with pagination
        const query = Complaint.find(filter)
            .populate('userId', 'fullName email displayName avatarUrl')
            .populate('handledBy', 'fullName email displayName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const [complaints, totalItems] = await Promise.all([
            query.lean(),
            Complaint.countDocuments(filter)
        ]);

        return res.json({
            code: 200,
            message: "Lấy danh sách khiếu nại thành công",
            data: {
                items: complaints,
                ...(res.paginationMeta ? res.paginationMeta(totalItems) : { page, limit, totalItems, totalPages: Math.max(Math.ceil(totalItems / (limit || 1)), 1) })
            }
        });
    } catch (error) {
        console.error("Error getting complaints:", error);
        return res.json({
            code: 500,
            message: "Lỗi server khi lấy danh sách khiếu nại",
            error: error.message
        });
    }
};

/**
 * Admin: Lấy chi tiết khiếu nại
 */
const getComplaintById = async (req, res) => {
    try {
        const { id } = req.params;

        const complaint = await Complaint.findById(id)
            .populate('userId', 'fullName email displayName avatarUrl role isDeleted isActive')
            .populate('handledBy', 'fullName email displayName')
            .lean();

        if (!complaint) {
            return res.json({
                code: 404,
                message: "Không tìm thấy khiếu nại"
            });
        }

        // Get ban history if user exists
        let banHistory = null;
        if (complaint.userId) {
            banHistory = await BanHistory.findOne({
                userId: complaint.userId._id,
                isActive: true
            })
            .populate('bannedBy', 'fullName email displayName')
            .sort({ bannedAt: -1 })
            .lean();
        }

        return res.json({
            code: 200,
            message: "Lấy chi tiết khiếu nại thành công",
            data: {
                ...complaint,
                banHistory
            }
        });
    } catch (error) {
        console.error("Error getting complaint:", error);
        return res.json({
            code: 500,
            message: "Lỗi server khi lấy chi tiết khiếu nại",
            error: error.message
        });
    }
};

/**
 * Admin: Xử lý khiếu nại (resolve/reject)
 */
const handleComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, adminResponse } = req.body; // action: 'resolve' or 'reject'
        const adminId = req.user._id || req.user.id;

        // Validate input
        if (!action || !['resolve', 'reject'].includes(action)) {
            return res.json({
                code: 400,
                message: "Action phải là 'resolve' hoặc 'reject'"
            });
        }

        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.json({
                code: 404,
                message: "Không tìm thấy khiếu nại"
            });
        }

        // Check if already handled
        if (complaint.status === 'resolved' || complaint.status === 'rejected') {
            return res.json({
                code: 400,
                message: "Khiếu nại này đã được xử lý"
            });
        }

        // Update complaint
        complaint.status = action === 'resolve' ? 'resolved' : 'rejected';
        complaint.handledBy = adminId;
        complaint.handledAt = new Date();
        if (adminResponse) {
            complaint.adminResponse = adminResponse.trim();
        }
        await complaint.save();

        // If resolved and user exists, unban the user
        if (action === 'resolve' && complaint.userId) {
            try {
                const user = await User.findById(complaint.userId);
                if (user && (user.isDeleted || !user.isActive)) {
                    // Unban user
                    user.isDeleted = false;
                    user.isActive = true;
                    await user.save();

                    // Update ban history
                    await BanHistory.updateMany(
                        { userId: user._id, isActive: true },
                        { 
                            isActive: false,
                            unlockedAt: new Date(),
                            unlockedBy: adminId
                        }
                    );

                    // Send email to user
                    try {
                        const emailSubject = `[RetroTrade] Khiếu nại của bạn đã được chấp nhận`;
                        const emailHtml = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 20px;">
                                    <h2 style="color: #10b981; margin: 0; font-size: 20px;">✅ Khiếu nại của bạn đã được chấp nhận</h2>
                                </div>
                                
                                <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                                    <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
                                        Chào <strong>${user.fullName || user.email}</strong>,
                                    </p>
                                    
                                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                                        Khiếu nại của bạn về tài khoản bị khóa đã được xem xét và chấp nhận. Tài khoản của bạn đã được mở khóa.
                                    </p>
                                    
                                    ${adminResponse ? `
                                    <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 16px; margin: 20px 0;">
                                        <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;">
                                            <strong>Phản hồi từ quản trị viên:</strong>
                                        </p>
                                        <p style="color: #374151; font-size: 14px; margin: 0; white-space: pre-wrap;">${adminResponse}</p>
                                    </div>
                                    ` : ''}
                                    
                                    <div style="margin: 24px 0;">
                                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login" 
                                           style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                            Đăng nhập ngay
                                        </a>
                                    </div>
                                    
                                    <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                                        Trân trọng,<br>
                                        <strong>Đội ngũ RetroTrade</strong>
                                    </p>
                                </div>
                            </div>
                        `;
                        await sendEmail(user.email, emailSubject, emailHtml);
                    } catch (emailError) {
                        console.error("Error sending email to user:", emailError);
                    }
                }
            } catch (unbanError) {
                console.error("Error unbanning user:", unbanError);
                // Continue even if unban fails
            }
        } else if (action === 'reject') {
            // Send email to user about rejection
            if (complaint.userId) {
                try {
                    const user = await User.findById(complaint.userId);
                    if (user && user.email) {
                        const emailSubject = `[RetroTrade] Khiếu nại của bạn đã được xem xét`;
                        const emailHtml = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 20px;">
                                    <h2 style="color: #dc2626; margin: 0; font-size: 20px;">⚠️ Khiếu nại của bạn đã được xem xét</h2>
                                </div>
                                
                                <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                                    <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
                                        Chào <strong>${user.fullName || user.email}</strong>,
                                    </p>
                                    
                                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                                        Khiếu nại của bạn về tài khoản bị khóa đã được xem xét. Sau khi xem xét kỹ lưỡng, chúng tôi quyết định giữ nguyên quyết định khóa tài khoản.
                                    </p>
                                    
                                    ${adminResponse ? `
                                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
                                        <p style="color: #92400e; font-size: 14px; margin: 0 0 8px 0;">
                                            <strong>Phản hồi từ quản trị viên:</strong>
                                        </p>
                                        <p style="color: #92400e; font-size: 14px; margin: 0; white-space: pre-wrap;">${adminResponse}</p>
                                    </div>
                                    ` : ''}
                                    
                                    <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                                        Trân trọng,<br>
                                        <strong>Đội ngũ RetroTrade</strong>
                                    </p>
                                </div>
                            </div>
                        `;
                        await sendEmail(user.email, emailSubject, emailHtml);
                    }
                } catch (emailError) {
                    console.error("Error sending email to user:", emailError);
                }
            }
        }

        // Send notification to user if exists
        if (complaint.userId) {
            try {
                const title = action === 'resolve' ? 'Khiếu nại đã được chấp nhận' : 'Khiếu nại đã được xem xét';
                const body = action === 'resolve' 
                    ? 'Khiếu nại của bạn đã được chấp nhận. Tài khoản của bạn đã được mở khóa.'
                    : 'Khiếu nại của bạn đã được xem xét. Vui lòng kiểm tra email để biết thêm chi tiết.';
                const link = action === 'resolve' ? '/auth/login' : '/auth/banned';
                
                await createNotification(
                    complaint.userId,
                    'complaint',
                    title,
                    body,
                    { link }
                );
            } catch (notifError) {
                console.error("Error creating notification:", notifError);
            }
        }

        return res.json({
            code: 200,
            message: action === 'resolve' ? 'Chấp nhận khiếu nại thành công' : 'Từ chối khiếu nại thành công',
            data: complaint
        });
    } catch (error) {
        console.error("Error handling complaint:", error);
        return res.json({
            code: 500,
            message: "Lỗi server khi xử lý khiếu nại",
            error: error.message
        });
    }
};

module.exports = {
    submitComplaint,
    getAllComplaints,
    getComplaintById,
    handleComplaint
};

