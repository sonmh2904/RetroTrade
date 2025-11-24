"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/common/button";
import {
  getCurrentServiceFee,
  getAllServiceFeeSettings,
  createServiceFeeSetting,
  updateServiceFeeSetting,
  deleteServiceFeeSetting,
  getServiceFeeHistory,
  getAllServiceFeeHistory,
  activateServiceFeeSetting,
  type ServiceFeeSetting,
  type CreateServiceFeeRequest,
  type UpdateServiceFeeRequest,
} from "@/services/serviceFee/serviceFee.api";
import {
  Plus,
  Edit,
  Trash2,
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  Percent,
  RotateCcw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/common/dialog";
import { Input } from "@/components/ui/common/input";
import { Label } from "@/components/ui/common/label";
import { Textarea } from "@/components/ui/common/textarea";

type CurrentServiceFee = {
  serviceFeeRate: number;
  description?: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
} | null;

type ServiceFeeHistory = {
  currentServiceFee: {
    serviceFeeRate: number;
    description?: string;
    effectiveFrom: string;
    effectiveTo?: string;
  };
  history: Array<{
    serviceFeeRate: number;
    description?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    changedAt: string;
    changedBy?: {
      _id: string;
      fullName: string;
      email: string;
    };
  }>;
} | null;

type AllServiceFeeHistory = {
  timeline: Array<{
    type: "create" | "update";
    serviceFeeId: string;
    serviceFeeRate: number;
    description?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    isActive?: boolean;
    createdAt?: string;
    changedAt?: string;
    changedBy?: {
      _id: string;
      fullName: string;
      email: string;
    };
    serviceFeeInfo: {
      _id: string;
      serviceFeeRate: number;
      description?: string;
    };
  }>;
  totalEvents: number;
  totalServiceFees: number;
} | null;

export function ServiceFeeManagementTable() {
  const [serviceFees, setServiceFees] = useState<ServiceFeeSetting[]>([]);
  const [currentServiceFee, setCurrentServiceFee] = useState<CurrentServiceFee>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isAllHistoryDialogOpen, setIsAllHistoryDialogOpen] = useState(false);
  const [selectedServiceFee, setSelectedServiceFee] = useState<ServiceFeeSetting | null>(null);
  const [history, setHistory] = useState<ServiceFeeHistory>(null);
  const [allHistory, setAllHistory] = useState<AllServiceFeeHistory>(null);

  // Form states
  const [formData, setFormData] = useState<CreateServiceFeeRequest>({
    serviceFeeRate: 3,
    description: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadCurrentServiceFee();
    loadServiceFees();
  }, [page]);

  const loadCurrentServiceFee = async () => {
    try {
      const response = await getCurrentServiceFee();
      if (response.success && response.data) {
        setCurrentServiceFee(response.data);
      }
    } catch (err: unknown) {
      console.error("Error loading current serviceFee:", err);
    }
  };

  const loadServiceFees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllServiceFeeSettings(page, 20, true);
      if (response.success && response.data) {
        setServiceFees(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
        }
      } else {
        setError(response.message || "Không thể tải danh sách phí dịch vụ");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi tải danh sách phí dịch vụ");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const response = await createServiceFeeSetting(formData);
      if (response.success) {
        setIsCreateDialogOpen(false);
        setFormData({
          serviceFeeRate: 3,
          description: "",
          effectiveFrom: new Date().toISOString().split("T")[0],
        });
        loadServiceFees();
        loadCurrentServiceFee();
      } else {
        setError(response.message || "Không thể tạo cấu hình phí dịch vụ");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi tạo cấu hình phí dịch vụ");
    }
  };

  const handleUpdate = async () => {
    if (!selectedServiceFee) return;

    try {
      setError(null);
      const updateData: UpdateServiceFeeRequest = {
        serviceFeeRate: formData.serviceFeeRate,
        description: formData.description,
        effectiveFrom: formData.effectiveFrom,
      };
      const response = await updateServiceFeeSetting(selectedServiceFee._id, updateData);
      if (response.success) {
        setIsEditDialogOpen(false);
        setSelectedServiceFee(null);
        loadServiceFees();
        loadCurrentServiceFee();
      } else {
        setError(response.message || "Không thể cập nhật cấu hình phí dịch vụ");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi cập nhật cấu hình phí dịch vụ");
    }
  };

  const handleActivate = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn kích hoạt cấu hình phí dịch vụ này? ServiceFee đang active sẽ bị tắt.")) return;

    try {
      setError(null);
      const response = await activateServiceFeeSetting(id);
      if (response.success) {
        loadServiceFees();
        loadCurrentServiceFee();
      } else {
        setError(response.message || "Không thể kích hoạt cấu hình phí dịch vụ");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi kích hoạt cấu hình phí dịch vụ");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa cấu hình phí dịch vụ này?")) return;

    try {
      setError(null);
      const response = await deleteServiceFeeSetting(id);
      if (response.success) {
        loadServiceFees();
        loadCurrentServiceFee();
      } else {
        setError(response.message || "Không thể xóa cấu hình phí dịch vụ");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi xóa cấu hình phí dịch vụ");
    }
  };

  const handleViewHistory = async (serviceFee: ServiceFeeSetting) => {
    try {
      setError(null);
      const response = await getServiceFeeHistory(serviceFee._id);
      if (response.success && response.data) {
        setHistory(response.data);
        setSelectedServiceFee(serviceFee);
        setIsHistoryDialogOpen(true);
      } else {
        setError(response.message || "Không thể tải lịch sử");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi tải lịch sử");
    }
  };

  const handleViewAllHistory = async () => {
    try {
      setError(null);
      const response = await getAllServiceFeeHistory();
      if (response.success && response.data) {
        setAllHistory(response.data);
        setIsAllHistoryDialogOpen(true);
      } else {
        setError(response.message || "Không thể tải lịch sử");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi tải lịch sử");
    }
  };

  const handleReapplyServiceFee = (event: NonNullable<AllServiceFeeHistory>["timeline"][number]) => {
    // Copy thông tin từ event để tạo serviceFee mới
    const now = new Date().toISOString().split("T")[0];
    setFormData({
      serviceFeeRate: event.serviceFeeRate,
      description: event.description || "",
      effectiveFrom: now, // Dùng ngày hiện tại làm hiệu lực từ
      effectiveTo: event.effectiveTo ? new Date(event.effectiveTo).toISOString().split("T")[0] : undefined,
    });
    setIsAllHistoryDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (serviceFee: ServiceFeeSetting) => {
    setSelectedServiceFee(serviceFee);
    setFormData({
      serviceFeeRate: serviceFee.serviceFeeRate,
      description: serviceFee.description || "",
      effectiveFrom: serviceFee.effectiveFrom
        ? new Date(serviceFee.effectiveFrom).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      effectiveTo: serviceFee.effectiveTo
        ? new Date(serviceFee.effectiveTo).toISOString().split("T")[0]
        : undefined,
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current ServiceFee Card */}
      {currentServiceFee && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Phí dịch vụ hiện tại đang áp dụng
                </h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {currentServiceFee.serviceFeeRate}%
              </div>
              {currentServiceFee.description && (
                <p className="text-gray-600">{currentServiceFee.description}</p>
              )}
              <div className="text-sm text-gray-500 mt-2 space-y-1">
                <p>
                  Có hiệu lực từ:{" "}
                  {new Date(currentServiceFee.effectiveFrom).toLocaleDateString("vi-VN")}
                </p>
                {currentServiceFee.effectiveTo ? (
                  <p>
                    Hiệu lực đến:{" "}
                    {new Date(currentServiceFee.effectiveTo).toLocaleDateString("vi-VN")}
                  </p>
                ) : (
                  <p>Hiệu lực đến: Không giới hạn</p>
                )}
              </div>
              {/* Cảnh báo nếu đang dùng serviceFee mặc định */}
              {currentServiceFee.isDefault && (
                <div className="mt-3 bg-orange-50 border border-orange-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-orange-800">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm font-medium">
                      ⚠️ ĐANG SỬ DỤNG PHÍ DỊCH VỤ MẶC ĐỊNH 3%. Hệ thống không có cấu hình phí dịch vụ active. Vui lòng tạo cấu hình phí dịch vụ mới ngay!
                    </p>
                  </div>
                </div>
              )}

              {/* Cảnh báo nếu serviceFee sắp hết hạn hoặc đã hết hạn */}
              {currentServiceFee.effectiveTo && !currentServiceFee.isDefault && (
                (() => {
                  const now = new Date();
                  const effectiveTo = new Date(currentServiceFee.effectiveTo);
                  const daysRemaining = Math.ceil(
                    (effectiveTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  if (daysRemaining <= 7 && daysRemaining > 0) {
                    return (
                      <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertCircle className="w-4 h-4" />
                          <p className="text-sm font-medium">
                            ⚠️ Phí dịch vụ sẽ hết hạn sau {daysRemaining} ngày ({new Date(currentServiceFee.effectiveTo).toLocaleDateString("vi-VN")}). 
                            <span className="font-bold"> Vui lòng tạo cấu hình phí dịch vụ mới trước khi hết hạn để tránh dùng phí dịch vụ mặc định 3%.</span>
                          </p>
                        </div>
                      </div>
                    );
                  } else if (daysRemaining <= 0) {
                    return (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-red-800">
                          <AlertCircle className="w-4 h-4" />
                          <p className="text-sm font-medium">
                            ❌ Phí dịch vụ đã hết hạn ({new Date(currentServiceFee.effectiveTo).toLocaleDateString("vi-VN")}). 
                            <span className="font-bold"> Vui lòng tạo cấu hình phí dịch vụ mới ngay! Hệ thống hiện đang dùng phí dịch vụ mặc định 3%.</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              {currentServiceFee.isActive ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Quản lý cấu hình phí dịch vụ</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleViewAllHistory}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <History className="w-4 h-4 mr-2" />
            Xem tất cả lịch sử
          </Button>
          <Button
            onClick={() => {
              setFormData({
                serviceFeeRate: 3,
                description: "",
                effectiveFrom: new Date().toISOString().split("T")[0],
              });
              setIsCreateDialogOpen(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tạo cấu hình phí dịch vụ mới
          </Button>
        </div>
      </div>

      {/* ServiceFee Settings Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Phí dịch vụ suất
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Hiệu lực từ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Hiệu lực đến
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {serviceFees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Không có cấu hình phí dịch vụ nào
                  </td>
                </tr>
              ) : (
                serviceFees.map((serviceFee) => {
                  const now = new Date();
                  const effectiveFrom = new Date(serviceFee.effectiveFrom);
                  const effectiveTo = serviceFee.effectiveTo ? new Date(serviceFee.effectiveTo) : null;
                  const isInEffect = effectiveFrom <= now && (!effectiveTo || effectiveTo >= now);
                  const isExpired = effectiveTo && effectiveTo < now;
                  
                  return (
                    <tr key={serviceFee._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-semibold text-gray-900">
                          {serviceFee.serviceFeeRate}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {serviceFee.description || "Không có mô tả"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {serviceFee.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Đang áp dụng
                          </span>
                        ) : isInEffect ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Trong hiệu lực (chưa kích hoạt)
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            <XCircle className="w-3 h-3 mr-1" />
                            Đã hết hạn
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            Chưa đến hiệu lực
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {effectiveFrom.toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {effectiveTo ? effectiveTo.toLocaleDateString("vi-VN") : "Không giới hạn"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(serviceFee)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(serviceFee)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="Xem lịch sử"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        {!serviceFee.isActive && isInEffect && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivate(serviceFee._id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Kích hoạt"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {!serviceFee.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(serviceFee._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Trang {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                Trước
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Tạo cấu hình phí dịch vụ mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="serviceFeeRate">Phí dịch vụ suất (%)</Label>
              <Input
                id="serviceFeeRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.serviceFeeRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serviceFeeRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="effectiveFrom">Hiệu lực từ</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveFrom: e.target.value })
                }
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="effectiveTo">Hiệu lực đến (tùy chọn)</Label>
              <Input
                id="effectiveTo"
                type="date"
                value={formData.effectiveTo || ""}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveTo: e.target.value || undefined })
                }
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsCreateDialogOpen(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                Hủy
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                Tạo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Cập nhật cấu hình phí dịch vụ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editServiceFeeRate">Phí dịch vụ suất (%)</Label>
              <Input
                id="editServiceFeeRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.serviceFeeRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serviceFeeRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="editDescription">Mô tả</Label>
              <Textarea
                id="editDescription"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="editEffectiveFrom">Hiệu lực từ</Label>
              <Input
                id="editEffectiveFrom"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveFrom: e.target.value })
                }
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="editEffectiveTo">Hiệu lực đến (tùy chọn)</Label>
              <Input
                id="editEffectiveTo"
                type="date"
                value={formData.effectiveTo || ""}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveTo: e.target.value || undefined })
                }
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsEditDialogOpen(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpdate}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                Cập nhật
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lịch sử thay đổi phí dịch vụ</DialogTitle>
          </DialogHeader>
          {history && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold mb-2 text-gray-900">Cấu hình hiện tại</h3>
                <p className="text-sm text-gray-600">
                  Phí dịch vụ suất: <span className="font-bold text-gray-900">{history.currentServiceFee.serviceFeeRate}%</span>
                </p>
                {history.currentServiceFee.description && (
                  <p className="text-sm text-gray-600">Mô tả: {history.currentServiceFee.description}</p>
                )}
              </div>
              {history.history && history.history.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="font-semibold mb-2 text-gray-900">Lịch sử thay đổi</h3>
                  {history.history.map((entry, index: number) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Phí dịch vụ suất: {entry.serviceFeeRate}%
                          </p>
                          {entry.description && (
                            <p className="text-xs text-gray-600 mt-1">
                              Mô tả: {entry.description}
                            </p>
                          )}
                          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                            {entry.effectiveFrom && (
                              <p>Hiệu lực từ: {new Date(entry.effectiveFrom).toLocaleDateString("vi-VN")}</p>
                            )}
                            {entry.effectiveTo ? (
                              <p>Hiệu lực đến: {new Date(entry.effectiveTo).toLocaleDateString("vi-VN")}</p>
                            ) : entry.effectiveFrom && (
                              <p className="text-gray-500">Hiệu lực đến: Không giới hạn</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Thay đổi lúc: {new Date(entry.changedAt).toLocaleString("vi-VN")}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          {entry.changedBy && (
                            <div className="text-xs text-gray-600">
                              <p className="font-medium">Người thay đổi:</p>
                              <p>{entry.changedBy.fullName}</p>
                              {entry.changedBy.email && (
                                <p className="text-gray-500">{entry.changedBy.email}</p>
                              )}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const now = new Date().toISOString().split("T")[0];
                              setFormData({
                                serviceFeeRate: entry.serviceFeeRate,
                                description: entry.description || "",
                                effectiveFrom: now,
                                effectiveTo: entry.effectiveTo ? new Date(entry.effectiveTo).toISOString().split("T")[0] : undefined,
                              });
                              setIsHistoryDialogOpen(false);
                              setIsCreateDialogOpen(true);
                            }}
                            className="text-green-600 border-green-300 hover:bg-green-50"
                            title="Áp dụng lại phí dịch vụ này"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Áp dụng lại
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Chưa có lịch sử thay đổi</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* All History Dialog */}
      <Dialog open={isAllHistoryDialogOpen} onOpenChange={setIsAllHistoryDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tất cả lịch sử phí dịch vụ</DialogTitle>
          </DialogHeader>
          {allHistory && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">
                  Tổng cộng: {allHistory.totalEvents} sự kiện từ {allHistory.totalServiceFees} cấu hình phí dịch vụ
                </p>
              </div>
              {allHistory.timeline && allHistory.timeline.length > 0 ? (
                <div className="space-y-3">
                  {allHistory.timeline.map((event, index: number) => (
                    <div
                      key={index}
                      className={`rounded-lg p-4 border ${
                        event.type === "create"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {event.type === "create" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                <Plus className="w-3 h-3 mr-1" />
                                Tạo mới
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                <Edit className="w-3 h-3 mr-1" />
                                Cập nhật
                              </span>
                            )}
                            <span className="text-sm font-semibold text-gray-900">
                              Phí dịch vụ suất: {event.serviceFeeRate}%
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              Mô tả: {event.description}
                            </p>
                          )}
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <p>Hiệu lực từ: {new Date(event.effectiveFrom).toLocaleDateString("vi-VN")}</p>
                            {event.effectiveTo ? (
                              <p>Hiệu lực đến: {new Date(event.effectiveTo).toLocaleDateString("vi-VN")}</p>
                            ) : (
                              <p className="text-gray-500">Hiệu lực đến: Không giới hạn</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {event.type === "create" 
                              ? event.createdAt 
                                ? `Tạo lúc: ${new Date(event.createdAt).toLocaleString("vi-VN")}`
                                : "Không có thông tin thời gian"
                              : event.changedAt
                                ? `Thay đổi lúc: ${new Date(event.changedAt).toLocaleString("vi-VN")}`
                                : "Không có thông tin thời gian"
                            }
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          {event.changedBy && (
                            <div className="text-xs text-gray-600 text-right">
                              <p className="font-medium">Người {event.type === "create" ? "tạo" : "thay đổi"}:</p>
                              <p>{event.changedBy.fullName}</p>
                              {event.changedBy.email && (
                                <p className="text-gray-500">{event.changedBy.email}</p>
                              )}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReapplyServiceFee(event)}
                            className="text-green-600 border-green-300 hover:bg-green-50"
                            title="Áp dụng lại phí dịch vụ này"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Áp dụng lại
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">Chưa có lịch sử</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

