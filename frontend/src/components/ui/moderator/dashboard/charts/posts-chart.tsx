"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { FileText, Eye, Clock, CheckCircle, ArrowUpRight, ArrowDownRight, TrendingUp, Filter } from "lucide-react";
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

interface PostData {
  date: string;
  total: number;
  pending: number;
  active: number;
}

interface PostsChartProps {
  data?: PostData[];
  loading?: boolean;
  statsData?: any;
  filter?: '30days' | 'all';
  onFilterChange?: (filter: '30days' | 'all') => void;
  showFilterButton?: boolean;
}

export function PostsChart({ data = [], loading = false, statsData, filter = '30days', onFilterChange, showFilterButton = true }: PostsChartProps) {
  // Format number with thousands separator
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.find((p: any) => p.dataKey === 'total')?.value || 0;
      const activePosts = payload.find((p: any) => p.dataKey === 'active')?.value || 0;
      const pending = payload.find((p: any) => p.dataKey === 'pending')?.value || 0;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{new Date(label).toLocaleDateString('vi-VN')}</p>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">Tổng: <span className="font-medium">{formatNumber(total)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm">Đã kích hoạt: <span className="font-medium">{formatNumber(activePosts)}</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
              <span className="text-sm">Chờ xử lý: <span className="font-medium">{formatNumber(pending)}</span></span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Use statsData from props or fallback to empty object
  const postStats = statsData ? {
    totalPosts: statsData.totalPosts || { value: "0", rawValue: 0, change: 0, changeType: "increase" },
    pendingPosts: statsData.pendingPosts || { value: "0", rawValue: 0 },
    activePosts: statsData.totalPosts ? { value: (statsData.totalPosts.rawValue - (statsData.pendingPosts?.rawValue || 0)).toString(), rawValue: statsData.totalPosts.rawValue - (statsData.pendingPosts?.rawValue || 0) } : { value: "0", rawValue: 0 },
    newPostsToday: statsData.newPostsToday || { value: "0", rawValue: 0 }
  } : null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thống kê Bài viết</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-gray-500">Đang tải dữ liệu...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate maxTotal for the chart
  const maxTotal = data.length > 0 ? Math.max(...data.map(d => d.total)) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          Thống kê Bài viết
        </CardTitle>
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
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        {postStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-green-600" />
                {postStats.totalPosts.change !== undefined && (
                  <div className={`flex items-center text-xs ${
                    postStats.totalPosts.changeType === "increase" ? "text-green-600" : "text-red-600"
                  }`}>
                    {postStats.totalPosts.changeType === "increase" ? (
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(postStats.totalPosts.change)}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {parseInt(postStats.totalPosts.value).toLocaleString('vi-VN')}
              </div>
              <div className="text-sm text-gray-600">Tổng bài viết</div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-xs text-amber-600">Chờ xử lý</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {parseInt(postStats.pendingPosts.value).toLocaleString('vi-VN')}
              </div>
              <div className="text-sm text-gray-600">Chờ duyệt</div>
            </div>
            
            <div className="bg-gradient-to-r from-lime-50 to-green-50 p-4 rounded-lg border border-lime-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-lime-600" />
                <span className="text-xs text-lime-600">Hôm nay</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {parseInt(postStats.newPostsToday.value).toLocaleString('vi-VN')}
              </div>
              <div className="text-sm text-gray-600">Bài viết mới</div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600">Đã kích hoạt</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {parseInt(postStats.activePosts.value).toLocaleString('vi-VN')}
              </div>
              <div className="text-sm text-gray-600">Bài viết hoạt động</div>
            </div>
          </div>
        )}
        
        <div className="h-[350px] w-full mt-4">
          {data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Không có dữ liệu cho khoảng thời gian đã chọn
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
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
                
                {/* Total Posts Area */}
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Tổng bài viết"
                />
                
                {/* Active Posts Area */}
                <Area 
                  type="monotone" 
                  dataKey="active" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorActive)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Đã kích hoạt"
                />
                
                {/* Pending Posts Area */}
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
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
