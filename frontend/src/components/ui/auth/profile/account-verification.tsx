"use client";
import React, { useState, useEffect } from 'react';
import { PhoneVerification } from '@/components/ui/auth/verify/PhoneVerification';
import ImageUpload from '@/components/ui/auth/verify/ImageUpload';
import ResultDisplay from '@/components/ui/auth/verify/ResultDisplay';
import { FaceVerificationResponse } from '@/services/auth/faceVerification.api';
import VerificationScript from '@/components/ui/auth/verify/VerificationScript';
import PopupModal from '@/components/ui/common/PopupModal';
import { verificationRequestAPI } from '@/services/auth/verificationRequest.api';

type AccountVerificationProps = { className?: string };

export function AccountVerification({ className }: AccountVerificationProps) {
  const [step, setStep] = useState(1); // Bắt đầu từ step 1 (PhoneVerification)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string; status?: 'success' | 'warning' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedStep, setFailedStep] = useState<number | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isCheckingPending, setIsCheckingPending] = useState(true);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Kiểm tra yêu cầu xác minh đang chờ khi component mount
  useEffect(() => {
    const checkPendingRequest = async () => {
      try {
        setIsCheckingPending(true);
        // Kiểm tra cả Pending và In Progress
        const [pendingResponse, inProgressResponse] = await Promise.all([
          verificationRequestAPI.getMyVerificationRequests({ status: 'Pending' }),
          verificationRequestAPI.getMyVerificationRequests({ status: 'In Progress' })
        ]);
        
        const pendingRequests = pendingResponse.data || [];
        const inProgressRequests = inProgressResponse.data || [];
        
        if (pendingRequests.length > 0 || inProgressRequests.length > 0) {
          setHasPendingRequest(true);
          setShowPendingModal(true);
        }
      } catch (error) {
        console.error('Error checking pending request:', error);
        // Không block user nếu check fail
      } finally {
        setIsCheckingPending(false);
      }
    };

    checkPendingRequest();
  }, []);

  // Callback khi PhoneVerification hoàn thành (đã xác minh số điện thoại + OTP)
  const handlePhoneVerified = (verifiedPhone: string) => {
    setPhoneNumber(verifiedPhone);
    setError('');
    setFailedStep(null);
    setStep(2); // Chuyển sang bước xác minh CCCD
  };

  const handleSubmitVerification = async (verificationResult?: FaceVerificationResponse) => {
    try {
      setIsLoading(true);
      if (verificationResult) {
        const { 
          extractedIdCardInfo, 
          requestId, 
          verificationRequestSubmitted, 
          autoRejected, 
          autoApproved,
          rejectionReason,
          similarity,
          isFullyVerified,
          requiresModeratorReview,
          hasPendingRequest
        } = verificationResult.data || {};
        
        // Check if user has pending request
        if (hasPendingRequest) {
          setResult({
            success: false,
            message: 'Bạn đã có yêu cầu xác minh đang chờ xử lý',
            details: verificationResult.message || 'Bạn đã có yêu cầu xác minh đang chờ kiểm duyệt viên xử lý. Vui lòng kiểm tra lịch sử xác minh hoặc chờ kiểm duyệt viên xử lý.'
          });
          setFailedStep(2);
        }
        // Check if auto-approved (from auto verification mode)
        else if (autoApproved) {
          const similarityText = similarity ? ` Độ tương đồng khuôn mặt: ${similarity.toFixed(2)}%.` : '';
          const fullyVerifiedText = isFullyVerified 
            ? ' Tài khoản của bạn đã được xác minh đầy đủ (số điện thoại và căn cước công dân).'
            : '';
          
          setResult({
            success: true,
            message: 'Xác minh thành công!',
            details: `Yêu cầu xác minh của bạn đã được duyệt tự động.${similarityText}${fullyVerifiedText}`
          });
        }
        // Check if request was auto-rejected due to OCR failure
        else if (autoRejected) {
          setResult({
            success: false,
            message: 'Yêu cầu xác minh bị từ chối tự động',
            details: rejectionReason || 'Hệ thống không thể đọc được thông tin từ ảnh căn cước công dân. Vui lòng chụp lại ảnh rõ nét hơn hoặc đảm bảo ảnh không bị mờ, không bị che khuất thông tin.'
          });
          setFailedStep(2);
        } 
        // Auto verification failed, sent to moderator
        else if (requiresModeratorReview) {
          const { switchedToManualVerification, manualVerificationMessage } = verificationResult.data || {};
          
          let detailsMessage = '';
          if (switchedToManualVerification && manualVerificationMessage) {
            // Show similarity first if available, then rejection reason, then manual verification message
            const similarityText = similarity !== undefined && similarity !== null 
              ? `Độ tương đồng khuôn mặt: ${similarity.toFixed(2)}%.` 
              : '';
            const rejectionText = rejectionReason ? `\n\nLý do: ${rejectionReason}.` : '';
            // Replace "moderator" with "kiểm duyệt viên" in manualVerificationMessage
            const updatedManualMessage = manualVerificationMessage.replace(/moderator/gi, 'kiểm duyệt viên').replace(/Moderator/gi, 'Kiểm duyệt viên');
            detailsMessage = `${similarityText}${rejectionText}\n\n${updatedManualMessage} Kiểm duyệt viên sẽ xử lý trong thời gian sớm nhất.`;
          } else {
            // Fallback to old message format
            const similarityText = similarity !== undefined && similarity !== null 
              ? `\n\nĐộ tương đồng khuôn mặt: ${similarity.toFixed(2)}% (dưới ngưỡng 50%).` 
              : '';
            const rejectionText = rejectionReason ? `\n\nLý do: ${rejectionReason}.` : '';
            detailsMessage = `Yêu cầu xác minh của bạn đã được gửi cho kiểm duyệt viên xử lý.${similarityText}${rejectionText}\n\nKiểm duyệt viên sẽ xử lý trong thời gian sớm nhất.`;
          }
          
          setResult({
            success: false, // Set to false so it shows as warning (not success)
            status: 'warning', // Explicitly set warning status
            message: switchedToManualVerification 
              ? 'Đã chuyển sang xác minh bán tự động'
              : 'Yêu cầu xác minh đã được gửi',
            details: detailsMessage
          });
        }
        // Manual verification: sent to moderator
        else if (verificationRequestSubmitted || requestId) {
          setResult({
            success: true,
            message: 'Yêu cầu xác minh đã được gửi thành công',
            details: 'Yêu cầu xác minh danh tính của bạn đã được gửi thành công. Kiểm duyệt viên sẽ xử lý trong thời gian sớm nhất. Bạn sẽ nhận được thông báo khi có kết quả.'
          });
        } else if (extractedIdCardInfo && 
          extractedIdCardInfo.idNumber && 
          extractedIdCardInfo.fullName && 
          extractedIdCardInfo.dateOfBirth) {
          setResult({
            success: true,
            message: 'Yêu cầu xác minh đã được gửi',
            details: 'Yêu cầu xác minh đã được gửi với thông tin căn cước công dân đã được đọc tự động. Kiểm duyệt viên sẽ xử lý trong thời gian sớm nhất.'
          });
        } else {
          setResult({
            success: true,
            message: 'Yêu cầu xác minh đã được gửi',
            details: 'Yêu cầu xác minh đã được gửi thành công. Kiểm duyệt viên sẽ xử lý trong thời gian sớm nhất.'
          });
        }
      } else {
        setResult({ success: false, message: 'Không có kết quả xác minh', details: 'Vui lòng thử lại.' });
      }
      setStep(3);
      setFailedStep(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra khi xử lý ảnh');
      setFailedStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));
  const handleRestart = () => {
    setStep(1); // Bắt đầu lại từ step 1 (PhoneVerification)
    setPhoneNumber('');
    setImages([]);
    setResult(null);
    setError('');
    setFailedStep(null);
  };

  return (
    <div className={className}>
      <VerificationScript />

      {/* PopupModal thông báo đã có yêu cầu xác minh đang chờ */}
      <PopupModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        type="info"
        title="Yêu cầu xác minh đang chờ xử lý"
        message="Bạn đã có yêu cầu xác minh đang chờ kiểm duyệt viên xử lý. Vui lòng kiểm tra lịch sử xác minh hoặc chờ kiểm duyệt viên xử lý trước khi tạo yêu cầu mới."
        buttonText="Đã hiểu"
      />

      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${hasPendingRequest ? 'opacity-50 pointer-events-none' : ''}`}>
        {isCheckingPending && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-600">
            Đang kiểm tra trạng thái xác minh...
          </div>
        )}

        <h2 className="text-lg font-semibold text-gray-900 mb-4">Xác minh tài khoản</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {step === 1 && (
          <PhoneVerification 
            onSuccess={handlePhoneVerified}
            title="Xác minh số điện thoại"
            description="Nhập số điện thoại và mã OTP để xác minh"
          />
        )}

        {step === 2 && (
          <ImageUpload
            images={images}
            setImages={setImages}
            onNext={handleSubmitVerification}
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
      </div>
    </div>
  );
}


