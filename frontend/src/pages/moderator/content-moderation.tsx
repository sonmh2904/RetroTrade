"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Button } from "@/components/ui/common/button";
import { Badge } from "@/components/ui/common/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/common/tabs";
import {
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  Flag,
  BarChart3,
  Users,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw
} from "lucide-react";
import { ModerationCommentsTable } from "@/components/ui/moderator/content-moderation/moderation-comments-table";
import { ModerationStats } from "@/components/ui/moderator/content-moderation/moderation-stats";
import { ModerationFilters } from "@/components/ui/moderator/content-moderation/moderation-filters";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { decodeToken } from "@/utils/jwtHelper";

export default function ContentModerationPage() {
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const user = accessToken ? decodeToken(accessToken) : null;
  const [activeTab, setActiveTab] = useState("pending");
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    violationType: "all",
    status: "pending"
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setRefreshKey(prev => prev + 1);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setFilters(prev => ({
      ...prev,
      status: value === "all" ? "all" : value
    }));
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Content Moderation
              </h1>
              <p className="text-gray-600 mt-1">
                Quản lý và kiểm duyệt nội dung bình luận
              </p>
            </div>
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </Button>
        </div>

        {/* Stats Overview */}
        <ModerationStats refreshKey={refreshKey} />

        {/* Main Content */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Danh sách bình luận cần moderation
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="grid w-fit grid-cols-4">
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Chờ duyệt ({/* Will be updated by stats */})
                  </TabsTrigger>
                  <TabsTrigger value="flagged" className="flex items-center gap-2">
                    <Flag className="w-4 h-4" />
                    Đánh dấu ({/* Will be updated by stats */})
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Đã duyệt
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Từ chối
                  </TabsTrigger>
                </TabsList>

                <ModerationFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
              </div>

              <TabsContent value="pending" className="mt-0">
                <ModerationCommentsTable
                  status="pending"
                  filters={filters}
                  refreshKey={refreshKey}
                  onRefresh={handleRefresh}
                />
              </TabsContent>

              <TabsContent value="flagged" className="mt-0">
                <ModerationCommentsTable
                  status="flagged"
                  filters={filters}
                  refreshKey={refreshKey}
                  onRefresh={handleRefresh}
                />
              </TabsContent>

              <TabsContent value="approved" className="mt-0">
                <ModerationCommentsTable
                  status="approved"
                  filters={filters}
                  refreshKey={refreshKey}
                  onRefresh={handleRefresh}
                />
              </TabsContent>

              <TabsContent value="rejected" className="mt-0">
                <ModerationCommentsTable
                  status="rejected"
                  filters={filters}
                  refreshKey={refreshKey}
                  onRefresh={handleRefresh}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
