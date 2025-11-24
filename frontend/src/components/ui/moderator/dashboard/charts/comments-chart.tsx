"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { MessageSquare, Clock, CheckCircle, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { chartApi, CommentStats } from "@/services/moderator/chart.api";

interface CommentData {
  date: string;
  total: number;
  pending: number;
  approved: number;
}

interface CommentsChartProps {
  data?: CommentData[];
  loading?: boolean;
  statsData?: any; // Add statsData prop to receive dashboard data
}

export function CommentsChart({ data = [], loading = false, statsData }: CommentsChartProps) {
  const [selectedView, setSelectedView] = useState<"total" | "status">("total");
  // Use statsData from props or fallback to empty object
  const commentStats = statsData ? {
    totalComments: statsData.totalComments || { value: "0", rawValue: 0 },
    pendingComments: statsData.pendingComments || { value: "0", rawValue: 0 },
    approvedComments: statsData.totalComments ? { value: (statsData.totalComments.rawValue - (statsData.pendingComments?.rawValue || 0)).toString(), rawValue: statsData.totalComments.rawValue - (statsData.pendingComments?.rawValue || 0) } : { value: "0", rawValue: 0 },
    newCommentsToday: statsData.newCommentsToday || { value: "0", rawValue: 0 }
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
          <CardTitle>Thống kê bình luận</CardTitle>
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
          <MessageSquare className="w-5 h-5 text-yellow-600" />
          Thống kê bình luận
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        {commentStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-5 h-5 text-yellow-600" />
                <span className="text-xs text-yellow-600">Tổng</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{commentStats.totalComments.value}</div>
              <div className="text-sm text-gray-600">Tổng bình luận</div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600">Chờ xử lý</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{commentStats.pendingComments.value}</div>
              <div className="text-sm text-gray-600">Chờ duyệt</div>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-xs text-emerald-600">Đã duyệt</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{commentStats.approvedComments.value}</div>
              <div className="text-sm text-gray-600">Bình luận đã duyệt</div>
            </div>
            
            <div className="bg-gradient-to-r from-lime-50 to-cyan-50 p-4 rounded-lg border border-lime-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-lime-600" />
                <span className="text-xs text-lime-600">Hôm nay</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{commentStats.newCommentsToday.value}</div>
              <div className="text-sm text-gray-600">Bình luận mới</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
