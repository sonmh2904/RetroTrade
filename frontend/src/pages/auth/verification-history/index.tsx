"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/common/card";
import { Badge } from "@/components/ui/common/badge";
import { Button } from "@/components/ui/common/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/common/dialog";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  User,
  FileText,
  AlertCircle,
  ArrowLeft,
  Eye,
  Image as ImageIcon,
} from "lucide-react";
import { verificationRequestAPI, type VerificationRequest } from "@/services/auth/verificationRequest.api";
import Image from "next/image";

export default function VerificationHistoryPage() {
  const router = useRouter();
  const { accessToken } = useSelector((state: RootState) => state.auth);

  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!accessToken) {
      router.push("/auth/login");
    }
  }, [accessToken, router]);

  useEffect(() => {
    if (accessToken) {
      fetchRequests();
    }
  }, [statusFilter, accessToken]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await verificationRequestAPI.getMyVerificationRequests({
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (response.code === 200) {
        setRequests(response.data || []);
      } else {
        setError(response.message || "Không thể tải lịch sử xác minh");
        toast.error(response.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Error fetching verification requests:", err);
      setError("Không thể kết nối đến server");
      toast.error("Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Đã duyệt
          </Badge>
        );
      case "Rejected":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Bị từ chối
          </Badge>
        );
      case "In Progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="w-3 h-3 mr-1" />
            Đang xử lý
          </Badge>
        );
      case "Pending":
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Chờ xử lý
          </Badge>
        );
    }
  };

  const handleViewDetail = async (request: VerificationRequest) => {
    try {
      const response = await verificationRequestAPI.getMyVerificationRequestById(request._id);
      if (response.code === 200 && response.data) {
        setSelectedRequest(response.data);
        setDetailDialog(true);
      } else {
        toast.error(response.message || "Không thể tải chi tiết yêu cầu");
      }
    } catch (err) {
      console.error("Error fetching request detail:", err);
      toast.error("Không thể tải chi tiết yêu cầu");
    }
  };

  if (!accessToken) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lịch sử xác minh</h1>
              <p className="text-gray-600">Xem lịch sử và trạng thái các yêu cầu xác minh của bạn</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            size="sm"
          >
            Tất cả
          </Button>
          <Button
            variant={statusFilter === "Pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("Pending")}
            size="sm"
          >
            <Clock className="w-4 h-4 mr-1" />
            Chờ xử lý
          </Button>
          <Button
            variant={statusFilter === "In Progress" ? "default" : "outline"}
            onClick={() => setStatusFilter("In Progress")}
            size="sm"
          >
            <Clock className="w-4 h-4 mr-1" />
            Đang xử lý
          </Button>
          <Button
            variant={statusFilter === "Approved" ? "default" : "outline"}
            onClick={() => setStatusFilter("Approved")}
            size="sm"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Đã duyệt
          </Button>
          <Button
            variant={statusFilter === "Rejected" ? "default" : "outline"}
            onClick={() => setStatusFilter("Rejected")}
            size="sm"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Bị từ chối
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && requests.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có yêu cầu xác minh</h3>
              <p className="text-gray-600 mb-4">Bạn chưa gửi yêu cầu xác minh nào.</p>
              <Button onClick={() => router.push("/auth/profile?menu=security")}>
                Gửi yêu cầu xác minh
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Requests List */}
        {!loading && !error && requests.length > 0 && (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusBadge(request.status)}
                        <span className="text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>

                      {/* ID Card Info */}
                      {request.idCardInfo && (
                        <div className="mb-3 space-y-1 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {request.idCardInfo.idNumber && (
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-indigo-600" />
                              <span><strong>Số CCCD:</strong> {request.idCardInfo.idNumber}</span>
                            </div>
                          )}
                          {request.idCardInfo.fullName && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-indigo-600" />
                              <span><strong>Họ tên:</strong> {request.idCardInfo.fullName}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rejection Reason - Highlighted */}
                      {request.status === "Rejected" && request.rejectionReason && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-red-900 mb-1">Lý do từ chối:</h4>
                              <p className="text-red-800 text-sm">{request.rejectionReason}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Moderator Notes */}
                      {request.moderatorNotes && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-blue-900 mb-1">Ghi chú từ moderator:</h4>
                              <p className="text-blue-800 text-sm">{request.moderatorNotes}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Handled Info */}
                      {request.handledAt && (
                        <div className="text-xs text-gray-500">
                          {request.status === "Approved" ? "Đã duyệt" : request.status === "Rejected" ? "Đã từ chối" : "Đã xử lý"} lúc:{" "}
                          {new Date(request.handledAt).toLocaleString("vi-VN")}
                          {request.handledBy && ` bởi ${request.handledBy.fullName || request.handledBy.email}`}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetail(request)}
                      className="ml-4"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Xem chi tiết
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {selectedRequest && (
        <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Chi tiết yêu cầu xác minh
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Status */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Trạng thái</h3>
                {getStatusBadge(selectedRequest.status)}
              </div>

              {/* ID Card Info */}
              {selectedRequest.idCardInfo ? (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    Thông tin căn cước công dân
                  </h3>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-indigo-800 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Thông tin này đã được hệ thống OCR tự động và được bạn xác nhận trước khi gửi yêu cầu.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Số căn cước công dân</label>
                      <p className="text-gray-900 font-semibold">{selectedRequest.idCardInfo.idNumber || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Họ và tên</label>
                      <p className="text-gray-900 font-semibold">{selectedRequest.idCardInfo.fullName || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ngày tháng năm sinh</label>
                      <p className="text-gray-900 font-semibold">
                        {selectedRequest.idCardInfo.dateOfBirth
                          ? new Date(selectedRequest.idCardInfo.dateOfBirth).toLocaleDateString("vi-VN")
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Địa chỉ thường trú</label>
                      <p className="text-gray-900 font-semibold">{selectedRequest.idCardInfo.address || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Thông tin căn cước công dân</h3>
                  <p className="text-gray-600">Không có thông tin</p>
                </div>
              )}

              {/* Documents */}
              {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Tài liệu đã upload
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRequest.documents.map((doc, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          {doc.documentType === "idCardFront"
                            ? "Mặt trước CCCD"
                            : doc.documentType === "idCardBack"
                            ? "Mặt sau CCCD"
                            : "Tài liệu"}
                        </p>
                        <div className="relative w-full h-48 rounded overflow-hidden">
                          <Image
                            src={doc.fileUrl}
                            alt={doc.documentType}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/file.svg";
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Reason - Highlighted */}
              {selectedRequest.status === "Rejected" && selectedRequest.rejectionReason && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-bold text-red-900 mb-2 text-lg">Lý do từ chối xác minh</h4>
                      <p className="text-red-800 whitespace-pre-wrap">{selectedRequest.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Moderator Notes */}
              {selectedRequest.moderatorNotes && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-1">Ghi chú từ moderator</h4>
                      <p className="text-blue-800 text-sm whitespace-pre-wrap">{selectedRequest.moderatorNotes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Thông tin yêu cầu</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Ngày gửi:</span>{" "}
                    {new Date(selectedRequest.createdAt).toLocaleString("vi-VN")}
                  </div>
                  {selectedRequest.handledAt && (
                    <div>
                      <span className="font-medium text-gray-700">Ngày xử lý:</span>{" "}
                      {new Date(selectedRequest.handledAt).toLocaleString("vi-VN")}
                    </div>
                  )}
                  {selectedRequest.handledBy && (
                    <div>
                      <span className="font-medium text-gray-700">Người xử lý:</span>{" "}
                      {selectedRequest.handledBy.fullName || selectedRequest.handledBy.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

