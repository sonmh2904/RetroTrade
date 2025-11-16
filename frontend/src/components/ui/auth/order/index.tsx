"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { decodeToken } from '@/utils/jwtHelper';
import { listOrders, renterReturn } from "@/services/auth/order.api";
import type { Order } from "@/services/auth/order.api";
import { RootState } from "@/store/redux_store";
import { Button } from "@/components/ui/common/button";
import {
  createPaginationState,
  formatPaginationInfo,
  generatePageNumbers,
  type PaginationState,
} from "@/lib/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";
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
  CheckCircle,
  Loader2,
  ShoppingBag,
  Filter,
  Eye,
  User,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

export default function OrderListPage({ onOpenDetail }: { onOpenDetail?: (id: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Hiển thị 10 đơn hàng mỗi trang

  const accessToken = useSelector((state: RootState) => state.auth.accessToken);

  // Decode token
  const decodedUser = useMemo(() => decodeToken(accessToken), [accessToken]);
  const userRole = decodedUser?.role?.toLowerCase();
  const userId = decodedUser?._id;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await listOrders();
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

  const handleConfirmReturn = async () => {
    if (!selectedOrder) return;
    try {
      setProcessing(selectedOrder._id);
      const res = await renterReturn(
        selectedOrder._id,
        "Khách xác nhận đã trả hàng"
      );
      if (res.code === 200) {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === selectedOrder._id ? { ...o, orderStatus: "returned" } : o
          )
        );
        toast.success("Đã xác nhận trả hàng thành công");
      } else {
        toast.error(res.message || "Không thể xác nhận trả hàng");
      }
    } catch (err) {
      console.error("Return error:", err);
      toast.error("Có lỗi xảy ra khi xác nhận trả hàng");
    } finally {
      setProcessing(null);
      setSelectedOrder(null);
      setOpenConfirm(false);
    }
  };

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
      label: "Tranh chấp",
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

  // Filter orders by status
  const filteredOrders = useMemo(() => {
    if (selectedStatus === "all") return orders;
    return orders.filter((order) => order.orderStatus === selectedStatus);
  }, [orders, selectedStatus]);

  // Pagination calculations
  const paginationState: PaginationState = useMemo(() =>
    createPaginationState({
      page: currentPage,
      limit: itemsPerPage,
      totalItems: filteredOrders.length,
      totalPages: Math.ceil(filteredOrders.length / itemsPerPage),
    }),
    [currentPage, itemsPerPage, filteredOrders.length]
  );

  // Get current orders for display
  const currentOrders = filteredOrders.slice(
    paginationState.startIndex,
    paginationState.endIndex + 1
  );

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= paginationState.totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      label: "Tranh chấp",
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-10 px-6">
      <div className="max-w-7xl mx-auto">
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
            <span className="font-semibold text-gray-700">Lọc theo trạng thái:</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedStatus === tab.key
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs ${selectedStatus === tab.key
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
                  ? "Bạn chưa có đơn hàng nào. Hãy khám phá các sản phẩm để thuê ngay!"
                  : `Không có đơn hàng nào ở trạng thái "${statusTabs.find((t) => t.key === selectedStatus)?.label || ""}"`}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/products">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Package className="w-4 h-4 mr-2" />
                  Khám phá sản phẩm
                </Button>
              </Link>
            </EmptyContent>
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
                const isRenter =
                  userRole === "renter" ||
                  order.renterId?._id?.toString() === userId?.toString();
                const canReturn =
                  isRenter &&
                  order.orderStatus === "progress" &&
                  order.renterId?._id?.toString() === userId?.toString();

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Product Image */}
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

                      {/* Order Details */}
                      <div className="flex-1 space-y-4">
                        {/* Product Name */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {order.itemSnapshot?.title || order.itemId?.Title || "Sản phẩm không xác định"}
                          </h3>
                        </div>

                        {/* Order Status & Payment Status */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </div>
                          <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${paymentInfo.color}`}>
                            {paymentInfo.label}
                          </div>
                        </div>

                        {/* Rental Period & Details */}
                        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Calendar className="w-5 h-5 text-emerald-600" />
                              <span className="font-medium">Thời gian thuê:</span>
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
                                Cọc: {order.depositAmount.toLocaleString("vi-VN")}{" "}
                                {order.currency}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                {isRenter ? "Người cho thuê" : "Người thuê"}
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {isRenter
                                  ? order.ownerId?.fullName || "N/A"
                                  : order.renterId?.fullName || "N/A"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isRenter
                                  ? order.ownerId?.email
                                  : order.renterId?.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
                          <div className="flex gap-3">
                            {onOpenDetail ? (
                              <Button
                                variant="outline"
                                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onOpenDetail(order._id);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Xem chi tiết
                              </Button>
                            ) : (
                              <Link href={`/auth/order/${order._id}`}>
                                <Button
                                  variant="outline"
                                  className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Xem chi tiết
                                </Button>
                              </Link>
                            )}
                            {canReturn && (
                              <Button
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                  setOpenConfirm(true);
                                }}
                                disabled={processing === order._id}
                              >
                                {processing === order._id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang xử lý...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Trả hàng
                                  </>
                                )}
                              </Button>
                            )}
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
                    onClick={() => handlePageChange(paginationState.currentPage - 1)}
                    disabled={!paginationState.hasPrevPage}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Trước
                  </Button>

                  {/* Page Numbers */}
                  {generatePageNumbers(paginationState.currentPage, paginationState.totalPages, 5).map((pageNum) => (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={pageNum === paginationState.currentPage ? "default" : "outline"}
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
                    onClick={() => handlePageChange(paginationState.currentPage + 1)}
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

        {/* Confirm Return Dialog */}
        <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-teal-600" />
                Xác nhận trả hàng
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-700">
                Bạn có chắc chắn muốn xác nhận đã trả hàng cho đơn hàng này không?
              </p>
              {selectedOrder && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-800">
                    {selectedOrder.itemSnapshot?.title ||
                      selectedOrder.itemId?.Title}
                  </p>
                  <p className="text-xs text-gray-600">
                    Mã đơn: {selectedOrder.orderGuid}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setOpenConfirm(false)}
                disabled={!!processing}
              >
                Hủy
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={handleConfirmReturn}
                disabled={!!processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Xác nhận
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
