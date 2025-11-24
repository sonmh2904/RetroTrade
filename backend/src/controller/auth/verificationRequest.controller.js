const VerificationRequest = require("../../models/VerificationRequest.model");
const User = require("../../models/User.model");
const { uploadToCloudinary } = require('../../middleware/upload.middleware');
const { createNotification } = require("../../middleware/createNotification");

module.exports.createVerificationRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        let idCardInfo = null;
        let reason = null;
        
        if (req.body.idCardInfo) {
            try {
                idCardInfo = typeof req.body.idCardInfo === 'string' 
                    ? JSON.parse(req.body.idCardInfo) 
                    : req.body.idCardInfo;
            } catch (parseError) {
                console.error('Error parsing idCardInfo:', parseError);
            }
        }
        
        reason = req.body.reason || null;
        const files = req.files || [];

        const existingRequest = await VerificationRequest.findOne({
            userId: userId,
            status: { $in: ['Pending', 'In Progress'] }
        });

        if (existingRequest) {
            return res.status(400).json({
                code: 400,
                message: "Bạn đã có yêu cầu xác minh đang chờ xử lý. Vui lòng chờ moderator xử lý."
            });
        }

        let uploadedFiles = [];
        if (files && files.length > 0) {
            if (files.length !== 2) {
                return res.status(400).json({
                    code: 400,
                    message: "Vui lòng upload đủ 2 ảnh: mặt trước căn cước công dân và mặt sau căn cước công dân"
                });
            }
            try {
                uploadedFiles = await uploadToCloudinary(files, "retrotrade/verification-requests/");
            } catch (uploadError) {
                console.error('Error uploading files:', uploadError);
                return res.status(500).json({
                    code: 500,
                    message: "Lỗi khi upload ảnh. Vui lòng thử lại.",
                    error: uploadError.message
                });
            }
        }

        const documentTypes = ['idCardFront', 'idCardBack'];
        const documents = uploadedFiles.map((file, index) => {
            return {
                documentType: documentTypes[index] || 'document',
                fileUrl: file.Url,
                uploadedAt: new Date()
            };
        });

        const hasValidIdCardInfo = idCardInfo && (
            idCardInfo.idNumber || 
            idCardInfo.fullName || 
            idCardInfo.dateOfBirth || 
            idCardInfo.address
        );

        const shouldAutoReject = !hasValidIdCardInfo;

        const verificationRequest = new VerificationRequest({
            userId: userId,
            idCardInfo: idCardInfo ? {
                idNumber: idCardInfo.idNumber || null,
                fullName: idCardInfo.fullName || null,
                dateOfBirth: idCardInfo.dateOfBirth ? new Date(idCardInfo.dateOfBirth) : null,
                address: idCardInfo.address || null
            } : null,
            documents: documents,
            reason: reason || null,
            status: shouldAutoReject ? 'Rejected' : 'Pending',
            rejectionReason: shouldAutoReject 
                ? 'Hệ thống không thể đọc được thông tin từ ảnh căn cước công dân. Vui lòng chụp lại ảnh rõ nét hơn hoặc đảm bảo ảnh không bị mờ, không bị che khuất thông tin.'
                : null,
            handledAt: shouldAutoReject ? new Date() : null
        });

        await verificationRequest.save();
        await verificationRequest.populate('userId', 'fullName email phone');

        if (shouldAutoReject) {
            try {
                await createNotification(
                    userId,
                    "Xác minh CCCD bị từ chối",
                    "Xác minh CCCD bị từ chối",
                    `Yêu cầu xác minh căn cước công dân của bạn đã bị từ chối tự động. Lý do: Hệ thống không thể đọc được thông tin từ ảnh. Vui lòng chụp lại ảnh rõ nét hơn.`,
                    {
                        requestId: verificationRequest._id.toString(),
                        type: 'id_card_verification_rejected',
                        redirectUrl: '/auth/verification-history'
                    }
                );
            } catch (notificationError) {
                console.error("Error creating rejection notification:", notificationError);
            }

            return res.json({
                code: 200,
                message: "Yêu cầu xác minh đã bị từ chối tự động do không thể đọc được thông tin từ ảnh. Vui lòng chụp lại ảnh rõ nét hơn.",
                data: {
                    ...verificationRequest.toObject(),
                    autoRejected: true,
                    rejectionReason: verificationRequest.rejectionReason
                }
            });
        } else {
            try {
                const moderators = await User.find({ role: 'moderator', isDeleted: false });
                for (const moderator of moderators) {
                    await createNotification(
                        moderator._id,
                        "Yêu cầu xác minh CCCD mới",
                        "Yêu cầu xác minh CCCD mới",
                        `Có yêu cầu xác minh căn cước công dân mới từ ${req.user.fullName || req.user.email}. Vui lòng xử lý.`,
                        {
                            requestId: verificationRequest._id.toString(),
                            userId: userId.toString(),
                            type: 'id_card_verification_request'
                        }
                    );
                }
            } catch (notificationError) {
                console.error("Error creating notifications:", notificationError);
            }

            try {
                await createNotification(
                    userId,
                    "Đã gửi yêu cầu xác minh CCCD",
                    "Yêu cầu xác minh CCCD đã được gửi",
                    `Yêu cầu xác minh căn cước công dân của bạn đã được gửi thành công. Moderator sẽ xử lý trong thời gian sớm nhất.`,
                    {
                        requestId: verificationRequest._id.toString(),
                        type: 'id_card_verification_submitted',
                        redirectUrl: '/auth/verification-history'
                    }
                );
            } catch (notificationError) {
                console.error("Error creating user notification:", notificationError);
            }

            return res.json({
                code: 200,
                message: "Yêu cầu xác minh đã được gửi thành công. Moderator sẽ xử lý trong thời gian sớm nhất.",
                data: verificationRequest
            });
        }
    } catch (error) {
        console.error('Error creating verification request:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi server khi tạo yêu cầu xác minh.",
            error: error.message
        });
    }
};

module.exports.getMyVerificationRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;

        const query = { userId: userId };
        if (status) {
            query.status = status;
        }

        const requests = await VerificationRequest.find(query)
            .populate('assignedTo', 'fullName email')
            .populate('handledBy', 'fullName email')
            .sort({ createdAt: -1 });

        return res.json({
            code: 200,
            message: "Lấy danh sách yêu cầu xác minh thành công",
            data: requests
        });
    } catch (error) {
        console.error('Error getting verification requests:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi server khi lấy danh sách yêu cầu xác minh.",
            error: error.message
        });
    }
};

module.exports.getMyVerificationRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const request = await VerificationRequest.findById(id)
            .populate('assignedTo', 'fullName email')
            .populate('handledBy', 'fullName email');

        if (!request) {
            return res.status(404).json({
                code: 404,
                message: "Không tìm thấy yêu cầu xác minh"
            });
        }

        if (request.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                code: 403,
                message: "Bạn không có quyền xem yêu cầu này"
            });
        }

        return res.json({
            code: 200,
            message: "Lấy thông tin yêu cầu xác minh thành công",
            data: request
        });
    } catch (error) {
        console.error('Error getting verification request:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi server khi lấy thông tin yêu cầu xác minh.",
            error: error.message
        });
    }
};

module.exports.getAllVerificationRequests = async (req, res) => {
    try {
        const { status, assignedTo } = req.query;

        const query = {};
        if (status) {
            query.status = status;
        }
        if (assignedTo) {
            query.assignedTo = assignedTo;
        }

        const requests = await VerificationRequest.find(query)
            .populate('userId', 'fullName email phone avatarUrl')
            .populate('assignedTo', 'fullName email')
            .populate('handledBy', 'fullName email')
            .sort({ createdAt: -1 });

        return res.json({
            code: 200,
            message: "Lấy danh sách yêu cầu xác minh thành công",
            data: requests,
            total: requests.length
        });
    } catch (error) {
        console.error('Error getting all verification requests:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi server khi lấy danh sách yêu cầu xác minh.",
            error: error.message
        });
    }
};

module.exports.getVerificationRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const request = await VerificationRequest.findById(id)
            .populate('userId', 'fullName email phone avatarUrl isIdVerified')
            .populate('assignedTo', 'fullName email')
            .populate('handledBy', 'fullName email');

        if (!request) {
            return res.status(404).json({
                code: 404,
                message: "Không tìm thấy yêu cầu xác minh"
            });
        }

        return res.json({
            code: 200,
            message: "Lấy thông tin yêu cầu xác minh thành công",
            data: request
        });
    } catch (error) {
        console.error('Error getting verification request:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi server khi lấy thông tin yêu cầu xác minh.",
            error: error.message
        });
    }
};

module.exports.assignVerificationRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const moderatorId = req.user._id;

        const request = await VerificationRequest.findById(id);
        if (!request) {
            return res.status(404).json({
                code: 404,
                message: "Không tìm thấy yêu cầu xác minh"
            });
        }

        if (request.status !== 'Pending') {
            return res.status(400).json({
                code: 400,
                message: "Yêu cầu này đã được xử lý hoặc đang được xử lý bởi moderator khác"
            });
        }

        request.status = 'In Progress';
        request.assignedTo = moderatorId;
        request.assignedAt = new Date();
        await request.save();

        try {
            await createNotification(
                request.userId._id || request.userId,
                "Yêu cầu xác minh CCCD đang được xử lý",
                "Yêu cầu xác minh CCCD đang được xử lý",
                `Yêu cầu xác minh căn cước công dân của bạn đang được moderator xử lý. Chúng tôi sẽ thông báo kết quả sớm nhất.`,
                {
                    requestId: request._id.toString(),
                    type: 'id_card_verification_assigned',
                    redirectUrl: '/auth/verification-history'
                }
            );
        } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
        }

        return res.json({
            code: 200,
            message: "Đã nhận yêu cầu xác minh",
            data: request
        });
    } catch (error) {
        console.error('Error assigning verification request:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi server khi nhận yêu cầu xác minh.",
            error: error.message
        });
    }
};

module.exports.handleVerificationRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, moderatorNotes, rejectionReason, idCardInfo } = req.body;
        const moderatorId = req.user._id;

        if (!['approved', 'rejected'].includes(action)) {
            return res.status(400).json({
                code: 400,
                message: "Action phải là 'approved' hoặc 'rejected'"
            });
        }

        if (action === 'approved') {
            if (!idCardInfo) {
                return res.status(400).json({
                    code: 400,
                    message: "Vui lòng nhập thông tin căn cước công dân"
                });
            }
            if (!idCardInfo.idNumber || !/^\d{12}$/.test(idCardInfo.idNumber)) {
                return res.status(400).json({
                    code: 400,
                    message: "Số căn cước công dân phải có 12 chữ số"
                });
            }
            if (!idCardInfo.fullName || !idCardInfo.fullName.trim()) {
                return res.status(400).json({
                    code: 400,
                    message: "Vui lòng nhập họ và tên"
                });
            }
            if (!idCardInfo.dateOfBirth) {
                return res.status(400).json({
                    code: 400,
                    message: "Vui lòng nhập ngày tháng năm sinh"
                });
            }
            if (!idCardInfo.address || !idCardInfo.address.trim()) {
                return res.status(400).json({
                    code: 400,
                    message: "Vui lòng nhập địa chỉ thường trú"
                });
            }
        }

        const request = await VerificationRequest.findById(id)
            .populate('userId');
        
        if (!request) {
            return res.status(404).json({
                code: 404,
                message: "Không tìm thấy yêu cầu xác minh"
            });
        }

        if (request.status === 'Approved' || request.status === 'Rejected') {
            return res.status(400).json({
                code: 400,
                message: "Yêu cầu này đã được xử lý"
            });
        }

        if (request.assignedTo && request.assignedTo.toString() !== moderatorId.toString()) {
            return res.status(403).json({
                code: 403,
                message: "Bạn không có quyền xử lý yêu cầu này. Yêu cầu đang được xử lý bởi moderator khác."
            });
        }

        const newStatus = action === 'approved' ? 'Approved' : 'Rejected';
        request.status = newStatus;
        request.handledBy = moderatorId;
        request.handledAt = new Date();
        request.moderatorNotes = moderatorNotes || null;
        request.rejectionReason = action === 'rejected' ? (rejectionReason || null) : null;

        if (action === 'approved' && idCardInfo) {
            request.idCardInfo = {
                idNumber: idCardInfo.idNumber.trim(),
                fullName: idCardInfo.fullName.trim(),
                dateOfBirth: new Date(idCardInfo.dateOfBirth),
                address: idCardInfo.address.trim()
            };
        }

        await request.save();

        if (action === 'approved') {
            const user = await User.findById(request.userId._id || request.userId);
            if (user) {
                user.isIdVerified = true;
                if (idCardInfo) {
                    user.idCardInfo = {
                        idNumber: idCardInfo.idNumber.trim(),
                        fullName: idCardInfo.fullName.trim(),
                        dateOfBirth: new Date(idCardInfo.dateOfBirth),
                        address: idCardInfo.address.trim(),
                        extractedAt: new Date(),
                        extractionMethod: 'manual'
                    };
                }
                if (request.documents && request.documents.length > 0) {
                    const documents = request.documents.map((doc, index) => {
                        return {
                            documentType: doc.documentType || 'document',
                            documentNumber: `DOC-${Date.now()}-${index}`,
                            fileUrl: doc.fileUrl,
                            status: 'approved',
                            submittedAt: doc.uploadedAt || new Date()
                        };
                    });
                    user.documents = user.documents || [];
                    user.documents.push(...documents);
                }
                await user.save();
            }
        }

        await request.save();

        try {
            const message = action === 'approved' 
                ? `Yêu cầu xác minh căn cước công dân của bạn đã được duyệt. Tài khoản của bạn đã được xác minh thành công.`
                : `Yêu cầu xác minh căn cước công dân của bạn đã bị từ chối. Lý do: ${rejectionReason || 'Không được cung cấp'}`;
            
            await createNotification(
                request.userId._id,
                action === 'approved' ? "Xác minh CCCD đã được duyệt" : "Xác minh CCCD bị từ chối",
                action === 'approved' ? "Xác minh CCCD đã được duyệt" : "Xác minh CCCD bị từ chối",
                message,
                {
                    requestId: request._id.toString(),
                    type: action === 'approved' ? 'id_card_verification_approved' : 'id_card_verification_rejected',
                    action: action,
                    redirectUrl: '/auth/verification-history'
                }
            );
        } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
        }

        return res.json({
            code: 200,
            message: action === 'approved' 
                ? "Yêu cầu xác minh đã được duyệt thành công" 
                : "Yêu cầu xác minh đã bị từ chối",
            data: request
        });
    } catch (error) {
        console.error('Error handling verification request:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi server khi xử lý yêu cầu xác minh.",
            error: error.message
        });
    }
};
