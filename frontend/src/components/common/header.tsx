"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/common/button";
import {
  LogOut,
  User,
  Package,
  Shield,
  Crown,
  Moon,
  Sun,
  Wallet,
  Bookmark,
  LayoutDashboard,
  Sparkles,
  Home,
  BookOpen,
  Info,
  Zap,
} from "lucide-react";
import { NotificationIcon } from "@/components/ui/common/notification-icon";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/common/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/common/avatar";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/redux_store";
import { logout, toggleDarkMode } from "@/store/auth/authReducer";
import { fetchCartItemCount } from "@/store/cart/cartActions";
import { jwtDecode } from "jwt-decode";
import { decodeToken, type DecodedToken } from "@/utils/jwtHelper";
import { toast } from "sonner";
import Image from "next/image";

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<DecodedToken | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { accessToken, isDarkMode } = useSelector(
    (state: RootState) => state.auth
  );
  const { count: cartCount } = useSelector((state: RootState) => state.cart);

  // Decode JWT token để lấy thông tin user
  const decodedUser = React.useMemo(() => {
    if (typeof accessToken === "string" && accessToken.trim()) {
      try {
        const decoded = jwtDecode<DecodedToken>(accessToken);
        return decoded;
      } catch (error) {
        console.error("Invalid token:", error);
        return null;
      }
    }
    return null;

    return decodeToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (decodedUser) {
      setIsLoggedIn(true);
      setUserInfo(decodedUser);

      // Fetch cart count when user is logged in
      fetchCartItemCount()(dispatch);
      // Chuyển hướng dựa trên role
      const currentPath = router.pathname;
      // Redirect logic dựa trên role
      if (currentPath === "/") {
        router.push("/home");
      }
    } else {
      // Token không hợp lệ hoặc hết hạn
      if (accessToken) {
        dispatch(logout());
        toast.error("Phiên đăng nhập đã hết hạn");
      }
      setIsLoggedIn(false);
      setUserInfo(null);
    }
  }, [decodedUser, accessToken, dispatch, router]);

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleToggleDarkMode = () => {
    dispatch(toggleDarkMode());
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserInfo(null);
    dispatch(logout());
    toast.success("Đăng xuất thành công");
    router.push("/");
  };

  const handleGoToProfile = () => {
    router.push("/auth/profile");
  };

  const handleGoToMyOrders = () => {
    if (router.pathname !== "/auth/my-orders" && router.asPath !== "/auth/my-orders") {
      router.push("/auth/my-orders");
    }
  };

  const handleGoToAdminPanel = () => {
    router.push("/admin");
  };

  const handleGoToModeratorPanel = () => {
    router.push("/moderator");
  };

  const handleGoToOwnerPanel = () => {
    router.push("/owner");
  };

  const handleGoToMyfavirite = () => {
    router.push("/products/myfavorite");
  };

  // Render menu items dựa trên role
  const renderRoleSpecificMenuItems = () => {
    if (!userInfo?.role) return null;

    const role = userInfo.role;
    const items = [];

    switch (role) {
      case "admin":
        items.push(
          <DropdownMenuItem
            key="admin-panel"
            className="cursor-pointer group"
            onClick={handleGoToAdminPanel}
          >
            <Crown className="mr-2 h-4 w-4 group-hover:text-yellow-500 transition-colors" />
            <span>Bảng điều khiển Admin</span>
          </DropdownMenuItem>
        );
        break;
      case "moderator":
        items.push(
          <DropdownMenuItem
            key="moderator-panel"
            className="cursor-pointer group"
            onClick={handleGoToModeratorPanel}
          >
            <Shield className="mr-2 h-4 w-4 group-hover:text-blue-500 transition-colors" />
            <span>Trang quản lý Moderator</span>
          </DropdownMenuItem>
        );
        break;
      case "owner":
        items.push(
          <DropdownMenuItem
            key="owner-panel"
            className="cursor-pointer group"
            onClick={handleGoToOwnerPanel}
          >
            <LayoutDashboard className="mr-2 h-4 w-4 group-hover:text-indigo-500 transition-colors" />
            <span>Trang quản lý</span>
          </DropdownMenuItem>
        );
        break;
    }

    return items;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[150] transition-all duration-300 ${
        scrolled
          ? "bg-white/95 dark:bg-gray-900/95 shadow-lg backdrop-blur-md"
          : "bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
      } border-b border-gray-100 dark:border-gray-800`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo with enhanced animation */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-400/20 rounded-lg blur-xl group-hover:bg-indigo-500/40 transition-all duration-300"></div>
              <Image
                src="/retrologo.png"
                alt="Retro Trade Logo"
                width={60}
                height={60}
                className="rounded-lg relative z-10 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
              />
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-300" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
              Retro Trade
            </span>
          </Link>

          {/* Navigation with enhanced hover effects and icons */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/home"
              className="relative text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 group flex items-center gap-2"
            >
              <div className="relative">
                <Home className="w-4 h-4 transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300" />
                <div className="absolute inset-0 bg-indigo-500/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
              </div>
              <span className="relative z-10">Trang chủ</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
              <Zap className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300" />
            </Link>
            <Link
              href="/products"
              className="relative text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 group flex items-center gap-2"
            >
              <div className="relative">
                <Package className="w-4 h-4 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                <div className="absolute inset-0 bg-purple-500/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
              </div>
              <span className="relative z-10">Sản phẩm</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
            </Link>
            <Link
              href="/blog"
              className="relative text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 group flex items-center gap-2"
            >
              <div className="relative">
                <BookOpen className="w-4 h-4 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
                <div className="absolute inset-0 bg-pink-500/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
              </div>
              <span className="relative z-10">Blog</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/about"
              className="relative text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 group flex items-center gap-2"
            >
              <div className="relative">
                <Info className="w-4 h-4 transform group-hover:scale-110 group-hover:rotate-180 transition-all duration-500" />
                <div className="absolute inset-0 bg-blue-500/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
              </div>
              <span className="relative z-10">Giới thiệu & Liên hệ</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </nav>

          <div className="flex items-center gap-4 z-[100]">
            {isLoggedIn && (
              <>
                <Button
                  onClick={() => router.push("/auth/cartitem")}
                  variant="ghost"
                  size="icon"
                  className="relative"
                >
                  <div className="relative">
                    <Image
                      src="/market.png"
                      alt="Cart"
                      width={25}
                      height={25}
                      className="rounded-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300"
                    />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 rounded-full transition-colors duration-300"></div>
                </Button>

                {/* Notification with animation */}
                <div className="relative">
                  <NotificationIcon />
                </div>
              </>
            )}

            {isLoggedIn && userInfo ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full opacity-0 group-hover:opacity-20 blur-md transition-all duration-300"></div>
                    <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-indigo-500 transition-all duration-300 transform group-hover:scale-110">
                      <AvatarImage
                        src={userInfo.avatarUrl ?? ""}
                        alt={userInfo.email}
                      />
                      <AvatarFallback className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                        {userInfo.email?.charAt(0).toUpperCase() ?? ""}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 z-[200] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                  align="end"
                  forceMount
                >
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">
                      {userInfo.email ?? ""}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground flex items-center gap-1">
                      {userInfo.role === "renter" && (
                        <User className="w-3 h-3" />
                      )}
                      {userInfo.role === "owner" && (
                        <Crown className="w-3 h-3 text-yellow-500" />
                      )}
                      {userInfo.role === "admin" && (
                        <Shield className="w-3 h-3 text-red-500" />
                      )}
                      {userInfo.role === "moderator" && (
                        <Shield className="w-3 h-3 text-blue-500" />
                      )}
                      {userInfo.role === "renter"
                        ? "Người thuê"
                        : userInfo.role === "owner"
                        ? "Chủ sở hữu"
                        : userInfo.role === "admin"
                        ? "Quản trị viên"
                        : userInfo.role === "moderator"
                        ? "Điều hành viên"
                        : "Người dùng"}
                    </p>
                  </div>
                  <DropdownMenuSeparator />

                  {/* Dark Mode Toggle */}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleToggleDarkMode}
                  >
                    {isDarkMode ? (
                      <Sun className="mr-2 h-4 w-4 text-yellow-500 group-hover:rotate-180 transition-transform duration-500" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4 text-gray-600 group-hover:rotate-180 transition-transform duration-500" />
                    )}
                    <span>{isDarkMode ? "Chế độ sáng" : "Chế độ tối"}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="cursor-pointer group"
                    onClick={handleGoToProfile}
                  >
                    <User className="mr-2 h-4 w-4 group-hover:text-indigo-500 transition-colors" />
                    <span>Thông tin cá nhân</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="cursor-pointer group"
                    onClick={handleGoToMyfavirite}
                  >
                    <Bookmark className="mr-2 h-4 w-4 group-hover:text-yellow-500 group-hover:fill-yellow-500 transition-all" />
                    <span>Danh sách yêu thích</span>
                  </DropdownMenuItem>


                  <DropdownMenuItem
                    className="cursor-pointer group"
                    onClick={handleGoToMyOrders}
                  >
                    <Package className="mr-2 h-4 w-4 group-hover:text-blue-500 transition-colors" />
                    <span>Lịch sử đơn hàng</span>
                  </DropdownMenuItem>

                 
                 
                  {(userInfo?.role === "renter" || userInfo?.role === "owner") && (

                    <DropdownMenuItem
                      className="cursor-pointer group"
                      onClick={() => router.push("/wallet")}
                    >
                      <Wallet className="mr-2 h-4 w-4 group-hover:text-green-500 transition-colors" />
                      <span>Ví của tôi</span>
                    </DropdownMenuItem>
                  )}

                  {/* Render role-specific menu items */}
                  {renderRoleSpecificMenuItems()}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:text-red-600 group"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 relative group"
                >
                  <span className="relative z-10">Đăng nhập</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white relative overflow-hidden group shadow-lg hover:shadow-indigo-500/50 transition-all duration-300">
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <Link
                    href="/auth/register"
                    className="text-white hover:text-white relative z-10 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    Đăng ký
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add custom styles for animations */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 100%
          );
          background-size: 1000px 100%;
        }
      `}</style>
    </header>
  );
}

export default Header;
