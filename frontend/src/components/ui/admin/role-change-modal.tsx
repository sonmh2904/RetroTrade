"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/common/button"
import { Badge } from "@/components/ui/common/badge"
import { AlertTriangle, UserCheck, X } from "lucide-react"
import { toast } from "sonner"
import type { UserProfile } from "@/services/iService"

interface RoleChangeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserProfile | null
  onConfirm: (userId: string, newRole: string) => void
  loading?: boolean
  currentAdminRole?: string | null
}

const ROLE_OPTIONS = [
  { value: "renter", label: "Renter", description: "Chủ thuê sản phẩm" },
  { value: "owner", label: "Owner", description: "Chủ sở hữu sản phẩm" },
  { value: "moderator", label: "Moderator", description: "Người kiểm duyệt" },
  { value: "admin", label: "Admin", description: "Quản trị viên hệ thống" }
]

const getRoleBadge = (role: string) => {
  switch (role) {
    case "admin":
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Admin</Badge>
    case "moderator":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Moderator</Badge>
    case "owner":
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Owner</Badge>
    case "user":
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">User</Badge>
    default:
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Unknown</Badge>
  }
}

export function RoleChangeModal({
  open,
  onOpenChange,
  user,
  onConfirm,
  loading = false,
  currentAdminRole = null
}: RoleChangeModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>("")

  const handleConfirm = () => {
    if (user && selectedRole && selectedRole !== user.role) {
      // Prevent admin from changing role to same level as themselves
      if (currentAdminRole && selectedRole.toLowerCase() === currentAdminRole.toLowerCase()) {
        toast.error("Bạn không thể chỉnh quyền cho tài khoản cùng cấp bậc")
        return
      }
      onConfirm(user._id, selectedRole)
    }
  }

  const handleClose = useCallback(() => {
    setSelectedRole("")
    onOpenChange(false)
  }, [onOpenChange])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, handleClose])

  if (!user || !open) return null

  const selectedRoleOption = ROLE_OPTIONS.find(option => option.value === selectedRole)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Đổi quyền người dùng</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-300 text-sm mb-4">
            Thay đổi vai trò của người dùng trong hệ thống
          </p>

          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">Tên:</span>
                <span className="text-white font-medium">{user.displayName || user.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">Email:</span>
                <span className="text-white">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">Quyền hiện tại:</span>
                {getRoleBadge(user.role)}
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Chọn quyền mới:</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Chọn quyền mới...</option>
                {ROLE_OPTIONS.map((option) => {
                  // Disable if it's the user's current role or if it's the same level as current admin
                  const isCurrentRole = option.value === user.role
                  const isSameLevelAsAdmin = Boolean(currentAdminRole && option.value.toLowerCase() === currentAdminRole.toLowerCase())
                  const isDisabled = isCurrentRole || isSameLevelAsAdmin
                  
                  return (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={isDisabled}
                      className="bg-slate-800 text-white"
                    >
                      {option.label} - {option.description}
                      {isSameLevelAsAdmin && " (Không thể chỉnh quyền cùng cấp bậc)"}
                    </option>
                  )
                })}
              </select>
              {selectedRoleOption && (
                <p className="text-xs text-slate-400">{selectedRoleOption.description}</p>
              )}
            </div>

            {/* Warning */}
            {selectedRole && selectedRole !== user.role && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-yellow-400 font-medium">Cảnh báo!</p>
                    <p className="text-yellow-300">
                      Thay đổi quyền có thể ảnh hưởng đến quyền truy cập và chức năng của người dùng này.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-slate-700">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-slate-300 hover:bg-slate-800"
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedRole || selectedRole === user.role || loading}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {loading ? "Đang xử lý..." : "Xác nhận đổi quyền"}
          </Button>
        </div>
      </div>
    </div>
  )
}
