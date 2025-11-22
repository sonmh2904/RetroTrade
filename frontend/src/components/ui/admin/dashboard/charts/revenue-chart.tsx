"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { dashboardApi, RevenueDataPoint } from "@/services/admin/dashboard.api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/common/select";

export function RevenueChart() {
  const [data, setData] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const revenueData = await dashboardApi.getRevenueStats(period);
        setData(revenueData);
      } catch (error) {
        console.error("Error fetching revenue data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const maxRevenue = data.length > 0 ? Math.max(...data.map((d) => d.revenue)) : 0;
  const minRevenue = data.length > 0 ? Math.min(...data.map((d) => d.revenue)) : 0;
  const range = maxRevenue - minRevenue;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ Doanh thu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-gray-500">Đang tải dữ liệu...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate line chart path
  const generateLinePath = () => {
    if (data.length === 0) return "";
    const width = 100;
    const height = 100;
    const stepX = width / (data.length - 1 || 1);
    
    let path = `M 0 ${height - ((data[0].revenue - minRevenue) / range) * height}`;
    data.forEach((item, index) => {
      if (index > 0) {
        const x = index * stepX;
        const y = height - ((item.revenue - minRevenue) / range) * height;
        path += ` L ${x} ${y}`;
      }
    });
    return path;
  };

  // Generate area path
  const generateAreaPath = () => {
    const linePath = generateLinePath();
    if (!linePath) return "";
    const width = 100;
    const height = 100;
    return `${linePath} L ${width} ${height} L 0 ${height} Z`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Biểu đồ Doanh thu (Line Chart)</CardTitle>
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
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Không có dữ liệu
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Line Chart with Area */}
              <div className="flex-1 relative pb-12 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Area fill */}
                  <defs>
                    <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    d={generateAreaPath()}
                    fill="url(#revenueGradient)"
                    className="transition-all duration-500"
                  />
                  {/* Line */}
                  <path
                    d={generateLinePath()}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />
                  {/* Data points */}
                  {data.map((item, index) => {
                    const width = 100;
                    const stepX = width / (data.length - 1 || 1);
                    const x = index * stepX;
                    const y = 100 - ((item.revenue - minRevenue) / range) * 100;
                    return (
                      <g key={index}>
                        <circle
                          cx={x}
                          cy={y}
                          r="1.5"
                          fill="#10b981"
                          className="transition-all duration-300 hover:r-2"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="3"
                          fill="#10b981"
                          fillOpacity="0.2"
                          className="animate-pulse"
                        />
                      </g>
                    );
                  })}
                </svg>
                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600 px-1 overflow-hidden">
                  {data.map((item, index) => (
                    <span 
                      key={index} 
                      className="transform -rotate-45 origin-left whitespace-nowrap"
                      style={{ 
                        maxWidth: `${100 / data.length}%`,
                        paddingRight: '4px'
                      }}
                    >
                      {formatDate(item.date)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
