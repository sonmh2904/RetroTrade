const { default: mongoose } = require("mongoose");

const otpSchema = new mongoose.Schema({
    email: String,
    otp: String,
    purpose: { type: String, enum: ['forgot-password', 'verify-email'], required: true },
    "expireAt": {
        type: Date,
        expires: 180
    }
})

const Otp = mongoose.model('Otp', otpSchema, 'otp');

module.exports = Otp;