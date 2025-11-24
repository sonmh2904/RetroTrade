import api from '../customizeAPI';

export interface FaceVerificationRequest {
  images: File[]; // Array of files (front ID card, back ID card)
}

export interface ExtractedIdCardInfo {
  idNumber?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
}

export interface FaceVerificationResponse {
  code: number;
  message: string;
  data: {
    isMatch?: boolean;
    similarityPercentage?: number;
    distance?: number;
    threshold?: number;
    userFacesDetected?: number;
    idCardFacesDetected?: number;
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
      address?: string;
      extractionMethod?: string;
    };
    autoRejected?: boolean;
    rejectionReason?: string;
    verificationRequestSubmitted?: boolean;
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
          dateOfBirth: idCardInfo.dateOfBirth || null,
          address: idCardInfo.address || null
        }));
      }

      console.log('Sending request to:', '/auth/verify-face');
      const response = await api.post('/auth/verify-face', formData);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // Parse response regardless of status code
      const data = await response.json();
      
      // If response is not ok but has data with extractedIdCardInfo, return it
      // This allows user to review OCR info even if verification fails
      if (!response.ok) {
        // If we have extracted ID card info, return it so user can review
        if (data?.data?.extractedIdCardInfo) {
          console.log('Verification failed but OCR extracted info:', data.data.extractedIdCardInfo);
          return data; // Return the response so user can review OCR info
        }
        
        // Otherwise, throw error as before
        let errorMessage = data.message || data.error || 'Verification failed';
        console.error('Verification error details:', data);
        
        // Provide more specific and helpful error messages
        if (response.status === 400) {
          if (errorMessage.includes('Thiếu hình ảnh')) {
            errorMessage = 'Vui lòng tải lên đầy đủ 2 ảnh: mặt trước và mặt sau căn cước công dân.';
          } else if (errorMessage.includes('Số điện thoại')) {
            errorMessage = 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
          }
        } else if (response.status === 500) {
          errorMessage = 'Lỗi hệ thống xác minh. Vui lòng thử lại sau.';
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
  }
};

export default faceVerificationAPI;
