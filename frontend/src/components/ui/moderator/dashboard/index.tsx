"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/common/card";
import {
  LineChart,
  Users,
  Package,
  FileText,
  MessageSquare,
  Shield,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  FileCheck,
  BarChart3,
  Home,
  Settings,
  Bell,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { ProductsChart } from "./charts/products-chart";
import { PostsChart } from "./charts/posts-chart";
import { UsersChart } from "./charts/users-chart";
import { CommentsChart } from "./charts/comments-chart";
import { VerificationsChart } from "./charts/verifications-chart";
import { OwnerRequestsChart } from "./charts/owner-requests-chart";
import { ComplaintsChart } from "./charts/complaints-chart";
import { ReportsChart } from "./charts/reports-chart";
import { PieChart } from "./charts/pie-chart";
import { chartApi } from "@/services/moderator/chart.api";

interface StatCard {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  trend?: "up" | "down" | "stable";
}

interface DashboardData {
  // Basic stats
  pendingProducts: { value: string; rawValue: number };
  approvedProducts: { value: string; rawValue: number };
  rejectedProducts: { value: string; rawValue: number };
  totalProducts: {
    value: string;
    rawValue: number;
    change: number;
    changeType: string;
  };
  pendingPosts: { value: string; rawValue: number };
  totalPosts: {
    value: string;
    rawValue: number;
    change: number;
    changeType: string;
  };
  newPostsToday: { value: string; rawValue: number };
  pendingComments: { value: string; rawValue: number };
  totalComments: { value: string; rawValue: number };
  newCommentsToday: { value: string; rawValue: number };
  pendingVerifications: { value: string; rawValue: number };
  totalVerifications: { value: string; rawValue: number };
  pendingOwnerRequests: { value: string; rawValue: number };
  totalOwnerRequests: { value: string; rawValue: number };
  pendingDisputes: { value: string; rawValue: number };
  totalDisputes: { value: string; rawValue: number };
  pendingComplaints: { value: string; rawValue: number };
  totalComplaints: { value: string; rawValue: number };
  newUsersToday: { value: string; rawValue: number };
  newUsersThisMonth: { value: string; rawValue: number };
  totalUsers: {
    value: string;
    rawValue: number;
    change: number;
    changeType: string;
  };
  verifiedUsers: { value: string; rawValue: number };

  // Time series data
  timeSeries?: {
    daily: {
      products: Array<{
        date: string;
        total: number;
        pending: number;
        approved: number;
        rejected: number;
      }>;
      posts: Array<{
        date: string;
        total: number;
        pending: number;
        active: number;
      }>;
      users: Array<{ date: string; total: number; verified: number }>;
      reports: Array<{
        date: string;
        total: number;
        pending: number;
        resolved: number;
      }>;
    };
    hourly: {
      products: Array<{ hour: number; count: number }>;
      users: Array<{ hour: number; count: number }>;
    };
  };

  // Distribution data
  distribution?: {
    products: { pending: number; approved: number; rejected: number };
    posts: { pending: number; active: number };
    users: { verified: number; unverified: number };
    disputes: { pending: number; resolved: number };
  };
}

const ModeratorDashboard = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [stats, setStats] = useState<StatCard[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Chart data states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [productChartData, setProductChartData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [postChartData, setPostChartData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userChartData, setUserChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Individual stats data for charts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ownerRequestStats, setOwnerRequestStats] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [complaintStats, setComplaintStats] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reportStats, setReportStats] = useState<any>(null);

  // Filter states for charts
  const [productFilter, setProductFilter] = useState<"30days" | "all">(
    "30days"
  );
  const [postFilter, setPostFilter] = useState<"30days" | "all">("30days");
  const [userFilter, setUserFilter] = useState<"30days" | "all">("30days");

  const tabs = [
    {
      id: "overview",
      label: "Tổng quan",
      icon: Home,
      color: "text-blue-600",
    },
    {
      id: "products",
      label: "Sản phẩm",
      icon: Package,
      color: "text-orange-600",
    },
    {
      id: "posts",
      label: "Bài viết",
      icon: FileText,
      color: "text-green-600",
    },
    {
      id: "users",
      label: "Người dùng",
      icon: Users,
      color: "text-purple-600",
    },
    {
      id: "comments",
      label: "Bình luận",
      icon: MessageSquare,
      color: "text-yellow-600",
    },
    {
      id: "verifications",
      label: "Xác thực tài khoản",
      icon: Shield,
      color: "text-purple-600",
    },
    {
      id: "owner-requests",
      label: "Yêu cầu cấp quyền Cho thuê sản phẩmphẩm",
      icon: FileCheck,
      color: "text-violet-600",
    },
    {
      id: "complaints",
      label: "Khiếu nại khóa tài khoản",
      icon: AlertCircle,
      color: "text-pink-600",
    },
    {
      id: "reports",
      label: "Báo cáo xử lí Khiếu nại",
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { moderatorDashboardApi } = await import(
          "@/services/moderator/dashboard.api"
        );
        const statsData = await moderatorDashboardApi.getDashboardStats();
        setDashboardData(statsData);

        // Use the data from the main dashboard API instead of individual calls
        // TỔNG QUAN HỆ THỐNG - 5 items đầu tiên
        const statsCards: StatCard[] = [
          {
            id: "totalProducts",
            label: "Tổng sản phẩm",
            value: statsData.totalProducts.value,
            change: statsData.totalProducts.change,
            changeType: statsData.totalProducts.changeType,
            icon: Package,
            bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
            iconColor: "text-blue-600",
          },
          {
            id: "totalPosts",
            label: "Tổng bài viết",
            value: statsData.totalPosts.value,
            change: statsData.totalPosts.change,
            changeType: statsData.totalPosts.changeType,
            icon: FileText,
            bgColor: "bg-gradient-to-r from-green-50 to-emerald-50",
            iconColor: "text-green-600",
          },
          {
            id: "totalUsers",
            label: "Tổng người dùng",
            value: statsData.totalUsers.value,
            change: statsData.totalUsers.change,
            changeType: statsData.totalUsers.changeType,
            icon: Users,
            bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
            iconColor: "text-purple-600",
          },
          {
            id: "totalReports",
            label: "Báo cáo xử lí Khiếu nại",
            value: statsData.totalDisputes.value,
            icon: AlertCircle,
            bgColor: "bg-gradient-to-r from-red-50 to-orange-50",
            iconColor: "text-red-600",
          },

          // HOẠT ĐỘNG CẦN XỬ LÝ - 5 items tiếp theo
          {
            id: "pendingProducts",
            label: "Sản phẩm chờ duyệt",
            value: statsData.pendingProducts.value,
            // Không hiển thị change cho pending items - chỉ hiển thị cho tổng số
            change: undefined,
            changeType: undefined,
            icon: Clock,
            bgColor: "bg-gradient-to-r from-amber-50 to-orange-50",
            iconColor: "text-amber-600",
          },
          {
            id: "pendingPosts",
            label: "Bài viết chờ duyệt",
            value: statsData.pendingPosts.value,
            // Không hiển thị change cho pending items
            change: undefined,
            changeType: undefined,
            icon: FileText,
            bgColor: "bg-gradient-to-r from-orange-50 to-red-50",
            iconColor: "text-orange-600",
          },
          {
            id: "pendingComments",
            label: "Bình luận chờ duyệt",
            value: statsData.pendingComments.value,
            icon: MessageSquare,
            bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50",
            iconColor: "text-yellow-600",
          },
          {
            id: "pendingVerifications",
            label: "Yêu cầu xác minh",
            value: statsData.pendingVerifications.value,
            icon: Shield,
            bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
            iconColor: "text-purple-600",
          },
          {
            id: "pendingOwnerRequests",
            label: "Yêu cầu Owner chờ duyệt",
            value: statsData.pendingOwnerRequests.value,
            icon: FileCheck,
            bgColor: "bg-gradient-to-r from-violet-50 to-purple-50",
            iconColor: "text-violet-600",
          },

          // KHIẾU NẠI VÀ BÁO CÁO - 3 items cuối
          {
            id: "pendingComplaints",
            label: "Khiếu nại chờ xử lý",
            value: statsData.pendingComplaints.value,
            icon: AlertCircle,
            bgColor: "bg-gradient-to-r from-pink-50 to-rose-50",
            iconColor: "text-pink-600",
          },
        ];
        setStats(statsCards);
      } catch (error) {
        console.error("Error fetching data:", error);
        setStats([]);
        setDashboardData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch individual stats data for charts
  const fetchIndividualStats = useCallback(async () => {
    try {
      const { chartApi } = await import("@/services/moderator/chart.api");

      const [ownerRequestsData, complaintsData, reportsData] =
        await Promise.all([
          chartApi.getOwnerRequestStats(),
          chartApi.getComplaintStats(),
          chartApi.getReportStats(),
        ]);

      setOwnerRequestStats(ownerRequestsData);
      setComplaintStats(complaintsData);
      setReportStats(reportsData);
    } catch (error) {
      console.error("Error fetching individual stats:", error);
    }
  }, []);

  // Fetch individual stats when component mounts
  useEffect(() => {
    fetchIndividualStats();
  }, [fetchIndividualStats]);

  // Fetch chart data
  const fetchChartData = useCallback(
    async (
      productFilterValue?: "30days" | "all",
      postFilterValue?: "30days" | "all",
      userFilterValue?: "30days" | "all"
    ) => {
      setChartLoading(true);
      try {
        const { chartApi } = await import("@/services/moderator/chart.api");

        const [productsData, postsData, usersData] = await Promise.all([
          chartApi.getProductChartData(productFilterValue || productFilter),
          chartApi.getPostChartData(postFilterValue || postFilter),
          chartApi.getUserChartData(userFilterValue || userFilter),
        ]);

        setProductChartData(productsData);
        setPostChartData(postsData);
        setUserChartData(usersData);
      } catch (error) {
        console.error("Error fetching chart data:", error);
        setProductChartData([]);
        setPostChartData([]);
        setUserChartData([]);
      } finally {
        setChartLoading(false);
      }
    },
    [productFilter, postFilter, userFilter]
  );

  // Initial fetch and refetch when filters change
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Filter handlers
  const handleProductFilterChange = (newFilter: "30days" | "all") => {
    setProductFilter(newFilter);
    fetchChartData(newFilter, postFilter, userFilter);
  };

  const handlePostFilterChange = (newFilter: "30days" | "all") => {
    setPostFilter(newFilter);
    fetchChartData(productFilter, newFilter, userFilter);
  };

  const handleUserFilterChange = (newFilter: "30days" | "all") => {
    setUserFilter(newFilter);
    fetchChartData(productFilter, postFilter, newFilter);
  };

  const handleStatClick = (statId: string) => {
    // Navigate to relevant tab based on stat
    switch (statId) {
      case "pendingProducts":
      case "totalProducts":
        setActiveTab("products");
        break;
      case "pendingPosts":
      case "totalPosts":
        setActiveTab("posts");
        break;
      case "pendingVerifications":
        setActiveTab("verifications");
        break;
      case "totalUsers":
        setActiveTab("users");
        break;
      case "pendingComments":
        setActiveTab("comments");
        break;
      case "pendingOwnerRequests":
        setActiveTab("owner-requests");
        break;
      case "pendingComplaints":
        setActiveTab("complaints");
        break;
      case "totalReports":
        setActiveTab("reports");
        break;
      default:
        break;
    }
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards Grid - 5 items per row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isClickable = true;
            return (
              <div
                key={stat.id}
                className={`relative overflow-hidden rounded-xl border-2 bg-white p-4 sm:p-6 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer ${
                  isClickable
                    ? "hover:border-blue-400"
                    : "hover:border-gray-300"
                }`}
                onClick={() => isClickable && handleStatClick(stat.id)}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Gradient overlay */}
                <div
                  className={`absolute inset-0 ${stat.bgColor} opacity-50`}
                ></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div
                    className={`mb-3 sm:mb-4 inline-flex p-2 sm:p-3 rounded-lg ${stat.bgColor}`}
                  >
                    <Icon
                      className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.iconColor}`}
                    />
                  </div>

                  {/* Label */}
                  <h3 className="mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-gray-600">
                    {stat.label}
                  </h3>

                  {/* Value */}
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>

                  {/* Change indicator */}
                  {stat.change !== undefined && (
                    <div className="flex items-center mt-2 text-sm">
                      {stat.changeType === "increase" ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span
                        className={`font-medium ${
                          stat.changeType === "increase"
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {Math.abs(stat.change)}%
                      </span>
                      <span className="text-gray-500 ml-1">
                        so với tháng trước
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100"></div>
              </div>
            );
          })}
        </div>

        {/* Quick Navigation */}
        <div className="mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Điều hướng nhanh
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Nhấp vào để xem chi tiết từng loại dữ liệu
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6">
                {tabs
                  .filter((tab) => tab.id !== "overview")
                  .map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          activeTab === tab.id
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <Icon className={`w-8 h-8 mb-2 ${tab.color}`} />
                        <span className="text-sm font-medium text-gray-900">
                          {tab.label}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          Xem chi tiết
                        </span>
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Content */}
        {activeTabData && (
          <div className="space-y-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Navigation only - overview content removed */}
              </div>
            )}

            {activeTab === "products" && (
              <div className="space-y-6">
                <ProductsChart
                  data={productChartData}
                  loading={chartLoading}
                  statsData={dashboardData}
                  filter={productFilter}
                  onFilterChange={handleProductFilterChange}
                />

                {/* Product Status Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Phân bố trạng thái sản phẩm
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <PieChart
                        data={[
                          {
                            label: "Chờ duyệt",
                            value:
                              dashboardData?.distribution?.products.pending ||
                              0,
                            color: "#f59e0b",
                          },
                          {
                            label: "Đã duyệt",
                            value:
                              dashboardData?.distribution?.products.approved ||
                              0,
                            color: "#10b981",
                          },
                          {
                            label: "Bị từ chối",
                            value:
                              dashboardData?.distribution?.products.rejected ||
                              0,
                            color: "#ef4444",
                          },
                        ]}
                        loading={!dashboardData}
                        title={""}
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Thống kê nhanh
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium">Chờ duyệt</span>
                        </div>
                        <span className="font-bold text-amber-600">
                          {dashboardData?.pendingProducts.value || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium">Đã duyệt</span>
                        </div>
                        <span className="font-bold text-emerald-600">
                          {dashboardData?.approvedProducts.value || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium">
                            Bị từ chối
                          </span>
                        </div>
                        <span className="font-bold text-red-600">
                          {dashboardData?.rejectedProducts.value || "0"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "posts" && (
              <div className="space-y-6">
                <PostsChart
                  data={postChartData}
                  loading={chartLoading}
                  statsData={dashboardData}
                  filter={postFilter}
                  onFilterChange={handlePostFilterChange}
                />

                {/* Post Status Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Phân bố trạng thái bài viết
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <PieChart
                        data={[
                          {
                            label: "Chờ duyệt",
                            value:
                              dashboardData?.distribution?.posts.pending || 0,
                            color: "#f59e0b",
                          },
                          {
                            label: "Đã kích hoạt",
                            value:
                              dashboardData?.distribution?.posts.active || 0,
                            color: "#10b981",
                          },
                        ]}
                        loading={!dashboardData}
                        title={""}
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Thống kê nhanh
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium">Chờ duyệt</span>
                        </div>
                        <span className="font-bold text-orange-600">
                          {dashboardData?.pendingPosts.value || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-lime-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-lime-600" />
                          <span className="text-sm font-medium">
                            Mới hôm nay
                          </span>
                        </div>
                        <span className="font-bold text-lime-600">
                          {dashboardData?.newPostsToday.value || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium">
                            Bình luận chờ duyệt
                          </span>
                        </div>
                        <span className="font-bold text-yellow-600">
                          {dashboardData?.pendingComments.value || "0"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="space-y-6">
                <UsersChart
                  data={userChartData}
                  loading={chartLoading}
                  statsData={dashboardData}
                  filter={userFilter}
                  onFilterChange={handleUserFilterChange}
                />

                {/* User Status Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Phân bố trạng thái người dùng
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <PieChart
                        data={[
                          {
                            label: "Đã xác thực",
                            value:
                              dashboardData?.distribution?.users.verified || 0,
                            color: "#10b981",
                          },
                          {
                            label: "Chưa xác thực",
                            value:
                              dashboardData?.distribution?.users.unverified ||
                              0,
                            color: "#6b7280",
                          },
                        ]}
                        loading={!dashboardData}
                        title={""}
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Thống kê nhanh
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">
                            Tổng người dùng
                          </span>
                        </div>
                        <span className="font-bold text-blue-600">
                          {dashboardData?.totalUsers.value || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium">
                            Đã xác thực
                          </span>
                        </div>
                        <span className="font-bold text-emerald-600">
                          {dashboardData?.verifiedUsers.value || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium">
                            Yêu cầu xác minh
                          </span>
                        </div>
                        <span className="font-bold text-purple-600">
                          {dashboardData?.pendingVerifications.value || "0"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "comments" && (
              <div className="space-y-6">
                <CommentsChart
                  data={[]}
                  loading={false}
                  statsData={dashboardData}
                />
              </div>
            )}

            {activeTab === "verifications" && (
              <div className="space-y-6">
                <VerificationsChart
                  data={[]}
                  loading={false}
                  statsData={dashboardData}
                />
              </div>
            )}

            {activeTab === "owner-requests" && (
              <div className="space-y-6">
                <OwnerRequestsChart
                  data={[]}
                  loading={false}
                  statsData={ownerRequestStats}
                />
              </div>
            )}

            {activeTab === "complaints" && (
              <div className="space-y-6">
                <ComplaintsChart
                  data={[]}
                  loading={false}
                  statsData={complaintStats}
                />
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-6">
                <ReportsChart
                  data={[]}
                  loading={false}
                  statsData={reportStats}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeratorDashboard;
