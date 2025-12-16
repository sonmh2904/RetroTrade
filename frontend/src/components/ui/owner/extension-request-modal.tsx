import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  X,
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
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!extension) return null;

  const orderId = extension.orderId._id;
  const orderGuid = extension.orderGuid || "UNKNOWN";

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(orderId, extension._id);
      toast.success("Phê duyệt gia hạn thành công!");
      onOpenChange(false);
    } catch {
      toast.error("Lỗi khi phê duyệt yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    setLoading(true);
    try {
      await onReject(orderId, extension._id, rejectReason);
      toast.success("Đã từ chối yêu cầu gia hạn");
      setIsRejectModalOpen(false);
      onOpenChange(false);
    } catch {
      toast.error("Lỗi khi từ chối yêu cầu");
    } finally {
      setLoading(false);
      setRejectReason("");
    }
  };

  return (
    <>
      {/* Main Modal - Xem chi tiết yêu cầu gia hạn */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[80vh] my-8 translate-y-0 top-1/2 -translate-y-1/2 overflow-y-auto rounded-xl shadow-2xl">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-600" />
                Yêu cầu gia hạn
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="text-sm px-3 py-1 bg-gray-100 text-gray-700">
                #{orderGuid.slice(0, 8).toUpperCase()}
              </Badge>
              <span className="text-gray-500 text-sm">
                • Đơn hàng đang thuê
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
            {/* Thông tin gia hạn */}
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

            {/* Phí & Thanh toán */}
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
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-700">
                          ĐÃ THANH TOÁN
                        </p>
                        <p className="text-sm text-gray-600">
                          Người thuê đã thanh toán phí
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-50 rounded-full">
                        <AlertCircle className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-yellow-700">
                          CHƯA THANH TOÁN
                        </p>
                        <p className="text-sm text-gray-600">
                          Đang chờ thanh toán
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ghi chú */}
            {extension.notes && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-sm font-medium text-blue-800 flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" />
                  Ghi chú từ người thuê
                </Label>
                <p className="text-gray-700 italic text-sm leading-relaxed">
                  {extension.notes}
                </p>
              </div>
            )}

            {/* Nút hành động */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="lg"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Đóng
              </Button>

              <Button
                variant="destructive"
                size="lg"
                onClick={() => setIsRejectModalOpen(true)}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-2" />
                Từ chối yêu cầu
              </Button>

              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-medium"
                onClick={handleApprove}
                disabled={loading || extension.paymentStatus !== "paid"}
              >
                {loading ? (
                  "Đang xử lý..."
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Phê duyệt gia hạn
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal con: Nhập lý do từ chối */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Từ chối yêu cầu gia hạn
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Hành động này sẽ thông báo cho người thuê biết yêu cầu gia hạn bị
              từ chối. Vui lòng cung cấp lý do rõ ràng để tránh tranh chấp.
            </p>

            <div>
              <Label htmlFor="reject-reason" className="text-base font-medium">
                Lý do từ chối <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Không thể gia hạn do sản phẩm đã có lịch thuê mới..."
                className="mt-2 min-h-32 resize-none"
                autoFocus
              />
              {rejectReason.trim() === "" && (
                <p className="text-xs text-red-500 mt-1">
                  Lý do không được để trống
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectReason("");
              }}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={loading || !rejectReason.trim()}
            >
              {loading ? "Đang gửi..." : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
