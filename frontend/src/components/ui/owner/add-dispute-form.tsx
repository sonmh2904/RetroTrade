"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";
import { Button } from "@/components/ui/common/button";
import { toast } from "sonner";
import { AlertCircle, Eye, X, Upload } from "lucide-react";

interface DisputeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  onSubmit: (data: {
    reason: string;
    description: string;
    evidence: File[];
  }) => Promise<void>;
}

const REASON_OPTIONS = [
  "Hàng không đúng mô tả",
  "Hàng bị hư hỏng / mất linh kiện",
  "Không nhận được hàng",
  "Người thuê không trả đúng hạn",
  "Khác (mô tả chi tiết bên dưới)",
] as const;

export default function DisputeModal({
  open,
  onOpenChange,
  orderId,
  onSubmit,
}: DisputeModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const inputId = `evidence-upload-${orderId || "dispute"}`;

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const resetForm = () => {
    setReason("");
    setDescription("");
    setFiles([]);
    setPreviews([]);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;

    const remaining = 5 - files.length;
    const newFiles = Array.from(selected).slice(0, remaining);
    if (!newFiles.length) {
      toast.error("Tối đa 5 ảnh");
      return;
    }

    for (const file of newFiles) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" không phải ảnh`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" quá 10MB`);
        return;
      }
    }

    const newPreviews = newFiles.map(URL.createObjectURL);
    setFiles((f) => [...f, ...newFiles]);
    setPreviews((p) => [...p, ...newPreviews]);
    toast.success(`Đã chọn ${newFiles.length} ảnh`);
  };

  const removeImage = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
    toast.info("Đã xóa ảnh");
  };

  const handleSubmit = async () => {
    if (!reason) return toast.error("Chọn lý do");
    if (!description.trim()) return toast.error("Nhập mô tả");
    if (description.trim().length > 1000)
      return toast.error("Tối đa 1000 ký tự");

    setSubmitting(true);
    try {
      await onSubmit({
        reason,
        description: description.trim(),
        evidence: files,
      });
      toast.success("Gửi Khiếu nạithành công!");
      handleClose(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi hệ thống");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="z-[1000] max-w-lg mx-4 p-0 overflow-hidden rounded-2xl shadow-2xl"
        style={{ maxHeight: "90vh" }}
      >
        <DialogHeader className="p-6 pb-4 bg-red-50 border-b border-red-100">
          <DialogTitle className="text-xl font-bold text-red-700 flex items-center gap-3">
            <AlertCircle className="w-7 h-7" />
            Báo cáo Khiếu nại
          </DialogTitle>
        </DialogHeader>

        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 160px)" }}
        >
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Lý do <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">— Chọn lý do —</option>
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Mô tả chi tiết <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Mô tả rõ vấn đề..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full px-4 py-3 border rounded-xl resize-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-right text-xs text-gray-500 mt-1">
                {description.length}/1000
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Ảnh bằng chứng ({files.length}/5)
              </label>

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id={inputId}
                disabled={files.length >= 5}
              />
              <label
                htmlFor={inputId}
                className="block border-2 border-dashed border-red-300 rounded-2xl p-8 text-center hover:border-red-500 transition cursor-pointer"
              >
                <Upload className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-red-600">
                  Nhấn để tải ảnh lên
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG • Tối đa 10MB/ảnh
                </p>
              </label>

              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {previews.map((src, i) => (
                    <div
                      key={i}
                      className="relative group rounded-xl overflow-hidden border-2 border-gray-200"
                    >
                      <img
                        src={src}
                        alt=""
                        className="w-full h-28 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Eye className="w-8 h-8 text-white" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeImage(i);
                        }}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
            className="flex-1"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting || !reason || !description.trim() || files.length === 0
            }
            className="flex-1 bg-red-600 hover:bg-red-700 font-semibold"
          >
            {submitting ? "Đang gửi..." : "Gửi Khiếu nại"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
