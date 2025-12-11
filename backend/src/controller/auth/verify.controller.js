const User = require("../../models/User.model");
const VerificationRequest = require("../../models/VerificationRequest.model");
const { uploadToCloudinary } = require('../../middleware/upload.middleware');
const { createNotification } = require("../../middleware/createNotification");
const { encryptObject, decryptObject } = require("../../utils/cryptoHelper");
// Optional: face comparison (requires @vladmandic/face-api and canvas)
let compareFaces = null;
try {
    const faceComparison = require("../../utils/faceComparison");
    compareFaces = faceComparison.compareFaces;
} catch (error) {
    console.warn('Face comparison not available:', error.message);
    console.warn('Auto verification will fallback to manual verification');
}
const { sendOtp: sendOtpTwilio, verifyOtp: verifyOtpTwilio, formatPhoneForTwilio } = require("../../utils/twilioUtils");

let Tesseract;
let tesseractLoaded = false;
const loadTesseract = async () => {
    if (!tesseractLoaded) {
        try {
            Tesseract = require('tesseract.js');
            tesseractLoaded = true;
        } catch (error) {
            Tesseract = null;
            tesseractLoaded = true;
        }
    }
    return Tesseract;
};

let sharp;
const loadSharp = async () => {
    if (!sharp) {
        try {
            sharp = require('sharp');
        } catch (error) {
            sharp = null;
        }
    }
    return sharp;
};

const initFetch = async () => {
    if (typeof globalThis.fetch !== "undefined") {
        return globalThis.fetch;
    } else if (typeof fetch !== "undefined") {
        return fetch;
    } else {
        throw new Error('fetch is not available. Please use Node.js 18 or higher.');
    }
};

const validateVietnamesePhoneNumber = (phoneNumber) => {
    const digits = phoneNumber.replace(/\D/g, '');
    const mobilePattern = /^(09|08|07|05|03)[0-9]{8}$/;
    const landlinePattern = /^02[0-9]{8,9}$/;
    return mobilePattern.test(digits) || landlinePattern.test(digits);
};

const formatPhoneNumber = (phoneNumber) => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('0')) {
        return digits;
    }
    if (digits.startsWith('84')) {
        return '0' + digits.substring(2);
    }
    if (phoneNumber.startsWith('+84')) {
        return '0' + digits.substring(2);
    }
    return digits;
};

const preprocessImageForOCR = async (imageBuffer) => {
    try {
        const sharpLib = await loadSharp();
        if (!sharpLib) {
            return imageBuffer;
        }

        let metadata;
        try {
            metadata = await sharpLib(imageBuffer).metadata();
        } catch (metaError) {
            metadata = { width: 1000, height: 1000 };
        }

        let processedBuffer;
        try {
            let pipeline = sharpLib(imageBuffer);
            if (metadata.width && metadata.width < 2500) {
                pipeline = pipeline.resize(2500, null, {
                    withoutEnlargement: false,
                    fit: 'inside',
                    kernel: sharpLib.kernel.lanczos3
                });
            }
            processedBuffer = await pipeline
                .greyscale()
                .normalize()
                .sharpen({ sigma: 2, flat: 1, jagged: 3 })
                .modulate({ brightness: 1.15, saturation: 0 })
                .linear(1.3, -(128 * 0.3))
                .threshold(128, { grayscale: true })
                .png({ quality: 100, compressionLevel: 0 })
                .toBuffer();
            return processedBuffer;
        } catch (processError) {
            console.error('Error during image processing:', processError);
            try {
                processedBuffer = await sharpLib(imageBuffer)
                    .greyscale()
                    .normalize()
                    .png({ quality: 100 })
                    .toBuffer();
                return processedBuffer;
            } catch (simpleError) {
                return imageBuffer;
            }
        }
    } catch (error) {
        return imageBuffer;
    }
};

const extractIdCardInfo = async (idCardImageBuffer) => {
    try {
        if (!idCardImageBuffer || !Buffer.isBuffer(idCardImageBuffer) || idCardImageBuffer.length === 0) {
            return null;
        }

        const TesseractLib = await loadTesseract();
        if (!TesseractLib) {
            return null;
        }

        let processedImageBuffer;
        try {
            processedImageBuffer = await preprocessImageForOCR(idCardImageBuffer);
        } catch (preprocessError) {
            processedImageBuffer = idCardImageBuffer;
        }

        let text = '';
        const whitelist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐabcdefghijklmnopqrstuvwxyzàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ/-,. ';

        try {
            const result6 = await TesseractLib.recognize(processedImageBuffer, 'vie', {
                tessedit_pageseg_mode: '6',
                tessedit_char_whitelist: whitelist,
            });
            text = result6.data.text || '';
        } catch (error) {
            console.error('OCR error with PSM 6:', error);
        }

        if (!text || text.length < 100) {
            try {
                const result11 = await TesseractLib.recognize(processedImageBuffer, 'vie', {
                    tessedit_pageseg_mode: '11',
                    tessedit_char_whitelist: whitelist,
                });
                const text11 = result11.data.text || '';
                if (text11.length > (text?.length || 0)) {
                    text = text11;
                }
            } catch (error) {
                console.error('OCR error with PSM 11:', error);
            }
        }

        if (!text || text.length < 100) {
            try {
                const result4 = await TesseractLib.recognize(processedImageBuffer, 'vie', {
                    tessedit_pageseg_mode: '4',
                    tessedit_char_whitelist: whitelist,
                });
                const text4 = result4.data.text || '';
                if (text4.length > (text?.length || 0)) {
                    text = text4;
                }
            } catch (error) {
                console.error('OCR error with PSM 4:', error);
            }
        }

        if (!text || text.length < 50) {
            try {
                const resultNoWhitelist = await TesseractLib.recognize(processedImageBuffer, 'vie', {
                    tessedit_pageseg_mode: '6',
                });
                const textNoWhitelist = resultNoWhitelist.data.text || '';
                if (textNoWhitelist.length > (text?.length || 0)) {
                    text = textNoWhitelist;
                }
            } catch (error) {
                console.error('OCR error with PSM 6 (no whitelist):', error);
            }
        }

        if (!text || text.trim().length === 0) {
            return null;
        }

        const idCardInfo = {
            idNumber: null,
            fullName: null,
            dateOfBirth: null,
            address: null
        };

        const idNumberPatterns = [
            /Số\s*\/\s*No\.?\s*:?\s*(\d{12})/i,
            /Số\s*:?\s*(\d{12})/i,
            /CCCD[:\s]+(\d{12})/i,
            /CMND[:\s]+(\d{12})/i,
            /\b(\d{12})\b/,
        ];
        for (const pattern of idNumberPatterns) {
            const match = text.match(pattern);
            if (match) {
                idCardInfo.idNumber = match[1] || match[0];
                if (idCardInfo.idNumber && /^\d{12}$/.test(idCardInfo.idNumber)) {
                    break;
                }
            }
        }

        const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
        let nameLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/Họ\s+và\s+tên/i.test(line) || /Họ\s+tên/i.test(line) ||
                /Ho\s+va\s+ten/i.test(line) || /Ho\s+ten/i.test(line)) {
                nameLineIndex = i;
                break;
            }
        }

        if (nameLineIndex >= 0) {
            const nameLine = lines[nameLineIndex];
            const hasFullName = /Full\s+name|ái|ai\s+dau/i.test(nameLine);
            let nameFound = false;

            if (!hasFullName) {
                const sameLinePatterns = [
                    /Họ\s+và\s+tên\s*:?\s*(.+?)(?:\s*$|\s*(?:Ngày|Giới|Quốc|Quê|Nơi|Địa|$))/i,
                    /Họ\s+tên\s*:?\s*(.+?)(?:\s*$|\s*(?:Ngày|Giới|Quốc|Quê|Nơi|Địa|$))/i,
                ];

                for (const pattern of sameLinePatterns) {
                    const match = nameLine.match(pattern);
                    if (match && match[1]) {
                        let name = match[1].trim();
                        name = name.replace(/^(Họ và tên|Họ tên)[:\s]*/i, '');
                        name = name.replace(/\s+/g, ' ');
                        name = name.replace(/[^A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐa-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, '');
                        name = name.trim();
                        const words = name.split(/\s+/).filter(w => w.length > 0);
                        if (name.length >= 4 && words.length >= 2 && words.length <= 5) {
                            idCardInfo.fullName = name.toUpperCase();
                            nameFound = true;
                            break;
                        }
                    }
                }
            }

            if (!nameFound) {
                for (let offset = 1; offset <= 3 && nameLineIndex + offset < lines.length; offset++) {
                    const candidateLine = lines[nameLineIndex + offset];
                    if (/^(Ngày|Giới|Quốc|Quê|Nơi|Địa|Số|No|Có giá trị|Date)/i.test(candidateLine) ||
                        /^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(candidateLine)) {
                        continue;
                    }
                    const uppercaseWords = candidateLine.match(/([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]{2,})/g);

                    if (uppercaseWords && uppercaseWords.length >= 2) {
                        const filteredWords = uppercaseWords.filter(word => {
                            const upperWord = word.toUpperCase();
                            if (word.length < 2) return false;
                            return !/^(NGÀY|GIỚI|QUỐC|QUÊ|NƠI|ĐỊA|SỐ|NO|CÓ|GIÁ|TRỊ|DATE|OF|BIRTH|RESIDENCE|ORIGIN|SEX|NATONALTY|TH|SỰ|MM|CO|NGG|OI|VN|VI|ET|NA|MI)$/i.test(upperWord) &&
                                !/^\d+$/.test(word) &&
                                !/\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(word);
                        });

                        if (filteredWords.length >= 2 && filteredWords.length <= 5) {
                            let name = filteredWords.join(' ').trim();
                            const words = name.split(/\s+/).filter(w => w.length > 0);
                            if (name.length >= 4 && words.length >= 2 && words.length <= 5) {
                                idCardInfo.fullName = name.toUpperCase();
                                nameFound = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (!idCardInfo.fullName) {
            const namePatterns = [
                /Họ\s+và\s+tên\s*\/\s*Full\s+name\s*:?\s*([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]+?)(?=\n|Ngày|Giới|Quốc|Quê|Nơi|$)/i,
                /Họ\s+và\s+tên\s*:?\s*([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]+?)(?=\n|Ngày|Giới|Quốc|Quê|Nơi|$)/i,
                /(?:Họ\s+và\s+tên|Họ\s+tên|Full\s+name)[:\s\/]*\s*([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]{3,}?)(?=\n|Ngày|Giới|Quốc|Quê|Nơi|$)/i,
            ];

            for (const pattern of namePatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    let name = match[1].trim().replace(/\s+/g, ' ');
                    name = name.replace(/[^A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]/gi, '');
                    name = name.trim();
                    const words = name.split(/\s+/).filter(w => w.length > 0);
                    if (name.length >= 4 && words.length >= 2) {
                        idCardInfo.fullName = name;
                        break;
                    }
                }
            }
        }

        const datePatterns = [
            /Ngày sinh\s*\/\s*Date of birth\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
            /Ngày sinh[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
            /Ngày, tháng, năm sinh[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
            /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/,
        ];
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const dateStr = match[1].replace(/-/g, '/');
                const [day, month, year] = dateStr.split('/');
                if (day && month && year && parseInt(day) <= 31 && parseInt(month) <= 12 && parseInt(year) >= 1900 && parseInt(year) <= 2100) {
                    idCardInfo.dateOfBirth = new Date(`${year}-${month}-${day}`);
                    if (isNaN(idCardInfo.dateOfBirth.getTime())) {
                        idCardInfo.dateOfBirth = null;
                    } else {
                        break;
                    }
                }
            }
        }

        if (idCardInfo.idNumber || idCardInfo.fullName || idCardInfo.dateOfBirth || idCardInfo.address) {
            return idCardInfo;
        }

        return null;
    } catch (error) {
        console.error('Error extracting ID card information:', error);
        return null;
    }
};

module.exports.sendOtpViaTwilio = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.trim() === '') {
            return res.status(400).json({ code: 400, message: "Thiếu số điện thoại" });
        }

        console.log('Received phone number:', phone); // Debug log
        const result = await sendOtpTwilio(phone);

        if (!result.success) {
            return res.status(400).json({
                code: 400,
                message: result.error || "Gửi OTP thất bại",
                error: result.error
            });
        }

        return res.json({
            code: 200,
            message: "Đã gửi OTP qua SMS",
            data: { 
                sid: result.sid,
                status: result.status
            }
        });
    } catch (error) {
        console.error('OTP sending error:', error);
        let errorMessage = "Lỗi khi gửi OTP";
        let statusCode = 500;

        if (error.message.includes('TWILIO')) {
            errorMessage = "Cấu hình Twilio chưa đúng. Vui lòng kiểm tra environment variables.";
            statusCode = 500;
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            errorMessage = "Không thể kết nối đến dịch vụ Twilio. Vui lòng thử lại sau.";
            statusCode = 503;
        }

        return res.status(statusCode).json({
            code: statusCode,
            message: errorMessage,
            error: error.message
        });
    }
}


module.exports.verifyOtpViaTwilio = async (req, res) => {
    try {
        const { phone, code } = req.body;
        if (!phone || !code) {
            return res.status(400).json({ code: 400, message: "Thiếu số điện thoại hoặc mã OTP" });
        }

        const result = await verifyOtpTwilio(phone, code);

        if (!result.success) {
            return res.status(400).json({ 
                code: 400, 
                message: result.error || "Xác minh OTP thất bại",
                error: result.error
            });
        }

        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({
                code: 401,
                message: "User chưa đăng nhập. Vui lòng đăng nhập trước khi xác minh"
            });
        }

        try {
            // Format phone to Vietnamese format (0xxx)
            const formattedPhone = formatPhoneNumber(formatPhoneForTwilio(phone));
            
            if (!validateVietnamesePhoneNumber(formattedPhone)) {
                return res.status(400).json({
                    code: 400,
                    message: "Số điện thoại không đúng định dạng Việt Nam"
                });
            }

            // Get the user to check current verification status
            const currentUser = await User.findById(userId);
            if (!currentUser) {
                return res.status(404).json({
                    code: 404,
                    message: "Không tìm thấy người dùng"
                });
            }

            // Update phone and set isPhoneConfirmed to true
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { phone: formattedPhone, isPhoneConfirmed: true },
                { new: true }
            );

            // Check if both phone and ID are now verified
            const isFullyVerified = updatedUser.isPhoneConfirmed && updatedUser.isIdVerified;

            if (isFullyVerified) {
                console.log(`User ${userId} is now fully verified (phone and ID both verified)`);
                
                try {
                    await createNotification(
                        userId,
                        "Tài khoản đã được xác minh đầy đủ",
                        "Tài khoản đã được xác minh đầy đủ",
                        `Số điện thoại ${formattedPhone} của bạn đã được xác minh thành công. Tài khoản của bạn đã được xác minh đầy đủ (số điện thoại và căn cước công dân).`,
                        {
                            phone: formattedPhone,
                            type: 'full_verification_success',
                            redirectUrl: '/auth/verification-history',
                            isFullyVerified: true
                        }
                    );
                } catch (notificationError) {
                    console.error("Error creating full verification notification:", notificationError);
                }
            } else {
                try {
                    await createNotification(
                        userId,
                        "Xác minh số điện thoại thành công",
                        "Xác minh số điện thoại thành công",
                        `Số điện thoại ${formattedPhone} của bạn đã được xác minh thành công.`,
                        {
                            phone: formattedPhone,
                            type: 'phone_verification_success',
                            redirectUrl: '/auth/verification-history',
                            isFullyVerified: false
                        }
                    );
                } catch (notificationError) {
                    console.error("Error creating phone verification notification:", notificationError);
                }
            }

            return res.json({
                code: 200,
                message: "Xác minh số điện thoại thành công",
                data: {
                    phone: formattedPhone,
                    userId: updatedUser._id,
                    isPhoneConfirmed: updatedUser.isPhoneConfirmed,
                    isIdVerified: updatedUser.isIdVerified,
                    isFullyVerified: isFullyVerified,
                    user: updatedUser
                }
            });
        } catch (dbError) {
            console.error('Database update error:', dbError);
            return res.status(500).json({
                code: 500,
                message: "Lỗi cơ sở dữ liệu khi cập nhật số điện thoại",
                error: dbError.message
            });
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        let errorMessage = "Lỗi khi xác minh OTP";
        let statusCode = 500;

        if (error.message.includes('TWILIO')) {
            errorMessage = "Cấu hình Twilio chưa đúng. Vui lòng kiểm tra environment variables.";
            statusCode = 500;
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            errorMessage = "Không thể kết nối đến dịch vụ Twilio. Vui lòng thử lại sau.";
            statusCode = 503;
        } else if (error.message.includes('Database')) {
            errorMessage = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau.";
            statusCode = 500;
        }

        return res.status(statusCode).json({
            code: statusCode,
            message: errorMessage,
            error: error.message
        });
    }
}


module.exports.previewIdCardOcr = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                code: 400,
                message: "Vui lòng upload ảnh mặt trước căn cước công dân"
            });
        }

        let extractedIdCardInfo = null;
        try {
            extractedIdCardInfo = await extractIdCardInfo(req.file.buffer);
        } catch (ocrError) {
            console.error('OCR Preview - Error extracting ID card info:', ocrError);
            let errorMessage = "Lỗi khi đọc thông tin từ ảnh. Vui lòng thử lại hoặc nhập thủ công.";

            if (ocrError.message?.includes('memory') || ocrError.message?.includes('Memory')) {
                errorMessage = "Ảnh quá lớn hoặc không đủ bộ nhớ để xử lý. Vui lòng thử lại với ảnh nhỏ hơn.";
            } else if (ocrError.message?.includes('format') || ocrError.message?.includes('Format')) {
                errorMessage = "Định dạng ảnh không được hỗ trợ. Vui lòng sử dụng ảnh JPG, PNG.";
            } else if (ocrError.message?.includes('timeout') || ocrError.message?.includes('Timeout')) {
                errorMessage = "Quá trình đọc ảnh mất quá nhiều thời gian. Vui lòng thử lại.";
            }

            return res.status(500).json({
                code: 500,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? ocrError.message : undefined
            });
        }

        return res.json({
            code: 200,
            message: "Đã đọc thông tin từ ảnh thành công",
            data: {
                extractedIdCardInfo: extractedIdCardInfo ? {
                    idNumber: extractedIdCardInfo.idNumber || null,
                    fullName: extractedIdCardInfo.fullName || null,
                    dateOfBirth: extractedIdCardInfo.dateOfBirth ? extractedIdCardInfo.dateOfBirth.toISOString() : null
                } : null
            }
        });
    } catch (error) {
        console.error('OCR Preview error:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi khi đọc thông tin từ ảnh",
            error: error.message
        });
    }
};

module.exports.verifyFaceImages = async (req, res) => {
    try {
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({
                code: 400,
                message: "Vui lòng upload đủ 3 ảnh: mặt trước căn cước công dân, mặt sau căn cước công dân và ảnh người dùng"
            });
        }

        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({
                code: 401,
                message: "User chưa đăng nhập. Vui lòng đăng nhập trước khi xác minh"
            });
        }

        const files = req.files;
        const idCardFrontFile = files[0];
        const idCardBackFile = files[1];
        const userPhotoFile = files[2];

        if (!idCardFrontFile || !idCardBackFile || !userPhotoFile) {
            return res.status(400).json({
                code: 400,
                message: "Thiếu ảnh. Vui lòng upload đủ 3 ảnh: mặt trước CCCD, mặt sau CCCD và ảnh người dùng"
            });
        }

        let extractedIdCardInfo = null;
        if (req.body.idCardInfo) {
            try {
                const providedInfo = typeof req.body.idCardInfo === 'string'
                    ? JSON.parse(req.body.idCardInfo)
                    : req.body.idCardInfo;

                extractedIdCardInfo = {
                    idNumber: providedInfo.idNumber || null,
                    fullName: providedInfo.fullName || null,
                    dateOfBirth: providedInfo.dateOfBirth || null
                };
            } catch (parseError) {
                console.error('Error parsing idCardInfo from request:', parseError);
            }
        }

        if (!extractedIdCardInfo || (!extractedIdCardInfo.idNumber && !extractedIdCardInfo.fullName)) {
            try {
                const ocrResult = await extractIdCardInfo(idCardFrontFile.buffer);
                if (ocrResult) {
                extractedIdCardInfo = {
                    idNumber: extractedIdCardInfo?.idNumber || ocrResult.idNumber || null,
                    fullName: extractedIdCardInfo?.fullName || ocrResult.fullName || null,
                    dateOfBirth: extractedIdCardInfo?.dateOfBirth || ocrResult.dateOfBirth || null
                };
                }
            } catch (ocrError) {
                console.error('Error extracting ID card info with OCR:', ocrError);
            }
        }

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
        try {
            console.log('Uploading files to Cloudinary:', {
                filesCount: files.length,
                fileNames: files.map(f => f.originalname),
                fileSizes: files.map(f => f.size)
            });
            
            uploadedFiles = await uploadToCloudinary(files, "retrotrade/verification-requests/");
            
            console.log('Upload result:', {
                uploadedCount: uploadedFiles?.length,
                expectedCount: 3
            });
            
            if (!uploadedFiles || uploadedFiles.length !== 3) {
                console.error('Upload failed: Expected 3 files but got', uploadedFiles?.length);
                return res.status(400).json({
                    code: 400,
                    message: `Lỗi khi upload ảnh. Đã upload ${uploadedFiles?.length || 0}/3 ảnh. Vui lòng thử lại`
                });
            }
        } catch (uploadError) {
            console.error('Error uploading to Cloudinary:', uploadError);
            return res.status(500).json({
                code: 500,
                message: "Lỗi khi upload ảnh lên server",
                error: uploadError.message
            });
        }

        const documentTypes = ['idCardFront', 'idCardBack', 'userPhoto'];
        const documents = uploadedFiles.map((file, index) => {
            return {
                documentType: documentTypes[index] || 'document',
                fileUrl: file.Url,
                uploadedAt: new Date()
            };
        });

        const hasValidIdCardInfo = extractedIdCardInfo && (
            extractedIdCardInfo.idNumber ||
            extractedIdCardInfo.fullName ||
            extractedIdCardInfo.dateOfBirth
        );

        const shouldAutoReject = !hasValidIdCardInfo;

        // Mã hóa idCardInfo nếu có
        let idCardInfoEncrypted = null;
        if (extractedIdCardInfo && hasValidIdCardInfo) {
            try {
                const idCardData = {
                    idNumber: extractedIdCardInfo.idNumber || null,
                    fullName: extractedIdCardInfo.fullName || null,
                    dateOfBirth: extractedIdCardInfo.dateOfBirth ? new Date(extractedIdCardInfo.dateOfBirth).toISOString() : null
                };
                console.log('Encrypting idCardInfo:', {
                    hasIdNumber: !!idCardData.idNumber,
                    hasFullName: !!idCardData.fullName,
                    hasDateOfBirth: !!idCardData.dateOfBirth
                });
                
                const { iv, encryptedData } = encryptObject(idCardData);
                idCardInfoEncrypted = {
                    encryptedData: Buffer.from(encryptedData, "hex"),
                    iv: iv
                };
                console.log('Encryption successful');
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
            reason: req.body.reason || null,
            status: shouldAutoReject ? 'Rejected' : 'Pending',
            rejectionReason: shouldAutoReject
                ? 'Hệ thống không thể đọc được thông tin từ ảnh căn cước công dân. Vui lòng chụp lại ảnh rõ nét hơn hoặc đảm bảo ảnh không bị mờ, không bị che khuất thông tin.'
                : null,
            handledAt: shouldAutoReject ? new Date() : null
        });

        try {
            await verificationRequest.save();
            await verificationRequest.populate('userId', 'fullName email phone');
        } catch (saveError) {
            console.error('Error saving verification request:', saveError);
            return res.status(500).json({
                code: 500,
                message: "Lỗi khi lưu yêu cầu xác minh vào cơ sở dữ liệu",
                error: saveError.message
            });
        }

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
        }

        // Giải mã idCardInfo để trả về (chỉ để hiển thị, không lưu vào DB)
        let decryptedIdCardInfo = null;
        if (verificationRequest.idCardInfoEncrypted && verificationRequest.idCardInfoEncrypted.encryptedData && verificationRequest.idCardInfoEncrypted.iv) {
            try {
                const encryptedHex = verificationRequest.idCardInfoEncrypted.encryptedData.toString("hex");
                decryptedIdCardInfo = decryptObject(encryptedHex, verificationRequest.idCardInfoEncrypted.iv);
            } catch (decryptError) {
                console.error('Error decrypting idCardInfo for response:', decryptError);
            }
        }

        const responseData = {
            requestId: verificationRequest._id,
            userId: userId,
            status: verificationRequest.status,
            documents: verificationRequest.documents || [],
            idCardInfo: decryptedIdCardInfo ? {
                idNumber: decryptedIdCardInfo.idNumber || null,
                fullName: decryptedIdCardInfo.fullName || null,
                dateOfBirth: decryptedIdCardInfo.dateOfBirth || null,
                extractionMethod: 'ocr_user_confirmed'
            } : null,
            extractedIdCardInfo: extractedIdCardInfo ? {
                idNumber: extractedIdCardInfo.idNumber,
                fullName: extractedIdCardInfo.fullName,
                dateOfBirth: extractedIdCardInfo.dateOfBirth ? (typeof extractedIdCardInfo.dateOfBirth === 'string' ? extractedIdCardInfo.dateOfBirth : extractedIdCardInfo.dateOfBirth.toISOString()) : null
            } : null
        };

        if (shouldAutoReject) {
            return res.json({
                code: 200,
                message: "Yêu cầu xác minh đã bị từ chối tự động do không thể đọc được thông tin từ ảnh. Vui lòng chụp lại ảnh rõ nét hơn.",
                data: {
                    ...responseData,
                    autoRejected: true,
                    rejectionReason: verificationRequest.rejectionReason
                }
            });
        } else {
            return res.json({
                code: 200,
                message: "Yêu cầu xác minh đã được gửi thành công. Moderator sẽ xử lý trong thời gian sớm nhất.",
                data: responseData
            });
        }
    } catch (error) {
        console.error('Verification request creation error:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi khi tạo yêu cầu xác minh",
            error: error.message
        });
    }
};

/**
 * Auto verification with face comparison
 * Compares face on ID card with user photo
 * If similarity > 50%, auto-approves and updates user
 * Otherwise, returns result for manual review
 */
module.exports.verifyFaceImagesAuto = async (req, res) => {
    try {
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({
                code: 400,
                message: "Vui lòng upload đủ 3 ảnh: mặt trước căn cước công dân, mặt sau căn cước công dân và ảnh người dùng"
            });
        }

        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({
                code: 401,
                message: "User chưa đăng nhập. Vui lòng đăng nhập trước khi xác minh"
            });
        }

        const files = req.files;
        const idCardFrontFile = files[0];
        const idCardBackFile = files[1];
        const userPhotoFile = files[2];

        if (!idCardFrontFile || !idCardBackFile || !userPhotoFile) {
            return res.status(400).json({
                code: 400,
                message: "Thiếu ảnh. Vui lòng upload đủ 3 ảnh: mặt trước CCCD, mặt sau CCCD và ảnh người dùng"
            });
        }

        // Check for existing pending request
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

        // Extract ID card info from OCR
        let extractedIdCardInfo = null;
        if (req.body.idCardInfo) {
            try {
                const providedInfo = typeof req.body.idCardInfo === 'string'
                    ? JSON.parse(req.body.idCardInfo)
                    : req.body.idCardInfo;

                extractedIdCardInfo = {
                    idNumber: providedInfo.idNumber || null,
                    fullName: providedInfo.fullName || null,
                    dateOfBirth: providedInfo.dateOfBirth || null
                };
            } catch (parseError) {
                console.error('Error parsing idCardInfo from request:', parseError);
            }
        }

        // If no info provided, extract from OCR
        if (!extractedIdCardInfo || (!extractedIdCardInfo.idNumber && !extractedIdCardInfo.fullName)) {
            try {
                const ocrResult = await extractIdCardInfo(idCardFrontFile.buffer);
                if (ocrResult) {
                    extractedIdCardInfo = {
                        idNumber: extractedIdCardInfo?.idNumber || ocrResult.idNumber || null,
                        fullName: extractedIdCardInfo?.fullName || ocrResult.fullName || null,
                        dateOfBirth: extractedIdCardInfo?.dateOfBirth || ocrResult.dateOfBirth || null
                    };
                }
            } catch (ocrError) {
                console.error('Error extracting ID card info with OCR:', ocrError);
            }
        }

        // Validate extracted info
        if (!extractedIdCardInfo || 
            !extractedIdCardInfo.idNumber || 
            !extractedIdCardInfo.fullName || 
            !extractedIdCardInfo.dateOfBirth) {
            return res.status(400).json({
                code: 400,
                message: "Không thể đọc được thông tin từ ảnh căn cước công dân. Vui lòng chụp lại ảnh rõ nét hơn hoặc nhập thủ công.",
                data: {
                    extractedIdCardInfo: extractedIdCardInfo,
                    requiresManualInput: true
                }
            });
        }

        // Compare faces: ID card front vs user photo
        let faceComparisonResult = null;
        if (compareFaces) {
            try {
                console.log('Comparing faces...');
                faceComparisonResult = await compareFaces(
                    idCardFrontFile.buffer,
                    userPhotoFile.buffer
                );
                console.log('Face comparison result:', faceComparisonResult);
            } catch (faceError) {
                console.error('Face comparison error:', faceError);
                // Fallback: treat as if similarity is 0, will send to moderator
                faceComparisonResult = {
                    similarity: 0,
                    idCardFaceDetected: false,
                    userFaceDetected: false,
                    error: 'Lỗi khi so sánh khuôn mặt. Vui lòng thử lại hoặc sử dụng xác minh bán tự động.'
                };
            }
        } else {
            // Face comparison not available, send to moderator
            console.log('Face comparison not available, sending to moderator');
            faceComparisonResult = {
                similarity: 0,
                idCardFaceDetected: false,
                userFaceDetected: false,
                error: null, // Don't show technical error to user
                fallbackToManual: true // Flag to indicate fallback
            };
        }

        // Upload files to Cloudinary
        let uploadedFiles = [];
        try {
            uploadedFiles = await uploadToCloudinary(files, "retrotrade/verification-requests/");
            if (!uploadedFiles || uploadedFiles.length !== 3) {
                return res.status(400).json({
                    code: 400,
                    message: `Lỗi khi upload ảnh. Đã upload ${uploadedFiles?.length || 0}/3 ảnh. Vui lòng thử lại`
                });
            }
        } catch (uploadError) {
            console.error('Error uploading to Cloudinary:', uploadError);
            return res.status(500).json({
                code: 500,
                message: "Lỗi khi upload ảnh lên server",
                error: uploadError.message
            });
        }

        const documentTypes = ['idCardFront', 'idCardBack', 'userPhoto'];
        const documents = uploadedFiles.map((file, index) => {
            return {
                documentType: documentTypes[index] || 'document',
                fileUrl: file.Url,
                uploadedAt: new Date()
            };
        });

        // Check if similarity > 50% for auto-approval
        const SIMILARITY_THRESHOLD = 50;
        const similarity = faceComparisonResult.similarity || 0;
        const fallbackToManual = faceComparisonResult.fallbackToManual || false;
        const canAutoApprove = !fallbackToManual && 
                               similarity >= SIMILARITY_THRESHOLD && 
                               faceComparisonResult.idCardFaceDetected && 
                               faceComparisonResult.userFaceDetected;

        if (canAutoApprove) {
            // Auto-approve: Update user directly
            try {
                const user = await User.findById(userId);
                if (!user) {
                    return res.status(404).json({
                        code: 404,
                        message: "Không tìm thấy người dùng"
                    });
                }

                // Encrypt and save ID card info
                const idCardData = {
                    idNumber: extractedIdCardInfo.idNumber.trim(),
                    fullName: extractedIdCardInfo.fullName.trim(),
                    dateOfBirth: new Date(extractedIdCardInfo.dateOfBirth).toISOString()
                };

                const { iv, encryptedData } = encryptObject(idCardData);
                user.idCardInfo = null;
                user.idCardInfoEncrypted = {
                    encryptedData: Buffer.from(encryptedData, "hex"),
                    iv: iv
                };
                user.isIdVerified = true;

                // Save documents
                if (documents && documents.length > 0) {
                    const userDocuments = documents.map((doc, index) => {
                        return {
                            documentType: doc.documentType || 'document',
                            documentNumber: `DOC-${Date.now()}-${index}`,
                            fileUrl: doc.fileUrl,
                            status: 'approved',
                            submittedAt: doc.uploadedAt || new Date()
                        };
                    });
                    user.documents = user.documents || [];
                    user.documents.push(...userDocuments);
                }

                await user.save();

                // Create verification request record for audit (status: Approved)
                const verificationRequest = new VerificationRequest({
                    userId: userId,
                    idCardInfoEncrypted: {
                        encryptedData: Buffer.from(encryptedData, "hex"),
                        iv: iv
                    },
                    documents: documents,
                    status: 'Approved',
                    handledBy: null, // Auto-approved
                    handledAt: new Date(),
                    moderatorNotes: `Tự động duyệt: Độ tương đồng khuôn mặt ${similarity.toFixed(2)}%`
                });

                await verificationRequest.save();

                // Send notification
                const isFullyVerified = user.isPhoneConfirmed && user.isIdVerified;
                try {
                    await createNotification(
                        userId,
                        isFullyVerified ? "Tài khoản đã được xác minh đầy đủ" : "Xác minh CCCD đã được duyệt",
                        isFullyVerified ? "Tài khoản đã được xác minh đầy đủ" : "Xác minh CCCD đã được duyệt",
                        isFullyVerified 
                            ? `Tài khoản của bạn đã được xác minh đầy đủ (số điện thoại và căn cước công dân). Độ tương đồng khuôn mặt: ${similarity.toFixed(2)}%`
                            : `Yêu cầu xác minh căn cước công dân của bạn đã được duyệt tự động. Độ tương đồng khuôn mặt: ${similarity.toFixed(2)}%`,
                        {
                            requestId: verificationRequest._id.toString(),
                            type: isFullyVerified ? 'full_verification_success' : 'id_card_verification_approved',
                            redirectUrl: '/auth/profile'
                        }
                    );
                } catch (notificationError) {
                    console.error("Error creating notification:", notificationError);
                }

                return res.json({
                    code: 200,
                    message: `Xác minh thành công! Độ tương đồng khuôn mặt: ${similarity.toFixed(2)}%`,
                    data: {
                        autoApproved: true,
                        similarity: similarity,
                        idCardFaceDetected: faceComparisonResult.idCardFaceDetected,
                        userFaceDetected: faceComparisonResult.userFaceDetected,
                        extractedIdCardInfo: extractedIdCardInfo,
                        isFullyVerified: isFullyVerified,
                        requestId: verificationRequest._id.toString()
                    }
                });
            } catch (userUpdateError) {
                console.error('Error auto-approving user:', userUpdateError);
                return res.status(500).json({
                    code: 500,
                    message: "Lỗi khi cập nhật thông tin người dùng",
                    error: userUpdateError.message
                });
            }
        } else {
            // Similarity < 50% or face not detected or fallback: Create pending request for moderator
            try {
                const idCardData = {
                    idNumber: extractedIdCardInfo.idNumber.trim(),
                    fullName: extractedIdCardInfo.fullName.trim(),
                    dateOfBirth: new Date(extractedIdCardInfo.dateOfBirth).toISOString()
                };

                const { iv, encryptedData } = encryptObject(idCardData);

                // Determine moderator notes based on reason
                let moderatorNotes = '';
                if (fallbackToManual) {
                    moderatorNotes = 'Xác minh tự động không khả dụng, chuyển sang xác minh bán tự động';
                } else if (faceComparisonResult.error) {
                    moderatorNotes = `Lý do: ${faceComparisonResult.error}. Độ tương đồng: ${similarity.toFixed(2)}%`;
                } else {
                    moderatorNotes = `Độ tương đồng khuôn mặt: ${similarity.toFixed(2)}% (dưới ngưỡng ${SIMILARITY_THRESHOLD}%)`;
                }

                const verificationRequest = new VerificationRequest({
                    userId: userId,
                    idCardInfoEncrypted: {
                        encryptedData: Buffer.from(encryptedData, "hex"),
                        iv: iv
                    },
                    documents: documents,
                    status: 'Pending',
                    moderatorNotes: moderatorNotes
                });

                await verificationRequest.save();

                // Notify moderators
                try {
                    const moderators = await User.find({ role: 'moderator', isDeleted: false });
                    for (const moderator of moderators) {
                        await createNotification(
                            moderator._id,
                            "Yêu cầu xác minh CCCD mới",
                            "Yêu cầu xác minh CCCD mới",
                            `Có yêu cầu xác minh căn cước công dân mới từ ${req.user.fullName || req.user.email}. Độ tương đồng khuôn mặt: ${similarity.toFixed(2)}%. Vui lòng xử lý.`,
                            {
                                requestId: verificationRequest._id.toString(),
                                userId: userId.toString(),
                                type: 'id_card_verification_request'
                            }
                        );
                    }
                } catch (notificationError) {
                    console.error("Error creating moderator notifications:", notificationError);
                }

                // Determine rejection reason (user-friendly, no technical details)
                let rejectionReason = '';
                let userMessage = '';
                
                if (fallbackToManual) {
                    // Don't show technical error, just say we need manual verification
                    rejectionReason = 'Không thể thực hiện so sánh khuôn mặt tự động';
                    userMessage = 'Xác minh tự động không khả dụng. Yêu cầu đã được chuyển sang xác minh bán tự động.';
                } else if (faceComparisonResult.error) {
                    rejectionReason = faceComparisonResult.error;
                    userMessage = `Xác minh tự động không thành công. Lý do: ${rejectionReason}`;
                } else if (!faceComparisonResult.idCardFaceDetected || !faceComparisonResult.userFaceDetected) {
                    rejectionReason = 'Không phát hiện được khuôn mặt trong ảnh';
                    userMessage = `Xác minh tự động không thành công. Lý do: ${rejectionReason}`;
                } else if (similarity < SIMILARITY_THRESHOLD) {
                    rejectionReason = `Độ tương đồng khuôn mặt ${similarity.toFixed(2)}% thấp hơn ngưỡng ${SIMILARITY_THRESHOLD}%`;
                    userMessage = `Xác minh tự động không thành công. Độ tương đồng khuôn mặt: ${similarity.toFixed(2)}%`;
                } else {
                    rejectionReason = 'Không đủ điều kiện để xác minh tự động';
                    userMessage = 'Xác minh tự động không thành công';
                }

                // Notify user
                try {
                    await createNotification(
                        userId,
                        "Yêu cầu xác minh đã được chuyển sang bán tự động",
                        "Xác minh CCCD đã được chuyển sang bán tự động",
                        `${userMessage}. Yêu cầu đã được chuyển sang xác minh bán tự động và gửi cho moderator xử lý.`,
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
                    message: userMessage || `Xác minh tự động không thành công. Độ tương đồng khuôn mặt: ${similarity.toFixed(2)}%`,
                    data: {
                        autoApproved: false,
                        similarity: similarity,
                        idCardFaceDetected: faceComparisonResult.idCardFaceDetected,
                        userFaceDetected: faceComparisonResult.userFaceDetected,
                        extractedIdCardInfo: extractedIdCardInfo,
                        verificationRequestSubmitted: true,
                        requestId: verificationRequest._id.toString(),
                        requiresModeratorReview: true,
                        rejectionReason: rejectionReason,
                        switchedToManualVerification: true,
                        manualVerificationMessage: 'Yêu cầu đã được chuyển sang xác minh bán tự động và gửi cho kiểm duyệt viên xử lý.'
                    }
                });
            } catch (requestError) {
                console.error('Error creating verification request:', requestError);
                return res.status(500).json({
                    code: 500,
                    message: "Lỗi khi tạo yêu cầu xác minh",
                    error: requestError.message
                });
            }
        }
    } catch (error) {
        console.error('Auto verification error:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi khi xác minh tự động",
            error: error.message
        });
    }
};
