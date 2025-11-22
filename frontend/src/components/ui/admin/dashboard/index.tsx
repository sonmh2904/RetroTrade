"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import {
  LineChart,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Star,
  Eye,
  Heart,
  MessageSquare,
  Folder,
  Wallet,
  CreditCard,
  Shield,
  UserCheck
} from "lucide-react";
import { RevenueChart } from "./charts/revenue-chart";
import { UsersChart } from "./charts/users-chart";
import { OrdersChart } from "./charts/orders-chart";
import { ProductsChart } from "./charts/products-chart";

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

const AnalyticsDashboard = () => {
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
      id: "revenue",
      label: "Doanh thu",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      id: "users",
      label: "Người dùng",
      icon: Users,
      color: "text-purple-600",
    },
    {
      id: "orders",
      label: "Đơn hàng",
      icon: ShoppingCart,
      color: "text-orange-600",
    },
    {
      id: "products",
      label: "Sản phẩm",
      icon: Package,
      color: "text-pink-600",
    },
    {
      id: "trends",
      label: "Xu hướng",
      icon: TrendingUp,
      color: "text-indigo-600",
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { dashboardApi } = await import("@/services/admin/dashboard.api");
        const statsData = await dashboardApi.getDashboardStats();

        const statsCards: StatCard[] = [
          {
            id: "revenue",
            label: "Tổng doanh thu",
            value: statsData.revenue.value,
            change: statsData.revenue.change,
            changeType: statsData.revenue.changeType,
            icon: DollarSign,
            bgColor: "bg-green-50",
            iconColor: "text-green-600",
          },
          {
            id: "users",
            label: "Tổng người dùng",
            value: statsData.users.value,
            change: statsData.users.change,
            changeType: statsData.users.changeType,
            icon: Users,
            bgColor: "bg-purple-50",
            iconColor: "text-purple-600",
          },
          {
            id: "orders",
            label: "Tổng đơn hàng",
            value: statsData.orders.value,
            change: statsData.orders.change,
            changeType: statsData.orders.changeType,
            icon: ShoppingCart,
            bgColor: "bg-orange-50",
            iconColor: "text-orange-600",
          },
          {
            id: "products",
            label: "Tổng sản phẩm",
            value: statsData.products.value,
            change: statsData.products.change,
            changeType: statsData.products.changeType,
            icon: Package,
            bgColor: "bg-pink-50",
            iconColor: "text-pink-600",
          },
          // Additional stats
          {
            id: "pendingOrders",
            label: "Đơn hàng đang xử lý",
            value: statsData.pendingOrders?.value || "0",
            icon: Clock,
            bgColor: "bg-yellow-50",
            iconColor: "text-yellow-600",
          },
          {
            id: "completedOrders",
            label: "Đơn hàng đã hoàn thành",
            value: statsData.completedOrders?.value || "0",
            icon: CheckCircle,
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            id: "cancelledOrders",
            label: "Đơn hàng bị hủy",
            value: statsData.cancelledOrders?.value || "0",
            icon: XCircle,
            bgColor: "bg-red-50",
            iconColor: "text-red-600",
          },
          {
            id: "pendingProducts",
            label: "Sản phẩm chờ duyệt",
            value: statsData.pendingProducts?.value || "0",
            icon: Clock,
            bgColor: "bg-amber-50",
            iconColor: "text-amber-600",
          },
          {
            id: "approvedProducts",
            label: "Sản phẩm đã duyệt",
            value: statsData.approvedProducts?.value || "0",
            icon: CheckCircle,
            bgColor: "bg-teal-50",
            iconColor: "text-teal-600",
          },
          {
            id: "complaints",
            label: "Tổng khiếu nại",
            value: statsData.complaints?.value || "0",
            icon: AlertCircle,
            bgColor: "bg-rose-50",
            iconColor: "text-rose-600",
          },
          {
            id: "disputes",
            label: "Tổng tranh chấp",
            value: statsData.disputes?.value || "0",
            icon: FileText,
            bgColor: "bg-violet-50",
            iconColor: "text-violet-600",
          },
          {
            id: "ratings",
            label: "Tổng đánh giá",
            value: statsData.ratings?.value || "0",
            icon: Star,
            bgColor: "bg-yellow-50",
            iconColor: "text-yellow-600",
          },
          {
            id: "views",
            label: "Tổng lượt xem",
            value: statsData.views?.value || "0",
            icon: Eye,
            bgColor: "bg-cyan-50",
            iconColor: "text-cyan-600",
          },
          {
            id: "favorites",
            label: "Tổng lượt yêu thích",
            value: statsData.favorites?.value || "0",
            icon: Heart,
            bgColor: "bg-pink-50",
            iconColor: "text-pink-600",
          },
          {
            id: "posts",
            label: "Tổng bài viết",
            value: statsData.posts?.value || "0",
            icon: FileText,
            bgColor: "bg-indigo-50",
            iconColor: "text-indigo-600",
          },
          {
            id: "comments",
            label: "Tổng bình luận",
            value: statsData.comments?.value || "0",
            icon: MessageSquare,
            bgColor: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            id: "categories",
            label: "Tổng danh mục",
            value: statsData.categories?.value || "0",
            icon: Folder,
            bgColor: "bg-slate-50",
            iconColor: "text-slate-600",
          },
          {
            id: "walletTransactions",
            label: "Giao dịch ví",
            value: statsData.walletTransactions?.value || "0",
            icon: CreditCard,
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            id: "walletBalance",
            label: "Tổng số dư ví",
            value: statsData.walletBalance?.value || "0",
            icon: Wallet,
            bgColor: "bg-green-50",
            iconColor: "text-green-600",
          },
          {
            id: "verifiedUsers",
            label: "Người dùng đã xác thực",
            value: statsData.verifiedUsers?.value || "0",
            icon: Shield,
            bgColor: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            id: "activeUsers",
            label: "Người dùng đang hoạt động",
            value: statsData.activeUsers?.value || "0",
            icon: UserCheck,
            bgColor: "bg-purple-50",
            iconColor: "text-purple-600",
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
    const statToTabMap: Record<string, string> = {
      revenue: "revenue",
      users: "users",
      orders: "orders",
      products: "products",
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
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
              <LineChart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                Dashboard Admin
              </h1>
              <p className="mt-2 text-indigo-100">
                Tổng quan và phân tích dữ liệu hệ thống
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
          {activeTab === "revenue" && <RevenueChart />}
          {activeTab === "users" && <UsersChart />}
          {activeTab === "orders" && <OrdersChart />}
          {activeTab === "products" && <ProductsChart />}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm">
                <h2 className="mb-2 text-xl font-bold text-gray-900">Tổng quan thống kê</h2>
                <p className="mb-6 text-sm text-gray-600">
                  Bấm vào các thẻ thống kê để xem biểu đồ và phân tích chi tiết
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    const isClickable = ["revenue", "users", "orders", "products"].includes(stat.id);
                    return (
                      <div
                        key={stat.id}
                        className={`
                          group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6
                          shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-xl
                          ${isClickable ? 'cursor-pointer hover:border-indigo-400' : 'cursor-default'}
                        `}
                        onClick={() => isClickable && handleStatClick(stat.id)}
                        style={{
                          animationDelay: `${index * 50}ms`,
                        }}
                      >
                        {/* Gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                        
                        {/* Decorative corner */}
                        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
                        
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
          {activeTab === "trends" && (
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Phân tích xu hướng sẽ được hiển thị tại đây.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;

