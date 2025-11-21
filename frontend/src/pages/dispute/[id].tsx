/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getDisputeById } from "@/services/moderator/disputeOrder.api";
import { format } from "date-fns";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Package,
  User,
  XCircle,
  Image as ImageIcon,
  Eye,
  DollarSign,
  Gavel,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/common/button";
import { Card } from "@/components/ui/common/card";
import { toast } from "sonner";

interface OrderSnapshot {
  _id: string;
  orderGuid: string;
  orderStatus: string;
  totalAmount: number;
  itemSnapshot?: {
    title?: string;
    images?: string[];
    basePrice?: number;
    priceUnit?: string;
  };
  rentalDuration?: number;
  rentalUnit?: string;
  unitCount?: number;
  depositAmount?: number;
  serviceFee?: number;
  createdAt?: string;
}

interface Dispute {
  _id: string;
  orderId: string | OrderSnapshot;
  reporterId: { _id: string; fullName: string; email: string };
  reportedUserId: { _id: string; fullName: string; email: string };
  reason: string;
  description?: string;
  evidence?: string[];
  status: "Pending" | "In Progress" | "Reviewed" | "Resolved" | "Rejected";
  resolution?: {
    decision: string;
    notes?: string;
    refundAmount: number;
    refundPercentage?: number;
    refundTarget?: "reporter" | "reported";
  };
  handledBy?: { _id: string; fullName: string };
  handledAt?: string;
  createdAt: string;
}

const statusConfig = {
  Pending: {
    label: "Đang chờ",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  "In Progress": {
    label: "Đang xử lý",
    color: "bg-blue-100 text-blue-800",
    icon: Clock,
  },
  Reviewed: {
    label: "Đang xem xét",
    color: "bg-blue-100 text-blue-800",
    icon: AlertCircle,
  },
  Resolved: {
    label: "Đã giải quyết",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  Rejected: {
    label: "Bị từ chối",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

const getRefundTargetLabel = (target?: string): string => {
  if (target === "reporter") return "Người khiếu nại (người thuê)";
  if (target === "reported") return "Người bị khiếu nại (người bán)";
  return "Không áp dụng";
};

const getOrderStatusLabel = (status?: string) => {
  if (!status) return "Không xác định";
  const map: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    delivering: "Đang giao",
    delivered: "Đã giao",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
    disputed: "Đang tranh chấp",
    refunded: "Đã hoàn tiền",
  };
  return map[status.toLowerCase()] || status;
};

const getPaymentStatusLabel = (status?: string) => {
  if (!status) return "Không xác định";
  const map: Record<string, string> = {
    pending: "Chờ thanh toán",
    not_paid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
    partial: "Thanh toán một phần",
    failed: "Thanh toán thất bại",
  };
  return map[status.toLowerCase()] || status;
};

const getUnitName = (priceUnit?: string) => {
  const map: Record<string, string> = {
    "1": "giờ",
    "2": "ngày",
    "3": "tuần",
    "4": "tháng",
  };
  return map[priceUnit || ""] || "đơn vị";
};

function ImagePreview({
  src,
  index,
  total,
}: {
  src: string;
  index: number;
  total: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
   
      <div
        onClick={() => setOpen(true)}
        className="group relative block rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-zoom-in bg-gray-100 border border-gray-200"
      >

        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
            <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
          </div>
        )}

      
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 text-gray-500 z-10">
            <AlertCircle className="w-12 h-12 mb-2" />
            <p className="text-sm font-medium">Không tải được</p>
          </div>
        )}


        <img
          src={src}
          alt={`Bằng chứng ${index}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-48 object-cover transition-all duration-700 ${
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
          } group-hover:scale-110`}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
            {index}/{total}
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <Eye className="w-12 h-12 text-white drop-shadow-lg" />
        </div>
      </div>

      {/* Modal fullscreen */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-5xl max-h-full p-4">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-3 transition z-10"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <img
              src={src}
              alt={`Bằng chứng ${index}`}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
              {index} / {total}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DisputeDetailPage() {
  const router = useRouter();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    const rawId = router.query.id;
    let disputeId = "";

    if (typeof rawId === "string") {
      disputeId = rawId;
    } else if (Array.isArray(rawId)) {
      disputeId = rawId[0];
    } else if (rawId && typeof rawId === "object") {
      disputeId = Object.values(rawId)[0] as string;
    }

    if (!disputeId || disputeId === "[object Object]") {
      console.error("disputeId is invalid:", disputeId);
      setError(true);
      setLoading(false);
      return;
    }

    getDisputeById(disputeId)
      .then((res) => {
        if (res.code === 200 && res.data) {
          setDispute(res.data);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        console.error("Error fetching dispute:", err);
        toast.error("Không tải được thông tin tranh chấp");
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [router.isReady, router.query.id]);

  // Đóng modal bằng phím ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.body.click(); // Đóng tất cả modal
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const formatDate = (date: string) =>
    format(new Date(date), "dd/MM/yyyy HH:mm");

  if (loading) return <LoadingSkeleton />;
  if (error || !dispute) return <NotFound />;

  const statusInfo = statusConfig[dispute.status];
  const StatusIcon = statusInfo.icon;
  const order =
    dispute.orderId && typeof dispute.orderId === "object"
      ? (dispute.orderId as OrderSnapshot)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-10 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600">
          <Link href="/order" className="hover:text-blue-600 transition">
            Đơn hàng
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">
            Tranh chấp #{dispute._id.slice(-6)}
          </span>
        </nav>

        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-8 rounded-3xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm opacity-90">Mã tranh chấp</p>
              <p className="text-3xl font-bold tracking-tight">{dispute._id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Trạng thái</p>
              <div
                className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-lg font-bold ${statusInfo.color}`}
              >
                <StatusIcon className="w-6 h-6" />
                {statusInfo.label}
              </div>
            </div>
          </div>
        </div>

        {/* Order Info */}
        {order && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Package className="w-7 h-7 text-emerald-600" />
              Thông tin đơn hàng
            </h2>
            <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-gray-800">
                    Mã đơn:{" "}
                    <span className="text-emerald-700">{order.orderGuid}</span>
                  </p>
                  <p className="text-gray-600">
                    Trạng thái:{" "}
                    <span className="font-medium">
                      {getOrderStatusLabel(order.orderStatus)}
                    </span>
                  </p>
                </div>
                {order._id && (
                  <Link href={`/order/${order._id}`}>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Eye className="w-5 h-5 mr-2" />
                      Xem chi tiết đơn
                    </Button>
                  </Link>
                )}
              </div>
              <div className="grid gap-6 md:grid-cols-[220px,1fr]">
                <div className="relative h-52 rounded-2xl overflow-hidden bg-white shadow-inner border border-emerald-100">
                  {order.itemSnapshot?.images &&
                  order.itemSnapshot.images.length > 0 ? (
                    <img
                      src={order.itemSnapshot.images[0]}
                      alt={order.itemSnapshot.title || "Ảnh sản phẩm"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-400">
                      <Package className="w-16 h-16" />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Sản phẩm</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {order.itemSnapshot?.title || "Không rõ"}
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                      <p className="text-xs text-gray-500">Giá thuê</p>
                      <p className="text-lg font-semibold text-emerald-700">
                        {(order.itemSnapshot?.basePrice || 0).toLocaleString(
                          "vi-VN"
                        )}
                        ₫ / {getUnitName(order.itemSnapshot?.priceUnit)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                      <p className="text-xs text-gray-500">Số lượng</p>
                      <p className="text-lg font-semibold">
                        {order.unitCount || 1} món
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        )}

        
        <section className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <User className="w-6 h-6 text-red-600" />
              Người báo cáo
            </h3>
            <Card className="p-6 bg-red-50 border border-red-200">
              <p className="text-lg font-bold text-red-800">
                {dispute.reporterId.fullName}
              </p>
              <p className="text-gray-600">{dispute.reporterId.email}</p>
            </Card>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <User className="w-6 h-6 text-orange-600" />
              Người bị báo cáo
            </h3>
            <Card className="p-6 bg-orange-50 border border-orange-200">
              <p className="text-lg font-bold text-orange-800">
                {dispute.reportedUserId.fullName}
              </p>
              <p className="text-gray-600">{dispute.reportedUserId.email}</p>
            </Card>
          </div>
        </section>

        {/* Nội dung */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <FileText className="w-7 h-7 text-blue-600" />
            Nội dung tranh chấp
          </h2>
          <Card className="p-6 bg-blue-50 border border-blue-200">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Lý do chính
                </p>
                <p className="text-lg px-4 py-2 bg-amber-100 text-red-600">
                       {dispute.reason}
                </p>
              </div>
              {dispute.description && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Mô tả chi tiết
                  </p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border">
                    {dispute.description}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Thời gian gửi:</span>
                <span>{formatDate(dispute.createdAt)}</span>
              </div>
            </div>
          </Card>
        </section>

     
        {dispute.evidence && dispute.evidence.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <ImageIcon className="w-7 h-7 text-purple-600" />
              Bằng chứng ({dispute.evidence.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {dispute.evidence.map((url, i) => (
                <ImagePreview
                  key={i}
                  src={url}
                  index={i + 1}
                  total={dispute.evidence!.length}
                />
              ))}
            </div>
          </section>
        )}

        {/* Kết quả xử lý */}
        {(dispute.status === "Resolved" || dispute.status === "Rejected") &&
          dispute.resolution && (
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Gavel className="w-7 h-7 text-indigo-600" />
                Kết quả xử lý
              </h2>
              <Card
                className={`p-8 border-2 ${
                  dispute.status === "Resolved"
                    ? "bg-green-50 border-green-300"
                    : "bg-red-50 border-red-300"
                }`}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <p className="text-xl font-bold text-gray-800">
                      Quyết định:{" "}
                      <span
                        className={
                          dispute.status === "Resolved"
                            ? "text-green-700"
                            : "text-red-700"
                        }
                      >
                        {dispute.resolution.decision}
                      </span>
                    </p>
                    {dispute.resolution.refundAmount > 0 && (
                      <div className="flex items-center gap-2 text-2xl font-bold text-green-700">
                        <DollarSign className="w-8 h-8" />
                        {dispute.resolution.refundAmount.toLocaleString(
                          "vi-VN"
                        )}{" "}
                        ₫
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/70 rounded-xl p-4 border border-gray-200">
                      <p className="text-sm text-gray-500">Phần trăm hoàn</p>
                      <p className="text-2xl font-bold text-green-700">
                        {dispute.resolution.refundPercentage ?? 0}%
                      </p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-4 border border-gray-200">
                      <p className="text-sm text-gray-500">Hoàn cho</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {getRefundTargetLabel(dispute.resolution.refundTarget)}
                      </p>
                    </div>
                  </div>
                  {dispute.resolution.notes && (
                    <div>
                      <p className="font-semibold text-gray-700 mb-2">
                        Ghi chú từ admin
                      </p>
                      <p className="text-gray-700 italic bg-white p-4 rounded-lg border">
                        &ldquo;{dispute.resolution.notes}&rdquo;
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t">
                    {dispute.handledBy && (
                      <p>
                        <User className="w-4 h-4 inline mr-1" />
                        Xử lý bởi:{" "}
                        <span className="font-bold">
                          {dispute.handledBy.fullName}
                        </span>
                      </p>
                    )}
                    {dispute.handledAt && (
                      <p>Lúc: {formatDate(dispute.handledAt)}</p>
                    )}
                  </div>
                </div>
              </Card>
            </section>
          )}

        {/* Đang xử lý */}
        {dispute.status === "Reviewed" && (
          <Card className="p-8 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
            <p className="text-xl text-blue-700 flex items-center gap-3 font-medium">
              <AlertCircle className="w-8 h-8" />
              Tranh chấp đang được đội ngũ hỗ trợ xem xét kỹ lưỡng.
            </p>
            <p className="text-blue-600 mt-2">
              Bạn sẽ nhận được thông báo khi có kết quả.
            </p>
          </Card>
        )}

        <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
          Cập nhật lần cuối: {formatDate(dispute.createdAt)}
        </div>
      </div>
    </div>
  );
}


function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-10 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded-3xl animate-pulse" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

// Not Found
function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <Card className="max-w-md text-center p-12 bg-white shadow-2xl">
        <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Không tìm thấy tranh chấp
        </h2>
        <p className="text-gray-600 mb-8">
          Mã tranh chấp không tồn tại hoặc đã bị xóa.
        </p>
        <Link href="/order">
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            Quay lại danh sách đơn hàng
          </Button>
        </Link>
      </Card>
    </div>
  );
}
