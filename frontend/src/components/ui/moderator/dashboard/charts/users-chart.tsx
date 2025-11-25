"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Users, UserCheck, Shield, TrendingUp, ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/common/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/common/dropdown-menu";
import dynamic from 'next/dynamic';
import { UserStats } from "@/services/moderator/chart.api";

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

interface UserData {
  date: string;
  total: number;
  verified: number;
  unverified?: number;
}

interface UsersChartProps {
  data?: UserData[];
  loading?: boolean;
  statsData?: any;
  filter?: '30days' | 'all';
  onFilterChange?: (filter: '30days' | 'all') => void;
  showFilterButton?: boolean;
}

// Format number with thousands separator
const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.find((p: any) => p.dataKey === 'total')?.value || 0;
    const verified = payload.find((p: any) => p.dataKey === 'verified')?.value || 0;
    const unverified = total - verified;
    
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
            <span className="text-sm">Đã xác thực: <span className="font-medium">{formatNumber(verified)}</span></span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
            <span className="text-sm">Chưa xác thực: <span className="font-medium">{formatNumber(unverified)}</span></span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function UsersChart({ data = [], loading = false, statsData, filter = '30days', onFilterChange, showFilterButton = true }: UsersChartProps) {
  // Use statsData from props or fallback to empty object
  const userStats = statsData ? {
    totalUsers: statsData.totalUsers || { value: "0", rawValue: 0, change: 0, changeType: "increase" as const },
    verifiedUsers: statsData.verifiedUsers || { value: "0", rawValue: 0 },
    unverifiedUsers: statsData.totalUsers ? { 
      value: (statsData.totalUsers.rawValue - (statsData.verifiedUsers?.rawValue || 0)).toLocaleString('vi-VN'), 
      rawValue: statsData.totalUsers.rawValue - (statsData.verifiedUsers?.rawValue || 0) 
    } : { value: "0", rawValue: 0 },
    newUsersToday: statsData.newUsersToday || { value: "0", rawValue: 0 }
  } : null;

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Người dùng theo kênh</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[350px] flex items-center justify-center">
            <div className="text-gray-500">Đang tải dữ liệu...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Người dùng theo kênh</CardTitle>
          {showFilterButton && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs flex items-center gap-1"
                >
                  <Filter className="w-3 h-3" />
                  {filter === 'all' ? 'Tất cả' : '30 ngày gần nhất'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
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
      <CardContent className="pt-0">
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
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorUnverified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b7280" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0.1}/>
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
                
                {/* Total Users Area */}
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#22c55e" 
                  fillOpacity={1} 
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Tổng người dùng"
                />
                
                {/* Verified Users Area */}
                <Area 
                  type="monotone" 
                  dataKey="verified" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorVerified)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Đã xác thực"
                />
                
                {/* Unverified Users Area (calculated) */}
                <Area 
                  type="monotone" 
                  dataKey={item => item.total - item.verified}
                  name="Chưa xác thực"
                  stroke="#6b7280" 
                  fillOpacity={1} 
                  fill="url(#colorUnverified)"
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
