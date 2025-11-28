const twilio = require('twilio');

let twilioClient = null;

const initTwilio = () => {
    if (!twilioClient) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
            throw new Error('TWILIO_ACCOUNT_SID và TWILIO_AUTH_TOKEN phải được cấu hình trong environment variables');
        }

        twilioClient = twilio(accountSid, authToken);
    }
    return twilioClient;
};

const getVerifyServiceSid = () => {
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if (!serviceSid) {
        throw new Error('TWILIO_VERIFY_SERVICE_SID phải được cấu hình trong environment variables');
    }
    return serviceSid;
};

/**
 * Format phone number to E.164 format for Twilio
 * @param {string} phone - Phone number in various formats
 * @returns {string} - Phone number in E.164 format (e.g., +84901234567)
 */
const formatPhoneForTwilio = (phone) => {
    if (!phone || typeof phone !== 'string') {
        throw new Error('Số điện thoại không hợp lệ');
    }

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Validate minimum length (Vietnamese phone: 9-10 digits after removing leading 0 or country code)
    if (digits.length < 9) {
        throw new Error('Số điện thoại phải có ít nhất 9 chữ số');
    }
    
    // Handle Vietnamese phone numbers
    if (digits.startsWith('0')) {
        // Convert 0xxx to +84xxx (remove leading 0, add +84)
        const phoneWithoutZero = digits.substring(1);
        if (phoneWithoutZero.length < 9) {
            throw new Error('Số điện thoại không hợp lệ');
        }
        return '+84' + phoneWithoutZero;
    }
    
    if (digits.startsWith('84')) {
        // Already has country code, just add +
        const phoneWithoutCountryCode = digits.substring(2);
        if (phoneWithoutCountryCode.length < 9) {
            throw new Error('Số điện thoại không hợp lệ');
        }
        return '+' + digits;
    }
    
    // If already starts with +, validate it
    if (phone.startsWith('+')) {
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) { // +84 + 9 digits minimum
            throw new Error('Số điện thoại không hợp lệ');
        }
        return phone;
    }
    
    // Default: add +84 prefix
    if (digits.length < 9) {
        throw new Error('Số điện thoại không hợp lệ');
    }
    return '+84' + digits;
};

/**
 * Send OTP via Twilio Verify
 * @param {string} phone - Phone number
 * @returns {Promise<{success: boolean, sid?: string, error?: string}>}
 */
const sendOtp = async (phone) => {
    try {
        const client = initTwilio();
        const serviceSid = getVerifyServiceSid();
        
        // Validate and format phone number
        if (!phone || phone.trim() === '') {
            return {
                success: false,
                error: 'Số điện thoại không được để trống'
            };
        }

        const formattedPhone = formatPhoneForTwilio(phone);
        console.log('Sending OTP to:', formattedPhone); // Debug log

        const verification = await client.verify.v2
            .services(serviceSid)
            .verifications
            .create({
                to: formattedPhone,
                channel: 'sms'
            });

        return {
            success: true,
            sid: verification.sid,
            status: verification.status
        };
    } catch (error) {
        console.error('Twilio send OTP error:', error);
        return {
            success: false,
            error: error.message || 'Lỗi khi gửi OTP qua Twilio'
        };
    }
};

/**
 * Verify OTP via Twilio Verify
 * @param {string} phone - Phone number
 * @param {string} code - OTP code
 * @returns {Promise<{success: boolean, status?: string, error?: string}>}
 */
const verifyOtp = async (phone, code) => {
    try {
        const client = initTwilio();
        const serviceSid = getVerifyServiceSid();
        const formattedPhone = formatPhoneForTwilio(phone);

        const verificationCheck = await client.verify.v2
            .services(serviceSid)
            .verificationChecks
            .create({
                to: formattedPhone,
                code: code
            });

        const isApproved = verificationCheck.status === 'approved';

        return {
            success: isApproved,
            status: verificationCheck.status,
            sid: verificationCheck.sid
        };
    } catch (error) {
        console.error('Twilio verify OTP error:', error);
        
        // Handle specific Twilio errors
        let errorMessage = 'Lỗi khi xác minh OTP';
        if (error.code === 20404) {
            errorMessage = 'Mã OTP không hợp lệ hoặc đã hết hạn';
        } else if (error.code === 20429) {
            errorMessage = 'Quá nhiều lần thử. Vui lòng yêu cầu mã mới';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
};

module.exports = {
    sendOtp,
    verifyOtp,
    formatPhoneForTwilio
};

