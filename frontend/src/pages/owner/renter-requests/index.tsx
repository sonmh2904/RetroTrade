"use client";

import { useEffect, useState } from "react";
import OwnerLayout from "../layout";
import {
  listOrdersByOwner,
  confirmOrder,
  cancelOrder,
  startOrder,
  ownerComplete,
  startDelivery,
} from "@/services/auth/order.api";
import {
  getExtensionRequests,
  approveExtension,
  rejectExtension,
} from "@/services/auth/extension.api";
import type { Order } from "@/services/auth/order.api";
import type { ExtensionRequest } from "@/services/auth/extension.api";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/common/card";
import { Badge } from "@/components/ui/common/badge";
import { Button } from "@/components/ui/common/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertCircle, ClipboardList, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { createDispute } from "@/services/moderator/disputeOrder.api";
import DisputeModal from "@/components/ui/owner/add-dispute-form";
import ExtensionRequestModal from "@/components/ui/owner/extension-request-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";
import Image from "next/image";

export default function OwnerRenterRequests() {
  return (
    <OwnerLayout>
      <RenterRequestsContent />
    </OwnerLayout>
  );
}

function RenterRequestsContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingExtensions, setPendingExtensions] = useState<
    (ExtensionRequest & { orderGuid: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingExt, setLoadingExt] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal Từ chối
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Modal Khiếu nại
  const [openDisputeModal, setOpenDisputeModal] = useState(false);
  const [selectedDisputeOrderId, setSelectedDisputeOrderId] = useState<
    string | null
  >(null);

  const [selectedStatus, setSelectedStatus] = useState("all");
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const [selectedExtension, setSelectedExtension] = useState<
    (ExtensionRequest & { orderGuid: string }) | null
  >(null);

  // XÓA TAB "extension_pending" - GIỮ LẠI HIỆU ỨNG NHÁY Ở TAB "Đang thuê"
  const tabs = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Yêu cầu đơn hàng" },
    { key: "confirmed", label: "Đã xác nhận" },
    { key: "delivery", label: "Đã giao hàng" },
    { key: "received", label: "Đã nhận hàng" },
    { key: "progress", label: "Đang thuê" },
    { key: "returned", label: "Chờ xác nhận trả hàng" },
    { key: "completed", label: "Hoàn tất" },
    { key: "cancelled", label: "Đã hủy" },
    { key: "disputed", label: "Khiếu nại" },
  ];

  // Đếm số yêu cầu gia hạn đang chờ
  const pendingExtensionCount = pendingExtensions.length;

  const getCount = (key: string) => {
    if (key === "all") return orders.length;
    if (key === "progress")
      return orders.filter((o) => o.orderStatus === "progress").length;
    return orders.filter((o) => o.orderStatus === key).length;
  };

  const statusLabel: Record<string, string> = {
    pending: "Đang chờ xác nhận",
    confirmed: "Đã xác nhận",
    delivery: "Đã giao hàng",
    received: "Đã nhận hàng",
    progress: "Đang thuê",
    returned: "Chờ xác nhận trả hàng",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
    disputed: "Khiếu nại",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500",
    confirmed: "bg-blue-500",
    delivery: "bg-green-500",
    received: "bg-blue-400",
    progress: "bg-purple-500",
    returned: "bg-orange-500",
    completed: "bg-green-600",
    cancelled: "bg-red-600",
    disputed: "bg-red-700",
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (refreshKey === 0) setLoading(true);
      else setIsRefreshing(true);

      try {
        const res = await listOrdersByOwner();
        if (res.code === 200 && Array.isArray(res.data)) setOrders(res.data);
      } catch {
        toast.error("Lỗi tải đơn hàng");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };
    fetchOrders();
  }, [refreshKey]);

  useEffect(() => {
    const fetchExtensions = async () => {
      if (orders.length === 0) return;
      setLoadingExt(true);

      const activeOrders = orders.filter((o) =>
        ["confirmed", "delivery", "received", "progress"].includes(
          o.orderStatus
        )
      );

      if (activeOrders.length === 0) {
        setPendingExtensions([]);
        setLoadingExt(false);
        return;
      }

      try {
        const results = await Promise.allSettled(
          activeOrders.map((o) => getExtensionRequests(o._id))
        );

        const list: (ExtensionRequest & { orderGuid: string })[] = [];

        results.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value?.data?.length) {
            r.value.data.forEach((ext: ExtensionRequest) => {
              if (ext.status === "pending") {
                list.push({ ...ext, orderGuid: activeOrders[i].orderGuid });
              }
            });
          }
        });

        setPendingExtensions(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingExt(false);
      }
    };

    fetchExtensions();
  }, [orders, refreshKey]);

  const displayData =
    selectedStatus === "all"
      ? orders
      : orders.filter((o) => o.orderStatus === selectedStatus);

  const totalPages = Math.ceil(displayData.length / limit);
  const paginatedData = displayData.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  useEffect(() => setCurrentPage(1), [selectedStatus]);

  const handleConfirm = async (orderId: string) => {
    const res = await confirmOrder(orderId);
    if (res.code === 200) {
      toast.success("Đã xác nhận đơn hàng");
      setRefreshKey((k) => k + 1);
    } else toast.error(res.message || "Lỗi xác nhận");
  };

  const handleOpenRejectModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRejectReason("");
    setOpenRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return toast.error("Vui lòng nhập lý do từ chối");
    if (!selectedOrderId) return;
    const res = await cancelOrder(selectedOrderId, rejectReason);
    if (res.code === 200) {
      toast.success("Đã từ chối đơn hàng");
      setRefreshKey((k) => k + 1);
    } else toast.error(res.message || "Lỗi từ chối");
    setOpenRejectModal(false);
  };

  const handleStartDelivery = async (order: Order) => {
    if (order.paymentStatus !== "paid")
      return toast.error("Khách chưa thanh toán");
    if (order.totalAmount > 2_000_000 && !order.isContractSigned)
      return toast.error("Hợp đồng chưa ký (>2 triệu)");
    const res = await startDelivery(order._id);
    if (res.code === 200) {
      toast.success("Đơn hàng đang giao!");
      setRefreshKey((k) => k + 1);
    } else toast.error(res.message || "Lỗi giao hàng");
  };

  const handleStartOrder = async (order: Order) => {
    const res = await startOrder(order._id);
    if (res.code === 200) {
      toast.success("Bắt đầu thuê thành công!");
      setRefreshKey((k) => k + 1);
    } else toast.error(res.message || "Lỗi bắt đầu thuê");
  };

  const handleConfirmReturn = async (orderId: string) => {
    const res = await ownerComplete(orderId, {
      conditionStatus: "Good",
      ownerNotes: "Hàng đã kiểm tra, không hư hại.",
    });
    if (res.code === 200) {
      toast.success("Đã xác nhận trả hàng");
      setRefreshKey((k) => k + 1);
    } else toast.error(res.message || "Lỗi xác nhận trả hàng");
  };

  const handleOpenDisputeModal = (orderId: string) => {
    setSelectedDisputeOrderId(orderId);
    setOpenDisputeModal(true);
  };

  const formatDate = (date: string) => format(new Date(date), "dd/MM/yyyy");

  // Lấy yêu cầu gia hạn đang chờ của đơn hàng
  const getPendingExtension = (orderId: string) => {
    return pendingExtensions.find((ext) => ext.orderId === orderId) || null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 relative">
      <h1 className="text-2xl font-bold mb-6">Quản lý đơn thuê hàng</h1>

      {isRefreshing && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white px-5 py-3 rounded-full shadow-lg border border-gray-200">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-gray-700">
            Đang cập nhật...
          </span>
        </div>
      )}

      {/* Tabs - Badge đỏ nháy ở "Đang thuê" nếu có gia hạn */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              selectedStatus === tab.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
            }`}
          >
            <span>{tab.label}</span>
            {getCount(tab.key) > 0 && (
              <Badge className="text-xs bg-gray-300 text-gray-700">
                {getCount(tab.key)}
              </Badge>
            )}
            {tab.key === "progress" && pendingExtensionCount > 0 && (
              <>
                <Badge className="text-xs bg-red-500 text-white animate-pulse ml-1">
                  Có {pendingExtensionCount} yêu cầu gia hạn
                </Badge>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping" />
              </>
            )}
          </button>
        ))}
      </div>

      {loading || loadingExt ? (
        <p className="text-center py-10 font-medium">Đang tải dữ liệu...</p>
      ) : displayData.length === 0 ? (
        <p className="text-center py-10 text-gray-500">
          Không có đơn hàng trong trạng thái này.
        </p>
      ) : (
        <div className="space-y-4">
          {paginatedData.map((order: Order) => {
            const extension = getPendingExtension(order._id);

            return (
              <Card
                key={order._id}
                className="transition hover:shadow-lg cursor-pointer relative"
                onClick={() =>
                  router.push(`/owner/renter-requests/${order._id}`)
                }
              >
                {/* Badge yêu cầu gia hạn nếu có */}
                {extension && (
                  <div className="absolute -top-3 -right-3 z-10">
                    <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse shadow-lg">
                      <Clock className="w-4 h-4 mr-1" />
                      Người thuê yêu cầu gia hạn
                    </Badge>
                  </div>
                )}

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 border-b border-blue-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                    <ClipboardList className="w-4 h-4" />
                    Mã đơn:{" "}
                    <span className="font-mono">
                      #{order.orderGuid.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>

                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="relative w-20 h-20 rounded-md overflow-hidden bg-gray-200">
                    <Image
                      src={
                        order.itemSnapshot?.images?.[0] || "/placeholder.png"
                      }
                      alt="item"
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1">
                    <CardTitle>
                      {order.itemSnapshot?.title || "Không có tiêu đề"}
                    </CardTitle>
                    <div className="text-sm text-gray-600">
                      Người thuê:{" "}
                      <span className="font-medium">
                        {order.renterId?.fullName || "Khách"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Thời gian:{" "}
                      <span className="font-medium">
                        {formatDate(order.startAt)} → {formatDate(order.endAt)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <Badge
                        className={
                          statusColor[order.orderStatus] || "bg-gray-500"
                        }
                      >
                        {statusLabel[order.orderStatus] || order.orderStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right font-semibold text-blue-600">
                    {order.finalAmount?.toLocaleString() || "0"}{" "}
                    {order.currency}
                  </div>
                </CardHeader>

                <CardContent className="flex justify-end gap-3">
                  {order.orderStatus === "pending" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRejectModal(order._id);
                        }}
                      >
                        Từ chối
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#6677ee] hover:bg-blue-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirm(order._id);
                        }}
                      >
                        Xác nhận
                      </Button>
                    </>
                  )}

                  {order.orderStatus === "confirmed" && (
                    <div className="flex w-full items-center justify-between">
                      <div className="flex gap-4 items-center">
                        {order.paymentStatus !== "paid" && (
                          <div className="flex items-center gap-1 text-red-500">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">Chưa thanh toán</span>
                          </div>
                        )}
                        {!order.isContractSigned &&
                          order.totalAmount > 2_000_000 && (
                            <div className="flex items-center gap-1 text-red-500">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs">Chưa ký hợp đồng</span>
                            </div>
                          )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        disabled={
                          order.paymentStatus !== "paid" ||
                          (order.totalAmount > 2_000_000 &&
                            !order.isContractSigned)
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDelivery(order);
                        }}
                      >
                        Giao hàng
                      </Button>
                    </div>
                  )}

                  {order.orderStatus === "received" && (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartOrder(order);
                      }}
                    >
                      Bắt đầu thuê
                    </Button>
                  )}

                  {(order.orderStatus === "progress" ||
                    order.orderStatus === "returned") && (
                    <>
                      {extension && (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-md animate-pulse"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExtension(extension);
                          }}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Gia hạn
                        </Button>
                      )}

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDisputeModal(order._id);
                        }}
                      >
                        Khiếu nại
                      </Button>
                    </>
                  )}

                  {order.orderStatus === "returned" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmReturn(order._id);
                      }}
                    >
                      Xác nhận trả hàng
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ← Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 border rounded ${
                currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-white"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Sau →
          </button>
        </div>
      )}

      {/* Các modal giữ nguyên */}
      <Dialog open={openRejectModal} onOpenChange={setOpenRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu thuê</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            placeholder="Nhập lý do từ chối..."
            className="w-full border rounded px-3 py-2 mt-2"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenRejectModal(false)}>
              Hủy
            </Button>
            <Button className="bg-[#6677ee]" onClick={handleConfirmReject}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Khiếu nại*/}
      <DisputeModal
        open={openDisputeModal}
        onOpenChange={setOpenDisputeModal}
        orderId={selectedDisputeOrderId}
        onSubmit={async ({ reason, description, evidence }) => {
          if (!selectedDisputeOrderId) return;

          const res = await createDispute({
            orderId: selectedDisputeOrderId,
            reason,
            description,
            evidence,
          });

          if (res.code === 201) {
            toast.success("Đã gửi khiếu nại thành công!");
            setRefreshKey((k) => k + 1);
          } else toast.error(res.message || "Gửi khiếu nại thất bại");
          setOpenDisputeModal(false);
        }}
      />

      <ExtensionRequestModal
        open={!!selectedExtension}
        onOpenChange={(open) => !open && setSelectedExtension(null)}
        extension={selectedExtension}
        onApprove={async (orderId: string, extId: string) => {
          const res = await approveExtension(orderId, extId);
          if (res.code === 200) {
            toast.success("Phê duyệt gia hạn thành công!");
            setRefreshKey((k) => k + 1);
            setSelectedExtension(null);
          }
        }}
        onReject={async (orderId: string, extId: string, reason: string) => {
          const res = await rejectExtension(orderId, extId, {
            rejectReason: reason,
          });
          if (res.code === 200) {
            toast.success("Từ chối gia hạn thành công");
            setRefreshKey((k) => k + 1);
            setSelectedExtension(null);
          }
        }}
      />
    </div>
  );
}
