"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/common/button";
import { Card } from "@/components/ui/common/card";
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
    label: "Từ chối Khiếu nại",
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

const REFUND_TARGETS = [
  {
    value: "reporter",
    label: "Hoàn cho người khiếu nại",
  },
  {
    value: "reported",
    label: "Hoàn cho người bị khiếu nại",
  },
];

const REFUND_PERCENTAGES = [10, 25, 50, 100];

type RefundTargetOption = "reporter" | "reported";

interface DisputeResolutionFormProps {
  disputeId: string;
  depositAmount: number; // Chỉ tính hoàn tiền từ tiền cọc
  reporterName?: string; // Tên người khiếu nại
  reportedName?: string; // Tên người bị khiếu nại
  onSuccess?: () => void;
}

export default function DisputeResolutionForm({
  disputeId,
  depositAmount, // Chỉ tính hoàn tiền từ tiền cọc
  reporterName,
  reportedName,
  onSuccess,
}: DisputeResolutionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [refundTarget, setRefundTarget] = useState<RefundTargetOption | "">("");
  const [refundPercentage, setRefundPercentage] = useState<string>("");

  const requiresRefund = ["refund_full", "refund_partial"].includes(decision);
  // Tính hoàn tiền chỉ dựa trên tiền cọc, không động vào tổng tiền
  const calculatedRefund =
    refundPercentage && requiresRefund
      ? Math.round((depositAmount * Number(refundPercentage)) / 100)
      : 0;

  const handleRefundTargetChange = (value: string) => {
    setRefundTarget(value as RefundTargetOption);
  };

  useEffect(() => {
    if (!requiresRefund) {
      setRefundTarget("");
      setRefundPercentage("");
      return;
    }

    if (!refundTarget) {
      setRefundTarget("reporter");
    }
  }, [requiresRefund, refundTarget]);

  useEffect(() => {
    if (decision === "refund_full" && refundPercentage !== "100") {
      setRefundPercentage("100");
    } else if (decision !== "refund_full" && refundPercentage === "100") {
      setRefundPercentage("");
    }
  }, [decision, refundPercentage]);

  const handleSubmit = async () => {
    if (!decision) return toast.error("Vui lòng chọn quyết định xử lý");
    if (requiresRefund && (!refundTarget || !refundPercentage)) {
      return toast.error("Vui lòng chọn người nhận và phần trăm hoàn tiền");
    }

    setLoading(true);
    try {
      await resolveDispute(disputeId, {
        decision,
        notes: notes.trim() || undefined,
        refundTarget: requiresRefund
          ? (refundTarget as RefundTargetOption)
          : undefined,
        refundPercentage: requiresRefund ? Number(refundPercentage) : undefined,
      });

      toast.success("Xử lý Khiếu nạithành công!");
      onSuccess?.();
      router.push("/moderator/dispute");
    } catch (error) {
      const apiMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(
        apiMessage ||
          (error instanceof Error ? error.message : "Xử lý thất bại")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-orange-200 shadow-2xl bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-orange-200 flex items-center justify-center shadow-lg">
            <Gavel className="w-9 h-9 text-orange-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-orange-800">
              Xử lý Khiếu nại
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

          {requiresRefund && (
            <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-orange-300 space-y-4">
              <div>
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Hoàn tiền cho
                </Label>
                <Select
                  value={refundTarget || undefined}
                  onValueChange={handleRefundTargetChange}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-2 h-14 text-lg">
                    <SelectValue placeholder="Chọn người nhận..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REFUND_TARGETS.map((option) => {
                      const userName =
                        option.value === "reporter"
                          ? reporterName
                          : reportedName;
                      return (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-lg py-3"
                        >
                          {option.label}
                          {userName ? ` - ${userName}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Phần trăm hoàn
                </Label>
                <Select
                  value={refundPercentage || undefined}
                  onValueChange={setRefundPercentage}
                  disabled={decision === "refund_full" || loading}
                >
                  <SelectTrigger className="mt-2 h-14 text-lg">
                    <SelectValue placeholder="Chọn phần trăm..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REFUND_PERCENTAGES.map((percent) => (
                      <SelectItem
                        key={percent}
                        value={percent.toString()}
                        className="text-lg py-3"
                      >
                        {percent}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 mt-2">
                  Các mức hỗ trợ: 10%, 25%, 50%, 100%
                  {decision === "refund_full" && " → Tự động hoàn 100%"}
                </p>
              </div>

              <div className="mt-4 bg-orange-50 rounded-2xl p-4 border border-orange-200">
                <p className="text-sm text-gray-600 mb-1">
                  Số tiền dự kiến hoàn trả (từ tiền cọc)
                </p>
                <p className="text-3xl font-bold text-orange-600 mb-2">
                  {calculatedRefund
                    ? `${calculatedRefund.toLocaleString()}₫`
                    : "0₫"}
                </p>
                {refundTarget && (
                  <p className="text-sm text-orange-700">
                    Sẽ hoàn cho:{" "}
                    <span className="font-semibold">
                      {refundTarget === "reporter"
                        ? reporterName || "Người khiếu nại"
                        : reportedName || "Người bị khiếu nại"}
                    </span>
                  </p>
                )}
                <p className="text-xs text-orange-600 mt-1">
                  Tiền cọc: {depositAmount.toLocaleString("vi-VN")}₫
                </p>
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
              disabled={
                loading ||
                !decision ||
                (requiresRefund && (!refundTarget || !refundPercentage))
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Gavel className="mr-2 h-5 w-5" />
                  Xử lý Khiếu nại
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
