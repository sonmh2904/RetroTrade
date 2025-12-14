"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { ArrowLeft, CheckCircle, XCircle, Clock, User, Mail, MessageSquare, Calendar, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Badge } from "@/components/ui/common/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/common/avatar";
import { ownerRequestApi, OwnerRequest } from "@/services/auth/ownerRequest.api";
import { toast } from "sonner";

export default function OwnerRequestDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const [request, setRequest] = useState<OwnerRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      router.push("/auth/login");
      return;
    }

    if (id) {
      fetchRequest();
    }
  }, [id, accessToken, router]);

  const fetchRequest = async () => {
    if (!id || typeof id !== "string") return;

    try {
      setLoading(true);
      const data = await ownerRequestApi.getOwnerRequestById(id);
      setRequest(data);
    } catch (error) {
      console.error("Error fetching request:", error);
      toast.error("Không thể tải thông tin yêu cầu");
      router.push("/auth/profile?menu=ownership");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Chờ duyệt
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Đã duyệt
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Đã từ chối
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            Đã hủy
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy yêu cầu</h2>
            <p className="text-gray-600 mb-4">Yêu cầu này không tồn tại hoặc bạn không có quyền xem.</p>
            <Button onClick={() => router.push("/auth/profile?menu=ownership")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button
          onClick={() => router.push("/auth/profile?menu=ownership")}
          variant="ghost"
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900">Chi tiết yêu cầu cấp quyền chủ sở hữu</CardTitle>
              {getStatusBadge(request.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Thông tin yêu cầu */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin yêu cầu</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Lý do</p>
                    <p className="text-gray-900">{request.reason}</p>
                  </div>
                </div>
                {request.additionalInfo && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Thông tin bổ sung</p>
                      <p className="text-gray-900">{request.additionalInfo}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Ngày gửi</p>
                    <p className="text-gray-900">{formatDate(request.CreatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Thông tin thanh toán */}
            {request.serviceFeeAmount && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin thanh toán</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Phí nâng cấp</p>
                      <p className="text-gray-900 font-semibold">
                        {request.serviceFeeAmount.toLocaleString("vi-VN")} VND
                      </p>
                    </div>
                  </div>
                  {request.serviceFeePaidAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Ngày thanh toán</p>
                        <p className="text-gray-900">{formatDate(request.serviceFeePaidAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Kết quả xử lý */}
            {request.status !== "pending" && request.status !== "cancelled" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kết quả xử lý</h3>
                <div className="space-y-3">
                  {request.reviewedBy && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Người xử lý</p>
                        <p className="text-gray-900">{request.reviewedBy.fullName || request.reviewedBy.email}</p>
                      </div>
                    </div>
                  )}
                  {request.reviewedAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Ngày xử lý</p>
                        <p className="text-gray-900">{formatDate(request.reviewedAt)}</p>
                      </div>
                    </div>
                  )}
                  {request.rejectionReason && (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Lý do từ chối</p>
                        <p className="text-red-600">{request.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                  {request.notes && (
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Ghi chú</p>
                        <p className="text-gray-900">{request.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Thông báo hoàn tiền nếu bị từ chối */}
            {request.status === "rejected" && request.serviceFeeAmount && request.serviceFeeAmount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 mb-1">Đã hoàn tiền</p>
                    <p className="text-sm text-green-700">
                      Phí nâng cấp {request.serviceFeeAmount.toLocaleString("vi-VN")} VND đã được hoàn về ví RetroTrade của bạn.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

