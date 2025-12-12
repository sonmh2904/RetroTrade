"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import AdminLayout from "../layout"
import { Button } from "@/components/ui/common/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card"
import { Badge } from "@/components/ui/common/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/common/avatar"
import { ArrowLeft, Mail, Phone, Calendar, Shield, Star, Coins, Wallet } from "lucide-react"
import { getUserById } from "@/services/auth/user.api"
import type { UserProfile, ApiResponse } from "@iService"

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      if (!id || typeof id !== 'string') return
      
      try {
        setLoading(true)
        setError(null)
        
        const response: ApiResponse<UserProfile> = await getUserById(id)
        
        if (response.code === 200 && response.data) {
          setUser(response.data)
        } else {
          setError(response.message || 'Không thể tải thông tin người dùng')
        }
      } catch (err) {
        console.error('Error fetching user:', err)
        setError('Đã xảy ra lỗi khi tải thông tin người dùng')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [id])

  const handleBack = () => {
    router.push('/admin/user-management')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-500'
      case 'moderator':
        return 'bg-blue-500'
      case 'renter':
        return 'bg-green-500'
      case 'owner':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Quản trị viên'
      case 'moderator':
        return 'Điều hành viên'
      case 'renter':
        return 'Người thuê'
      case 'owner':
        return 'Chủ sở hữu'
      default:
        return role
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-600 text-xl">Đang tải...</div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-red-500 text-xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold mb-2">Lỗi</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Quay lại
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-gray-500 text-xl mb-4">👤</div>
                <h3 className="text-lg font-semibold mb-2">Không tìm thấy người dùng</h3>
                <p className="text-gray-600 mb-4">Người dùng với ID này không tồn tại</p>
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Quay lại
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  return (
      <div>
        {/* Header */}
        <div className="mb-6">
          <Button 
            onClick={handleBack} 
            variant="outline" 
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại danh sách người dùng
          </Button>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thông tin người dùng</h2>
          <p className="text-gray-600">Chi tiết thông tin và trạng thái tài khoản</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                    <AvatarFallback className="text-lg">
                      {user.fullName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {user.displayName || user.fullName}
                  </h3>
                  
                  <Badge className={`${getRoleBadgeColor(user.role)} text-white mb-4`}>
                    {getRoleDisplayName(user.role)}
                  </Badge>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="flex items-center justify-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {user.phone}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin chi tiết</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Thông tin cơ bản</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Họ và tên</label>
                      <p className="text-gray-900 font-medium">{user.fullName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Tên hiển thị</label>
                      <p className="text-gray-900 font-medium">{user.displayName || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <p className="text-gray-900 font-medium">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Số điện thoại</label>
                      <p className="text-gray-900 font-medium">{user.phone || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                  {user.bio && (
                    <div className="mt-4">
                      <label className="text-sm text-gray-600">Giới thiệu</label>
                      <p className="text-gray-900 font-medium">{user.bio}</p>
                    </div>
                  )}
                </div>

                <div className="h-px bg-gray-200 w-full" />

                {/* Status */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Trạng thái xác thực</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 mr-2 text-gray-600" />
                      <span className="text-gray-600 mr-2">Email:</span>
                      <Badge variant={user.isEmailConfirmed ? "default" : "secondary"}>
                        {user.isEmailConfirmed ? "Đã xác thực" : "Chưa xác thực"}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 mr-2 text-gray-600" />
                      <span className="text-gray-600 mr-2">SĐT:</span>
                      <Badge variant={user.isPhoneConfirmed ? "default" : "secondary"}>
                        {user.isPhoneConfirmed ? "Đã xác thực" : "Chưa xác thực"}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-gray-600" />
                      <span className="text-gray-600 mr-2">ID:</span>
                      <Badge variant={user.isIdVerified ? "default" : "secondary"}>
                        {user.isIdVerified ? "Đã xác thực" : "Chưa xác thực"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-200 w-full" />

                {/* Stats */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Thống kê</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 mr-2 text-yellow-500" />
                      <span className="text-gray-600 mr-2">Điểm uy tín:</span>
                      <span className="text-gray-900 font-medium">{user.reputationScore}</span>
                    </div>
                    <div className="flex items-center">
                      <Coins className="w-5 h-5 mr-2 text-green-500" />
                      <span className="text-gray-600 mr-2">Điểm:</span>
                      <span className="text-gray-900 font-medium">{user.points}</span>
                    </div>
                    {user.wallet && (
                      <div className="flex items-center">
                        <Wallet className="w-5 h-5 mr-2 text-blue-500" />
                        <span className="text-gray-600 mr-2">Số dư:</span>
                        <span className="text-gray-900 font-medium">
                          {user.wallet.balance.toLocaleString()} {user.wallet.currency}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-gray-200 w-full" />

                {/* Dates */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Thông tin thời gian</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                      <div>
                        <label className="text-sm text-gray-600">Ngày tạo</label>
                        <p className="text-gray-900 font-medium">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                      <div>
                        <label className="text-sm text-gray-600">Cập nhật lần cuối</label>
                        <p className="text-gray-900 font-medium">{formatDate(user.updatedAt)}</p>
                      </div>
                    </div>
                    {user.lastLoginAt && (
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                        <div>
                          <label className="text-sm text-gray-600">Đăng nhập lần cuối</label>
                          <p className="text-gray-900 font-medium">{formatDate(user.lastLoginAt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}
