"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Package, TrendingUp, Clock, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";
import { ProductStats } from "@/services/moderator/chart.api";
import { Button } from "@/components/ui/common/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/common/dropdown-menu";

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
  onViewAll?: () => void;
  showViewAllButton?: boolean;
  filter?: '30days' | 'all';
  onFilterChange?: (filter: '30days' | 'all') => void;
  showFilterButton?: boolean;
}

export function ProductsChart({ data = [], loading = false, statsData, onViewAll, showViewAllButton = true, filter = '30days', onFilterChange, showFilterButton = true }: ProductsChartProps) {
  // Use statsData from props or fallback to empty object
  const productStats = statsData ? {
    totalProducts: statsData.totalProducts || { value: "0", rawValue: 0, change: 0, changeType: "increase" },
    approvedProducts: statsData.approvedProducts || { value: "0", rawValue: 0 },
    rejectedProducts: statsData.rejectedProducts || { value: "0", rawValue: 0 },
    pendingProducts: statsData.pendingProducts || { value: "0", rawValue: 0 }
  } : null;

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
        <div className="flex items-center gap-2">
          {showFilterButton && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-xs"
                >
                  <Filter className="w-3 h-3" />
                  {filter === 'all' ? 'Tất cả' : '30 ngày gần nhất'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onFilterChange?.('30days')}>
                  30 ngày gần nhất
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange?.('all')}>
                  Tất cả
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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
            {/* Chart Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Tổng sản phẩm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Đã duyệt</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-gray-600">Chờ duyệt</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Bị từ chối</span>
              </div>
            </div>
            <div className="h-full flex flex-col">
              <div className="flex-1 relative pb-12 overflow-hidden bg-gray-50 pl-4">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <g className="opacity-30">
                    {/* Horizontal grid lines with Y-axis labels */}
                    {Array.from({ length: 5 }).map((_, i) => {
                      const y = i * 25;
                      const value = Math.round(maxTotal * (1 - i / 4));
                      return (
                        <g key={i}>
                          <line x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.2" />
                          <text x="-5" y={y} textAnchor="end" fontSize="4" fill="#374151" alignmentBaseline="middle">
                            {value}
                          </text>
                        </g>
                      );
                    })}
                    {/* Vertical grid lines */}
                    {data.map((_, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      return <line key={index} x1={x} y1="0" x2={x} y2="100" stroke="#e5e7eb" strokeWidth="0.2" />;
                    })}
                  </g>

                  {/* Area for total products (green area) */}
                  <path
                    d={`M 0 100 L 0 ${100 - (data[0]?.total || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.total / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 100 Z`}
                    fill="#86efac"
                    fillOpacity="0.6"
                    className="transition-all duration-500"
                  />

                  {/* Area for pending products (amber area) */}
                  <path
                    d={`M 0 100 L 0 ${100 - (data[0]?.pending || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.pending / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 100 Z`}
                    fill="#fbbf24"
                    fillOpacity="0.4"
                    className="transition-all duration-500"
                  />

                  {/* Area for rejected products (red area) */}
                  <path
                    d={`M 0 100 L 0 ${100 - (data[0]?.rejected || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.rejected / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 100 Z`}
                    fill="#f87171"
                    fillOpacity="0.4"
                    className="transition-all duration-500"
                  />

                  {/* Area for approved products (blue area) */}
                  <path
                    d={`M 0 100 L 0 ${100 - (data[0]?.approved || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.approved / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 100 Z`}
                    fill="#60a5fa"
                    fillOpacity="0.6"
                    className="transition-all duration-500"
                  />

                  {/* Line for total products */}
                  <path
                    d={`M 0 ${100 - (data[0]?.total || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.total / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />

                  {/* Line for approved products -->
                  <path
                    d={`M 0 ${100 - (data[0]?.approved || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.approved / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />

                  {/* Line for pending products */}
                  <path
                    d={`M 0 ${100 - (data[0]?.pending || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.pending / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />

                  {/* Line for rejected products */}
                  <path
                    d={`M 0 ${100 - (data[0]?.rejected || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.rejected / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />

                  {/* Data points for total products */}
                  {data.map((item, index) => {
                    const x = (index / (data.length - 1 || 1)) * 100;
                    const y = 100 - (item.total / maxTotal) * 100;
                    return (
                      <circle
                        key={`total-${index}`}
                        cx={x}
                        cy={y}
                        r="1"
                        fill="#22c55e"
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Data points for approved products */}
                  {data.map((item, index) => {
                    const x = (index / (data.length - 1 || 1)) * 100;
                    const y = 100 - (item.approved / maxTotal) * 100;
                    return (
                      <circle
                        key={`approved-${index}`}
                        cx={x}
                        cy={y}
                        r="1"
                        fill="#3b82f6"
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Data points for pending products */}
                  {data.map((item, index) => {
                    const x = (index / (data.length - 1 || 1)) * 100;
                    const y = 100 - (item.pending / maxTotal) * 100;
                    return (
                      <circle
                        key={`pending-${index}`}
                        cx={x}
                        cy={y}
                        r="1"
                        fill="#f59e0b"
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Data points for rejected products */}
                  {data.map((item, index) => {
                    const x = (index / (data.length - 1 || 1)) * 100;
                    const y = 100 - (item.rejected / maxTotal) * 100;
                    return (
                      <circle
                        key={`rejected-${index}`}
                        cx={x}
                        cy={y}
                        r="1"
                        fill="#ef4444"
                        className="transition-all duration-300"
                      />
                    );
                  })}
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600 px-1">
                  {data.filter((item) => item.total > 0).map((item, index) => (
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