"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";
import { Button } from "@/components/ui/common/button";
import { Badge } from "@/components/ui/common/badge";
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getExtensionRequests,
  type ExtensionRequest,
} from "@/services/auth/extension.api";

interface ExtensionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderTitle: string;
}

export default function ExtensionHistoryModal({
  isOpen,
  onClose,
  orderId,
  orderTitle,
}: ExtensionHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await getExtensionRequests(orderId);
        if (res.code === 200 && Array.isArray(res.data)) {
          const processed = res.data.filter(
            (ext) => ext.status === "approved" || ext.status === "rejected"
          );
          setExtensions(processed);
        } else {
          setExtensions([]);
        }
      } catch (err) {
        console.error("Lỗi tải lịch sử gia hạn:", err);
        toast.error("Không thể tải lịch sử gia hạn");
        setExtensions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, orderId]);

  const formatDateTime = (date: string) =>
    format(new Date(date), "dd/MM/yyyy HH:mm", { locale: vi });

  const formatCurrency = (amount: number | null | undefined): string =>
    amount != null ? `${Number(amount).toLocaleString("vi-VN")} VNĐ` : "0 VNĐ";

  const getUnitLabel = (unit: string): string => {
    const map: Record<string, string> = {
      giờ: "giờ",
      ngày: "ngày",
      tuần: "tuần",
      tháng: "tháng",
    };
    return map[unit.toLowerCase()] || unit;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[75vh] my-8 translate-y-0 top-1/2 -translate-y-1/2 overflow-y-auto rounded-xl shadow-2xl">
        <DialogHeader className="pb-3 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <Clock className="w-7 h-7 text-purple-600" />
            Lịch sử gia hạn - {orderTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-3" />
              <span className="text-gray-600">Đang tải lịch sử...</span>
            </div>
          ) : extensions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Chưa có lịch sử gia hạn nào</p>
            </div>
          ) : (
            <div className="space-y-5">
              {extensions.map((ext) => {
                const isApproved = ext.status === "approved";

                return (
                  <div
                    key={ext._id}
                    className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-purple-600" />
                          </div>
                          <span className="text-xs text-gray-500 mt-1 block">
                            {formatDateTime(ext.createdAt).split(" ")[0]}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">
                            {isApproved
                              ? "Gia hạn đã duyệt"
                              : "Gia hạn bị từ chối"}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Bởi: {ext.requestedBy?.fullName || "Người thuê"}
                          </p>
                        </div>
                      </div>

                      {/* THAY ĐỔI DUY NHẤT TẠI ĐÂY – LOẠI BỎ HÀM getStatusBadge */}
                      {isApproved ? (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1 font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Đã duyệt
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 flex items-center gap-1 font-medium">
                          <XCircle className="w-4 h-4" />
                          Đã từ chối
                        </Badge>
                      )}
                    </div>

                    {/* Phần còn lại giữ nguyên 100% */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div>
                        <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          Thời gian thuê ban đầu
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border">
                          <p className="text-xs text-gray-600">Từ</p>
                          <p className="font-medium">
                            {formatDateTime(ext.orderId.startAt)}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">
                            Đến
                          </p>
                          <p className="font-medium text-red-600">
                            {formatDateTime(ext.originalEndAt)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          {isApproved
                            ? "Thời gian thuê mới"
                            : "Thời gian yêu cầu"}
                        </div>
                        <div
                          className={`rounded-lg p-3 border-2 border-dashed ${
                            isApproved
                              ? "border-green-500 bg-green-50"
                              : "border-blue-500 bg-blue-50"
                          }`}
                        >
                          <p className="font-bold text-lg">
                            +{ext.extensionDuration}{" "}
                            {getUnitLabel(ext.extensionUnit)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Kết thúc mới
                          </p>
                          <p className="font-semibold text-lg">
                            {formatDateTime(ext.requestedEndAt)}
                            {isApproved && " ✓"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium">Phí gia hạn:</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(ext.extensionFee)}
                      </p>
                    </div>

                    {ext.originalExtensionFee != null &&
                      ext.originalExtensionFee > ext.extensionFee && (
                        <p className="text-sm text-gray-500 text-right -mt-2">
                          <del>{formatCurrency(ext.originalExtensionFee)}</del>
                        </p>
                      )}

                    {ext.discount?.totalAmountApplied ? (
                      <p className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full inline-block mt-2">
                        − Giảm {formatCurrency(ext.discount.totalAmountApplied)}
                      </p>
                    ) : null}

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

                    {isApproved && ext.approvedBy && (
                      <p className="text-xs text-gray-500 text-right mt-4">
                        ✓ Đã duyệt bởi {ext.approvedBy.fullName} -{" "}
                        {formatDateTime(ext.updatedAt)}
                      </p>
                    )}

                    <div className="text-xs text-gray-400 text-right mt-3">
                      Tạo lúc {formatDateTime(ext.createdAt)}
                    </div>
                  </div>
                );
              })}
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
