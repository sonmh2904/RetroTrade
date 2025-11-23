const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userGuid: {
        type: String,
        default: () => require('crypto').randomUUID(),
        unique: true
    },
    email: {
        type: String,
        required: false, 
        unique: true,
        sparse: true, 
        lowercase: true,
        trim: true
    },
    phone: String,
    passwordHash: String,
    passwordSalt: String,
    fullName: String,
    displayName: String,
    avatarUrl: String,
    bio: String,
    isEmailConfirmed: { type: Boolean, default: false },
    isPhoneConfirmed: { type: Boolean, default: false },
    isIdVerified: { type: Boolean, default: false },
    reputationScore: { type: Number, default: 0, min: 0, max: 5 },
    points: { type: Number, default: 0 },
    background: { type: String, enum: ['village', 'zen', 'modern'], default: 'village' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    lastLoginAt: Date,
    role: {
        type: String,
        enum: ['renter', 'owner', 'admin', 'moderator'],
        default: 'renter'
    },
    documents: [{
        documentType: String,
        documentNumber: String,
        fileUrl: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        submittedAt: { type: Date, default: Date.now },
        reviewedAt: Date,
        rejectionReason: String
    }],
    // Thông tin căn cước công dân
    idCardInfo: {
        idNumber: String, // Số căn cước công dân
        fullName: String, // Họ và tên
        dateOfBirth: Date, // Ngày tháng năm sinh
        address: String, // Địa chỉ thường trú
        extractedAt: Date, // Thời gian extract thông tin
        extractionMethod: { type: String, enum: ['ocr', 'manual'], default: 'ocr' } // Phương thức extract
    }
}, {
    timestamps: true
});

userSchema.index({ reputationScore: -1 });

// Indexes for filtering
userSchema.index({ isDeleted: 1, createdAt: -1 }); // For getAllUsers with pagination
userSchema.index({ role: 1, isDeleted: 1, createdAt: -1 }); // For role filter
userSchema.index({ isDeleted: 1, role: 1, createdAt: -1 }); // Alternative compound index
userSchema.index({ email: 1 }); // For email search
userSchema.index({ fullName: 1 }); // For name search
userSchema.index({ isEmailConfirmed: 1, isPhoneConfirmed: 1, isIdVerified: 1 }); // For status filter

// Text index for full-text search on email, fullName, displayName
userSchema.index({ email: 'text', fullName: 'text', displayName: 'text' });

// Compound index for common queries: isDeleted + role + createdAt
userSchema.index({ isDeleted: 1, role: 1, createdAt: -1 });

userSchema.index({ phone: 1, email: 1 }, { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { 
        $or: [
            { phone: { $exists: true, $ne: null } },
            { email: { $exists: true, $ne: null } }
        ]
    }
});


userSchema.pre('save', function(next) {
    if (!this.email && !this.phone) {
        return next(new Error('User must have either email or phone number'));
    }
    next();
});

module.exports = mongoose.model('User', userSchema);