// File: app/dispute/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
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
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/common/button";
import { Card } from "@/components/ui/common/card";
import { toast } from "sonner";

// Import đúng type từ API service
import { getDisputeById } from "@/services/moderator/disputeOrder.api";
import type { ApiResponse } from "@iService";

// Type hỗ trợ khi backend populate user
interface PopulatedUser {
  _id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
}

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
  unitCount?: number;
}

// Dữ liệu thật từ backend (reporterId/reportedUserId có thể là string hoặc object)
interface DisputeFromAPI {
  _id: string;
  orderId: string | OrderSnapshot;
  orderGuid: string;
  reporterId: string | PopulatedUser;
  reportedUserId: string | PopulatedUser;
  reason: string;
  description?: string;
  evidence: string[];
  status: "Pending" | "In Progress" | "Reviewed" | "Resolved" | "Rejected";
  resolution?: {
    decision: string;
    notes?: string;
    refundAmount: number;
    refundPercentage?: number;
    refundTarget?: "reporter" | "reported";
  };
  handledBy?: PopulatedUser;
  handledAt?: string;
  createdAt: string;
}

// Helper hiển thị user an toàn
const getUserDisplay = (user: string | PopulatedUser | undefined) => {
  if (!user) return { fullName: "Không xác định", email: "" };
  if (typeof user === "string") return { fullName: "Đang tải...", email: "" };
  return user;
};

// Config trạng thái
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
} as const;

const getRefundTargetLabel = (target?: string) =>
  target === "reporter"
    ? "Người khiếu nại (người thuê)"
    : target === "reported"
    ? "Người bị khiếu nại (người cho thuê)"
    : "Không áp dụng";

const getOrderStatusLabel = (status?: string) => {
  const map: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    progress: "Đang thuê",
    delivering: "Đang giao",
    returned: "Đã trả",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
    disputed: "Đang Khiếu nại",
    refunded: "Đã hoàn tiền",
  };
  return map[(status || "").toLowerCase()] || status || "Không xác định";
};

const getUnitName = (unit?: string) => {
  const map = { "1": "giờ", "2": "ngày", "3": "tuần", "4": "tháng" };
  return map[unit as keyof typeof map] || "đơn vị";
};

// Component xem ảnh
function ImagePreview({
  src,
  index,
  total,
}: {
  src: string;
  index: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="group relative block rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-zoom-in bg-gray-100 border border-gray-200"
      >
        <Image
          src={src}
          alt={`Bằng chứng ${index}`}
          width={600}
          height={400}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
          onError={(e) => {
            e.currentTarget.src = "/placeholder-image.png";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
            {index}/{total}
          </span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <Eye className="w-12 h-12 text-white drop-shadow-lg" />
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-5xl max-h-full p-4">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-3 z-10"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <Image
              src={src}
              alt={`Bằng chứng ${index}`}
              width={1200}
              height={800}
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

// Loading & NotFound (đã fix return đúng cách)
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-10 px-6">
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
      <div className="h-48 bg-gray-200 rounded-3xl animate-pulse" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="h-32 bg-gray-200 rounded-200 rounded-2xl animate-pulse" />
        <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
      <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
    </div>
  </div>
);

const NotFound = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-6">
    <Card className="max-w-md text-center p-12 bg-white shadow-2xl">
      <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
      <h2 className="text-2xl font-bold text-gray-800 mb-3">
        Không tìm thấy Khiếu nại
      </h2>
      <p className="text-gray-600 mb-8">
        Mã Khiếu nạikhông tồn tại hoặc đã bị xóa.
      </p>
      <Link href="/order">
        <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
          Quay lại danh sách đơn hàng
        </Button>
      </Link>
    </Card>
  </div>
);

export default function DisputeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [dispute, setDispute] = useState<DisputeFromAPI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    getDisputeById(id)
      .then((res: ApiResponse<DisputeFromAPI>) => {
        if (res.code === 200 && res.data) {
          setDispute(res.data);
        } else {
          toast.error("Không tìm thấy Khiếu nại");
          router.replace("/order");
        }
      })
      .catch(() => {
        toast.error("Lỗi tải dữ liệu");
        router.replace("/order");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const formatDate = (date: string) =>
    format(new Date(date), "dd/MM/yyyy HH:mm");

  if (loading) return <LoadingSkeleton />;
  if (!dispute) return <NotFound />;

  const statusInfo = statusConfig[dispute.status] || statusConfig.Pending;
  const StatusIcon = statusInfo.icon;

  const reporter = getUserDisplay(dispute.reporterId);
  const reported = getUserDisplay(dispute.reportedUserId);
  const order = typeof dispute.orderId === "object" ? dispute.orderId : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-10 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-8 rounded-3xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm opacity-90">Mã Khiếu nại</p>
              <p className="text-3xl font-bold tracking-tight">
                #{dispute._id.slice(-8).toUpperCase()}
              </p>
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

        {/* Thông tin đơn hàng */}
        {order && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Package className="w-7 h-7 text-emerald-600" /> Thông tin đơn
              hàng
            </h2>
            <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-lg font-semibold">
                    Mã đơn:{" "}
                    <span className="text-emerald-700">
                      #{order.orderGuid.slice(0, 8).toUpperCase()}
                    </span>
                  </p>
                  <p>
                    Trạng thái:{" "}
                    <span className="font-medium">
                      {getOrderStatusLabel(order.orderStatus)}
                    </span>
                  </p>
                </div>
                <Link href={`/auth/my-orders/${order._id}`}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Eye className="w-5 h-5 mr-2" /> Xem chi tiết
                  </Button>
                </Link>
              </div>

              <div className="grid md:grid-cols-[220px,1fr] gap-6">
                <div className="relative h-100 rounded-2xl overflow-hidden bg-white shadow-inner border">
                  {order.itemSnapshot?.images?.[0] ? (
                    <Image
                      src={order.itemSnapshot.images[0]}
                      alt={order.itemSnapshot.title || "Ảnh sản phẩm"}
                      fill
                      className="object-cover"
                      unoptimized // Thêm dòng này nếu ảnh từ domain ngoài (rất quan trọng!)
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-emerald-400 bg-gray-50">
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
                    <div className="bg-white rounded-2xl p-4 border">
                      <p className="text-xs text-gray-500">Giá thuê</p>
                      <p className="text-lg font-semibold text-emerald-700">
                        {(order.itemSnapshot?.basePrice || 0).toLocaleString(
                          "vi-VN"
                        )}
                        ₫ / {getUnitName(order.itemSnapshot?.priceUnit)}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border">
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

        {/* Người khiếu nại & bị khiếu nại */}
        <section className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              <User className="w-6 h-6 text-red-600" /> Người khiếu nại
            </h3>
            <Card className="p-6 bg-red-50 border border-red-200">
              <p className="text-lg font-bold text-red-800">
                {reporter.fullName}
              </p>
              <p className="text-gray-600">{reporter.email}</p>
            </Card>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              <User className="w-6 h-6 text-orange-600" /> Người bị khiếu nại
            </h3>
            <Card className="p-6 bg-orange-50 border border-orange-200">
              <p className="text-lg font-bold text-orange-800">
                {reported.fullName}
              </p>
              <p className="text-gray-600">{reported.email}</p>
            </Card>
          </div>
        </section>

        {/* Nội dung khiếu nại */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <FileText className="w-7 h-7 text-blue-600" /> Nội dung khiếu nại
          </h2>
          <Card className="p-6 bg-blue-50 border border-blue-200">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Lý do
                </p>
                <p className="text-lg px-4 py-2 bg-amber-100 text-red-600 rounded-lg">
                  {dispute.reason}
                </p>
              </div>
              {dispute.description && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Chi tiết
                  </p>
                  <p className="bg-white p-4 rounded-lg border whitespace-pre-wrap leading-relaxed">
                    {dispute.description}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-5 h-5" />
                <span>Gửi lúc: {formatDate(dispute.createdAt)}</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Bằng chứng */}
        {dispute.evidence.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <ImageIcon className="w-7 h-7 text-purple-600" /> Bằng chứng (
              {dispute.evidence.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {dispute.evidence.map((url, i) => (
                <ImagePreview
                  key={i}
                  src={url}
                  index={i + 1}
                  total={dispute.evidence.length}
                />
              ))}
            </div>
          </section>
        )}

        {/* Kết quả xử lý */}
        {(dispute.status === "Resolved" || dispute.status === "Rejected") &&
          dispute.resolution && (
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Gavel className="w-7 h-7 text-indigo-600" /> Kết quả xử lý
              </h2>
              <Card
                className={`p-8 border-2 ${
                  dispute.status === "Resolved"
                    ? "bg-green-50 border-green-300"
                    : "bg-red-50 border-red-300"
                }`}
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xl font-bold">
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
                      <p className="text-3xl font-bold text-green-600">
                        {dispute.resolution.refundAmount.toLocaleString(
                          "vi-VN"
                        )}
                        ₫
                      </p>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white/70 p-4 rounded-xl border">
                      <p className="text-sm text-gray-500">Hoàn tiền</p>
                      <p className="text-2xl font-bold text-green-700">
                        {dispute.resolution.refundPercentage ?? 0}%
                      </p>
                    </div>
                    <div className="bg-white/70 p-4 rounded-xl border">
                      <p className="text-sm text-gray-500">Hoàn cho</p>
                      <p className="text-lg font-semibold">
                        {getRefundTargetLabel(dispute.resolution.refundTarget)}
                      </p>
                    </div>
                  </div>
                  {dispute.resolution.notes && (
                    <p className="italic bg-white p-4 rounded-lg border">
                      &ldquo;{dispute.resolution.notes}&rdquo;
                    </p>
                  )}
                  {dispute.handledBy && (
                    <p className="text-sm text-gray-600">
                      <User className="w-4 h-4 inline mr-1" /> Xử lý bởi:{" "}
                      <span className="font-bold">
                        {dispute.handledBy.fullName}
                      </span>
                    </p>
                  )}
                </div>
              </Card>
            </section>
          )}

        {/* Đang xem xét */}
        {dispute.status === "Reviewed" && (
          <Card className="p-8 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 text-center">
            <AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="text-xl font-medium text-blue-700">
              Khiếu nạiđang được đội ngũ hỗ trợ xem xét kỹ lưỡng
            </p>
            <p className="text-blue-600 mt-2">
              Bạn sẽ nhận được thông báo khi có kết quả.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
