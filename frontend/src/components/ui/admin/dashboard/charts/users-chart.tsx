"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { dashboardApi, UserStats } from "@/services/admin/dashboard.api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/common/select";

export function UsersChart() {
  const [data, setData] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userStats = await dashboardApi.getUserStats(period);
        setData(userStats);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const maxUsers = data && data.timeline.length > 0 
    ? Math.max(...data.timeline.map((d) => d.users)) 
    : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ Người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-gray-500">Đang tải dữ liệu...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Color palette for bars
  const colors = [
    "from-indigo-500 to-blue-400",
    "from-purple-500 to-pink-400",
    "from-cyan-500 to-teal-400",
    "from-violet-500 to-purple-400",
    "from-blue-500 to-indigo-400",
    "from-pink-500 to-rose-400",
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Biểu đồ Người dùng (Multi-color Bars)</CardTitle>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Chọn khoảng thời gian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 ngày qua</SelectItem>
            <SelectItem value="30d">30 ngày qua</SelectItem>
            <SelectItem value="90d">90 ngày qua</SelectItem>
            <SelectItem value="1y">1 năm qua</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{data.totals.total.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Tổng người dùng</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{data.totals.active.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Đang hoạt động</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{data.totals.verified.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Đã xác thực</div>
          </div>
        </div>
        <div className="h-[400px] space-y-4">
          {data.timeline.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Không có dữ liệu
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 flex items-stretch gap-2 pb-10">
                {data.timeline.map((item, index) => {
                  const heightPercent = maxUsers > 0 ? (item.users / maxUsers) * 100 : 0;
                  const colorIndex = index % colors.length;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center group relative">
                      <div className="flex-1 w-full flex items-end justify-center">
                        <div
                          className={`w-full bg-gradient-to-t ${colors[colorIndex]} rounded-t-lg transition-all duration-300 hover:scale-105 hover:shadow-lg relative border-t-2 border-white/50`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 shadow-xl pointer-events-none">
                            {item.users} người
                          </div>
                          <div className="absolute inset-0 bg-white/10 rounded-t-lg" />
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-2 text-center font-medium truncate w-full px-1">
                        {formatDate(item.date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
