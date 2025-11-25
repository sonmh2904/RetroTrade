"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  getOrderDetails,

} from "@/services/auth/order.api";
import { format } from "date-fns";
import {
  Package,
  Truck,
  MapPin,
  CreditCard,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Share2,
  Eye,
  User,
  Mail,
  Store,
  ArrowLeft,
} from "lucide-react";
import type { Order } from "@/services/auth/order.api";
import Image from "next/image";
import Link from "next/link";
import { payOrderWithWallet, getMyWallet } from "@/services/wallet/wallet.api"; // Đảm bảo import đúng
import { toast } from "sonner";

interface TimelineStep {
  status: string;
  label: string;
  date?: string;
  active: boolean;
  current: boolean;
  cancelled?: boolean;
}

const getUnitName = (priceUnit: string | undefined): string => {
  if (!priceUnit) return "đơn vị";
  const map: Record<string, string> = {
    "1": "giờ",
    "2": "ngày",
    "3": "tuần",
    "4": "tháng",
  };
  return map[priceUnit] || "đơn vị";
};

// Helper function to extract error message from unknown error
const getErrorMessage = (error: unknown): string => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Đã xảy ra lỗi";
};



const getOrderStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    progress: "Đang thuê",
    returned: "Đã trả hàng",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
    disputed: "Tranh chấp",
  };
  return statusMap[status.toLowerCase()] || status;
};

const getPaymentStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "Chờ thanh toán",
    not_paid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
    partial: "Thanh toán một phần",
  };
  return statusMap[status.toLowerCase()] || status;
};

export default function OrderDetail({ id: propId }: { id?: string }) {
  const router = useRouter();
  const { id: routeId, orderId: queryOrderId } = router.query as {
    id?: string;
    orderId?: string;
  };
  const id = propId || queryOrderId || routeId;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pendingAction] = useState<() => Promise<void>>(
    () => async () => {}
  );
  const [isPaying, setIsPaying] = useState(false); //Thanh toan
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  // Thêm vào phần state
  const [confirmPayModal, setConfirmPayModal] = useState<{
    isOpen: boolean;
    requiredAmount: number;
  }>({
    isOpen: false,
    requiredAmount: 0,
  });

  const [insufficientModal, setInsufficientModal] = useState<{
    isOpen: boolean;
    requiredAmount: number;
    shortage: number;
  }>({
    isOpen: false,
    requiredAmount: 0,
    shortage: 0,
  });
  useEffect(() => {
    async function fetchOrder() {
      if (id) {
        await loadOrder();
      }
    }
    fetchOrder();
  }, [id]);

  // Load ví
  useEffect(() => {
    const loadWallet = async () => {
      try {
        const res = await getMyWallet();
        setWalletBalance(res.balance ?? 0);
      } catch (err) {
        console.error("Lỗi load ví:", err);
        setWalletBalance(0);
      } finally {
        setLoadingBalance(false);
      }
    };
    loadWallet();
  }, []);

  // Hàm thanh toán ví - giờ đã an toàn 100%
const handlePayWithWallet = async () => {
  if (isPaying || loadingBalance || !order) return;

  const requiredAmount =
    (order.finalAmount ?? 0) +
    (order.depositAmount ?? 0) +
    (order.serviceFee ?? 0);
  const shortage = requiredAmount - walletBalance;

  // Thiếu tiền → hiện modal đẹp
  if (walletBalance < requiredAmount) {
    setInsufficientModal({
      isOpen: true,
      requiredAmount,
      shortage,
    });
    return;
  }

  // Đủ tiền → hiện modal xác nhận
  setConfirmPayModal({
    isOpen: true,
    requiredAmount,
  });
};

  // Hàm thực hiện thanh toán (gọi khi người dùng bấm "Xác nhận" trong modal)
const executeWalletPayment = async () => {
  if (isPaying || !order) return;

  setIsPaying(true);
  setConfirmPayModal((prev) => ({ ...prev, isOpen: false }));

  try {
    await payOrderWithWallet(order._id);
    toast.success("Thanh toán thành công bằng ví!");
    await loadOrder();

    const updated = await getMyWallet();
    setWalletBalance(updated.balance ?? 0);
  } catch (error: unknown) {
    const msg = getErrorMessage(error) || "Thanh toán thất bại";
    toast.error(msg);

    if (
      msg.toLowerCase().includes("không đủ") ||
      msg.toLowerCase().includes("insufficient")
    ) {
      const required =
        (order.finalAmount ?? 0) +
        (order.depositAmount ?? 0) +
        (order.serviceFee ?? 0);
      setInsufficientModal({
        isOpen: true,
        requiredAmount: required,
        shortage: required - walletBalance,
      });
    }
  } finally {
    setIsPaying(false);
  }
};

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await getOrderDetails(id as string);
      if (res.data) {
        setOrder(res.data);
      }
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async () => {
    setActionLoading(true);
    try {
      await pendingAction();
      await loadOrder();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Thao tác thất bại");
    } finally {
      setShowConfirm(false);
      setActionLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải chi tiết đơn hàng...</p>
        </div>
      </div>
    );
  }

  const timelineSteps: TimelineStep[] = [
    {
      status: "pending",
      label: "Chờ xác nhận",
      active: true,
      current: order.orderStatus === "pending",
    },
    {
      status: "confirmed",
      label: "Đã xác nhận",
      active: ["confirmed", "progress", "completed"].includes(
        order.orderStatus
      ),
      current: order.orderStatus === "confirmed",
    },
    {
      status: "progress",
      label: "Đang thuê",
      active: ["progress", "returned", "completed"].includes(order.orderStatus),
      current: order.orderStatus === "progress",
    },
    {
      status: "returned",
      label: "Đã trả",
      active: ["returned", "completed"].includes(order.orderStatus),
      current: order.orderStatus === "returned",
    },
    {
      status: "disputed",
      label: "Tranh chấp",
      active: order.orderStatus === "disputed",
      current: order.orderStatus === "disputed",
      cancelled: false,
    },
    {
      status: "completed",
      label: "Hoàn tất",
      active: order.orderStatus === "completed",
      current: order.orderStatus === "completed",
    },
    {
      status: "cancelled",
      label: "Đã hủy",
      active: order.orderStatus === "cancelled",
      current: order.orderStatus === "cancelled",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => {
              const { pathname, query } = router;
              const q = query as Record<string, string | string[]>;
              if (Object.prototype.hasOwnProperty.call(q, "orderId")) {
                const newQuery: Record<string, string | string[]> = { ...q };
                delete (newQuery as Record<string, unknown>).orderId;
                router.replace({ pathname, query: newQuery }, undefined, {
                  shallow: true,
                });
              } else {
                router.back();
              }
            }}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-emerald-700 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FileText className="w-8 h-8 text-emerald-600" />
                Đơn hàng #{order.orderGuid.slice(0, 8).toUpperCase()}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Tạo ngày:{" "}
                {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                ${
                  order.orderStatus === "completed"
                    ? "bg-green-100 text-green-700"
                    : order.orderStatus === "cancelled"
                    ? "bg-red-100 text-red-700"
                    : order.orderStatus === "progress"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {getOrderStatusLabel(order.orderStatus)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                Sản phẩm thuê Demo
              </h2>
              <div className="flex gap-6 items-start">
                <div className="w-40 h-40 bg-gray-200 border-2 border-dashed rounded-xl overflow-hidden flex-shrink-0">
                  {order.itemSnapshot.images[0] ? (
                    <Image
                      src={order.itemSnapshot.images[0] || ""}
                      alt={order.itemSnapshot.title || "Ảnh sản phẩm"}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-gray-400 m-auto" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-gray-800">
                    {order.itemSnapshot.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Số lượng: <strong>{order.unitCount} cái</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Giá thuê:{" "}
                    <strong>
                      {order.itemSnapshot.basePrice.toLocaleString("vi-VN")}₫/
                      {getUnitName(order.itemSnapshot.priceUnit)}
                    </strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Cọc:{" "}
                    <strong>
                      {(
                        order.depositAmount ?? 0 / order.unitCount
                      ).toLocaleString("vi-VN")}
                      ₫/cái
                    </strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Thời gian thuê:{" "}
                    <strong>
                      {order.rentalDuration} {order.rentalUnit}
                    </strong>
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    {format(new Date(order.startAt), "dd/MM/yyyy HH:mm")} →{" "}
                    {format(new Date(order.endAt), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-lg mb-6 flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" />
                Thông tin người tham gia
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Người thuê */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      {order.renterId.avatarUrl ? (
                        <Image
                          src={order.renterId.avatarUrl}
                          alt={order.renterId.fullName}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-200 border-2 border-blue-300 flex items-center justify-center">
                          <User className="w-8 h-8 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 mb-1">
                        Người thuê
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full w-fit">
                        <User className="w-3 h-3" />
                        <span>Người mua</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <User className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Họ và tên</p>
                        <p className="text-base font-semibold text-gray-800">
                          {order.renterId.fullName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Mail className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm text-gray-700 break-all">
                          {order.renterId.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Người cho thuê */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      {order.ownerId.avatarUrl ? (
                        <Image
                          src={order.ownerId.avatarUrl}
                          alt={order.ownerId.fullName || "Chủ sở hữu"}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-emerald-200 border-2 border-emerald-300 flex items-center justify-center">
                          <Store className="w-8 h-8 text-emerald-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 mb-1">
                        Người cho thuê
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full w-fit">
                        <Store className="w-3 h-3" />
                        <span>Chủ cửa hàng</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-emerald-200">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <User className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Họ và tên</p>
                        <p className="text-base font-semibold text-gray-800">
                          {order.ownerId.fullName || "Chủ sở hữu"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Mail className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm text-gray-700 break-all">
                          {order.ownerId.email || "Không có email"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-emerald-200">
                    <Link
                      href={`/store/${
                        order.ownerId.userGuid || order.ownerId._id
                      }`}
                    >
                      <button className="w-full px-4 py-2 text-sm font-medium text-emerald-600 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                        <Store className="w-4 h-4" />
                        Xem cửa hàng
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                Hành trình đơn hàng
              </h2>

              {order.orderStatus === "cancelled" ? (
                <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100 border-4 border-white shadow-lg flex-shrink-0">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-700 mb-1">
                      Đã hủy đơn hàng
                    </p>
                    {order.updatedAt && (
                      <p className="text-xs text-red-600 mb-2">
                        {format(new Date(order.updatedAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    )}
                    {order.cancelReason && (
                      <div className="mt-2 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-700">
                          <span className="font-medium">Lý do:</span>{" "}
                          {order.cancelReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : order.orderStatus === "disputed" ? (
                <div className="flex items-center gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-100 border-4 border-white shadow-lg animate-pulse flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-orange-700 mb-1">
                      Đang tranh chấp
                    </p>
                    <p className="text-xs text-orange-600 mb-3">
                      {format(new Date(order.updatedAt), "dd/MM/yyyy HH:mm")}
                    </p>
                    {order.disputeId ? (
                      <button
                        onClick={() => {
                          const disputeId =
                            typeof order.disputeId === "string"
                              ? order.disputeId
                              : order.disputeId?._id;
                          if (disputeId) {
                            router.push(`/dispute/${disputeId}`);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Xem chi tiết tranh chấp
                      </button>
                    ) : (
                      <p className="text-xs text-orange-500">
                        Đang tải thông tin tranh chấp...
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* Horizontal timeline line */}
                  <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200"></div>

                  <div className="relative flex items-start justify-between gap-2 overflow-x-auto pb-4">
                    {timelineSteps
                      .filter(
                        (s) =>
                          s.status !== "cancelled" && s.status !== "disputed"
                      )
                      .map((step, idx, arr) => {
                        const isLast = idx === arr.length - 1;
                        const getStepIcon = () => {
                          switch (step.status) {
                            case "pending":
                              return <Clock className="w-5 h-5" />;
                            case "confirmed":
                              return <CheckCircle2 className="w-5 h-5" />;
                            case "progress":
                              return <Truck className="w-5 h-5" />;
                            case "returned":
                              return <RefreshCw className="w-5 h-5" />;
                            case "completed":
                              return <CheckCircle2 className="w-5 h-5" />;
                            default:
                              return <Package className="w-5 h-5" />;
                          }
                        };

                        const getStepDate = () => {
                          switch (step.status) {
                            case "pending":
                              return order.createdAt;
                            case "confirmed":
                            case "progress":
                            case "returned":
                            case "completed":
                              return order.updatedAt;
                            default:
                              return null;
                          }
                        };

                        const stepDate = getStepDate();

                        return (
                          <div
                            key={idx}
                            className="relative flex flex-col items-center flex-1 min-w-[120px]"
                          >
                            {/* Icon */}
                            <div className="relative z-10 mb-3">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-all duration-300 ${
                                  step.current
                                    ? "bg-emerald-600 text-white scale-110 ring-4 ring-emerald-200"
                                    : step.active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-200 text-gray-400"
                                }`}
                              >
                                {getStepIcon()}
                              </div>
                            </div>

                            {/* Connecting line - horizontal */}
                            {!isLast && (
                              <div
                                className={`absolute top-6 left-1/2 w-full h-0.5 ${
                                  arr[idx + 1]?.active
                                    ? "bg-emerald-300"
                                    : "bg-gray-200"
                                }`}
                                style={{
                                  width: "calc(100% - 48px)",
                                  left: "calc(50% + 24px)",
                                }}
                              ></div>
                            )}

                            {/* Content */}
                            <div className="text-center w-full">
                              <div
                                className={`rounded-lg p-3 transition-all duration-300 ${
                                  step.current
                                    ? "bg-emerald-50 border-2 border-emerald-200 shadow-sm"
                                    : step.active
                                    ? "bg-gray-50 border border-gray-200"
                                    : "bg-transparent"
                                }`}
                              >
                                <p
                                  className={`font-semibold text-sm mb-1 ${
                                    step.current
                                      ? "text-emerald-700"
                                      : step.active
                                      ? "text-gray-800"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {step.label}
                                </p>
                                {step.current && (
                                  <span className="inline-block px-2 py-0.5 bg-emerald-600 text-white text-xs font-medium rounded-full animate-pulse mb-1">
                                    Hiện tại
                                  </span>
                                )}
                                {stepDate && (
                                  <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(stepDate), "dd/MM HH:mm")}
                                  </p>
                                )}
                                {step.current && !stepDate && (
                                  <p className="text-xs text-emerald-600 mt-1 italic">
                                    Đang xử lý...
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Địa chỉ */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-red-600" />
                Địa chỉ nhận hàng
              </h2>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>{order.shippingAddress.fullName}</strong>
                </p>
                <p>
                  {order.shippingAddress.street}, {order.shippingAddress.ward},{" "}
                  {order.shippingAddress.province}
                </p>
                <p>SĐT: {order.shippingAddress.phone}</p>
              </div>
            </div>
          </div>

          {/* Cột phải */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white rounded-2xl shadow-xl p-6">
              <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
                <CreditCard className="w-7 h-7" />
                Chi tiết thanh toán
              </h2>
              <div className="space-y-3 text-sm">
                {/* Hiển thị giá từ backend - không tính toán lại */}
                {(() => {
                  // Lấy tất cả giá trị từ backend (đã được tính sẵn)
                  // Tiền thuê (rentalTotal) - totalAmount trong order là tiền thuê
                  const rentalTotal = order.itemSnapshot.basePrice || 0;

                  // Tiền cọc (depositTotal)
                  const depositTotal = order.depositAmount || 0;

                  // Phí dịch vụ (serviceFeeAmount) - đã được tính sẵn trong backend
                  const serviceFeeAmount = order.serviceFee || 0;

                  // Lấy discount info từ order
                  const discount = order.discount;
                  const publicDiscountAmount = discount?.amountApplied || 0;
                  const privateDiscountAmount =
                    discount?.secondaryAmountApplied || 0;
                  const totalDiscountAmount =
                    discount?.totalAmountApplied ||
                    publicDiscountAmount + privateDiscountAmount;

                  // Tổng tiền = tiền tong thuê - discount
                  // finalAmount từ backend là tiền thuê sau discount, nên tổng = finalAmount + deposit + serviceFee
                  const grandTotal = order.finalAmount
                    ? order.finalAmount
                    : Math.max(0, rentalTotal - totalDiscountAmount);

                  return (
                    <>
                      {/* 1. Tiền thuê */}
                      <div className="flex justify-between items-center py-2 border-b border-white/20">
                        <span className="text-emerald-50">Tiền thuê</span>
                        <span className="font-semibold text-white">
                          {rentalTotal.toLocaleString("vi-VN")}₫
                        </span>
                      </div>

                      {/* 2. Phí dịch vụ */}
                      <div className="flex justify-between items-center py-2 border-b border-white/20">
                        <span className="text-yellow-200">Phí dịch vụ</span>
                        <span className="font-semibold text-yellow-100">
                          {serviceFeeAmount.toLocaleString("vi-VN")}₫
                        </span>
                      </div>

                      {/* 3. Tiền cọc */}
                      <div className="flex justify-between items-center py-2 border-b border-white/20">
                        <span className="text-amber-200">Tiền cọc</span>
                        <span className="font-semibold text-amber-100">
                          {depositTotal.toLocaleString("vi-VN")}₫
                        </span>
                      </div>

                      {/* 4. Giảm giá (nếu có) */}
                      {totalDiscountAmount > 0 && (
                        <div className="space-y-1">
                          {publicDiscountAmount > 0 && discount?.code && (
                            <div className="flex justify-between items-center py-1 border-b border-white/10">
                              <span className="text-emerald-50 text-sm">
                                Giảm giá công khai ({discount.code})
                              </span>
                              <span className="font-semibold text-emerald-100 text-sm">
                                -{publicDiscountAmount.toLocaleString("vi-VN")}₫
                              </span>
                            </div>
                          )}
                          {privateDiscountAmount > 0 &&
                            discount?.secondaryCode && (
                              <div className="flex justify-between items-center py-1 border-b border-white/10">
                                <span className="text-emerald-50 text-sm">
                                  Giảm giá riêng tư ({discount.secondaryCode})
                                </span>
                                <span className="font-semibold text-emerald-100 text-sm">
                                  -
                                  {privateDiscountAmount.toLocaleString(
                                    "vi-VN"
                                  )}
                                  ₫
                                </span>
                              </div>
                            )}
                          <div className="flex justify-between items-center py-2 border-b border-white/20">
                            <span className="text-emerald-50 font-semibold">
                              Tổng giảm giá
                            </span>
                            <span className="font-semibold text-emerald-100">
                              -{totalDiscountAmount.toLocaleString("vi-VN")}₫
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 5. Tổng cộng */}
                      <div className="border-t border-emerald-400 pt-3">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Tổng cộng</span>
                          <span className="text-2xl">
                            {grandTotal.toLocaleString("vi-VN")}₫
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-emerald-100 text-center italic">
                          (Hoàn lại tiền cọc sau khi trả đồ)
                        </div>
                      </div>

                      {/* Chi tiết mã giảm giá đã sử dụng */}
                      {discount &&
                        (discount.code || discount.secondaryCode) && (
                          <div className="mt-4 pt-4 border-t border-emerald-400">
                            <div className="text-xs text-emerald-200/80 space-y-1">
                              {discount.code && (
                                <div>
                                  <span className="font-semibold">
                                    Mã công khai:
                                  </span>{" "}
                                  {discount.code}{" "}
                                  {discount.type === "percent"
                                    ? `(${discount.value}%)`
                                    : `(${(discount.value ?? 0).toLocaleString(
                                        "vi-VN"
                                      )}₫)`}{" "}
                                  -{" "}
                                  {(discount.amountApplied || 0).toLocaleString(
                                    "vi-VN"
                                  )}
                                  ₫
                                </div>
                              )}
                              {discount.secondaryCode && (
                                <div>
                                  <span className="font-semibold">
                                    Mã riêng tư:
                                  </span>{" "}
                                  {discount.secondaryCode}{" "}
                                  {discount.secondaryType === "percent"
                                    ? `(${discount.secondaryValue}%)`
                                    : `(${(
                                        discount.secondaryValue ?? 0
                                      ).toLocaleString("vi-VN")}₫)`}{" "}
                                  -{" "}
                                  {(
                                    discount.secondaryAmountApplied || 0
                                  ).toLocaleString("vi-VN")}
                                  ₫
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Trạng thái thanh toán + Nút thanh toán nếu chưa thanh toán */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-emerald-600" />
                Trạng thái thanh toán
              </h2>

              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700">Thanh toán</span>
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    order.paymentStatus === "paid"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {order.paymentStatus === "paid" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {getPaymentStatusLabel(order.paymentStatus)}
                </span>
              </div>

              {/* Chưa thanh toán → hiện nút ví */}
              {["pending", "not_paid"].includes(order.paymentStatus) && (
                <div className="space-y-4">
                  <button
                    onClick={handlePayWithWallet}
                    disabled={isPaying || loadingBalance}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-5 rounded-2xl shadow-xl transform transition-all duration-200 hover:scale-105 flex items-center justify-center gap-3 text-lg disabled:opacity-60 disabled:hover:scale-100"
                  >
                    {isPaying || loadingBalance ? (
                      <>
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-7 h-7" />
                        Thanh toán ngay
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-red-600 font-medium animate-pulse">
                    Vui lòng thanh toán để chủ hàng xác nhận giao hàng
                  </p>
                </div>
              )}

              {/* Đã thanh toán */}
              {order.paymentStatus === "paid" && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                  <p className="text-emerald-700 font-medium flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Đã thanh toán thành công
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {order.startAt
                      ? format(new Date(order.startAt), "dd/MM/yyyy HH:mm")
                      : "Gần đây"}
                  </p>
                </div>
              )}
            </div>
            {/* Hợp đồng */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Hợp đồng thuê
              </h2>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Hợp đồng</span>
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
        ${
          order.isContractSigned
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
                >
                  {order.isContractSigned ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Đã ký
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Chưa ký
                    </>
                  )}
                </span>
              </div>

              {/* Chỉ hiện nút ký khi: chưa ký + tổng tiền thuê > 2.000.000 ₫ */}
              {!order.isContractSigned && order.totalAmount > 2_000_000 && (
                <Link href={`/auth/contract/sign/${id}`}>
                  <button className="mt-4 w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg">
                    Ký hợp đồng ngay
                  </button>
                </Link>
              )}

              {/* Thông báo khi đơn hàng dưới 2 triệu */}
              {!order.isContractSigned && order.totalAmount <= 2_000_000 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>
                      Đơn hàng dưới <strong>2.000.000₫</strong> không yêu cầu ký
                      hợp đồng điện tử. Bạn có thể giao dịch trực tiếp với người
                      thuê.
                    </span>
                  </p>
                </div>
              )}

              {/* Nếu đã ký rồi thì hiển thị thông tin */}
              {order.isContractSigned && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Hợp đồng đã được cả hai bên ký thành công.</span>
                  </p>
                </div>
              )}
            </div>

            {/* Tiện ích */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <button className="w-full flex items-center justify-center gap-2 text-gray-700 hover:text-emerald-600 transition text-sm">
                <Download className="w-4 h-4" /> Tải hóa đơn
              </button>
              <button className="w-full flex items-center justify-center gap-2 text-gray-700 hover:text-emerald-600 transition text-sm">
                <Share2 className="w-4 h-4" /> Chia sẻ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
              <h3 className="font-bold text-lg">Xác nhận hành động</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn thực hiện hành động này?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-xl font-medium"
              >
                Hủy
              </button>
              <button
                onClick={executeAction}
                disabled={actionLoading}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Xác nhận"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Số dư không đủ – PHIÊN BẢN NHỎ GỌN */}
      {insufficientModal.isOpen && order && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() =>
              setInsufficientModal((prev) => ({ ...prev, isOpen: false }))
            }
          />
          <div className="relative w-full max-w-sm mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Ví không đủ tiền
              </h3>

              <div className="bg-red-50 rounded-xl p-4 text-left text-sm space-y-2 mb-4 font-medium">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cần thanh toán:</span>
                  <span className="text-red-600 font-bold">
                    {insufficientModal.requiredAmount.toLocaleString()}₫
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số dư ví:</span>
                  <span>{walletBalance.toLocaleString()}₫</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-red-200">
                  <span className="text-gray-700 font-semibold">Thiếu:</span>
                  <span className="text-red-600 font-bold">
                    {insufficientModal.shortage.toLocaleString()}₫
                  </span>
                </div>
              </div>

              <div className="flex gap-3 text-sm">
                <button
                  onClick={() =>
                    setInsufficientModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Để sau
                </button>
                <button
                  onClick={() => {
                    setInsufficientModal((prev) => ({
                      ...prev,
                      isOpen: false,
                    }));
                    router.push("/wallet");
                  }}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
                >
                  Nạp tiền
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận thanh toán – PHIÊN BẢN NHỎ GỌN, CHỮ NHỎ, SIÊU ĐẸP */}
      {confirmPayModal.isOpen && order && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() =>
              setConfirmPayModal((prev) => ({ ...prev, isOpen: false }))
            }
          />

          <div className="relative w-full max-w-sm mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-emerald-600" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Xác nhận thanh toán
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Đơn hàng #{order.orderGuid.slice(0, 8).toUpperCase()}
              </p>

              <div className="bg-emerald-50 rounded-xl p-4 text-left text-sm space-y-2 mb-4 font-medium border border-emerald-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiền thuê</span>
                  <span className="font-semibold">
                    {(order.itemSnapshot.basePrice ?? 0).toLocaleString()}₫
                  </span>
                </div>
                {(order.serviceFee ?? 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Phí dịch vụ</span>
                    <span>{(order.serviceFee ?? 0).toLocaleString()}₫</span>
                  </div>
                )}
                {(order.depositAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-amber-700 text-xs font-medium">
                    <span>Tiền cọc</span>
                    <span>{(order.depositAmount ?? 0).toLocaleString()}₫</span>
                  </div>
                )}
                {(order.discount?.totalAmountApplied ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600 text-xs font-bold">
                    <span>Giảm giá</span>
                    <span>
                      -
                      {(
                        order.discount?.totalAmountApplied ?? 0
                      ).toLocaleString()}
                      ₫
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-emerald-300 flex justify-between font-bold text-base">
                  <span>Tổng cộng</span>
                  <span className="text-emerald-600">
                    {(order.finalAmount ?? 0).toLocaleString()}₫
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs font-medium mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Số dư hiện tại</span>
                  <span className="text-emerald-600 font-bold">
                    {walletBalance.toLocaleString()}₫
                  </span>
                </div>
              </div>

              <div className="flex gap-3 text-sm">
                <button
                  onClick={() =>
                    setConfirmPayModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={executeWalletPayment}
                  disabled={isPaying}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isPaying ? <>Đang xử lý...</> : "Thanh toán"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
