"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/common/avatar"
import { Button } from "@/components/ui/common/button"
import { Input } from "@/components/ui/common/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/common/dialog"
import { Phone, Edit2 } from "lucide-react"
import type { UserProfile, ProfileApiResponse } from "@iService"
import { useEffect, useState } from "react"
import { getUserProfile, updateUserProfile } from "@/services/auth/auth.api"
import { toast } from "sonner"
import { AvatarUploadModal } from "@/components/ui/auth/profile/avatar-upload-modal"
import { PhoneVerification } from "@/components/ui/auth/verify/PhoneVerification"

interface ProfileHeaderProps {
  userProfile: UserProfile;
  onEditClick?: () => void;
  onAvatarEditClick?: () => void;
}

export function ProfileHeader({ userProfile }: ProfileHeaderProps) {
  const [isAvatarOpen, setIsAvatarOpen] = useState(false)
  const [showChangePhoneModal, setShowChangePhoneModal] = useState(false)
  const [fullName, setFullName] = useState(userProfile.fullName)
  const [displayName, setDisplayName] = useState(userProfile.displayName || userProfile.fullName)
  const [bio, setBio] = useState(userProfile.bio || "")
  const [email, setEmail] = useState(userProfile.email)
  const [phone, setPhone] = useState(userProfile.phone || "")
  // no loading UI here; rely on parent page

  // helpers reserved (not used currently)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getUserProfile()
        const json: ProfileApiResponse = await res.json()
        const u = (json.user as UserProfile) || (json.data as UserProfile)
        if (json.code === 200 && u) {
          setFullName(u.fullName)
          setDisplayName(u.displayName || u.fullName)
          setBio(u.bio || "")
          setEmail(u.email)
          setPhone(u.phone || "")
        }
      } catch {
        // ignore
      } finally {
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    try {
      const payload: Record<string, unknown> = { fullName, displayName, bio }
      const res = await updateUserProfile(payload)
      const json: ProfileApiResponse = await res.json()
      if (json.code === 200) toast.success(json.message || "Cập nhật hồ sơ thành công")
      else toast.error(json.message || "Không thể cập nhật hồ sơ")
    } catch (e) {
      const err = e as Error
      toast.error(err.message || "Lỗi khi cập nhật hồ sơ")
    }
  }
  return (
    <>
        {/* Unified card containing avatar and form with single header */}
        <div className="container mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="relative px-6 py-6 border-b bg-white">
              {/* subtle animated dots */}
              <span className="pointer-events-none absolute -top-3 -left-3 w-16 h-16 bg-indigo-200 rounded-full blur-2xl opacity-30 animate-float" />
              <span className="pointer-events-none absolute -bottom-4 right-6 w-12 h-12 bg-purple-200 rounded-full blur-xl opacity-30 animate-float animation-delay-2000" />
              <h3 className="text-lg font-semibold text-gray-900">Hồ sơ cá nhân</h3>
              <p className="text-sm text-gray-600">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left fields */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-12 sm:col-span-4 text-sm text-gray-600">Tên đăng nhập</div>
                    <div className="col-span-12 sm:col-span-8 text-gray-900 font-medium break-all">{userProfile.email?.split('@')[0]}</div>
                  </div>
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-12 sm:col-span-4 text-sm text-gray-600">Họ và tên</div>
                    <div className="col-span-12 sm:col-span-8"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="max-w-xl" /></div>
                  </div>
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-12 sm:col-span-4 text-sm text-gray-600">Tên hiển thị</div>
                    <div className="col-span-12 sm:col-span-8"><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="max-w-xl" /></div>
                  </div>
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-12 sm:col-span-4 text-sm text-gray-600">Email</div>
                    <div className="col-span-12 sm:col-span-8">
                      <div className="px-3 py-2 rounded-md border bg-gray-50 text-gray-800 max-w-xl">{email}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-12 sm:col-span-4 text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Số điện thoại
                    </div>
                    <div className="col-span-12 sm:col-span-8">
                      <div className="flex items-center gap-2 max-w-xl">
                        <div className="flex-1 px-3 py-2 rounded-md border bg-gray-50 text-gray-800">{phone || '—'}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowChangePhoneModal(true)}
                          className="h-9 px-3 text-xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Đổi số
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 items-start gap-4">
                    <div className="col-span-12 sm:col-span-4 text-sm text-gray-600">Giới thiệu</div>
                    <div className="col-span-12 sm:col-span-8">
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full max-w-2xl min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Viết vài dòng về bạn..." />
                    </div>
                  </div>
                </div>
                {/* Right avatar - inside same card */}
                <div className="lg:col-span-4">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-28 h-28">
                      <AvatarImage src={userProfile.avatarUrl} alt={userProfile.email} />
                      <AvatarFallback className="text-2xl">{userProfile.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button onClick={() => setIsAvatarOpen(true)} className="mt-4">Chọn Ảnh</Button>
                    <p className="text-xs text-gray-500 mt-2">Dung lượng tối đa 5MB • JPG, PNG, GIF, WEBP</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-6">
                <Button onClick={handleSave} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6">Lưu thay đổi</Button>
              </div>
            </div>
          </div>
        </div>

        <AvatarUploadModal
          isOpen={isAvatarOpen}
          onClose={() => setIsAvatarOpen(false)}
          userProfile={userProfile}
          onAvatarUpdated={() => { }}
        />

        {/* Change Phone Number Modal */}
        <Dialog open={showChangePhoneModal} onOpenChange={setShowChangePhoneModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Đổi số điện thoại</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <PhoneVerification
                onSuccess={(newPhone) => {
                  toast.success(`Số điện thoại đã được cập nhật thành công: ${newPhone}`);
                  setPhone(newPhone);
                  setShowChangePhoneModal(false);
                  // Refresh user profile
                  getUserProfile().then(async (res) => {
                    const json: ProfileApiResponse = await res.json();
                    const u = (json.user as UserProfile) || (json.data as UserProfile);
                    if (json.code === 200 && u) {
                      setPhone(u.phone || "");
                    }
                  }).catch(() => {});
                }}
                onCancel={() => setShowChangePhoneModal(false)}
                title="Đổi số điện thoại"
                description="Nhập số điện thoại mới và mã OTP để xác minh"
              />
            </div>
          </DialogContent>
        </Dialog>

      </>
      )
}
