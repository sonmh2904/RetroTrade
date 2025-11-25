"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { ShoppingCart, Clock, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";
import { dashboardApi, OrderStats } from "@/services/admin/dashboard.api";
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

interface OrderData {
  date: string;
  orders: number;
  pending: number;
  completed: number;
  cancelled: number;
}

export function OrdersChart() {
  const [orderData, setOrderData] = useState<OrderData[]>([]);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orderStatsData = await dashboardApi.getOrderStats(period);
        setOrderStats(orderStatsData);
        
        // Transform timeline data to match OrderData interface
        const transformedData = orderStatsData.timeline.map((item: any) => ({
          date: item.date,
          orders: item.orders,
          pending: item.pending || 0,
          completed: item.completed || 0,
          cancelled: item.cancelled || 0
        }));
        setOrderData(transformedData);
      } catch (error) {
        console.error("Error fetching order data:", error);
      }
    };

    fetchData();
  }, [period]);

  // Format number with thousands separator
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const orders = payload.find((p: any) => p.dataKey === 'orders')?.value || 0;
      const pending = payload.find((p: any) => p.dataKey === 'pending')?.value || 0;
      const completed = payload.find((p: any) => p.dataKey === 'completed')?.value || 0;
      const cancelled = payload.find((p: any) => p.dataKey === 'cancelled')?.value || 0;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{new Date(label).toLocaleDateString('vi-VN')}</p>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm">Tổng: <span className="font-medium">{formatNumber(orders)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
              <span className="text-sm">Hoàn thành: <span className="font-medium">{formatNumber(completed)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
              <span className="text-sm">Đang xử lý: <span className="font-medium">{formatNumber(pending)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm">Đã hủy: <span className="font-medium">{formatNumber(cancelled)}</span></span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!orderStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Thống kê Đơn hàng
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
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          Thống kê Đơn hàng
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
        {/* Stats Overview - 3 per row like moderator */}
        {orderStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600">Tổng</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{orderStats.totals.total?.toLocaleString() || '0'}</div>
              <div className="text-sm text-gray-600">Tổng đơn hàng</div>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-xs text-emerald-600">Hoàn thành</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{orderStats.totals.completed?.toLocaleString() || '0'}</div>
              <div className="text-sm text-gray-600">Đơn hàng hoàn thành</div>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-xs text-amber-600">Đang xử lý</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{orderStats.totals.pending?.toLocaleString() || '0'}</div>
              <div className="text-sm text-gray-600">Đơn hàng đang xử lý</div>
            </div>
          </div>
        )}

        {/* Chart Section */}
        <div className="h-[400px]">
          {orderData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Không có dữ liệu cho khoảng thời gian đã chọn
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={orderData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
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
                
                {/* Total Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Tổng đơn hàng"
                />
                
                {/* Completed Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorCompleted)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Hoàn thành"
                />
                
                {/* Pending Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="pending"
                  name="Đang xử lý"
                  stroke="#f59e0b" 
                  fillOpacity={1} 
                  fill="url(#colorPending)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                
                {/* Cancelled Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="cancelled"
                  name="Đã hủy"
                  stroke="#ef4444" 
                  fillOpacity={1} 
                  fill="url(#colorCancelled)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
