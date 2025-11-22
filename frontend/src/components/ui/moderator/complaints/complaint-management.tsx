"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Badge } from "@/components/ui/common/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/common/dialog";
import { Textarea } from "@/components/ui/common/textarea";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { complaintAPI } from "@/services/admin/complaint.api";
import type { Complaint } from "@/services/admin/complaint.api";

export function ComplaintManagement() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showHandleDialog, setShowHandleDialog] = useState(false);
  const [handleAction, setHandleAction] = useState<"resolve" | "reject" | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [isHandling, setIsHandling] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchComplaints();
  }, [page, limit, statusFilter, search]);

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const result = await complaintAPI.getAllComplaints(page, limit, statusFilter, search);
      if (result.code === 200 && result.data) {
        setComplaints(result.data.items || []);
        if (result.data.totalPages) {
          setTotalPages(result.data.totalPages);
          setTotalItems(result.data.totalItems || 0);
        }
      } else {
        toast.error(result.message || "Không thể tải danh sách khiếu nại");
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
      toast.error("Có lỗi xảy ra khi tải danh sách khiếu nại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = async (complaint: Complaint) => {
    try {
      const result = await complaintAPI.getComplaintById(complaint._id);
      if (result.code === 200 && result.data) {
        setSelectedComplaint(result.data);
        setShowDetailDialog(true);
      } else {
        toast.error(result.message || "Không thể tải chi tiết khiếu nại");
      }
    } catch (error) {
      console.error("Error fetching complaint detail:", error);
      toast.error("Có lỗi xảy ra khi tải chi tiết khiếu nại");
    }
  };

  const handleOpenHandleDialog = (complaint: Complaint, action: "resolve" | "reject") => {
    setSelectedComplaint(complaint);
    setHandleAction(action);
    setAdminResponse("");
    setShowHandleDialog(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedComplaint || !handleAction) return;

    setIsHandling(true);
    try {
      const result = await complaintAPI.handleComplaint(
        selectedComplaint._id,
        handleAction,
        adminResponse
      );
      if (result.code === 200) {
        toast.success(result.message || "Xử lý khiếu nại thành công");
        setShowHandleDialog(false);
        setSelectedComplaint(null);
        setHandleAction(null);
        setAdminResponse("");
        fetchComplaints();
      } else {
        toast.error(result.message || "Xử lý khiếu nại thất bại");
      }
    } catch (error) {
      console.error("Error handling complaint:", error);
      toast.error("Có lỗi xảy ra khi xử lý khiếu nại");
    } finally {
      setIsHandling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Chờ xử lý
          </Badge>
        );
      case "reviewing":
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Đang xem xét
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Đã chấp nhận
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Đã từ chối
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString("vi-VN");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo email, chủ đề, nội dung..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="reviewing">Đang xem xét</option>
                <option value="resolved">Đã chấp nhận</option>
                <option value="rejected">Đã từ chối</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách khiếu nại ({totalItems})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Không có khiếu nại nào
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Email</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Chủ đề</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Trạng thái</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Ngày gửi</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((complaint) => (
                      <tr key={complaint._id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{complaint.email}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">{complaint.subject}</span>
                        </td>
                        <td className="p-3">{getStatusBadge(complaint.status)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {formatDate(complaint.createdAt)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(complaint)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Xem
                            </Button>
                            {complaint.status === "pending" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleOpenHandleDialog(complaint, "resolve")}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Chấp nhận
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleOpenHandleDialog(complaint, "reject")}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Từ chối
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Trang {page} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết khiếu nại</DialogTitle>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedComplaint.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                  <div className="mt-1">{getStatusBadge(selectedComplaint.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Chủ đề</label>
                  <p className="text-sm text-gray-900">{selectedComplaint.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày gửi</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedComplaint.createdAt)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nội dung khiếu nại</label>
                <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                  {selectedComplaint.message}
                </p>
              </div>
              {selectedComplaint.userId && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Thông tin người dùng</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tên</label>
                      <p className="text-sm text-gray-900">
                        {selectedComplaint.userId.fullName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Trạng thái tài khoản</label>
                      <p className="text-sm text-gray-900">
                        {selectedComplaint.userId.isDeleted || !selectedComplaint.userId.isActive
                          ? "Đã bị khóa"
                          : "Hoạt động"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {selectedComplaint.banHistory && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Lịch sử ban</h4>
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Lý do ban</label>
                        <p className="text-sm text-gray-900">{selectedComplaint.banHistory.reason}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Ngày ban</label>
                        <p className="text-sm text-gray-900">
                          {formatDate(selectedComplaint.banHistory.bannedAt)}
                        </p>
                      </div>
                      {selectedComplaint.banHistory.bannedBy && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Người ban</label>
                          <p className="text-sm text-gray-900">
                            {selectedComplaint.banHistory.bannedBy.fullName || "N/A"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {selectedComplaint.adminResponse && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-700">Phản hồi từ admin</label>
                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                    {selectedComplaint.adminResponse}
                  </p>
                </div>
              )}
              {selectedComplaint.status === "pending" && (
                <DialogFooter>
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setShowDetailDialog(false);
                      handleOpenHandleDialog(selectedComplaint, "resolve");
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Chấp nhận
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowDetailDialog(false);
                      handleOpenHandleDialog(selectedComplaint, "reject");
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Từ chối
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Handle Dialog */}
      <Dialog open={showHandleDialog} onOpenChange={setShowHandleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {handleAction === "resolve" ? "Chấp nhận khiếu nại" : "Từ chối khiếu nại"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Phản hồi cho người dùng (tùy chọn)
              </label>
              <Textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Nhập phản hồi cho người dùng..."
                rows={5}
                className="mt-1"
              />
            </div>
            {handleAction === "resolve" && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Khi chấp nhận khiếu nại:
                    </p>
                    <ul className="text-sm text-green-800 mt-1 list-disc list-inside">
                      <li>Tài khoản của người dùng sẽ được mở khóa tự động</li>
                      <li>Email thông báo sẽ được gửi đến người dùng</li>
                      <li>Lịch sử ban sẽ được cập nhật</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {handleAction === "reject" && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      Khi từ chối khiếu nại:
                    </p>
                    <ul className="text-sm text-red-800 mt-1 list-disc list-inside">
                      <li>Tài khoản của người dùng sẽ vẫn bị khóa</li>
                      <li>Email thông báo sẽ được gửi đến người dùng</li>
                      <li>Người dùng có thể gửi khiếu nại mới nếu cần</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHandleDialog(false)}>
              Hủy
            </Button>
            <Button
              variant={handleAction === "resolve" ? "default" : "destructive"}
              className={handleAction === "resolve" ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={handleSubmitAction}
              disabled={isHandling}
            >
              {isHandling ? "Đang xử lý..." : handleAction === "resolve" ? "Chấp nhận" : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

