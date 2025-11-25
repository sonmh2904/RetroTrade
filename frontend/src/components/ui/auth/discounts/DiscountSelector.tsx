'use client';

import { useEffect, useMemo, useState } from "react";
import { listAvailableDiscounts, type Discount, validateDiscount } from "@/services/products/discount/discount.api";
import { Button } from "@/components/ui/common/button";
import { Badge } from "@/components/ui/common/badge";
import { Card, CardContent } from "@/components/ui/common/card";
import { AlertCircle, CheckCircle2, Loader2, Percent, Tag, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type AppliedDiscount = {
  discount: Discount;
  amount: number;
};

type DiscountSelectorProps = {
  rentalTotal: number;
  selectedDiscount: AppliedDiscount | null;
  onSelect: (discount: AppliedDiscount | null) => void;
};

export function DiscountSelector({ rentalTotal, selectedDiscount, onSelect }: DiscountSelectorProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    const loadDiscounts = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await listAvailableDiscounts(1, 50);
        if (res.status === "success" && res.data) {
          // Kết hợp public và special discounts
          const allDiscounts = [...(res.data.public || []), ...(res.data.special || [])];
          setDiscounts(allDiscounts);
        } else {
          setError(res.message || "Không thể tải danh sách mã giảm giá");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Không thể tải danh sách mã giảm giá";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    loadDiscounts();
  }, []);

  const now = useMemo(() => new Date(), []);

  const categorizedDiscounts = useMemo(() => {
    const active: Discount[] = [];
    const ineligible: Discount[] = [];

    discounts.forEach((discount) => {
      // Backend đã filter thời gian, discount này đang trong thời gian hiệu lực
      // Chỉ cần kiểm tra minOrderAmount
      const meetsMinOrder =
        discount?.minOrderAmount === undefined || rentalTotal >= discount.minOrderAmount;

      if (meetsMinOrder) {
        active.push(discount);
      } else {
        ineligible.push(discount);
      }
    });

    return { active, ineligible };
  }, [discounts, rentalTotal]);

  const handleApply = async (discount: Discount) => {
    try {
      setApplyingId(discount._id);
      const res = await validateDiscount({
        code: discount.code,
        baseAmount: rentalTotal,
        ownerId: discount.ownerId,
        itemId: discount.itemId,
      });

      if (res.status === "success" && res.data) {
        const amount = res.data.amount;
        onSelect({ discount, amount });
        toast.success(`Đã áp dụng mã ${discount.code}`);
      } else {
        toast.error(res.message || "Không thể áp dụng mã giảm giá");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể áp dụng mã giảm giá";
      toast.error(message);
    } finally {
      setApplyingId(null);
    }
  };

  const handleRemove = () => {
    onSelect(null);
    toast.info("Đã bỏ áp dụng mã giảm giá");
  };

  const renderDiscountCard = (discount: Discount, disabled: boolean) => {
    const start = new Date(discount.startAt);
    const end = new Date(discount.endAt);
    const diffDays = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isExpiringSoon = diffDays > 0 && diffDays <= 7;

    return (
      <Card
        key={discount._id}
        className={cn(
          "border-2 transition-all duration-200",
          disabled
            ? "border-gray-200 bg-gray-50 opacity-70"
            : "border-emerald-200 hover:border-emerald-400 hover:shadow-md"
        )}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-emerald-500" />
                <span className="text-lg font-semibold text-gray-900">{discount.code}</span>
                {isExpiringSoon && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                    Sắp hết hạn
                  </Badge>
                )}
                {discount.isSpecial ? (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                    Đặc biệt
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    Công khai
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {discount.type === "percent" ? (
                  <>
                    Giảm <span className="font-semibold text-emerald-600">{discount.value}%</span>
                    {discount.maxDiscountAmount && (
                      <>
                        {" "}
                        (tối đa{" "}
                        <span className="font-semibold">
                          {discount.maxDiscountAmount.toLocaleString("vi-VN")}₫
                        </span>
                        )
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Giảm ngay{" "}
                    <span className="font-semibold text-emerald-600">
                      {discount.value.toLocaleString("vi-VN")}₫
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Percent className="w-3.5 h-3.5" />
                <span>
                  Hiệu lực: {start.toLocaleDateString("vi-VN")} - {end.toLocaleDateString("vi-VN")}
                </span>
              </div>
              {discount.minOrderAmount && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>
                    Đơn tối thiểu:{" "}
                    <strong>{discount.minOrderAmount.toLocaleString("vi-VN")}₫</strong>
                  </span>
                </div>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "flex-shrink-0",
                discount.type === "percent"
                  ? "border-orange-200 text-orange-700 bg-orange-50"
                  : "border-blue-200 text-blue-700 bg-blue-50"
              )}
            >
              {discount.type === "percent" ? "Phần trăm" : "Cố định"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleApply(discount)}
              disabled={disabled || applyingId === discount._id}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {applyingId === discount._id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang áp dụng
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Áp dụng
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 border border-red-200 rounded-xl bg-red-50 text-sm text-red-700">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedDiscount && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">
                    Đã áp dụng mã {selectedDiscount.discount.code}
                  </span>
                </div>
                <p className="text-sm text-emerald-700 mt-1">
                  Giảm{" "}
                  <strong>{selectedDiscount.amount.toLocaleString("vi-VN")}₫</strong> cho đơn hàng của bạn.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemove} className="text-emerald-700">
                Bỏ chọn
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {categorizedDiscounts.active.length === 0 && categorizedDiscounts.ineligible.length === 0 ? (
        <div className="p-4 border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50">
          Hiện bạn chưa có mã giảm giá khả dụng. Hãy kiểm tra lại sau nhé!
        </div>
      ) : (
        <>
          {categorizedDiscounts.active.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Mã giảm giá khả dụng
                </h3>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  {categorizedDiscounts.active.length}
                </Badge>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {categorizedDiscounts.active.map((discount) => renderDiscountCard(discount, false))}
              </div>
            </div>
          )}

          {categorizedDiscounts.ineligible.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <AlertCircle className="w-3.5 h-3.5" />
                Mã chưa đáp ứng điều kiện
              </div>
              <div className="space-y-3">
                {categorizedDiscounts.ineligible.slice(0, 3).map((discount) => renderDiscountCard(discount, true))}
                {categorizedDiscounts.ineligible.length > 3 && (
                  <p className="text-xs text-gray-500 italic">
                    Còn {categorizedDiscounts.ineligible.length - 3} mã khác chưa đáp ứng điều kiện đơn tối thiểu.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

