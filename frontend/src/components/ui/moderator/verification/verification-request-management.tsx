"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/common/card";
import { Badge } from "@/components/ui/common/badge";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Textarea } from "@/components/ui/common/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/common/dialog";
import {
  Shield,
  CheckCircle,
  XCircle,
  User,
  Search,
  RefreshCw,
  Eye,
  UserCheck,
  FileText,
  Calendar,
  MapPin,
  CreditCard,
} from "lucide-react";
import {
  verificationRequestAPI,
  type VerificationRequest,
} from "@/services/auth/verificationRequest.api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/common/avatar";

export function VerificationRequestManagement() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [handleDialog, setHandleDialog] = useState(false);
  const [handleAction, setHandleAction] = useState<'approved' | 'rejected'>('approved');
  const [moderatorNotes, setModeratorNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [idCardInfo, setIdCardInfo] = useState({
    idNumber: "",
    fullName: "",
    dateOfBirth: "",
    address: ""
  });
  const [isHandling, setIsHandling] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  // Handle enlarged image modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && enlargedImage) {
        e.preventDefault();
        e.stopPropagation();
        setEnlargedImage(null);
      }
    };

    if (enlargedImage) {
      document.addEventListener("keydown", handleEscape, true); // Use capture phase
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape, true);
      document.body.style.overflow = "unset";
    };
  }, [enlargedImage]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await verificationRequestAPI.getAllVerificationRequests({
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      if (response.code === 200) {
        setRequests(response.data || []);
      } else {
        setError(response.message || "Không thể tải danh sách yêu cầu");
        toast.error(response.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Error fetching verification requests:", err);
      setError("Không thể kết nối đến server");
      toast.error("Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (request: VerificationRequest) => {
    try {
      const response = await verificationRequestAPI.getVerificationRequestById(request._id);
      if (response.code === 200 && response.data) {
        setSelectedRequest(response.data);
        // Log để debug ảnh
        if (response.data.documents) {
          console.log("Documents URLs:", response.data.documents.map((d: { documentType: string; fileUrl: string; uploadedAt: string }) => d.fileUrl));
        }
        setDetailDialog(true);
      } else {
        toast.error(response.message || "Không thể tải chi tiết yêu cầu");
      }
    } catch (err) {
      console.error("Error fetching request detail:", err);
      toast.error("Không thể tải chi tiết yêu cầu");
    }
  };

  const handleAssign = async (requestId: string) => {
    try {
      setIsAssigning(true);
      const response = await verificationRequestAPI.assignVerificationRequest(requestId);
      if (response.code === 200) {
        toast.success("Đã nhận yêu cầu xác minh");
        await fetchRequests();
      } else {
        toast.error(response.message || "Không thể nhận yêu cầu");
      }
    } catch (err) {
      console.error("Error assigning request:", err);
      toast.error("Không thể nhận yêu cầu");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOpenHandleDialog = (request: VerificationRequest, action: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setHandleAction(action);
    setModeratorNotes("");
    setRejectionReason("");
    // Pre-fill idCardInfo from request if available
    setIdCardInfo({
      idNumber: request.idCardInfo?.idNumber || "",
      fullName: request.idCardInfo?.fullName || "",
      dateOfBirth: request.idCardInfo?.dateOfBirth 
        ? new Date(request.idCardInfo.dateOfBirth).toISOString().split('T')[0]
        : "",
      address: request.idCardInfo?.address || ""
    });
    setHandleDialog(true);
  };

  const handleSubmitHandle = async () => {
    if (!selectedRequest) return;

    if (handleAction === 'rejected' && !rejectionReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    // Validate idCardInfo when approving
    if (handleAction === 'approved') {
      if (!idCardInfo.idNumber.trim()) {
        toast.error("Vui lòng nhập số căn cước công dân");
        return;
      }
      if (!/^\d{12}$/.test(idCardInfo.idNumber.trim())) {
        toast.error("Số căn cước công dân phải có 12 chữ số");
        return;
      }
      if (!idCardInfo.fullName.trim()) {
        toast.error("Vui lòng nhập họ và tên");
        return;
      }
      if (!idCardInfo.dateOfBirth) {
        toast.error("Vui lòng nhập ngày tháng năm sinh");
        return;
      }
      if (!idCardInfo.address.trim()) {
        toast.error("Vui lòng nhập địa chỉ thường trú");
        return;
      }
    }

    try {
      setIsHandling(true);
      const response = await verificationRequestAPI.handleVerificationRequest(
        selectedRequest._id,
        handleAction,
        {
          moderatorNotes: moderatorNotes.trim() || undefined,
          rejectionReason: handleAction === 'rejected' ? rejectionReason.trim() : undefined,
          idCardInfo: handleAction === 'approved' ? {
            idNumber: idCardInfo.idNumber.trim(),
            fullName: idCardInfo.fullName.trim(),
            dateOfBirth: idCardInfo.dateOfBirth,
            address: idCardInfo.address.trim()
          } : undefined
        }
      );

      if (response.code === 200) {
        toast.success(
          handleAction === 'approved' 
            ? "Yêu cầu xác minh đã được duyệt thành công" 
            : "Yêu cầu xác minh đã bị từ chối"
        );
        setHandleDialog(false);
        setSelectedRequest(null);
        await fetchRequests();
      } else {
        toast.error(response.message || "Không thể xử lý yêu cầu");
      }
    } catch (err) {
      console.error("Error handling request:", err);
      toast.error("Không thể xử lý yêu cầu");
    } finally {
      setIsHandling(false);
    }
  };

  // Sort requests: Pending first, then by createdAt (oldest first)
  const sortedRequests = [...requests].sort((a, b) => {
    const statusPriority: { [key: string]: number } = {
      Pending: 1,
      "In Progress": 2,
      Approved: 3,
      Rejected: 4,
    };

    const priorityA = statusPriority[a.status] || 99;
    const priorityB = statusPriority[b.status] || 99;

    if (priorityA === priorityB) {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB; // Oldest first
    }

    return priorityA - priorityB;
  });

  // Filter by search term
  const filteredRequests = sortedRequests.filter((request) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      request.userId?.fullName?.toLowerCase().includes(search) ||
      request.userId?.email?.toLowerCase().includes(search) ||
      request.idCardInfo?.idNumber?.includes(search) ||
      request.idCardInfo?.fullName?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
      Pending: { label: "Chờ xử lý", variant: "outline" },
      "In Progress": { label: "Đang xử lý", variant: "secondary" },
      Approved: { label: "Đã duyệt", variant: "default" },
      Rejected: { label: "Đã từ chối", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải danh sách yêu cầu xác minh...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">      
        <Button onClick={fetchRequests} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Tìm kiếm theo tên, email, số CCCD..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Pending">Chờ xử lý</option>
                <option value="In Progress">Đang xử lý</option>
                <option value="Approved">Đã duyệt</option>
                <option value="Rejected">Đã từ chối</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Không có yêu cầu xác minh nào</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request._id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar>
                        <AvatarImage src={request.userId?.avatarUrl} />
                        <AvatarFallback>
                          {request.userId?.fullName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {request.userId?.fullName || "Người dùng"}
                        </h3>
                        <p className="text-sm text-gray-600">{request.userId?.email}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    {request.idCardInfo ? (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                            Đã có thông tin OCR
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {request.idCardInfo.idNumber && (
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-indigo-600" />
                              <span><strong>Số CCCD:</strong> {request.idCardInfo.idNumber}</span>
                            </div>
                          )}
                          {request.idCardInfo.fullName && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-indigo-600" />
                              <span><strong>Họ tên:</strong> {request.idCardInfo.fullName}</span>
                            </div>
                          )}
                          {request.idCardInfo.dateOfBirth && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-indigo-600" />
                              <span>
                                <strong>Ngày sinh:</strong> {new Date(request.idCardInfo.dateOfBirth).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          )}
                          {request.idCardInfo.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-indigo-600" />
                              <span><strong>Địa chỉ:</strong> {request.idCardInfo.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        <Shield className="w-4 h-4" />
                        <span>Chưa có thông tin OCR - cần nhập thủ công</span>
                      </div>
                    )}

                    {request.reason && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Lý do:</strong> {request.reason}
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-500">
                      Tạo lúc: {new Date(request.createdAt).toLocaleString('vi-VN')}
                    </div>

                    {request.assignedTo && (
                      <div className="mt-1 text-xs text-gray-500">
                        Được giao cho: {request.assignedTo.fullName || request.assignedTo.email}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetail(request)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Chi tiết
                    </Button>
                    {request.status === 'Pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssign(request._id)}
                        disabled={isAssigning}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Nhận xử lý
                      </Button>
                    )}
                    {request.status === 'In Progress' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenHandleDialog(request, 'approved')}
                          className="text-green-600 border-green-300 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Duyệt
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenHandleDialog(request, 'rejected')}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Từ chối
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialog} 
        onOpenChange={(open) => {
          // Chỉ đóng dialog nếu modal phóng to ảnh không đang mở
          // Nếu modal phóng to đang mở, không cho phép đóng dialog
          if (enlargedImage && !open) {
            // Nếu đang cố đóng dialog nhưng modal phóng to đang mở, không làm gì
            return;
          }
          setDetailDialog(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu xác minh</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Thông tin người dùng
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Họ và tên</label>
                    <p className="text-gray-900">{selectedRequest.userId?.fullName || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedRequest.userId?.email || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                    <p className="text-gray-900">{selectedRequest.userId?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Trạng thái xác minh</label>
                    <p className="text-gray-900">
                      {selectedRequest.userId && typeof selectedRequest.userId === "object" && "isIdVerified" in selectedRequest.userId && (selectedRequest.userId as { isIdVerified?: boolean })?.isIdVerified
                        ? "Đã xác minh"
                        : "Chưa xác minh"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ID Card Info */}
              {selectedRequest.idCardInfo ? (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    Thông tin căn cước công dân (đã được OCR và xác nhận)
                  </h3>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-indigo-800 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Thông tin này đã được hệ thống OCR tự động và được người dùng xác nhận trước khi gửi yêu cầu.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Số căn cước công dân</label>
                      <p className="text-gray-900 font-semibold">{selectedRequest.idCardInfo.idNumber || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Họ và tên</label>
                      <p className="text-gray-900 font-semibold">{selectedRequest.idCardInfo.fullName || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ngày tháng năm sinh</label>
                      <p className="text-gray-900 font-semibold">
                        {selectedRequest.idCardInfo.dateOfBirth
                          ? new Date(selectedRequest.idCardInfo.dateOfBirth).toLocaleDateString('vi-VN')
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Địa chỉ thường trú</label>
                      <p className="text-gray-900 font-semibold">{selectedRequest.idCardInfo.address || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                    Thông tin căn cước công dân
                  </h3>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-800 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Không có thông tin OCR. Vui lòng nhập thủ công thông tin từ ảnh CCCD khi duyệt yêu cầu.
                    </p>
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Tài liệu đã upload
                  </h3>
                  <div className={`grid gap-4 ${selectedRequest.documents.length === 1 ? 'grid-cols-1' : selectedRequest.documents.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {selectedRequest.documents.map((doc, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                          {doc.documentType === 'idCardFront' ? 'Mặt trước CCCD' :
                           doc.documentType === 'idCardBack' ? 'Mặt sau CCCD' : 
                           doc.documentType === 'selfie' ? 'Ảnh cá nhân (cũ)' : 'Tài liệu'}
                        </p>
                        <div
                          className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden cursor-zoom-in group border-2 border-gray-200 hover:border-indigo-400 transition-all shadow-sm hover:shadow-lg bg-white"
                          onClick={() => setEnlargedImage(doc.fileUrl)}
                        >
                          <img
                            src={doc.fileUrl}
                            alt={doc.documentType}
                            className="w-full h-full object-contain bg-white transition-transform duration-300 group-hover:scale-105"
                            style={{ display: 'block' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/file.svg";
                              target.style.backgroundColor = "#f3f4f6";
                            }}
                            onLoad={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.backgroundColor = "#ffffff";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-transparent group-hover:from-black/20 group-hover:via-black/10 group-hover:to-black/20 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-2">
                              <Eye className="w-8 h-8 text-white drop-shadow-lg" />
                              <span className="text-white text-sm font-medium bg-black/70 px-3 py-1 rounded-full">
                                Click để phóng to
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason */}
              {selectedRequest.reason && (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Lý do gửi yêu cầu</h3>
                  <p className="text-gray-700">{selectedRequest.reason}</p>
                </div>
              )}

              {/* Status Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Thông tin xử lý</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Trạng thái:</span>{" "}
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  {selectedRequest.assignedTo && (
                    <div>
                      <span className="font-medium text-gray-700">Người xử lý:</span>{" "}
                      {selectedRequest.assignedTo.fullName || selectedRequest.assignedTo.email}
                    </div>
                  )}
                  {selectedRequest.assignedAt && (
                    <div>
                      <span className="font-medium text-gray-700">Thời gian nhận:</span>{" "}
                      {new Date(selectedRequest.assignedAt).toLocaleString('vi-VN')}
                    </div>
                  )}
                  {selectedRequest.handledBy && (
                    <div>
                      <span className="font-medium text-gray-700">Người xử lý cuối:</span>{" "}
                      {selectedRequest.handledBy.fullName || selectedRequest.handledBy.email}
                    </div>
                  )}
                  {selectedRequest.handledAt && (
                    <div>
                      <span className="font-medium text-gray-700">Thời gian xử lý:</span>{" "}
                      {new Date(selectedRequest.handledAt).toLocaleString('vi-VN')}
                    </div>
                  )}
                  {selectedRequest.moderatorNotes && (
                    <div>
                      <span className="font-medium text-gray-700">Ghi chú:</span>{" "}
                      {selectedRequest.moderatorNotes}
                    </div>
                  )}
                  {selectedRequest.rejectionReason && (
                    <div>
                      <span className="font-medium text-gray-700">Lý do từ chối:</span>{" "}
                      <span className="text-red-600">{selectedRequest.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handle Dialog */}
      <Dialog open={handleDialog} onOpenChange={setHandleDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle>
              {handleAction === 'approved' ? 'Duyệt yêu cầu xác minh' : 'Từ chối yêu cầu xác minh'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {handleAction === 'approved' && (
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Thông tin căn cước công dân <span className="text-red-500">*</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số căn cước công dân <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={idCardInfo.idNumber}
                      onChange={(e) => setIdCardInfo({ ...idCardInfo, idNumber: e.target.value })}
                      placeholder="Nhập 12 chữ số"
                      maxLength={12}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={idCardInfo.fullName}
                      onChange={(e) => setIdCardInfo({ ...idCardInfo, fullName: e.target.value })}
                      placeholder="Nhập họ và tên"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày tháng năm sinh <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={idCardInfo.dateOfBirth}
                      onChange={(e) => setIdCardInfo({ ...idCardInfo, dateOfBirth: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa chỉ thường trú <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={idCardInfo.address}
                      onChange={(e) => setIdCardInfo({ ...idCardInfo, address: e.target.value })}
                      placeholder="Nhập địa chỉ thường trú"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
            {handleAction === 'rejected' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Nhập lý do từ chối yêu cầu xác minh"
                  rows={3}
                  className="w-full"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <Textarea
                value={moderatorNotes}
                onChange={(e) => setModeratorNotes(e.target.value)}
                placeholder="Nhập ghi chú cho người dùng"
                rows={3}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandleDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmitHandle}
              disabled={
                isHandling || 
                (handleAction === 'rejected' && !rejectionReason.trim()) ||
                (handleAction === 'approved' && (
                  !idCardInfo.idNumber.trim() ||
                  !/^\d{12}$/.test(idCardInfo.idNumber.trim()) ||
                  !idCardInfo.fullName.trim() ||
                  !idCardInfo.dateOfBirth ||
                  !idCardInfo.address.trim()
                ))
              }
              className={handleAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isHandling ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Đang xử lý...</span>
                </div>
              ) : (
                handleAction === 'approved' ? 'Duyệt' : 'Từ chối'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Enlarge Modal */}
      {enlargedImage && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black bg-opacity-95 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            // Sử dụng setTimeout để đảm bảo event không bubble lên dialog
            setTimeout(() => {
              setEnlargedImage(null);
            }, 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              setTimeout(() => {
                setEnlargedImage(null);
              }, 0);
            }
          }}
          style={{ zIndex: 99999 }}
        >
          {/* Close button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              // Sử dụng setTimeout để đảm bảo event không bubble lên dialog
              setTimeout(() => {
                setEnlargedImage(null);
              }, 0);
            }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 hover:bg-black/70 rounded-full p-3"
            aria-label="Đóng"
          >
            <XCircle className="w-8 h-8" />
          </button>

          {/* Image */}
          <div
            className="relative max-w-full max-h-[90vh] w-auto h-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enlargedImage}
              alt="Ảnh xác minh phóng to"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/file.svg";
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

