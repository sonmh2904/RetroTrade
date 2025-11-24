"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Shield, Clock, CheckCircle, XCircle, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { chartApi, VerificationStats } from "@/services/moderator/chart.api";

interface VerificationData {
  date: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface VerificationsChartProps {
  data?: VerificationData[];
  loading?: boolean;
  statsData?: any;
}

export function VerificationsChart({ data = [], loading = false, statsData }: VerificationsChartProps) {
  const [selectedView, setSelectedView] = useState<"total" | "status">("total");
  const verificationStats = statsData ? {
    totalVerifications: statsData.totalVerifications || { value: "0", rawValue: 0 },
    pendingVerifications: statsData.pendingVerifications || { value: "0", rawValue: 0 },
    approvedVerifications: { value: "0", rawValue: 0 },
    rejectedVerifications: { value: "0", rawValue: 0 },
    newVerificationsToday: { value: "0", rawValue: 0 }
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
          <CardTitle>Thống kê Xác thực</CardTitle>
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
          <Shield className="w-5 h-5 text-purple-600" />
          Thống kê Xác thực
        </CardTitle>
        
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        {verificationStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span className="text-xs text-purple-600">Tổng</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{verificationStats.totalVerifications.value}</div>
              <div className="text-sm text-gray-600">Tổng yêu cầu xác thực</div>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-xs text-amber-600">Chờ xử lý</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{verificationStats.pendingVerifications.value}</div>
              <div className="text-sm text-gray-600">Chờ xác thực</div>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-xs text-emerald-600">Đã duyệt</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{verificationStats.approvedVerifications.value}</div>
              <div className="text-sm text-gray-600">Đã xác thực</div>
            </div>
            
            <div className="bg-gradient-to-r from-lime-50 to-cyan-50 p-4 rounded-lg border border-lime-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-lime-600" />
                <span className="text-xs text-lime-600">Hôm nay</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{verificationStats.newVerificationsToday.value}</div>
              <div className="text-sm text-gray-600">Yêu cầu mới</div>
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
                    <linearGradient id="verificationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
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
                    fill="url(#verificationGradient)"
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
