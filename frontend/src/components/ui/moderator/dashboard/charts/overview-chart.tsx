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
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            Không có dữ liệu
          </div>
        ) : (
          <div className="h-[400px] space-y-4">
            <div className="h-full flex flex-col">
              <div className="flex-1 relative pb-12 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[...Array(5)].map((_, i) => (
                    <line
                      key={`grid-${i}`}
                      x1="0"
                      y1={i * 25}
                      x2="100"
                      y2={i * 25}
                      stroke="#e5e7eb"
                      strokeWidth="0.2"
                    />
                  ))}
                  
                  {/* Products line */}
                  <path
                    d={`M 0 ${100 - (data[0]?.products || 0) / maxValue * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.products / maxValue) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />
                  
                  {/* Posts line */}
                  <path
                    d={`M 0 ${100 - (data[0]?.posts || 0) / maxValue * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.posts / maxValue) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />
                  
                  {/* Users line */}
                  <path
                    d={`M 0 ${100 - (data[0]?.users || 0) / maxValue * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.users / maxValue) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />
                  
                  {/* Reports line */}
                  <path
                    d={`M 0 ${100 - (data[0]?.reports || 0) / maxValue * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.reports / maxValue) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                    strokeDasharray="3,2"
                  />
                  
                  {/* Data points */}
                  {data.map((item, index) => {
                    const x = (index / (data.length - 1 || 1)) * 100;
                    return (
                      <g key={index}>
                        {/* Products */}
                        <circle
                          cx={x}
                          cy={100 - (item.products / maxValue) * 100}
                          r="1.2"
                          fill="#3b82f6"
                          className="transition-all duration-300 hover:r-1.5"
                        />
                        {/* Posts */}
                        <circle
                          cx={x}
                          cy={100 - (item.posts / maxValue) * 100}
                          r="1.2"
                          fill="#10b981"
                          className="transition-all duration-300 hover:r-1.5"
                        />
                        {/* Users */}
                        <circle
                          cx={x}
                          cy={100 - (item.users / maxValue) * 100}
                          r="1.2"
                          fill="#8b5cf6"
                          className="transition-all duration-300 hover:r-1.5"
                        />
                        {/* Reports */}
                        <circle
                          cx={x}
                          cy={100 - (item.reports / maxValue) * 100}
                          r="1.2"
                          fill="#ef4444"
                          className="transition-all duration-300 hover:r-1.5"
                        />
                      </g>
                    );
                  })}
                </svg>
                
                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600 px-1">
                  {data.map((item, index) => (
                    <span key={index} className="text-center">
                      {formatDate(item.date)}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-xs text-gray-600">Sản phẩm</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                  <span className="text-xs text-gray-600">Bài viết</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-xs text-gray-600">Người dùng</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-xs text-gray-600">Báo cáo</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
