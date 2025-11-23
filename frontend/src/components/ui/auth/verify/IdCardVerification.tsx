"use client";

import { useState } from 'react';
import ImageUpload from '@/components/ui/auth/verify/ImageUpload';
import ResultDisplay from '@/components/ui/auth/verify/ResultDisplay';
import { FaceVerificationResponse } from '@/services/auth/faceVerification.api';
import { Card, CardContent, CardHeader, CardTitle } from '../../common/card';
import { Shield, CreditCard } from 'lucide-react';

interface IdCardVerificationProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

export function IdCardVerification({
  onSuccess,
  onCancel,
  title = "Xác minh căn cước công dân",
  description = "Tải lên ảnh mặt trước và mặt sau căn cước công dân",
  className
}: IdCardVerificationProps) {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<File[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedStep, setFailedStep] = useState<number | null>(null);

  const handleSubmitVerification = async (verificationResult?: FaceVerificationResponse) => {
    try {
      setIsLoading(true);
      setError('');
      setFailedStep(null);
      
      if (verificationResult) {
        const { extractedIdCardInfo, requestId, verificationRequestSubmitted, autoRejected, rejectionReason } = verificationResult.data || {};
        
        // Check if request was auto-rejected due to OCR failure
        if (autoRejected) {
          setResult({
            success: false,
            message: 'Yêu cầu xác minh bị từ chối tự động',
            details: rejectionReason || 'Hệ thống không thể đọc được thông tin từ ảnh căn cước công dân. Vui lòng chụp lại ảnh rõ nét hơn hoặc đảm bảo ảnh không bị mờ, không bị che khuất thông tin.'
          });
          setFailedStep(1);
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
        setResult({ 
          success: false, 
          message: 'Không có kết quả xác minh', 
          details: 'Vui lòng thử lại.' 
        });
      }
      
      setStep(2);
      
      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra khi xử lý ảnh');
      setFailedStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1 && onCancel) {
      onCancel();
    } else if (step === 2) {
      setStep(1);
      setResult(null);
      setError('');
      setFailedStep(null);
    }
  };

  const handleRestart = () => {
    setStep(1);
    setImages([]);
    setResult(null);
    setError('');
    setFailedStep(null);
  };

  const steps = [
    { id: 1, title: "Tải ảnh xác minh", description: "Tải lên ảnh mặt trước và mặt sau CCCD" },
    { id: 2, title: "Kết quả", description: "Kết quả xác minh danh tính" },
  ];

  return (
    <div className={className}>
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            {title}
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">{description}</p>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
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
            <ImageUpload
              images={images}
              setImages={setImages}
              onNext={handleSubmitVerification}
              onBack={handleBack}
              isLoading={isLoading}
              phoneNumber="" // Not needed for ID card verification
            />
          )}

          {step === 2 && (
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

