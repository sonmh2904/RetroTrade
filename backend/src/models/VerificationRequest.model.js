const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema({
    requestGuid: {
        type: String,
        default: () => require('crypto').randomUUID(),
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Thông tin căn cước công dân (nếu user đã nhập)
    idCardInfo: {
        idNumber: String,
        fullName: String,
        dateOfBirth: Date,
        address: String
    },
    // Ảnh đã upload
    documents: [{
        documentType: { type: String, enum: ['idCardFront', 'idCardBack'] },
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    // Lý do gửi yêu cầu (nếu có)
    reason: String,
    // Trạng thái yêu cầu
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    // Người xử lý
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: Date,
    // Người xử lý cuối cùng
    handledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    handledAt: Date,
    // Ghi chú của moderator
    moderatorNotes: String,
    // Lý do từ chối (nếu bị reject)
    rejectionReason: String
}, {
    timestamps: true
});

// Indexes
verificationRequestSchema.index({ userId: 1, createdAt: -1 });
verificationRequestSchema.index({ status: 1, createdAt: -1 });
verificationRequestSchema.index({ assignedTo: 1, status: 1 });
verificationRequestSchema.index({ handledBy: 1, handledAt: -1 });

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);

