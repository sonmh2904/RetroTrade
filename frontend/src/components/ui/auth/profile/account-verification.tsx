"use client";
import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { PhoneVerification } from '@/components/ui/auth/verify/PhoneVerification';
import OTPInput from '@/components/ui/auth/verify/OTPInput';
import ImageUpload from '@/components/ui/auth/verify/ImageUpload';
import ResultDisplay from '@/components/ui/auth/verify/ResultDisplay';
import { FaceVerificationResponse } from '@/services/auth/faceVerification.api';
import VerificationScript from '@/components/ui/auth/verify/VerificationScript';
import { sendOtpFirebase, verifyOtpFirebase } from '@/services/auth/auth.api';

type AccountVerificationProps = { className?: string };

export function AccountVerification({ className }: AccountVerificationProps) {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [sessionInfo, setSessionInfo] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedStep, setFailedStep] = useState<number | null>(null);

  // Prepare reCAPTCHA container
  useEffect(() => {
    const containerId = 'recaptcha-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }
  }, []);

  const formatPhoneNumber = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) return '+84' + digits.substring(1);
    if (digits.startsWith('84')) return '+' + digits;
    if (phone.startsWith('+')) return phone;
    return '+84' + digits;
  };

  const handleSendOTP = async () => {
    try {
      setIsLoading(true);
      const formatted = formatPhoneNumber(phoneNumber);
      const resp = await sendOtpFirebase(formatted, undefined);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || 'Send OTP failed');
      setSessionInfo(data?.data?.sessionInfo || '');
      setStep(2);
      setFailedStep(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra khi gửi OTP');
      setFailedStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setIsLoading(true);
      const resp = await verifyOtpFirebase(sessionInfo, otp);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || 'Verify OTP failed');
      setStep(3);
      setFailedStep(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra khi xác minh OTP');
      setFailedStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVerification = async (verificationResult?: FaceVerificationResponse) => {
    try {
      setIsLoading(true);
      if (verificationResult) {
        const { extractedIdCardInfo, requestId, verificationRequestSubmitted, autoRejected, rejectionReason } = verificationResult.data || {};
        
        // Check if request was auto-rejected due to OCR failure
        if (autoRejected) {
          setResult({
            success: false,
            message: 'Yêu cầu xác minh bị từ chối tự động',
            details: rejectionReason || 'Hệ thống không thể đọc được thông tin từ ảnh căn cước công dân. Vui lòng chụp lại ảnh rõ nét hơn hoặc đảm bảo ảnh không bị mờ, không bị che khuất thông tin.'
          });
          setFailedStep(3);
        } else if (verificationRequestSubmitted || requestId) {
          setResult({
            success: true,
            message: 'Yêu cầu xác minh đã được gửi thành công',
            details: 'Yêu cầu xác minh danh tính của bạn đã được gửi thành công. Moderator sẽ xử lý trong thời gian sớm nhất. Bạn sẽ nhận được thông báo khi có kết quả.'
          });
        } else if (extractedIdCardInfo && 
          extractedIdCardInfo.idNumber && 
          extractedIdCardInfo.fullName && 
          extractedIdCardInfo.dateOfBirth && 
          extractedIdCardInfo.address) {
          setResult({
            success: true,
            message: 'Yêu cầu xác minh đã được gửi',
            details: 'Yêu cầu xác minh đã được gửi với thông tin căn cước công dân đã được đọc tự động. Moderator sẽ xử lý trong thời gian sớm nhất.'
          });
        } else {
          setResult({
            success: true,
            message: 'Yêu cầu xác minh đã được gửi',
            details: 'Yêu cầu xác minh đã được gửi thành công. Moderator sẽ xử lý trong thời gian sớm nhất.'
          });
        }
      } else {
        setResult({ success: false, message: 'Không có kết quả xác minh', details: 'Vui lòng thử lại.' });
      }
      setStep(4);
      setFailedStep(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra khi xử lý ảnh');
      setFailedStep(3);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));
  const handleRestart = () => {
    setStep(1);
    setPhoneNumber('');
    setOtp('');
    setImages([]);
    setSessionInfo('');
    setResult(null);
    setError('');
    setFailedStep(null);
  };

  return (
    <div className={className}>
      {/* Firebase compat scripts for inline verification */}
      <Script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js" strategy="afterInteractive" />
      <Script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js" strategy="afterInteractive" />
      <div id="recaptcha-container" />

      {/* Inline quick guide */}
      <div className="mb-4">
        <VerificationScript />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Xác minh tài khoản</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}

        {step === 1 && (
          <PhoneVerification
            onSuccess={handleSendOTP}
          />
        )}

        {step === 2 && (
          <OTPInput
            otp={otp}
            setOtp={setOtp}
            onNext={handleVerifyOTP}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}

        {step === 3 && (
          <ImageUpload
            images={images}
            setImages={setImages}
            onNext={handleSubmitVerification}
            onBack={handleBack}
            isLoading={isLoading}
            phoneNumber={phoneNumber}
          />
        )}

        {step === 4 && (
          <ResultDisplay
            result={result}
            onRestart={handleRestart}
            onRetryStep={(s) => setStep(s)}
            failedStep={failedStep}
          />
        )}
      </div>
    </div>
  );
}


