"use client";

import { useState } from 'react';
import PhoneInput from "./PhoneInput";
import OTPInput from "./OTPInput";
import ResultDisplay from "./ResultDisplay";
import { sendOtp, verifyOtp } from '@/services/auth/auth.api';
import { Card, CardContent, CardHeader, CardTitle } from '../../common/card';
import { Phone } from 'lucide-react';

interface PhoneVerificationProps {
  onSuccess?: (phoneNumber: string) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

export function PhoneVerification({ 
  onSuccess, 
  onCancel,
  title = "Xác minh số điện thoại",
  description = "Nhập số điện thoại và mã OTP để xác minh",
  className 
}: PhoneVerificationProps) {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedStep, setFailedStep] = useState<number | null>(null);

  const formatPhoneNumber = (phone: string): string => {
    if (!phone || phone.trim() === '') {
      throw new Error('Vui lòng nhập số điện thoại');
    }

    const digits = phone.replace(/\D/g, '');
    
    // Validate minimum length (Vietnamese phone: 9-10 digits)
    if (digits.length < 9) {
      throw new Error('Số điện thoại phải có ít nhất 9 chữ số');
    }

    if (digits.startsWith('0')) {
      const phoneWithoutZero = digits.substring(1);
      if (phoneWithoutZero.length < 9) {
        throw new Error('Số điện thoại không hợp lệ');
      }
      return '+84' + phoneWithoutZero;
    }
    if (digits.startsWith('84')) {
      const phoneWithoutCountryCode = digits.substring(2);
      if (phoneWithoutCountryCode.length < 9) {
        throw new Error('Số điện thoại không hợp lệ');
      }
      return '+' + digits;
    }
    if (phone.startsWith('+')) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        throw new Error('Số điện thoại không hợp lệ');
      }
      return phone;
    }
    
    if (digits.length < 9) {
      throw new Error('Số điện thoại không hợp lệ');
    }
    return '+84' + digits;
  };

  const handleSendOTP = async () => {
    try {
      setIsLoading(true);
      setError('');
      setFailedStep(null);
      
      if (!phoneNumber || phoneNumber.trim() === '') {
        throw new Error('Vui lòng nhập số điện thoại');
      }

      const formatted = formatPhoneNumber(phoneNumber);
      console.log('Formatted phone:', formatted); // Debug log

      const resp = await sendOtp(formatted);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || 'Send OTP failed');
      setStep(2);
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
      setError('');
      setFailedStep(null);
      const formatted = formatPhoneNumber(phoneNumber);
      const resp = await verifyOtp(formatted, otp);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || 'Verify OTP failed');
      
      // Backend automatically updates phone and isPhoneConfirmed after OTP verification
      const verifiedPhone = data?.data?.phone || formatPhoneNumber(phoneNumber);
      
      setResult({
        success: true,
        message: 'Xác minh số điện thoại thành công',
        details: `Số điện thoại ${verifiedPhone} đã được xác minh và cập nhật thành công.`
      });
      setStep(3);
      
      // Call onSuccess callback
      if (onSuccess) {
        onSuccess(verifiedPhone);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra khi xác minh OTP');
      setFailedStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setOtp('');
      setError('');
      setFailedStep(null);
    } else if (step === 3 && onCancel) {
      onCancel();
    }
  };

  const handleRestart = () => {
    setStep(1);
    setPhoneNumber('');
    setOtp('');
    setResult(null);
    setError('');
    setFailedStep(null);
  };

  const steps = [
    { id: 1, title: "Nhập số điện thoại", description: "Nhập số điện thoại Việt Nam để nhận mã OTP" },
    { id: 2, title: "Nhập mã OTP", description: "Nhập mã xác thực 6 chữ số" },
    { id: 3, title: "Kết quả", description: "Kết quả xác minh số điện thoại" },
  ];

  return (
    <div className={className}>

      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            {title}
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">{description}</p>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(step / steps.length) * 100}%` }}
              ></div>
            </div>
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-700">
                Bước {step}: {steps[step - 1].title}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {step === 1 && (
            <PhoneInput
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              onNext={handleSendOTP}
              isLoading={isLoading}
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
            <ResultDisplay
              result={result}
              onRestart={handleRestart}
              onRetryStep={(s) => setStep(s)}
              failedStep={failedStep}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

