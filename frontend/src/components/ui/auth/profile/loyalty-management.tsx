"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Button } from "@/components/ui/common/button";
import { Badge } from "@/components/ui/common/badge";
import {
  getLoyaltyStats,
  getLoyaltyHistory,
  claimDailyLoginPoints,
  convertPointsToDiscount,
  type LoyaltyPointTransaction,
  type LoyaltyStats,
} from "@/services/auth/loyalty.api";
import {
  listAvailableDiscounts,
  type Discount,
} from "@/services/products/discount/discount.api";
import {
  Gift,
  TrendingUp,
  TrendingDown,
  History,
  ShoppingBag,
  LogIn,
  Gamepad2,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Coins,
  Ticket,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BambooGameCard } from "@/components/games/bamboo/BambooGameCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/common/dialog";

const getTypeIcon = (type: LoyaltyPointTransaction["type"]) => {
  switch (type) {
    case "daily_login":
      return <LogIn className="w-4 h-4" />;
    case "order_completed":
      return <ShoppingBag className="w-4 h-4" />;
    case "game_reward":
      return <Gamepad2 className="w-4 h-4" />;
    case "referral":
      return <Sparkles className="w-4 h-4" />;
    default:
      return <Gift className="w-4 h-4" />;
  }
};

const getTypeLabel = (type: LoyaltyPointTransaction["type"]) => {
  const labels: Record<LoyaltyPointTransaction["type"], string> = {
    daily_login: "Đăng nhập",
    order_completed: "Đặt hàng",
    order_cancelled: "Hủy đơn",
    referral: "Giới thiệu",
    game_reward: "Mini Game",
    admin_adjustment: "Điều chỉnh",
    expired: "Hết hạn",
    points_to_discount: "Quy đổi discount",
  };
  return labels[type] || type;
};

const getTypeColor = (type: LoyaltyPointTransaction["type"]) => {
  switch (type) {
    case "daily_login":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "order_completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "game_reward":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "referral":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export function LoyaltyManagement() {
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [history, setHistory] = useState<LoyaltyPointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [selectedDiscountOption, setSelectedDiscountOption] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);
  const [myDiscounts, setMyDiscounts] = useState<Discount[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"points" | "discount" | null>(null);
  const [convertType, setConvertType] = useState<"discount" | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [convertedDiscount, setConvertedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const router = useRouter();

  const loadStats = async () => {
    try {
      const res = await getLoyaltyStats();
      if (res.code === 200 && res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.error("Error loading loyalty stats:", error);
    }
  };

  const loadHistory = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const res = await getLoyaltyHistory(pageNum, 20);
      if (res.code === 200 && res.data) {
        setHistory(res.data);
        const total = (res as { pagination?: { totalPages?: number } }).pagination?.totalPages || 1;
        setTotalPages(total);
      }
    } catch (error) {
      console.error("Error loading loyalty history:", error);
      toast.error("Không thể tải lịch sử RT Points");
    } finally {
      setLoading(false);
    }
  };

  const loadMyDiscounts = async () => {
    try {
      setLoadingDiscounts(true);
      const res = await listAvailableDiscounts(1, 50);
      if (res.status === "success" && res.data) {
        // Lọc chỉ lấy private discounts (từ quy đổi RT Points)
        const privateDiscounts = res.data.public.filter(
          (d) => d.isPublic === false && (d.isClaimed === true || d.isClaimed === undefined)
        );
        setMyDiscounts(privateDiscounts);
      }
    } catch (error) {
      console.error("Error loading my discounts:", error);
    } finally {
      setLoadingDiscounts(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadHistory();
    loadMyDiscounts();
  }, []);

  useEffect(() => {
    // Reload discounts sau khi quy đổi thành công
    if (!converting && !isConvertDialogOpen) {
      loadMyDiscounts();
    }
  }, [converting, isConvertDialogOpen]);

  const handleClaimDailyLogin = async () => {
    setClaiming(true);
    try {
      const res = await claimDailyLoginPoints();
      if (res.code === 200 && res.data) {
        if (res.data.alreadyClaimed) {
          toast.info("Bạn đã nhận điểm đăng nhập hôm nay rồi!");
        } else {
          toast.success(`Nhận ${res.data.points} RT Points thành công!`);
          await loadStats();
          await loadHistory(1);
          setPage(1);
        }
      } else {
        toast.error(res.message || "Không thể nhận điểm đăng nhập");
      }
    } catch {
      toast.error("Có lỗi xảy ra khi nhận điểm đăng nhập");
    } finally {
      setClaiming(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadHistory(newPage);
  };

  const DISCOUNT_OPTIONS = [
    { points: 5000, percent: 5 },
    { points: 10000, percent: 10 },
    { points: 20000, percent: 20 },
  ];

  const handleConvertToDiscount = async () => {
    if (!selectedDiscountOption) {
      toast.error("Vui lòng chọn mức discount");
      return;
    }

    const points = selectedDiscountOption;

    if (stats && points > stats.currentBalance) {
      toast.error("Không đủ RT Points để quy đổi");
      return;
    }

    setConverting(true);
    try {
      const res = await convertPointsToDiscount(points);
      if (res.code === 200 && res.data) {
        setIsConvertDialogOpen(false);
        setSelectedDiscountOption(null);
        setConvertedDiscount({
          code: res.data.discount.code,
          percent: res.data.discountPercent,
        });
        setShowSuccessDialog(true);
        await loadStats();
        await loadHistory(1);
        await loadMyDiscounts();
        setPage(1);
      } else {
        toast.error(res.message || "Không thể quy đổi RT Points");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Có lỗi xảy ra khi quy đổi";
      toast.error(errorMessage);
    } finally {
      setConverting(false);
    }
  };

  const handleCopyDiscountCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success("Đã sao chép mã giảm giá!");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Không thể sao chép mã");
    }
  };

  const getDiscountStatus = (discount: Discount) => {
    const now = new Date();
    const startAt = new Date(discount.startAt);
    const endAt = new Date(discount.endAt);
    const isExpired = endAt < now;
    const isActive = startAt <= now && endAt >= now;
    const isUsed = discount.usedCount && discount.usageLimit && discount.usedCount >= discount.usageLimit;

    if (isUsed) return { label: "Đã sử dụng", color: "text-gray-500", bg: "bg-gray-100", icon: CheckCircle2 };
    if (isExpired) return { label: "Đã hết hạn", color: "text-red-600", bg: "bg-red-50", icon: XCircle };
    if (isActive) return { label: "Có thể sử dụng", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 };
    return { label: "Chưa đến hạn", color: "text-blue-600", bg: "bg-blue-50", icon: Clock };
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-emerald-200 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Số dư hiện tại</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {stats?.currentBalance.toLocaleString("vi-VN") || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">RT Points</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <Coins className="w-7 h-7 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Tổng đã nhận</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats?.totalEarned.toLocaleString("vi-VN") || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">RT Points</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-orange-200 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Tổng đã dùng</p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats?.totalSpent.toLocaleString("vi-VN") || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">RT Points</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <TrendingDown className="w-7 h-7 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Thao tác nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily Login */}
            <div className="p-4 border border-emerald-200 rounded-lg bg-emerald-50/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">Đăng nhập hàng ngày</h3>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">Nhận 10 RT Points mỗi ngày</p>
              <Button
                onClick={handleClaimDailyLogin}
                disabled={claiming}
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Nhận ngay
                  </>
                )}
              </Button>
            </div>

            {/* Convert Options */}
            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Quy đổi RT Points</h3>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Chọn loại quy đổi bạn muốn
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setConvertType("discount");
                    setIsConvertDialogOpen(true);
                  }}
                  disabled={!stats || stats.currentBalance < 5000}
                  className={cn(
                    "w-full p-3 border-2 rounded-lg text-left transition-all",
                    convertType === "discount"
                      ? "border-purple-600 bg-purple-100"
                      : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50",
                    (!stats || stats.currentBalance < 5000) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Quy đổi sang Discount</p>
                        <p className="text-xs text-gray-600">5% (5000 điểm), 10% (10000 điểm), 20% (20000 điểm)</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Discounts from Points Conversion */}
      {myDiscounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ticket className="w-5 h-5 text-purple-600" />
              Discount đã quy đổi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDiscounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myDiscounts.map((discount) => {
                  const status = getDiscountStatus(discount);
                  const StatusIcon = status.icon;
                  const isExpired = new Date(discount.endAt) < new Date();
                  const isUsed = discount.usedCount && discount.usageLimit && discount.usedCount >= discount.usageLimit;
                  const canUse = !isExpired && !isUsed;

                  return (
                    <div
                      key={discount._id}
                      className={`p-4 border rounded-lg transition-all ${
                        canUse
                          ? "border-purple-200 bg-white hover:shadow-sm"
                          : "border-gray-200 bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono font-bold text-base text-purple-700">
                              {discount.code}
                            </span>
                            <Badge className={`${status.bg} ${status.color} border-0 text-xs`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm mb-1">
                            {discount.type === "percent" 
                              ? `Giảm ${discount.value}%` 
                              : `Giảm ${discount.value.toLocaleString("vi-VN")}₫`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyDiscountCode(discount.code)}
                          className="shrink-0"
                        >
                          {copiedCode === discount.code ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Hết hạn: {new Date(discount.endAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                        {discount.usageLimit && (
                          <div>
                            Đã dùng: {discount.usedCount || 0}/{discount.usageLimit} lần
                          </div>
                        )}
                      </div>
                      {canUse && (
                        <Button
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(discount.code);
                            toast.success("Đã sao chép mã! Bạn có thể sử dụng khi đặt hàng.");
                          }}
                          className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Sử dụng ngay
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mini Game */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gamepad2 className="w-5 h-5 text-emerald-600" />
            Mini Game: Trồng cây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BambooGameCard compact />
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-indigo-600" />
            Lịch sử
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeHistoryTab === "points" ? "default" : "outline"}
              onClick={() => setActiveHistoryTab(activeHistoryTab === "points" ? null : "points")}
              className={cn(
                "flex-1",
                activeHistoryTab === "points" && "bg-indigo-600 hover:bg-indigo-700 text-white"
              )}
            >
              <Coins className="w-4 h-4 mr-2" />
              Lịch sử RT Points
            </Button>
            <Button
              variant={activeHistoryTab === "discount" ? "default" : "outline"}
              onClick={() => setActiveHistoryTab(activeHistoryTab === "discount" ? null : "discount")}
              className={cn(
                "flex-1",
                activeHistoryTab === "discount" && "bg-purple-600 hover:bg-purple-700 text-white"
              )}
            >
              <Ticket className="w-4 h-4 mr-2" />
              Lịch sử quy đổi Discount
            </Button>
          </div>

          {activeHistoryTab === "points" && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">Chưa có lịch sử RT Points</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {history.map((transaction) => (
                      <div
                        key={transaction._id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={cn(
                              "p-2 rounded-lg shrink-0",
                              transaction.points > 0 ? "bg-emerald-50" : "bg-red-50"
                            )}
                          >
                            <div className={cn(transaction.points > 0 ? "text-emerald-600" : "text-red-600")}>
                              {getTypeIcon(transaction.type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-medium text-gray-900 text-sm truncate">{transaction.description}</p>
                              <Badge variant="secondary" className={cn(getTypeColor(transaction.type), "text-xs shrink-0")}>
                                {getTypeLabel(transaction.type)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>
                                {new Date(transaction.createdAt).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p
                            className={cn(
                              "font-bold",
                              transaction.points > 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {transaction.points > 0 ? "+" : ""}
                            {transaction.points.toLocaleString("vi-VN")}
                          </p>
                          <p className="text-xs text-gray-500">Số dư: {transaction.balance.toLocaleString("vi-VN")}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        Trang {page} / {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Trước
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page === totalPages}
                        >
                          Sau
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeHistoryTab === "discount" && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <>
                  {(() => {
                    const discountTransactions = history.filter((t) => t.type === "points_to_discount");
                    return discountTransactions.length === 0 ? (
                      <div className="text-center py-12">
                        <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">Chưa có lịch sử quy đổi discount</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {discountTransactions.map((transaction) => (
                          <div
                            key={transaction._id}
                            className="flex items-center justify-between p-3 border border-purple-200 rounded-lg hover:bg-purple-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-lg shrink-0 bg-purple-50">
                                <div className="text-purple-600">
                                  <Ticket className="w-4 h-4" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className="font-medium text-gray-900 text-sm truncate">{transaction.description}</p>
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-xs shrink-0">
                                    {getTypeLabel(transaction.type)}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  <span>
                                    {new Date(transaction.createdAt).toLocaleDateString("vi-VN", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {transaction.metadata?.discountPercent && (
                                  <p className="text-xs text-purple-600 mt-1">
                                    Discount: {transaction.metadata.discountPercent}%
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="font-bold text-red-600">
                                {transaction.points.toLocaleString("vi-VN")}
                              </p>
                              <p className="text-xs text-gray-500">Số dư: {transaction.balance.toLocaleString("vi-VN")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </>
          )}

          {activeHistoryTab === null && (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Chọn một tab để xem lịch sử</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Quy đổi thành công!
            </DialogTitle>
            <DialogDescription>
              Bạn đã quy đổi RT Points sang discount thành công
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {convertedDiscount && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Mã discount:</span>
                  <span className="font-mono font-bold text-lg text-purple-600">
                    {convertedDiscount.code}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-700">Mức giảm giá:</span>
                  <span className="font-bold text-purple-600">
                    {convertedDiscount.percent}%
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Discount có hiệu lực trong 1 tháng và chỉ dùng được 1 lần
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessDialog(false);
                  setConvertedDiscount(null);
                }}
                className="flex-1"
              >
                Đóng
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessDialog(false);
                  setConvertedDiscount(null);
                  router.push("/auth/profile?menu=discounts");
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Ticket className="w-4 h-4 mr-2" />
                Xem discount
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert to Discount Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-purple-600" />
              Quy đổi RT Points sang Discount
            </DialogTitle>
            <DialogDescription>
              Chọn mức discount bạn muốn quy đổi. Discount có hiệu lực 1 tháng và chỉ dùng được 1 lần.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Chọn mức discount
              </label>
              <div className="space-y-2">
                {DISCOUNT_OPTIONS.map((option) => {
                  const canAfford = stats && stats.currentBalance >= option.points;
                  const isSelected = selectedDiscountOption === option.points;
                  return (
                    <button
                      key={option.points}
                      type="button"
                      onClick={() => setSelectedDiscountOption(option.points)}
                      disabled={!canAfford}
                      className={cn(
                        "w-full p-4 border-2 rounded-lg text-left transition-all",
                        isSelected
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50",
                        !canAfford && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-lg text-purple-600">{option.percent}%</span>
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              Discount
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Cần {option.points.toLocaleString("vi-VN")} RT Points
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Số dư hiện tại: <span className="font-semibold">{stats?.currentBalance.toLocaleString("vi-VN") || 0}</span> RT Points
              </p>
            </div>
            {selectedDiscountOption && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Bạn sẽ nhận được:</span>
                  <span className="text-xl font-bold text-purple-600">
                    {DISCOUNT_OPTIONS.find((o) => o.points === selectedDiscountOption)?.percent}% discount
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Discount sẽ được gửi vào tài khoản của bạn sau khi quy đổi thành công
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConvertDialogOpen(false);
                setSelectedDiscountOption(null);
              }}
              disabled={converting}
            >
              Hủy
            </Button>
            <Button
              onClick={handleConvertToDiscount}
              disabled={
                converting ||
                !selectedDiscountOption ||
                (stats !== null && selectedDiscountOption > stats.currentBalance)
              }
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {converting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4 mr-2" />
                  Xác nhận quy đổi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

