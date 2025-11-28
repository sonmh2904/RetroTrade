"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getOrderDetails } from "@/services/auth/order.api";
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
import OwnerLayout from "../layout";

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

// Helper functions to convert status to Vietnamese
const getOrderStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    progress: "Đang thuê",
    returned: "Đã trả hàng",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
    disputed: "Khiếu nại",
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

export default function OwnerOrderDetail() {
  return (
    <OwnerLayout>
      <OwnerOrderDetailContent />
    </OwnerLayout>
  );
}

function OwnerOrderDetailContent() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
    } finally {
      setLoading(false);
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
      label: "Khiếu nại",
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

  // Breadcrumb data
  const breadcrumbs = [
    { label: "Trang chủ", href: "/home", icon: Home },
    { label: "Quản lý", href: "/owner", icon: ShoppingBag },
    { label: "Đơn hàng", href: "/owner/orders", icon: ShoppingBag },
    { label: "Chi tiết đơn hàng", href: `/owner/orders/${id}`, icon: Eye },
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
              <Link href={`/products/details?id=${order.itemId}`}>
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
                      {format(
                        new Date(order.startAt),
                        "dd/MM/yyyy HH:mm"
                      )} → {format(new Date(order.endAt), "dd/MM/yyyy HH:mm")}
                    </div>
                  </div>
                </div>
              </Link>
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
                      Đang Khiếu nại
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
                        Xem chi tiết Khiếu nại
                      </button>
                    ) : (
                      <p className="text-xs text-orange-500">
                        Đang tải thông tin Khiếu nại...
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
                {/* 1. Tiền thuê */}
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-emerald-50">Tiền thuê</span>
                  <span className="font-semibold text-white">
                    {(order.totalAmount || 0).toLocaleString("vi-VN")}{" "}
                    {order.currency || "₫"}
                  </span>
                </div>

                {/* 2. Phí dịch vụ */}
                <div className="flex justify-between text-cyan-200">
                  <span>Phí dịch vụ</span>
                  <span>
                    {(order.serviceFee || 0).toLocaleString("vi-VN")}{" "}
                    {order.currency || "₫"}
                  </span>
                </div>

                {/* 3. Tiền cọc */}
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-amber-200">Tiền cọc</span>
                  <span className="font-semibold text-amber-100">
                    {(order.depositAmount || 0).toLocaleString("vi-VN")}{" "}
                    {order.currency || "₫"}
                  </span>
                </div>

                {/* 4. Giảm giá (nếu có) */}
                {order.discount &&
                  ((order.discount.amountApplied ?? 0) > 0 ||
                    (order.discount.secondaryAmountApplied ?? 0) > 0 ||
                    (order.discount.totalAmountApplied ?? 0) > 0) && (
                    <div className="flex justify-between text-green-200 border-t border-emerald-400 pt-3">
                      <span>Giảm giá</span>
                      <span className="font-medium">
                        -
                        {(
                          order.discount.totalAmountApplied ||
                          order.discount.amountApplied ||
                          0
                        ).toLocaleString("vi-VN")}{" "}
                        {order.currency || "₫"}
                      </span>
                    </div>
                  )}

                {/* 5. Tổng thanh toán */}
                <div className="border-t border-emerald-400 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng thanh toán</span>
                    <span className="text-2xl">
                      {/* Tổng = finalAmount (tiền thuê sau discount) + deposit + serviceFee */}
                      {order.finalAmount !== undefined
                        ? (
                            order.finalAmount +
                            (order.depositAmount || 0) +
                            (order.serviceFee || 0)
                          ).toLocaleString("vi-VN")
                        : (order.totalAmount || 0).toLocaleString("vi-VN")}{" "}
                      {order.currency || "₫"}
                    </span>
                  </div>
                  {/* Chi tiết mã giảm giá */}
                  {order.discount &&
                    (order.discount.code || order.discount.secondaryCode) && (
                      <div className="mt-2 text-xs text-emerald-200/80">
                        {order.discount.code && (
                          <div>
                            Mã công khai: {order.discount.code}{" "}
                            {order.discount.type === "percent"
                              ? `(${order.discount.value}%)`
                              : `(${(order.discount.value ?? 0).toLocaleString(
                                  "vi-VN"
                                )}₫)`}{" "}
                            -{" "}
                            {(order.discount.amountApplied || 0).toLocaleString(
                              "vi-VN"
                            )}
                            ₫
                          </div>
                        )}
                        {order.discount.secondaryCode && (
                          <div>
                            Mã riêng tư: {order.discount.secondaryCode}{" "}
                            {order.discount.secondaryType === "percent"
                              ? `(${order.discount.secondaryValue}%)`
                              : `(${order.discount.secondaryValue?.toLocaleString(
                                  "vi-VN"
                                )}₫)`}{" "}
                            -{" "}
                            {(
                              order.discount.secondaryAmountApplied || 0
                            ).toLocaleString("vi-VN")}
                            ₫
                          </div>
                        )}
                      </div>
                    )}
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

            {/* Hợp đồng - CHỈ HIỆN KHI ĐƠN HÀNG > 2.000.000₫ */}
            {order.totalAmount > 2_000_000 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  Hợp đồng thuê
                </h2>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-700">Hợp đồng</span>
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
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

                {/* Nút ký hợp đồng - chỉ hiện khi chưa ký */}
                {!order.isContractSigned && (
                  <Link href={`/auth/contract/sign/${id}`}>
                    <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5" />
                      Ký hợp đồng ngay
                    </button>
                  </Link>
                )}

                {/* Thông báo đã ký */}
                {order.isContractSigned && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                    <p className="text-emerald-700 font-medium flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Hợp đồng đã được cả hai bên ký thành công
                    </p>
                  </div>
                )}
              </div>
            )}
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
    </div>
  );
}
