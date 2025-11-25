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
  console.log('Raw Stats Data:', statsData); // Debug log
  
  // Parse the stats data from the backend
  const parseStatValue = (value: any, defaultValue = 0) => {
    if (value === null || value === undefined) {
      const dv = typeof defaultValue === 'number' ? defaultValue : (parseInt(defaultValue as any, 10) || 0);
      return { value: dv.toString(), rawValue: dv };
    }
    if (typeof value === 'object' && value !== null) {
      return {
        value: value.value?.toString() || '0',
        rawValue: typeof value.rawValue === 'number'
          ? value.rawValue
          : (typeof value.value === 'number' ? value.value : parseInt(value.value || '0', 10) || 0)
      };
    }
    const num = typeof value === 'number' ? value : parseInt(value, 10) || 0;
    return {
      value: num.toString(),
      rawValue: num
    };
  };

  // Handle both direct values and nested data structure
  const stats = statsData?.data || statsData;
  
  const verificationStats = {
    totalVerifications: parseStatValue(stats?.totalVerifications, 5),
    pendingVerifications: parseStatValue(stats?.pendingVerifications, 0),
    approvedVerifications: parseStatValue(stats?.approvedVerifications, 2),
    rejectedVerifications: parseStatValue(stats?.rejectedVerifications, 3),
    newVerificationsToday: parseStatValue(stats?.newVerificationsToday, 0)
  };
  
  console.log('Processed Stats:', verificationStats); // Debug log

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Total Verifications */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span className="text-xs text-purple-600">Tổng</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {verificationStats.totalVerifications.rawValue?.toLocaleString('vi-VN') || '0'}
              </div>
              <div className="text-sm text-gray-600">Tổng yêu cầu xác thực</div>
            </div>
            
            {/* Pending Verifications */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-xs text-amber-600">Chờ xử lý</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {verificationStats.pendingVerifications.rawValue?.toLocaleString('vi-VN') || '0'}
              </div>
              <div className="text-sm text-gray-600">Yêu cầu chờ xử lý</div>
            </div>
            
            {/* Approved Verifications */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-xs text-emerald-600">Đã duyệt</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {verificationStats.approvedVerifications.rawValue?.toLocaleString('vi-VN') || '0'}
              </div>
              <div className="text-sm text-gray-600">Đã xác nhận</div>
            </div>
            
            {/* Rejected Verifications */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg border border-rose-200">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span className="text-xs text-rose-600">Từ chối</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {verificationStats.rejectedVerifications.rawValue?.toLocaleString('vi-VN') || '0'}
              </div>
              <div className="text-sm text-gray-600">Yêu cầu bị từ chối</div>
            </div>
          </div>
      </CardContent>
    </Card>
  );
}
