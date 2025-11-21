"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { decodeToken, type DecodedToken } from '@/utils/jwtHelper';
import { toast } from "sonner";
import { ModeratorSidebar } from "@/components/ui/moderator/moderator-sidebar";
import { ModeratorHeader } from "@/components/ui/moderator/moderator-header";
import { ModeratorStats } from "@/components/ui/moderator/moderator-stats";
import { VerificationRequestManagement } from "@/components/ui/moderator/verification/verification-request-management";
import { OwnerRequestManagement } from "@/components/ui/moderator/ownerRequest/owner-request-management";
import { BlogManagementTable } from "@/components/ui/moderator/blog/blog-management-table";
import { CommentManagementTable } from "@/components/ui/moderator/blog/comment-management-table";
import { TagManagementTable } from "@/components/ui/moderator/blog/tag-management";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/common/card";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Shield,
  AlertTriangle,
  Activity,
} from "lucide-react";
import ProductCategoryManager from "@/components/ui/moderator/categories/category-management";
import ProductManagement from "@/components/ui/moderator/product/product-management";
import TopHighlightTable from "@/components/ui/moderator/product/top-highlight-table";
import { DisputeManagement } from "@/components/ui/moderator/dispute/dispute-management";

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
    console.log("URL query parameter 'tab':", tab);

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
        | "dispute";
      setActiveTab(validTab);
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
        return <DashboardOverview />;
      case "requests":
        return <OwnerRequestManagement />;
      case "verification":
        return <VerificationRequestManagement />;
      case "dispute":
        return <DisputeManagement />;
      default:
        return <DashboardOverview />;
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
        return "Xử lý Tranh chấp Đơn hàng";
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
        return "Quản lý và giải quyết khiếu nại tranh chấp đơn hàng";
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

            {activeTab === "dashboard" && <ModeratorStats />}

            <div className="mt-8">{renderContent()}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Dashboard Overview Component
function DashboardOverview() {
  const quickActions = [
    {
      title: "Người dùng mới",
      value: "24",
      change: "+12%",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: "Trong 24h qua",
    },
    {
      title: "Bài viết chờ duyệt",
      value: "8",
      change: "+3",
      icon: FileText,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      description: "Cần xem xét",
    },
    {
      title: "Báo cáo vi phạm",
      value: "5",
      change: "-2",
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      description: "Chưa xử lý",
    },
    {
      title: "Hoạt động hệ thống",
      value: "98%",
      change: "+1%",
      icon: Activity,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      description: "Uptime",
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: "renter",
      action: "Người thuê mới đăng ký",
      user: "Nguyễn Văn A",
      time: "5 phút trước",
      status: "success",
    },
    {
      id: 2,
      type: "post",
      action: "Bài viết mới được tạo",
      user: "Trần Thị B",
      time: "12 phút trước",
      status: "pending",
    },
    {
      id: 3,
      type: "report",
      action: "Báo cáo vi phạm mới",
      user: "Lê Văn C",
      time: "25 phút trước",
      status: "warning",
    },
    {
      id: 4,
      type: "verification",
      action: "Tài khoản được xác thực",
      user: "Phạm Thị D",
      time: "1 giờ trước",
      status: "success",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card
              key={index}
              className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 group cursor-pointer"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                    {action.title}
                  </CardTitle>
                  <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-200">
                    {action.description}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${action.bgColor} group-hover:bg-gray-100`}
                >
                  <Icon
                    className={`w-5 h-5 ${action.color} transition-colors duration-200`}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 group-hover:text-gray-900 transition-colors duration-200">
                  {action.value}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="text-green-600">{action.change}</span> so với
                  hôm qua
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activities */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Hoạt động gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.status === "success"
                      ? "bg-green-100 text-green-600"
                      : activity.status === "warning"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {activity.type === "renter" && <Users className="w-5 h-5" />}
                  {activity.type === "post" && <FileText className="w-5 h-5" />}
                  {activity.type === "report" && (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                  {activity.type === "verification" && (
                    <Shield className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">{activity.action}</p>
                  <p className="text-gray-600 text-sm">{activity.user}</p>
                </div>
                <div className="text-gray-500 text-sm">{activity.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Thống kê hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tổng người dùng</span>
                <span className="text-gray-900 font-semibold">1,234</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Bài viết đã duyệt</span>
                <span className="text-gray-900 font-semibold">856</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tài khoản xác thực</span>
                <span className="text-gray-900 font-semibold">892</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Báo cáo đã xử lý</span>
                <span className="text-gray-900 font-semibold">156</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Trạng thái hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Server Status</span>
                <span className="text-green-600 font-semibold">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Database</span>
                <span className="text-green-600 font-semibold">Connected</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">API Response</span>
                <span className="text-green-600 font-semibold">45ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last Backup</span>
                <span className="text-gray-900 font-semibold">2h ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
