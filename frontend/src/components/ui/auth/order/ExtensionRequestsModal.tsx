"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";
import { Button } from "@/components/ui/common/button";
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  // MessageSquare,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getExtensionRequests,
  type ExtensionRequest,
} from "@/services/auth/extension.api";

interface ExtensionRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderTitle?: string;
}

export default function ExtensionRequestsModal({
  isOpen,
  onClose,
  orderId,
  orderTitle = "Sản phẩm",
}: ExtensionRequestsModalProps) {
  const [loading, setLoading] = useState(true);
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);

  const fetchExtensions = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await getExtensionRequests(orderId);
      if (res.code === 200 && Array.isArray(res.data)) {
        setExtensions(res.data);
      } else {
        toast.error("Không thể tải thông tin yêu cầu gia hạn");
        setExtensions([]);
      }
    } catch (err) {
      console.error("Error fetching extensions:", err);
      toast.error("Lỗi khi tải thông tin gia hạn");
      setExtensions([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen) {
      fetchExtensions();
    } else {
      setExtensions([]);
    }
  }, [isOpen, fetchExtensions]);

  const formatDateTime = (date: string) =>
    format(new Date(date), "dd/MM/yyyy HH:mm");

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount == null || isNaN(Number(amount))) return "0 VNĐ";
    return Number(amount).toLocaleString("vi-VN") + " VNĐ";
  };

  const getStatusBadge = (status: ExtensionRequest["status"]) => {
    switch (status) {
      case "pending":
        return (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Chờ phê duyệt
          </div>
        );
      case "approved":
        return (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Đã phê duyệt
          </div>
        );
      case "rejected":
        return (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Bị từ chối
          </div>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="
          max-w-3xl
          w-[95vw]       
          max-h-[75vh]      
          my-8
          translate-y-0
          top-1/2
          -translate-y-1/2
          overflow-y-auto
          rounded-xl
          shadow-2xl
        "
      >
        <DialogHeader className="pb-3 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Clock className="w-7 h-7 text-indigo-600" />
            Chi tiết yêu cầu gia hạn - {orderTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
              <span className="text-gray-600">Đang tải thông tin...</span>
            </div>
          ) : extensions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">
                Chưa có yêu cầu gia hạn nào cho đơn hàng này
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {extensions.map((ext) => (
                <div
                  key={ext._id}
                  className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-all"
                >
                  {/* Header yêu cầu */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-indigo-600" />
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {formatDateTime(ext.createdAt).split(" ")[0]}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">
                          Yêu cầu gia hạn
                        </h4>
                        <p className="text-sm text-gray-600">
                          Bởi: {ext.requestedBy?.fullName || "Người thuê"}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(ext.status)}
                  </div>

                  {/* Thông tin chính */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <div className="flex items-center gap-2 text-gray-700 font-medium mb-1">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        Thời gian gia hạn
                      </div>
                      <p className="font-semibold text-gray-900">
                        {ext.extensionDuration} {ext.extensionUnit}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Đến ngày: {formatDateTime(ext.requestedEndAt)}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-gray-700 font-medium mb-1">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        Phí gia hạn
                      </div>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(ext.extensionFee)}
                      </p>
                      {ext.originalExtensionFee != null &&
                        ext.originalExtensionFee !== ext.extensionFee && (
                          <p className="text-sm text-gray-500 line-through">
                            {formatCurrency(ext.originalExtensionFee)}
                          </p>
                        )}
                      {ext.discount?.totalAmountApplied != null &&
                        ext.discount.totalAmountApplied > 0 && (
                          <p className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full inline-block mt-2 font-medium">
                            − Giảm{" "}
                            {formatCurrency(ext.discount.totalAmountApplied)}
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Ghi chú */}
                  {/* {ext.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-gray-700 text-sm font-medium mb-2">
                        <MessageSquare className="w-4 h-4" />
                        Ghi chú từ người thuê
                      </div>
                      <p className="text-sm bg-gray-50 p-4 rounded-lg text-gray-700 leading-relaxed">
                        {ext.notes}
                      </p>
                    </div>
                  )} */}

                  {/* Lý do từ chối */}
                  {ext.status === "rejected" && ext.rejectedReason && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                        <XCircle className="w-5 h-5" />
                        Lý do từ chối
                      </div>
                      <p className="text-sm text-red-800">
                        {ext.rejectedReason}
                      </p>
                    </div>
                  )}

                  {/* Người duyệt */}
                  {ext.status === "approved" && ext.approvedBy && (
                    <p className="text-xs text-gray-500 text-right mt-4">
                      ✓ Đã duyệt bởi{" "}
                      <span className="font-medium">
                        {ext.approvedBy.fullName}
                      </span>{" "}
                      - {formatDateTime(ext.updatedAt)}
                    </p>
                  )}

                  <div className="text-xs text-gray-400 text-right mt-3">
                    Tạo lúc {formatDateTime(ext.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-200 pt-4">
          <Button variant="outline" onClick={onClose} size="lg">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
