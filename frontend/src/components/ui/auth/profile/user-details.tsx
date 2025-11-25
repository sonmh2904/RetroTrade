"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Badge } from "@/components/ui/common/badge";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { User, Mail, Phone, Calendar, MapPin, CreditCard, Shield, CheckCircle, XCircle, Clock, Lock, Eye, EyeOff, ImageIcon, Loader2 } from "lucide-react";
import type { UserProfile } from "@iService";
import { verifyPassword } from "@/services/auth/user.api";
import { verificationRequestAPI } from "@/services/auth/verificationRequest.api";
import { toast } from "sonner";

interface UserDetailsProps {
  userProfile: UserProfile;
}

// Helper functions
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "Chưa có thông tin";
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return "Chưa có thông tin";
  }
};

const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return "Chưa có thông tin";
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return "Chưa có thông tin";
  }
};

export function UserDetails({ userProfile }: UserDetailsProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [idCardImages, setIdCardImages] = useState<{
    front?: string;
    back?: string;
  }>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; label: string } | null>(null);
  const [imageErrors, setImageErrors] = useState<{ front?: boolean; back?: boolean; modal?: boolean }>({});

  // Load ID card images from approved verification request
  useEffect(() => {
    const loadIdCardImages = async () => {
      if (!isAuthenticated || !userProfile.isIdVerified) {
        return;
      }

      try {
        setLoadingImages(true);
        // Get approved verification requests
        const response = await verificationRequestAPI.getMyVerificationRequests({ status: 'Approved' });
        
        console.log("Verification requests response:", response);
        
        if (response.code === 200 && response.data && response.data.length > 0) {
          // Sort by createdAt descending to get the most recent approved request
          const sortedRequests = [...response.data].sort((a, b) => {
            const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
            const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
            return dateB - dateA; // Most recent first
          });
          
          // Get the most recent approved request
          const approvedRequest = sortedRequests[0];
          
          console.log("Selected approved request:", approvedRequest);
          console.log("Documents:", approvedRequest.documents);
          
          if (approvedRequest.documents && approvedRequest.documents.length > 0) {
            const images: { front?: string; back?: string } = {};
            
            approvedRequest.documents.forEach((doc: { documentType: string; fileUrl: string }) => {
              console.log("Processing document:", doc.documentType, doc.fileUrl);
              if (doc.documentType === 'idCardFront') {
                images.front = doc.fileUrl;
              } else if (doc.documentType === 'idCardBack') {
                images.back = doc.fileUrl;
              }
            });
            
            console.log("Final images object:", images);
            setIdCardImages(images);
            setImageErrors({}); // Reset errors when loading new images
          } else {
            console.log("No documents found in approved request");
            setIdCardImages({});
          }
        } else {
          console.log("No approved verification requests found");
          setIdCardImages({});
        }
      } catch (error) {
        console.error("Error loading ID card images:", error);
        setIdCardImages({});
      } finally {
        setLoadingImages(false);
      }
    };

    if (isAuthenticated) {
      loadIdCardImages();
    }
  }, [isAuthenticated, userProfile.isIdVerified]);

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    try {
      setIsVerifying(true);
      setError("");
      const result = await verifyPassword(password);
      
      if (result.code === 200) {
        setIsAuthenticated(true);
        setPassword(""); // Clear password after successful authentication
        toast.success("Xác thực thành công");
      } else {
        setError(result.message || "Mật khẩu không đúng");
        toast.error(result.message || "Mật khẩu không đúng");
      }
    } catch (err) {
      console.error("Error verifying password:", err);
      setError("Có lỗi xảy ra khi xác thực mật khẩu");
      toast.error("Có lỗi xảy ra khi xác thực mật khẩu");
    } finally {
      setIsVerifying(false);
    }
  };

  // If not authenticated, show password dialog
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thông tin chi tiết</h2>
          <p className="text-gray-600">Vui lòng xác thực mật khẩu để xem thông tin chi tiết</p>
        </div>

        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-indigo-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Xác thực mật khẩu
                </h3>
                <p className="text-sm text-gray-600 text-center mb-6">
                  Để bảo vệ thông tin cá nhân, vui lòng nhập mật khẩu của bạn để xem thông tin chi tiết
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError("");
                        }}
                        placeholder="Nhập mật khẩu của bạn"
                        className={`w-full pr-10 ${error ? 'border-red-500' : ''}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleVerifyPassword();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {error && (
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleVerifyPassword}
                    disabled={isVerifying || !password.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isVerifying ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Đang xác thực...</span>
                      </div>
                    ) : (
                      "Xác thực"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thông tin chi tiết</h2>
        <p className="text-gray-600">Xem thông tin chi tiết về tài khoản của bạn</p>
      </div>

      {/* Thông tin tài khoản */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Thông tin tài khoản
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <p className="text-gray-900 font-medium">{userProfile.fullName || "Chưa có thông tin"}</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <p className="text-gray-900">{userProfile.email || "Chưa có thông tin"}</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4" />
                Số điện thoại
              </label>
              <p className="text-gray-900">{userProfile.phone || "Chưa có thông tin"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
              <p className="text-gray-900">{userProfile.displayName || "Chưa có thông tin"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
              <Badge variant="outline" className="mt-1">
                {userProfile.role === 'owner' ? 'Chủ sở hữu' :
                 userProfile.role === 'moderator' ? 'Moderator' :
                 userProfile.role === 'admin' ? 'Quản trị viên' :
                 'Người thuê'}
              </Badge>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Điểm uy tín</label>
              <p className="text-gray-900 font-semibold">{userProfile.reputationScore?.toFixed(1) || "0.0"}/5.0</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RT Points</label>
              <p className="text-gray-900 font-semibold">{userProfile.points || 0} điểm</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số dư ví</label>
              <p className="text-gray-900 font-semibold">
                {userProfile.wallet?.balance?.toLocaleString('vi-VN') || "0"} {userProfile.wallet?.currency || "VND"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trạng thái xác minh */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Trạng thái xác minh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Mail className={`w-5 h-5 ${userProfile.isEmailConfirmed ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Email</p>
                <div className="flex items-center gap-2 mt-1">
                  {userProfile.isEmailConfirmed ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Đã xác minh</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Chưa xác minh</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Phone className={`w-5 h-5 ${userProfile.isPhoneConfirmed ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Số điện thoại</p>
                <div className="flex items-center gap-2 mt-1">
                  {userProfile.isPhoneConfirmed ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Đã xác minh</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Chưa xác minh</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <CreditCard className={`w-5 h-5 ${userProfile.isIdVerified ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Căn cước công dân</p>
                <div className="flex items-center gap-2 mt-1">
                  {userProfile.isIdVerified ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Đã xác minh</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Chưa xác minh</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thông tin căn cước công dân */}
      {userProfile.idCardInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Thông tin căn cước công dân
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <CreditCard className="w-4 h-4" />
                  Số căn cước công dân
                </label>
                <p className="text-gray-900 font-medium">{userProfile.idCardInfo.idNumber || "Chưa có thông tin"}</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4" />
                  Họ và tên
                </label>
                <p className="text-gray-900">{userProfile.idCardInfo.fullName || "Chưa có thông tin"}</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4" />
                  Ngày tháng năm sinh
                </label>
                <p className="text-gray-900">{formatDate(userProfile.idCardInfo.dateOfBirth)}</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4" />
                  Địa chỉ thường trú
                </label>
                <p className="text-gray-900">{userProfile.idCardInfo.address || "Chưa có thông tin"}</p>
              </div>
              {userProfile.idCardInfo.extractedAt && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4" />
                    Thời gian cập nhật
                  </label>
                  <p className="text-gray-900 text-sm">{formatDateTime(userProfile.idCardInfo.extractedAt)}</p>
                </div>
              )}
              {userProfile.idCardInfo.extractionMethod && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức cập nhật</label>
                  <Badge variant="outline" className="mt-1">
                    {userProfile.idCardInfo.extractionMethod === 'ocr' ? 'OCR tự động' : 'Nhập thủ công'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Ảnh căn cước công dân */}
            <div className="md:col-span-2 mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Ảnh căn cước công dân</h3>
                </div>
                
                {loadingImages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Đang tải ảnh...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mặt trước */}
                    {idCardImages.front ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Mặt trước căn cước công dân
                        </label>
                        <div
                          onClick={() => {
                            if (idCardImages.front) {
                              setSelectedImage({ url: idCardImages.front, label: "Mặt trước căn cước công dân" });
                              setImageErrors(prev => ({ ...prev, modal: false }));
                            }
                          }}
                          className="relative w-full aspect-[85.6/53.98] rounded-lg overflow-hidden border-2 border-gray-200 bg-white group hover:border-indigo-400 transition-colors cursor-pointer shadow-sm hover:shadow-lg"
                          style={{ minHeight: '200px' }}
                        >
                          {!imageErrors.front ? (
                            <Image
                              src={idCardImages.front}
                              alt="Mặt trước căn cước công dân"
                              fill
                              className="object-contain"
                              style={{ backgroundColor: '#ffffff', zIndex: 1 }}
                              unoptimized
                              onError={() => {
                                console.error("Error loading front ID card image:", idCardImages.front);
                                setImageErrors(prev => ({ ...prev, front: true }));
                              }}
                              onLoad={() => {
                                console.log("Front image loaded successfully:", idCardImages.front);
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                              <div className="text-center text-gray-400">
                                <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-sm">Không thể tải ảnh</p>
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-transparent group-hover:from-black/20 group-hover:via-black/10 group-hover:to-black/20 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-2">
                              <Eye className="w-6 h-6 text-white drop-shadow-lg" />
                              <span className="text-white text-sm font-medium bg-black/70 px-3 py-1 rounded-full">
                                Click để phóng to
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Mặt trước căn cước công dân
                        </label>
                        <div className="relative w-full aspect-[85.6/53.98] rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Chưa có ảnh</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mặt sau */}
                    {idCardImages.back ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Mặt sau căn cước công dân
                        </label>
                        <div
                          onClick={() => {
                            if (idCardImages.back) {
                              setSelectedImage({ url: idCardImages.back, label: "Mặt sau căn cước công dân" });
                              setImageErrors(prev => ({ ...prev, modal: false }));
                            }
                          }}
                          className="relative w-full aspect-[85.6/53.98] rounded-lg overflow-hidden border-2 border-gray-200 bg-white group hover:border-indigo-400 transition-colors cursor-pointer shadow-sm hover:shadow-lg"
                          style={{ minHeight: '200px' }}
                        >
                          {!imageErrors.back ? (
                            <Image
                              src={idCardImages.back}
                              alt="Mặt sau căn cước công dân"
                              fill
                              className="object-contain"
                              style={{ backgroundColor: '#ffffff', zIndex: 1 }}
                              unoptimized
                              onError={() => {
                                console.error("Error loading back ID card image:", idCardImages.back);
                                setImageErrors(prev => ({ ...prev, back: true }));
                              }}
                              onLoad={() => {
                                console.log("Back image loaded successfully:", idCardImages.back);
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                              <div className="text-center text-gray-400">
                                <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-sm">Không thể tải ảnh</p>
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-transparent group-hover:from-black/20 group-hover:via-black/10 group-hover:to-black/20 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-2">
                              <Eye className="w-6 h-6 text-white drop-shadow-lg" />
                              <span className="text-white text-sm font-medium bg-black/70 px-3 py-1 rounded-full">
                                Click để phóng to
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Mặt sau căn cước công dân
                        </label>
                        <div className="relative w-full aspect-[85.6/53.98] rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Chưa có ảnh</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
          </CardContent>
        </Card>
      )}

      {/* Thông tin khác */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Thông tin khác
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userProfile.bio && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu</label>
                <p className="text-gray-900">{userProfile.bio}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo tài khoản</label>
              <p className="text-gray-900 text-sm">{formatDateTime(userProfile.createdAt)}</p>
            </div>
            {userProfile.lastLoginAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lần đăng nhập cuối</label>
                <p className="text-gray-900 text-sm">{formatDateTime(userProfile.lastLoginAt)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal xem ảnh phóng to */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75"
          onClick={() => {
            setSelectedImage(null);
            setImageErrors(prev => ({ ...prev, modal: false }));
          }}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden">
            <div className="sticky top-0 bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{selectedImage.label}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Đóng"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="relative w-full aspect-[85.6/53.98] bg-gray-100 flex items-center justify-center">
              {!imageErrors.modal ? (
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.label}
                  fill
                  className="object-contain bg-white"
                  unoptimized
                  onError={() => {
                    console.error("Error loading image in modal:", selectedImage.url);
                    setImageErrors(prev => ({ ...prev, modal: true }));
                  }}
                  onLoad={() => {
                    setImageErrors(prev => ({ ...prev, modal: false }));
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center text-gray-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Không thể tải ảnh</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

