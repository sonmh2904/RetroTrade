"use client";

import React, { useState, useEffect } from "react";
import OwnerLayout from "../layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  Users,
  Calendar,
  BarChart3,
  Filter,
  RefreshCw
} from "lucide-react";
import { ownerDashboardApi, type OwnerOrderResponse, type OwnerRevenueResponse } from "@/services/owner/dashboard.api";
import { OwnerRevenueChart } from "@/components/ui/owner/dashboard/charts/revenue-chart";
import { OwnerOrdersChart } from "@/components/ui/owner/dashboard/charts/orders-chart";

interface StatCard {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease";
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  format?: "currency" | "number" | "percentage";
}

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [stats, setStats] = useState<StatCard[]>([]);
  const [orders, setOrders] = useState<OwnerOrderResponse | null>(null);
  const [revenue, setRevenue] = useState<OwnerRevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = [
    {
      id: "overview",
      label: "Tổng quan",
      icon: Activity,
      color: "text-blue-600",
    },
    {
      id: "orders",
      label: "Đơn hàng",
      icon: ShoppingCart,
      color: "text-orange-600",
    },
    {
      id: "revenue",
      label: "Doanh thu",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      id: "analytics",
      label: "Phân tích",
      icon: BarChart3,
      color: "text-purple-600",
    },
  ];

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const [ordersData, revenueData] = await Promise.all([
        ownerDashboardApi.getOrders({ limit: 10 }),
        ownerDashboardApi.getRevenue("30d")
      ]);

      console.log("Owner Orders Data:", ordersData);
      console.log("Owner Revenue Data:", revenueData);

      setOrders(ordersData);
      setRevenue(revenueData);

      // Format currency
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      };

      // Format number
      const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
      };

      const statsCards: StatCard[] = [
        {
          id: "totalRevenue",
          label: "Tổng doanh thu",
          value: formatCurrency(revenueData.totals.totalRevenue),
          change: revenueData.monthlyComparison.change,
          changeType: revenueData.monthlyComparison.changeType,
          icon: DollarSign,
          bgColor: "bg-gradient-to-r from-emerald-50 to-green-50",
          iconColor: "text-emerald-600",
          format: "currency"
        },
        {
          id: "totalOrders",
          label: "Tổng đơn hàng",
          value: formatNumber(ordersData.pagination.totalOrders),
          icon: ShoppingCart,
          bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
          iconColor: "text-blue-600",
          format: "number"
        },
        {
          id: "completedOrders",
          label: "Đơn hoàn thành",
          value: formatNumber(ordersData.statistics.completed.count),
          icon: CheckCircle,
          bgColor: "bg-gradient-to-r from-green-50 to-emerald-50",
          iconColor: "text-green-600",
          format: "number"
        },
        {
          id: "pendingOrders",
          label: "Đơn chờ xử lý",
          value: formatNumber(ordersData.statistics.pending.count),
          icon: Clock,
          bgColor: "bg-gradient-to-r from-amber-50 to-orange-50",
          iconColor: "text-amber-600",
          format: "number"
        },
        {
          id: "avgOrderValue",
          label: "Giá trị trung bình",
          value: formatCurrency(revenueData.totals.avgOrderValue),
          icon: TrendingUp,
          bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
          iconColor: "text-purple-600",
          format: "currency"
        },
        {
          id: "activeRentals",
          label: "Đang cho thuê",
          value: formatNumber(ordersData.statistics.in_progress.count),
          icon: Package,
          bgColor: "bg-gradient-to-r from-cyan-50 to-blue-50",
          iconColor: "text-cyan-600",
          format: "number"
        }
      ];

      setStats(statsCards);
    } catch (error) {
      console.error("Error fetching owner dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleStatClick = (statId: string) => {
    const statToTabMap: Record<string, string> = {
      totalRevenue: "revenue",
      totalOrders: "orders",
      completedOrders: "orders",
      pendingOrders: "orders",
      avgOrderValue: "analytics",
      activeRentals: "orders",
    };

    const tabId = statToTabMap[statId];
    if (tabId) {
      setActiveTab(tabId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50";
      case "confirmed": return "text-blue-600 bg-blue-50";
      case "in_progress": return "text-amber-600 bg-amber-50";
      case "pending": return "text-gray-600 bg-gray-50";
      case "cancelled": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Hoàn thành";
      case "confirmed": return "Xác nhận";
      case "in_progress": return "Đang thuê";
      case "pending": return "Chờ xử lý";
      case "cancelled": return "Đã hủy";
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  if (loading) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                  Dashboard Owner
                </h1>
                <p className="mt-2 text-blue-100">
                  Quản lý và theo dõi hoạt động cho thuê của bạn
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="rounded-xl bg-white/20 p-3 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
              disabled={refreshing}
            >
              <RefreshCw className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
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
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
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
                  <h2 className="mb-2 text-xl font-bold text-gray-900">Tổng quan hoạt động</h2>
                  <p className="mb-6 text-sm text-gray-600">
                    Bấm vào các thẻ thống kê để xem chi tiết
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                    {stats.map((stat, index) => {
                      const Icon = stat.icon;
                      const isClickable = ["totalRevenue", "totalOrders", "completedOrders", "pendingOrders", "avgOrderValue", "activeRentals"].includes(stat.id);
                      return (
                        <div
                          key={stat.id}
                          className={`
                            group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6
                            shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-xl
                            ${isClickable ? 'cursor-pointer hover:border-blue-400' : 'cursor-default'}
                          `}
                          onClick={() => isClickable && handleStatClick(stat.id)}
                          style={{
                            animationDelay: `${index * 50}ms`,
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-50"></div>
                          
                          <div className="relative z-10">
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
                                <div className="rounded-full bg-blue-100 p-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                                </div>
                              )}
                            </div>
                            
                            <h3 className="mb-2 text-sm font-semibold text-gray-600 transition-colors group-hover:text-gray-900">
                              {stat.label}
                            </h3>
                            
                            <p className="mb-3 text-2xl font-bold text-gray-900 transition-colors">
                              {stat.value}
                            </p>
                            
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

            {activeTab === "orders" && <OwnerOrdersChart />}

            {activeTab === "revenue" && <OwnerRevenueChart />}

            {activeTab === "analytics" && (
              <Card>
                <CardHeader>
                  <CardTitle>Phân tích chi tiết</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Các biểu đồ và phân tích chi tiết sẽ được hiển thị tại đây.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
};

export default OwnerDashboard;