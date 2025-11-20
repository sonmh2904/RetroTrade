
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/common/button";
import { Card } from "@/components/ui/common/card";
import { Input } from "@/components/ui/common/input";
import { Label } from "@/components/ui/common/label";
import { Textarea } from "@/components/ui/common/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/common/select";
import { Loader2, Gavel, AlertCircle } from "lucide-react";
import { resolveDispute } from "@/services/moderator/disputeOrder.api";
import axios from "axios";

const DECISIONS = [
  {
    value: "refund_full",
    label: "Hoàn tiền toàn bộ",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    value: "refund_partial",
    label: "Hoàn tiền một phần",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    value: "reject",
    label: "Từ chối tranh chấp",
    color: "text-gray-600",
    bg: "bg-gray-100",
  },
  {
    value: "keep_for_seller",
    label: "Giữ tiền cho người bán",
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

interface DisputeResolutionFormProps {
  disputeId: string;
  totalAmount: number;
  reporterName?: string;
  reportedUserName?: string;
  onSuccess?: () => void;
}

export default function DisputeResolutionForm({
  disputeId,
  totalAmount,
  reporterName = "Người tạo tranh chấp",
  reportedUserName = "Người bị báo cáo",
  onSuccess,
}: DisputeResolutionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<string>("");
  const [refundPercentage, setRefundPercentage] = useState<string>("");
  const [refundTo, setRefundTo] = useState<"reporter" | "reportedUser" | "">("");
  const [notes, setNotes] = useState<string>("");

  // Tính toán số tiền hoàn từ phần trăm
  const calculatedRefundAmount = refundPercentage
    ? Math.round((totalAmount * Number(refundPercentage)) / 100)
    : 0;

const handleSubmit = async () => {
  if (!decision) return toast.error("Vui lòng chọn quyết định xử lý");
  
  if (["refund_full", "refund_partial"].includes(decision)) {
    if (!refundPercentage || Number(refundPercentage) <= 0 || Number(refundPercentage) > 100) {
      return toast.error("Vui lòng nhập phần trăm hoàn tiền hợp lệ (0-100%)");
    }
    if (!refundTo) {
      return toast.error("Vui lòng chọn người nhận hoàn tiền");
    }
  }

  setLoading(true);
  try {
    const payload: any = {
      decision,
      notes: notes.trim() || undefined,
    };

    if (["refund_full", "refund_partial"].includes(decision)) {
      if (decision === "refund_full") {
        payload.refundPercentage = 100;
      } else {
        payload.refundPercentage = Number(refundPercentage);
      }
      payload.refundTo = refundTo;
    }

    await resolveDispute(disputeId, payload);

    toast.success("Xử lý tranh chấp thành công!");
    onSuccess?.();
    router.push("/moderator/dispute");
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || error.message || "Xử lý thất bại"
    );
  } finally {
    setLoading(false);
  }
};

  const selectedDecision = DECISIONS.find((d) => d.value === decision);

  return (
    <Card className="border-2 border-orange-200 shadow-2xl bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-orange-200 flex items-center justify-center shadow-lg">
            <Gavel className="w-9 h-9 text-orange-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-orange-800">
              Xử lý tranh chấp
            </h2>
            <p className="text-orange-600">Hãy đưa ra quyết định công bằng</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-lg font-semibold">Quyết định xử lý</Label>
            <Select
              value={decision}
              onValueChange={setDecision}
              disabled={loading}
            >
              <SelectTrigger className="mt-2 h-14 text-lg">
                <SelectValue placeholder="Chọn quyết định..." />
              </SelectTrigger>
              <SelectContent>
                {DECISIONS.map((d) => (
                  <SelectItem
                    key={d.value}
                    value={d.value}
                    className="text-lg py-3"
                  >
                    <span className={d.color}>●</span> {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {["refund_full", "refund_partial"].includes(decision) && (
            <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-orange-300 space-y-4">
              <div>
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Phần trăm hoàn tiền (%)
                </Label>
                <Input
                  type="number"
                  value={refundPercentage}
                  onChange={(e) => setRefundPercentage(e.target.value)}
                  placeholder={decision === "refund_full" ? "100" : "Nhập phần trăm (0-100)..."}
                  className="mt-2 text-2xl font-bold"
                  disabled={decision === "refund_full" || loading}
                  min="0"
                  max="100"
                  step="0.1"
                />
                {refundPercentage && Number(refundPercentage) > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Số tiền hoàn:{" "}
                    <span className="font-bold text-orange-600">
                      {calculatedRefundAmount.toLocaleString("vi-VN")}₫
                    </span>
                    {" "}({Number(refundPercentage)}% của {totalAmount.toLocaleString("vi-VN")}₫)
                  </p>
                )}
                {decision === "refund_full" && (
                  <p className="text-sm text-gray-500 mt-1">
                    → Tự động hoàn 100% ({totalAmount.toLocaleString("vi-VN")}₫)
                  </p>
                )}
              </div>

              <div>
                <Label className="text-lg font-semibold">Hoàn tiền cho ai?</Label>
                <Select
                  value={refundTo}
                  onValueChange={(value) => setRefundTo(value as "reporter" | "reportedUser")}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-2 h-14 text-lg">
                    <SelectValue placeholder="Chọn người nhận hoàn tiền..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reporter" className="text-lg py-3">
                      <span className="text-blue-600">●</span> {reporterName} (Người tạo tranh chấp)
                    </SelectItem>
                    <SelectItem value="reportedUser" className="text-lg py-3">
                      <span className="text-red-600">●</span> {reportedUserName} (Người bị báo cáo)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label className="text-lg font-semibold">
              Ghi chú nội bộ (tùy chọn)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi rõ lý do xử lý, bằng chứng bổ sung..."
              className="mt-2 min-h-32"
              disabled={loading}
            />
          </div>

          <div className="flex gap-4 pt-6">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => router.push("/moderator/dispute")}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-lg shadow-lg"
              onClick={handleSubmit}
              disabled={loading || !decision}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Gavel className="mr-2 h-5 w-5" />
                  Xử lý tranh chấp
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
