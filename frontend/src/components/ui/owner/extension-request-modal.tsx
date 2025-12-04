import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/common/dialog";
import { Button } from "@/components/ui/common/button";
import { Badge } from "@/components/ui/common/badge";
import { Label } from "@/components/ui/common/label";
import { Textarea } from "@/components/ui/common/textarea";
import { format } from "date-fns";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import type { ExtensionRequest } from "@/services/auth/extension.api";

interface ExtensionWithOrderInfo extends ExtensionRequest {
  orderGuid?: string;
}

interface ExtensionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extension: ExtensionWithOrderInfo | null;
  onApprove: (orderId: string, extensionId: string) => Promise<void>;
  onReject: (
    orderId: string,
    extensionId: string,
    rejectReason: string
  ) => Promise<void>;
}

export default function ExtensionRequestModal({
  open,
  onOpenChange,
  extension,
  onApprove,
  onReject,
}: ExtensionRequestModalProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!extension) return null;

  const orderId = extension.orderId as unknown as string;
  const orderGuid = extension.orderGuid || "UNKNOWN";

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(orderId, extension._id);
      toast.success("Phê duyệt gia hạn thành công!");
      onOpenChange(false);
    } catch {
      toast.error("Lỗi khi phê duyệt");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      return toast.error("Vui lòng nhập lý do từ chối");
    }
    setLoading(true);
    try {
      await onReject(orderId, extension._id, rejectReason);
      toast.success("Đã từ chối yêu cầu gia hạn");
      onOpenChange(false);
    } catch {
      toast.error("Lỗi khi từ chối");
    } finally {
      setLoading(false);
      setRejectMode(false);
      setRejectReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-lg shadow-lg border border-gray-200">
        {/* Simple Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold flex items-center gap-3">
              <Clock className="w-6 h-6 text-gray-600" />
              Yêu cầu gia hạn hợp đồng
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <Badge className="text-sm px-3 py-1 bg-gray-100 text-gray-700">
              #{orderGuid.slice(0, 8).toUpperCase()}
            </Badge>
            <span className="text-gray-500 text-sm">• Đơn hàng đang thuê</span>
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          <div className="space-y-6 mb-6">
            {/* Row 1: Thời gian gia hạn and Ngày kết thúc mới */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <Label className="text-sm text-gray-600">
                    Thời gian gia hạn
                  </Label>
                  <p className="text-lg font-semibold text-gray-900">
                    +{extension.extensionDuration} {extension.extensionUnit}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <Label className="text-sm text-gray-600">
                    Ngày kết thúc mới
                  </Label>
                  <p className="text-lg font-medium text-gray-900">
                    {format(
                      new Date(extension.requestedEndAt),
                      "dd 'tháng' MM, yyyy"
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Row 2: Phí gia hạn and Trạng thái thanh toán */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                <div className="p-2 bg-green-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <Label className="text-sm text-gray-600">Phí gia hạn</Label>
                  <p className="text-xl font-semibold text-green-700">
                    {extension.extensionFee.toLocaleString("vi-VN")} ₫
                  </p>
                  {extension.originalExtensionFee &&
                    extension.originalExtensionFee > extension.extensionFee && (
                      <p className="text-sm text-green-600 font-medium mt-1">
                        Đã giảm{" "}
                        {(
                          extension.originalExtensionFee -
                          extension.extensionFee
                        ).toLocaleString("vi-VN")}{" "}
                        ₫
                      </p>
                    )}
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <Label className="text-sm text-gray-600 flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4" />
                  Trạng thái thanh toán
                </Label>
                <div className="flex items-center gap-3">
                  {extension.paymentStatus === "paid" ? (
                    <>
                      <div className="p-2 bg-green-50 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-green-700">
                          ĐÃ THANH TOÁN
                        </p>
                        <p className="text-sm text-gray-600">
                          Người thuê đã thanh toán phí gia hạn
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-yellow-50 rounded-full">
                        <AlertCircle className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-yellow-700">
                          CHƯA THANH TOÁN
                        </p>
                        <p className="text-sm text-gray-600">
                          Đang chờ người thuê thanh toán
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {extension.notes && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-sm font-medium text-blue-800 flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" />
                  Ghi chú từ người thuê
                </Label>
                <p className="text-gray-700 leading-relaxed italic text-sm">
                  {extension.notes}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!rejectMode ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                variant="outline"
                size="lg"
                className="rounded-lg border-gray-300"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Đóng
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                onClick={() => setRejectMode(true)}
                disabled={loading}
              >
                Từ chối yêu cầu
              </Button>
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
                onClick={handleApprove}
                disabled={loading || extension.paymentStatus !== "paid"}
              >
                {loading ? (
                  <>Đang xử lý...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                    Phê duyệt gia hạn
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 bg-red-50 p-5 rounded-lg border border-red-200">
              <div className="flex items-start gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-base">
                    Bạn có chắc chắn muốn từ chối?
                  </h4>
                  <p className="text-sm text-red-600 mt-1">
                    Hành động này sẽ thông báo cho người thuê và không thể hoàn
                    tác.
                  </p>
                </div>
              </div>

              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Vui lòng nhập lý do từ chối (bắt buộc)..."
                className="min-h-24 text-sm rounded-lg border-2 border-red-200 focus:border-red-400"
                autoFocus
              />

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-lg"
                  onClick={() => {
                    setRejectMode(false);
                    setRejectReason("");
                  }}
                  disabled={loading}
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
                  onClick={handleConfirmReject}
                  disabled={loading || !rejectReason.trim()}
                >
                  {loading ? "Đang gửi..." : "Xác nhận từ chối"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
