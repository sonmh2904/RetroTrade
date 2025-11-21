"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { dashboardApi, ProductStats } from "@/services/admin/dashboard.api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/common/select";

export function ProductsChart() {
  const [data, setData] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productStats = await dashboardApi.getProductStats(period);
        setData(productStats);
      } catch (error) {
        console.error("Error fetching product data:", error);
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

  const maxProducts = data && data.timeline.length > 0
    ? Math.max(...data.timeline.map((d) => d.products))
    : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ Sản phẩm</CardTitle>
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

  // Vibrant color palette
  const colors = [
    "from-pink-500 via-rose-500 to-red-500",
    "from-fuchsia-500 via-purple-500 to-indigo-500",
    "from-cyan-500 via-blue-500 to-indigo-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-amber-500 via-orange-500 to-red-500",
    "from-violet-500 via-purple-500 to-fuchsia-500",
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Biểu đồ Sản phẩm (Rainbow Bars)</CardTitle>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 rounded-lg border-2 border-pink-200 shadow-sm">
            <div className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              {data.totals.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 font-medium">Tổng sản phẩm</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-lg border-2 border-green-200 shadow-sm">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {data.totals.active.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 font-medium">Đã duyệt</div>
          </div>
          {data.totals.pending !== undefined && (
            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-lg border-2 border-yellow-200 shadow-sm">
              <div className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                {data.totals.pending.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">Chờ duyệt</div>
            </div>
          )}
          {data.totals.rejected !== undefined && (
            <div className="text-center p-4 bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 rounded-lg border-2 border-red-200 shadow-sm">
              <div className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                {data.totals.rejected.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">Từ chối</div>
            </div>
          )}
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
                  const heightPercent = maxProducts > 0 ? (item.products / maxProducts) * 100 : 0;
                  const colorIndex = index % colors.length;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center group relative">
                      <div className="flex-1 w-full flex items-end justify-center">
                        <div
                          className={`w-full bg-gradient-to-t ${colors[colorIndex]} rounded-t-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl relative border-2 border-white/50 shadow-lg`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-50 shadow-xl font-medium pointer-events-none">
                            {item.products} sản phẩm
                          </div>
                          <div className="absolute inset-0 bg-white/20 rounded-t-xl" />
                          <div className="absolute top-0 left-0 right-0 h-1 bg-white/50 rounded-t-xl" />
                          <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/30 rounded-b-xl" />
                          {/* Shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-t-xl" />
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-2 text-center font-semibold truncate w-full px-1">
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
