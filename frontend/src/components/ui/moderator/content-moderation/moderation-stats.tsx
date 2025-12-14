"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import {
  Clock,
  Flag,
  CheckCircle,
  XCircle,
  Users,
  BarChart3,
  TrendingUp,
  Shield
} from "lucide-react";
import { getModerationStats, ModerationStats as ModerationStatsType } from "@/services/moderator/moderation.api";
import { toast } from "sonner";

interface ModerationStatsProps {
  refreshKey: number;
}

export function ModerationStats({ refreshKey }: ModerationStatsProps) {
  const [stats, setStats] = useState<ModerationStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getModerationStats();
      if (response.code === 200) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch moderation stats:", error);
      toast.error("Không thể tải thống kê moderation");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Chờ duyệt",
      value: stats?.overview.pending || 0,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      description: "Comments đang chờ xử lý"
    },
    {
      title: "Đánh dấu",
      value: stats?.overview.flagged || 0,
      icon: Flag,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      description: "Comments được AI đánh dấu"
    },
    {
      title: "Đã duyệt",
      value: stats?.overview.approved || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      description: "Comments được chấp nhận"
    },
    {
      title: "Từ chối",
      value: stats?.overview.rejected || 0,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
      description: "Comments bị từ chối"
    },
    {
      title: "Users bị ban",
      value: stats?.users.currentlyBanned || 0,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      description: "Users đang bị cấm comment"
    },
    {
      title: "Tổng xử lý",
      value: stats?.overview.totalProcessed || 0,
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      description: "Tổng comments đã xử lý"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.description}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
