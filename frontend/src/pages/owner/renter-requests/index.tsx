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
  receiveOrder,
} from "@/services/auth/order.api";
import type { Order } from "@/services/auth/order.api";
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
import { AlertCircle, ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";
import { useRouter } from "next/navigation";
import { createDispute } from "@/services/moderator/disputeOrder.api";
import DisputeModal from "@/components/ui/owner/add-dispute-form";
export default function OwnerRenterRequests() {
  return (
    <OwnerLayout>
      <RenterRequestsContent />
    </OwnerLayout>
  );
}

function RenterRequestsContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal Từ chối
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Modal Khiếu nại
  const [openDisputeModal, setOpenDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [selectedDisputeOrderId, setSelectedDisputeOrderId] = useState<
    string | null
  >(null);

  const [selectedStatus, setSelectedStatus] = useState("all");
  const router = useRouter();

  // Tabs & Đếm
  const getCount = (status: string) => {
    if (status === "all") return orders.length;
    return orders.filter((o) => o.orderStatus === status).length;
  };

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

  // Fetch đơn hàng
  useEffect(() => {
    const fetchOrders = async () => {
      if (refreshKey === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const res = await listOrdersByOwner();
        if (res.code === 200 && Array.isArray(res.data)) {
          setOrders(res.data);
        } else {
          toast.error("Không thể tải danh sách đơn hàng.");
        }
      } catch (err) {
        toast.error("Lỗi kết nối, vui lòng thử lại.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };
    fetchOrders();
  }, [refreshKey]);

  const filteredOrders =
    selectedStatus === "all"
      ? orders
      : orders.filter((o) => o.orderStatus === selectedStatus);

  const formatDate = (date: string) => format(new Date(date), "dd/MM/yyyy");

  // Xử lý hành động
  const handleConfirm = async (orderId: string) => {
    const res = await confirmOrder(orderId);
    if (res.code === 200) {
      toast.success("Đã xác nhận đơn hàng");
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error(res.message || "Lỗi khi xác nhận đơn hàng");
    }
  };

  const handleOpenRejectModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRejectReason("");
    setOpenRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim())
      return toast.error("Vui lòng nhập lý do từ chối.");
    if (!selectedOrderId) return;

    const res = await cancelOrder(selectedOrderId, rejectReason);
    if (res.code === 200) {
      toast.success("Đã từ chối đơn hàng");
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error(res.message || "Lỗi khi từ chối đơn hàng");
    }
    setOpenRejectModal(false);
  };

  // Bắt đầu giao hàng (Owner)
  const handleStartDelivery = async (order: Order) => {
    // Kiểm tra thanh toán
    if (order.paymentStatus !== "paid") {
      return toast.error("Khách hàng chưa thanh toán. Không thể giao hàng.");
    }

    // Chỉ yêu cầu ký hợp đồng nếu đơn trên 2 triệu
    if (order.totalAmount > 2_000_000 && !order.isContractSigned) {
      return toast.error(
        "Hợp đồng chưa được ký. Không thể giao hàng với đơn trên 2 triệu."
      );
    }

    const res = await startDelivery(order._id);
    if (res.code === 200) {
      toast.success("Đơn hàng đang giao!");
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error(res.message || "Không thể bắt đầu giao hàng");
    }
  };

  const handleStartOrder = async (order: Order) => {
    // Kiểm tra thanh toán

    const res = await startOrder(order._id);
    if (res.code === 200) {
      toast.success("Đơn hàng đã bắt đầu thuê thành công!");
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error(res.message || "Không thể bắt đầu thuê");
    }
  };
  const handleConfirmReturn = async (orderId: string) => {
    const res = await ownerComplete(orderId, {
      conditionStatus: "Good",
      ownerNotes: "Hàng đã kiểm tra, không hư hại.",
    });
    if (res.code === 200) {
      toast.success("Đã xác nhận trả hàng");
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error(res.message || "Lỗi khi xác nhận trả hàng");
    }
  };

  const handleOpenDisputeModal = (orderId: string) => {
    setSelectedDisputeOrderId(orderId);
    setDisputeReason("");
    setOpenDisputeModal(true);
  };

  const handleConfirmDispute = async () => {
    if (!disputeReason.trim()) {
      return toast.error("Vui lòng nhập lý do Khiếu nại.");
    }
    if (!selectedDisputeOrderId) return;

    const res = await createDispute({
      orderId: selectedDisputeOrderId,
      reason: disputeReason,
      description: disputeReason,
    });

    if (res.code === 201) {
      toast.success("Đã gửi yêu cầu Khiếu nạithành công!");
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error(res.message || "Gửi Khiếu nạithất bại.");
    }

    setOpenDisputeModal(false);
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
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              selectedStatus === tab.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
            }`}
          >
            <span>{tab.label}</span>
            <Badge
              className={`text-xs ${
                selectedStatus === tab.key
                  ? "bg-white text-blue-600"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              {getCount(tab.key)}
            </Badge>
          </button>
        ))}
      </div>

      {/* Danh sách đơn hàng */}
      {loading ? (
        <p className="text-center py-10 font-medium">Đang tải dữ liệu...</p>
      ) : filteredOrders.length === 0 ? (
        <p className="text-center py-10 text-gray-500">
          Không có đơn hàng trong trạng thái này.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card
              key={order._id}
              className="transition hover:shadow-lg cursor-pointer"
              onClick={() => router.push(`/owner/orders/${order._id}`)}
            >
              {/* Header mã đơn */}
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
                <img
                  src={
                    order.itemSnapshot?.images?.[0] || order.itemId?.Images?.[0]
                  }
                  alt="item"
                  className="w-20 h-20 object-cover rounded-md"
                />
                <div className="flex-1">
                  <CardTitle>
                    {order.itemSnapshot?.title || order.itemId?.Title}
                  </CardTitle>
                  <div className="text-sm text-gray-600">
                    Người thuê:{" "}
                    <span className="font-medium">
                      {order.renterId?.fullName}
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
                  {order.finalAmount !== undefined
                    ? order.finalAmount.toLocaleString()
                    : "-"}{" "}
                  {order.currency}
                </div>
              </CardHeader>

              {/* Nút hành động */}
              <CardContent className="flex justify-end gap-3">
                {/* Pending */}
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
                  <div className="flex justify-between items-center w-full">
                    <div className="flex gap-4 items-center">
                      {/* Cảnh báo chưa thanh toán */}
                      {order.paymentStatus !== "paid" && (
                        <div className="flex items-center gap-1 text-red-500">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs">Chưa thanh toán</span>
                        </div>
                      )}

                      {/* Cảnh báo hợp đồng nếu > 2 triệu */}
                      {!order.isContractSigned &&
                        order.totalAmount > 2_000_000 && (
                          <div className="flex items-center gap-1 text-red-500">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">Chưa ký hợp đồng</span>
                          </div>
                        )}

                      {/* Thông báo nhẹ nếu dưới 2 triệu */}
                      {!order.isContractSigned &&
                        order.totalAmount <= 2_000_000 && (
                          <div className="flex items-center gap-1 text-blue-700 text-xs">
                            <AlertCircle className="w-4 h-4" />
                            <span>
                              Không bắt buộc ký hợp đồng (dưới 2 triệu)
                            </span>
                          </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                      {/* Nút "Giao hàng" */}
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

                {/* Progress */}
                {order.orderStatus === "progress" && (
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
                )}

                {/* Returned */}
                {order.orderStatus === "returned" && (
                  <>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Từ chối */}
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
            toast.success("Đã gửi yêu cầu Khiếu nạithành công!");
            setRefreshKey((prev) => prev + 1);
          } else {
            toast.error(res.message || "Gửi Khiếu nạithất bại.");
          }
          setOpenDisputeModal(false); // đóng modal luôn
        }}
      />
    </div>
  );
}
