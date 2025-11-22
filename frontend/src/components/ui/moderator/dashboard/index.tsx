"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
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
  TrendingUp,
  UserCheck,
  FileCheck
} from "lucide-react";

interface StatCard {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
}

const ModeratorDashboard = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [stats, setStats] = useState<StatCard[]>([]);
  const [, setLoading] = useState(true);

  const tabs = [
    {
      id: "overview",
      label: "Tổng quan",
      icon: Activity,
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
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { moderatorDashboardApi } = await import("@/services/moderator/dashboard.api");
        const statsData = await moderatorDashboardApi.getDashboardStats();

        const statsCards: StatCard[] = [
          {
            id: "pendingProducts",
            label: "Sản phẩm chờ duyệt",
            value: statsData.pendingProducts.value,
            icon: Clock,
            bgColor: "bg-amber-50",
            iconColor: "text-amber-600",
          },
          {
            id: "pendingPosts",
            label: "Bài viết chờ duyệt",
            value: statsData.pendingPosts.value,
            icon: FileText,
            bgColor: "bg-orange-50",
            iconColor: "text-orange-600",
          },
          {
            id: "pendingVerifications",
            label: "Yêu cầu xác minh",
            value: statsData.pendingVerifications.value,
            icon: Shield,
            bgColor: "bg-purple-50",
            iconColor: "text-purple-600",
          },
          {
            id: "pendingDisputes",
            label: "Tranh chấp chờ xử lý",
            value: statsData.pendingDisputes.value,
            icon: AlertCircle,
            bgColor: "bg-red-50",
            iconColor: "text-red-600",
          },
          {
            id: "totalProducts",
            label: "Tổng sản phẩm",
            value: statsData.totalProducts.value,
            change: statsData.totalProducts.change,
            changeType: statsData.totalProducts.changeType,
            icon: Package,
            bgColor: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            id: "totalPosts",
            label: "Tổng bài viết",
            value: statsData.totalPosts.value,
            change: statsData.totalPosts.change,
            changeType: statsData.totalPosts.changeType,
            icon: FileText,
            bgColor: "bg-green-50",
            iconColor: "text-green-600",
          },
          {
            id: "totalUsers",
            label: "Tổng người dùng",
            value: statsData.totalUsers.value,
            change: statsData.totalUsers.change,
            changeType: statsData.totalUsers.changeType,
            icon: Users,
            bgColor: "bg-indigo-50",
            iconColor: "text-indigo-600",
          },
          {
            id: "verifiedUsers",
            label: "Người dùng đã xác thực",
            value: statsData.verifiedUsers.value,
            icon: UserCheck,
            bgColor: "bg-teal-50",
            iconColor: "text-teal-600",
          },
          {
            id: "approvedProducts",
            label: "Sản phẩm đã duyệt",
            value: statsData.approvedProducts.value,
            icon: CheckCircle,
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            id: "rejectedProducts",
            label: "Sản phẩm bị từ chối",
            value: statsData.rejectedProducts.value,
            icon: XCircle,
            bgColor: "bg-rose-50",
            iconColor: "text-rose-600",
          },
          {
            id: "newUsersToday",
            label: "Người dùng mới hôm nay",
            value: statsData.newUsersToday.value,
            icon: Users,
            bgColor: "bg-cyan-50",
            iconColor: "text-cyan-600",
          },
          {
            id: "newPostsToday",
            label: "Bài viết mới hôm nay",
            value: statsData.newPostsToday.value,
            icon: FileText,
            bgColor: "bg-lime-50",
            iconColor: "text-lime-600",
          },
          {
            id: "pendingComments",
            label: "Bình luận chờ duyệt",
            value: statsData.pendingComments.value,
            icon: MessageSquare,
            bgColor: "bg-yellow-50",
            iconColor: "text-yellow-600",
          },
          {
            id: "pendingOwnerRequests",
            label: "Yêu cầu Owner chờ duyệt",
            value: statsData.pendingOwnerRequests.value,
            icon: FileCheck,
            bgColor: "bg-violet-50",
            iconColor: "text-violet-600",
          },
          {
            id: "pendingComplaints",
            label: "Khiếu nại chờ xử lý",
            value: statsData.pendingComplaints.value,
            icon: AlertCircle,
            bgColor: "bg-pink-50",
            iconColor: "text-pink-600",
          },
          {
            id: "totalDisputes",
            label: "Tổng tranh chấp",
            value: statsData.totalDisputes.value,
            icon: AlertCircle,
            bgColor: "bg-slate-50",
            iconColor: "text-slate-600",
          },
        ];
        setStats(statsCards);
      } catch (error) {
        console.error("Error fetching data:", error);
        setStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStatClick = (statId: string) => {
    // Map stat IDs to moderator tabs and sub-tabs
    const statToNavigationMap: Record<string, { tab: string; subTab?: string }> = {
      // Products - navigate to productManagement tab
      pendingProducts: { tab: "productManagement", subTab: "products" },
      approvedProducts: { tab: "productManagement", subTab: "products" },
      rejectedProducts: { tab: "productManagement", subTab: "products" },
      totalProducts: { tab: "productManagement", subTab: "products" },
      
      // Posts - navigate to blog tab with posts sub-tab
      pendingPosts: { tab: "blog", subTab: "posts" },
      totalPosts: { tab: "blog", subTab: "posts" },
      newPostsToday: { tab: "blog", subTab: "posts" },
      
      // Comments - navigate to blog tab with comments sub-tab
      pendingComments: { tab: "blog", subTab: "comments" },
      
      // Verifications - navigate to verification tab
      pendingVerifications: { tab: "verification" },
      totalVerifications: { tab: "verification" },
      
      // Owner Requests - navigate to requests tab
      pendingOwnerRequests: { tab: "requests" },
      totalOwnerRequests: { tab: "requests" },
      
      // Disputes - navigate to dispute tab
      pendingDisputes: { tab: "dispute" },
      totalDisputes: { tab: "dispute" },
      
      // Complaints - navigate to dispute tab (or could be separate)
      pendingComplaints: { tab: "dispute" },
      totalComplaints: { tab: "dispute" },
      
      // Users - stay in dashboard overview
      totalUsers: { tab: "dashboard" },
      verifiedUsers: { tab: "dashboard" },
      newUsersToday: { tab: "dashboard" },
    };

    const navigation = statToNavigationMap[statId];
    if (navigation) {
      // Build URL with tab and optional subTab
      let url = `/moderator?tab=${navigation.tab}`;
      if (navigation.subTab) {
        url += `&${navigation.tab === "blog" ? "blogTab" : navigation.tab === "productManagement" ? "productTab" : ""}=${navigation.subTab}`;
      }
      
      // Navigate to moderator page with appropriate tab
      router.push(url);
    } else {
      // Fallback: switch to internal tab if it exists
      const statToTabMap: Record<string, string> = {
        pendingProducts: "products",
        approvedProducts: "products",
        rejectedProducts: "products",
        totalProducts: "products",
        pendingPosts: "posts",
        totalPosts: "posts",
        newPostsToday: "posts",
        totalUsers: "users",
        verifiedUsers: "users",
        newUsersToday: "users",
      };

      const tabId = statToTabMap[statId];
      if (tabId) {
        setActiveTab(tabId);
        setTimeout(() => {
          const dashboardElement = document.getElementById("dashboard-content");
          if (dashboardElement) {
            dashboardElement.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    }
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
              <LineChart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                Dashboard Moderator
              </h1>
              <p className="mt-2 text-purple-100">
                Tổng quan và quản lý nội dung hệ thống
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm" id="dashboard-content">
        <nav className="flex space-x-1 overflow-x-auto p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200
                  ${isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/20 to-transparent"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Content */}
      {activeTabData && (
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm">
                <h2 className="mb-2 text-xl font-bold text-gray-900">Tổng quan thống kê</h2>
                <p className="mb-6 text-sm text-gray-600">
                  Bấm vào các thẻ thống kê để xem chi tiết
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    // All stats are clickable, especially pending ones
                    const isPending = stat.id.includes("pending");
                    const isClickable = true; // All cards are clickable now
                    return (
                      <div
                        key={stat.id}
                        className={`
                          group relative overflow-hidden rounded-xl border-2 bg-white p-6
                          shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-xl
                          ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                          ${isPending 
                            ? 'border-amber-300 hover:border-amber-500 bg-gradient-to-br from-amber-50 to-white' 
                            : 'border-gray-200 hover:border-indigo-400'
                          }
                        `}
                        onClick={() => isClickable && handleStatClick(stat.id)}
                        style={{
                          animationDelay: `${index * 50}ms`,
                        }}
                      >
                        {/* Gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                        
                        {/* Decorative corner */}
                        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
                        
                        <div className="relative z-10">
                          {/* Icon with gradient background */}
                          <div className="mb-4 flex items-center justify-between">
                            <div className={`
                              relative rounded-xl p-3 shadow-lg transition-transform duration-300
                              group-hover:scale-110 group-hover:rotate-3
                              ${stat.bgColor}
                            `}>
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/50 to-transparent"></div>
                              <Icon className={`relative z-10 w-6 h-6 ${stat.iconColor}`} />
                            </div>
                            {isClickable && (
                              <div className="rounded-full bg-indigo-100 p-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                              </div>
                            )}
                          </div>
                          
                          {/* Label */}
                          <h3 className="mb-2 text-sm font-semibold text-gray-600 transition-colors group-hover:text-gray-900">
                            {stat.label}
                          </h3>
                          
                          {/* Value */}
                          <p className="mb-3 text-3xl font-bold text-gray-900 transition-colors">
                            {stat.value}
                          </p>
                          
                          {/* Change indicator */}
                          {stat.change !== undefined && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1">
                              {stat.changeType === "increase" ? (
                                <ArrowUpRight className="w-4 h-4 text-green-600" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4 text-red-600" />
                              )}
                              <span
                                className={`text-xs font-semibold ${
                                  stat.changeType === "increase"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {Math.abs(stat.change)}%
                              </span>
                              <span className="text-xs text-gray-500">so với tháng trước</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {activeTab === "products" && (
            <Card>
              <CardHeader>
                <CardTitle>Thống kê Sản phẩm</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Biểu đồ và phân tích sản phẩm sẽ được hiển thị tại đây.
                </p>
              </CardContent>
            </Card>
          )}
          {activeTab === "posts" && (
            <Card>
              <CardHeader>
                <CardTitle>Thống kê Bài viết</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Biểu đồ và phân tích bài viết sẽ được hiển thị tại đây.
                </p>
              </CardContent>
            </Card>
          )}
          {activeTab === "users" && (
            <Card>
              <CardHeader>
                <CardTitle>Thống kê Người dùng</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Biểu đồ và phân tích người dùng sẽ được hiển thị tại đây.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ModeratorDashboard;

