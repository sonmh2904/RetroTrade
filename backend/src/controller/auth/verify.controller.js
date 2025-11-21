const User = require("../../models/User.model");
const { getAdmin } = require("../../config/firebase");
const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('../../middleware/upload.middleware');
const { createNotification } = require("../../middleware/createNotification");

// Lazy load Tesseract for OCR
let Tesseract;
let tesseractLoaded = false;
const loadTesseract = async () => {
    if (!tesseractLoaded) {
        try {
            Tesseract = require('tesseract.js');
            tesseractLoaded = true;
            console.log('Tesseract.js loaded successfully');
        } catch (error) {
            console.error('Error loading Tesseract.js:', error);
            console.log('OCR will be disabled. Users can manually enter ID card information.');
            Tesseract = null;
            tesseractLoaded = true; // Mark as loaded to avoid retrying
        }
    }
    return Tesseract;
};

// Lazy load sharp to avoid module not found errors
let sharp;
const loadSharp = async () => {
    if (!sharp) {
        try {
            sharp = require('sharp');
            console.log('Sharp loaded successfully');
        } catch (error) {
            console.error('Error loading sharp:', error);
            console.log('Using fallback image processing');
            sharp = null;
        }
    }
    return sharp;
};

// Ensure fetch is available in Node environments that don't provide global fetch
// Lazy-import node-fetch only when needed to avoid ESM/CJS interop issues
let fetchFn;
const initFetch = async () => {
    if (!fetchFn) {
        try {
            // Try to use node-fetch which works better than built-in fetch for some use cases
            const nodeFetch = await import("node-fetch");
            fetchFn = nodeFetch.default;
            console.log('Using node-fetch for HTTP requests');
        } catch (error) {
            console.error('Error loading node-fetch:', error);
            if (typeof fetch !== "undefined") {
                fetchFn = fetch;
                console.log('Using built-in fetch');
            } else {
                throw new Error('Cannot load fetch implementation');
            }
        }
    }
    return fetchFn;
};

// Helper function to validate Vietnamese phone number
const validateVietnamesePhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Vietnamese phone number patterns:
    // - Mobile: 09x, 08x, 07x, 05x, 03x (10 digits)
    // - Landline: 02x (10-11 digits)
    const mobilePattern = /^(09|08|07|05|03)[0-9]{8}$/;
    const landlinePattern = /^02[0-9]{8,9}$/;
    
    return mobilePattern.test(digits) || landlinePattern.test(digits);
};

// Helper function to format phone number
const formatPhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If starts with 0, keep as is (Vietnamese format)
    if (digits.startsWith('0')) {
        return digits;
    }
    
    // If starts with 84, remove it and add 0
    if (digits.startsWith('84')) {
        return '0' + digits.substring(2);
    }
    
    // If starts with +84, remove it and add 0
    if (phoneNumber.startsWith('+84')) {
        return '0' + digits.substring(2);
    }
    
    // Default: assume it's already in correct format
    return digits;
};

// Extract ID card information from image using OCR
const extractIdCardInfo = async (idCardImageBuffer) => {
    try {
        const TesseractLib = await loadTesseract();
        if (!TesseractLib) {
            console.log('Tesseract not available, skipping OCR extraction');
            return null;
        }

        // Use Vietnamese language for better OCR accuracy
        const { data: { text } } = await TesseractLib.recognize(idCardImageBuffer, 'vie', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        console.log('OCR extracted text:', text);

        // Parse extracted text to find ID card information
        const idCardInfo = {
            idNumber: null,
            fullName: null,
            dateOfBirth: null,
            address: null
        };

        // Extract ID number (12 digits)
        const idNumberMatch = text.match(/\b\d{12}\b/);
        if (idNumberMatch) {
            idCardInfo.idNumber = idNumberMatch[0];
        }

        // Extract full name (usually after "Họ và tên:" or similar)
        const namePatterns = [
            /Họ và tên[:\s]+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]+)/i,
            /Họ tên[:\s]+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]+)/i,
        ];
        for (const pattern of namePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                idCardInfo.fullName = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Extract date of birth (format: DD/MM/YYYY or DD-MM-YYYY)
        const datePatterns = [
            /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/,
            /Ngày sinh[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
        ];
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const dateStr = match[1].replace(/-/g, '/');
                const [day, month, year] = dateStr.split('/');
                if (day && month && year) {
                    idCardInfo.dateOfBirth = new Date(`${year}-${month}-${day}`);
                    if (isNaN(idCardInfo.dateOfBirth.getTime())) {
                        idCardInfo.dateOfBirth = null;
                    }
                }
                break;
            }
        }

        // Extract address (usually after "Địa chỉ thường trú:" or similar)
        const addressPatterns = [
            /Địa chỉ thường trú[:\s]+([^\n]+(?:\n[^\n]+)*)/i,
            /Địa chỉ[:\s]+([^\n]+(?:\n[^\n]+)*)/i,
        ];
        for (const pattern of addressPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                idCardInfo.address = match[1].trim().replace(/\s+/g, ' ');
                // Limit address length
                if (idCardInfo.address.length > 200) {
                    idCardInfo.address = idCardInfo.address.substring(0, 200);
                }
                break;
            }
        }

        // Only return if at least one field was extracted
        if (idCardInfo.idNumber || idCardInfo.fullName || idCardInfo.dateOfBirth || idCardInfo.address) {
            return idCardInfo;
        }

        return null;
    } catch (error) {
        console.error('Error extracting ID card information:', error);
        return null;
    }
};

// Send OTP via Firebase Auth REST API
module.exports.sendOtpViaFirebase = async (req, res) => {
    try {
        const { phone, recaptchaToken } = req.body;
        
        if (!phone) {
            return res.status(400).json({ code: 400, message: "Thiếu số điện thoại" });
        }

        const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
        const usingEmulator = Boolean(emulatorHost);
        const apiKey = usingEmulator ? "dummy" : process.env.FIREBASE_WEB_API_KEY;
        
        console.log('Firebase configuration:', {
            emulatorHost,
            usingEmulator,
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey ? apiKey.length : 0
        });
        
        if (!apiKey) {
            return res.status(500).json({ 
                code: 500, 
                message: "Thiếu FIREBASE_WEB_API_KEY trong môi trường. Vui lòng kiểm tra cấu hình Firebase.",
                error: "Missing FIREBASE_WEB_API_KEY environment variable"
            });
        }

        const baseUrl = usingEmulator
            ? `http://${emulatorHost}/identitytoolkit.googleapis.com/v1`
            : `https://identitytoolkit.googleapis.com/v1`;

        const payload = usingEmulator
            ? { phoneNumber: phone }
            : { phoneNumber: phone, recaptchaToken };

        if (!usingEmulator && !recaptchaToken) {
            return res.status(400).json({ code: 400, message: "Thiếu recaptchaToken (production)" });
        }

        console.log('Sending OTP request to:', `${baseUrl}/accounts:sendVerificationCode?key=${apiKey}`);
        console.log('Payload:', payload);
        
        // Initialize fetch function
        const fetch = await initFetch();
        
        const response = await fetch(`${baseUrl}/accounts:sendVerificationCode?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            timeout: 30000 // 30 seconds timeout
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return res.status(400).json({ 
                code: 400, 
                message: data.error?.message || "Gửi OTP thất bại", 
                error: data
            });
        }
        
        return res.json({ 
            code: 200, 
            message: "Đã gửi OTP qua Firebase", 
            data: { sessionInfo: data.sessionInfo } 
        });
    } catch (error) {
        console.error('OTP sending error:', error);
        
        let errorMessage = "Lỗi khi gửi OTP";
        let statusCode = 500;
        
        if (error.message.includes('fetch failed')) {
            errorMessage = "Không thể kết nối đến dịch vụ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.";
            statusCode = 503; // Service Unavailable
        } else if (error.message.includes('timeout')) {
            errorMessage = "Yêu cầu gửi OTP quá thời gian chờ. Vui lòng thử lại.";
            statusCode = 408; // Request Timeout
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            errorMessage = "Không thể kết nối đến server xác thực. Vui lòng thử lại sau.";
            statusCode = 503;
        } else if (error.message.includes('Invalid API key')) {
            errorMessage = "Cấu hình API key không đúng. Vui lòng liên hệ quản trị viên.";
            statusCode = 500;
        }
        
        return res.status(statusCode).json({ 
            code: statusCode, 
            message: errorMessage, 
            error: error.message
        });
    }
}

// Verify OTP via Firebase Auth REST API, then mark user phone confirmed
module.exports.verifyOtpViaFirebase = async (req, res) => {
    try {
        const { sessionInfo, code } = req.body;
        if (!sessionInfo || !code) {
            return res.status(400).json({ code: 400, message: "Thiếu sessionInfo hoặc mã OTP" });
        }

        const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
        const usingEmulator = Boolean(emulatorHost); // Re-enable emulator detection
        const apiKey = usingEmulator ? "dummy" : process.env.FIREBASE_WEB_API_KEY;
        
        console.log('Firebase verification configuration:', {
            emulatorHost,
            usingEmulator,
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey ? apiKey.length : 0
        });
        
        if (!apiKey) {
            console.log('No Firebase API key found, using mock verification for development');
            
            // Mock verification for development
            const mockUserId = `mock_user_${Date.now()}`;
            const mockPhone = "0123456789"; // Default mock phone
            
            return res.json({ 
                code: 200, 
                message: "Xác minh OTP thành công (Mock Mode)", 
                data: { 
                    phone: mockPhone, 
                    userId: mockUserId,
                    isPhoneConfirmed: true
                },
                warning: "Đang sử dụng mock verification cho development. Vui lòng cấu hình Firebase để sử dụng thật."
            });
        }

        const baseUrl = usingEmulator
            ? `http://${emulatorHost}/identitytoolkit.googleapis.com/v1`
            : `https://identitytoolkit.googleapis.com/v1`;

        // Initialize fetch function
        const fetch = await initFetch();
        
        const response = await fetch(`${baseUrl}/accounts:signInWithPhoneNumber?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionInfo, code })
        });
        const data = await response.json();
        if (!response.ok) {
            return res.status(400).json({ code: 400, message: data.error?.message || "Xác minh OTP thất bại", error: data });
        }

        // Verify ID token and update user phone confirmation status
        let admin, decoded, phoneNumber;
        
        try {
            admin = getAdmin();
            decoded = await admin.auth().verifyIdToken(data.idToken);
            phoneNumber = decoded.phone_number;
        } catch (adminError) {
            console.error('Firebase Admin SDK error:', adminError);
            return res.status(500).json({ 
                code: 500, 
                message: "Lỗi xác thực Firebase Admin SDK. Vui lòng kiểm tra cấu hình Firebase.",
                error: adminError.message
            });
        }

        if (!phoneNumber) {
            return res.status(400).json({ 
                code: 400, 
                message: "ID token không chứa số điện thoại" 
            });
        }

        // Format phone number to Vietnamese format
        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Validate phone number format
        if (!validateVietnamesePhoneNumber(formattedPhone)) {
            return res.status(400).json({ 
                code: 400, 
                message: "Số điện thoại không đúng định dạng Việt Nam" 
            });
        }

        // Get userId from request (should be authenticated user)
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ 
                code: 401, 
                message: "User chưa đăng nhập. Vui lòng đăng nhập trước khi xác minh" 
            });
        }

        // Update user in database with phone number and confirmation status
        try {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { 
                    phone: formattedPhone,
                    isPhoneConfirmed: true
                },
                { new: true }
            );

            if (!updatedUser) {
                return res.status(404).json({ 
                    code: 404, 
                    message: "Không tìm thấy người dùng" 
                });
            }

            return res.json({ 
                code: 200, 
                message: "Xác minh số điện thoại thành công", 
                data: { 
                    phone: formattedPhone, 
                    userId: updatedUser._id,
                    isPhoneConfirmed: updatedUser.isPhoneConfirmed,
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
        
        if (error.message.includes('fetch failed')) {
            errorMessage = "Không thể kết nối đến dịch vụ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.";
            statusCode = 503;
        } else if (error.message.includes('timeout')) {
            errorMessage = "Yêu cầu xác minh OTP quá thời gian chờ. Vui lòng thử lại.";
            statusCode = 408;
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            errorMessage = "Không thể kết nối đến server xác thực. Vui lòng thử lại sau.";
            statusCode = 503;
        } else if (error.message.includes('Invalid API key')) {
            errorMessage = "Cấu hình API key không đúng. Vui lòng liên hệ quản trị viên.";
            statusCode = 500;
        } else if (error.message.includes('Firebase Admin credentials')) {
            errorMessage = "Cấu hình Firebase Admin SDK không đúng. Vui lòng kiểm tra environment variables.";
            statusCode = 500;
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

module.exports.confirmPhoneWithFirebaseIdToken = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ code: 400, message: "Thiếu Firebase ID token" });
        }

        const admin = getAdmin();
        const decoded = await admin.auth().verifyIdToken(idToken);
        // decoded.phone_number is present if user signed in with phone
        const phoneNumber = decoded.phone_number;
        if (!phoneNumber) {
            return res.status(400).json({ code: 400, message: "ID token không chứa số điện thoại" });
        }

        // Format phone number to Vietnamese format
        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Validate phone number format
        if (!validateVietnamesePhoneNumber(formattedPhone)) {
            return res.status(400).json({ 
                code: 400, 
                message: "Số điện thoại không đúng định dạng Việt Nam" 
            });
        }

        // Get userId from request (should be authenticated user)
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ 
                code: 401, 
                message: "User chưa đăng nhập. Vui lòng đăng nhập trước khi xác minh" 
            });
        }

        // Update user in database with phone number and confirmation status
        try {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { 
                    phone: formattedPhone,
                    isPhoneConfirmed: true
                },
                { new: true }
            );

            if (!updatedUser) {
                return res.status(404).json({ 
                    code: 404, 
                    message: "Không tìm thấy người dùng" 
                });
            }

            return res.json({ 
                code: 200, 
                message: "Xác minh số điện thoại (Firebase) thành công", 
                data: { 
                    phone: formattedPhone,
                    userId: updatedUser._id,
                    isPhoneConfirmed: updatedUser.isPhoneConfirmed,
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
        return res.status(500).json({ code: 500, message: "Xác minh Firebase ID token thất bại", error: error.message });
    }
}

// Extract ID card information from images using OCR (no face verification)
module.exports.verifyFaceImages = async (req, res) => {
    try {
        // Check if files are uploaded
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({ 
                code: 400, 
                message: "Vui lòng upload đủ 3 ảnh: ảnh chân dung, mặt trước căn cước, mặt sau căn cước" 
            });
        }

        // Get userId from authenticated user
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ 
                code: 401, 
                message: "User chưa đăng nhập. Vui lòng đăng nhập trước khi xác minh" 
            });
        }

        const files = req.files;
        const userImageFile = files[0]; // Ảnh chân dung người dùng
        const idCardFrontFile = files[1]; // Mặt trước căn cước
        const idCardBackFile = files[2]; // Mặt sau căn cước

        if (!userImageFile || !idCardFrontFile || !idCardBackFile) {
            return res.status(400).json({ 
                code: 400, 
                message: "Thiếu ảnh. Vui lòng upload đủ 3 ảnh" 
            });
        }

        // Extract ID card information from front image using OCR
        let extractedIdCardInfo = null;
        try {
            extractedIdCardInfo = await extractIdCardInfo(idCardFrontFile.buffer);
            if (extractedIdCardInfo) {
                console.log('Extracted ID card information:', extractedIdCardInfo);
            } else {
                console.log('Could not extract ID card information from OCR.');
            }
        } catch (ocrError) {
            console.error('Error extracting ID card info with OCR:', ocrError);
            // Continue without OCR - user can enter manually
        }

        // Upload files to Cloudinary in user-documents folder
        let uploadedFiles = [];
        try {
            uploadedFiles = await uploadToCloudinary(files, "retrotrade/user-documents/");
            console.log('Files uploaded to Cloudinary:', uploadedFiles);
            
            if (!uploadedFiles || uploadedFiles.length !== 3) {
                return res.status(400).json({
                    code: 400,
                    message: "Lỗi khi upload ảnh. Vui lòng thử lại"
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

        // Prepare documents array to save
        const documentTypes = ['selfie', 'idCardFront', 'idCardBack'];
        const documents = uploadedFiles.map((file, index) => {
            return {
                documentType: documentTypes[index] || 'document',
                documentNumber: `DOC-${Date.now()}-${index}`,
                fileUrl: file.Url,
                status: 'approved',
                submittedAt: new Date()
            };
        });

        // Prepare update object
        const updateData = {
            isIdVerified: true,
            $push: { documents: { $each: documents } }
        };

        // Add ID card information if extracted
        if (extractedIdCardInfo) {
            updateData.idCardInfo = {
                idNumber: extractedIdCardInfo.idNumber || null,
                fullName: extractedIdCardInfo.fullName || null,
                dateOfBirth: extractedIdCardInfo.dateOfBirth ? new Date(extractedIdCardInfo.dateOfBirth) : null,
                address: extractedIdCardInfo.address || null,
                extractedAt: new Date(),
                extractionMethod: 'ocr'
            };
        }

        // Update user with ID verification and save documents
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ 
                code: 404, 
                message: "Không tìm thấy người dùng" 
            });
        }

        console.log('User ID verification updated successfully:', updatedUser._id);

        // Send notification to user
        try {
            await createNotification(
                userId,
                "Identity Verified",
                "Xác minh danh tính thành công",
                `Xin chào ${updatedUser.fullName || 'bạn'}, danh tính của bạn đã được xác minh thành công vào lúc ${new Date().toLocaleString("vi-VN")}.`,
                { 
                    verificationTime: new Date().toISOString(),
                    documentTypes: documentTypes
                }
            );
        } catch (notificationError) {
            console.error("Error creating identity verification notification:", notificationError);
        }

        // Prepare response data
        const responseData = {
            isMatch: true, // Always true since we're not doing face verification
            similarityPercentage: 100, // Not applicable, but keeping for compatibility
            userId: updatedUser._id,
            isIdVerified: updatedUser.isIdVerified,
            documents: updatedUser.documents || [],
            extractedIdCardInfo: extractedIdCardInfo ? {
                idNumber: extractedIdCardInfo.idNumber,
                fullName: extractedIdCardInfo.fullName,
                dateOfBirth: extractedIdCardInfo.dateOfBirth ? extractedIdCardInfo.dateOfBirth.toISOString() : null,
                address: extractedIdCardInfo.address
            } : null
        };

        // Include extracted ID card information
        if (updatedUser.idCardInfo) {
            responseData.idCardInfo = {
                idNumber: updatedUser.idCardInfo.idNumber,
                fullName: updatedUser.idCardInfo.fullName,
                dateOfBirth: updatedUser.idCardInfo.dateOfBirth,
                address: updatedUser.idCardInfo.address,
                extractionMethod: updatedUser.idCardInfo.extractionMethod
            };
        }

        return res.json({
            code: 200,
            message: "Xác minh danh tính thành công",
            data: responseData
        });

    } catch (error) {
        console.error('ID verification error:', error);
        return res.status(500).json({ 
            code: 500, 
            message: "Lỗi khi xác minh danh tính", 
            error: error.message 
        });
    }
};

