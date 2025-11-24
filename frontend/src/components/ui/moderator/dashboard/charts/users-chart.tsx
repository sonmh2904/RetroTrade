"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Users, TrendingUp, Shield, ArrowUpRight, ArrowDownRight, UserCheck } from "lucide-react";
import { UserStats } from "@/services/moderator/chart.api";

interface UserData {
  date: string;
  total: number;
  verified: number;
}

interface UsersChartProps {
  data?: UserData[];
  loading?: boolean;
  statsData?: any; // Add statsData prop to receive dashboard data
}

export function UsersChart({ data = [], loading = false, statsData }: UsersChartProps) {
  // Use statsData from props or fallback to empty object
  const userStats = statsData ? {
    totalUsers: statsData.totalUsers || { value: "0", rawValue: 0, change: 0, changeType: "increase" },
    verifiedUsers: statsData.verifiedUsers || { value: "0", rawValue: 0 },
    unverifiedUsers: statsData.totalUsers ? { value: (statsData.totalUsers.rawValue - (statsData.verifiedUsers?.rawValue || 0)).toString(), rawValue: statsData.totalUsers.rawValue - (statsData.verifiedUsers?.rawValue || 0) } : { value: "0", rawValue: 0 },
    newUsersToday: statsData.newUsersToday || { value: "0", rawValue: 0 }
  } : null;

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
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
          <Users className="w-5 h-5 text-purple-600" />
          Thống kê Người dùng
        </CardTitle>
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
            <div className="h-full flex flex-col">
              <div className="flex-1 relative pb-12 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="userGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${100 - (data[0]?.total || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.total / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 100 L 0 100 Z`}
                    fill="url(#userGradient)"
                    className="transition-all duration-500"
                  />
                  <path
                    d={`M 0 ${100 - (data[0]?.total || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.total / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#8b5cf6"
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
                          fill="#8b5cf6"
                          className="transition-all duration-300 hover:r-2"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="3"
                          fill="#8b5cf6"
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
