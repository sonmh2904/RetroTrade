"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/common/card";
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
  UserCheck,
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

        // Debug logging to check data
        console.log("Admin Dashboard Stats Data:", statsData);
        console.log(
          "Revenue change:",
          statsData.revenue.change,
          statsData.revenue.changeType
        );
        console.log(
          "Users change:",
          statsData.users.change,
          statsData.users.changeType
        );
        console.log(
          "Orders change:",
          statsData.orders.change,
          statsData.orders.changeType
        );
        console.log(
          "Products change:",
          statsData.products.change,
          statsData.products.changeType
        );

        // Helper function to ensure consistent change values
        const normalizeChange = (
          change: number | undefined,
          changeType: string | undefined
        ) => {
          const changeValue = change || 0;
          const type =
            changeType || (changeValue >= 0 ? "increase" : "decrease");
          return {
            change: parseFloat(changeValue.toFixed(1)),
            changeType: type as "increase" | "decrease",
          };
        };

        // TỔNG QUAN - 5 items đầu tiên
        const statsCards: StatCard[] = [
          {
            id: "revenue",
            label: "Tổng doanh thu",
            value: statsData.revenue.value,
            ...normalizeChange(
              statsData.revenue.change,
              statsData.revenue.changeType
            ),
            icon: DollarSign,
            bgColor: "bg-gradient-to-r from-emerald-50 to-green-50",
            iconColor: "text-emerald-600",
          },
          {
            id: "orders",
            label: "Tổng đơn hàng",
            value: statsData.orders.value,
            ...normalizeChange(
              statsData.orders.change,
              statsData.orders.changeType
            ),
            icon: ShoppingCart,
            bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
            iconColor: "text-blue-600",
          },
          {
            id: "products",
            label: "Tổng sản phẩm",
            value: statsData.products.value,
            ...normalizeChange(
              statsData.products.change,
              statsData.products.changeType
            ),
            icon: Package,
            bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
            iconColor: "text-purple-600",
          },
          {
            id: "users",
            label: "Tổng người dùng",
            value: statsData.users.value,
            ...normalizeChange(
              statsData.users.change,
              statsData.users.changeType
            ),
            icon: Users,
            bgColor: "bg-gradient-to-r from-amber-50 to-orange-50",
            iconColor: "text-amber-600",
          },

          // HOẠT ĐỘNG CẦN XỬ LÝ - 5 items tiếp theo
          {
            id: "complaints",
            label: "Khiếu nại chờ xử lý",
            value: statsData.complaints?.value || "0",
            icon: AlertCircle,
            bgColor: "bg-gradient-to-r from-red-50 to-rose-50",
            iconColor: "text-red-600",
          },
          {
            id: "disputes",
            label: "Khiếu nạichờ xử lý",
            value: statsData.disputes?.value || "0",
            icon: FileText,
            bgColor: "bg-gradient-to-r from-violet-50 to-purple-50",
            iconColor: "text-violet-600",
          },
          {
            id: "walletTransactions",
            label: "Giao dịch ví chờ duyệt",
            value: statsData.walletTransactions?.value || "0",
            icon: CreditCard,
            bgColor: "bg-gradient-to-r from-teal-50 to-cyan-50",
            iconColor: "text-teal-600",
          },

          // THỐNG KÊ KHÁC - 5 items cuối
          {
            id: "completedOrders",
            label: "Đơn hàng hoàn thành",
            value: statsData.completedOrders?.value || "0",
            icon: CheckCircle,
            bgColor: "bg-gradient-to-r from-emerald-50 to-green-50",
            iconColor: "text-emerald-600",
          },
          {
            id: "verifiedUsers",
            label: "Người dùng đã xác thực",
            value: statsData.verifiedUsers?.value || "0",
            icon: Shield,
            bgColor: "bg-gradient-to-r from-blue-50 to-indigo-50",
            iconColor: "text-blue-600",
          },
          {
            id: "ratings",
            label: "Tổng đánh giá",
            value: statsData.ratings?.value || "0",
            icon: Star,
            bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50",
            iconColor: "text-yellow-600",
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
          dashboardElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
    }
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

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
      <div
        className="rounded-xl border border-gray-200 bg-white shadow-sm"
        id="dashboard-content"
      >
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
                  ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                />
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
                <h2 className="mb-2 text-xl font-bold text-gray-900">
                  Tổng quan thống kê
                </h2>
                <p className="mb-6 text-sm text-gray-600">
                  Bấm vào các thẻ thống kê để xem biểu đồ và phân tích chi tiết
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    const isClickable = [
                      "revenue",
                      "users",
                      "orders",
                      "products",
                    ].includes(stat.id);
                    return (
                      <div
                        key={stat.id}
                        className={`
                          group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6
                          shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-xl
                          ${
                            isClickable
                              ? "cursor-pointer hover:border-indigo-400"
                              : "cursor-default"
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
                        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>

                        <div className="relative z-10">
                          {/* Icon with gradient background */}
                          <div className="mb-4 flex items-center justify-between">
                            <div
                              className={`
                              relative rounded-xl p-3 shadow-lg transition-transform duration-300
                              group-hover:scale-110 group-hover:rotate-3
                              ${stat.bgColor}
                            `}
                            >
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/50 to-transparent"></div>
                              <Icon
                                className={`relative z-10 w-6 h-6 ${stat.iconColor}`}
                              />
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
                              <span className="text-xs text-gray-500">
                                so với tháng trước
                              </span>
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
