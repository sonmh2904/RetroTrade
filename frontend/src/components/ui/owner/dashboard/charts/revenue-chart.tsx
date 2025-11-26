"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { DollarSign, TrendingUp, ShoppingCart, ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";
import { ownerDashboardApi } from "@/services/owner/dashboard.api";
import { Button } from "@/components/ui/common/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/common/dropdown-menu";
import dynamic from 'next/dynamic';

// Dynamically import Recharts to avoid SSR issues
const AreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  { ssr: false }
);
const Area = dynamic(
  () => import('recharts').then((mod) => mod.Area),
  { ssr: false }
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const Legend = dynamic(
  () => import('recharts').then((mod) => mod.Legend),
  { ssr: false }
);

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export function OwnerRevenueChart() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const revenueStatsData = await ownerDashboardApi.getRevenue(period);
        
        setRevenueStats(revenueStatsData);
        setRevenueData(revenueStatsData.timeline);
      } catch (error) {
        console.error("Error fetching revenue data:", error);
      }
    };

    fetchData();
  }, [period]);

  // Format currency
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const revenue = payload.find((p: any) => p.dataKey === 'revenue')?.value || 0;
      const orders = payload.find((p: any) => p.dataKey === 'orders')?.value || 0;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{new Date(label).toLocaleDateString('vi-VN')}</p>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">Doanh thu: <span className="font-medium">{formatCurrency(revenue)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm">Đơn hàng: <span className="font-medium">{formatNumber(orders)}</span></span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!revenueStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Thống kê Doanh thu
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
          <DollarSign className="w-5 h-5 text-green-600" />
          Thống kê Doanh thu
        </CardTitle>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {period === '7d' ? '7 ngày qua' : period === '30d' ? '30 ngày qua' : period === '90d' ? '90 ngày qua' : period === '1y' ? '1 năm qua' : '30 ngày qua'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPeriod('7d')}>
              7 ngày qua
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod('30d')}>
              30 ngày qua
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod('90d')}>
              90 ngày qua
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod('1y')}>
              1 năm qua
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        {revenueStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600">Tổng doanh thu</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(revenueStats.totals.totalRevenue)}</div>
              <div className="text-sm text-gray-600">Tổng doanh thu từ các đơn hàng</div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600">Đơn hàng hoàn thành</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(revenueStats.totals.totalOrders)}</div>
              <div className="text-sm text-gray-600">Số đơn hàng đã hoàn thành</div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-xs text-purple-600">Giá trị trung bình</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(revenueStats.totals.avgOrderValue)}</div>
              <div className="text-sm text-gray-600">Giá trị trung bình mỗi đơn</div>
            </div>
          </div>
        )}

        {/* Monthly Comparison */}
        {revenueStats?.monthlyComparison && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">So với tháng trước</span>
                  {revenueStats.monthlyComparison.changeType === "increase" ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.abs(revenueStats.monthlyComparison.change)}%
                </div>
                <div className="text-sm text-gray-600">
                  Tháng này: {formatCurrency(revenueStats.monthlyComparison.currentMonth)} | 
                  Tháng trước: {formatCurrency(revenueStats.monthlyComparison.previousMonth)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart Section */}
        <div className="h-[400px]">
          {revenueData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Không có dữ liệu cho khoảng thời gian đã chọn
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  width={40}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}tr`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                    return value.toString();
                  }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#3b82f6', fontSize: 12 }}
                  width={40}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${value / 1000}k`;
                    return value.toString();
                  }}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    paddingTop: '20px',
                    fontSize: '12px',
                  }}
                />
                
                {/* Revenue Area */}
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Doanh thu"
                />
                
                {/* Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="orders"
                  name="Đơn hàng"
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorOrders)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  yAxisId="right"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
