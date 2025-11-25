"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { AlertTriangle, Clock, CheckCircle, TrendingUp, ArrowUpRight, ArrowDownRight, Eye, XCircle } from "lucide-react";
import { chartApi, ReportStats } from "@/services/moderator/chart.api";

interface ReportData {
  date: string;
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
}

interface ReportsChartProps {
  data?: ReportData[];
  loading?: boolean;
  statsData?: any;
}

export function ReportsChart({ data = [], loading = false, statsData }: ReportsChartProps) {
  const [selectedView, setSelectedView] = useState<"total" | "status">("total");
  const reportStats = statsData ? {
    totalReports: statsData.totalReports || { value: "0", rawValue: 0 },
    pendingReports: statsData.pendingReports || { value: "0", rawValue: 0 },
    inProgressReports: statsData.inProgressReports || { value: "0", rawValue: 0 },
    resolvedReports: statsData.resolvedReports || { value: "0", rawValue: 0 },
    rejectedReports: statsData.rejectedReports || { value: "0", rawValue: 0 },
    newReportsToday: statsData.newReportsToday || { value: "0", rawValue: 0 }
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
          <CardTitle>Thống kê Báo cáo</CardTitle>
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
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Thống kê Báo cáo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        {reportStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">Tổng</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reportStats.totalReports.value}</div>
              <div className="text-sm text-gray-600">Tổng báo cáo</div>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-xs text-amber-600">Chờ xử lý</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reportStats.pendingReports.value}</div>
              <div className="text-sm text-gray-600">Báo cáo chờ xử lý</div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600">Đang xử lý</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reportStats.inProgressReports.value}</div>
              <div className="text-sm text-gray-600">Báo cáo đang xử lý</div>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-xs text-emerald-600">Đã giải quyết</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reportStats.resolvedReports.value}</div>
              <div className="text-sm text-gray-600">Báo cáo đã giải quyết</div>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">Đã từ chối</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reportStats.rejectedReports.value}</div>
              <div className="text-sm text-gray-600">Báo cáo đã từ chối</div>
            </div>
            
            <div className="bg-gradient-to-r from-lime-50 to-cyan-50 p-4 rounded-lg border border-lime-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-lime-600" />
                <span className="text-xs text-lime-600">Hôm nay</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reportStats.newReportsToday.value}</div>
              <div className="text-sm text-gray-600">Báo cáo mới</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
