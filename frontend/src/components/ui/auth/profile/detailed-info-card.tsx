"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card"
import { Badge } from "@/components/ui/common/badge"
import { User, Mail, Phone, Calendar, Shield } from "lucide-react"
import { useState, forwardRef, useImperativeHandle, useRef } from "react"
import { toast } from "sonner"
import type { UserProfile } from "@iService"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/common/dialog"
import { PhoneVerification } from "@/components/ui/auth/verify/PhoneVerification"
import OTPInput from "../verify/OTPInput"
import { sendOtpFirebase, verifyOtpFirebase } from "@/services/auth/auth.api"
import Script from "next/script"

interface DetailedInfoCardProps {
  userProfile: UserProfile;
}

export type DetailedInfoCardHandle = {
  openPhoneEditor: () => void
}

export const DetailedInfoCard = forwardRef<DetailedInfoCardHandle, DetailedInfoCardProps>(function DetailedInfoCard({ userProfile }: DetailedInfoCardProps, ref) {
  const [localPhone, setLocalPhone] = useState<string | undefined>(userProfile.phone)
  const phoneSectionRef = useRef<HTMLDivElement | null>(null)
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [sessionInfo, setSessionInfo] = useState("")
  const [step, setStep] = useState(1) // 1: phone, 2: OTP
  const [isLoading, setIsLoading] = useState(false)

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_WEB_API_KEY as string,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  }

  const formatPhoneNumber = (phone: string): string => {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('0')) return '+84' + digits.substring(1)
    if (digits.startsWith('84')) return '+' + digits
    if (phone.startsWith('+')) return phone
    return '+84' + digits
  }

  const handleEditPhone = () => {
    setIsDialogOpen(true)
    setPhoneNumber("")
    setOtp("")
    setSessionInfo("")
    setStep(1)
  }

  const handleSendOTP = async () => {
    try {
      setIsLoading(true)
      const formattedPhone = formatPhoneNumber(phoneNumber)
      console.log('Formatted phone:', formattedPhone)
      
      const firebaseMaybe = (window as unknown as { firebase?: { apps?: unknown[]; initializeApp: (config: unknown) => void; auth: { RecaptchaVerifier: new (container: string, opts: { size: 'invisible' }) => { verify: () => Promise<string> } } } }).firebase
      if (!firebaseMaybe) throw new Error('Firebase SDK not loaded')
      
      const firebase = firebaseMaybe
      if (!firebase.apps?.length) firebase.initializeApp(firebaseConfig)
      
      const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
      let recaptchaToken: string | undefined
      
      if (!emulatorHost) {
        const container = document.getElementById('recaptcha-container')
        if (container) container.innerHTML = ''
        const verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { size: 'invisible' })
        recaptchaToken = await verifier.verify()
      }
      
      const response = await sendOtpFirebase(formattedPhone, recaptchaToken)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Send OTP failed')
      setSessionInfo(data?.data?.sessionInfo || '')
      toast.success("Đã gửi mã OTP!")
      setStep(2)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi gửi OTP")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    try {
      setIsLoading(true)
      const response = await verifyOtpFirebase(sessionInfo, otp)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Verify OTP failed')
      
      toast.success("Xác minh số điện thoại thành công!")
      setLocalPhone(phoneNumber)
      const profile = userProfile as UserProfile & { phone?: string; isPhoneConfirmed?: boolean }
      profile.phone = phoneNumber
      profile.isPhoneConfirmed = true
      setIsDialogOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi xác minh OTP")
    } finally {
      setIsLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({
    openPhoneEditor: () => {
      if (phoneSectionRef.current) {
        phoneSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      setTimeout(() => handleEditPhone(), 200)
    }
  }))
  return (
    <>
    <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-xl group overflow-hidden relative h-full">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-300" />

      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          Thông tin chi tiết
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-300">
              <label className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Họ và tên
              </label>
              <p className="text-gray-900 font-medium">{userProfile.fullName}</p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-300">
              <label className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <p className="text-gray-900 font-medium">{userProfile.email}</p>
            </div>

            <div ref={phoneSectionRef} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-300">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Số điện thoại
                </label>
                <button
                  type="button"
                  onClick={handleEditPhone}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  {localPhone ? "Chỉnh sửa" : "Thêm"}
                </button>
              </div>
              <p className="text-gray-900 font-medium">{localPhone || "—"}</p>
              {!localPhone && (
                <p className="text-xs text-gray-500 mt-1">Bạn có thể bỏ trống số điện thoại.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">

            <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-300">
              <label className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Cập nhật lần cuối
              </label>
              <p className="text-gray-900 text-sm">
                {new Date(userProfile.updatedAt).toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-300">
              <label className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Trạng thái
              </label>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 hover:from-green-600 hover:to-emerald-600">
                Hoạt động
              </Badge>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-300">
              <label className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Đăng nhập lần cuối
              </label>
              <p className="text-gray-900 text-sm">
                {userProfile.lastLoginAt ? new Date(userProfile.lastLoginAt).toLocaleString('vi-VN') : "—"}
              </p>
            </div>


          </div>
        </div>

        {userProfile.bio && (
          <div className="pt-6 border-t border-gray-200">
            <label className="text-sm text-gray-500 block mb-2">Giới thiệu</label>
            <p className="text-gray-900">{userProfile.bio}</p>
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Phone Verification Dialog */}
    <Script src="https://www.gstatic.com/firebasejs/9.x/firebase-compat.js" strategy="lazyOnload" />
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thay đổi số điện thoại</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {step === 1 && (
            <PhoneVerification
              onSuccess={handleSendOTP}
            />
          )}
          
          {step === 2 && (
            <OTPInput
              otp={otp}
              setOtp={setOtp}
              onNext={handleVerifyOTP}
              onBack={() => setStep(1)}
              isLoading={isLoading}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    <div id="recaptcha-container" />
    </>
  )
})
