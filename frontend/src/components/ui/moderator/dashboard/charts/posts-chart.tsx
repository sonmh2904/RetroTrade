import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { FileText, Eye, Clock, CheckCircle, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { PostStats } from "@/services/moderator/chart.api";

interface PostData {
  date: string;
  total: number;
  pending: number;
  active: number;
}

interface PostsChartProps {
  data?: PostData[];
  loading?: boolean;
  statsData?: any; // Add statsData prop to receive dashboard data
}

export function PostsChart({ data = [], loading = false, statsData }: PostsChartProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const maxTotal = data.length > 0 ? Math.max(...data.map((d) => d.total)) : 0;

  // Use statsData from props or fallback to empty object
  const postStats = statsData ? {
    totalPosts: statsData.totalPosts || { value: "0", rawValue: 0, change: 0, changeType: "increase" },
    pendingPosts: statsData.pendingPosts || { value: "0", rawValue: 0 },
    activePosts: statsData.totalPosts ? { value: (statsData.totalPosts.rawValue - (statsData.pendingPosts?.rawValue || 0)).toString(), rawValue: statsData.totalPosts.rawValue - (statsData.pendingPosts?.rawValue || 0) } : { value: "0", rawValue: 0 },
    newPostsToday: statsData.newPostsToday || { value: "0", rawValue: 0 }
  } : null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thống kê Bài viết</CardTitle>
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
          <FileText className="w-5 h-5 text-green-600" />
          Thống kê Bài viết
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        {postStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-green-600" />
                {postStats.totalPosts.change !== undefined && (
                  <div className={`flex items-center text-xs ${
                    postStats.totalPosts.changeType === "increase" ? "text-green-600" : "text-red-600"
                  }`}>
                    {postStats.totalPosts.changeType === "increase" ? (
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(postStats.totalPosts.change)}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">{postStats.totalPosts.value}</div>
              <div className="text-sm text-gray-600">Tổng bài viết</div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600">Chờ xử lý</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{postStats.pendingPosts.value}</div>
              <div className="text-sm text-gray-600">Chờ duyệt</div>
            </div>
            
            <div className="bg-gradient-to-r from-lime-50 to-green-50 p-4 rounded-lg border border-lime-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-lime-600" />
                <span className="text-xs text-lime-600">Hôm nay</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{postStats.newPostsToday.value}</div>
              <div className="text-sm text-gray-600">Bài viết mới</div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600">Đã kích hoạt</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{postStats.activePosts.value}</div>
              <div className="text-sm text-gray-600">Bài viết hoạt động</div>
            </div>
          </div>
        )}
        
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            Không có dữ liệu thời gian
          </div>
        ) : (
          <div className="h-[300px] space-y-4">
            <div className="h-full flex flex-col">
              <div className="flex-1 relative pb-12 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="postGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${100 - (data[0]?.total || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.total / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 100 L 0 100 Z`}
                    fill="url(#postGradient)"
                    className="transition-all duration-500"
                  />
                  <path
                    d={`M 0 ${100 - (data[0]?.total || 0) / maxTotal * 100} ${data.map((item, index) => {
                      const x = (index / (data.length - 1 || 1)) * 100;
                      const y = 100 - (item.total / maxTotal) * 100;
                      return `L ${x} ${y}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />
                  {data.map((item, index) => {
                    const x = (index / (data.length - 1 || 1)) * 100;
                    const y = 100 - (item.total / maxTotal) * 100;
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
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600 px-1">
                  {data.map((item, index) => (
                    <span key={index} className="text-center">
                      {formatDate(item.date)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
