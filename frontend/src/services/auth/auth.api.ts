import instance from "../customizeAPI";
import type { ApiResponse, LoginResponseData, UpdateProfileRequest, UpdateAvatarRequest } from "@iService";

// Authentication API functions
export const login = async (email: string, password: string): Promise<Response> => {
    return await instance.post("/auth/login", { email, password });
};

export const register = async (email: string, password: string, fullName: string): Promise<Response> => {
    return await instance.post("/auth/register", { email, password, fullName });
};

export const verifyEmail = async (email: string, otp: string): Promise<Response> => {
    return await instance.post("/auth/verify-email", { email, otp });
};

export const resendOtp = async (email: string): Promise<Response> => {
    return await instance.post("/auth/resend-otp", { email });
};

export const requestForgotPassword = async (email: string): Promise<Response> => {
    return await instance.post("/auth/request-forgot-password", { email });
};

export const forgotPasswordOtp = async (email: string, otp: string): Promise<Response> => {
    return await instance.post("/auth/forgot-password-otp", { email, otp });
};

export const forgotPassword = async (email: string, password: string): Promise<Response> => {
    return await instance.post("/auth/forgot-password", { email, password });
};

export const refreshToken = async (refreshToken: string): Promise<Response> => {
    return await instance.post("/auth/refresh-token", { refreshToken });
};

export const getUserProfile = async (): Promise<Response> => {
    return await instance.get("/auth/profile");
};

export const updateUserProfile = async (payload: UpdateProfileRequest): Promise<Response> => {
    return await instance.put("/auth/profile", payload);
};

export const updateUserAvatar = async (payload: UpdateAvatarRequest): Promise<Response> => {
    return await instance.put("/auth/profile/avatar", payload);
};


export const loginWithGoogle = async (
    payload: { email: string; avatarUrl?: string; fullName?: string }
): Promise<Response> => {
    return await instance.post("/auth/login-with-google", payload);
};

export const loginWithFacebook = async (
    payload: { email: string; avatarUrl?: string; fullName?: string }
): Promise<Response> => {
    return await instance.post("/auth/login-with-facebook", payload);
};

// Twilio Phone Auth OTP endpoints (recommended)
export const sendOtp = async (phone: string): Promise<Response> => {
    return await instance.post("/auth/phone/send-otp", { phone });
};

export const verifyOtp = async (phone: string, code: string): Promise<Response> => {
    return await instance.post("/auth/phone/verify-otp", { phone, code });
};

// Firebase Phone Auth OTP endpoints (deprecated - use Twilio instead)
export const sendOtpFirebase = async (phone: string, recaptchaToken?: string): Promise<Response> => {
    return await instance.post("/auth/phone/send-otp-firebase", { phone, recaptchaToken });
};

export const verifyOtpFirebase = async (sessionInfo: string, code: string): Promise<Response> => {
    return await instance.post("/auth/phone/verify-otp-firebase", { sessionInfo, code });
};

export const confirmPhoneFirebase = async (idToken: string): Promise<Response> => {
    return await instance.post("/auth/phone/confirm-firebase", { idToken });
};

// Signature CRUD API functions
export const saveSignature = async (signatureData: string): Promise<Response> => {
    return await instance.post("/signature", { signatureData });
};

export const getSignature = async (): Promise<Response> => {
    return await instance.get("/signature");
};

export const deleteSignature = async (): Promise<Response> => {
    return await instance.delete("/signature");
};