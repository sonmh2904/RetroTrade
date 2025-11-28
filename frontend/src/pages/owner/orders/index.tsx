"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { listOrdersByOwner } from "@/services/auth/order.api";
import type { Order } from "@/services/auth/order.api";
import { Button } from "@/components/ui/common/button";
import {
  createPaginationState,
  formatPaginationInfo,
  generatePageNumbers,
  type PaginationState,
} from "@/lib/pagination";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/common/empty-state";
import { format } from "date-fns";
import {
  Package,
  Calendar,
  Loader2,
  ShoppingBag,
  Filter,
  Eye,
  FileText,
  User,
  Home,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import OwnerLayout from "../layout";

export default function OwnerOrdersPage() {
  return (
    <OwnerLayout>
      <OwnerOrdersContent />
    </OwnerLayout>
  );
}

function OwnerOrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await listOrdersByOwner();
        if (res.code === 200 && Array.isArray(res.data)) {
          setOrders(res.data);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Không thể tải danh sách đơn hàng");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const formatDate = (date: string) => format(new Date(date), "dd/MM/yyyy");
  const formatDateTime = (date: string) =>
    format(new Date(date), "dd/MM/yyyy HH:mm");

  const statusConfig: Record<
    string,
    { label: string; color: string; bgColor: string }
  > = {
    pending: {
      label: "Chờ xác nhận",
      color: "text-yellow-800",
      bgColor: "bg-yellow-100 border-yellow-200",
    },
    confirmed: {
      label: "Đã xác nhận",
      color: "text-blue-800",
      bgColor: "bg-blue-100 border-blue-200",
    },
    progress: {
      label: "Đang thuê",
      color: "text-purple-800",
      bgColor: "bg-purple-100 border-purple-200",
    },
    returned: {
      label: "Đã trả hàng",
      color: "text-teal-800",
      bgColor: "bg-teal-100 border-teal-200",
    },
    completed: {
      label: "Hoàn tất",
      color: "text-green-800",
      bgColor: "bg-green-100 border-green-200",
    },
    cancelled: {
      label: "Đã hủy",
      color: "text-red-800",
      bgColor: "bg-red-100 border-red-200",
    },
    disputed: {
      label: "Khiếu nại",
      color: "text-orange-800",
      bgColor: "bg-orange-100 border-orange-200",
    },
  };

  const paymentStatusConfig: Record<string, { label: string; color: string }> =
    {
      pending: { label: "Chờ thanh toán", color: "text-yellow-700" },
      not_paid: { label: "Chưa thanh toán", color: "text-yellow-700" },
      paid: { label: "Đã thanh toán", color: "text-green-700" },
      refunded: { label: "Đã hoàn tiền", color: "text-blue-700" },
      partial: { label: "Thanh toán một phần", color: "text-amber-700" },
    };

  const filteredOrders = useMemo(() => {
    if (selectedStatus === "all") return orders;
    return orders.filter((order) => order.orderStatus === selectedStatus);
  }, [orders, selectedStatus]);

  const paginationState: PaginationState = useMemo(
    () =>
      createPaginationState({
        page: currentPage,
        limit: itemsPerPage,
        totalItems: filteredOrders.length,
        totalPages: Math.ceil(filteredOrders.length / itemsPerPage),
      }),
    [currentPage, itemsPerPage, filteredOrders.length]
  );

  const currentOrders = filteredOrders.slice(
    paginationState.startIndex,
    paginationState.endIndex + 1
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= paginationState.totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const statusTabs = [
    { key: "all", label: "Tất cả", count: orders.length },
    {
      key: "pending",
      label: "Chờ xác nhận",
      count: orders.filter((o) => o.orderStatus === "pending").length,
    },
    {
      key: "confirmed",
      label: "Đã xác nhận",
      count: orders.filter((o) => o.orderStatus === "confirmed").length,
    },
    {
      key: "progress",
      label: "Đang thuê",
      count: orders.filter((o) => o.orderStatus === "progress").length,
    },
    {
      key: "returned",
      label: "Đã trả hàng",
      count: orders.filter((o) => o.orderStatus === "returned").length,
    },
    {
      key: "completed",
      label: "Hoàn tất",
      count: orders.filter((o) => o.orderStatus === "completed").length,
    },
    {
      key: "cancelled",
      label: "Đã hủy",
      count: orders.filter((o) => o.orderStatus === "cancelled").length,
    },
    {
      key: "disputed",
      label: "Khiếu nại",
      count: orders.filter((o) => o.orderStatus === "disputed").length,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải danh sách đơn hàng...</p>
        </div>
      </div>
    );
  }

  // Breadcrumb data
  const breadcrumbs = [
    { label: "Trang chủ", href: "/home", icon: Home },
    { label: "Quản lý", href: "/owner", icon: ShoppingBag },
    { label: "Đơn hàng", href: "/owner/orders", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-10 px-6">
      <div className="max-w-7xl mx-auto">
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
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 flex items-center justify-center gap-4">
            <ShoppingBag className="w-12 h-12 text-emerald-600" />
            Đơn hàng của tôi
          </h1>
          <p className="text-lg text-gray-600 mt-3">
            Quản lý và theo dõi tất cả đơn hàng của bạn
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-700">
              Lọc theo trạng thái:
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedStatus === tab.key
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      selectedStatus === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Empty className="border-gray-200 bg-white shadow-lg">
            <EmptyMedia variant="icon" className="bg-emerald-100">
              <ShoppingBag className="w-8 h-8 text-emerald-600" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle className="text-gray-900">
                {selectedStatus === "all"
                  ? "Chưa có đơn hàng nào"
                  : "Không có đơn hàng nào"}
              </EmptyTitle>
              <EmptyDescription className="text-gray-600">
                {selectedStatus === "all"
                  ? "Bạn chưa có đơn hàng nào. Các đơn hàng sẽ hiển thị ở đây khi có khách đặt thuê sản phẩm của bạn."
                  : `Không có đơn hàng nào ở trạng thái "${
                      statusTabs.find((t) => t.key === selectedStatus)?.label ||
                      ""
                    }"`}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6">
              {currentOrders.map((order) => {
                const statusInfo =
                  statusConfig[order.orderStatus] || statusConfig.pending;
                const paymentInfo =
                  paymentStatusConfig[order.paymentStatus] ||
                  paymentStatusConfig.pending;

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full md:w-32 h-32 flex-shrink-0 overflow-hidden">
                        {order.itemSnapshot?.images?.[0] ||
                        order.itemId?.Images?.[0] ? (
                          <img
                            src={
                              order.itemSnapshot?.images?.[0] ||
                              order.itemId?.Images?.[0]
                            }
                            alt={
                              order.itemSnapshot?.title || order.itemId?.Title
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-14 h-14" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-800 line-clamp-2">
                                {order.itemSnapshot?.title ||
                                  order.itemId?.Title}
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.bgColor} ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span className="font-mono font-medium">
                                  {order.orderGuid}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(order.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">
                              {order.totalAmount.toLocaleString("vi-VN")}{" "}
                              {order.currency}
                            </p>
                            <p
                              className={`text-sm font-medium ${paymentInfo.color}`}
                            >
                              {paymentInfo.label}
                            </p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Calendar className="w-5 h-5 text-emerald-600" />
                              <span className="font-medium">
                                Thời gian thuê:
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 ml-7">
                              {formatDateTime(order.startAt)} →{" "}
                              {formatDateTime(order.endAt)}
                            </div>
                            {order.rentalDuration && (
                              <div className="text-xs text-gray-500 ml-7">
                                Thời lượng: {order.rentalDuration}{" "}
                                {order.rentalUnit || "ngày"}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Package className="w-5 h-5 text-blue-600" />
                              <span className="font-medium">Số lượng:</span>
                            </div>
                            <div className="text-sm text-gray-600 ml-7">
                              {order.unitCount} cái
                            </div>
                            {order.depositAmount && (
                              <div className="text-xs text-gray-500 ml-7">
                                Cọc:{" "}
                                {order.depositAmount.toLocaleString("vi-VN")}{" "}
                                {order.currency}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                Người thuê
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {order.renterId?.fullName || "N/A"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {order.renterId?.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
                          <div className="flex gap-3">
                            <Link href={`/owner/orders/${order._id}`}>
                              <Button
                                variant="outline"
                                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Xem chi tiết
                              </Button>
                            </Link>
                          </div>
                          <div className="text-xs text-gray-500">
                            Cập nhật: {formatDateTime(order.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {paginationState.totalPages > 1 && (
              <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {/* Pagination Info */}
                <div className="text-gray-600 text-sm mb-4 text-center">
                  {formatPaginationInfo({
                    page: paginationState.currentPage,
                    limit: paginationState.itemsPerPage,
                    totalItems: paginationState.totalItems,
                    totalPages: paginationState.totalPages,
                    hasNextPage: paginationState.hasNextPage,
                    hasPrevPage: paginationState.hasPrevPage,
                    startIndex: paginationState.startIndex,
                    endIndex: paginationState.endIndex,
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {/* Previous Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                    onClick={() =>
                      handlePageChange(paginationState.currentPage - 1)
                    }
                    disabled={!paginationState.hasPrevPage}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Trước
                  </Button>

                  {/* Page Numbers */}
                  {generatePageNumbers(
                    paginationState.currentPage,
                    paginationState.totalPages,
                    5
                  ).map((pageNum) => (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={
                        pageNum === paginationState.currentPage
                          ? "default"
                          : "outline"
                      }
                      className={
                        pageNum === paginationState.currentPage
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
                          : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                      }
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  ))}

                  {/* Next Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                    onClick={() =>
                      handlePageChange(paginationState.currentPage + 1)
                    }
                    disabled={!paginationState.hasNextPage}
                  >
                    Sau
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
