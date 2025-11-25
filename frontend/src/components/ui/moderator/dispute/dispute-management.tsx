"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { decodeToken } from '@/utils/jwtHelper';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Badge } from "@/components/ui/common/badge";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Textarea } from "@/components/ui/common/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/common/dialog";
import {
  AlertTriangle,
  CheckCircle,
  User,
  Search,
  RefreshCw,
  Eye,
  Clock,
  UserCheck,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { getDisputes, getDisputeById, assignDispute, unassignDispute, resolveDispute, type Dispute } from "@/services/moderator/disputeOrder.api";
import { getOrderDetails, type Order } from "@/services/auth/order.api";

const REFUND_TARGET_OPTIONS = [
  { value: "reporter", label: "Người khiếu nại (người thuê)" },
  { value: "reported", label: "Người bị khiếu nại (người bán)" },
];

const REFUND_PERCENTAGE_OPTIONS = [10, 25, 50, 100];

const getRefundTargetLabel = (target?: string) => {
  if (target === "reporter") return "Người khiếu nại (người thuê)";
  if (target === "reported") return "Người bị khiếu nại (người bán)";
  return "Không áp dụng";
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  disputed: "Đang tranh chấp",
  refunded: "Đã hoàn tiền",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ thanh toán",
  not_paid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  partial: "Thanh toán một phần",
  failed: "Thanh toán thất bại",
};

const getOrderStatusLabel = (status?: string) => {
  if (!status) return "Không xác định";
  return ORDER_STATUS_LABELS[status.toLowerCase()] || status;
};

const getPaymentStatusLabel = (status?: string) => {
  if (!status) return "Không xác định";
  return PAYMENT_STATUS_LABELS[status.toLowerCase()] || status;
};

export function DisputeManagement() {
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
  });
  const [detailDialog, setDetailDialog] = useState(false);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [unassignDialog, setUnassignDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Resolve form state
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [refundTarget, setRefundTarget] = useState<"reporter" | "reported" | "">("");
  const [refundPercentage, setRefundPercentage] = useState<string>("");
  const [unassignReason, setUnassignReason] = useState("");

  // Order and dispute details for resolve dialog
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [disputeDetails, setDisputeDetails] = useState<Dispute | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Dispute details for detail dialog
  const [detailDisputeData, setDetailDisputeData] = useState<Dispute | null>(null);
  const [loadingDetailData, setLoadingDetailData] = useState(false);

  const orderTotalForRefund =
    orderDetails?.totalAmount ??
    (typeof disputeDetails?.orderId === "object"
      ? disputeDetails?.orderId?.totalAmount
      : 0) ??
    0;
  const computedRefundPreview =
    refundPercentage && orderTotalForRefund
      ? Math.round((orderTotalForRefund * Number(refundPercentage)) / 100)
      : 0;

  useEffect(() => {
    const decoded = decodeToken(accessToken);
    setCurrentUserId(decoded?._id || null);
  }, [accessToken]);

  useEffect(() => {
    fetchDisputes();
    // Reset pagination when filter changes
    setPagination({ currentPage: 1, itemsPerPage: pagination.itemsPerPage });
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: string } = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response = await getDisputes(params);
      if (response.code === 200) {
        // Backend trả về { total, data } nên cần lấy response.data.data
        const disputeData = response.data as { data?: Dispute[] } | Dispute[];
        setDisputes(Array.isArray(disputeData) ? disputeData : (Array.isArray(disputeData?.data) ? disputeData.data : []));
      } else {
        setError(response.message || "Không thể tải danh sách tranh chấp");
        toast.error(response.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Error fetching disputes:", err);
      setError("Không thể kết nối đến server");
      toast.error("Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (disputeId: string) => {
    try {
      const response = await assignDispute(disputeId);
      if (response.code === 200) {
        toast.success("Đã nhận tranh chấp thành công");
        fetchDisputes();
      } else {
        toast.error(response.message || "Không thể nhận tranh chấp");
      }
    } catch (err) {
      console.error("Error assigning dispute:", err);
      toast.error("Có lỗi xảy ra khi nhận tranh chấp");
    }
  };

  const handleUnassign = async () => {
    if (!selectedDispute) return;
    try {
      const response = await unassignDispute(selectedDispute._id, unassignReason);
      if (response.code === 200) {
        toast.success("Đã trả lại tranh chấp thành công");
        setUnassignDialog(false);
        setUnassignReason("");
        setSelectedDispute(null);
        fetchDisputes();
      } else {
        toast.error(response.message || "Không thể trả lại tranh chấp");
      }
    } catch (err) {
      console.error("Error unassigning dispute:", err);
      toast.error("Có lỗi xảy ra khi trả lại tranh chấp");
    }
  };

  const fetchOrderAndDisputeDetails = async (dispute: Dispute) => {
    setLoadingDetails(true);
    try {
      // Get orderId from dispute - ensure it's always a string
      let orderIdValue: string | null = null;
      if (typeof dispute.orderId === "object" && dispute.orderId !== null) {
        orderIdValue = dispute.orderId._id || null;
      } else if (typeof dispute.orderId === "string") {
        orderIdValue = dispute.orderId;
      }

      // Fetch dispute details
      const disputeResponse = await getDisputeById(dispute._id);
      if (disputeResponse.code === 200 && disputeResponse.data) {
        setDisputeDetails(disputeResponse.data);
      }

      // Fetch order details
      if (orderIdValue) {
        const orderResponse = await getOrderDetails(orderIdValue);
        if (orderResponse.code === 200 && orderResponse.data) {
          setOrderDetails(orderResponse.data);
        } else {
          console.error("Error fetching order details:", orderResponse.message);
        }
      }
    } catch (err) {
      console.error("Error fetching details:", err);
      toast.error("Không thể tải thông tin chi tiết");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenResolveDialog = async (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolveDialog(true);
    setOrderDetails(null);
    setDisputeDetails(null);
     setDecision("");
     setNotes("");
     setRefundTarget("");
     setRefundPercentage("");
    await fetchOrderAndDisputeDetails(dispute);
  };

  const handleResolve = async () => {
    if (!selectedDispute || !decision.trim()) {
      toast.error("Vui lòng nhập quyết định");
      return;
    }
    if (refundTarget && !refundPercentage) {
      toast.error("Vui lòng chọn phần trăm hoàn tiền tương ứng");
      return;
    }
    if (
      refundPercentage &&
      !REFUND_PERCENTAGE_OPTIONS.map((value) => value.toString()).includes(
        refundPercentage
      )
    ) {
      toast.error("Chỉ hỗ trợ hoàn 10%, 25%, 50% hoặc 100%");
      return;
    }
    if (refundPercentage && !refundTarget) {
      toast.error("Vui lòng chọn người nhận hoàn tiền");
      return;
    }
    try {
      const payload = {
        decision: decision.trim(),
        notes: notes.trim() || undefined,
        refundTarget: refundPercentage
          ? (refundTarget as "reporter" | "reported")
          : undefined,
        refundPercentage: refundPercentage
          ? Number(refundPercentage)
          : undefined,
      };
      const response = await resolveDispute(selectedDispute._id, payload);
      if (response.code === 200) {
        toast.success("Đã xử lý tranh chấp thành công");
        setResolveDialog(false);
        setDecision("");
        setNotes("");
        setRefundTarget("");
        setRefundPercentage("");
        setSelectedDispute(null);
        setOrderDetails(null);
        setDisputeDetails(null);
        fetchDisputes();
      } else {
        toast.error(response.message || "Không thể xử lý tranh chấp");
      }
    } catch (err) {
      console.error("Error resolving dispute:", err);
      toast.error("Có lỗi xảy ra khi xử lý tranh chấp");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Chờ xử lý</Badge>;
      case "In Progress":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Đang xử lý</Badge>;
      case "Resolved":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Đã xử lý</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Đã từ chối</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>;
    }
  };

  const isAssignedToMe = (dispute: Dispute) => {
    if (!currentUserId || !dispute.assignedBy) return false;
    const assignedById = typeof dispute.assignedBy === "object" ? dispute.assignedBy._id : dispute.assignedBy;
    return assignedById === currentUserId;
  };

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch =
      dispute.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof dispute.orderId === "object" && dispute.orderId?.orderGuid?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      dispute.reporterId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.reportedUserId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Sort disputes: Pending first, then by createdAt (oldest first)
  const sortedDisputes = [...filteredDisputes].sort((a, b) => {
    // Priority order: Pending > In Progress > Others
    const statusPriority: { [key: string]: number } = {
      Pending: 1,
      "In Progress": 2,
      Reviewed: 3,
      Resolved: 4,
      Rejected: 5,
    };
    
    const priorityA = statusPriority[a.status] || 99;
    const priorityB = statusPriority[b.status] || 99;
    
    // If same priority, sort by createdAt (oldest first)
    if (priorityA === priorityB) {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB; // Oldest first
    }
    
    return priorityA - priorityB;
  });

  // Pagination calculations
  const total = sortedDisputes.length;
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
  const endIndex = startIndex + pagination.itemsPerPage;
  const paginatedDisputes = sortedDisputes.slice(startIndex, endIndex);

  // Reset page when search term changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setPagination({ currentPage: 1, itemsPerPage });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-900">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 mb-4">{error}</p>
          <Button onClick={fetchDisputes} variant="outline" className="text-gray-900">
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">Danh sách tranh chấp</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm..."
                  className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded text-gray-900"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="Pending">Chờ xử lý</option>
                <option value="In Progress">Đang xử lý</option>
                <option value="Resolved">Đã xử lý</option>
                <option value="Rejected">Đã từ chối</option>
              </select>
              <Button onClick={fetchDisputes} variant="ghost" size="icon" className="text-gray-900">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {total === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Không có tranh chấp nào</p>
              </div>
            ) : (
              paginatedDisputes.map((dispute) => {
                const orderGuid = typeof dispute.orderId === "object" ? dispute.orderId?.orderGuid : "N/A";
                const assignedToMe = isAssignedToMe(dispute);
                const canAssign = dispute.status === "Pending" && !dispute.assignedBy;
                const canResolve = dispute.status === "In Progress" && assignedToMe;
                const canUnassign = dispute.status === "In Progress" && assignedToMe;

                return (
                  <div
                    key={dispute._id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">Đơn hàng #{orderGuid}</h3>
                          {getStatusBadge(dispute.status)}
                          {dispute.assignedBy && (
                            <Badge variant="outline" className="text-xs">
                              <UserCheck className="w-3 h-3 mr-1" />
                              {typeof dispute.assignedBy === "object"
                                ? dispute.assignedBy.fullName
                                : "Đã được nhận"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">
                          <strong>Lý do:</strong> {dispute.reason}
                        </p>
                        {dispute.description && (
                          <p className="text-gray-500 text-sm mb-2">{dispute.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>
                              Người báo cáo: {dispute.reporterId?.fullName || dispute.reporterId?.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>
                              Người bị báo cáo: {dispute.reportedUserId?.fullName || dispute.reportedUserId?.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(dispute.createdAt).toLocaleString("vi-VN")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            setSelectedDispute(dispute);
                            setDetailDialog(true);
                            setDetailDisputeData(null);
                            setLoadingDetailData(true);
                            try {
                              const response = await getDisputeById(dispute._id);
                              if (response.code === 200 && response.data) {
                                setDetailDisputeData(response.data);
                              }
                            } catch (err) {
                              console.error("Error fetching dispute details:", err);
                            } finally {
                              setLoadingDetailData(false);
                            }
                          }}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canAssign && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssign(dispute._id)}
                            className="text-green-600 hover:bg-green-50"
                          >
                            <UserCheck className="w-4 h-4" />
                            Nhận
                          </Button>
                        )}
                        {canUnassign && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setUnassignDialog(true);
                            }}
                            className="text-orange-600 hover:bg-orange-50"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Trả lại
                          </Button>
                        )}
                        {canResolve && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenResolveDialog(dispute)}
                            className="text-indigo-600 hover:bg-indigo-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Xử lý
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-center px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 rounded-b-lg">
          <div className="flex justify-center items-center gap-2 flex-1 sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Trước
            </button>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === Math.ceil(total / pagination.itemsPerPage) || total === 0}
              className="relative ml-3 inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-center sm:gap-4">
            <div className="text-sm text-gray-600">
              Hiển thị{" "}
              <span className="font-medium text-gray-900">
                {total === 0
                  ? 0
                  : (pagination.currentPage - 1) * pagination.itemsPerPage + 1}
              </span>{" "}
              đến{" "}
              <span className="font-medium text-gray-900">
                {Math.min(
                  pagination.currentPage * pagination.itemsPerPage,
                  total
                )}
              </span>{" "}
              của <span className="font-medium text-gray-900">{total}</span> kết
              quả
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pagination.itemsPerPage}
                onChange={(e) =>
                  handleItemsPerPageChange(parseInt(e.target.value))
                }
                className="px-2 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-gray-900"
              >
                <option
                  value={5}
                  style={{ backgroundColor: "white", color: "#111827" }}
                >
                  5
                </option>
                <option
                  value={10}
                  style={{ backgroundColor: "white", color: "#111827" }}
                >
                  10
                </option>
                <option
                  value={20}
                  style={{ backgroundColor: "white", color: "#111827" }}
                >
                  20
                </option>
                <option
                  value={50}
                  style={{ backgroundColor: "white", color: "#111827" }}
                >
                  50
                </option>
              </select>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Trước
                </button>
                {Array.from({ length: Math.ceil(total / pagination.itemsPerPage) || 1 }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium ${
                        pagination.currentPage === page
                          ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === Math.ceil(total / pagination.itemsPerPage) || total === 0}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Sau
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết tranh chấp</DialogTitle>
          </DialogHeader>
          {loadingDetailData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-lg">Đang tải thông tin...</p>
              </div>
            </div>
          ) : (selectedDispute || detailDisputeData) ? (
            <div className="space-y-4">
              {(() => {
                const dispute = detailDisputeData || selectedDispute;
                if (!dispute) return null;
                return (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Đơn hàng</label>
                      <p className="text-gray-900">
                        #{typeof dispute.orderId === "object" ? dispute.orderId?.orderGuid : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Lý do</label>
                      <p className="text-gray-900">{dispute.reason}</p>
                    </div>
                    {dispute.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Mô tả</label>
                        <p className="text-gray-900 whitespace-pre-wrap">{dispute.description}</p>
                      </div>
                    )}
                    {dispute.evidence && dispute.evidence.length > 0 ? (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Bằng chứng</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {dispute.evidence.map((url: string, index: number) => (
                              <a
                                key={`evidence-${index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block border border-gray-200 rounded p-2 hover:border-indigo-500 transition-colors"
                              >
                                <img
                                  src={url}
                                  alt={`Bằng chứng ${index + 1}`}
                                  className="w-full h-32 object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/file.svg";
                                  }}
                                />
                              </a>
                            ))}
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                      <div className="mt-1">{getStatusBadge(dispute.status)}</div>
                    </div>
                    {dispute.assignedBy && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Người xử lý</label>
                        <p className="text-gray-900">
                          {typeof dispute.assignedBy === "object"
                            ? dispute.assignedBy.fullName || dispute.assignedBy.email
                            : "Đã được nhận"}
                        </p>
                      </div>
                    )}
                    {dispute.resolution && (
                      <div className="border-t pt-4 space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Quyết định</label>
                          <p className="text-gray-900">{dispute.resolution.decision}</p>
                        </div>
                        {dispute.resolution.notes && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block">Ghi chú</label>
                            <p className="text-gray-900">{dispute.resolution.notes}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Số tiền hoàn</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {(dispute.resolution.refundAmount || 0).toLocaleString("vi-VN")} VNĐ
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Phần trăm</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {dispute.resolution.refundPercentage ?? 0}%
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Hoàn cho</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {getRefundTargetLabel(dispute.resolution.refundTarget)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : null}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDetailDialog(false);
                setDetailDisputeData(null);
              }}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xử lý tranh chấp</DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-lg">Đang tải thông tin...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Thông tin đơn hàng và khiếu nại ngang hàng */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Thông tin đơn hàng */}
                {orderDetails && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Thông tin đơn hàng
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Mã đơn hàng</label>
                        <p className="text-gray-900 font-semibold">#{orderDetails.orderGuid}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                        <p className="text-gray-900">
                          {getOrderStatusLabel(orderDetails.orderStatus)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Người thuê</label>
                        <p className="text-gray-900">
                          {orderDetails.renterId?.fullName || orderDetails.renterId?.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Người cho thuê</label>
                        <p className="text-gray-900">
                          {orderDetails.ownerId?.fullName || orderDetails.ownerId?.email || "N/A"}
                        </p>
                      </div>
                      {orderDetails.itemSnapshot && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Sản phẩm</label>
                            <p className="text-gray-900">{orderDetails.itemSnapshot.title || "N/A"}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Giá thuê</label>
                            <p className="text-gray-900">
                              {orderDetails.itemSnapshot.basePrice?.toLocaleString("vi-VN") || "0"} {orderDetails.itemSnapshot.priceUnit || "VNĐ"}
                            </p>
                          </div>
                        </>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Tổng tiền</label>
                        <p className="text-gray-900 font-semibold">
                          {orderDetails.totalAmount?.toLocaleString("vi-VN") || "0"} {orderDetails.currency || "VNĐ"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Trạng thái thanh toán</label>
                        <p className="text-gray-900">
                          {getPaymentStatusLabel(orderDetails.paymentStatus)}
                        </p>
                      </div>
                      {orderDetails.startAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Thời gian bắt đầu</label>
                          <p className="text-gray-900">
                            {new Date(orderDetails.startAt).toLocaleString("vi-VN")}
                          </p>
                        </div>
                      )}
                      {orderDetails.endAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Thời gian kết thúc</label>
                          <p className="text-gray-900">
                            {new Date(orderDetails.endAt).toLocaleString("vi-VN")}
                          </p>
                        </div>
                      )}
                      {orderDetails.shippingAddress && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Địa chỉ giao hàng</label>
                          <p className="text-gray-900 text-sm">
                            {orderDetails.shippingAddress.fullName && `${orderDetails.shippingAddress.fullName}, `}
                            {orderDetails.shippingAddress.street}, {orderDetails.shippingAddress.ward}, {orderDetails.shippingAddress.province}
                            {orderDetails.shippingAddress.phone && ` - ${orderDetails.shippingAddress.phone}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Thông tin khiếu nại */}
                {disputeDetails && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      Thông tin khiếu nại
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Lý do khiếu nại</label>
                        <p className="text-gray-900 font-semibold">{disputeDetails.reason}</p>
                      </div>
                      {disputeDetails.description && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Mô tả chi tiết</label>
                          <p className="text-gray-900 whitespace-pre-wrap text-sm">{disputeDetails.description}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Người báo cáo</label>
                        <p className="text-gray-900">
                          {disputeDetails.reporterId?.fullName || disputeDetails.reporterId?.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Người bị báo cáo</label>
                        <p className="text-gray-900">
                          {disputeDetails.reportedUserId?.fullName || disputeDetails.reportedUserId?.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Thời gian tạo</label>
                        <p className="text-gray-900">
                          {new Date(disputeDetails.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                        <div className="mt-1">{getStatusBadge(disputeDetails.status)}</div>
                      </div>
                      {disputeDetails.evidence && disputeDetails.evidence.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Bằng chứng</label>
                          <div className="grid grid-cols-2 gap-2">
                            {disputeDetails.evidence.map((url: string, index: number) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block border border-gray-200 rounded p-2 hover:border-indigo-500 transition-colors"
                              >
                                <img
                                  src={url}
                                  alt={`Bằng chứng ${index + 1}`}
                                  className="w-full h-20 object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/file.svg";
                                  }}
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Form quyết định */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quyết định xử lý</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Quyết định <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={decision}
                      onChange={(e) => setDecision(e.target.value)}
                      placeholder="Nhập quyết định xử lý..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Ghi chú</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Nhập ghi chú (tùy chọn)..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Hoàn tiền cho
                      </label>
                      <select
                        className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                        value={refundTarget}
                        onChange={(e) =>
                          setRefundTarget(
                            e.target.value as "reporter" | "reported" | ""
                          )
                        }
                      >
                        <option value="">Không hoàn / Không áp dụng</option>
                        {REFUND_TARGET_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Phần trăm hoàn
                      </label>
                      <select
                        className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                        value={refundPercentage}
                        onChange={(e) => setRefundPercentage(e.target.value)}
                      >
                        <option value="">Không hoàn</option>
                        {REFUND_PERCENTAGE_OPTIONS.map((percent) => (
                          <option key={percent} value={percent.toString()}>
                            {percent}%
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {refundPercentage && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-sm text-emerald-700">
                        Số tiền dự kiến hoàn trả
                      </p>
                      <p className="text-2xl font-bold text-emerald-900">
                        {computedRefundPreview
                          ? `${computedRefundPreview.toLocaleString("vi-VN")} VNĐ`
                          : "0 VNĐ"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setResolveDialog(false);
                setOrderDetails(null);
                setDisputeDetails(null);
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleResolve}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={
                loadingDetails ||
                !decision.trim() ||
                (refundPercentage !== "" && refundTarget === "")
              }
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign Dialog */}
      <Dialog open={unassignDialog} onOpenChange={setUnassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trả lại tranh chấp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Bạn có chắc chắn muốn trả lại tranh chấp này để moderator khác xử lý?
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Lý do trả lại (tùy chọn)</label>
              <Textarea
                value={unassignReason}
                onChange={(e) => setUnassignReason(e.target.value)}
                placeholder="Nhập lý do trả lại..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnassignDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleUnassign} className="bg-orange-600 hover:bg-orange-700">
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

