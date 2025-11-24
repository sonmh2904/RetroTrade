"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Package, TrendingUp, Clock, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ProductStats } from "@/services/moderator/chart.api";

interface ProductData {
  date: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface ProductsChartProps {
  data?: ProductData[];
  loading?: boolean;
  statsData?: any; // Add statsData prop to receive dashboard data
}

export function ProductsChart({ data = [], loading = false, statsData }: ProductsChartProps) {
  // Use statsData from props or fallback to empty object
  const productStats = statsData ? {
    totalProducts: statsData.totalProducts || { value: "0", rawValue: 0, change: 0, changeType: "increase" },
    approvedProducts: statsData.approvedProducts || { value: "0", rawValue: 0 },
    rejectedProducts: statsData.rejectedProducts || { value: "0", rawValue: 0 },
    pendingProducts: statsData.pendingProducts || { value: "0", rawValue: 0 }
  } : null;

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const maxTotal = data.length > 0 ? Math.max(...data.map((d) => d.total)) : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Thống kê Sản phẩm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-gray-500">Đang tải dữ liệu...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" />
          Thống kê Sản phẩm
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        {productStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-orange-600" />
                {productStats.totalProducts.change !== undefined && (
                  <div className={`flex items-center text-xs ${
                    productStats.totalProducts.changeType === "increase" ? "text-green-600" : "text-red-600"
                  }`}>
                    {productStats.totalProducts.changeType === "increase" ? (
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(productStats.totalProducts.change)}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">{productStats.totalProducts.value}</div>
              <div className="text-sm text-gray-600">Tổng sản phẩm</div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600">Đã duyệt</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{productStats.approvedProducts.value}</div>
              <div className="text-sm text-gray-600">Sản phẩm đã duyệt</div>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-xs text-amber-600">Chờ duyệt</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{productStats.pendingProducts.value}</div>
              <div className="text-sm text-gray-600">Sản phẩm chờ duyệt</div>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">Bị từ chối</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{productStats.rejectedProducts.value}</div>
              <div className="text-sm text-gray-600">Sản phẩm bị từ chối</div>
            </div>
          </div>
        )}
        
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            Không có dữ liệu thời gian
          </div>
        ) : (
          <div className="h-[300px] space-y-4">
            <div className="h-full flex flex-col">
              <div className="flex-1 relative pb-12 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="productGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${100 - (data[0]?.total || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.total / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 100 L 0 100 Z`}
                    fill="url(#productGradient)"
                    className="transition-all duration-500"
                  />
                  <path
                    d={`M 0 ${100 - (data[0]?.total || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.total / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />
                  {data.map((item, index) => {
                    const x = (index / (data.length - 1 || 1)) * 100;
                    const y = 100 - (item.total / maxTotal) * 100;
                    return (
                      <g key={index}>
                        <circle
                          cx={x}
                          cy={y}
                          r="1.5"
                          fill="#f97316"
                          className="transition-all duration-300 hover:r-2"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="3"
                          fill="#f97316"
                          fillOpacity="0.2"
                          className="animate-pulse"
                        />
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600 px-1">
                  {data.map((item, index) => (
                    <span key={index} className="text-center">
                      {formatDate(item.date)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}