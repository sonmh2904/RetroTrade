import { Button } from "../../common/button";
import { Input } from "../../common/input";
import { useState } from "react";
import { Upload, X, CreditCard, CheckCircle, AlertCircle, Image as ImageIcon, Shield, Edit } from "lucide-react";
import Image from "next/image";
import { faceVerificationAPI, FaceVerificationResponse, ExtractedIdCardInfo } from "@/services/auth/faceVerification.api";

interface ImageUploadProps {
  images: File[];
  setImages: (files: File[]) => void;
  onNext: (verificationResult?: FaceVerificationResponse) => void;
  onBack: () => void;
  isLoading?: boolean;
  phoneNumber?: string; // Optional - not required for ID card verification
}

interface ImagePreview {
  file: File;
  preview: string;
}

export default function ImageUpload({ images, setImages, onNext, onBack, isLoading = false, phoneNumber }: ImageUploadProps) {
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [errors, setErrors] = useState<string[]>(['', '']);
  const [isPrivacyAccepted, setIsPrivacyAccepted] = useState<boolean>(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string>("");
  const [extractedIdCardInfo, setExtractedIdCardInfo] = useState<ExtractedIdCardInfo | null>(null);
  const [editingIdCardInfo, setEditingIdCardInfo] = useState<ExtractedIdCardInfo | null>(null);
  const [isEditingIdCard, setIsEditingIdCard] = useState<boolean>(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);

  const imageTypes = [
    { 
      id: 0, 
      label: "Mặt trước CCCD", 
      description: "Ảnh mặt trước căn cước công dân",
      icon: CreditCard,
      required: true
    },
    { 
      id: 1, 
      label: "Mặt sau CCCD", 
      description: "Ảnh mặt sau căn cước công dân",
      icon: CreditCard,
      required: true
    }
  ];

  const validateImage = (file: File): string => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    if (!allowedTypes.includes(file.type)) {
      return "Chỉ chấp nhận file JPG, JPEG, PNG";
    }
    if (file.size > maxSize) {
      return "Kích thước file không được vượt quá 5MB";
    }
    return "";
  };

  const processFile = async (file: File, index: number) => {
    const error = validateImage(file);
    const newErrors = [...errors];
    newErrors[index] = error;
    setErrors(newErrors);

    if (error) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = event.target?.result as string;
      
      // Update images array
      const newImages = [...images];
      newImages[index] = file;
      setImages(newImages);

      // Update previews
      setImagePreviews(prev => {
        const newPreviews = [...prev];
        newPreviews[index] = { file, preview };
        return newPreviews;
      });
    };
    reader.readAsDataURL(file);

    // If this is the front ID card image (index 0), automatically run OCR preview
    if (index === 0) {
      try {
        setIsOcrProcessing(true);
        const ocrResult = await faceVerificationAPI.previewIdCardOcr(file);
        
        // Store extracted info to display below the image
        // This allows user to see what was read (or N/A) and enter manually if needed
        const extractedInfo = ocrResult.data?.extractedIdCardInfo || {
          idNumber: null,
          fullName: null,
          dateOfBirth: null,
          address: null
        };
        setExtractedIdCardInfo(extractedInfo);
        setEditingIdCardInfo(extractedInfo);
        // Don't show popup, info will be displayed inline below the image
      } catch (ocrError) {
        console.error('OCR Preview error:', ocrError);
        // Don't show error to user - they can still proceed and enter manually
      } finally {
        setIsOcrProcessing(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, index);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      processFile(imageFile, index);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages[index] = undefined as unknown as File;
    setImages(newImages);

    setImagePreviews(prev => {
      const newPreviews = [...prev];
      newPreviews[index] = undefined as unknown as ImagePreview;
      return newPreviews;
    });

    const newErrors = [...errors];
    newErrors[index] = "";
    setErrors(newErrors);

    // Reset file input
    const input = document.getElementById(`file-input-${index}`) as HTMLInputElement;
    if (input) input.value = "";
  };

  const handleSubmit = async () => {
    const hasErrors = errors.some(error => error !== "");
    const hasAllImages = images.length === 2 && images.every(img => img);
    
    if (hasErrors) {
      return;
    }
    
    if (!hasAllImages) {
      const newErrors = errors.map((error, index) => 
        !images[index] ? "Vui lòng tải lên ảnh này" : error
      );
      setErrors(newErrors);
      return;
    }

    if (!isPrivacyAccepted) {
      alert("Vui lòng chấp nhận chia sẻ thông tin cá nhân để tiếp tục");
      return;
    }

    // Ensure ID card info is available (either from OCR or user input)
    if (!editingIdCardInfo && !extractedIdCardInfo) {
      // If no OCR was done, create empty info object
      const emptyInfo = {
        idNumber: null,
        fullName: null,
        dateOfBirth: null,
        address: null
      };
      setExtractedIdCardInfo(emptyInfo);
      setEditingIdCardInfo(emptyInfo);
    }

    // Validate that all ID card information fields are filled
    const confirmedIdCardInfo = editingIdCardInfo || extractedIdCardInfo;
    
    if (!confirmedIdCardInfo) {
      alert("Vui lòng đợi hệ thống đọc thông tin từ ảnh hoặc nhập thủ công tất cả thông tin căn cước công dân.");
      return;
    }

    // Validate all required fields - all must be filled (not null, not empty, not "N/A")
    const missingFields: string[] = [];
    
    if (!confirmedIdCardInfo.idNumber || 
        confirmedIdCardInfo.idNumber.trim() === "" || 
        confirmedIdCardInfo.idNumber.trim().toUpperCase() === "N/A") {
      missingFields.push("Số căn cước công dân");
    }
    
    if (!confirmedIdCardInfo.fullName || 
        confirmedIdCardInfo.fullName.trim() === "" || 
        confirmedIdCardInfo.fullName.trim().toUpperCase() === "N/A") {
      missingFields.push("Họ và tên");
    }
    
    if (!confirmedIdCardInfo.dateOfBirth) {
      missingFields.push("Ngày tháng năm sinh");
    }
    
    if (!confirmedIdCardInfo.address || 
        confirmedIdCardInfo.address.trim() === "" || 
        confirmedIdCardInfo.address.trim().toUpperCase() === "N/A") {
      missingFields.push("Địa chỉ thường trú");
    }

    if (missingFields.length > 0) {
      alert(`Vui lòng điền đầy đủ tất cả thông tin căn cước công dân trước khi gửi yêu cầu.\n\nThiếu các trường sau:\n${missingFields.map(f => `- ${f}`).join('\n')}`);
      // Enable editing mode so user can fill in missing fields
      setIsEditingIdCard(true);
      return;
    }

    // Validate ID number format (12 digits)
    if (confirmedIdCardInfo.idNumber && !/^\d{12}$/.test(confirmedIdCardInfo.idNumber.trim())) {
      alert("Số căn cước công dân phải có đúng 12 chữ số. Vui lòng kiểm tra lại.");
      setIsEditingIdCard(true);
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationError("");

      // Prepare files for verification (ID card front and ID card back)
      const verificationFiles = [images[0], images[1]]; // Mặt trước CCCD, mặt sau CCCD

      // Call verification API - this will create a verification request for moderator
      const verificationResult = await faceVerificationAPI.verifyFaceImages(
        verificationFiles,
        confirmedIdCardInfo || null
      );

      // Check if request was auto-rejected due to OCR failure
      if (verificationResult.data?.autoRejected) {
        setVerificationError(
          verificationResult.data.rejectionReason || 
          "Yêu cầu xác minh đã bị từ chối tự động do không thể đọc được thông tin từ ảnh. Vui lòng chụp lại ảnh rõ nét hơn."
        );
        setIsVerifying(false);
        // Still pass result to parent to show rejection status
        onNext(verificationResult);
        return;
      }

      // Pass the result to parent component
      onNext(verificationResult);
    } catch (error) {
      console.error('Verification error:', error);
      
      // Provide more user-friendly error messages
      let errorMessage = "Có lỗi xảy ra khi gửi yêu cầu xác minh. Vui lòng thử lại.";
      
      if (error instanceof Error) {
        if (error.message.includes('Thiếu hình ảnh')) {
          errorMessage = "Vui lòng tải lên đầy đủ 2 ảnh: mặt trước và mặt sau căn cước công dân.";
        } else if (error.message.includes('đã có yêu cầu')) {
          errorMessage = error.message;
        } else if (error.message.includes('Số điện thoại')) {
          errorMessage = "Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.";
        } else if (error.message.includes('Lỗi hệ thống')) {
          errorMessage = "Lỗi hệ thống xác minh. Vui lòng thử lại sau.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setVerificationError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const allImagesUploaded = images.length === 2 && images.every(img => img);


  return (
    <div className="space-y-6">
      {/* ID Card Info Review Dialog - REMOVED, now displayed inline below image */}

      {/* Guidelines Section */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ImageIcon className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-3">
            <h4 className="font-semibold text-purple-800">Hướng dẫn tải ảnh xác minh</h4>
            
            {/* Ảnh CCCD */}
            <div className="bg-white/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                <span className="font-medium text-purple-800">Ảnh căn cước công dân</span>
              </div>
              <div className="space-y-1 text-sm text-purple-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Chụp rõ nét, không bị mờ thông tin</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Đầy đủ thông tin, không bị che khuất</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Định dạng: JPG, JPEG, PNG (tối đa 5MB)</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span><strong>Lưu ý:</strong> Chụp ảnh ở nơi đủ sáng, giữ máy ảnh ổn định</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span><strong>Khuyến nghị:</strong> Chụp gần để ảnh có độ phân giải cao, chữ rõ ràng</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span>Hệ thống sẽ tự động xử lý và tăng cường chất lượng ảnh để đọc thông tin</span>
                </div>
              </div>
            </div>

            {/* Drag & Drop tip */}
            <div className="bg-white/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-purple-800">Cách tải ảnh</span>
              </div>
              <div className="space-y-1 text-sm text-purple-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Kéo thả ảnh trực tiếp vào vùng upload</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Hoặc nhấp &quot;Chọn ảnh&quot; để duyệt file</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Tải lên ảnh xác minh <span className="text-red-500">*</span>
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Vui lòng tải lên đầy đủ 2 ảnh: mặt trước và mặt sau căn cước công dân để hoàn tất quá trình xác minh
        </p>
      </div>

      <div className="space-y-4">
        {/* 2 ảnh CCCD - Side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {imageTypes.map((imageType, index) => {
            const IconComponent = imageType.icon;
            const preview = imagePreviews[index];
            const error = errors[index];

            return (
              <div key={index} className={`border rounded-lg p-4 ${
                preview ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <IconComponent className={`w-5 h-5 ${preview ? 'text-green-600' : 'text-blue-600'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-800">{imageType.label}</h4>
                      {preview && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </div>
                    <p className="text-sm text-gray-600">{imageType.description}</p>
                  </div>
                </div>

                {preview ? (
                  <>
                    <div className="relative">
                      {index === 0 && isOcrProcessing && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center z-10">
                          <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                            <p className="text-sm">Đang đọc thông tin từ ảnh...</p>
                          </div>
                        </div>
                      )}
                      <Image
                        src={preview.preview}
                        alt={imageType.label}
                        width={400}
                        height={192}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {index === 0 && extractedIdCardInfo && (
                        <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Đã đọc thông tin
                        </div>
                      )}
                    </div>
                    
                  </>
                ) : (
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
                      dragOverIndex === index 
                        ? 'border-blue-500 bg-blue-50 scale-105' 
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <Upload className={`w-6 h-6 mx-auto mb-2 ${
                      dragOverIndex === index ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                    <p className={`text-xs mb-2 ${
                      dragOverIndex === index ? 'text-blue-600 font-medium' : 'text-gray-600'
                    }`}>
                      {dragOverIndex === index 
                        ? `Thả ảnh vào đây`
                        : `Kéo thả hoặc nhấp để tải lên`
                      }
                    </p>
                    <Input
                      id={`file-input-${index}`}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e, index)}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById(`file-input-${index}`)?.click()}
                      className={`text-xs ${
                        dragOverIndex === index ? 'bg-blue-100 border-blue-300 text-blue-700' : ''
                      }`}
                    >
                      Chọn ảnh
                    </Button>
                  </div>
                )}

                {error && (
                  <p className="text-red-500 text-xs mt-2">{error}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* OCR Info Card - Full width, separate from images */}
        {editingIdCardInfo && (
          <div className="col-span-1 md:col-span-2 mt-4 p-5 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Thông tin đã đọc từ căn cước công dân
              </h5>
              <button
                onClick={() => setIsEditingIdCard(!isEditingIdCard)}
                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-3 py-1 rounded-md hover:bg-indigo-50 transition-colors"
              >
                {isEditingIdCard ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Hoàn tất
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4" />
                    Chỉnh sửa
                  </>
                )}
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Helper function to check if field is valid */}
              {(() => {
                const isFieldValid = (value: string | null | undefined): boolean => {
                  return value !== null && 
                         value !== undefined && 
                         value.trim() !== "" && 
                         value.trim().toUpperCase() !== "N/A";
                };
                
                return (
                  <>
                    {/* Số căn cước công dân */}
                    <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                      <label className={`text-sm font-semibold min-w-[200px] ${
                        !isFieldValid(editingIdCardInfo.idNumber) ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        Số căn cước công dân <span className="text-red-500">*</span>
                      </label>
                      {isEditingIdCard ? (
                        <div className="flex-1 max-w-md">
                          <Input
                            type="text"
                            value={editingIdCardInfo.idNumber || ""}
                            onChange={(e) => setEditingIdCardInfo({ ...editingIdCardInfo, idNumber: e.target.value })}
                            placeholder="Nhập số căn cước công dân (12 chữ số)"
                            maxLength={12}
                            className={`flex-1 max-w-md ${
                              !isFieldValid(editingIdCardInfo.idNumber) ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                            }`}
                          />
                          {!isFieldValid(editingIdCardInfo.idNumber) && (
                            <p className="text-red-500 text-xs mt-1">Trường này là bắt buộc</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 max-w-md">
                          <div className={`p-3 rounded border ${
                            isFieldValid(editingIdCardInfo.idNumber) 
                              ? 'bg-white border-gray-300 text-gray-900' 
                              : 'bg-red-50 border-red-300 text-red-600 italic'
                          }`}>
                            {editingIdCardInfo.idNumber || "N/A"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Họ và tên */}
                    <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                      <label className={`text-sm font-semibold min-w-[200px] ${
                        !isFieldValid(editingIdCardInfo.fullName) ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      {isEditingIdCard ? (
                        <div className="flex-1 max-w-md">
                          <Input
                            type="text"
                            value={editingIdCardInfo.fullName || ""}
                            onChange={(e) => setEditingIdCardInfo({ ...editingIdCardInfo, fullName: e.target.value })}
                            placeholder="Nhập họ và tên"
                            className={`flex-1 max-w-md ${
                              !isFieldValid(editingIdCardInfo.fullName) ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                            }`}
                          />
                          {!isFieldValid(editingIdCardInfo.fullName) && (
                            <p className="text-red-500 text-xs mt-1">Trường này là bắt buộc</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 max-w-md">
                          <div className={`p-3 rounded border ${
                            isFieldValid(editingIdCardInfo.fullName) 
                              ? 'bg-white border-gray-300 text-gray-900' 
                              : 'bg-red-50 border-red-300 text-red-600 italic'
                          }`}>
                            {editingIdCardInfo.fullName || "N/A"}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Ngày tháng năm sinh */}
              {(() => {
                const isFieldValid = (value: string | Date | null | undefined): boolean => {
                  return value !== null && value !== undefined;
                };
                
                return (
                  <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                    <label className={`text-sm font-semibold min-w-[200px] ${
                      !isFieldValid(editingIdCardInfo.dateOfBirth) ? 'text-red-600' : 'text-gray-700'
                    }`}>
                      Ngày tháng năm sinh <span className="text-red-500">*</span>
                    </label>
                    {isEditingIdCard ? (
                      <div className="flex-1 max-w-md">
                        <Input
                          type="date"
                          value={editingIdCardInfo.dateOfBirth ? new Date(editingIdCardInfo.dateOfBirth).toISOString().split('T')[0] : ""}
                          onChange={(e) => setEditingIdCardInfo({ ...editingIdCardInfo, dateOfBirth: e.target.value })}
                          className={`flex-1 max-w-md ${
                            !isFieldValid(editingIdCardInfo.dateOfBirth) ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                          }`}
                        />
                        {!isFieldValid(editingIdCardInfo.dateOfBirth) && (
                          <p className="text-red-500 text-xs mt-1">Trường này là bắt buộc</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 max-w-md">
                        <div className={`p-3 rounded border ${
                          isFieldValid(editingIdCardInfo.dateOfBirth) 
                            ? 'bg-white border-gray-300 text-gray-900' 
                            : 'bg-red-50 border-red-300 text-red-600 italic'
                        }`}>
                          {editingIdCardInfo.dateOfBirth ? new Date(editingIdCardInfo.dateOfBirth).toLocaleDateString('vi-VN') : "N/A"}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Địa chỉ thường trú */}
              {(() => {
                const isFieldValid = (value: string | null | undefined): boolean => {
                  return value !== null && 
                         value !== undefined && 
                         value.trim() !== "" && 
                         value.trim().toUpperCase() !== "N/A";
                };
                
                return (
                  <div className="flex items-start justify-between pb-2">
                    <label className={`text-sm font-semibold min-w-[200px] ${
                      !isFieldValid(editingIdCardInfo.address) ? 'text-red-600' : 'text-gray-700'
                    }`}>
                      Địa chỉ thường trú <span className="text-red-500">*</span>
                    </label>
                    {isEditingIdCard ? (
                      <div className="flex-1">
                        <textarea
                          value={editingIdCardInfo.address || ""}
                          onChange={(e) => setEditingIdCardInfo({ ...editingIdCardInfo, address: e.target.value })}
                          placeholder="Nhập địa chỉ thường trú"
                          rows={5}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                            !isFieldValid(editingIdCardInfo.address) 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                              : 'border-gray-300 focus:ring-indigo-500'
                          }`}
                        />
                        {!isFieldValid(editingIdCardInfo.address) && (
                          <p className="text-red-500 text-xs mt-1">Trường này là bắt buộc</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1">
                        <div className={`p-3 rounded border min-h-[80px] ${
                          isFieldValid(editingIdCardInfo.address) 
                            ? 'bg-white border-gray-300 text-gray-900' 
                            : 'bg-red-50 border-red-300 text-red-600 italic'
                        }`}>
                          {editingIdCardInfo.address || "N/A"}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Privacy Consent */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-3">
            <h4 className="font-semibold text-blue-800">Xác nhận chia sẻ thông tin cá nhân</h4>
            <div className="space-y-2 text-sm text-blue-700">
              <p>Tôi xác nhận và đồng ý:</p>
              <ul className="space-y-1 ml-4">
                <li>• Chia sẻ thông tin cá nhân từ ảnh CCCD cho mục đích xác minh danh tính</li>
                <li>• Hệ thống sử dụng OCR để đọc thông tin từ ảnh CCCD</li>
                <li>• Thông tin được bảo mật và chỉ sử dụng cho mục đích xác minh</li>
                <li>• Có thể từ chối chia sẻ thông tin bất cứ lúc nào</li>
              </ul>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="privacy-consent"
                checked={isPrivacyAccepted}
                onChange={(e) => setIsPrivacyAccepted(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="privacy-consent" className="text-sm font-medium text-blue-800">
                Tôi đồng ý chia sẻ thông tin cá nhân cho hệ thống xác minh danh tính
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Error */}
      {verificationError && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-yellow-800 font-semibold mb-2">⚠️ Lỗi xác minh</h4>
              <div className="text-yellow-700 text-sm whitespace-pre-line">
                {verificationError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={onBack} 
              className="w-1/2"
              disabled={isVerifying}
            >
              Quay lại
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!allImagesUploaded || !isPrivacyAccepted || isLoading || isVerifying}
              className="w-1/2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
            >
              {isVerifying ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Đang gửi yêu cầu...</span>
                </div>
              ) : isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Đang xử lý...</span>
                </div>
              ) : (
                "Gửi yêu cầu xác minh"
              )}
            </Button>
          </div>

        </div>
        
        {!allImagesUploaded && (
          <div className="flex items-center justify-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <p className="text-orange-600 text-sm font-medium">Vui lòng tải lên đầy đủ 2 ảnh để tiếp tục</p>
          </div>
        )}
        
        {allImagesUploaded && !isPrivacyAccepted && (
          <div className="flex items-center justify-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <p className="text-yellow-600 text-sm font-medium">Vui lòng chấp nhận chia sẻ thông tin cá nhân để tiếp tục</p>
          </div>
        )}
        
        {allImagesUploaded && isPrivacyAccepted && (
          <div className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-green-600 text-sm font-medium">Đã tải lên đầy đủ 2 ảnh và chấp nhận chia sẻ thông tin. Sẵn sàng để xác minh!</p>
          </div>
        )}
      </div>
    </div>
  );
}