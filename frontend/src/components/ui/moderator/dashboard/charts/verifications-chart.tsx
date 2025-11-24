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
      </CardContent>
    </Card>
  );
}
