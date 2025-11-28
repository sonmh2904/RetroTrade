"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { decodeToken } from "@/utils/jwtHelper";
import { toast } from "sonner";
import { ModeratorSidebar } from "@/components/ui/moderator/moderator-sidebar";
import { ModeratorHeader } from "@/components/ui/moderator/moderator-header";
import ModeratorDashboardView from "@/components/ui/moderator/dashboard";
import { VerificationRequestManagement } from "@/components/ui/moderator/verification/verification-request-management";
import { OwnerRequestManagement } from "@/components/ui/moderator/ownerRequest/owner-request-management";
import { BlogManagementTable } from "@/components/ui/moderator/blog/blog-management-table";
import { CommentManagementTable } from "@/components/ui/moderator/blog/comment-management-table";
import { TagManagementTable } from "@/components/ui/moderator/blog/tag-management";
import ProductCategoryManager from "@/components/ui/moderator/categories/category-management";
import ProductManagement from "@/components/ui/moderator/product/product-management";
import TopHighlightTable from "@/components/ui/moderator/product/top-highlight-table";
import { DisputeManagement } from "@/components/ui/moderator/dispute/dispute-management";
// import { ModeratorUserManagementTable } from "@/components/ui/moderator/user-management-table";
import { ComplaintManagement } from "@/components/ui/moderator/complaints/complaint-management";

export default function ModeratorDashboard() {
  console.log(
    "🚀 ModeratorDashboard component loaded at:",
    new Date().toISOString()
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "requests"
    | "verification"
    | "blog"
    | "productManagement"
    | "messages"
    | "dispute"
    // | "userManagement" // Tạm thời comment
    | "complaints"
  >("dashboard");
  const [activeBlogTab, setActiveBlogTab] = useState<
    "posts" | "categories" | "comments" | "tags"
  >("posts");
  const [activeProductTab, setActiveProductTab] = useState<
    "products" | "categories" | "highlights"
  >("products");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleTabChange = (
    tab:
      | "dashboard"
      | "requests"
      | "verification"
      | "blog"
      | "productManagement"
      | "messages"
      | "dispute"
      // | "userManagement" // Tạm thời comment
      | "complaints"
  ) => {
    console.log("Moderator handleTabChange called with:", tab);

    // Navigate to messages page (separate route)
    if (tab === "messages") {
      router.push("/moderator/messages");
      return;
    }

    // For other tabs, update state and URL query parameter
    setActiveTab(tab);
    const newUrl = `/moderator?tab=${tab}`;
    router.push(newUrl, { scroll: false });
    console.log("State updated: activeTab=", tab);
  };

  const handleProductTabChange = (
    tab: "products" | "categories" | "highlights"
  ) => {
    console.log("Moderator handleProductTabChange called with:", tab);
    setActiveProductTab(tab);
    setActiveTab("productManagement");
  };

  const handleBlogTabChange = (
    tab: "posts" | "categories" | "comments" | "tags"
  ) => {
    console.log("Moderator handleBlogTabChange called with:", tab);
    setActiveBlogTab(tab);
    setActiveTab("blog");
  };

  // Debug: Track state changes
  useEffect(() => {
    console.log(
      "State changed - activeTab:",
      activeTab,
      "activeBlogTab:",
      activeBlogTab,
      "activeProductTab:",
      activeProductTab
    );
  }, [activeTab, activeBlogTab, activeProductTab]);

  // Set default tab and handle URL query parameter for tab navigation
  useEffect(() => {
    const tab = searchParams.get("tab");
    const blogTab = searchParams.get("blogTab");
    const productTab = searchParams.get("productTab");
    console.log(
      "URL query parameters - tab:",
      tab,
      "blogTab:",
      blogTab,
      "productTab:",
      productTab
    );

    // If no tab parameter, default to dashboard
    if (!tab) {
      const defaultUrl = `/moderator?tab=dashboard`;
      window.history.replaceState({}, "", defaultUrl);
      setActiveTab("dashboard");
      return;
    }

    if (
      [
        "dashboard",
        "requests",
        "verification",
        "blog",
        "productManagement",
        "messages",
        "dispute",
        // "userManagement", // Tạm thời comment
        "complaints",
      ].includes(tab)
    ) {
      console.log("Setting activeTab from URL query parameter:", tab);
      // If messages tab, navigate to messages page (separate route)
      if (tab === "messages") {
        router.push("/moderator/messages");
        return;
      }
      // For other tabs, set activeTab and update URL with query param
      const validTab = tab as
        | "dashboard"
        | "requests"
        | "verification"
        | "blog"
        | "productManagement"
        | "dispute"
        // | "userManagement" // Tạm thời comment
        | "complaints";
      setActiveTab(validTab);

      // Handle sub-tabs
      if (
        blogTab &&
        ["posts", "categories", "comments", "tags"].includes(blogTab)
      ) {
        setActiveBlogTab(
          blogTab as "posts" | "categories" | "comments" | "tags"
        );
      }
      if (
        productTab &&
        ["products", "categories", "highlights"].includes(productTab)
      ) {
        setActiveProductTab(
          productTab as "products" | "categories" | "highlights"
        );
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!accessToken) {
      toast.error("Bạn cần đăng nhập để truy cập trang này");
      router.push("/auth/login");
      setIsLoading(false);
      return;
    }

    const decoded = decodeToken(accessToken);

    if (!decoded) {
      toast.error("Token không hợp lệ hoặc đã hết hạn");
      router.push("/auth/login");
      setIsLoading(false);
      return;
    }

    // Check if user has moderator role
    if (decoded.role !== "moderator" && decoded.role !== "admin") {
      toast.error("Bạn không có quyền truy cập trang moderator");
      router.push("/home");
      setIsLoading(false);
      return;
    }

    setIsAuthorized(true);
    setIsLoading(false);
  }, [accessToken, router]);

  // Show loading while checking authorization
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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

  const renderContent = () => {
    if (activeTab === "blog") {
      switch (activeBlogTab) {
        case "posts":
          return <BlogManagementTable />;
        case "categories":
          return (
            <div className="text-gray-900 p-8 text-center">
              Quản lý danh mục blog (Chưa triển khai)
            </div>
          );
        case "comments":
          return <CommentManagementTable />;
        case "tags":
          return <TagManagementTable />;
        default:
          return <BlogManagementTable />;
      }
    }

    if (activeTab === "productManagement") {
      switch (activeProductTab) {
        case "categories":
          return <ProductCategoryManager />;
        case "products":
          return <ProductManagement />;
        case "highlights":
          return <TopHighlightTable />;
        default:
          return <ProductCategoryManager />;
      }
    }

    switch (activeTab) {
      case "dashboard":
        return <ModeratorDashboardView />;
      case "requests":
        return <OwnerRequestManagement />;
      case "verification":
        return <VerificationRequestManagement />;
      case "dispute":
        return <DisputeManagement />;
      // case "userManagement": // Tạm thời comment
      //   return <ModeratorUserManagementTable />;
      case "complaints":
        return <ComplaintManagement />;
      default:
        return <ModeratorDashboardView />;
    }
  };

  const getPageTitle = () => {
    if (activeTab === "blog") {
      switch (activeBlogTab) {
        case "posts":
          return "Quản lý bài viết";
        case "categories":
          return "Quản lý danh mục";
        case "comments":
          return "Quản lý bình luận";
        default:
          return "Quản lý bài viết";
      }
    }

    if (activeTab === "productManagement") {
      switch (activeProductTab) {
        case "categories":
          return "Quản lý danh mục sản phẩm";
        case "products":
          return "Quản lý sản phẩm";
        case "highlights":
          return "Quản lý sản phẩm nổi bật";
        default:
          return "Quản lý danh mục sản phẩm";
      }
    }

    switch (activeTab) {
      case "dashboard":
        return "Dashboard Tổng quan";
      case "requests":
        return "Yêu cầu kiểm duyệt";
      case "verification":
        return "Xác thực tài khoản";
      case "dispute":
        return "Xử lý Khiếu nạiĐơn hàng";
      // case "userManagement": // Tạm thời comment
      //   return "Quản lý người dùng";
      case "complaints":
        return "Khiếu nại khóa tài khoản";
      default:
        return "Dashboard Tổng quan";
    }
  };

  const getPageDescription = () => {
    if (activeTab === "blog") {
      switch (activeBlogTab) {
        case "posts":
          return "Tạo, chỉnh sửa và quản lý các bài viết trong hệ thống";
        case "categories":
          return "Quản lý các danh mục và phân loại bài viết";
        case "comments":
          return "Kiểm duyệt và quản lý bình luận từ người dùng";
        default:
          return "Tạo, chỉnh sửa và quản lý các bài viết trong hệ thống";
      }
    }

    if (activeTab === "productManagement") {
      switch (activeProductTab) {
        case "categories":
          return "Tạo, chỉnh sửa và quản lý danh mục sản phẩm";
        case "products":
          return "Duyệt và quản lý sản phẩm từ người dùng";
        case "highlights":
          return "Quản lý các sản phẩm nổi bật trong hệ thống";
        default:
          return "Tạo, chỉnh sửa và quản lý danh mục sản phẩm";
      }
    }

    switch (activeTab) {
      case "dashboard":
        return "Tổng quan về hoạt động và thống kê hệ thống";
      case "requests":
        return "Duyệt và phê duyệt các yêu cầu từ người dùng";
      case "verification":
        return "Xác thực danh tính và thông tin người dùng";
      case "dispute":
        return "Quản lý và giải quyết khiếu nại Khiếu nạiđơn hàng";
      // case "userManagement": // Tạm thời comment
      //   return "Quản lý người dùng cần xử lý";
      case "complaints":
        return "Xem xét và xử lý các khiếu nại về tài khoản bị khóa từ người dùng";
      default:
        return "Tổng quan về hoạt động và thống kê hệ thống";
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="relative z-10 flex">
        <ModeratorSidebar
          activeTab={activeTab}
          activeProductTab={activeProductTab}
          activeBlogTab={activeBlogTab}
          onTabChange={handleTabChange}
          onProductTabChange={handleProductTabChange}
          onBlogTabChange={handleBlogTabChange}
        />

        <div className="flex-1 transition-all duration-300 moderator-content-area min-w-0 bg-gray-50">
          <ModeratorHeader />

          <main className="p-4 lg:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {getPageTitle()}
              </h2>
              <p className="text-gray-600">{getPageDescription()}</p>
            </div>

            <div className="mt-8">{renderContent()}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
