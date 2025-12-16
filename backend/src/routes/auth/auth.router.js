const express = require("express")
const router = express.Router()

const userAuthController = require("../../controller/auth/auth.controller")
const verifyController = require("../../controller/auth/verify.controller")
const complaintController = require("../../controller/auth/complaint.controller")
const profileRouter = require("./profile.router")
const { upload } = require("../../middleware/upload.middleware")
const { authenticateToken } = require("../../middleware/auth")

router.post('/login', userAuthController.login);
router.post('/register', userAuthController.register);
router.post('/resend-otp', userAuthController.resendOtp);
router.post('/verify-email', userAuthController.verifyEmail);
router.post('/request-forgot-password', userAuthController.requestForgotPassword);
router.post('/forgot-password-otp', userAuthController.forgotPasswordOTP);
router.post('/forgot-password', userAuthController.forgotPassword);
router.post('/refresh-token', userAuthController.refreshToken);
router.post('/login-with-google', userAuthController.loginWithGoogle);
router.post('/login-with-facebook', userAuthController.loginWithFacebook);
router.get('/facebook/callback', userAuthController.handleFacebookCallback);

// Complaint route (public - for banned users)
router.post('/complaint', complaintController.submitComplaint);

// Phone verification via Twilio
router.post('/phone/send-otp', authenticateToken, verifyController.sendOtpViaTwilio);
router.post('/phone/verify-otp', authenticateToken, verifyController.verifyOtpViaTwilio);

// ID card OCR preview (1 image: idCardFront) - only extracts info, doesn't create request
router.post('/verify-face/preview-ocr', authenticateToken, upload.single('image'), verifyController.previewIdCardOcr);

// ID card verification using OCR with file upload (3 images: idCardFront, idCardBack, userPhoto)
// Manual verification: sends request to moderator
router.post('/verify-face', authenticateToken, upload.array('images', 3), verifyController.verifyFaceImages);

// Auto verification: compares faces and auto-approves if similarity > 50%
router.post('/verify-face/auto', authenticateToken, upload.array('images', 3), verifyController.verifyFaceImagesAuto);

// Verification request routes
const verificationRequestController = require("../../controller/auth/verificationRequest.controller");
router.post('/verification-request', authenticateToken, upload.array('images', 2), verificationRequestController.createVerificationRequest);
router.get('/verification-request/my', authenticateToken, verificationRequestController.getMyVerificationRequests);
router.get('/verification-request/:id', authenticateToken, verificationRequestController.getMyVerificationRequestById);

// Profile routes (bao gồm avatar)
router.use('/profile', profileRouter);

module.exports = router;