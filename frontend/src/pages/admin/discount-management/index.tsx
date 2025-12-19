"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Label } from "@/components/ui/common/label";
import { Textarea } from "@/components/ui/common/textarea";
// (not using Radix Select here; native select is sufficient)
import { AlertCircle, Plus, CheckCircle, X, Info, Percent, DollarSign, Users, Globe, Calendar, Clock, Tag, Zap, Target, Gift, Package, Settings } from "lucide-react";
import { createDiscount, deactivateDiscount, activateDiscount, listDiscounts, setDiscountPublic, updateDiscount, type CreateDiscountRequest, type UpdateDiscountRequest, type Discount } from "@/services/products/discount/discount.api";
import { dashboardApi, type DashboardStats } from "@/services/admin/dashboard.api";

export default function DiscountManagementPage() {
  const [items, setItems] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [isCreatingWithAI, setIsCreatingWithAI] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
    isVisible: boolean;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  // Dashboard stats for insights
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  // Refs for datetime inputs
  const createStartAtRef = useRef<HTMLInputElement>(null);
  const createEndAtRef = useRef<HTMLInputElement>(null);
  const editStartAtRef = useRef<HTMLInputElement>(null);
  const editEndAtRef = useRef<HTMLInputElement>(null);

  // Helper to get current datetime in local format
  const getCurrentDateTimeLocal = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper to get future datetime in local format
  const getFutureDateTimeLocal = (days: number): string => {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const year = future.getFullYear();
    const month = String(future.getMonth() + 1).padStart(2, "0");
    const day = String(future.getDate()).padStart(2, "0");
    const hours = String(future.getHours()).padStart(2, "0");
    const minutes = String(future.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [form, setForm] = useState<CreateDiscountRequest>({
    type: "percent",
    value: 10,
    maxDiscountAmount: 0,
    minOrderAmount: 0,
    startAt: getCurrentDateTimeLocal(),
    endAt: getFutureDateTimeLocal(7),
    usageLimit: 0,
    notes: "",
    isPublic: false,
    codePrefix: "",
  });

  // Helpers for VNĐ formatting
  const formatVND = (value: number | undefined): string => {
    const n = Number.isFinite(value as number) ? Number(value) : 0;
    return n.toLocaleString("vi-VN");
  };
  const parseVND = (text: string): number => {
    const digits = text.replace(/[^0-9]/g, "");
    if (!digits) return 0;
    return Math.max(0, Math.floor(Number(digits)));
  };

  // Helper to format date to datetime-local format (using local time, not UTC)
  const formatToDateTimeLocal = (isoString: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    
    // Use local time instead of UTC to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message, isVisible: true });
    setTimeout(() => {
      setNotification(prev => prev ? { ...prev, isVisible: false } : null);
      setTimeout(() => setNotification(null), 300);
    }, 3000);
  };

  // legacy confirm helper (no longer used after inline toggles)

  const load = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const res = await listDiscounts(page, 20);
      if (res.status === "success" && res.data) {
        setItems(res.data);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        const errorMsg = res.message || "Không thể tải danh sách mã giảm giá";
        setError(errorMsg);
        showNotification("error", errorMsg);
      }
    } catch (e) {
      const err = e as Error;
      // Check if it's a network/CORS error
      let errorMsg: string;
      if (err.message.includes("Failed to fetch") || err.message.includes("Network or CORS")) {
        errorMsg = "Không thể kết nối đến server. Vui lòng kiểm tra xem backend server có đang chạy không (http://localhost:9999)";
      } else {
        errorMsg = err.message || "Lỗi khi tải danh sách mã giảm giá";
      }
      setError(errorMsg);
      showNotification("error", errorMsg);
      console.warn("Error loading discounts (backend may not be running):", err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadDashboardStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      console.log("Loading dashboard stats...");
      const stats = await dashboardApi.getDashboardStats();
      console.log("Dashboard stats loaded:", stats);
      setDashboardStats(stats);
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
      // Don't show error notification for stats, just log it
      setDashboardStats(null); // Ensure it's null on error
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadDashboardStats();
  }, [load, loadDashboardStats]);

  async function handleCreate() {
    try {
      setError(null);
      const payload: CreateDiscountRequest = {
        ...form,
        value: Number(form.value) || 0,
        maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        usageLimit: Number(form.usageLimit) || 0,
        codePrefix: (form.codePrefix || "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
        isPublic: form.isPublic,
      };
      const res = await createDiscount(payload);
      if (res.status === "success") {
        setIsCreateDialogOpen(false);
        showNotification("success", "Tạo mã giảm giá thành công!");
        await load();
      } else {
        const errorMsg = res.message || "Không thể tạo mã giảm giá";
        setError(errorMsg);
        showNotification("error", errorMsg);
      }
    } catch (e) {
      const err = e as Error;
      let errorMsg: string;
      if (err.message.includes("Failed to fetch") || err.message.includes("Network or CORS")) {
        errorMsg = "Không thể kết nối đến server. Vui lòng kiểm tra xem backend server có đang chạy không.";
      } else {
        errorMsg = err.message || "Lỗi khi tạo mã giảm giá";
      }
      setError(errorMsg);
      showNotification("error", errorMsg);
      console.warn("Error creating discount:", err.message);
    }
  }

  const updateStatus = async (discount: Discount, nextActive: boolean) => {
    if (discount.active === nextActive) return;
    try {
      setError(null);
      if (!nextActive) {
        const res = await deactivateDiscount(discount._id);
        if (res.status === "success") {
          showNotification("success", `Đã tắt trạng thái cho mã ${discount.code}`);
          await load();
        } else {
          const msg = res.message || "Không thể tắt trạng thái";
          setError(msg);
          showNotification("error", msg);
        }
      } else {
        const res = await activateDiscount(discount._id);
        if (res.status === "success") {
          showNotification("success", `Đã bật trạng thái cho mã ${discount.code}`);
          await load();
        } else {
          const msg = res.message || "Không thể bật trạng thái";
          setError(msg);
          showNotification("error", msg);
        }
      }
    } catch (e) {
      const err = e as Error;
      const msg = err.message || "Lỗi khi đổi trạng thái";
      setError(msg);
      showNotification("error", msg);
    }
  };

  const updateScope = async (discount: Discount, nextPublic: boolean) => {
    if ((discount.isPublic ?? false) === nextPublic) return;
    try {
      setError(null);
      if (!nextPublic) {
        const res = await updateDiscount(discount._id, { isPublic: false });
        if (res.status === "success") {
          showNotification("success", `Đã chuyển phạm vi mã ${discount.code} sang riêng tư`);
          await load();
        } else {
          const msg = res.message || "Không thể chuyển về riêng tư";
          setError(msg);
          showNotification("error", msg);
        }
      } else {
        const res = await setDiscountPublic(discount._id);
        if (res.status === "success") {
          showNotification("success", `Đã chuyển phạm vi mã ${discount.code} sang công khai`);
          await load();
        } else {
          const msg = res.message || "Không thể đặt công khai";
          setError(msg);
          showNotification("error", msg);
        }
      }
    } catch (e) {
      const err = e as Error;
      const msg = err.message || "Lỗi khi chuyển phạm vi";
      setError(msg);
      showNotification("error", msg);
    }
  };

  function handleEdit(discount: Discount) {
    setEditingDiscount(discount);
    setForm({
      type: discount.type,
      value: discount.value,
      maxDiscountAmount: discount.maxDiscountAmount || 0,
      minOrderAmount: discount.minOrderAmount || 0,
      startAt: formatToDateTimeLocal(discount.startAt),
      endAt: formatToDateTimeLocal(discount.endAt),
      usageLimit: discount.usageLimit || 0,
      notes: discount.notes || "",
      isPublic: discount.isPublic ?? false,
    });
    setIsEditDialogOpen(true);
  }

  async function handleUpdate() {
    if (!editingDiscount) return;
    try {
      setError(null);
      const payload: UpdateDiscountRequest = {
        type: form.type,
        value: Number(form.value) || 0,
        maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        startAt: form.startAt,
        endAt: form.endAt,
        usageLimit: Number(form.usageLimit) || 0,
        notes: form.notes,
        isPublic: form.isPublic,
      };
      const res = await updateDiscount(editingDiscount._id, payload);
      if (res.status === "success") {
        setIsEditDialogOpen(false);
        setEditingDiscount(null);
        showNotification("success", "Cập nhật mã giảm giá thành công!");
        await load();
      } else {
        const errorMsg = res.message || "Không thể cập nhật mã giảm giá";
        setError(errorMsg);
        showNotification("error", errorMsg);
      }
    } catch (e) {
      const err = e as Error;
      let errorMsg: string;
      if (err.message.includes("Failed to fetch") || err.message.includes("Network or CORS")) {
        errorMsg = "Không thể kết nối đến server. Vui lòng kiểm tra xem backend server có đang chạy không.";
      } else {
        errorMsg = err.message || "Lỗi khi cập nhật mã giảm giá";
      }
      setError(errorMsg);
      showNotification("error", errorMsg);
      console.warn("Error updating discount:", err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* System Insights & Recommendations */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg relative">
              <Zap className="w-8 h-8 text-white" />
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                AI
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-gray-900">Thông tin hệ thống & Gợi ý</h3>
                <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                  Powered by AI
                </span>
              </div>
              <p className="text-gray-600 mt-1">Phân tích thông minh dựa trên dữ liệu thực tế để đưa ra chiến lược ưu đãi hiệu quả</p>
            </div>
          </div>

          {/* Stats Cards - Mã giảm giá & Hệ thống */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Mã giảm giá Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Đang hoạt động</p>
                  <p className="text-xs text-gray-500">Mã giảm giá</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">{items.filter(d => d.active).length}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Tag className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng mã</p>
                  <p className="text-xs text-gray-500">Tổng số mã giảm giá</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-600">{items.length}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Riêng tư</p>
                  <p className="text-xs text-gray-500">Mã riêng tư</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-600">{items.filter(d => !d.isPublic).length}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Đã sử dụng</p>
                  <p className="text-xs text-gray-500">Tổng lượt sử dụng</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-orange-600">{items.reduce((sum, d) => sum + (d.usedCount || 0), 0)}</p>
          </div>

            {/* Hệ thống Stats */}
            {loadingStats ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : dashboardStats ? (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tổng doanh thu</p>
                      <p className="text-xs text-gray-500">Từ tất cả đơn hàng</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{dashboardStats.revenue.value}₫</p>
                  <div className="flex items-center gap-1 mt-1">
                    {dashboardStats.revenue.changeType === 'increase' ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                    <span className={`text-xs ${dashboardStats.revenue.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardStats.revenue.change > 0 ? '+' : ''}{dashboardStats.revenue.change}%
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tổng đơn hàng</p>
                      <p className="text-xs text-gray-500">Đã hoàn thành</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{dashboardStats.orders.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {dashboardStats.orders.changeType === 'increase' ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                    <span className={`text-xs ${dashboardStats.orders.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardStats.orders.change > 0 ? '+' : ''}{dashboardStats.orders.change}%
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tổng người dùng</p>
                      <p className="text-xs text-gray-500">Đã đăng ký</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{dashboardStats.users.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {dashboardStats.users.changeType === 'increase' ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                    <span className={`text-xs ${dashboardStats.users.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardStats.users.change > 0 ? '+' : ''}{dashboardStats.users.change}%
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Gift className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Đơn hàng chờ</p>
                      <p className="text-xs text-gray-500">Cần xử lý</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{dashboardStats.pendingOrders?.value || '0'}</p>
                  <p className="text-xs text-gray-500 mt-1">Đang chờ xác nhận</p>
                </div>
              </>
            ) : (
              <div className="col-span-full bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800">Không thể tải thống kê hệ thống</p>
                    <p className="text-sm text-yellow-700">Vui lòng kiểm tra kết nối và thử lại</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis Toggle Button */}
          {dashboardStats && (
            <div className="mb-6 flex justify-center">
              <Button
                onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                variant="outline"
                className={`border-2 transition-all duration-300 ${
                  showAIAnalysis
                    ? "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-500 text-purple-700 hover:from-purple-100 hover:to-pink-100"
                    : "border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                }`}
              >
                <Target className="w-4 h-4 mr-2" />
                {showAIAnalysis ? "Ẩn kết quả phân tích AI" : "Xem kết quả phân tích AI"}
                {!showAIAnalysis && (
                  <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                    AI
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* AI Recommendations */}
          {dashboardStats && showAIAnalysis && (
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-6 border-2 border-indigo-200 relative overflow-hidden">
              {/* AI Badge Background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
              <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg relative">
                    <Target className="w-6 h-6 text-white" />
                    <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                      AI
                </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-gray-900">🤖 AI Gợi ý Chiến Lược Ưu Đãi</h4>
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                        AI-Powered
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Phân tích thông minh dựa trên dữ liệu hệ thống hiện tại</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Revenue-based suggestions */}
                <div className="bg-white rounded-lg p-4 border-2 border-indigo-200 relative overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-2xl opacity-50"></div>
                  <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                    <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                    <span className="font-semibold text-gray-800">Chiến lược doanh thu</span>
                      <span className="ml-auto px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold rounded">
                        AI
                      </span>
                  </div>
                  <div className="space-y-2">
                    {dashboardStats.revenue.rawValue > 10000000 ? (
                      <div className="text-sm">
                        <p className="font-medium text-green-700">🎉 Doanh thu cao!</p>
                        <p className="text-xs text-gray-600">Tạo ưu đãi 10-15% cho đơn hàng lớn để tăng loyalty</p>
                      </div>
                    ) : dashboardStats.revenue.rawValue > 5000000 ? (
                      <div className="text-sm">
                        <p className="font-medium text-blue-700">📈 Đang phát triển</p>
                        <p className="text-xs text-gray-600">Ưu đãi 5-10% cho khách hàng thân thiết</p>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <p className="font-medium text-orange-700">🚀 Cần tăng trưởng</p>
                        <p className="text-xs text-gray-600">Ưu đãi 15-20% cho đơn hàng đầu tiên</p>
                      </div>
                    )}
                  </div>
                  </div>
                </div>

                {/* Order-based suggestions */}
                <div className="bg-white rounded-lg p-4 border-2 border-indigo-200 relative overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-2xl opacity-50"></div>
                  <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                    <Package className="w-4 h-4 text-blue-600" />
                      </div>
                    <span className="font-semibold text-gray-800">Chiến lược đơn hàng</span>
                      <span className="ml-auto px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold rounded">
                        AI
                      </span>
                  </div>
                  <div className="space-y-2">
                    {dashboardStats.orders.rawValue > 100 ? (
                      <div className="text-sm">
                        <p className="font-medium text-green-700">🔥 Tần suất cao</p>
                        <p className="text-xs text-gray-600">Tạo ưu đãi combo cho khách hàng thường xuyên</p>
                      </div>
                    ) : dashboardStats.orders.rawValue > 50 ? (
                      <div className="text-sm">
                        <p className="font-medium text-blue-700">📊 Đang ổn định</p>
                        <p className="text-xs text-gray-600">Ưu đãi gia hạn thuê để tăng thời gian sử dụng</p>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <p className="font-medium text-purple-700">🌱 Cần kích thích</p>
                        <p className="text-xs text-gray-600">Ưu đãi giảm 20-30% cho sản phẩm mới</p>
                      </div>
                    )}
                  </div>
                  </div>
                </div>

                {/* User-based suggestions */}
                <div className="bg-white rounded-lg p-4 border-2 border-indigo-200 relative overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-2xl opacity-50"></div>
                  <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                    <Users className="w-4 h-4 text-purple-600" />
                      </div>
                    <span className="font-semibold text-gray-800">Chiến lược người dùng</span>
                      <span className="ml-auto px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold rounded">
                        AI
                      </span>
                  </div>
                  <div className="space-y-2">
                    {dashboardStats.users.rawValue > 500 ? (
                      <div className="text-sm">
                        <p className="font-medium text-green-700">👥 Cộng đồng lớn</p>
                        <p className="text-xs text-gray-600">Tạo ưu đãi referral để tăng người dùng mới</p>
                      </div>
                    ) : dashboardStats.users.rawValue > 200 ? (
                      <div className="text-sm">
                        <p className="font-medium text-blue-700">👨‍👩‍👧‍👦 Cộng đồng đang phát triển</p>
                        <p className="text-xs text-gray-600">Ưu đãi đặc biệt cho nhóm người dùng tích cực</p>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <p className="font-medium text-orange-700">🎯 Cần mở rộng</p>
                        <p className="text-xs text-gray-600">Ưu đãi đăng ký và đơn hàng đầu tiên</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </div>
        </div>

              {/* AI Conclusion */}
              <div className="mt-6 pt-6 border-t-2 border-indigo-200">
                <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 rounded-xl p-5 border-2 border-purple-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
                  <div className="relative">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex-shrink-0">
                        <Info className="w-5 h-5 text-white" />
            </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-lg font-bold text-gray-900">📊 Kết Luận & Đề Xuất</h4>
                          <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                            AI Analysis
                    </span>
                  </div>
                        <div className="space-y-3">
          {dashboardStats && (
                            <>
                              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
                                <p className="text-sm text-gray-800 leading-relaxed">
                                  <span className="font-semibold text-purple-700">Dựa trên phân tích dữ liệu:</span> Hệ thống của bạn hiện có{' '}
                                  <span className="font-bold text-green-600">{dashboardStats.orders.value}</span> đơn hàng,{' '}
                                  <span className="font-bold text-blue-600">{dashboardStats.users.value}</span> người dùng và doanh thu{' '}
                                  <span className="font-bold text-purple-600">{dashboardStats.revenue.value}₫</span>.
                                </p>
                </div>
                              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
                                <p className="text-sm text-gray-800 leading-relaxed">
                                  <span className="font-semibold text-pink-700">💡 Đề xuất chiến lược:</span>{' '}
                    {dashboardStats.revenue.rawValue > 10000000 ? (
                                    <>Với doanh thu cao, nên tập trung vào <span className="font-semibold">ưu đãi loyalty</span> cho khách hàng thân thiết (10-15%) và tăng giá trị đơn hàng trung bình.</>
                    ) : dashboardStats.revenue.rawValue > 5000000 ? (
                                    <>Hệ thống đang phát triển tốt, nên tạo <span className="font-semibold">ưu đãi tăng trưởng</span> (5-10%) để thu hút khách hàng mới và giữ chân khách hàng hiện tại.</>
                    ) : (
                                    <>Cần <span className="font-semibold">kích thích tăng trưởng</span> với ưu đãi mạnh (15-20%) cho đơn hàng đầu tiên và chương trình referral để mở rộng cơ sở khách hàng.</>
                    )}
                                </p>
                  </div>
                              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
                                <p className="text-sm text-gray-800 leading-relaxed">
                                  <span className="font-semibold text-indigo-700">🎯 Hành động ưu tiên:</span>{' '}
                    {dashboardStats.orders.rawValue > 100 ? (
                                    <>Tạo <span className="font-semibold">ưu đãi combo</span> cho khách hàng thường xuyên và <span className="font-semibold">chương trình tích điểm</span> để tăng tần suất mua hàng.</>
                    ) : dashboardStats.orders.rawValue > 50 ? (
                                    <>Tập trung vào <span className="font-semibold">ưu đãi gia hạn</span> và <span className="font-semibold">upsell</span> để tăng giá trị đơn hàng.</>
                    ) : (
                                    <>Ưu tiên <span className="font-semibold">ưu đãi đăng ký</span>, <span className="font-semibold">first-time buyer</span> và <span className="font-semibold">social sharing</span> để tăng độ nhận biết thương hiệu.</>
                                  )}
                                </p>
                      </div>
                            </>
                    )}
                  </div>
                </div>
                  </div>
                      </div>
                      </div>
              </div>

                      </div>
                    )}
              </div>

      {/* Action Buttons - Create Discount */}
      <div className="mb-6 flex flex-wrap justify-end gap-3">
                <Button
                  onClick={() => {
            setIsCreatingWithAI(false);
            setIsCreateDialogOpen(true);
          }}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          Tạo ưu đãi
        </Button>
        {dashboardStats && (
          <Button
            onClick={() => {
              setIsCreatingWithAI(true);
                    setForm(prev => ({
                      ...prev,
                      type: "percent",
                      value: dashboardStats.revenue.rawValue > 10000000 ? 15 : dashboardStats.revenue.rawValue > 5000000 ? 10 : 20,
                      minOrderAmount: dashboardStats.revenue.rawValue > 10000000 ? 500000 : 200000,
                      isPublic: true,
                startAt: getCurrentDateTimeLocal(),
                endAt: getFutureDateTimeLocal(7),
                    }));
                    setIsCreateDialogOpen(true);
                  }}
            className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <span className="relative flex items-center">
              <span className="mr-2">🤖</span>
              <Gift className="w-5 h-5 mr-2" />
              Tạo ưu đãi với AI
            </span>
                </Button>
          )}
        </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải danh sách ưu đãi...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có ưu đãi nào</h3>
                <p className="text-gray-600 mb-4">Hãy tạo ưu đãi đầu tiên để thu hút khách hàng!</p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo ưu đãi đầu tiên
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Mã ưu đãi</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Mức giảm</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sử dụng</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Thời gian</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phạm vi</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((d) => {
                    const start = new Date(d.startAt);
                    const end = new Date(d.endAt);
                    const now = new Date();
                    const isActive = d.active && start <= now && end >= now;

                    return (
                      <tr key={d._id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              d.type === "percent" ? "bg-orange-100" : "bg-green-100"
                            }`}>
                              {d.type === "percent" ? (
                                <Percent className="w-5 h-5 text-orange-600" />
                              ) : (
                                <DollarSign className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-mono font-bold text-gray-900">{d.code}</p>
                              <p className="text-xs text-gray-500">
                                {d.type === "percent" ? `${d.value}%` : `${d.value.toLocaleString("vi-VN")}₫`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {d.type === "percent" ? `${d.value}%` : `${d.value.toLocaleString("vi-VN")}₫`}
                            </p>
                            {(d.minOrderAmount || 0) > 0 && (
                              <p className="text-xs text-gray-500">
                                Từ {(d.minOrderAmount || 0).toLocaleString("vi-VN")}₫
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">
                              {(d.usedCount || 0)}
                            </div>
                            {(d.usageLimit || 0) > 0 && (
                              <>
                                <span className="text-gray-400">/</span>
                                <span className="text-sm text-gray-600">{d.usageLimit}</span>
                              </>
                            )}
                            {(d.usageLimit || 0) === 0 && (
                              <span className="text-xs text-green-600 font-medium">∞</span>
                            )}
                          </div>
                          {(d.usageLimit || 0) > 0 && (
                            <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min(100, ((d.usedCount || 0) / (d.usageLimit || 1)) * 100)}%`
                                }}
                              ></div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <p className="font-medium">
                              {start.toLocaleDateString("vi-VN")}
                            </p>
                            <p className="text-gray-500 text-xs">
                              đến {end.toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            <select
                              value={d.active ? "active" : "inactive"}
                              onChange={(e) => updateStatus(d, e.target.value === "active")}
                              className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${
                                d.active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <option value="active">Hoạt động</option>
                              <option value="inactive">Tạm dừng</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {d.isPublic ? (
                              <>
                                <Globe className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                                  Công khai
                                </span>
                              </>
                            ) : (
                              <>
                                <Users className="w-4 h-4 text-purple-500" />
                                <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                                  Riêng tư
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(d)}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-medium"
                          >
                            Chỉnh sửa
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                Trang <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-200"
                >
                  ‹ Trước
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-200"
                >
                  Sau ›
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Pop-up Modal */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Tạo ưu đãi mới</h2>
                  <p className="text-sm opacity-90">Thiết lập chương trình giảm giá cho khách hàng</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsCreatingWithAI(false);
                }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI Suggestions in Create Form */}
              {dashboardStats && isCreatingWithAI && (
                <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 rounded-xl p-4 border-2 border-purple-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-200/40 to-pink-200/40 rounded-full blur-3xl"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg relative">
                        <Target className="w-5 h-5 text-white" />
                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                          AI
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">🤖 AI Gợi ý Tự Động</h3>
                          <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                            AI-Powered
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Dựa trên phân tích dữ liệu hệ thống, AI đề xuất:</p>
                      </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            Mức giảm: <span className="text-purple-600 font-bold">
                              {dashboardStats.revenue.rawValue > 10000000 ? "15%" : dashboardStats.revenue.rawValue > 5000000 ? "10%" : "20%"}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Đơn hàng tối thiểu: <span className="font-semibold">
                              {dashboardStats.revenue.rawValue > 10000000 ? "500.000₫" : "200.000₫"}
                            </span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              type: "percent",
                              value: dashboardStats.revenue.rawValue > 10000000 ? 15 : dashboardStats.revenue.rawValue > 5000000 ? 10 : 20,
                              minOrderAmount: dashboardStats.revenue.rawValue > 10000000 ? 500000 : 200000,
                              isPublic: true,
                            }));
                          }}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs"
                        >
                          Áp dụng AI
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Section */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Xem trước ưu đãi</h3>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Percent className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-800">
                          Giảm {form.type === "percent" ? `${form.value}%` : `${form.value.toLocaleString("vi-VN")}₫`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {(form.minOrderAmount || 0) > 0 ? `Đơn hàng từ ${(form.minOrderAmount || 0).toLocaleString("vi-VN")}₫` : "Áp dụng cho tất cả đơn hàng"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Mã ưu đãi</p>
                      <p className="font-mono font-bold text-purple-600">
                        {form.codePrefix ? `${form.codePrefix}-XXXX` : "AUTO-GENERATED"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Form Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Discount Setup */}
                <div className="space-y-6">
                  {/* Discount Type & Value */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Percent className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-800">Thiết lập mức giảm</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Kiểu giảm giá</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, type: "percent", value: Math.min(100, Math.max(0, prev.value)) }))}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              form.type === "percent"
                                ? "border-purple-500 bg-purple-50 text-purple-700"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <Percent className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-sm font-medium">Phần trăm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, type: "fixed", value: Math.max(0, Math.floor(prev.value)) }))}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              form.type === "fixed"
                                ? "border-purple-500 bg-purple-50 text-purple-700"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <DollarSign className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-sm font-medium">Số tiền</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Mức giảm {form.type === "percent" ? "(%)" : "(VNĐ)"}
                        </Label>
                        {form.type === "percent" ? (
                          <Input
                            type="number"
                            value={form.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const raw = Number(e.target.value);
                              const clamped = Math.min(100, Math.max(0, isFinite(raw) ? raw : 0));
                              setForm({ ...form, value: clamped });
                            }}
                            className="mt-2"
                            placeholder="Ví dụ: 20"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={formatVND(form.value)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const vnd = parseVND(e.target.value);
                              setForm({ ...form, value: vnd });
                            }}
                            className="mt-2"
                            placeholder="Ví dụ: 50.000"
                          />
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {form.type === "percent" ? "Tối đa 100%" : "Số tiền giảm cố định"}
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Tiền tố mã giảm giá (Tùy chọn)
                        </Label>
                        <Input
                          type="text"
                          value={form.codePrefix || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                            setForm({ ...form, codePrefix: value });
                          }}
                          className="mt-2 font-mono"
                          placeholder="Ví dụ: SALE, PROMO, VIP"
                          maxLength={10}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Chỉ chữ cái và số, tối đa 10 ký tự. Mã sẽ được tạo tự động với tiền tố này.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Conditions */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-800">Điều kiện áp dụng</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Đơn hàng tối thiểu</Label>
                        <Input
                          type="text"
                          value={formatVND(form.minOrderAmount || 0)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setForm({ ...form, minOrderAmount: parseVND(e.target.value) })
                          }
                          className="mt-2"
                          placeholder="Ví dụ: 200.000"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Để trống nếu áp dụng cho tất cả đơn hàng
                        </p>
                      </div>

                      {form.type === "percent" && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Giảm tối đa</Label>
                          <Input
                            type="text"
                            value={formatVND(form.maxDiscountAmount || 0)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setForm({ ...form, maxDiscountAmount: parseVND(e.target.value) })
                            }
                            className="mt-2"
                            placeholder="Ví dụ: 100.000"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Giới hạn số tiền giảm tối đa cho phần trăm
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Settings */}
                <div className="space-y-6">
                  {/* Who can use */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-800">Ai có thể sử dụng</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, isPublic: false }))}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            !form.isPublic
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Users className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-sm font-medium">Khách hàng cụ thể</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, isPublic: true }))}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            form.isPublic
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Globe className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-sm font-medium">Tất cả khách hàng</span>
                        </button>
                      </div>

                      <div className={`p-3 rounded-lg ${form.isPublic ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-200'}`}>
                        <p className="text-sm">
                          <span className="font-medium">
                            {form.isPublic ? "🌍 Ưu đãi công khai:" : "👤 Ưu đãi riêng tư:"}
                          </span>
                          <br />
                          {form.isPublic
                            ? "Tất cả khách hàng đều có thể thấy và sử dụng ưu đãi này."
                            : "Chỉ những khách hàng được bạn chỉ định mới có thể sử dụng."
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Time Settings */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-gray-800">Thời gian áp dụng</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Bắt đầu từ</Label>
                          <div className="relative mt-2">
                            <input
                              ref={createStartAtRef}
                            type="datetime-local"
                              value={form.startAt || ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value;
                                setForm({ ...form, startAt: value });
                              }}
                              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 pr-10 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (createStartAtRef.current) {
                                  if (createStartAtRef.current.showPicker) {
                                    createStartAtRef.current.showPicker();
                                  } else {
                                    createStartAtRef.current.focus();
                                  }
                                }
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-purple-600 transition-colors rounded hover:bg-purple-50"
                              title="Chọn ngày và giờ"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Kết thúc vào</Label>
                          <div className="relative mt-2">
                            <input
                              ref={createEndAtRef}
                            type="datetime-local"
                              value={form.endAt || ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value;
                                setForm({ ...form, endAt: value });
                              }}
                              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 pr-10 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (createEndAtRef.current) {
                                  if (createEndAtRef.current.showPicker) {
                                    createEndAtRef.current.showPicker();
                                  } else {
                                    createEndAtRef.current.focus();
                                  }
                                }
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-purple-600 transition-colors rounded hover:bg-purple-50"
                              title="Chọn ngày và giờ"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Usage Limit */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-red-600" />
                      <h3 className="font-semibold text-gray-800">Giới hạn sử dụng</h3>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">Số lần dùng tối đa</Label>
                      <Input
                        type="number"
                        value={form.usageLimit || 0}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                        className="mt-2"
                        placeholder="Ví dụ: 100"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Để 0 nếu không giới hạn số lần sử dụng
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-800">Ghi chú</h3>
                    </div>

                    <Textarea
                      value={form.notes || ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Thêm ghi chú về ưu đãi này..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsCreatingWithAI(false);
                  }}
                  className="px-6"
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={() => {
                    handleCreate();
                    setIsCreatingWithAI(false);
                  }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Tạo ưu đãi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pop-up Modal */}
      {isEditDialogOpen && editingDiscount && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Chỉnh sửa ưu đãi</h2>
                  <p className="text-sm opacity-90">Cập nhật thông tin ưu đãi</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingDiscount(null);
                }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Code Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Tag className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Thông tin mã ưu đãi</h3>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg text-gray-800">{editingDiscount.code}</p>
                      <p className="text-sm text-gray-600">Mã ưu đãi không thể thay đổi</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Đã sử dụng: <span className="font-semibold text-gray-900">{editingDiscount.usedCount || 0}</span>
                        {(editingDiscount.usageLimit || 0) > 0 && (
                          <span className="text-gray-400"> / {editingDiscount.usageLimit}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Xem trước ưu đãi</h3>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        form.type === "percent" ? "bg-orange-100" : "bg-green-100"
                      }`}>
                        {form.type === "percent" ? (
                          <Percent className="w-6 h-6 text-orange-600" />
                        ) : (
                          <DollarSign className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-800">
                          Giảm {form.type === "percent" ? `${form.value}%` : `${form.value.toLocaleString("vi-VN")}₫`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {(form.minOrderAmount || 0) > 0 ? `Đơn hàng từ ${(form.minOrderAmount || 0).toLocaleString("vi-VN")}₫` : "Áp dụng cho tất cả đơn hàng"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Mã ưu đãi</p>
                      <p className="font-mono font-bold text-purple-600">{editingDiscount.code}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Form Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Discount Setup */}
                <div className="space-y-6">
                  {/* Discount Type & Value */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Percent className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-800">Thiết lập mức giảm</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Kiểu giảm giá</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, type: "percent", value: Math.min(100, Math.max(0, prev.value)) }))}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              form.type === "percent"
                                ? "border-purple-500 bg-purple-50 text-purple-700"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <Percent className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-sm font-medium">Phần trăm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, type: "fixed", value: Math.max(0, Math.floor(prev.value)) }))}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              form.type === "fixed"
                                ? "border-purple-500 bg-purple-50 text-purple-700"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <DollarSign className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-sm font-medium">Số tiền</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Mức giảm {form.type === "percent" ? "(%)" : "(VNĐ)"}
                        </Label>
                        {form.type === "percent" ? (
                          <Input
                            type="number"
                            value={form.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const raw = Number(e.target.value);
                              const clamped = Math.min(100, Math.max(0, isFinite(raw) ? raw : 0));
                              setForm({ ...form, value: clamped });
                            }}
                            className="mt-2"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={formatVND(form.value)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const vnd = parseVND(e.target.value);
                              setForm({ ...form, value: vnd });
                            }}
                            className="mt-2"
                          />
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {form.type === "percent" ? "Tối đa 100%" : "Số tiền giảm cố định"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Conditions */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-800">Điều kiện áp dụng</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Đơn hàng tối thiểu</Label>
                        <Input
                          type="text"
                          value={formatVND(form.minOrderAmount || 0)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setForm({ ...form, minOrderAmount: parseVND(e.target.value) })
                          }
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Để trống nếu áp dụng cho tất cả đơn hàng
                        </p>
                      </div>

                      {form.type === "percent" && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Giảm tối đa</Label>
                          <Input
                            type="text"
                            value={formatVND(form.maxDiscountAmount || 0)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setForm({ ...form, maxDiscountAmount: parseVND(e.target.value) })
                            }
                            className="mt-2"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Giới hạn số tiền giảm tối đa cho phần trăm
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Settings */}
                <div className="space-y-6">
                  {/* Who can use */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-800">Ai có thể sử dụng</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, isPublic: false }))}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            !form.isPublic
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Users className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-sm font-medium">Khách hàng cụ thể</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, isPublic: true }))}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            form.isPublic
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Globe className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-sm font-medium">Tất cả khách hàng</span>
                        </button>
                      </div>

                      <div className={`p-3 rounded-lg ${form.isPublic ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-200'}`}>
                        <p className="text-sm">
                          <span className="font-medium">
                            {form.isPublic ? "🌍 Ưu đãi công khai:" : "👤 Ưu đãi riêng tư:"}
                          </span>
                          <br />
                          {form.isPublic
                            ? "Tất cả khách hàng đều có thể thấy và sử dụng ưu đãi này."
                            : "Chỉ những khách hàng được bạn chỉ định mới có thể sử dụng."
                          }
                        </p>
                      </div>

                      {editingDiscount?.isPublic && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-700">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            Ưu đãi công khai không thể chuyển thành riêng tư sau khi tạo.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time Settings */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-gray-800">Thời gian áp dụng</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Bắt đầu từ</Label>
                          <div className="relative mt-2">
                            <input
                            type="datetime-local"
                              id="startAt-input"
                              value={form.startAt || ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value;
                                setForm({ ...form, startAt: value });
                              }}
                              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 pr-10 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById("startAt-input") as HTMLInputElement;
                                if (input) {
                                  if (input.showPicker) {
                                    input.showPicker();
                                  } else {
                                    input.focus();
                                  }
                                }
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-purple-600 transition-colors rounded hover:bg-purple-50"
                              title="Chọn ngày và giờ"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Kết thúc vào</Label>
                          <div className="relative mt-2">
                            <input
                            type="datetime-local"
                              id="endAt-input"
                              value={form.endAt || ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value;
                                setForm({ ...form, endAt: value });
                              }}
                              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 pr-10 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById("endAt-input") as HTMLInputElement;
                                if (input) {
                                  if (input.showPicker) {
                                    input.showPicker();
                                  } else {
                                    input.focus();
                                  }
                                }
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-purple-600 transition-colors rounded hover:bg-purple-50"
                              title="Chọn ngày và giờ"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Usage Limit */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-red-600" />
                      <h3 className="font-semibold text-gray-800">Giới hạn sử dụng</h3>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">Số lần dùng tối đa</Label>
                      <Input
                        type="number"
                        value={form.usageLimit || 0}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Để 0 nếu không giới hạn số lần sử dụng
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-800">Ghi chú</h3>
                    </div>

                    <Textarea
                      value={form.notes || ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Thêm ghi chú về ưu đãi này..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingDiscount(null);
                  }}
                  className="px-6"
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={handleUpdate}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Cập nhật ưu đãi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Pop-up */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[10000] transition-all duration-300 ease-in-out ${
            notification.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <div
            className={`min-w-[320px] max-w-md rounded-lg shadow-2xl border-2 p-4 flex items-start gap-3 ${
              notification.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : notification.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {notification.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : notification.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : (
                <Info className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{notification.message}</p>
            </div>
            <button
              onClick={() => {
                setNotification(prev => prev ? { ...prev, isVisible: false } : null);
                setTimeout(() => setNotification(null), 300);
              }}
              className={`flex-shrink-0 ml-2 p-1 rounded hover:bg-black/10 transition-colors ${
                notification.type === "success"
                  ? "text-green-700 hover:bg-green-100"
                  : notification.type === "error"
                  ? "text-red-700 hover:bg-red-100"
                  : "text-blue-700 hover:bg-blue-100"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog Pop-up */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-gray-200 w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmDialog.title}</h3>
                <p className="text-sm text-gray-600">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirmDialog.onCancel) confirmDialog.onCancel();
                  setConfirmDialog(null);
                }}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                Hủy
              </Button>
              <Button
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}


