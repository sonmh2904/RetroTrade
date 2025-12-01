const VerificationRequest = require("../../models/VerificationRequest.model");
const User = require("../../models/User.model");
const { uploadToCloudinary } = require('../../middleware/upload.middleware');
const { createNotification } = require("../../middleware/createNotification");
const { encryptObject, decryptObject } = require("../../utils/cryptoHelper");

// Helper function để giải mã idCardInfo từ request
const decryptIdCardInfo = (request) => {
    if (!request) return null;
    
    // Nếu có dữ liệu mã hóa, giải mã
    if (request.idCardInfoEncrypted && request.idCardInfoEncrypted.encryptedData && request.idCardInfoEncrypted.iv) {
        try {
            const encryptedHex = request.idCardInfoEncrypted.encryptedData.toString("hex");
            const decrypted = decryptObject(encryptedHex, request.idCardInfoEncrypted.iv);
            // Chuyển đổi dateOfBirth từ string về Date nếu cần
            if (decrypted.dateOfBirth) {
                decrypted.dateOfBirth = new Date(decrypted.dateOfBirth);
            }
            return decrypted;
        } catch (decryptError) {
            console.error('Error decrypting idCardInfo:', decryptError);
            return null;
        }
    }
    
    // Fallback: nếu có dữ liệu cũ chưa mã hóa (tương thích ngược)
    if (request.idCardInfo) {
        return request.idCardInfo;
    }
    
    return null;
};

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
            idCardInfo.dateOfBirth
        );

        const shouldAutoReject = !hasValidIdCardInfo;

        // Mã hóa idCardInfo nếu có
        let idCardInfoEncrypted = null;
        if (idCardInfo && hasValidIdCardInfo) {
            try {
                const idCardData = {
                    idNumber: idCardInfo.idNumber || null,
                    fullName: idCardInfo.fullName || null,
                    dateOfBirth: idCardInfo.dateOfBirth ? new Date(idCardInfo.dateOfBirth).toISOString() : null
                };
                const { iv, encryptedData } = encryptObject(idCardData);
                idCardInfoEncrypted = {
                    encryptedData: Buffer.from(encryptedData, "hex"),
                    iv: iv
                };
            } catch (encryptError) {
                console.error('Error encrypting idCardInfo:', encryptError);
                return res.status(500).json({
                    code: 500,
                    message: "Lỗi khi mã hóa thông tin căn cước công dân",
                    error: encryptError.message
                });
            }
        }

        const verificationRequest = new VerificationRequest({
            userId: userId,
            idCardInfo: null, // Không lưu dữ liệu gốc
            idCardInfoEncrypted: idCardInfoEncrypted,
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

            // Giải mã idCardInfo để trả về
            const decryptedIdCardInfo = decryptIdCardInfo(verificationRequest);
            const requestData = verificationRequest.toObject();
            requestData.idCardInfo = decryptedIdCardInfo;

            return res.json({
                code: 200,
                message: "Yêu cầu xác minh đã bị từ chối tự động do không thể đọc được thông tin từ ảnh. Vui lòng chụp lại ảnh rõ nét hơn.",
                data: {
                    ...requestData,
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

            // Giải mã idCardInfo để trả về
            const decryptedIdCardInfo = decryptIdCardInfo(verificationRequest);
            const requestData = verificationRequest.toObject();
            requestData.idCardInfo = decryptedIdCardInfo;

            return res.json({
                code: 200,
                message: "Yêu cầu xác minh đã được gửi thành công. Moderator sẽ xử lý trong thời gian sớm nhất.",
                data: requestData
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

        // Giải mã idCardInfo cho mỗi request
        const requestsWithDecrypted = requests.map(request => {
            const requestData = request.toObject();
            requestData.idCardInfo = decryptIdCardInfo(request);
            return requestData;
        });

        return res.json({
            code: 200,
            message: "Lấy danh sách yêu cầu xác minh thành công",
            data: requestsWithDecrypted
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

        // Giải mã idCardInfo để trả về
        const decryptedIdCardInfo = decryptIdCardInfo(request);
        const requestData = request.toObject();
        requestData.idCardInfo = decryptedIdCardInfo;

        return res.json({
            code: 200,
            message: "Lấy thông tin yêu cầu xác minh thành công",
            data: requestData
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

        // Giải mã idCardInfo cho mỗi request
        const requestsWithDecrypted = requests.map(request => {
            const requestData = request.toObject();
            requestData.idCardInfo = decryptIdCardInfo(request);
            return requestData;
        });

        return res.json({
            code: 200,
            message: "Lấy danh sách yêu cầu xác minh thành công",
            data: requestsWithDecrypted,
            total: requestsWithDecrypted.length
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

        // Giải mã idCardInfo để trả về
        const decryptedIdCardInfo = decryptIdCardInfo(request);
        const requestData = request.toObject();
        requestData.idCardInfo = decryptedIdCardInfo;

        return res.json({
            code: 200,
            message: "Lấy thông tin yêu cầu xác minh thành công",
            data: requestData
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
            // Mã hóa idCardInfo trước khi lưu
            try {
                const idCardData = {
                    idNumber: idCardInfo.idNumber.trim(),
                    fullName: idCardInfo.fullName.trim(),
                    dateOfBirth: new Date(idCardInfo.dateOfBirth).toISOString()
                };
                const { iv, encryptedData } = encryptObject(idCardData);
                request.idCardInfo = null; // Không lưu dữ liệu gốc
                request.idCardInfoEncrypted = {
                    encryptedData: Buffer.from(encryptedData, "hex"),
                    iv: iv
                };
            } catch (encryptError) {
                console.error('Error encrypting idCardInfo:', encryptError);
                return res.status(500).json({
                    code: 500,
                    message: "Lỗi khi mã hóa thông tin căn cước công dân",
                    error: encryptError.message
                });
            }
        }

        await request.save();

        if (action === 'approved') {
            const user = await User.findById(request.userId._id || request.userId);
            if (user) {
                user.isIdVerified = true;
                if (idCardInfo) {
                    // Mã hóa idCardInfo trước khi lưu vào User
                    try {
                        const idCardData = {
                            idNumber: idCardInfo.idNumber.trim(),
                            fullName: idCardInfo.fullName.trim(),
                            dateOfBirth: new Date(idCardInfo.dateOfBirth).toISOString(),
                            extractedAt: new Date().toISOString(),
                            extractionMethod: 'manual'
                        };
                        const { iv, encryptedData } = encryptObject(idCardData);
                        user.idCardInfo = null; // Không lưu dữ liệu gốc
                        user.idCardInfoEncrypted = {
                            encryptedData: Buffer.from(encryptedData, "hex"),
                            iv: iv
                        };
                    } catch (encryptError) {
                        console.error('Error encrypting idCardInfo for user:', encryptError);
                        return res.status(500).json({
                            code: 500,
                            message: "Lỗi khi mã hóa thông tin căn cước công dân cho người dùng",
                            error: encryptError.message
                        });
                    }
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

                // Check if both phone and ID are now verified
                // If phone was already verified, user is now fully verified
                const isFullyVerified = user.isPhoneConfirmed && user.isIdVerified;
                if (isFullyVerified) {
                    console.log(`User ${user._id} is now fully verified (phone and ID both verified)`);
                }
            }
        }

        await request.save();

        try {
            let message = '';
            let notificationTitle = '';
            let notificationType = '';
            let isFullyVerified = false;
            
            if (action === 'approved') {
                // Check if user is fully verified (both phone and ID)
                const user = await User.findById(request.userId._id || request.userId);
                isFullyVerified = user && user.isPhoneConfirmed && user.isIdVerified;
                
                if (isFullyVerified) {
                    message = `Yêu cầu xác minh căn cước công dân của bạn đã được duyệt. Tài khoản của bạn đã được xác minh đầy đủ (số điện thoại và căn cước công dân).`;
                    notificationTitle = "Tài khoản đã được xác minh đầy đủ";
                    notificationType = 'full_verification_success';
                } else {
                    message = `Yêu cầu xác minh căn cước công dân của bạn đã được duyệt. Tài khoản của bạn đã được xác minh thành công.`;
                    notificationTitle = "Xác minh CCCD đã được duyệt";
                    notificationType = 'id_card_verification_approved';
                }
            } else {
                message = `Yêu cầu xác minh căn cước công dân của bạn đã bị từ chối. Lý do: ${rejectionReason || 'Không được cung cấp'}`;
                notificationTitle = "Xác minh CCCD bị từ chối";
                notificationType = 'id_card_verification_rejected';
            }
            
            await createNotification(
                request.userId._id,
                notificationTitle,
                notificationTitle,
                message,
                {
                    requestId: request._id.toString(),
                    type: notificationType,
                    action: action,
                    redirectUrl: '/auth/verification-history',
                    isFullyVerified: isFullyVerified
                }
            );
        } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
        }

        // Giải mã idCardInfo để trả về
        const decryptedIdCardInfo = decryptIdCardInfo(request);
        const requestData = request.toObject();
        requestData.idCardInfo = decryptedIdCardInfo;

        return res.json({
            code: 200,
            message: action === 'approved' 
                ? "Yêu cầu xác minh đã được duyệt thành công" 
                : "Yêu cầu xác minh đã bị từ chối",
            data: requestData
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
