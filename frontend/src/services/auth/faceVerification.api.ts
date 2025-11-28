import api from '../customizeAPI';

export interface FaceVerificationRequest {
  images: File[]; // Array of files (front ID card, back ID card)
}

export interface ExtractedIdCardInfo {
  idNumber?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
}

export interface FaceVerificationResponse {
  code: number;
  message: string;
  data: {
    isMatch?: boolean;
    similarityPercentage?: number;
    similarity?: number;
    distance?: number;
    threshold?: number;
    userFacesDetected?: number;
    idCardFacesDetected?: number;
    userFaceDetected?: boolean;
    extractedIdCardInfo?: ExtractedIdCardInfo | null;
    uploadedFiles?: Array<{
      Url: string;
      IsPrimary: boolean;
      Ordinal: number;
      AltText: string;
    }>;
    userId?: string;
    requestId?: string;
    idCardInfo?: {
      idNumber?: string;
      fullName?: string;
      dateOfBirth?: string;
      extractionMethod?: string;
    };
    autoRejected?: boolean;
    autoApproved?: boolean;
    rejectionReason?: string;
    verificationRequestSubmitted?: boolean;
    requiresModeratorReview?: boolean;
    isFullyVerified?: boolean;
    hasPendingRequest?: boolean;
    switchedToManualVerification?: boolean;
    manualVerificationMessage?: string;
  };
}

export const faceVerificationAPI = {
  /**
   * Preview OCR extraction from ID card image (does not create request)
   * @param image Front ID card image file
   * @returns Promise with extracted ID card info
   */
  previewIdCardOcr: async (
    image: File
  ): Promise<{ code: number; message: string; data: { extractedIdCardInfo: ExtractedIdCardInfo | null } }> => {
    try {
      const formData = new FormData();
      formData.append('image', image);

      const response = await api.post('/auth/verify-face/preview-ocr', formData);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Lỗi khi đọc thông tin từ ảnh');
      }

      return data;
    } catch (error) {
      console.error('OCR Preview API error:', error);
      throw error;
    }
  },

  /**
   * Verify ID card images and create verification request
   * @param images Array of files (front ID card, back ID card)
   * @param idCardInfo Optional: ID card info confirmed by user (from OCR preview)
   * @returns Promise<FaceVerificationResponse>
   */
  verifyFaceImages: async (
    images: File[],
    idCardInfo?: ExtractedIdCardInfo | null
  ): Promise<FaceVerificationResponse> => {
    try {
      console.log('Starting face verification:', {
        imagesCount: images.length,
        imageSizes: images.map(img => ({ name: img.name, size: img.size, type: img.type }))
      });

      // Create FormData to send files and confirmed ID card info
      const formData = new FormData();
      images.forEach((image) => {
        formData.append('images', image);
      });
      
      // Add confirmed ID card info if provided
      if (idCardInfo) {
        formData.append('idCardInfo', JSON.stringify({
          idNumber: idCardInfo.idNumber || null,
          fullName: idCardInfo.fullName || null,
          dateOfBirth: idCardInfo.dateOfBirth || null
        }));
      }

      console.log('Sending request to:', '/auth/verify-face');
      console.log('FormData entries:', {
        imagesCount: images.length,
        hasIdCardInfo: !!idCardInfo
      });
      
      const response = await api.post('/auth/verify-face', formData);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // Parse response regardless of status code
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        const text = await response.text();
        console.error('Response text:', text);
        throw new Error('Lỗi khi xử lý phản hồi từ server. Vui lòng thử lại.');
      }
      
      // If response is not ok but has data with extractedIdCardInfo, return it
      // This allows user to review OCR info even if verification fails
      if (!response.ok) {
        // If we have extracted ID card info, return it so user can review
        if (data?.data?.extractedIdCardInfo) {
          console.log('Verification failed but OCR extracted info:', data.data.extractedIdCardInfo);
          return data; // Return the response so user can review OCR info
        }
        
        // Otherwise, throw error as before
        let errorMessage = data.message || data.error || data.error?.message || 'Verification failed';
        console.error('Verification error details:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          error: data.error
        });
        
        // Provide more specific and helpful error messages
        if (response.status === 400) {
          if (errorMessage.includes('Thiếu hình ảnh') || errorMessage.includes('upload đủ')) {
            errorMessage = 'Vui lòng tải lên đầy đủ 3 ảnh: mặt trước CCCD, mặt sau CCCD và ảnh người dùng.';
          } else if (errorMessage.includes('Số điện thoại')) {
            errorMessage = 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
          } else if (errorMessage.includes('yêu cầu xác minh đang chờ')) {
            errorMessage = 'Bạn đã có yêu cầu xác minh đang chờ xử lý. Vui lòng chờ moderator xử lý.';
          }
        } else if (response.status === 500) {
          // Show more detailed error message from backend if available
          if (data.error && typeof data.error === 'string') {
            errorMessage = `Lỗi hệ thống: ${data.error}`;
          } else if (data.message && data.message !== 'Lỗi hệ thống xác minh. Vui lòng thử lại sau.') {
            errorMessage = data.message;
          } else {
            errorMessage = 'Lỗi hệ thống xác minh. Vui lòng thử lại sau.';
          }
        }
        throw new Error(errorMessage);
      }

      console.log('Success response:', data);
      
      // If request was created successfully, return with verificationRequestSubmitted flag
      if (data?.data?.requestId || data?.data?._id) {
        return {
          ...data,
          data: {
            ...data.data,
            verificationRequestSubmitted: true
          }
        };
      }
      
      return data;
    } catch (error) {
      console.error('Face verification API error:', error);
      throw error;
    }
  },

  /**
   * Auto verify ID card images with face comparison
   * Compares face on ID card with user photo
   * Auto-approves if similarity > 50%, otherwise sends to moderator
   * @param images Array of files (front ID card, back ID card, user photo)
   * @param idCardInfo Optional: ID card info confirmed by user (from OCR preview)
   * @returns Promise<FaceVerificationResponse>
   */
  verifyFaceImagesAuto: async (
    images: File[],
    idCardInfo?: ExtractedIdCardInfo | null
  ): Promise<FaceVerificationResponse> => {
    try {
      console.log('Starting auto face verification:', {
        imagesCount: images.length,
        imageSizes: images.map(img => ({ name: img.name, size: img.size, type: img.type }))
      });

      // Create FormData to send files and confirmed ID card info
      const formData = new FormData();
      images.forEach((image) => {
        formData.append('images', image);
      });
      
      // Add confirmed ID card info if provided
      if (idCardInfo) {
        formData.append('idCardInfo', JSON.stringify({
          idNumber: idCardInfo.idNumber || null,
          fullName: idCardInfo.fullName || null,
          dateOfBirth: idCardInfo.dateOfBirth || null
        }));
      }

      console.log('Sending request to:', '/auth/verify-face/auto');
      
      const response = await api.post('/auth/verify-face/auto', formData);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // Parse response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        const text = await response.text();
        console.error('Response text:', text);
        throw new Error('Lỗi khi xử lý phản hồi từ server. Vui lòng thử lại.');
      }
      
      if (!response.ok) {
        let errorMessage = data.message || data.error || data.error?.message || 'Auto verification failed';
        console.error('Auto verification error details:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          error: data.error
        });
        
        if (response.status === 400) {
          if (errorMessage.includes('Thiếu hình ảnh') || errorMessage.includes('upload đủ')) {
            errorMessage = 'Vui lòng tải lên đầy đủ 3 ảnh: mặt trước CCCD, mặt sau CCCD và ảnh người dùng.';
          } else if (errorMessage.includes('Không thể đọc được thông tin')) {
            errorMessage = 'Không thể đọc được thông tin từ ảnh căn cước công dân. Vui lòng chụp lại ảnh rõ nét hơn hoặc nhập thủ công.';
          } else if (errorMessage.includes('đã có yêu cầu xác minh đang chờ')) {
            // Don't throw error, return special response so UI can handle it
            return {
              code: 400,
              message: errorMessage,
              data: {
                hasPendingRequest: true,
                requiresModeratorReview: true
              }
            };
          }
        } else if (response.status === 500) {
          if (data.error && typeof data.error === 'string') {
            errorMessage = `Lỗi hệ thống: ${data.error}`;
          } else {
            errorMessage = 'Lỗi hệ thống xác minh tự động. Vui lòng thử lại sau.';
          }
        }
        throw new Error(errorMessage);
      }

      console.log('Auto verification success response:', data);
      
      return data;
    } catch (error) {
      console.error('Auto face verification API error:', error);
      throw error;
    }
  }
};

export default faceVerificationAPI;
