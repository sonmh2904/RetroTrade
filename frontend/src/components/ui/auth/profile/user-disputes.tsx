"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Badge } from "@/components/ui/common/badge";
import { Button } from "@/components/ui/common/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/common/dialog";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  FileText,
} from "lucide-react";
import { getMyDisputes, getDisputeById, type Dispute } from "@/services/moderator/disputeOrder.api";

export function UserDisputes() {
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailDisputeData, setDetailDisputeData] = useState<Dispute | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyDisputes();
      if (response.code === 200) {
        // Backend returns { total, data } format
        const disputesData = response.data;
        const disputesList = Array.isArray(disputesData) 
          ? disputesData 
          : (disputesData?.data || []);
        setDisputes(disputesList);
      } else {
        setError(response.message || "Không thể tải danh sách khiếu nại");
        toast.error(response.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Error fetching disputes:", err);
      setError("Không thể kết nối đến server");
      toast.error("Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDetailDialog(true);
    setDetailDisputeData(null);
    setLoadingDetail(true);
    try {
      const response = await getDisputeById(dispute._id);
      if (response.code === 200 && response.data) {
        setDetailDisputeData(response.data);
      }
    } catch (err) {
      console.error("Error fetching dispute details:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Chờ xử lý</Badge>;
      case "In Progress":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Đang xử lý</Badge>;
      case "Resolved":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Đã xử lý</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Đã từ chối</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 mb-4">{error}</p>
          <Button onClick={fetchDisputes} variant="outline" className="text-gray-900">
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Khiếu nại của tôi</h3>
          <Button onClick={fetchDisputes} variant="ghost" size="sm" className="text-gray-900">
            Làm mới
          </Button>
        </div>

        {disputes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Bạn chưa có khiếu nại nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((dispute) => {
              const orderGuid = typeof dispute.orderId === "object" ? dispute.orderId?.orderGuid : "N/A";
              const isReporter = typeof dispute.reporterId === "object" && dispute.reporterId?._id;

              return (
                <div
                  key={dispute._id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">Đơn hàng #{orderGuid}</h4>
                        {getStatusBadge(dispute.status)}
                      </div>
                      <p className="text-gray-600 mb-2">
                        <strong>Lý do:</strong> {dispute.reason}
                      </p>
                      {dispute.description && (
                        <p className="text-gray-500 text-sm mb-2 line-clamp-2">{dispute.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(dispute.createdAt).toLocaleString("vi-VN")}</span>
                        </div>
                        {dispute.resolution && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Đã có quyết định</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(dispute)}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                        Xem chi tiết
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle>Chi tiết khiếu nại</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-lg">Đang tải thông tin...</p>
              </div>
            </div>
          ) : (selectedDispute || detailDisputeData) ? (
            <div className="space-y-4">
              {(() => {
                const dispute = detailDisputeData || selectedDispute;
                if (!dispute) return null;
                return (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Đơn hàng</label>
                      <p className="text-gray-900">
                        #{typeof dispute.orderId === "object" ? dispute.orderId?.orderGuid : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Lý do</label>
                      <p className="text-gray-900">{dispute.reason}</p>
                    </div>
                    {dispute.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Mô tả</label>
                        <p className="text-gray-900 whitespace-pre-wrap">{dispute.description}</p>
                      </div>
                    )}
                    {(dispute.evidenceUrls && dispute.evidenceUrls.length > 0) || 
                     (dispute.evidence && dispute.evidence.length > 0) ? (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Bằng chứng</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && 
                            dispute.evidenceUrls.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block border border-gray-200 rounded p-2 hover:border-indigo-500 transition-colors"
                              >
                                <img
                                  src={url}
                                  alt={`Bằng chứng ${index + 1}`}
                                  className="w-full h-32 object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/file.svg";
                                  }}
                                />
                              </a>
                            ))
                          }
                          {dispute.evidence && dispute.evidence.length > 0 && 
                            dispute.evidence.map((url, index) => (
                              <a
                                key={`evidence-${index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block border border-gray-200 rounded p-2 hover:border-indigo-500 transition-colors"
                              >
                                <img
                                  src={url}
                                  alt={`Bằng chứng ${index + 1}`}
                                  className="w-full h-32 object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/file.svg";
                                  }}
                                />
                              </a>
                            ))
                          }
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                      <div className="mt-1">{getStatusBadge(dispute.status)}</div>
                    </div>
                    {dispute.assignedBy && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Người xử lý</label>
                        <p className="text-gray-900">
                          {typeof dispute.assignedBy === "object"
                            ? dispute.assignedBy.fullName || dispute.assignedBy.email
                            : "Đã được nhận"}
                        </p>
                      </div>
                    )}
                    {dispute.resolution && (
                      <div className="border-t pt-4">
                        <label className="text-sm font-medium text-gray-700">Quyết định</label>
                        <p className="text-gray-900">{dispute.resolution.decision}</p>
                        {dispute.resolution.notes && (
                          <>
                            <label className="text-sm font-medium text-gray-700 mt-2 block">Ghi chú</label>
                            <p className="text-gray-900">{dispute.resolution.notes}</p>
                          </>
                        )}
                        {dispute.resolution.refundAmount > 0 && (
                          <>
                            <label className="text-sm font-medium text-gray-700 mt-2 block">Số tiền hoàn</label>
                            <p className="text-gray-900">
                              {dispute.resolution.refundAmount.toLocaleString("vi-VN")} VNĐ
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : null}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDetailDialog(false);
                setDetailDisputeData(null);
              }}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

