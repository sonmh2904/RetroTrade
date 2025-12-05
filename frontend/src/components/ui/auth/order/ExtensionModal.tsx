"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/common/dialog";
import { Button } from "@/components/ui/common/button";
import {
  Plus,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  Loader2,
  Percent,
  X,
  Package,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  requestExtension,
  type CreateExtensionRequest,
  type ExtensionResponse,
} from "@/services/auth/extension.api";
import {
  payExtensionFee,
  type PayExtensionFeeErrorResponse,
} from "@/services/wallet/wallet.api";

import type { Order } from "@/services/auth/order.api";
import { format, addDays, addHours, addWeeks, addMonths } from "date-fns";
import { vi } from "date-fns/locale";
import {
  type Discount,
  validateDiscount,
  listAvailableDiscounts,
} from "@/services/products/discount/discount.api";
interface ApiErrorResponse {
  message?: string;
  reason?: string;
}

export default function ExtensionModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess?: () => void;
}) {
  const [extensionDuration, setExtensionDuration] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  // Discount state
  const [discountCode, setDiscountCode] = useState("");
  const [publicDiscount, setPublicDiscount] = useState<Discount | null>(null);
  const [privateDiscount, setPrivateDiscount] = useState<Discount | null>(null);
  const [publicDiscountAmount, setPublicDiscountAmount] = useState(0);
  const [privateDiscountAmount, setPrivateDiscountAmount] = useState(0);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [showDiscountList, setShowDiscountList] = useState(false);
  const [discountListError, setDiscountListError] = useState<string | null>(
    null
  );

  const currentEndAt = useMemo(
    () => (order?.endAt ? new Date(order.endAt) : null),
    [order?.endAt]
  );

  const basePrice = useMemo(
    () => order?.itemSnapshot?.basePrice ?? 0,
    [order?.itemSnapshot?.basePrice]
  );

  const rentalUnit = order?.rentalUnit ?? "ngày";
  const priceUnit = (order?.itemSnapshot?.priceUnit ?? "ngày").toLowerCase();

  const priceUnitId = useMemo((): 1 | 2 | 3 | 4 => {
    switch (priceUnit) {
      case "giờ":
        return 1;
      case "tuần":
        return 3;
      case "tháng":
        return 4;
      default:
        return 2;
    }
  }, [priceUnit]);

  const newEndAt = useMemo(() => {
    if (!currentEndAt) return null;
    switch (priceUnitId) {
      case 1:
        return addHours(currentEndAt, extensionDuration);
      case 3:
        return addWeeks(currentEndAt, extensionDuration);
      case 4:
        return addMonths(currentEndAt, extensionDuration);
      default:
        return addDays(currentEndAt, extensionDuration);
    }
  }, [currentEndAt, extensionDuration, priceUnitId]);

  const rentalAmount = basePrice * extensionDuration; // FIX: Chỉ rental, không + service
  const serviceFee = Math.round(rentalAmount * 0.03);
  const subtotal = rentalAmount + serviceFee; // Tổng trước discount

  // Memoize discount calculations - FIX: Base chỉ rentalAmount
  const effectivePublicDiscountAmount = useMemo(
    () => (rentalAmount > 0 ? publicDiscountAmount : 0), // FIX: Base rental
    [rentalAmount, publicDiscountAmount]
  );
  const effectivePrivateDiscountAmount = useMemo(
    () => (rentalAmount > 0 ? privateDiscountAmount : 0), // FIX: Base rental
    [rentalAmount, privateDiscountAmount]
  );
  const totalDiscountAmount = useMemo(
    () => effectivePublicDiscountAmount + effectivePrivateDiscountAmount,
    [effectivePublicDiscountAmount, effectivePrivateDiscountAmount]
  );


  const finalAmount = Math.max(0, subtotal - totalDiscountAmount); // Discount chỉ trừ rental, service giữ nguyên

  // Helper function to calculate discount amount - FIX: Giữ nguyên, nhưng dùng base=rentalAmount
  const calculateDiscountAmount = useCallback(
    (
      type: "percent" | "fixed",
      value: number,
      baseAmount: number,
      maxDiscountAmount?: number
    ): number => {
      let amount = type === "percent" ? (baseAmount * value) / 100 : value;
      if (maxDiscountAmount && maxDiscountAmount > 0) {
        amount = Math.min(amount, maxDiscountAmount);
      }
      amount = Math.max(0, Math.min(baseAmount, Math.floor(amount)));
      return amount;
    },
    []
  );

  // Load available discounts for user - Giữ nguyên
  const loadAvailableDiscounts = useCallback(async () => {
    setLoadingDiscounts(true);
    setDiscountListError(null);
    try {
      const response = await listAvailableDiscounts(1, 50);
      if (response.status === "success" && response.data) {
        // Gộp cả public và special discounts vào một mảng
        const allDiscounts = [
          ...(response.data.public || []),
          ...(response.data.special || []),
        ];
        setAvailableDiscounts(allDiscounts);
      } else {
        setDiscountListError(
          response.message || "Không thể tải danh sách mã giảm giá."
        );
      }
    } catch (error) {
      console.error("Error loading available discounts:", error);
      setDiscountListError(
        "Không thể tải danh sách mã giảm giá. Vui lòng thử lại."
      );
    } finally {
      setLoadingDiscounts(false);
    }
  }, []);

  // Load available discounts on mount - Giữ nguyên
  useEffect(() => {
    if (isOpen) {
      loadAvailableDiscounts();
    }
  }, [isOpen, loadAvailableDiscounts]);

  // Close discount dropdown when clicking outside - Giữ nguyên
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".discount-input-container")) {
        setShowDiscountList(false);
      }
    };
    if (showDiscountList) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDiscountList]);

  // Handle discount code - FIX: baseAmountForDiscount = rentalAmount
  const handleApplyDiscount = async (code?: string) => {
    const codeToApply = code || discountCode.trim();
    if (!codeToApply) {
      setDiscountError("Vui lòng nhập mã giảm giá");
      return;
    }
    setDiscountLoading(true);
    setDiscountError(null);
    try {
      // FIX: Base chỉ rentalAmount (không + serviceFee)
      let baseAmountForDiscount = rentalAmount;
      let isPrivateDiscountWithPublic = false;
      // Validate lần đầu để kiểm tra mã có hợp lệ không
      const response = await validateDiscount({
        code: codeToApply.toUpperCase(),
        baseAmount: baseAmountForDiscount,
      });
      if (response.status === "success" && response.data) {
        const discount = response.data.discount;
        let amount = response.data.amount || 0;
        // Nếu là mã riêng tư và đã có mã công khai, validate trực tiếp với rentalAmount còn lại
        if (!discount.isPublic && publicDiscountAmount > 0) {
          isPrivateDiscountWithPublic = true;
          baseAmountForDiscount = Math.max(
            0,
            rentalAmount - publicDiscountAmount
          ); // FIX: rentalAmount
        }
        // Tính lại discount amount để đảm bảo chính xác
        const calculatedAmount = calculateDiscountAmount(
          discount.type,
          discount.value,
          baseAmountForDiscount,
          discount.maxDiscountAmount
        );
        amount = calculatedAmount;
        // Kiểm tra loại discount (public hay private)
        if (discount.isPublic) {
          // Mã công khai - chỉ cho phép 1 mã công khai
          if (publicDiscount) {
            setDiscountError(
              "Bạn đã áp dụng mã công khai. Chỉ được áp dụng 1 mã công khai."
            );
            setDiscountLoading(false);
            return;
          }
          // Không được có mã công khai nếu đã có mã private có cùng code
          if (privateDiscount && privateDiscount.code === discount.code) {
            setDiscountError("Mã này đã được áp dụng");
            setDiscountLoading(false);
            return;
          }
          setPublicDiscount(discount);
          setPublicDiscountAmount(amount);
          // Nếu đã có mã private, tính lại mã private với baseAmount mới (chỉ trên rentalAmount còn lại)
          if (privateDiscount) {
            const baseAmountAfterPublic = Math.max(0, rentalAmount - amount); // FIX: rentalAmount
            try {
              const revalidatePrivateResponse = await validateDiscount({
                code: privateDiscount.code.toUpperCase(),
                baseAmount: baseAmountAfterPublic,
              });
              if (
                revalidatePrivateResponse.status === "success" &&
                revalidatePrivateResponse.data
              ) {
                setPrivateDiscountAmount(revalidatePrivateResponse.data.amount);
              }
            } catch (e) {
              console.error("Error revalidating private discount:", e);
            }
          }
          toast.success("Áp dụng mã giảm giá công khai thành công!");
        } else {
          // Mã riêng tư - chỉ cho phép 1 mã riêng tư
          if (privateDiscount) {
            setDiscountError(
              "Bạn đã áp dụng mã riêng tư. Chỉ được áp dụng 1 mã riêng tư."
            );
            setDiscountLoading(false);
            return;
          }
          // Không được có mã private nếu đã có mã public có cùng code
          if (publicDiscount && publicDiscount.code === discount.code) {
            setDiscountError("Mã này đã được áp dụng");
            setDiscountLoading(false);
            return;
          }
          // Nếu đã có mã công khai, validate lại với rentalAmount còn lại
          if (isPrivateDiscountWithPublic) {
            try {
              const revalidateResponse = await validateDiscount({
                code: discount.code.toUpperCase(),
                baseAmount: baseAmountForDiscount, // Đã được tính = rentalAmount - publicDiscountAmount
              });
              if (
                revalidateResponse.status === "success" &&
                revalidateResponse.data
              ) {
                // Sử dụng amount từ revalidate (tính trên rentalAmount còn lại)
                amount = revalidateResponse.data.amount;
              } else {
                // Nếu revalidate thất bại, hiển thị lý do cụ thể
                const errorMsg =
                  revalidateResponse.message ||
                  "Mã giảm giá riêng tư không thể áp dụng sau khi trừ mã công khai";
                const reason = (revalidateResponse as { reason?: string })
                  .reason;
                let detailedMessage = errorMsg;
                if (reason === "BELOW_MIN_ORDER") {
                  const discountInfo = availableDiscounts.find(
                    (d) => d.code === discount.code.toUpperCase()
                  );
                  if (discountInfo?.minOrderAmount) {
                    const needed =
                      discountInfo.minOrderAmount - baseAmountForDiscount;
                    detailedMessage = `Phí gia hạn cần thêm ${needed.toLocaleString(
                      "vi-VN"
                    )}₫ để áp dụng mã này sau khi trừ mã công khai (Tối thiểu: ${discountInfo.minOrderAmount.toLocaleString(
                      "vi-VN"
                    )}₫, Phí gia hạn còn lại: ${baseAmountForDiscount.toLocaleString(
                      "vi-VN"
                    )}₫)`;
                  } else {
                    detailedMessage = `Phí gia hạn chưa đạt mức tối thiểu để áp dụng mã này sau khi trừ mã công khai (Phí gia hạn còn lại: ${baseAmountForDiscount.toLocaleString(
                      "vi-VN"
                    )}₫)`;
                  }
                }
                setDiscountError(detailedMessage);
                setDiscountLoading(false);
                return;
              }
            } catch (e) {
              console.error("Error revalidating private discount:", e);
              setDiscountError(
                "Có lỗi xảy ra khi xác thực mã giảm giá riêng tư"
              );
              setDiscountLoading(false);
              return;
            }
          } else {
            // Không có mã công khai, tính lại amount với baseAmount chính xác
            amount = calculateDiscountAmount(
              discount.type,
              discount.value,
              baseAmountForDiscount,
              discount.maxDiscountAmount
            );
          }
          setPrivateDiscount(discount);
          setPrivateDiscountAmount(amount);
          toast.success("Áp dụng mã giảm giá riêng tư thành công!");
        }
        setDiscountCode("");
        setShowDiscountList(false);
      } else {
        // Hiển thị lý do cụ thể từ backend nếu có - FIX: base=rentalAmount cho BELOW_MIN_ORDER
        const errorMessage = response.message || "Mã giảm giá không hợp lệ";
        const reason = (response as { reason?: string }).reason;
        let detailedMessage = errorMessage;
        if (reason) {
          switch (reason) {
            case "INVALID_CODE":
              detailedMessage = "Mã giảm giá không tồn tại";
              break;
            case "NOT_STARTED":
              detailedMessage = "Mã giảm giá chưa đến thời gian sử dụng";
              break;
            case "EXPIRED":
              detailedMessage = "Mã giảm giá đã hết hạn";
              break;
            case "USAGE_LIMIT":
              detailedMessage = "Mã giảm giá đã hết lượt sử dụng";
              break;
            case "BELOW_MIN_ORDER":
              // FIX: minOrderAmount kiểm tra trên rentalAmount
              const baseAmount = rentalAmount;
              // Try to get minOrderAmount from available discounts
              const discountInfo = availableDiscounts.find(
                (d) => d.code === codeToApply.toUpperCase()
              );
              if (discountInfo?.minOrderAmount) {
                const needed = discountInfo.minOrderAmount - baseAmount;
                detailedMessage = `Phí gia hạn cần thêm ${needed.toLocaleString(
                  "vi-VN"
                )}₫ để áp dụng mã này (Tối thiểu: ${discountInfo.minOrderAmount.toLocaleString(
                  "vi-VN"
                )}₫, Hiện tại: ${baseAmount.toLocaleString("vi-VN")}₫)`;
              } else {
                detailedMessage = `Phí gia hạn chưa đạt mức tối thiểu để áp dụng mã này (Hiện tại: ${baseAmount.toLocaleString(
                  "vi-VN"
                )}₫)`;
              }
              break;
            case "NOT_ALLOWED_USER":
              detailedMessage = "Bạn không có quyền sử dụng mã giảm giá này";
              break;
            case "PER_USER_LIMIT":
              detailedMessage = "Bạn đã sử dụng hết số lần cho phép của mã này";
              break;
            case "OWNER_NOT_MATCH":
              detailedMessage =
                "Mã giảm giá này chỉ áp dụng cho sản phẩm của chủ sở hữu cụ thể";
              break;
            case "ITEM_NOT_MATCH":
              detailedMessage =
                "Mã giảm giá này chỉ áp dụng cho sản phẩm cụ thể";
              break;
            case "ASSIGN_NOT_STARTED":
              detailedMessage =
                "Mã giảm giá riêng tư chưa đến thời gian sử dụng";
              break;
            case "ASSIGN_EXPIRED":
              detailedMessage = "Mã giảm giá riêng tư đã hết thời gian sử dụng";
              break;
            default:
              detailedMessage = errorMessage;
          }
        }
        // Log chi tiết để debug
        console.error("Discount validation failed:", {
          code: codeToApply,
          reason,
          message: detailedMessage,
          baseAmount: baseAmountForDiscount,
          response,
        });
        setDiscountError(detailedMessage);
      }
    } catch (error: unknown) {
      console.error("Error applying discount:", error);
      let errorMessage = "Có lỗi xảy ra khi áp dụng mã giảm giá";
      if (error && typeof error === "object") {
        const apiError = error as ApiErrorResponse;
        errorMessage = apiError?.message || errorMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      setDiscountError(errorMessage);
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemovePublicDiscount = () => {
    setPublicDiscount(null);
    setPublicDiscountAmount(0);
    setDiscountError(null);
    toast.info("Đã xóa mã giảm giá công khai");
  };

  const handleRemovePrivateDiscount = () => {
    setPrivateDiscount(null);
    setPrivateDiscountAmount(0);
    setDiscountError(null);
    toast.info("Đã xóa mã giảm giá riêng tư");
  };

  const handleSelectDiscount = (discount: Discount) => {
    setDiscountCode(discount.code);
    handleApplyDiscount(discount.code);
  };

  const handleConfirmAndPay = async () => {
    if (!order?._id || !newEndAt || finalAmount <= 0) return;

    setLoading(true);
    setShowConfirm(false);

    try {
      // 1. Gửi yêu cầu gia hạn với discount codes (không toast ở đây để tránh half-success)
      const payload: CreateExtensionRequest = {
        extensionDuration,
        notes: notes.trim() || undefined,
        publicDiscountCode: publicDiscount?.code || undefined,
        privateDiscountCode: privateDiscount?.code || undefined,
      };

      console.log("[ExtensionModal] Sending payload:", payload); // Log for debug

      const requestResult = await requestExtension(order._id, payload);

      // Type guard chính xác: Extract data from ApiResponse
      if (
        !requestResult ||
        requestResult.code !== 200 ||
        !requestResult.data ||
        typeof requestResult.data !== "object" ||
        !("requestId" in requestResult.data)
      ) {
        throw new Error(
          requestResult?.message || "Không nhận được ID yêu cầu gia hạn"
        );
      }

      const { requestId } = requestResult.data as ExtensionResponse;

      // 2. Thanh toán ngay
      const payResult = await payExtensionFee(requestId);

      // Assume payExtensionFee returns direct {success, message, data} or ApiResponse – adjust if needed
      if (!payResult || !("success" in payResult) || !payResult.success) {
        throw new Error(payResult?.message || "Lỗi thanh toán phí gia hạn");
      }

      // Chỉ toast khi cả hai thành công
      toast.success(
        "Gia hạn và thanh toán thành công! Đơn hàng đã được cập nhật."
      );
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const err = error as {
        message?: string;
        shortage?: number;
        balance?: number;
      } & PayExtensionFeeErrorResponse;

      if (
        typeof err === "object" &&
        err &&
        "shortage" in err &&
        err.shortage !== undefined
      ) {
        toast.error(
          `Ví không đủ tiền! Thiếu ${err.shortage.toLocaleString("vi-VN")}₫ ` +
            `(Số dư: ${err.balance?.toLocaleString("vi-VN") ?? "?"}₫)`
        );
      } else {
        const msg =
          typeof err === "object" && err && "message" in err
            ? err.message
            : "Thao tác thất bại";
        toast.error(msg ?? "Đã có lỗi xảy ra khi gia hạn");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirm = () => {
    if (finalAmount <= 0) {
      toast.error("Số tiền thanh toán phải lớn hơn 0");
      return;
    }
    setShowConfirm(true);
  };

  if (!order || !currentEndAt || !newEndAt || basePrice === 0) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => !loading && onClose()}>
        <DialogContent className="max-w-3xl max-h-[70vh] p-0 overflow-hidden rounded-2xl">
          <div className="flex flex-col md:flex-row h-full">
            {/* Bên trái */}
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              <DialogHeader className="pb-3 border-b sticky top-0 bg-white z-10">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Plus className="w-6 h-6 text-blue-600" />
                  Gia hạn thuê ngay
                </DialogTitle>
              </DialogHeader>

              <div className="bg-blue-50 rounded-xl p-4 text-sm">
                <p className="font-medium">
                  #{order.orderGuid.slice(0, 8).toUpperCase()}
                </p>
                <p className="font-semibold mt-1">
                  {order.itemSnapshot?.title}
                </p>
                <p className="text-gray-600 mt-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Đến: {format(currentEndAt, "dd/MM/yyyy")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Gia hạn thêm
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="number"
                      min="1"
                      value={extensionDuration}
                      onChange={(e) =>
                        setExtensionDuration(
                          Math.max(1, Number(e.target.value) || 1)
                        )
                      }
                      className="w-20 px-3 py-2 text-lg font-bold text-center border rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="font-medium">{rentalUnit}</span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-emerald-700">Kết thúc mới</p>
                  <p className="font-bold text-emerald-600">
                    {format(newEndAt, "dd/MM/yyyy", { locale: vi })}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Lý do gia hạn..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none mt-1 focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Bên phải – Thanh toán */}
            <div className="w-full md:w-80 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white p-5 space-y-4 overflow-y-auto">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Thanh toán ngay
              </h3>

              {/* Input mã giảm giá (di chuyển sang bên phải) */}
              <div className="bg-white/10 rounded-xl p-3">
                <label className="text-xs font-medium flex items-center gap-1.5 mb-1.5 block">
                  <Percent className="w-3 h-3 text-green-200" />
                  Mã giảm giá (Tối đa: 1 công khai + 1 riêng tư)
                </label>
                <div className="space-y-1.5">
                  {publicDiscount && (
                    <div className="flex items-center justify-between p-2 bg-white/20 rounded-md border border-white/30">
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center gap-1 flex-wrap mb-0.5">
                          <CheckCircle2 className="w-3 h-3 text-green-200 flex-shrink-0" />
                          <span className="font-bold text-white truncate">
                            {publicDiscount.code}
                          </span>
                          <span className="text-[8px] bg-blue-500/30 text-white px-1 py-0.5 rounded">
                            Công khai
                          </span>
                          <span
                            className={`text-[8px] font-semibold px-1 py-0.5 rounded ${
                              publicDiscount.type === "percent"
                                ? "bg-orange-500/30 text-orange-100"
                                : "bg-emerald-500/30 text-emerald-100"
                            }`}
                          >
                            {publicDiscount.type === "percent"
                              ? `-${publicDiscount.value}%`
                              : `-${publicDiscount.value.toLocaleString(
                                  "vi-VN"
                                )}₫`}
                          </span>
                        </div>
                        <p className="text-[9px] text-green-200 font-medium">
                          Đã giảm:{" "}
                          <span className="font-bold">
                            {effectivePublicDiscountAmount.toLocaleString(
                              "vi-VN"
                            )}
                            ₫
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={handleRemovePublicDiscount}
                        className="p-0.5 text-white/80 hover:text-red-200 hover:bg-red-500/20 rounded transition-all flex-shrink-0"
                        title="Xóa mã công khai"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {privateDiscount && (
                    <div className="flex items-center justify-between p-2 bg-white/20 rounded-md border border-white/30">
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center gap-1 flex-wrap mb-0.5">
                          <CheckCircle2 className="w-3 h-3 text-green-200 flex-shrink-0" />
                          <span className="font-bold text-white truncate">
                            {privateDiscount.code}
                          </span>
                          <span className="text-[8px] bg-purple-500/30 text-white px-1 py-0.5 rounded">
                            Riêng tư
                          </span>
                          <span
                            className={`text-[8px] font-semibold px-1 py-0.5 rounded ${
                              privateDiscount.type === "percent"
                                ? "bg-orange-500/30 text-orange-100"
                                : "bg-emerald-500/30 text-emerald-100"
                            }`}
                          >
                            {privateDiscount.type === "percent"
                              ? `-${privateDiscount.value}%`
                              : `-${privateDiscount.value.toLocaleString(
                                  "vi-VN"
                                )}₫`}
                          </span>
                        </div>
                        <p className="text-[9px] text-green-200 font-medium">
                          Đã giảm:{" "}
                          <span className="font-bold">
                            {effectivePrivateDiscountAmount.toLocaleString(
                              "vi-VN"
                            )}
                            ₫
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={handleRemovePrivateDiscount}
                        className="p-0.5 text-white/80 hover:text-red-200 hover:bg-red-500/20 rounded transition-all flex-shrink-0"
                        title="Xóa mã riêng tư"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <div
                      className="flex-1 relative discount-input-container min-w-0"
                      style={{ zIndex: showDiscountList ? 100 : 1 }}
                    >
                      <input
                        type="text"
                        placeholder={
                          publicDiscount && !privateDiscount
                            ? "Nhập mã riêng tư"
                            : !publicDiscount && privateDiscount
                            ? "Nhập mã công khai"
                            : "Nhập mã giảm giá"
                        }
                        value={discountCode}
                        onChange={(e) => {
                          setDiscountCode(e.target.value.toUpperCase());
                          setDiscountError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyDiscount();
                          }
                        }}
                        onFocus={() => setShowDiscountList(true)}
                        className="w-full px-2 py-1.5 text-[10px] bg-white/10 border border-white/30 rounded-md focus:ring-1 focus:ring-green-200 focus:border-green-200 text-white placeholder:text-white/70"
                        disabled={loading || discountLoading}
                      />
                      {showDiscountList && (
                        <div className="absolute top-full left-0 right-0 z-[10000] w-full mt-1 bg-white/95 rounded-lg shadow-2xl border border-emerald-200 max-h-64 overflow-y-auto">
                          <div className="sticky top-0 bg-emerald-50 p-1.5 border-b border-emerald-200">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-emerald-700">
                                Mã giảm giá có sẵn
                              </p>
                              <span className="text-[8px] text-emerald-600 bg-emerald-100 px-1.5 py-0.25 rounded-full">
                                {availableDiscounts.length} mã
                              </span>
                            </div>
                          </div>
                          {loadingDiscounts ? (
                            <div className="p-3 text-center">
                              <div className="inline-block w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-1"></div>
                              <p className="text-[9px] text-gray-500">
                                Đang tải mã giảm giá...
                              </p>
                            </div>
                          ) : availableDiscounts.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                              {availableDiscounts.map((discount) => {
                                const now = new Date();
                                const start = discount.startAt
                                  ? new Date(discount.startAt)
                                  : now;
                                const end = discount.endAt
                                  ? new Date(discount.endAt)
                                  : now;
                                const isInTimeWindow =
                                  start <= now && end >= now;
                                const isUpcoming = start > now;
                                const isExpired = end < now;
                                const isAlreadyApplied = Boolean(
                                  (publicDiscount &&
                                    publicDiscount.code === discount.code) ||
                                    (privateDiscount &&
                                      privateDiscount.code === discount.code)
                                );
                                const canUse =
                                  discount.active &&
                                  isInTimeWindow &&
                                  !isAlreadyApplied;
                                return (
                                  <button
                                    key={discount._id}
                                    onClick={() =>
                                      canUse && handleSelectDiscount(discount)
                                    }
                                    disabled={!canUse}
                                    className={`w-full p-2.5 text-left transition-all text-[10px] ${
                                      !canUse
                                        ? "bg-gray-50 opacity-60 cursor-not-allowed"
                                        : "hover:bg-emerald-50 hover:shadow-sm"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1.5">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 flex-wrap mb-1">
                                          <span
                                            className={`font-bold ${
                                              !canUse
                                                ? "text-gray-500"
                                                : "text-emerald-600"
                                            }`}
                                          >
                                            {discount.code}
                                          </span>
                                          <span
                                            className={`text-[8px] font-semibold px-1.5 py-0.25 rounded ${
                                              discount.type === "percent"
                                                ? "bg-orange-100 text-orange-700"
                                                : "bg-blue-100 text-blue-700"
                                            }`}
                                          >
                                            {discount.type === "percent"
                                              ? `-${discount.value}%`
                                              : `-${discount.value.toLocaleString(
                                                  "vi-VN"
                                                )}₫`}
                                          </span>
                                          {discount.isPublic ? (
                                            <span className="text-[8px] bg-blue-100 text-blue-700 px-1 py-0.25 rounded font-medium">
                                              Công khai
                                            </span>
                                          ) : (
                                            <span className="text-[8px] bg-purple-100 text-purple-700 px-1 py-0.25 rounded font-medium">
                                              Riêng tư
                                            </span>
                                          )}
                                          {discount.isSpecial && (
                                            <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1 py-0.25 rounded font-medium">
                                              Đặc biệt
                                            </span>
                                          )}
                                          {isUpcoming && (
                                            <span className="text-[8px] bg-blue-100 text-blue-700 px-1 py-0.25 rounded font-medium">
                                              Sắp tới
                                            </span>
                                          )}
                                          {isExpired && (
                                            <span className="text-[8px] bg-gray-100 text-gray-700 px-1 py-0.25 rounded font-medium">
                                              Đã hết hạn
                                            </span>
                                          )}
                                          {!discount.active && (
                                            <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.25 rounded font-medium">
                                              Đã tắt
                                            </span>
                                          )}
                                          {isAlreadyApplied && (
                                            <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.25 rounded font-medium">
                                              Đã áp dụng
                                            </span>
                                          )}
                                        </div>
                                        {discount.minOrderAmount && (
                                          <p className="text-[8px] text-gray-600 mt-0.5">
                                            <span className="font-medium">
                                              Phí tối thiểu:
                                            </span>{" "}
                                            {discount.minOrderAmount.toLocaleString(
                                              "vi-VN"
                                            )}
                                            ₫
                                          </p>
                                        )}
                                        {discount.maxDiscountAmount &&
                                          discount.maxDiscountAmount > 0 && (
                                            <p className="text-[8px] text-gray-600">
                                              <span className="font-medium">
                                                Giảm tối đa:
                                              </span>{" "}
                                              {discount.maxDiscountAmount.toLocaleString(
                                                "vi-VN"
                                              )}
                                              ₫
                                            </p>
                                          )}
                                        {canUse &&
                                          (() => {
                                            // FIX: Preview trên rentalAmount
                                            let baseAmount = rentalAmount;
                                            if (
                                              !discount.isPublic &&
                                              publicDiscountAmount > 0
                                            ) {
                                              baseAmount = Math.max(
                                                0,
                                                rentalAmount -
                                                  publicDiscountAmount
                                              );
                                            }
                                            const previewAmount =
                                              calculateDiscountAmount(
                                                discount.type,
                                                discount.value,
                                                baseAmount,
                                                discount.maxDiscountAmount
                                              );
                                            return (
                                              <p className="text-[8px] text-emerald-600 font-bold mt-1">
                                                Sẽ giảm:{" "}
                                                <span className="text-emerald-700">
                                                  {previewAmount.toLocaleString(
                                                    "vi-VN"
                                                  )}
                                                  ₫
                                                </span>
                                              </p>
                                            );
                                          })()}
                                      </div>
                                      {canUse && (
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-3 text-center">
                              <div className="text-gray-300 mb-1">
                                <Package className="w-6 h-6 mx-auto opacity-50" />
                              </div>
                              <p className="text-[9px] text-gray-400 font-medium">
                                Hiện chưa có mã giảm giá khả dụng
                              </p>
                              <p className="text-[8px] text-gray-500 mt-0.5">
                                Vui lòng thử lại sau
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleApplyDiscount()}
                      disabled={discountLoading || !discountCode.trim()}
                      className="px-2 py-1.5 bg-white/20 text-white rounded-md hover:bg-white/30 transition-colors text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {discountLoading ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Áp dụng"
                      )}
                    </button>
                  </div>
                  {availableDiscounts.length > 0 && (
                    <button
                      onClick={() => setShowDiscountList((prev) => !prev)}
                      className="text-[9px] text-green-200 hover:text-green-100 transition-colors underline mt-1 block"
                    >
                      {showDiscountList ? "Ẩn" : "Xem"} mã giảm giá có sẵn (
                      {availableDiscounts.length})
                    </button>
                  )}
                  {discountError && (
                    <p className="text-[9px] text-red-200 mt-1">
                      {discountError}
                    </p>
                  )}
                  {discountListError && (
                    <p className="text-[9px] text-red-200 mt-1">
                      {discountListError}
                    </p>
                  )}
                  {!loadingDiscounts &&
                    availableDiscounts.length === 0 &&
                    !discountListError && (
                      <p className="text-[9px] text-green-200 mt-1">
                        Hiện chưa có mã giảm giá khả dụng.
                      </p>
                    )}
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Tiền thuê thêm</span>
                  <span>{rentalAmount.toLocaleString("vi-VN")}₫</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí dịch vụ (3%)</span>
                  <span>{serviceFee.toLocaleString("vi-VN")}₫</span>
                </div>
                {totalDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-300">
                    <span>Giảm giá</span>
                    <span>-{totalDiscountAmount.toLocaleString("vi-VN")}₫</span>
                  </div>
                )}
                <div className="border-t border-white/30 pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold">Tổng cộng</span>
                    <span className="text-xl font-bold text-yellow-300">
                      {finalAmount.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleOpenConfirm}
                disabled={loading || finalAmount <= 0}
                className="w-full h-14 text-base font-bold bg-white text-emerald-700 hover:bg-gray-100 rounded-xl flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    Thanh toán & Gia hạn ngay
                  </>
                )}
              </Button>

              <p className="text-[10px] text-center opacity-80">
                Tiền được giữ an toàn đến khi hoàn tất
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Xác nhận Thanh toán */}
      <Dialog
        open={showConfirm}
        onOpenChange={(open) => !loading && setShowConfirm(open)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-center">
              Xác nhận gia hạn & thanh toán
            </DialogTitle>
            <DialogDescription className="text-center space-y-2">
              <p>
                Bạn sẽ gia hạn thêm {extensionDuration} {rentalUnit} cho sản
                phẩm:
              </p>
              <p className="font-semibold text-sm">
                `{order.itemSnapshot?.title}`
              </p>
              <p className="text-sm">
                Kết thúc mới: {format(newEndAt, "dd/MM/yyyy", { locale: vi })}
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>Tổng thanh toán:</span>
                  <span className="text-emerald-600 font-bold">
                    {finalAmount.toLocaleString("vi-VN")}₫
                  </span>
                </div>
              </div>
              {notes.trim() && (
                <p className="text-xs text-gray-600 italic mt-2">
                  Ghi chú: {notes}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                <AlertCircle className="w-4 h-4 inline mr-1 text-yellow-500" />
                Tiền sẽ được khấu trừ từ ví, và yêu cầu sẽ được gửi đến chủ sản
                phẩm.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="flex-1"
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleConfirmAndPay}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý
                </>
              ) : (
                "Xác nhận & Thanh toán"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
