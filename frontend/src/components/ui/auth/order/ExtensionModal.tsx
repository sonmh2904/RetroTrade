"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";
import { Button } from "@/components/ui/common/button";
import { Plus, Loader2} from "lucide-react";
import { toast } from "sonner";
import {
  requestExtension,
  type CreateExtensionRequest,
} from "@/services/auth/extension.api";
import type { Order } from "@/services/auth/order.api";
import { format } from "date-fns";

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess?: () => void;
}

export default function ExtensionModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: ExtensionModalProps) {
  const [extensionDuration, setExtensionDuration] = useState<number>(1);
  const [extensionNotes, setExtensionNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!order) {
      toast.error("Không tìm thấy đơn hàng");
      return;
    }
    if (extensionDuration < 1) {
      toast.error("Số lượng gia hạn phải lớn hơn 0");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateExtensionRequest = {
        extensionDuration,
        notes: extensionNotes.trim() || undefined,
      };

      const res = await requestExtension(order._id, payload);

      if (res.code === 200) {
        toast.success(
          "Yêu cầu gia hạn đã gửi thành công! Chủ hàng sẽ xem xét."
        );
        onSuccess?.(); 
        resetForm();
        onClose();
      } else {
        toast.error(res.message || "Gửi yêu cầu gia hạn thất bại");
      }
    } catch (error: unknown) {
      toast.error("Có lỗi xảy ra khi gửi yêu cầu");
      console.error("Extension request error:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setExtensionDuration(1);
    setExtensionNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setExtensionDuration(isNaN(value) ? 1 : Math.max(1, value));
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setExtensionNotes(e.target.value);
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Plus className="w-5 h-5 text-blue-600" />
            Yêu cầu gia hạn thuê
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Thông tin đơn hàng */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-semibold text-blue-800 text-sm">
              Đơn hàng: #{order.orderGuid.slice(0, 8)}
            </p>
            <p className="text-xs text-blue-700">
              Sản phẩm: {order.itemSnapshot?.title}
            </p>
            <p className="text-xs text-gray-600">
              Kết thúc hiện tại: {format(new Date(order.endAt), "dd/MM/yyyy")}
            </p>
          </div>

          {/* Số lượng gia hạn */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Số lượng gia hạn <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={extensionDuration}
              onChange={handleDurationChange}
              placeholder="Ví dụ: 1 (thêm 1 ngày)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Đơn vị: {order.rentalUnit || "ngày"}
            </p>
          </div>

          {/* Lý do gia hạn */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Lý do gia hạn (tùy chọn)
            </label>
            <textarea
              value={extensionNotes}
              onChange={handleNotesChange}
              placeholder="Ví dụ: Cần sử dụng thêm 2 ngày nữa..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={loading}
            />
          </div>

          <p className="text-xs text-gray-500 italic">
            Lưu ý: Phí gia hạn sẽ được tính dựa trên thời gian thêm và gửi cho
            bạn sau khi chủ hàng phê duyệt.
          </p>
        </div>
        <DialogFooter className="mt-6 flex gap-3">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSubmit}
            disabled={loading || !extensionDuration || extensionDuration < 1}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Gửi yêu cầu
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
