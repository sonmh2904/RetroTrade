"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { decodeToken } from '@/utils/jwtHelper';
import { toast } from "sonner";
import { Crown, Users, BarChart3, Settings, Home, Wallet, Percent,Contact, Tag, FileText, LineChart , PenTool } from "lucide-react";
import { AdminHeader } from "@/components/ui/admin/admin-header";
import { RootState } from "@/store/redux_store";
import { logout } from "@/store/auth/authReducer";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state: RootState) => state.auth);

  // Check authorization on mount
  useEffect(() => {
    setIsLoading(true);
    
    if (!accessToken) {
      toast.error("Bạn cần đăng nhập để truy cập trang admin");
      router.push("/auth/login");
      return;
    }

    const decoded = decodeToken(accessToken);

    if (!decoded) {
      toast.error("Token không hợp lệ hoặc đã hết hạn");
      dispatch(logout());
      router.push("/auth/login");
      setIsLoading(false);
      return;
    }

    // Check if user has admin role
    if (decoded.role !== "admin") {
      toast.error("Bạn không có quyền truy cập trang admin");
      router.push("/home");
      setIsLoading(false);
      return;
    }

    setIsAuthorized(true);
    setIsLoading(false);
  }, [accessToken, router, dispatch]);

  // Show loading while checking authorization
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-900">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authorized
  if (!isAuthorized) {
    return null;
  }

  const menus = [
    { icon: Home, label: "Trang chủ", key: "home", href: "/home" },
    { icon: LineChart, label: "Dashboard Admin", key: "analytics", href: "/admin/dashboard" },
    { icon: Users, label: "Người dùng", key: "users", href: "/admin/user-management" },
    { icon: FileText, label: "Điều khoản", key: "terms", href: "/admin/terms" },
    { icon: PenTool, label: "Chính sách", key: "wallet", href: "/admin/privacy" },
    { icon: Wallet, label: "Quản lý ví", key: "wallet", href: "/admin/wallet" },
    { icon: Contact, label: "Quản lý hợp đồng", key: "contract", href: "/admin/contract" },
    { icon: Percent, label: "Quản lý Phí dịch vụ", key: "serviceFee", href: "/admin/serviceFee-management" },
    { icon: Tag, label: "Mã giảm giá", key: "discounts", href: "/admin/discount-management" },
    { icon: BarChart3, label: "Lịch sử thay đổi", key: "audit", href: "/admin/audit-logs" },
    { icon: Settings, label: "Cài đặt", key: "settings", href: "/admin/settings" },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm border-r border-gray-200 p-6 flex flex-col fixed h-full">
        <div className="flex items-center gap-2 mb-10">
          <Crown className="w-7 h-7 text-yellow-500" />
          <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
        </div>

        <nav className="flex flex-col gap-1 text-gray-700">
          {menus.map(({ icon: Icon, label, href, key }) => (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                activePage === key
                  ? "bg-indigo-100 text-indigo-600 font-medium"
                  : "hover:bg-indigo-50 hover:text-indigo-600"
              }`}
              onClick={() => setActivePage(key)}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-100 text-xs text-gray-500">
          © {new Date().getFullYear()} Admin Panel
        </div>
      </aside>

      {/* Header */}
      <AdminHeader />

      {/* Main content */}
      <main className="flex-1 ml-64 mt-16 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
