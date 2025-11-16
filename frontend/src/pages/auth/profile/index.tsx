import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/redux_store';
import { getUserProfile, changePassword, verifyPassword } from '@/services/auth/user.api';
import { validatePassword } from '@/lib/validation-password';
import { toast } from 'sonner';
import type { UserProfile, ProfileApiResponse } from '@iService';
import { ProfileSidebar } from '@/components/ui/auth/profile/profile-sidebar';
import { ProfileHeader as UserProfileHeader } from '@/components/ui/auth/profile/user-profile';
import { ChangePasswordModal } from '@/components/ui/auth/profile/change-password-modal';
import { AvatarUploadModal } from '@/components/ui/auth/profile/avatar-upload-modal';
import { AddressSelector } from '@/components/ui/auth/address/address-selector';
import { AccountVerification } from '@/components/ui/auth/profile/account-verification';
import { SignatureManagement } from '@/components/ui/auth/signature/signature-management';
import { LoyaltyManagement } from '@/components/ui/auth/profile/loyalty-management';
import { UserDisputes } from '@/components/ui/auth/profile/user-disputes';
import { UserDetails } from '@/components/ui/auth/profile/user-details';
import { ownerRequestApi } from '@/services/auth/ownerRequest.api';
import dynamic from 'next/dynamic';

// Render trang Ví & giao dịch inline
const WalletPage = dynamic(() => import('@/pages/wallet'), { ssr: false });

const OrdersPage = dynamic(() => import('@/components/ui/auth/order'), { ssr: false });
const OrderDetailInline = dynamic(() => import('@/components/ui/auth/order/[id]'), { ssr: false });

const DiscountsPage = dynamic(() => import('@/components/ui/auth/discounts'), { ssr: false });

export default function ProfilePage() {
  const router = useRouter();
  const { accessToken } = useSelector((state: RootState) => state.auth);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [showEditModal, setShowEditModal] = useState(false);
  // Legacy modal flag kept for compatibility (unused in inline flow)
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!accessToken) {
      router.push('/auth/login');
    }
  }, [accessToken, router]);

  // Fetch user profile
  const fetchUserProfile = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: ProfileApiResponse = await getUserProfile();

      if (result.code === 200) {
        setUserProfile((result.user as UserProfile) ?? (result.data as UserProfile) ?? null);
      } else if (result.code === 401) {
        // Token expired or invalid - chỉ logout khi token thực sự hết hạn
        toast.error('Phiên đăng nhập đã hết hạn');
        router.push('/auth/login');
      } else if (result.code === 404) {
        // User not found - không logout, chỉ hiển thị lỗi
        setError(result.message || 'Không tìm thấy thông tin người dùng');
        toast.error(result.message || 'Không tìm thấy thông tin người dùng');
      } else {
        setError(result.message || 'Không thể lấy thông tin người dùng');
        toast.error(result.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);

      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Không thể kết nối đến server');
        toast.error('Không thể kết nối đến server');
      } else {
        setError(`Lỗi: ${error instanceof Error ? error.message : String(error)}`);
        toast.error('Có lỗi xảy ra khi lấy thông tin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto fetch khi component mount
  useEffect(() => {
    if (accessToken) {
      fetchUserProfile();
    }
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAvatarEditClick = useCallback(() => {
    setShowAvatarModal(true);
  }, []);

  const handleAvatarUpdated = useCallback((newAvatarUrl: string) => {
    setUserProfile(prev => prev ? { ...prev, avatarUrl: newAvatarUrl } : null);
  }, []);

  // Owner request (inline)
  const [showOwnerForm, setShowOwnerForm] = useState(true);
  const [ownerReason, setOwnerReason] = useState('Muốn đăng đồ cho thuê trên hệ thống');
  const [ownerInfo, setOwnerInfo] = useState('');
  const [ownerSubmitting, setOwnerSubmitting] = useState(false);

  const submitOwnerRequest = useCallback(async () => {
    if (!ownerReason.trim()) {
      toast.error('Vui lòng nhập lý do');
      return;
    }
    setOwnerSubmitting(true);
    try {
      await ownerRequestApi.createOwnerRequest({ 
        reason: ownerReason.trim(), 
        additionalInfo: ownerInfo.trim() || undefined 
      });
      toast.success('Gửi yêu cầu thành công');
      setShowOwnerForm(false);
      setOwnerInfo('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể gửi yêu cầu');
    } finally {
      setOwnerSubmitting(false);
    }
  }, [ownerReason, ownerInfo]);
  type MenuKey = 'orders' | 'wallet' | 'discounts' | 'messages' | 'settings' | 'security' | 'addresses' | 'ownership' | 'disputes' | 'changePassword' | 'signature' | 'loyalty' | 'details';
  
  // Get initial menu from URL query or default to null (no default menu)
  const getInitialMenu = (): MenuKey | null => {
    const menuFromQuery = router.query.menu as MenuKey | undefined;
    if (menuFromQuery && ['orders', 'wallet', 'discounts', 'messages', 'settings', 'security', 'addresses', 'ownership', 'disputes', 'changePassword', 'signature', 'loyalty', 'details'].includes(menuFromQuery)) {
      return menuFromQuery;
    }
    return null;
  };
  
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(getInitialMenu());
  
  // Update menu when URL query changes
  useEffect(() => {
    const menuFromQuery = router.query.menu as MenuKey | undefined;
    if (menuFromQuery && ['orders', 'wallet', 'discounts', 'messages', 'settings', 'security', 'addresses', 'ownership', 'disputes', 'changePassword', 'signature', 'loyalty', 'details'].includes(menuFromQuery)) {
      setActiveMenu(menuFromQuery);
    }
  }, [router.query.menu]);
  
  // Update URL when menu changes
  const handleMenuChange = useCallback((menu: MenuKey) => {
    setActiveMenu(menu);
    router.replace({ pathname: router.pathname, query: { ...router.query, menu } }, undefined, { shallow: true });
  }, [router]);

  // Reset password verification when switching away from changePassword menu
  useEffect(() => {
    if (activeMenu !== 'changePassword') {
      setIsPasswordVerified(false);
      setVerificationPassword('');
      setVerificationError('');
    }
  }, [activeMenu]);

  // Inline change password state
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState('');
  const [showVerificationPassword, setShowVerificationPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [showPw, setShowPw] = useState<{ new: boolean; confirm: boolean }>({ new: false, confirm: false });

  const handleVerifyPasswordForChange = useCallback(async () => {
    if (!verificationPassword.trim()) {
      setVerificationError('Vui lòng nhập mật khẩu');
      return;
    }

    try {
      setIsVerifyingPassword(true);
      setVerificationError('');
      const result = await verifyPassword(verificationPassword);
      
      if (result.code === 200) {
        setIsPasswordVerified(true);
        toast.success('Xác thực thành công');
      } else {
        setVerificationError(result.message || 'Mật khẩu không đúng');
        toast.error(result.message || 'Mật khẩu không đúng');
      }
    } catch (err) {
      console.error('Error verifying password:', err);
      setVerificationError('Có lỗi xảy ra khi xác thực mật khẩu');
      toast.error('Có lỗi xảy ra khi xác thực mật khẩu');
    } finally {
      setIsVerifyingPassword(false);
    }
  }, [verificationPassword]);

  const submitInlineChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof pwErrors = {};
    const v = validatePassword(pwForm.newPassword);
    if (!v.isValid) errors.newPassword = v.message;
    if (!pwForm.confirmPassword.trim()) {
      errors.confirmPassword = 'Vui lòng nhập lại mật khẩu mới';
    } else if (pwForm.newPassword !== pwForm.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu mới không khớp';
    }
    setPwErrors(errors);
    if (Object.keys(errors).length) return;
    
    setIsChangingPassword(true);
    try {
      const res = await changePassword({ 
        currentPassword: verificationPassword, 
        newPassword: pwForm.newPassword 
      });
      if (res.code === 200) {
        toast.success(res.message || 'Đổi mật khẩu thành công');
        setPwForm({ newPassword: '', confirmPassword: '' });
        setPwErrors({});
        setIsPasswordVerified(false);
        setVerificationPassword('');
      } else {
        toast.error(res.message || 'Đổi mật khẩu thất bại');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi đổi mật khẩu');
    } finally {
      setIsChangingPassword(false);
    }
  }, [pwForm, verificationPassword]);

  // Normalize user profile - must be called before early returns
  const normalizedUserProfile = useMemo((): UserProfile | null => {
    if (!userProfile) return null;
    return {
      ...userProfile,
      wallet: userProfile.wallet ?? { currency: 'VND', balance: 0 },
    } as UserProfile;
  }, [userProfile]);

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-gray-900">
          <h1 className="text-2xl font-bold mb-4">Chưa đăng nhập</h1>
          <p className="text-gray-600 mb-6">Vui lòng đăng nhập để xem thông tin cá nhân</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center text-gray-900">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-lg">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center text-gray-900 max-w-md mx-auto px-4">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4">Có lỗi xảy ra</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchUserProfile}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!userProfile || !normalizedUserProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar */}
            <aside className="lg:col-span-3">
              <ProfileSidebar
                active={activeMenu || 'settings'}
                onChange={handleMenuChange}
                user={{ 
                  fullName: normalizedUserProfile.fullName, 
                  email: normalizedUserProfile.email, 
                  avatarUrl: normalizedUserProfile.avatarUrl 
                }}
              />
            </aside>

            {/* Content */}
            <section className="lg:col-span-9">
              {!activeMenu && (
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-100 shadow-lg">
                  {/* Decorative background elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-200/20 to-purple-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                  
                  <div className="relative p-12 text-center">
                    {/* Icon */}
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-6 transform hover:scale-105 transition-transform duration-300">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    
                    {/* Title */}
                    <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Chào mừng bạn trở lại!
                    </h2>
                    
                    {/* Description */}
                    <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                      Quản lý tài khoản, đơn hàng và nhiều hơn thế nữa. Hãy chọn một mục từ menu bên trái để bắt đầu.
                    </p>
                    
                    {/* Quick stats or features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                        <div className="text-2xl font-bold text-indigo-600 mb-1">📦</div>
                        <div className="text-sm font-semibold text-gray-800">Đơn hàng</div>
                        <div className="text-xs text-gray-600 mt-1">Theo dõi đơn hàng</div>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                        <div className="text-2xl font-bold text-purple-600 mb-1">💳</div>
                        <div className="text-sm font-semibold text-gray-800">Ví & Giao dịch</div>
                        <div className="text-xs text-gray-600 mt-1">Quản lý tài chính</div>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                        <div className="text-2xl font-bold text-pink-600 mb-1">⚙️</div>
                        <div className="text-sm font-semibold text-gray-800">Cài đặt</div>
                        <div className="text-xs text-gray-600 mt-1">Tùy chỉnh tài khoản</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeMenu === 'orders' && (
                <div className="rounded-xl overflow-hidden">
                  {router.query.orderId ? (
                    <OrderDetailInline id={String(router.query.orderId)} />
                  ) : (
                    <OrdersPage
                      onOpenDetail={(id: string) => {
                        const { pathname, query } = router;
                        router.replace({ pathname, query: { ...query, orderId: id } }, undefined, { shallow: true });
                      }}
                    />
                  )}
                </div>
              )}

              {activeMenu === 'wallet' && (
                <div className="rounded-xl overflow-hidden">
                  <WalletPage />
                </div>
              )}

              {activeMenu === 'discounts' && (
                <div className="rounded-xl overflow-hidden">
                  <DiscountsPage />
                </div>
              )}

              {activeMenu === 'messages' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Tin nhắn</h2>
                  <p className="text-gray-600 mb-4">Trao đổi với người dùng khác.</p>
                  <button onClick={() => router.push('/auth/messages')}
                    className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Mở hộp thoại</button>
                </div>
              )}

              {activeMenu === 'settings' && (
                <div className="rounded-xl overflow-hidden">
                  <UserProfileHeader
                    userProfile={normalizedUserProfile}
                    onEditClick={() => {}}
                    onAvatarEditClick={handleAvatarEditClick}
                  />
                </div>
              )}

              {activeMenu === 'details' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <UserDetails userProfile={normalizedUserProfile} />
                </div>
              )}

              {activeMenu === 'security' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 pt-6 scroll-mt-24">
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">Xác minh tài khoản</h3>
                  </div>
                  <AccountVerification />
                </div>
              )}

              {activeMenu === 'changePassword' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Đổi mật khẩu</h2>
                  
                  {!isPasswordVerified ? (
                    <div className="flex justify-center">
                      <div className="w-full max-w-md space-y-4">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                          Xác thực mật khẩu
                        </h3>
                        <p className="text-sm text-gray-600 text-center mb-6">
                          Để bảo vệ tài khoản, vui lòng nhập mật khẩu hiện tại của bạn để tiếp tục đổi mật khẩu
                        </p>
                        
                        <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mật khẩu hiện tại <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showVerificationPassword ? 'text' : 'password'}
                              value={verificationPassword}
                              onChange={(e) => {
                                setVerificationPassword(e.target.value);
                                setVerificationError('');
                              }}
                              placeholder="Nhập mật khẩu hiện tại"
                              className={`w-full px-3 py-2 border rounded-md pr-10 ${verificationError ? 'border-red-500' : 'border-gray-300'}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleVerifyPasswordForChange();
                                }
                              }}
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowVerificationPassword(!showVerificationPassword)} 
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm hover:text-gray-700"
                            >
                              {showVerificationPassword ? 'Ẩn' : 'Hiện'}
                            </button>
                          </div>
                          {verificationError && <p className="text-sm text-red-600 mt-1">{verificationError}</p>}
                        </div>
                        
                        <button
                          onClick={handleVerifyPasswordForChange}
                          disabled={isVerifyingPassword || !verificationPassword.trim()}
                          className="w-full px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60"
                        >
                          {isVerifyingPassword ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Đang xác thực...</span>
                            </div>
                          ) : (
                            'Xác thực'
                          )}
                        </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={submitInlineChangePassword} className="space-y-4 max-w-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input
                            type={showPw.new ? 'text' : 'password'}
                            value={pwForm.newPassword}
                            onChange={(e) => { setPwForm({ ...pwForm, newPassword: e.target.value }); if (pwErrors.newPassword) setPwErrors({ ...pwErrors, newPassword: undefined }); }}
                            className={`w-full px-3 py-2 border rounded-md ${pwErrors.newPassword ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="Nhập mật khẩu mới"
                          />
                          <button type="button" onClick={() => setShowPw({ ...showPw, new: !showPw.new })} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{showPw.new ? 'Ẩn' : 'Hiện'}</button>
                        </div>
                        {pwErrors.newPassword && <p className="text-sm text-red-600 mt-1">{pwErrors.newPassword}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu mới <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input
                            type={showPw.confirm ? 'text' : 'password'}
                            value={pwForm.confirmPassword}
                            onChange={(e) => { setPwForm({ ...pwForm, confirmPassword: e.target.value }); if (pwErrors.confirmPassword) setPwErrors({ ...pwErrors, confirmPassword: undefined }); }}
                            className={`w-full px-3 py-2 border rounded-md ${pwErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="Nhập lại mật khẩu mới"
                          />
                          <button type="button" onClick={() => setShowPw({ ...showPw, confirm: !showPw.confirm })} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{showPw.confirm ? 'Ẩn' : 'Hiện'}</button>
                        </div>
                        {pwErrors.confirmPassword && <p className="text-sm text-red-600 mt-1">{pwErrors.confirmPassword}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={isChangingPassword} className="px-4 py-2 rounded-md bg-gray-900 hover:bg-black text-white text-sm disabled:opacity-60">{isChangingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
                        <button type="button" onClick={() => {
                          setPwForm({ newPassword: '', confirmPassword: '' });
                          setIsPasswordVerified(false);
                          setVerificationPassword('');
                        }} className="px-4 py-2 rounded-md border text-sm">Làm mới</button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {activeMenu === 'addresses' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Địa chỉ nhận hàng/nhận đồ</h2>
                  <p className="text-gray-600 mb-4">Quản lý địa chỉ nhận hàng/nhận đồ.</p>
                  <AddressSelector />
                </div>
              )}

              {activeMenu === 'ownership' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Yêu cầu quyền Owner</h2>
                  {userProfile?.role === 'owner' ? (
                    <p className="text-green-700">Bạn đã là Owner. Bạn có thể đăng đồ cho thuê.</p>
                  ) : (
                    <>
                      {showOwnerForm && (
                        <div className="space-y-3 max-w-xl">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lý do <span className="text-red-500">*</span></label>
                            <input
                              value={ownerReason}
                              onChange={(e) => setOwnerReason(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Vì sao bạn muốn trở thành Owner?"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Thông tin bổ sung</label>
                            <textarea
                              value={ownerInfo}
                              onChange={(e) => setOwnerInfo(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Ví dụ: Kinh nghiệm, mô tả cửa hàng, khu vực..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={submitOwnerRequest}
                              disabled={ownerSubmitting}
                              className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60"
                            >
                              {ownerSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeMenu === 'disputes' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <UserDisputes />
                </div>
              )}

              {activeMenu === 'signature' && (
                <SignatureManagement
                  isOpen={true}
                  onClose={() => { }}
                  onSuccess={() => toast.success('Cập nhật chữ ký thành công')}
                  inline
                />
              )}

              {activeMenu === 'loyalty' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">RT Points - Hệ thống điểm thưởng</h2>
                  <LoyaltyManagement />
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Change Password Modal - kept for reuse elsewhere */}
      <ChangePasswordModal open={false} onOpenChange={() => { }} />

      {/* Avatar Upload Modal */}
      {userProfile && (
        <AvatarUploadModal
          userProfile={normalizedUserProfile}
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          onAvatarUpdated={handleAvatarUpdated}
        />
      )}
    </div>
  );
}
