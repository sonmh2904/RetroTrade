"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Badge } from "@/components/ui/common/badge";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { User, Mail, Phone, Calendar, MapPin, CreditCard, Shield, CheckCircle, XCircle, Clock, Lock, Eye, EyeOff } from "lucide-react";
import type { UserProfile } from "@iService";
import { verifyPassword } from "@/services/auth/user.api";
import { toast } from "sonner";

interface UserDetailsProps {
  userProfile: UserProfile;
}

export function UserDetails({ userProfile }: UserDetailsProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

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
        setShowPasswordDialog(false);
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
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <p className="text-gray-900">{userProfile.email || "Chưa có thông tin"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Số căn cước công dân
                </label>
                <p className="text-gray-900 font-medium">{userProfile.idCardInfo.idNumber || "Chưa có thông tin"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Họ và tên
                </label>
                <p className="text-gray-900">{userProfile.idCardInfo.fullName || "Chưa có thông tin"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Ngày tháng năm sinh
                </label>
                <p className="text-gray-900">{formatDate(userProfile.idCardInfo.dateOfBirth)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Địa chỉ thường trú
                </label>
                <p className="text-gray-900">{userProfile.idCardInfo.address || "Chưa có thông tin"}</p>
              </div>
              {userProfile.idCardInfo.extractedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái tài khoản</label>
              <div className="flex items-center gap-2 mt-1">
                {userProfile.isActive && !userProfile.isDeleted ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Hoạt động</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">Đã bị khóa</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

