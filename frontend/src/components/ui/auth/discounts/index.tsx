"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Badge } from "@/components/ui/common/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/common/select";
import {
  AlertCircle,
  Copy,
  Tag,
  Gift,
  Sparkles,
  CheckCircle,
  X,
  Info,
  Loader2,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { listAvailableDiscounts, type Discount } from "@/services/products/discount/discount.api";
import { cn } from "@/lib/utils";

export default function MyDiscountsPage() {
  const router = useRouter();
  const { accessToken } = useSelector((s: RootState) => s.auth);
  const [items, setItems] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState<"all" | "active" | "expiring">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "percent" | "fixed">("all");
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
    isVisible: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listAvailableDiscounts(page, 20);
      if (res.status === "success" && res.data) {
        // Kết hợp public và special discounts
        const allDiscounts = [...(res.data.public || []), ...(res.data.special || [])];
        setItems(allDiscounts);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        setError(res.message || "Không thể tải danh sách mã của bạn");
      }
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!accessToken) return;
    load();
  }, [accessToken, load]);

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message, isVisible: true });
    setTimeout(() => {
      setNotification(prev => prev ? { ...prev, isVisible: false } : null);
      setTimeout(() => setNotification(null), 300);
    }, 3000);
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showNotification("success", "Đã sao chép mã!");
    } catch {
      showNotification("error", "Không thể sao chép mã");
    }
  };

  // Filter special discounts (discount đặc biệt gán riêng cho user)
  const specialDiscounts = useMemo(() => {
    return items.filter((d) => {
      // Backend đã filter thời gian, chỉ cần check isSpecial flag
      return d.isSpecial === true;
    });
  }, [items]);

  // Filter public discounts (discount công khai)
  const publicDiscounts = useMemo(() => {
    return items.filter((d) => {
      // Backend đã filter thời gian, chỉ cần check không phải special
      return d.isSpecial !== true;
    });
  }, [items]);

  // Combine all available discounts for main list
  const allAvailableDiscounts = useMemo(() => {
    return items; // Backend đã filter và trả về tất cả discount đang sử dụng được
  }, [items]);

  const filteredItems = useMemo(() => {
    const now = new Date();

    // Start with ALL available discounts (backend đã filter thời gian)
    let list = allAvailableDiscounts;

    // Apply tab filters
    if (tab === "active") {
      // Backend đã filter, tất cả discount đều đang active
      // Không cần filter thêm
      list = list;
    } else if (tab === "expiring") {
      // Only show discounts that are expiring soon (within 7 days)
      list = list.filter((d) => {
        const end = new Date(d.endAt);
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 7;
      });
    }
    // "all" tab shows all available discounts (backend đã filter)

    // Apply type filter
    if (typeFilter !== "all") {
      list = list.filter((d) => d.type === typeFilter);
    }

    return list;
  }, [allAvailableDiscounts, tab, typeFilter]);

  const tabs = [
    { key: "all" as const, label: "Tất cả", icon: Tag },
    { key: "active" as const, label: "Đang hiệu lực", icon: CheckCircle },
    { key: "expiring" as const, label: "Sắp hết hạn", icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mã giảm giá của tôi</h1>
              <p className="text-gray-600 mt-1">Xem và sao chép mã giảm giá bạn được phép sử dụng</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Special Discounts Section - Discount đặc biệt gán riêng cho user */}
        {!loading && specialDiscounts.length > 0 && (
          <Card className="mb-8 border-0 shadow-xl bg-gradient-to-br from-purple-50 via-pink-50/50 to-purple-50/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-100 rounded-xl">
                    <Gift className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      Discount đặc biệt của tôi
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Các mã giảm giá được gán riêng cho bạn
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                  {specialDiscounts.length} mã
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {specialDiscounts.slice(0, 6).map((d) => {
                  // Backend đã filter thời gian, discount này đang sử dụng được
                  const isActiveWindow = true;

                  return (
                    <Card
                      key={d._id}
                      className={cn(
                        "group hover:shadow-lg transition-all duration-300 cursor-pointer border-2",
                        isActiveWindow
                          ? "border-purple-300 hover:border-purple-400 bg-white"
                          : "border-gray-200 bg-gray-50/50 opacity-75"
                      )}
                      onClick={() => {
                        if (isActiveWindow) {
                          handleCopy(d.code);
                          router.push("/products");
                        }
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg font-bold text-purple-600">{d.code}</span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs font-semibold",
                                  d.type === "percent"
                                    ? "bg-orange-100 text-orange-700 border-orange-200"
                                    : "bg-blue-100 text-blue-700 border-blue-200"
                                )}
                              >
                                {d.type === "percent" ? `-${d.value}%` : `-${d.value.toLocaleString("vi-VN")}₫`}
                              </Badge>
                            </div>
                            {d.minOrderAmount && (
                              <p className="text-xs text-gray-500">
                                Đơn tối thiểu: {d.minOrderAmount.toLocaleString("vi-VN")}₫
                              </p>
                            )}
                            <p className="text-xs text-purple-600 mt-1">
                              Hết hạn: {new Date(d.endAt).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        </div>
                        <Button
                          disabled={!isActiveWindow}
                          className={cn(
                            "w-full",
                            isActiveWindow
                              ? "bg-purple-600 hover:bg-purple-700 text-white"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          )}
                          size="sm"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Sao chép và sử dụng
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {specialDiscounts.length > 6 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Và <span className="font-semibold text-purple-600">{specialDiscounts.length - 6}</span> mã giảm giá khác trong danh sách bên dưới
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Featured Discounts Section - Discount công khai */}
        {!loading && publicDiscounts.length > 0 && (
          <Card className="mb-8 border-0 shadow-xl bg-gradient-to-br from-emerald-50 via-green-50/50 to-teal-50/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-xl">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      Mã giảm giá nổi bật
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Các mã giảm giá công khai có thể sử dụng ngay
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  {publicDiscounts.length} mã
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicDiscounts.slice(0, 6).map((d) => {
                  // Backend đã filter thời gian, discount này đang sử dụng được
                  const isActiveWindow = true;

                  return (
                    <Card
                      key={d._id}
                      className={cn(
                        "group hover:shadow-lg transition-all duration-300 cursor-pointer border-2",
                        isActiveWindow
                          ? "border-emerald-300 hover:border-emerald-400 bg-white"
                          : "border-gray-200 bg-gray-50/50 opacity-75"
                      )}
                      onClick={() => {
                        if (isActiveWindow) {
                          handleCopy(d.code);
                          router.push("/products");
                        }
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg font-bold text-emerald-600">{d.code}</span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs font-semibold",
                                  d.type === "percent"
                                    ? "bg-orange-100 text-orange-700 border-orange-200"
                                    : "bg-blue-100 text-blue-700 border-blue-200"
                                )}
                              >
                                {d.type === "percent" ? `-${d.value}%` : `-${d.value.toLocaleString("vi-VN")}₫`}
                              </Badge>
                            </div>
                            {d.minOrderAmount && (
                              <p className="text-xs text-gray-500">
                                Đơn tối thiểu: {d.minOrderAmount.toLocaleString("vi-VN")}₫
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          disabled={!isActiveWindow}
                          className={cn(
                            "w-full",
                            isActiveWindow
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          )}
                          size="sm"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Sao chép và sử dụng
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {publicDiscounts.length > 6 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Và <span className="font-semibold text-emerald-600">{publicDiscounts.length - 6}</span> mã giảm giá khác trong danh sách bên dưới
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filters Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                        tab === t.key
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Lọc theo loại:</span>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tất cả loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả loại</SelectItem>
                    <SelectItem value="percent">Phần trăm</SelectItem>
                    <SelectItem value="fixed">Cố định</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discounts List */}
        {loading ? (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-gray-600">Đang tải danh sách mã giảm giá...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="py-16">
                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Gift className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Không có mã phù hợp</h3>
                      <p className="text-sm text-gray-600">Thử thay đổi bộ lọc để tìm thêm mã giảm giá</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {filteredItems.map((d) => {
                  const now = new Date();
                  const start = new Date(d.startAt);
                  const end = new Date(d.endAt);
                  // Backend đã filter, discount này đang trong thời gian hiệu lực
                  const isActiveWindow = true;
                  const isUpcoming = false; // Backend chỉ trả về discount đang active
                  const isExpired = false; // Backend chỉ trả về discount đang active
                  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpiring = diffDays > 0 && diffDays <= 7;
                  const usageBadge = d.usageLimit ? `${d.usedCount || 0}/${d.usageLimit}` : "∞";
                  const isSpecial = d.isSpecial === true;

                  return (
                    <Card
                      key={d._id}
                      className={cn(
                        "group hover:shadow-lg transition-all duration-300 overflow-hidden",
                        isActiveWindow 
                          ? "border-2 border-emerald-200" 
                          : isUpcoming 
                          ? "border-2 border-blue-200 opacity-90" 
                          : "border border-gray-200 opacity-75"
                      )}
                    >
                      <div className="flex">
                        {/* Discount Value Strip */}
                        <div
                          className={cn(
                            "w-24 flex flex-col items-center justify-center p-4 border-r",
                            d.type === "percent"
                              ? "bg-gradient-to-br from-orange-500 to-orange-600"
                              : "bg-gradient-to-br from-blue-500 to-blue-600"
                          )}
                        >
                          <div className="text-2xl font-extrabold text-white mb-1">
                            {d.type === "percent" ? `${d.value}%` : `${d.value.toLocaleString("vi-VN")}`}
                          </div>
                          <div className="text-[10px] text-white/90 font-medium uppercase">
                            {d.type === "percent" ? "Giảm" : "₫ giảm"}
                          </div>
                          <Badge
                            variant="secondary"
                            className="mt-2 bg-white/20 text-white border-white/30 text-[9px] px-1.5 py-0.5"
                          >
                            Công khai
                          </Badge>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Tag className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span className="font-bold text-gray-900 text-lg">{d.code}</span>
                                {isUpcoming && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Sắp tới
                                  </Badge>
                                )}
                                {isExpired && (
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200 text-[10px]">
                                    <X className="w-3 h-3 mr-1" />
                                    Đã hết hạn
                                  </Badge>
                                )}
                                {isActiveWindow && !isExpiring && (
                                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Đang hiệu lực
                                  </Badge>
                                )}
                                {isExpiring && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px]">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Sắp hết hạn
                                  </Badge>
                                )}
                                {isSpecial ? (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                                    Đặc biệt
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                    Công khai
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-xs">
                                  {start.toLocaleDateString("vi-VN")} - {end.toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {d.minOrderAmount ? (
                                  <>
                                    Đơn tối thiểu: <span className="font-semibold">{d.minOrderAmount.toLocaleString("vi-VN")}₫</span>
                                  </>
                                ) : (
                                  "Không yêu cầu đơn tối thiểu"
                                )}
                              </p>
                              {d.usageLimit && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                    <span>Đã sử dụng</span>
                                    <span className="font-semibold">{usageBadge}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        d.type === "percent" ? "bg-orange-500" : "bg-blue-500"
                                      )}
                                      style={{
                                        width: `${Math.min(100, Math.round(((d.usedCount || 0) / d.usageLimit) * 100))}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(d.code)}
                              className="flex-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            >
                              <Copy className="w-3.5 h-3.5 mr-1.5" />
                              Sao chép
                            </Button>
                            <Button
                              size="sm"
                              disabled={!isActiveWindow}
                              onClick={() => {
                                handleCopy(d.code);
                                router.push("/products");
                              }}
                              className={cn(
                                "flex-1",
                                isActiveWindow
                                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                              )}
                            >
                              <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                              Dùng ngay
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Trang <span className="font-semibold text-gray-900">{page}</span> / <span className="font-semibold text-gray-900">{totalPages}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Trước
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="gap-2"
                      >
                        Sau
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Custom Notification Toast */}
        {notification && (
          <div
            className={cn(
              "fixed top-4 right-4 z-[9999] transition-all duration-300 ease-in-out",
              notification.isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2 pointer-events-none"
            )}
          >
            <Card
              className={cn(
                "min-w-[320px] max-w-md shadow-2xl border-2",
                notification.type === "success"
                  ? "bg-green-50 border-green-200"
                  : notification.type === "error"
                  ? "bg-red-50 border-red-200"
                  : "bg-blue-50 border-blue-200"
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
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
                    <p
                      className={cn(
                        "font-semibold text-sm leading-tight",
                        notification.type === "success"
                          ? "text-green-800"
                          : notification.type === "error"
                          ? "text-red-800"
                          : "text-blue-800"
                      )}
                    >
                      {notification.message}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNotification(prev => prev ? { ...prev, isVisible: false } : null);
                      setTimeout(() => setNotification(null), 300);
                    }}
                    className={cn(
                      "flex-shrink-0 ml-2 p-1 rounded hover:bg-black/10 transition-colors",
                      notification.type === "success"
                        ? "text-green-700 hover:bg-green-100"
                        : notification.type === "error"
                        ? "text-red-700 hover:bg-red-100"
                        : "text-blue-700 hover:bg-blue-100"
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export { DiscountSelector } from "./DiscountSelector";
export type { AppliedDiscount } from "./DiscountSelector";