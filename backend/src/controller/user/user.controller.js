const mongoose = require("mongoose");
const User = require("../../models/User.model");
const BanHistory = require("../../models/BanHistory.model");
const AuditLog = require("../../models/AuditLog.model");
const Complaint = require("../../models/Complaint.model");
const Report = require("../../models/Report.model");
const OrderReport = require("../../models/Order/Reports.model");
const { sendEmail } = require("../../utils/sendEmail");

module.exports.getAllUsers = async (req, res) => {
    try {
        const { skip = 0, limit = 10, page = 1 } = req.pagination || {};
        const { 
            onlyBanned = false, 
            search = '', 
            role = '', 
            status = '' 
        } = req.query || {};

        // Build filter object
        const filter = {};

        // Filter by isDeleted
        // Default: show all users (both banned and active)
        // If onlyBanned = true: show only banned users (isDeleted = true)
        if (onlyBanned === 'true' || onlyBanned === true) {
            filter.isDeleted = true;
        }
        // Otherwise, show all users (no filter on isDeleted)

        // Filter by role
        if (role && role !== 'all' && ['renter', 'owner', 'admin', 'moderator'].includes(role)) {
            filter.role = role;
        }

        // Filter by status (verification status)
        if (status && status !== 'all') {
            switch (status) {
                case 'verified':
                    filter.isEmailConfirmed = true;
                    filter.isPhoneConfirmed = true;
                    filter.isIdVerified = true;
                    break;
                case 'pending':
                    filter.isEmailConfirmed = true;
                    filter.$or = [
                        { isPhoneConfirmed: { $ne: true } },
                        { isIdVerified: { $ne: true } }
                    ];
                    break;
                case 'unverified':
                    filter.isEmailConfirmed = false;
                    break;
            }
        }

        // Search filter - using regex for case-insensitive search
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const searchConditions = { $or: [
                { email: searchRegex },
                { fullName: searchRegex },
                { displayName: searchRegex }
            ]};
            
            // If there's already an $or in filter (from status 'pending' filter), use $and to combine
            if (filter.$or && Array.isArray(filter.$or)) {
                // Status filter already has $or, combine with search using $and
                const statusOr = filter.$or;
                delete filter.$or;
                filter.$and = [
                    { $or: statusOr },
                    searchConditions
                ];
            } else {
                // No existing $or, just add search conditions
                Object.assign(filter, searchConditions);
            }
        }

        // Build query with indexes in mind
        const query = User.find(filter)
            .select('userGuid email fullName displayName avatarUrl role isEmailConfirmed isPhoneConfirmed isIdVerified reputationScore points isDeleted isActive createdAt');

        // Sort by createdAt descending (uses index)
        query.sort({ createdAt: -1 });

        // Apply pagination
        query.skip(skip).limit(limit);

        const [users, totalItems] = await Promise.all([
            query.lean(), // Use lean() for better performance
            User.countDocuments(filter)
        ]);

        return res.json({
            code: 200,
            message: "Lấy danh sách người dùng thành công",
            data: {
                items: users,
                ...(res.paginationMeta ? res.paginationMeta(totalItems) : { page, limit, totalItems, totalPages: Math.max(Math.ceil(totalItems / (limit || 1)), 1) })
            }
        });
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        return res.json({ code: 500, message: "Lấy danh sách người dùng thất bại", error: error.message });
    }
};

/**
 * Moderator: Lấy danh sách user cần xử lý (có report, complaint, dispute, hoặc đã bị ban)
 */
module.exports.getUsersForModeration = async (req, res) => {
    try {
        const { skip = 0, limit = 10, page = 1 } = req.pagination || {};
        const { 
            search = '', 
            role = '', 
            status = '',
            issueType = '' // Filter theo loại vấn đề: 'complaint', 'report', 'dispute', 'banned', hoặc 'all'
        } = req.query || {};

        // Lấy danh sách user IDs có vấn đề theo từng loại
        const userIdsWithComplaints = new Set();
        const userIdsWithReports = new Set();
        const userIdsWithDisputes = new Set();
        const userIdsBanned = new Set();

        // 1. Users có complaint
        const complaints = await Complaint.find({ 
            status: { $in: ['pending', 'reviewing'] },
            userId: { $exists: true, $ne: null }
        }).select('userId').lean();
        complaints.forEach(c => {
            if (c.userId) userIdsWithComplaints.add(c.userId.toString());
        });

        // 2. Users bị report (Report model)
        const reports = await Report.find({ 
            status: { $in: ['pending', 'in_review'] },
            reportedUserId: { $exists: true, $ne: null }
        }).select('reportedUserId').lean();
        reports.forEach(r => {
            if (r.reportedUserId) userIdsWithReports.add(r.reportedUserId.toString());
        });

        // 3. Users có dispute (Order Report model)
        const disputes = await OrderReport.find({ 
            type: 'dispute',
            status: { $in: ['Pending', 'In Progress', 'Reviewed'] },
            reportedUserId: { $exists: true, $ne: null }
        }).select('reportedUserId').lean();
        disputes.forEach(d => {
            if (d.reportedUserId) userIdsWithDisputes.add(d.reportedUserId.toString());
        });

        // 4. Users đã bị ban (có ban history)
        const bannedUsers = await BanHistory.find({ 
            isActive: true 
        }).select('userId').lean();
        bannedUsers.forEach(b => {
            if (b.userId) userIdsBanned.add(b.userId.toString());
        });

        // Filter theo issueType
        let userIdsWithIssues = new Set();
        if (issueType === 'complaint') {
            userIdsWithIssues = userIdsWithComplaints;
        } else if (issueType === 'report') {
            userIdsWithIssues = userIdsWithReports;
        } else if (issueType === 'dispute') {
            userIdsWithIssues = userIdsWithDisputes;
        } else if (issueType === 'banned') {
            userIdsWithIssues = userIdsBanned;
        } else {
            // 'all' hoặc không có filter: lấy tất cả
            userIdsWithComplaints.forEach(id => userIdsWithIssues.add(id));
            userIdsWithReports.forEach(id => userIdsWithIssues.add(id));
            userIdsWithDisputes.forEach(id => userIdsWithIssues.add(id));
            userIdsBanned.forEach(id => userIdsWithIssues.add(id));
        }

        // Nếu không có user nào có vấn đề, trả về danh sách rỗng
        if (userIdsWithIssues.size === 0) {
            return res.json({
                code: 200,
                message: "Lấy danh sách người dùng cần xử lý thành công",
                data: {
                    items: [],
                    page: page,
                    limit: limit,
                    totalItems: 0,
                    totalPages: 0
                }
            });
        }

        // Build filter object
        const filter = {
            _id: { $in: Array.from(userIdsWithIssues).map(id => new mongoose.Types.ObjectId(id)) }
        };

        // Filter by role
        if (role && role !== 'all' && ['renter', 'owner', 'admin', 'moderator'].includes(role)) {
            filter.role = role;
        }

        // Filter by status (verification status)
        if (status && status !== 'all') {
            switch (status) {
                case 'verified':
                    filter.isEmailConfirmed = true;
                    filter.isPhoneConfirmed = true;
                    filter.isIdVerified = true;
                    break;
                case 'pending':
                    filter.isEmailConfirmed = true;
                    filter.$or = [
                        { isPhoneConfirmed: { $ne: true } },
                        { isIdVerified: { $ne: true } }
                    ];
                    break;
                case 'unverified':
                    filter.isEmailConfirmed = false;
                    break;
            }
        }

        // Search filter
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const searchConditions = { $or: [
                { email: searchRegex },
                { fullName: searchRegex },
                { displayName: searchRegex }
            ]};
            
            if (filter.$or && Array.isArray(filter.$or)) {
                const statusOr = filter.$or;
                delete filter.$or;
                filter.$and = [
                    { $or: statusOr },
                    searchConditions
                ];
            } else {
                Object.assign(filter, searchConditions);
            }
        }

        // Build query
        const query = User.find(filter)
            .select('userGuid email fullName displayName avatarUrl role isEmailConfirmed isPhoneConfirmed isIdVerified reputationScore points isDeleted isActive createdAt');

        query.sort({ createdAt: -1 });
        query.skip(skip).limit(limit);

        const [users, totalItems] = await Promise.all([
            query.lean(),
            User.countDocuments(filter)
        ]);

        // Map users với thông tin vấn đề của họ
        const usersWithIssues = users.map(user => {
            const userId = user._id.toString();
            const issues = [];
            
            if (userIdsWithComplaints.has(userId)) {
                issues.push('complaint');
            }
            if (userIdsWithReports.has(userId)) {
                issues.push('report');
            }
            if (userIdsWithDisputes.has(userId)) {
                issues.push('dispute');
            }
            if (userIdsBanned.has(userId)) {
                issues.push('banned');
            }
            
            return {
                ...user,
                issues: issues // Array các loại vấn đề
            };
        });

        return res.json({
            code: 200,
            message: "Lấy danh sách người dùng cần xử lý thành công",
            data: {
                items: usersWithIssues,
                ...(res.paginationMeta ? res.paginationMeta(totalItems) : { page, limit, totalItems, totalPages: Math.max(Math.ceil(totalItems / (limit || 1)), 1) })
            }
        });
    } catch (error) {
        console.error("Error in getUsersForModeration:", error);
        return res.json({ code: 500, message: "Lấy danh sách người dùng cần xử lý thất bại", error: error.message });
    }
};

module.exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('userGuid email fullName displayName avatarUrl bio role isEmailConfirmed isPhoneConfirmed isIdVerified reputationScore points createdAt updatedAt');
        if (!user) return res.json({ code: 404, message: "Không tìm thấy người dùng" });
        return res.json({ code: 200, message: "Lấy thông tin người dùng thành công", data: user });
    } catch (error) {
        return res.json({ code: 500, message: "Lấy thông tin người dùng thất bại", error: error.message });
    }
};

module.exports.getProfile = async (req, res) => {
    try {
        const email = req.user.email;

        const user = await User.findOne({
            email: email
        }).select("userGuid email fullName displayName avatarUrl bio phone isEmailConfirmed isPhoneConfirmed isIdVerified reputationScore points role lastLoginAt createdAt updatedAt").lean();

        if (!user) {
            return res.json({
                code: 404,
                message: "User not found"
            });
        }

        res.json({
            code: 200,
            message: "Get Profile Successfully",
            user
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports.createUser = async (req, res) => {
    try {
        const user = await User.create(req.body);
        return res.json({ code: 201, message: "User created", data: user });
    } catch (error) {
        return res.status(400).json({ message: "Failed to create user", error: error.message });
    }
};

module.exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!user) return res.json({ code: 404, message: "User not found" });
        return res.json({ code: 200, message: "User updated", data: user });
    } catch (error) {
        return res.json({ code: 400, message: "Failed to update user", error: error.message });
    }
};


module.exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.json({ code: 404, message: "Không tìm thấy người dùng" });
        return res.json({ code: 200, message: "Xóa người dùng thành công", data: user });
    } catch (error) {
        return res.json({ code: 400, message: "Xóa người dùng thất bại", error: error.message });
    }
};

module.exports.updateUserRole = async (req, res) => {
    try {
        const { id, role } = req.body;
        
        // Validate input
        if (!id || !role) {
            return res.json({
                code: 400,
                message: "Thiếu thông tin id hoặc role"
            });
        }

        // Validate role
        const validRoles = ['renter', 'owner', 'moderator', 'admin'];
        if (!validRoles.includes(role)) {
            return res.json({
                code: 400,
                message: "Role không hợp lệ"
            });
        }

        // Prevent moderator from promoting to admin
        if (req.user.role === 'moderator' && role === 'admin') {
            return res.json({
                code: 403,
                message: "Moderator không có quyền nâng cấp thành admin"
            });
        }

        const user = await User.findByIdAndUpdate(id, { role }, { new: true });
        if (!user) {
            return res.json({
                code: 404,
                message: "Không tìm thấy người dùng"
            });
        }
        return res.json({ code: 200, message: "Cập nhật vai trò người dùng thành công", data: user });
    } catch (error) {
        return res.json({ code: 500, message: "Cập nhật vai trò người dùng thất bại", error: error.message });
    }
};

/**
 * Ban user (soft delete) - admin và moderator có quyền
 * Yêu cầu: lý do ban (reason)
 */
module.exports.banUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user._id || req.user.id;
        const currentUserRole = req.user.role;

        // Validate input
        if (!id) {
            return res.json({
                code: 400,
                message: "Thiếu thông tin user id"
            });
        }

        if (!reason || reason.trim().length === 0) {
            return res.json({
                code: 400,
                message: "Vui lòng nhập lý do khóa tài khoản"
            });
        }

        // Không cho phép ban chính mình
        if (id === adminId.toString()) {
            return res.json({
                code: 400,
                message: "Không thể khóa chính tài khoản của bạn"
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.json({
                code: 404,
                message: "Không tìm thấy người dùng"
            });
        }

        // Không cho phép ban admin
        if (user.role === 'admin') {
            return res.json({
                code: 403,
                message: "Không thể khóa tài khoản admin"
            });
        }

        // Moderator không thể ban moderator khác (cùng cấp bậc)
        if (currentUserRole === 'moderator' && user.role === 'moderator') {
            return res.json({
                code: 403,
                message: "Bạn không thể khóa tài khoản cùng cấp bậc"
            });
        }

        // Moderator chỉ có thể ban user khi có lý do hợp lệ (có report, complaint, hoặc dispute)
        if (currentUserRole === 'moderator') {
            let hasValidReason = false;
            let validationDetails = [];

            // Kiểm tra user có complaint không
            const complaint = await Complaint.findOne({ 
                userId: id, 
                status: { $in: ['pending', 'reviewing'] } 
            });
            if (complaint) {
                hasValidReason = true;
                validationDetails.push(`Có khiếu nại (ID: ${complaint._id})`);
            }

            // Kiểm tra user có bị report không
            const report = await Report.findOne({ 
                reportedUserId: id, 
                status: { $in: ['pending', 'in_review'] } 
            });
            if (report) {
                hasValidReason = true;
                validationDetails.push(`Bị báo cáo (ID: ${report._id})`);
            }

            // Kiểm tra user có dispute không
            const dispute = await OrderReport.findOne({ 
                reportedUserId: id, 
                type: 'dispute',
                status: { $in: ['Pending', 'In Progress', 'Reviewed'] } 
            });
            if (dispute) {
                hasValidReason = true;
                validationDetails.push(`Có tranh chấp (ID: ${dispute._id})`);
            }

            if (!hasValidReason) {
                return res.json({
                    code: 403,
                    message: "Bạn chỉ có thể khóa tài khoản khi người dùng có khiếu nại, bị báo cáo hoặc có tranh chấp. Vui lòng kiểm tra lại thông tin người dùng."
                });
            }
        }

        // Check if user is already banned
        if (user.isDeleted || !user.isActive) {
            return res.json({
                code: 400,
                message: "Tài khoản này đã bị khóa trước đó"
            });
        }

        // Soft delete: set isDeleted = true, isActive = false
        user.isDeleted = true;
        user.isActive = false;
        await user.save();

        // Get admin info for email
        const admin = await User.findById(adminId);

        // Save ban history
        const banHistory = await BanHistory.create({
            userId: user._id,
            bannedBy: adminId,
            reason: reason.trim(),
            email: user.email || user.phone || user.userGuid || `user_${user._id}`,
            fullName: user.fullName || user.displayName || '',
            isActive: true
        });

        // Audit log
        try {
            await AuditLog.create({
                TableName: "User",
                PrimaryKeyValue: user._id.toString(),
                Operation: "UPDATE",
                ChangedByUserId: adminId,
                ChangedAt: new Date(),
                ChangeSummary: `Khóa tài khoản người dùng: ${user.fullName || user.email || user.phone || user._id}. Lý do: ${reason.trim()}`,
            });
        } catch (auditError) {
            console.error("Error creating audit log:", auditError);
            // Continue even if audit log fails - ban is still successful
        }

        // Send email to banned user
        try {
            const emailSubject = `[RetroTrade] Tài khoản của bạn đã bị khóa`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 20px;">
                        <h2 style="color: #dc2626; margin: 0; font-size: 20px;">⚠️ Tài khoản của bạn đã bị khóa</h2>
                    </div>
                    
                    <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                        <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
                            Chào <strong>${user.fullName || user.email}</strong>,
                        </p>
                        
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                            Tài khoản của bạn đã bị khóa bởi quản trị viên của hệ thống RetroTrade.
                        </p>
                        
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
                            <p style="color: #92400e; font-size: 14px; margin: 0 0 8px 0;">
                                <strong>Lý do khóa tài khoản:</strong>
                            </p>
                            <p style="color: #92400e; font-size: 14px; margin: 0; white-space: pre-wrap;">${reason.trim()}</p>
                        </div>
                        
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 16px 0;">
                            Bạn có thể gửi khiếu nại nếu bạn cho rằng đây là một sai sót.
                        </p>
                        
                        <div style="margin: 24px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/banned" 
                               style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                Gửi khiếu nại
                            </a>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                            Trân trọng,<br>
                            <strong>Đội ngũ RetroTrade</strong>
                        </p>
                    </div>
                    
                    <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                        <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                    </div>
                </div>
            `;

            await sendEmail(user.email, emailSubject, emailHtml);
        } catch (emailError) {
            console.error("Error sending ban email to user:", emailError);
            // Continue even if email fails - ban is still successful
        }

        // Send email to system about banned user
        try {
            const systemEmail = process.env.EMAIL_USER || process.env.SYSTEM_EMAIL;
            if (systemEmail) {
                const systemEmailSubject = `[RetroTrade] Thông báo khóa tài khoản người dùng`;
                const systemEmailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 20px;">
                            <h2 style="color: #dc2626; margin: 0; font-size: 20px;">⚠️ Thông báo khóa tài khoản</h2>
                        </div>
                        
                        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                            <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
                                Hệ thống RetroTrade thông báo:
                            </p>
                            
                            <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 16px; margin: 20px 0;">
                                <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;">
                                    <strong>Thông tin người dùng bị khóa:</strong>
                                </p>
                                <p style="color: #374151; font-size: 14px; margin: 4px 0;">
                                    <strong>Họ tên:</strong> ${user.fullName || user.displayName || 'N/A'}
                                </p>
                                <p style="color: #374151; font-size: 14px; margin: 4px 0;">
                                    <strong>Email:</strong> ${user.email || 'N/A'}
                                </p>
                                <p style="color: #374151; font-size: 14px; margin: 4px 0;">
                                    <strong>Số điện thoại:</strong> ${user.phone || 'N/A'}
                                </p>
                                <p style="color: #374151; font-size: 14px; margin: 4px 0;">
                                    <strong>User ID:</strong> ${user._id}
                                </p>
                                <p style="color: #374151; font-size: 14px; margin: 4px 0;">
                                    <strong>User GUID:</strong> ${user.userGuid || 'N/A'}
                                </p>
                            </div>
                            
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
                                <p style="color: #92400e; font-size: 14px; margin: 0 0 8px 0;">
                                    <strong>Lý do khóa tài khoản:</strong>
                                </p>
                                <p style="color: #92400e; font-size: 14px; margin: 0; white-space: pre-wrap;">${reason.trim()}</p>
                            </div>
                            
                            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
                                <p style="color: #1e40af; font-size: 14px; margin: 0 0 8px 0;">
                                    <strong>Thông tin quản trị viên:</strong>
                                </p>
                                <p style="color: #1e40af; font-size: 14px; margin: 4px 0;">
                                    <strong>Người thực hiện:</strong> ${admin.fullName || admin.email || admin._id}
                                </p>
                                <p style="color: #1e40af; font-size: 14px; margin: 4px 0;">
                                    <strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}
                                </p>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                                Trân trọng,<br>
                                <strong>Hệ thống RetroTrade</strong>
                            </p>
                        </div>
                        
                        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                            <p>Email này được gửi tự động từ hệ thống.</p>
                        </div>
                    </div>
                `;
                await sendEmail(systemEmail, systemEmailSubject, systemEmailHtml);
            }
        } catch (systemEmailError) {
            console.error("Error sending ban notification email to system:", systemEmailError);
            // Continue even if system email fails - ban is still successful
        }

        return res.json({ 
            code: 200, 
            message: "Khóa tài khoản thành công", 
            data: {
                user: user,
                banHistory: banHistory
            }
        });
    } catch (error) {
        console.error("Error banning user:", error);
        return res.json({ 
            code: 500, 
            message: "Khóa tài khoản thất bại", 
            error: error.message 
        });
    }
};

/**
 * Unban user - khôi phục tài khoản đã bị khóa
 */
module.exports.unbanUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id || req.user.id;

        // Validate input
        if (!id) {
            return res.json({
                code: 400,
                message: "Thiếu thông tin user id"
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.json({
                code: 404,
                message: "Không tìm thấy người dùng"
            });
        }

        // Check if user is not banned - user must be banned (isDeleted = true OR isActive = false)
        if (!user.isDeleted && user.isActive) {
            return res.json({
                code: 400,
                message: "Tài khoản này chưa bị khóa"
            });
        }

        // Unban: set isDeleted = false, isActive = true
        user.isDeleted = false;
        user.isActive = true;
        await user.save();

        // Update ban history - mark as inactive (only if there are active ban records)
        try {
            const updateResult = await BanHistory.updateMany(
                { userId: user._id, isActive: true },
                { 
                    isActive: false,
                    unlockedAt: new Date(),
                    unlockedBy: adminId
                }
            );
            console.log(`Updated ${updateResult.modifiedCount} ban history records for user ${user._id}`);
        } catch (banHistoryError) {
            console.error("Error updating ban history:", banHistoryError);
            // Continue even if ban history update fails - unban is still successful
        }

        // Audit log
        try {
            await AuditLog.create({
                TableName: "User",
                PrimaryKeyValue: user._id.toString(),
                Operation: "UPDATE",
                ChangedByUserId: adminId,
                ChangedAt: new Date(),
                ChangeSummary: `Mở khóa tài khoản người dùng: ${user.fullName || user.email || user.phone || user._id}`,
            });
        } catch (auditError) {
            console.error("Error creating audit log:", auditError);
            // Continue even if audit log fails - unban is still successful
        }

        // Send email to user about unban
        try {
            const emailSubject = `[RetroTrade] Tài khoản của bạn đã được mở khóa`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 20px;">
                        <h2 style="color: #10b981; margin: 0; font-size: 20px;">✅ Tài khoản của bạn đã được mở khóa</h2>
                    </div>
                    
                    <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                        <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
                            Chào <strong>${user.fullName || user.email}</strong>,
                        </p>
                        
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                            Tài khoản của bạn đã được mở khóa và bạn có thể đăng nhập vào hệ thống RetroTrade.
                        </p>
                        
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
                    
                    <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                        <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                    </div>
                </div>
            `;

            await sendEmail(user.email, emailSubject, emailHtml);
        } catch (emailError) {
            console.error("Error sending unban email to user:", emailError);
            // Continue even if email fails - unban is still successful
        }

        return res.json({ 
            code: 200, 
            message: "Mở khóa tài khoản thành công", 
            data: user 
        });
    } catch (error) {
        console.error("Error unbanning user:", error);
        return res.json({ 
            code: 500, 
            message: "Mở khóa tài khoản thất bại", 
            error: error.message 
        });
    }
};

// COMPLETED FUNCTIONS:
// 1. getAllUsers - Get all users with pagination (support filter by isDeleted)
// 2. getUserById - Get user by ID
// 3. getProfile - Get current user profile
// 4. createUser - Create new user
// 5. updateUser - Update user
// 6. deleteUser - Delete user (hard delete)
// 7. updateUserRole - Update user role with validation
// 8. banUser - Ban user (soft delete) - admin only
// 9. unbanUser - Unban user (restore) - admin only

