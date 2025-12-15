"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Button } from "@/components/ui/common/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/common/dropdown-menu";
import { dashboardApi, AdminRevenueResponse } from "@/services/admin/dashboard.api";
import { DollarSign, Filter, ShoppingCart, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";

const AreaChart = dynamic(() => import("recharts").then((mod) => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((mod) => mod.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });

const ENTRIES_PER_PAGE = 10;

const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const formatCurrency = (num: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num || 0);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatEntryType = (type: "order" | "extension") => (type === "extension" ? "Gia hạn" : "Đơn hàng");

const formatExtensionInfo = (duration: number | null, unit: string | null) =>
  !duration || !unit ? "-" : `${duration} ${unit}`;

type TooltipPayloadItem = {
  dataKey: string;
  value: number;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  const getValue = (key: string) => payload.find((item) => item.dataKey === key)?.value ?? 0;

  const revenue = getValue("revenue");
  const baseRevenue = getValue("baseRevenue");
  const extensionRevenue = getValue("extensionRevenue");
  const orders = getValue("orders");
  const extensions = getValue("extensions");

  return (
    <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
      <p className="font-medium text-gray-900 mb-2">{new Date(label ?? "").toLocaleDateString("vi-VN")}</p>
      <div className="space-y-1">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
          <span className="text-sm">
            Doanh thu: <span className="font-medium">{formatCurrency(revenue)}</span>
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
          <span className="text-sm">
            Phí dịch vụ đơn hàng: <span className="font-medium">{formatCurrency(baseRevenue)}</span>
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
          <span className="text-sm">
            Phí dịch vụ gia hạn: <span className="font-medium">{formatCurrency(extensionRevenue)}</span>
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
          <span className="text-sm">
            Đơn hàng: <span className="font-medium">{formatNumber(orders)}</span>
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2" />
          <span className="text-sm">
            Gia hạn: <span className="font-medium">{formatNumber(extensions)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export function RevenueChart() {
  const [period, setPeriod] = useState("30d");
  const [stats, setStats] = useState<AdminRevenueResponse | null>(null);
  const [timeline, setTimeline] = useState<AdminRevenueResponse["timeline"]>([]);
  const [entriesPage, setEntriesPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dashboardApi.getRevenueStats(period);
        setStats(data);
        setTimeline(data.timeline);
      } catch (error) {
        console.error("Error fetching revenue data:", error);
      }
    };

    fetchData();
  }, [period]);

  useEffect(() => {
    setEntriesPage(1);
  }, [period, stats?.entries?.length]);

  const sortedEntries = useMemo(() => {
    if (!stats?.entries) return [];
    return [...stats.entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [stats]);

  const totalPages = sortedEntries.length ? Math.ceil(sortedEntries.length / ENTRIES_PER_PAGE) : 1;
  const currentEntries = sortedEntries.slice(
    (entriesPage - 1) * ENTRIES_PER_PAGE,
    entriesPage * ENTRIES_PER_PAGE
  );
  const hasEntries = sortedEntries.length > 0;
  const startEntry = hasEntries ? (entriesPage - 1) * ENTRIES_PER_PAGE + 1 : 0;
  const endEntry = hasEntries ? Math.min(entriesPage * ENTRIES_PER_PAGE, sortedEntries.length) : 0;

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Thống kê Doanh thu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            Đang tải dữ liệu...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Thống kê Doanh thu
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {period === "7d"
                ? "7 ngày qua"
                : period === "30d"
                ? "30 ngày qua"
                : period === "90d"
                ? "90 ngày qua"
                : period === "1y"
                ? "1 năm qua"
                : "30 ngày qua"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPeriod("7d")}>7 ngày qua</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("30d")}>30 ngày qua</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("90d")}>90 ngày qua</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("1y")}>1 năm qua</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-xs text-green-600">Tổng phí dịch vụ</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totals.total || 0)}</div>
            <div className="text-sm text-gray-600">Tổng phí dịch vụ thu từ đơn hàng và gia hạn</div>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-green-100 p-4 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <span className="text-xs text-emerald-600">Phí dịch vụ đơn hàng</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totals.baseRevenue || 0)}</div>
            <div className="text-sm text-gray-600">Thu từ phí dịch vụ của đơn hàng hoàn tất</div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-xs text-purple-600">Phí dịch vụ gia hạn</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totals.extensionRevenue || 0)}</div>
            <div className="text-sm text-gray-600">Thu từ phí gia hạn thuê đã duyệt</div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-blue-600">Đơn/Gia hạn</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {(stats.totals.orders || 0).toLocaleString()}
              <span className="text-base text-gray-500 ml-1">đơn</span>
            </div>
            <div className="text-sm text-gray-600">
              {`Gia hạn: ${(stats.totals.extensionCount || 0).toLocaleString()} lượt`}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Hạng mục</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Số tiền</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Tỷ lệ</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">Tổng phí dịch vụ</td>
                <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(stats.totals.total || 0)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{formatPercent(stats.totals.total ? 100 : 0)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">Toàn bộ phí dịch vụ thu từ đơn hàng và gia hạn</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">Phí dịch vụ đơn hàng</td>
                <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(stats.totals.baseRevenue || 0)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatPercent(
                    stats.totals.total
                      ? ((stats.totals.baseRevenue || 0) / (stats.totals.total || 1)) * 100
                      : 0
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {`Thu từ ${formatNumber(stats.totals.orders || 0)} đơn hàng hoàn tất`}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">Phí dịch vụ gia hạn</td>
                <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(stats.totals.extensionRevenue || 0)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatPercent(
                    stats.totals.total
                      ? ((stats.totals.extensionRevenue || 0) / (stats.totals.total || 1)) * 100
                      : 0
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {`Thu từ ${formatNumber(stats.totals.extensionCount || 0)} lượt gia hạn đã duyệt`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="h-[400px] mb-6">
          {timeline.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Không có dữ liệu cho khoảng thời gian đã chọn
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorExtension" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorExtensions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("vi-VN", { day: "numeric", month: "short" })
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  width={40}
                  tickFormatter={(value) => {
                    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
                    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
                    return value.toString();
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#3b82f6", fontSize: 12 }}
                  width={40}
                  tickFormatter={(value) => (value >= 1_000 ? `${Math.round(value / 1_000)}k` : value.toString())}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e5e7eb", strokeWidth: 1, strokeDasharray: "3 3" }} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name="Tổng phí dịch vụ" />
                <Area type="monotone" dataKey="baseRevenue" stroke="#34d399" fillOpacity={1} fill="url(#colorBase)" strokeWidth={2} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name="Phí dịch vụ đơn hàng" />
                <Area type="monotone" dataKey="extensionRevenue" stroke="#a855f7" fillOpacity={1} fill="url(#colorExtension)" strokeWidth={2} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name="Phí dịch vụ gia hạn" />
                <Area type="monotone" dataKey="orders" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} yAxisId="right" name="Đơn hàng" />
                <Area type="monotone" dataKey="extensions" stroke="#6366f1" fillOpacity={1} fill="url(#colorExtensions)" strokeWidth={2} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} yAxisId="right" name="Gia hạn" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Chi tiết cộng phí dịch vụ</h3>
              {hasEntries && (
                <p className="text-sm text-gray-500 mt-1">
                  Hiển thị {formatNumber(startEntry)} – {formatNumber(endEntry)} trong tổng số {formatNumber(sortedEntries.length)} bản ghi
                </p>
              )}
            </div>
            {hasEntries && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEntriesPage((prev) => Math.max(prev - 1, 1))} disabled={entriesPage === 1}>
                  Trước
                </Button>
                <span className="text-sm text-gray-600">Trang {entriesPage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setEntriesPage((prev) => Math.min(prev + 1, totalPages))} disabled={entriesPage === totalPages}>
                  Sau
                </Button>
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Loại</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Mã tham chiếu</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Sản phẩm</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Số tiền</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Thời gian</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Thông tin thêm</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {hasEntries ? (
                    currentEntries.map((entry, index) => (
                      <tr key={`${entry.date}-${entry.referenceCode || index}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${entry.type === "extension" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                            {formatEntryType(entry.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{entry.referenceCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{entry.itemTitle || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatCurrency(entry.serviceFee || 0)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDateTime(entry.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {entry.type === "extension"
                            ? `Gia hạn thêm ${formatExtensionInfo(entry.extensionDuration, entry.extensionUnit)}`
                            : "Phí dịch vụ đơn hàng"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                        Không có bản ghi phí dịch vụ trong khoảng thời gian này
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {hasEntries && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEntriesPage((prev) => Math.max(prev - 1, 1))} disabled={entriesPage === 1}>
                Trước
              </Button>
              <span className="text-sm text-gray-600">Trang {entriesPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setEntriesPage((prev) => Math.min(prev + 1, totalPages))} disabled={entriesPage === totalPages}>
                Sau
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
