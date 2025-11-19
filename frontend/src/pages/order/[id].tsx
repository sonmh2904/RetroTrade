"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  getOrderDetails,
  confirmOrder,
  startOrder,
  renterReturn,
  ownerComplete,
  cancelOrder,
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
  ChevronRight,
  Download,
  Share2,
  Home,
  ShoppingBag,
  Eye,
  User,
  Mail,
  Store,
} from "lucide-react";
import type { Order } from "@/services/auth/order.api";
import Image from "next/image";
import Link from "next/link";
// import { getCurrentTax } from "@/services/tax/tax.api";
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

const calculateRentalAmount = (order: Order): number => {
  const basePrice = order.itemSnapshot.basePrice ?? 0;
  const duration = order.rentalDuration ?? 0;
  const count = order.unitCount ?? 1;
  return basePrice * duration * count;
};

// Helper functions to convert status to Vietnamese
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

export default function OrderDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => Promise<void>>(
    () => async () => {}
  );
  const [taxRate, setTaxRate] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await getOrderDetails(id as string);
      if (res.data) {
        setOrder(res.data);
        const rentalAmount = calculateRentalAmount(res.data);
        const serviceFee = res.data.serviceFee || 0;
        if (rentalAmount > 0 && serviceFee > 0) {
          const calculatedTaxRate = Math.round(
            (serviceFee / rentalAmount) * 100
          );
          setTaxRate(calculatedTaxRate);
        } else {
          try {
            const taxResponse = await getCurrentTax();
            if (taxResponse.success && taxResponse.data) {
              setTaxRate(taxResponse.data.taxRate);
            } else {
              setTaxRate(3);
            }
          } catch {
            setTaxRate(3);
          }
        }
      }
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: () => Promise<void>) => {
    setPendingAction(() => action);
    setShowConfirm(true);
  };

  const executeAction = async () => {
    setActionLoading(true);
    try {
      await pendingAction();
      await loadOrder();
    } catch (error) {
      alert("Thao tác thất bại");
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

  const canConfirm = order.orderStatus === "pending";
  const canStart = order.orderStatus === "confirmed";
  const canReturn = order.orderStatus === "progress";
  const canComplete = order.orderStatus === "returned";
  const canCancel = ["pending", "confirmed"].includes(order.orderStatus);

  // Breadcrumb data
  const breadcrumbs = [
    { label: "Trang chủ", href: "/home", icon: Home },
    { label: "Đơn hàng", href: "/order", icon: ShoppingBag },
    { label: "Chi tiết đơn hàng", href: `/order/${id}`, icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((breadcrumb, index) => {
              const IconComponent = breadcrumb.icon;
              const isLast = index === breadcrumbs.length - 1;

              return (
                <div
                  key={breadcrumb.href}
                  className="flex items-center space-x-2"
                >
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}

                  {isLast ? (
                    <span className="flex items-center space-x-1 text-gray-900 font-medium">
                      {IconComponent && <IconComponent className="w-4 h-4" />}
                      <span>{breadcrumb.label}</span>
                    </span>
                  ) : (
                    <Link
                      href={breadcrumb.href}
                      className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      {IconComponent && <IconComponent className="w-4 h-4" />}
                      <span>{breadcrumb.label}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

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
                Sản phẩm thuê 
              </h2>
              <div className="flex gap-6 items-start">
                <div className="w-40 h-40 bg-gray-200 border-2 border-dashed rounded-xl overflow-hidden flex-shrink-0">
                  {order.itemSnapshot.images[0] ? (
                    <img
                      src={order.itemSnapshot.images[0]}
                      alt={order.itemSnapshot.title}
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
              <h2 className="font-bold text-lg mb-4">Hành trình đơn hàng</h2>

              <div className="space-y-4">
                {order.orderStatus === "cancelled" ? (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 text-red-700">
                      <XCircle className="w-5 h-5" />
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-red-700">Đã hủy</p>

                      {order.updatedAt && (
                        <p className="text-xs text-gray-500">
                          {format(
                            new Date(order.updatedAt),
                            "dd/MM/yyyy HH:mm"
                          )}
                        </p>
                      )}

                      {order.cancelReason && (
                        <div
                          className="mt-2 flex items-start gap-2 animate-fadeIn"
                          title={String(order.cancelReason)}
                        >
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                          <p className="text-xs text-amber-600 italic max-w-[250px] truncate">
                            Lý do: {order.cancelReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : order.orderStatus === "disputed" ? (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 text-red-700">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-red-700">
                        Đang Tranh chấp
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(order.updatedAt), "dd/MM/yyyy HH:mm")}
                      </p>

                      {/* NÚT CHỈ HIỆN KHI CÓ disputeId */}
                      {order.disputeId ? (
                        <button
                          onClick={() => {
                            const disputeId =
                              typeof order.disputeId === "string"
                                ? order.disputeId
                                : order.disputeId?._id;

                            if (disputeId) {
                              router.push(`/dispute/${disputeId}`);
                            } else {
                              console.error(
                                "Không tìm thấy disputeId hợp lệ:",
                                order.disputeId
                              );
                            }
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 underline underline-offset-2 transition-colors group"
                        >
                          <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          Chi tiết tranh chấp
                        </button>
                      ) : (
                        <p className="text-xs text-gray-400 mt-3">
                          Đang tải thông tin tranh chấp...
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  timelineSteps
                    .filter((s) => s.status !== "cancelled")
                    .map((step, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            step.current
                              ? "bg-emerald-600 text-white"
                              : step.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          {step.active || step.current ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              step.current
                                ? "text-emerald-700"
                                : step.active
                                ? "text-gray-700"
                                : "text-gray-400"
                            }`}
                          >
                            {step.label}
                          </p>
                          {step.current && (
                            <p className="text-xs text-gray-500">
                              Đang xử lý...
                            </p>
                          )}
                        </div>
                        {idx < timelineSteps.length - 2 && (
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                    ))
                )}
              </div>
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
                <div className="flex justify-between">
                  <span>Tiền thuê</span>
                  <span className="font-medium">
                    {calculateRentalAmount(order).toLocaleString("vi-VN")}₫
                  </span>
                </div>

                <div className="flex justify-between text-cyan-200">
                  <span>
                    Phí dịch vụ
                    {taxRate !== null ? ` (${taxRate}%)` : ""}
                  </span>
                  <span>
                    {(order.serviceFee || 0).toLocaleString("vi-VN")}₫
                  </span>
                </div>

                <div className="flex justify-between text-amber-200">
                  <span>Tiền cọc (hoàn lại)</span>
                  <span>
                    {(order.depositAmount || 0).toLocaleString("vi-VN")}₫
                  </span>
                </div>

                <div className="border-t border-emerald-400 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng thanh toán</span>
                    <span className="text-2xl">
                      {order.totalAmount.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-emerald-600" />
                Trạng thái thanh toán
              </h2>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Thanh toán</span>
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                    ${
                      order.paymentStatus === "paid"
                        ? "bg-green-100 text-green-700"
                        : order.paymentStatus === "not_paid"
                        ? "bg-yellow-100 text-yellow-700"
                        : order.paymentStatus === "refunded"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                >
                  {order.paymentStatus === "paid" && (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {order.paymentStatus === "not_paid" && (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {getPaymentStatusLabel(order.paymentStatus)}
                </span>
              </div>
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
              {!order.isContractSigned && (
                <Link href={`/auth/contract/sign/${id}`}>
                  <button className="mt-3 w-full bg-emerald-600 text-white py-2 rounded-xl font-medium hover:bg-emerald-700 transition">
                    Ký hợp đồng ngay
                  </button>
                </Link>
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
    </div>
  );
}
