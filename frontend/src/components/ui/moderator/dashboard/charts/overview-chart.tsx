"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Activity, TrendingUp } from "lucide-react";

interface OverviewData {
  date: string;
  products: number;
  posts: number;
  users: number;
  reports: number;
}

interface OverviewChartProps {
  data: OverviewData[];
  loading?: boolean;
}

export function OverviewChart({ data, loading = false }: OverviewChartProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const maxValue = data.length > 0 
    ? Math.max(...data.flatMap(d => [d.products, d.posts, d.users, d.reports]))
    : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Tổng quan hoạt động
          </CardTitle>
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Tổng quan hoạt động 7 ngày qua
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-500">
            Không có dữ liệu
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600">Tổng</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.reduce((sum, item) => sum + item.products + item.posts + item.users + item.reports, 0)}
              </div>
              <div className="text-sm text-gray-600">Tổng hoạt động</div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600">Trung bình</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(data.reduce((sum, item) => sum + item.products + item.posts + item.users + item.reports, 0) / data.length)}
              </div>
              <div className="text-sm text-gray-600">Hoạt động/ngày</div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-5 h-5 bg-purple-500 rounded"></div>
                <span className="text-xs text-purple-600">Đỉnh</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.max(...data.map(item => item.products + item.posts + item.users + item.reports))}
              </div>
              <div className="text-sm text-gray-600">Cao nhất</div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-5 h-5 bg-red-500 rounded"></div>
                <span className="text-xs text-orange-600">Báo cáo</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.reduce((sum, item) => sum + item.reports, 0)}
              </div>
              <div className="text-sm text-gray-600">Tổng báo cáo</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
