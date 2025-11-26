"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { decodeToken, type DecodedToken } from '@/utils/jwtHelper';
import { toast } from "sonner";
import { Home, Package, ShoppingBag, Wallet, Settings, BarChart3 } from "lucide-react";
import OwnerHeader from "@/components/ui/owner/owner-header";
import { RootState } from "@/store/redux_store";
import { logout } from "@/store/auth/authReducer";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state: RootState) => state.auth);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Check authorization on mount
  useEffect(() => {
    setIsLoading(true);
    
    if (!accessToken) {
      toast.error("Bạn cần đăng nhập để truy cập trang quản lý");
      router.push("/auth/login");
      setIsLoading(false);
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

    // Check if user has owner role
    if (decoded.role !== "owner") {
      toast.error("Bạn không có quyền truy cập trang quản lý chủ sở hữu");
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
    { icon: BarChart3, label: "Dashboard", key: "dashboard", href: "/owner/dashboard" },
    { icon: Package, label: "Sản phẩm của tôi", key: "products", href: "/owner/myproducts" },
    { icon: ShoppingBag, label: "Yêu cầu thuê hàng", key: "requests", href: "/owner/renter-requests" },
    { icon: Wallet, label: "Ví của tôi", key: "wallet", href: "/owner/mywallet" },
    { icon: Settings, label: "Cài đặt", key: "settings", href: "/owner/settings" },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 relative">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "mt-20 w-64 translate-x-0" : "-translate-x-full w-0"
        } bg-white shadow-sm border-r border-gray-200 p-6 flex flex-col fixed top-0 bottom-0 left-0 transition-transform duration-300 z-40 overflow-y-auto`}
      >
        <div className="flex items-center gap-2 mb-10">
          <Package className="w-7 h-7 text-indigo-600" />
          <h1 className="text-xl font-semibold text-gray-900">Bảng quản lý</h1>
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
          © {new Date().getFullYear()} Bảng quản lý
        </div>
      </aside>

      {/* Header */}
      {/* <OwnerHeader onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} /> */}

      {/* Main content */}
      <main
        className={`flex-1 mt-16 p-8 pb-8 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-0"
        }`}
        style={{ minHeight: "calc(100vh - 4rem)", paddingBottom: "2rem" }}
      >
        {children}
      </main>
    </div>
  );
}

