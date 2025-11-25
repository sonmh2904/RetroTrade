"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { FileCheck, Clock, CheckCircle, XCircle, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { chartApi, OwnerRequestStats } from "@/services/moderator/chart.api";

interface OwnerRequestData {
  date: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface OwnerRequestsChartProps {
  data?: OwnerRequestData[];
  loading?: boolean;
  statsData?: any;
}

export function OwnerRequestsChart({ data = [], loading = false, statsData }: OwnerRequestsChartProps) {
  const ownerRequestStats = statsData ? {
    totalOwnerRequests: statsData.totalOwnerRequests || { value: "0", rawValue: 0 },
    pendingOwnerRequests: statsData.pendingOwnerRequests || { value: "0", rawValue: 0 },
    approvedOwnerRequests: statsData.approvedOwnerRequests || { value: "0", rawValue: 0 },
    rejectedOwnerRequests: statsData.rejectedOwnerRequests || { value: "0", rawValue: 0 },
    newOwnerRequestsToday: statsData.newOwnerRequestsToday || { value: "0", rawValue: 0 }
  } : null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thống kê Yêu cầu Owner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
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
          <FileCheck className="w-5 h-5 text-violet-600" />
          Thống kê Yêu cầu Owner
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ownerRequestStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-lg border border-violet-200">
              <div className="flex items-center justify-between mb-2">
                <FileCheck className="w-5 h-5 text-violet-600" />
                <span className="text-xs text-violet-600">Tổng</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{ownerRequestStats.totalOwnerRequests.value}</div>
              <div className="text-sm text-gray-600">Tổng yêu cầu Owner</div>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-xs text-amber-600">Chờ xử lý</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{ownerRequestStats.pendingOwnerRequests.value}</div>
              <div className="text-sm text-gray-600">Chờ duyệt</div>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-xs text-emerald-600">Đã duyệt</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{ownerRequestStats.approvedOwnerRequests.value}</div>
              <div className="text-sm text-gray-600">Đã phê duyệt</div>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">Đã từ chối</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{ownerRequestStats.rejectedOwnerRequests.value}</div>
              <div className="text-sm text-gray-600">Yêu cầu bị từ chối</div>
            </div>
            
            <div className="bg-gradient-to-r from-lime-50 to-cyan-50 p-4 rounded-lg border border-lime-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-lime-600" />
                <span className="text-xs text-lime-600">Hôm nay</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{ownerRequestStats.newOwnerRequestsToday.value}</div>
              <div className="text-sm text-gray-600">Yêu cầu mới</div>
            </div>
          </div>
        )}
        
        {!ownerRequestStats && (
          <div className="flex items-center justify-center text-gray-500 py-8">
            Không có dữ liệu
          </div>
        )}
      </CardContent>
    </Card>
  );
}
