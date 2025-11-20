"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { dashboardApi, OrderStats } from "@/services/admin/dashboard.api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/common/select";

export function OrdersChart() {
  const [data, setData] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const orderStats = await dashboardApi.getOrderStats(period);
        setData(orderStats);
      } catch (error) {
        console.error("Error fetching order data:", error);
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

  const maxOrders = data && data.timeline.length > 0
    ? Math.max(...data.timeline.map((d) => d.orders))
    : 0;

  const totalByStatus = data ? Object.values(data.byStatus).reduce((a, b) => a + b, 0) : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ Đơn hàng</CardTitle>
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

  const statusColors: Record<string, { bg: string; gradient: string; text: string }> = {
    pending: { 
      bg: "bg-yellow-500", 
      gradient: "from-yellow-400 via-amber-500 to-orange-500",
      text: "text-yellow-700"
    },
    confirmed: { 
      bg: "bg-blue-500", 
      gradient: "from-blue-400 via-cyan-500 to-teal-500",
      text: "text-blue-700"
    },
    in_progress: { 
      bg: "bg-purple-500", 
      gradient: "from-purple-400 via-violet-500 to-indigo-500",
      text: "text-purple-700"
    },
    completed: { 
      bg: "bg-green-500", 
      gradient: "from-green-400 via-emerald-500 to-teal-500",
      text: "text-green-700"
    },
    cancelled: { 
      bg: "bg-red-500", 
      gradient: "from-red-400 via-rose-500 to-pink-500",
      text: "text-red-700"
    },
  };

  // Color variations for timeline bars
  const barColors = [
    "from-orange-500 via-amber-500 to-yellow-500",
    "from-red-500 via-rose-500 to-pink-500",
    "from-amber-500 via-orange-500 to-red-500",
    "from-yellow-500 via-amber-500 to-orange-500",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Biểu đồ Đơn hàng (Gradient Bars)</CardTitle>
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
          <div className="h-[400px] space-y-4">
            {data.timeline.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                Không có dữ liệu
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex-1 flex items-stretch gap-2 pb-10">
                  {data.timeline.map((item, index) => {
                    const heightPercent = maxOrders > 0 ? (item.orders / maxOrders) * 100 : 0;
                    const colorIndex = index % barColors.length;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center group relative">
                        <div className="flex-1 w-full flex items-end justify-center">
                          <div
                            className={`w-full bg-gradient-to-t ${barColors[colorIndex]} rounded-t-lg transition-all duration-300 hover:scale-105 hover:shadow-xl relative border-t-2 border-white/50`}
                            style={{ height: `${heightPercent}%` }}
                          >
                            <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 shadow-xl pointer-events-none">
                              {item.orders} đơn
                            </div>
                            <div className="absolute inset-0 bg-white/10 rounded-t-lg" />
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-b-lg" />
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

      <Card>
        <CardHeader>
          <CardTitle>Phân bố Đơn hàng theo Trạng thái (Pie Chart Style)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Progress bars */}
            <div className="space-y-4">
              {Object.entries(data.byStatus).map(([status, count], index) => {
                const percentage = totalByStatus > 0 ? (count / totalByStatus) * 100 : 0;
                const colorInfo = statusColors[status.toLowerCase()] || { 
                  bg: "bg-gray-500", 
                  gradient: "from-gray-400 to-gray-500",
                  text: "text-gray-700"
                };
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium capitalize ${colorInfo.text}`}>
                        {status}
                      </span>
                      <span className="text-sm text-gray-600 font-semibold">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                      <div
                        className={`h-full bg-gradient-to-r ${colorInfo.gradient} transition-all duration-700 rounded-full relative overflow-hidden`}
                        style={{ width: `${percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Visual pie representation */}
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                {Object.entries(data.byStatus).map(([status, count], index) => {
                  const percentage = totalByStatus > 0 ? (count / totalByStatus) * 100 : 0;
                  const colorInfo = statusColors[status.toLowerCase()] || { 
                    bg: "bg-gray-500",
                    gradient: "from-gray-400 to-gray-500"
                  };
                  
                  // Calculate angles for pie segments
                  let startAngle = 0;
                  for (let i = 0; i < index; i++) {
                    const prevStatus = Object.keys(data.byStatus)[i];
                    const prevCount = data.byStatus[prevStatus];
                    startAngle += (prevCount / totalByStatus) * 360;
                  }
                  const angle = (count / totalByStatus) * 360;
                  
                  return (
                    <div
                      key={status}
                      className="absolute inset-0 rounded-full overflow-hidden"
                      style={{
                        clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((startAngle + angle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle + angle - 90) * Math.PI / 180)}%)`,
                      }}
                    >
                      <div className={`w-full h-full bg-gradient-to-br ${colorInfo.gradient}`} />
                    </div>
                  );
                })}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">{totalByStatus}</div>
                      <div className="text-xs text-gray-500">Tổng</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
