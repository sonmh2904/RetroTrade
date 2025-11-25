"use client";

import {
  FileText,
  Shield,
  BookOpen,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Package,
  MessageCircle,
  AlertTriangle,
  Users,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/common/button";
import { useState, useEffect } from "react";

interface ModeratorSidebarProps {
  activeTab:
    | "dashboard"
    | "requests"
    | "verification"
    | "productManagement"
    | "blog"
    | "messages"
    | "dispute"
    | "userManagement"
    | "complaints";
  activeProductTab?: "products" | "categories" | "highlights";
  activeBlogTab?: "posts" | "categories" | "comments" | "tags";
  onTabChange?: (
    tab:
      | "dashboard"
      | "requests"
      | "verification"
      | "productManagement"
      | "blog"
      | "messages"
      | "dispute"
      | "userManagement"
      | "complaints"
  ) => void;
  onProductTabChange?: (tab: "products" | "categories" | "highlights") => void;
  onBlogTabChange?: (tab: "posts" | "categories" | "comments" | "tags") => void;
}

export function ModeratorSidebar({
  activeTab,
  activeProductTab,
  activeBlogTab,
  onTabChange,
  onProductTabChange,
  onBlogTabChange,
}: ModeratorSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBlogDropdownOpen, setIsBlogDropdownOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load collapsed state from localStorage on mount and update CSS variable
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("moderatorSidebarCollapsed");
    let collapsed = false;
    if (savedCollapsed !== null) {
      collapsed = savedCollapsed === "true";
    }
    setIsCollapsed(collapsed);
    // Update CSS variable for sidebar width immediately
    const width = collapsed ? "80px" : "288px";
    document.documentElement.style.setProperty(
      "--moderator-sidebar-width",
      width
    );
    setIsMounted(true);
  }, []);


  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!isMounted) return; // Don't run until mounted

    if (activeTab !== "blog") {
      setIsBlogDropdownOpen(false);
    }

    if (activeTab !== "productManagement") {
      setIsProductDropdownOpen(false);
    }
  }, [activeTab, isMounted]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem("moderatorSidebarCollapsed", String(newState));
      document.documentElement.style.setProperty(
        "--moderator-sidebar-width",
        newState ? "80px" : "288px"
      );
      return newState;
    });
    if (!isCollapsed) {
      setIsBlogDropdownOpen(false);
      setIsProductDropdownOpen(false);
    }
  };

  const menuItems = [
    {
      id: "dashboard" as const,
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/moderator/dashboard",
      description: "Tổng quan hệ thống",
    },
    {
      id: "messages" as const,
      label: "Tin nhắn",
      icon: MessageCircle,
      path: "/moderator/messages",
      description: "Quản lý tin nhắn và hỗ trợ",
    },
    {
      id: "requests" as const,
      label: "Yêu cầu kiểm duyệt",
      icon: FileText,
      path: "/moderator/request-management",
      description: "Duyệt và phê duyệt nội dung",
    },
    {
      id: "verification" as const,
      label: "Xác thực tài khoản",
      icon: Shield,
      path: "/moderator/verify-management",
      description: "Xác thực danh tính người dùng",
    },
    {
      id: "dispute" as const,
      label: "Xử lý khiếu nại",
      icon: AlertTriangle,
      path: "/moderator/dispute-management",
      description: "Xử lý tranh chấp và khiếu nại",
    },
    {
      id: "userManagement" as const,
      label: "Quản lý người dùng",
      icon: Users,
      path: "/moderator/user-management",
      description: "Khóa và mở khóa tài khoản",
    },
    {
      id: "complaints" as const,
      label: "Khiếu nại khóa tài khoản",
      icon: Ban,
      path: "/moderator/complaints",
      description: "Xử lý khiếu nại khóa/mở khóa",
    },
    {
      id: "productManagement" as const,
      label: "Quản lý sản phẩm",
      icon: Package,
      description: "Quản lý sản phẩm và danh mục",
      hasSubmenu: true,
    },
    {
      id: "blog" as const,
      label: "Quản lý Blog",
      icon: BookOpen,
      description: "Quản lý bài viết và nội dung",
      hasSubmenu: true,
    },
  
  ];

  const productSubmenuItems: {
    id: "products" | "categories" | "highlights";
    label: string;
    description: string;
  }[] = [
    {
      id: "products",
      label: "Quản lý sản phẩm",
      description: "Duyệt và phê duyệt sản phẩm",
    },
    {
      id: "categories",
      label: "Quản lý danh mục",
      description: "Quản lý danh mục sản phẩm",
    },

    {
      id: "highlights",
      label: "Top sản phẩm nổi bật",
      description: "Đánh dấu sản phẩm nổi bật",
    },
  ];

  const blogSubmenuItems: {
    id: "posts" | "categories" | "comments" | "tags";
    label: string;
    description: string;
  }[] = [
    {
      id: "posts",
      label: "Quản lý bài viết",
      description: "Tạo, sửa, xóa bài viết",
    },
    {
      id: "categories",
      label: "Quản lý danh mục",
      description: "Quản lý các danh mục bài viết",
    },
    {
      id: "comments",
      label: "Quản lý bình luận",
      description: "Kiểm duyệt bình luận",
    },
    {
      id: "tags",
      label: "Quản lý thẻ",
      description: "Kiểm duyệt thẻ",
    },
  ];

  const handleTabChange = (
    tab:
      | "dashboard"
      | "requests"
      | "verification"
      | "productManagement"
      | "blog"
      | "messages"
      | "dispute"
      | "userManagement"
      | "complaints"
  ) => {
    if (onTabChange) {
      onTabChange(tab);
    }

    if (tab !== "blog") setIsBlogDropdownOpen(false);
    if (tab !== "productManagement") setIsProductDropdownOpen(false);

    setIsMobileMenuOpen(false);
  };

  const handleProductTabChange = (
    tab: "products" | "categories" | "highlights"
  ) => {
    if (onProductTabChange) onProductTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  const handleBlogTabChange = (
    tab: "posts" | "categories" | "comments" | "tags"
  ) => {
    if (onBlogTabChange) onBlogTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  const renderSubmenu = (
    item: (typeof menuItems)[number],
    submenuItems: typeof productSubmenuItems | typeof blogSubmenuItems,
    isDropdownOpen: boolean,
    dropdownKey: "product" | "blog",
    activeSubTab?: string,
    onSubTabChange?: (tab: string) => void
  ) => {
    if (!item.hasSubmenu || !isDropdownOpen) return null;

    const activeTabKey =
      dropdownKey === "product" ? activeProductTab : activeBlogTab;

    return (
      <div className="ml-8 mt-2 space-y-2 animate-slide-in-left">
        {submenuItems.map((subItem) => {
          const isSubActive =
            activeTab === item.id && activeTabKey === subItem.id;
          return (
            <Button
              key={subItem.id}
              variant="ghost"
              className={`w-full justify-start h-12 px-4 text-sm transition-all duration-200 ${
                isSubActive
                  ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => onSubTabChange?.(subItem.id)}
            >
              <div className="text-left">
                <div className="font-medium">{subItem.label}</div>
                <div className="text-xs opacity-70">{subItem.description}</div>
              </div>
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-30 lg:hidden bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </Button>

      <div
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-sm z-20
          ${
            isMounted ? "transform transition-all duration-300 ease-in-out" : ""
          }
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${isCollapsed ? "w-20" : "w-72"}
          lg:w-auto`}
        style={{
          width: isCollapsed ? "80px" : "288px",
        }}
      >
        <div
          className={`h-full flex flex-col ${
            isCollapsed ? "p-3" : "p-4 lg:p-6"
          }`}
        >
          {/* Header with collapse button */}
          <div
            className={`flex items-center mb-8 ${
              isCollapsed ? "justify-center flex-col gap-2" : "gap-3"
            }`}
          >
            <div
              className={`bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 transition-all duration-300 ${
                isCollapsed ? "w-10 h-10" : "w-12 h-12"
              }`}
            >
              <Shield
                className={`text-white transition-all duration-300 ${
                  isCollapsed ? "w-5 h-5" : "w-7 h-7"
                }`}
              />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900">Moderator</h2>
                <p className="text-sm text-gray-600">Control Panel</p>
              </div>
            )}
            {/* Collapse Toggle Button */}
            <button
              onClick={toggleCollapse}
              className={`hidden lg:flex flex-col items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all duration-200 flex-shrink-0 ${
                isCollapsed ? "w-6 h-6 gap-0.5 mt-1" : "w-8 h-8 gap-1 ml-auto"
              }`}
              aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}
              title={isCollapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}
            >
              <div
                className={`bg-current transition-all duration-300 ${
                  isCollapsed ? "w-3 h-[1.5px]" : "w-4 h-0.5"
                }`}
              ></div>
              <div
                className={`bg-current transition-all duration-300 ${
                  isCollapsed ? "w-3 h-[1.5px]" : "w-4 h-0.5"
                }`}
              ></div>
              <div
                className={`bg-current transition-all duration-300 ${
                  isCollapsed ? "w-3 h-[1.5px]" : "w-4 h-0.5"
                }`}
              ></div>
            </button>
          </div>

          <nav className="space-y-3 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              const isProduct = item.id === "productManagement";
              const isBlog = item.id === "blog";

              return (
                <div key={item.id}>
                  <Button
                    variant="ghost"
                    className={`w-full h-14 group transition-all duration-200 relative ${
                      isCollapsed ? "justify-center px-2" : "justify-start px-4"
                    } ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm scale-105"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:scale-105"
                    }`}
                    onClick={() => {
                      if (item.hasSubmenu && !isCollapsed) {
                      
                        if (isProduct && activeTab === "productManagement") {
                          setIsProductDropdownOpen(!isProductDropdownOpen);
                        } else if (isProduct) {
                          setIsProductDropdownOpen(true);
                          handleTabChange(item.id);
                        }
                        if (isBlog && activeTab === "blog") {
                          setIsBlogDropdownOpen(!isBlogDropdownOpen);
                        } else if (isBlog) {
                          setIsBlogDropdownOpen(true);
                          handleTabChange(item.id);
                        }
                      } else {
                        handleTabChange(item.id);
                      }
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div
                      className={`flex items-center ${
                        isCollapsed ? "justify-center" : "gap-3"
                      } w-full`}
                    >
                      <div
                        className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                          isActive
                            ? "bg-indigo-100"
                            : "bg-gray-100 group-hover:bg-gray-200"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {!isCollapsed && (
                        <>
                          <div className="text-left flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {item.label}
                            </div>
                            <div className="text-xs opacity-70 truncate">
                              {item.description}
                            </div>
                          </div>
                          {item.hasSubmenu && (
                            <div className="ml-auto flex-shrink-0">
                              {(
                                isProduct
                                  ? isProductDropdownOpen
                                  : isBlogDropdownOpen
                              ) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Button>

                  {isProduct &&
                    !isCollapsed &&
                    renderSubmenu(
                      item,
                      productSubmenuItems,
                      isProductDropdownOpen,
                      "product",
                      activeProductTab,
                      (tab) =>
                        handleProductTabChange(
                          tab as "products" | "categories" | "highlights"
                        )
                    )}

                  {isBlog &&
                    !isCollapsed &&
                    renderSubmenu(
                      item,
                      blogSubmenuItems,
                      isBlogDropdownOpen,
                      "blog",
                      activeBlogTab,
                      (tab) =>
                        handleBlogTabChange(
                          tab as "posts" | "categories" | "comments" | "tags"
                        )
                    )}
                </div>
              );
            })}
          </nav>

          <div className="mt-auto"></div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-10 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
