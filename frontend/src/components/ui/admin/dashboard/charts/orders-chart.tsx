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
  confirmed: number;
  delivery: number;
  received: number;
  progress: number;
  returned: number;
  completed: number;
  cancelled: number;
  disputed: number;
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
          confirmed: item.confirmed || 0,
          delivery: item.delivery || 0,
          received: item.received || 0,
          progress: item.progress || 0,
          returned: item.returned || 0,
          completed: item.completed || 0,
          cancelled: item.cancelled || 0,
          disputed: item.disputed || 0
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
      const confirmed = payload.find((p: any) => p.dataKey === 'confirmed')?.value || 0;
      const delivery = payload.find((p: any) => p.dataKey === 'delivery')?.value || 0;
      const received = payload.find((p: any) => p.dataKey === 'received')?.value || 0;
      const progress = payload.find((p: any) => p.dataKey === 'progress')?.value || 0;
      const returned = payload.find((p: any) => p.dataKey === 'returned')?.value || 0;
      const completed = payload.find((p: any) => p.dataKey === 'completed')?.value || 0;
      const cancelled = payload.find((p: any) => p.dataKey === 'cancelled')?.value || 0;
      const disputed = payload.find((p: any) => p.dataKey === 'disputed')?.value || 0;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{new Date(label).toLocaleDateString('vi-VN')}</p>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm">Tổng: <span className="font-medium">{formatNumber(orders)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
              <span className="text-sm">Chờ xử lý: <span className="font-medium">{formatNumber(pending)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
              <span className="text-sm">Đã xác nhận: <span className="font-medium">{formatNumber(confirmed)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
              <span className="text-sm">Đang giao hàng: <span className="font-medium">{formatNumber(delivery)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-teal-500 rounded-full mr-2"></div>
              <span className="text-sm">Đã nhận hàng: <span className="font-medium">{formatNumber(received)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              <span className="text-sm">Đang thuê: <span className="font-medium">{formatNumber(progress)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-sm">Đã trả hàng: <span className="font-medium">{formatNumber(returned)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">Hoàn thành: <span className="font-medium">{formatNumber(completed)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm">Đã hủy: <span className="font-medium">{formatNumber(cancelled)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-rose-500 rounded-full mr-2"></div>
              <span className="text-sm">Tranh chấp: <span className="font-medium">{formatNumber(disputed)}</span></span>
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
        {/* Stats Overview */}
        {orderStats && (
          <div className="space-y-4 mb-6">
            {/* Total Orders Card */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600">Tổng đơn hàng</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(orderStats.pagination.totalOrders)}</div>
              <div className="text-sm text-gray-600">Tổng số đơn hàng trong khoảng thời gian đã chọn</div>
            </div>
            
            {/* Status Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-xs text-amber-600">Chờ xử lý</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(orderStats.statistics.pending.count)}</div>
                <div className="text-sm text-gray-600">Đơn hàng chờ xử lý</div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-xs text-blue-600">Đã xác nhận</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(orderStats.statistics.confirmed.count)}</div>
                <div className="text-sm text-gray-600">Đơn hàng đã xác nhận</div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs text-indigo-600">Đang giao hàng</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(orderStats.statistics.delivery.count)}</div>
                <div className="text-sm text-gray-600">Đơn hàng đang giao</div>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg border border-teal-200">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  <span className="text-xs text-teal-600">Đã nhận hàng</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(orderStats.statistics.received.count)}</div>
                <div className="text-sm text-gray-600">Đơn hàng đã nhận</div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span className="text-xs text-purple-600">Đang thuê</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(orderStats.statistics.progress.count)}</div>
                <div className="text-sm text-gray-600">Đơn hàng đang cho thuê</div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-orange-600" />
                  <span className="text-xs text-orange-600">Đã trả hàng</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(orderStats.statistics.returned.count)}</div>
                <div className="text-sm text-gray-600">Đơn hàng đã trả</div>
              </div>

              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs text-emerald-600">Hoàn thành</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(orderStats.statistics.completed.count)}</div>
                <div className="text-sm text-gray-600">Đơn hàng hoàn thành</div>
              </div>

              <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-xs text-red-600">Đã hủy</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(orderStats.statistics.cancelled.count)}</div>
                <div className="text-sm text-gray-600">Đơn hàng đã hủy</div>
              </div>

              <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg border border-rose-200">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-5 h-5 text-rose-600" />
                  <span className="text-xs text-rose-600">Tranh chấp</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(orderStats.statistics.disputed.count)}</div>
                <div className="text-sm text-gray-600">Đơn hàng tranh chấp</div>
              </div>
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
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorDelivery" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorDisputed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1}/>
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
                
                {/* Pending Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="pending"
                  name="Chờ xử lý"
                  stroke="#f59e0b" 
                  fillOpacity={1} 
                  fill="url(#colorPending)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                
                {/* Confirmed Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="confirmed" 
                  name="Đã xác nhận"
                  stroke="#2563eb" 
                  fillOpacity={1} 
                  fill="url(#colorConfirmed)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                
                {/* Delivery Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="delivery"
                  name="Đang giao hàng"
                  stroke="#6366f1" 
                  fillOpacity={1} 
                  fill="url(#colorDelivery)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                
                {/* Received Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="received"
                  name="Đã nhận hàng"
                  stroke="#14b8a6" 
                  fillOpacity={1} 
                  fill="url(#colorReceived)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                
                {/* Progress Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="progress"
                  name="Đang thuê"
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorProgress)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                
                {/* Returned Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="returned"
                  name="Đã trả hàng"
                  stroke="#f97316" 
                  fillOpacity={1} 
                  fill="url(#colorReturned)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                
                {/* Completed Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  name="Hoàn thành"
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorCompleted)"
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
                
                {/* Disputed Orders Area */}
                <Area 
                  type="monotone" 
                  dataKey="disputed"
                  name="Tranh chấp"
                  stroke="#f43f5e" 
                  fillOpacity={1} 
                  fill="url(#colorDisputed)"
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
