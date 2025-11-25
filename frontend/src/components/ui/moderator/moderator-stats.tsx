"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import {
  Users,
  FileText,
  Shield,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

export function ModeratorStats() {
  const stats = [
    {
      title: "Người dùng mới",
      value: "24",
      change: "+12%",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: "Trong 24h qua",
    },
    {
      title: "Sản phẩm chờ duyệt",
      value: "18",
      change: "+8",
      icon: Package,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      description: "Cần xử lý",
    },
    {
      title: "Bài viết mới",
      value: "12",
      change: "+5",
      icon: FileText,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      description: "Trong 24h qua",
    },
    {
      title: "Yêu cầu xác minh",
      value: "8",
      change: "+3",
      icon: Shield,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      description: "Đang chờ",
    },
  ];

  const activities = [
    {
      type: "approved",
      title: "Đã duyệt sản phẩm",
      description: "Laptop Gaming ASUS ROG",
      time: "2 phút trước",
    },
    {
      type: "rejected",
      title: "Đã từ chối sản phẩm",
      description: "iPhone 15 Pro Max",
      time: "15 phút trước",
    },
    {
      type: "pending",
      title: "Sản phẩm mới chờ duyệt",
      description: "MacBook Pro M3",
      time: "1 giờ trước",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-green-600">{stat.change}</span>
                  <span className="text-xs text-gray-500">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activities */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="mt-0.5">
                  {activity.type === "approved" && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {activity.type === "rejected" && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  {activity.type === "pending" && (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

