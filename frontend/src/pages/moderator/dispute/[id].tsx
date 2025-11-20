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
  MapPin,
  CreditCard,
  Store,
  Home,
  ShoppingBag,
  ChevronRight,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/common/button";
import { Card } from "@/components/ui/common/card";
import { toast } from "sonner";
import Image from "next/image";
import DisputeResolutionForm from "@/components/ui/moderator/dispute/DisputeResolutionForm";

interface Order {
  _id: string;
  orderGuid: string;
  orderStatus: string;
  totalAmount: number;
  depositAmount?: number;
  serviceFee?: number;
  rentalDuration?: number;
  rentalUnit?: string;
  unitCount?: number;
  paymentMethod: string;
  paymentStatus: string;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  shippingAddress: {
    fullName: string;
    street: string;
    ward: string;
    province: string;
    phone: string;
  };
  itemSnapshot: {
    title: string;
    images: string[];
    basePrice: number;
    priceUnit: string;
  };
  renterId?: {
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  ownerId?: {
    fullName: string;
    email: string;
    avatarUrl?: string;
    userGuid?: string;
  };
}

interface Dispute {
  _id: string;
  orderId: Order;
  reporterId: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  reportedUserId: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  reason: string;
  description?: string;
  evidence?: string[];
  status: "Pending" | "Reviewed" | "Resolved" | "Rejected";
  resolution?: {
    decision: string;
    notes?: string;
    refundAmount: number;
    refundPercentage?: number;
    refundTo?: "reporter" | "reportedUser";
  };
  handledBy?: { _id: string; fullName: string };
  handledAt?: string;
  createdAt: string;
}


const getUnitName = (priceUnit: string | undefined): string => {
  const map: Record<string, string> = {
    "1": "giờ",
    "2": "ngày",
    "3": "tuần",
    "4": "tháng",
  };
  return map[priceUnit || ""] || "đơn vị";
};

const calculateRentalAmount = (order: Order): number => {
  const basePrice = order.itemSnapshot.basePrice ?? 0;
  const duration = order.rentalDuration ?? 0;
  const count = order.unitCount ?? 1;
  return basePrice * duration * count;
};

const getPaymentStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    pending: "Chờ thanh toán",
    not_paid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
    partial: "Thanh toán một phần",
  };
  return map[status.toLowerCase()] || status;
};

const statusConfig = {
  Pending: {
    label: "Đang chờ",
    color: "bg-yellow-100 text-yellow-800",
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

const DECISIONS = [
  { value: "refund_full", label: "Hoàn tiền toàn bộ" },
  { value: "refund_partial", label: "Hoàn tiền một phần" },
  { value: "reject", label: "Từ chối tranh chấp" },
  { value: "keep_for_seller", label: "Giữ tiền cho người bán" },
];


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
      <div className="relative group cursor-zoom-in">
        <img
          src={src}
          onClick={() => setOpen(true)}
          className="w-full h-44 object-cover rounded-xl shadow-lg transition-opacity group-hover:opacity-80"
          alt={`Bằng chứng ${index}/${total}`}
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
          <Eye className="w-8 h-8 text-white" />
        </div>
      </div>
      {open && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <img
            src={src}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            alt="Zoom"
          />
        </div>
      )}
    </>
  );
}

export default function DisputeDetailPage() {
  const router = useRouter();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const disputeId = router.query.id as string;

    getDisputeById(disputeId)
      .then((res) => {
        if (res.code === 200 && res.data) {
          setDispute(res.data);
          setOrder(res.data.orderId);
        } else setError(true);
      })
      .catch(() => {
        toast.error("Lỗi tải tranh chấp");
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [router.isReady]);

  const formatDate = (d: string) => format(new Date(d), "dd/MM/yyyy HH:mm");

  if (loading) return <LoadingSkeleton />;
  if (error || !dispute || !order) return <NotFound />;

  const StatusIcon = statusConfig[dispute.status].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link
              href="/moderator"
              className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 transition"
            >
              <Home className="w-4 h-4" /> Trang điều khiển
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link
              href="/moderator/dispute"
              className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 transition"
            >
              <Gavel className="w-4 h-4" /> Xử lý tranh chấp
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-semibold">
              #{dispute._id.slice(-8).toUpperCase()}
            </span>
          </div>
        </nav>

        <div className="space-y-10">
          {order && (
            <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform hover:scale-[1.005] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10"></div>
              <div className="relative">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 rounded-t-3xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-bold flex items-center gap-4">
                        <Package className="w-10 h-10" />
                        Đơn hàng liên quan
                      </h2>
                      <p className="text-lg opacity-95 mt-2 font-mono">
                        #{order.orderGuid.slice(0, 12).toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-80">Tạo ngày</p>
                      <p className="text-xl font-bold">
                        {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  {/* Sản phẩm */}
                  <div className="group">
                    <div className="flex gap-8 items-start">
                      <div className="relative w-48 h-48 bg-gray-100 rounded-2xl overflow-hidden shadow-lg ring-4 ring-emerald-100 group-hover:ring-emerald-300 transition">
                        {order.itemSnapshot.images[0] ? (
                          <img
                            src={order.itemSnapshot.images[0]}
                            alt={order.itemSnapshot.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-20 h-20 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-4">
                        <h3 className="text-2xl font-bold text-gray-800 group-hover:text-emerald-700 transition">
                          {order.itemSnapshot.title}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-sm">
                          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <p className="text-gray-600">Số lượng</p>
                            <p className="text-xl font-bold text-blue-700">
                              {order.unitCount || 1} cái
                            </p>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                            <p className="text-gray-600">Giá thuê</p>
                            <p className="text-xl font-bold text-emerald-700">
                              {order.itemSnapshot.basePrice.toLocaleString(
                                "vi-VN"
                              )}
                              ₫/{getUnitName(order.itemSnapshot.priceUnit)}
                            </p>
                          </div>
                          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                            <p className="text-gray-600">Tiền cọc</p>
                            <p className="text-xl font-bold text-amber-700">
                              {(order.depositAmount || 0).toLocaleString(
                                "vi-VN"
                              )}
                              ₫
                            </p>
                          </div>
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                            <p className="text-gray-600">Thời gian</p>
                            <p className="text-xl font-bold text-purple-700">
                              {order.rentalDuration} {order.rentalUnit}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-lg font-medium bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 rounded-2xl border border-blue-200">
                          <Clock className="w-6 h-6 text-indigo-600" />
                          <span className="text-indigo-800">
                            {format(
                              new Date(order.startAt || order.createdAt),
                              "dd/MM/yyyy HH:mm"
                            )}{" "}
                            →{" "}
                            {format(
                              new Date(order.endAt || order.createdAt),
                              "dd/MM/yyyy HH:mm"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-gray-200 pt-8"></div>

                  {/* Người tham gia */}
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-7 border-2 border-blue-200 shadow-md hover:shadow-xl transition">
                      <div className="flex items-center gap-5 mb-5">
                        <div className="w-20 h-20 rounded-full bg-blue-200 border-4 border-blue-300 flex items-center justify-center shadow-lg">
                          <User className="w-10 h-10 text-blue-700" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-900">
                            Người thuê
                          </p>
                          <span className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-full">
                            Khách hàng
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3 text-lg">
                        <p className="font-bold text-gray-800">
                          {dispute.reporterId.fullName}
                        </p>
                        <p className="text-gray-600 flex items-center gap-2">
                          <Mail className="w-5 h-5" />{" "}
                          {dispute.reporterId.email}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 rounded-2xl p-7 border-2 border-emerald-200 shadow-md hover:shadow-xl transition">
                      <div className="flex items-center gap-5 mb-5">
                        <div className="w-20 h-20 rounded-full bg-emerald-200 border-4 border-emerald-300 flex items-center justify-center shadow-lg">
                          <Store className="w-10 h-10 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-emerald-900">
                            Chủ cửa hàng
                          </p>
                          <span className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-full">
                            Người bán
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3 text-lg">
                        <p className="font-bold text-gray-800">
                          {dispute.reportedUserId.fullName}
                        </p>
                        <p className="text-gray-600 flex items-center gap-2">
                          <Mail className="w-5 h-5" />{" "}
                          {dispute.reportedUserId.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-gray-200 pt-8"></div>

                  {/* Thanh toán */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-8 border-2 border-emerald-200 shadow-lg">
                    <h3 className="text-2xl font-bold text-emerald-800 mb-6 flex items-center gap-3">
                      <CreditCard className="w-8 h-8" /> Chi tiết thanh toán
                    </h3>
                    <div className="space-y-5 text-lg">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Tiền thuê</span>
                        <span className="font-bold text-emerald-700">
                          {calculateRentalAmount(order).toLocaleString("vi-VN")}
                          ₫
                        </span>
                      </div>
                      <div className="flex justify-between text-cyan-700">
                        <span>Phí dịch vụ</span>
                        <span className="font-bold">
                          {(order.serviceFee || 0).toLocaleString("vi-VN")}₫
                        </span>
                      </div>
                      <div className="flex justify-between text-amber-700">
                        <span>Tiền cọc (hoàn lại)</span>
                        <span className="font-bold">
                          {(order.depositAmount || 0).toLocaleString("vi-VN")}₫
                        </span>
                      </div>
                      <div className="border-t-2 border-emerald-300 pt-5">
                        <div className="flex justify-between items-end">
                          <span className="text-xl text-gray-800">
                            Tổng thanh toán
                          </span>
                          <span className="text-4xl font-bold text-emerald-600">
                            {order.totalAmount.toLocaleString("vi-VN")}₫
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-6">
                        <span className="text-gray-700">Trạng thái</span>
                        <span
                          className={`px-6 py-3 rounded-full text-lg font-bold shadow-md ${
                            order.paymentStatus === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {getPaymentStatusLabel(order.paymentStatus)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Địa chỉ */}
                  <div className="bg-gray-50 rounded-2xl p-7 border-2 border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                      <MapPin className="w-7 h-7 text-red-600" /> Địa chỉ nhận
                      hàng
                    </h3>
                    <div className="text-lg space-y-2">
                      <p className="font-bold text-gray-900">
                        {order.shippingAddress.fullName}
                      </p>
                      <p className="text-gray-700">
                        {order.shippingAddress.street},{" "}
                        {order.shippingAddress.ward},{" "}
                        {order.shippingAddress.province}
                      </p>
                      <p className="text-gray-600 flex items-center gap-2">
                        <Phone className="w-5 h-5" />{" "}
                        {order.shippingAddress.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Header tranh chấp */}
            <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 rounded-3xl shadow-2xl p-10 text-white">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-lg opacity-90 tracking-widest">
                    TRANH CHẤP
                  </p>
                  <p className="text-4xl font-bold font-mono tracking-wider mt-2">
                    {dispute._id}
                  </p>
                  <p className="text-lg mt-3 flex items-center gap-3">
                    <Calendar className="w-6 h-6" />
                    {formatDate(dispute.createdAt)}
                  </p>
                </div>
                <div
                  className={`flex items-center gap-4 px-8 py-5 rounded-full text-2xl font-bold shadow-2xl animate-pulse ${
                    statusConfig[dispute.status].color
                  }`}
                >
                  <StatusIcon className="w-8 h-8" />
                  {statusConfig[dispute.status].label}
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 shadow-xl hover:shadow-2xl transition">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {dispute.reporterId.avatarUrl ? (
                      <Image
                        src={dispute.reporterId.avatarUrl}
                        width={90}
                        height={90}
                        alt=""
                        className="rounded-full ring-4 ring-red-300"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-red-200 flex items-center justify-center ring-4 ring-red-300">
                        <AlertCircle className="w-12 h-12 text-red-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-bold">Người tố cáo</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {dispute.reporterId.fullName}
                    </p>
                    <p className="text-gray-600 mt-2">
                      {dispute.reporterId.email}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 shadow-xl hover:shadow-2xl transition">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {dispute.reportedUserId.avatarUrl ? (
                      <Image
                        src={dispute.reportedUserId.avatarUrl}
                        width={90}
                        height={90}
                        alt=""
                        className="rounded-full ring-4 ring-orange-300"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-orange-200 flex items-center justify-center ring-4 ring-orange-300">
                        <Store className="w-12 h-12 text-orange-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-lg text-orange-600 font-bold">
                      Người bị tố
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {dispute.reportedUserId.fullName}
                    </p>
                    <p className="text-gray-600 mt-2">
                      {dispute.reportedUserId.email}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
            {/* Lý do & mô tả */}
            <Card className="p-8 bg-red-50 border-2 border-red-300">
              <p className="text-3xl font-bold text-red-700 mb-5">
                {dispute.reason}
              </p>
              {dispute.description && (
                <div className="bg-white rounded-2xl p-7 shadow-inner border border-red-200">
                  <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                    {dispute.description}
                  </p>
                </div>
              )}
            </Card>
            {/* Bằng chứng */}
            {dispute.evidence?.length ? (
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
                <p className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <ImageIcon className="w-8 h-8 text-blue-600" /> Bằng chứng (
                  {dispute.evidence.length})
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {dispute.evidence.map((img, i) => (
                    <ImagePreview
                      key={i}
                      src={img}
                      index={i + 1}
                      total={dispute.evidence!.length}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            // Và nếu đã xử lý xong → hiện kết quả
            {dispute.status === "Resolved" && dispute.resolution && (
              <Card className="mt-16 border-4 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl">
                <div className="p-10 text-center">
                  <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
                  <h3 className="text-3xl font-bold text-green-800 mb-4">
                    Tranh chấp đã được xử lý thành công
                  </h3>
                  <div className="grid grid-cols-2 gap-8 text-left max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-inner">
                    <div>
                      <p className="text-gray-600 font-medium">Quyết định</p>
                      <p className="text-2xl font-bold text-green-700">
                        {DECISIONS.find(
                          (d) => d.value === dispute.resolution?.decision
                        )?.label || dispute.resolution.decision}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium">Số tiền hoàn</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {dispute.resolution.refundAmount.toLocaleString(
                          "vi-VN"
                        )}
                        ₫
                      </p>
                    </div>
                  </div>
                  {dispute.resolution.notes && (
                    <div className="mt-8 bg-gray-50 rounded-2xl p-6 max-w-2xl mx-auto">
                      <p className="font-semibold text-gray-700 mb-2">
                        Ghi chú từ Admin:
                      </p>
                      <p className="text-gray-800 italic">
                        "{dispute.resolution.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
      {dispute.status === "Pending" && order && (
        <div className="mt-16">
          <DisputeResolutionForm
            disputeId={dispute._id}
            totalAmount={order.totalAmount}
            reporterName={dispute.reporterId?.fullName || dispute.reporterId?.email || "Người tạo tranh chấp"}
            reportedUserName={dispute.reportedUserId?.fullName || dispute.reportedUserId?.email || "Người bị báo cáo"}
            onSuccess={() => {
              toast.success("Đã xử lý xong! Đang tải lại...");
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }}
          />
        </div>
      )}
    </div>
  );
}

const LoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
      <p className="text-gray-600">Đang tải chi tiết tranh chấp...</p>
    </div>
  </div>
);

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <p className="text-xl font-semibold text-red-600">
        Không tìm thấy tranh chấp
      </p>
    </div>
  </div>
);
