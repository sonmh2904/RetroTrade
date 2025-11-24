"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Users, UserCheck, Clock, Shield, TrendingUp, ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/common/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/common/dropdown-menu";

import { UserStats } from "@/services/moderator/chart.api";

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

export function UsersChart({ data = [], loading = false, statsData, filter = '30days', onFilterChange, showFilterButton = true }: UsersChartProps) {
  // Use statsData from props or fallback to empty object
  const userStats = statsData ? {
    totalUsers: statsData.totalUsers || { value: "0", rawValue: 0, change: 0, changeType: "increase" },
    verifiedUsers: statsData.verifiedUsers || { value: "0", rawValue: 0 },
    unverifiedUsers: statsData.totalUsers ? { value: (statsData.totalUsers.rawValue - (statsData.verifiedUsers?.rawValue || 0)).toString(), rawValue: statsData.totalUsers.rawValue - (statsData.verifiedUsers?.rawValue || 0) } : { value: "0", rawValue: 0 },
    newUsersToday: statsData.newUsersToday || { value: "0", rawValue: 0 }
  } : null;

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const maxTotal = data.length > 0 ? Math.max(...data.map((d) => d.total)) : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thống kê Người dùng</CardTitle>
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
          <Users className="w-5 h-5 text-blue-600" />
          Thống kê Người dùng
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
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-purple-600" />
                {userStats.totalUsers.change !== undefined && (
                  <div className={`flex items-center text-xs ${
                    userStats.totalUsers.changeType === "increase" ? "text-green-600" : "text-red-600"
                  }`}>
                    {userStats.totalUsers.changeType === "increase" ? (
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(userStats.totalUsers.change)}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">{userStats.totalUsers.value}</div>
              <div className="text-sm text-gray-600">Tổng người dùng</div>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-xs text-emerald-600">Đã xác thực</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{userStats.verifiedUsers.value}</div>
              <div className="text-sm text-gray-600">Người dùng xác thực</div>
            </div>
            
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg border border-cyan-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-cyan-600" />
                <span className="text-xs text-cyan-600">Hôm nay</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{userStats.newUsersToday.value}</div>
              <div className="text-sm text-gray-600">Người dùng mới</div>
            </div>
            
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-gray-600" />
                <span className="text-xs text-gray-600">Chưa xác thực</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{userStats.unverifiedUsers.value}</div>
              <div className="text-sm text-gray-600">Chưa xác thực</div>
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
                <span className="text-gray-600">Tổng người dùng</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Đã xác thực</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="text-gray-600">Chưa xác thực</span>
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

                  {/* Area for total users (green area) */}
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

                  {/* Area for unverified users (gray area) */}
                  <path
                    d={`M 0 100 L 0 ${100 - ((data[0]?.total || 0) - (data[0]?.verified || 0)) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const unverified = item.total - item.verified;
                      const y = 100 - (unverified / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 100 Z`}
                    fill="#9ca3af"
                    fillOpacity="0.4"
                    className="transition-all duration-500"
                  />

                  {/* Area for verified users (blue area) */}
                  <path
                    d={`M 0 100 L 0 ${100 - (data[0]?.verified || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.verified / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 100 Z`}
                    fill="#60a5fa"
                    fillOpacity="0.6"
                    className="transition-all duration-500"
                  />

                  {/* Line for total users */}
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

                  {/* Line for verified users */}
                  <path
                    d={`M 0 ${100 - (data[0]?.verified || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.verified / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />

                  {/* Line for unverified users */}
                  <path
                    d={`M 0 ${100 - ((data[0]?.total || 0) - (data[0]?.verified || 0)) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const unverified = item.total - item.verified;
                      const y = 100 - (unverified / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />

                  {/* Data points for total users */}
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

                  {/* Data points for verified users */}
                  {data.map((item, index) => {
                    const x = (index / (data.length - 1 || 1)) * 100;
                    const y = 100 - (item.verified / maxTotal) * 100;
                    return (
                      <circle
                        key={`verified-${index}`}
                        cx={x}
                        cy={y}
                        r="1"
                        fill="#3b82f6"
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Data points for unverified users */}
                  {data.map((item, index) => {
                    const x = (index / (data.length - 1 || 1)) * 100;
                    const unverified = item.total - item.verified;
                    const y = 100 - (unverified / maxTotal) * 100;
                    return (
                      <circle
                        key={`unverified-${index}`}
                        cx={x}
                        cy={y}
                        r="1"
                        fill="#6b7280"
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
