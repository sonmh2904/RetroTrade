"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { getAdminRefundOrders } from "@/services/wallet/wallet.api";

interface RefundOrder {
  _id: string;
  renterName?: string;
  renterUsername?: string;
  itemTitle?: string;
  ownerName?: string;
  totalAmount?: number;
  refundedAmount?: number;
  ownerReceive?: number;
  isRefunded?: boolean;
  refundedAt?: string;
  createdAt?: string;
}

export default function RefundPage() {
  const [refunds, setRefunds] = useState<RefundOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchRefunds();
  }, []);

  async function fetchRefunds() {
    setLoading(true);
    try {
      const resp = await getAdminRefundOrders();
      const data = Array.isArray(resp?.data) ? resp.data : [];
      const sorted = data.sort((a: RefundOrder, b: RefundOrder) =>
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );
      setRefunds(sorted);
    } catch (err) {
      setRefunds([]);
      console.error("Lỗi lấy dữ liệu hoàn tiền:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter tìm kiếm và lọc theo ngày
  const filteredRefunds = refunds.filter((r) => {
    const txt = searchText.toLowerCase();
    const matchSearch =
      !searchText.trim() ||
      String(r?.renterName ?? "").toLowerCase().includes(txt) ||
      String(r?.itemTitle ?? "").toLowerCase().includes(txt) ||
      String(r?.ownerName ?? "").toLowerCase().includes(txt);

    const matchDate =
      !selectedDate ||
      (r.createdAt &&
        new Date(r.createdAt).toLocaleDateString("vi-VN") ===
        new Date(selectedDate).toLocaleDateString("vi-VN"));

    return matchSearch && matchDate;
  });

  const totalPages = Math.ceil(filteredRefunds.length / pageSize);
  const paginatedRefunds = filteredRefunds.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw className="text-green-600 w-6 h-6" />
          <h1 className="text-2xl font-bold text-gray-900">Quản Lý Hoàn Tiền</h1>
        </div>
        <Link href="/admin/wallet">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
        </Link>
      </div>

      {/* Tìm kiếm và lọc ngày */}
      <div className="flex gap-4 mb-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="Tìm kiếm họ tên, tên đơn, chủ đơn..."
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 flex-grow max-w-xs"
        />
        <input
          type="date"
          value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); setCurrentPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 min-w-[170px]"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách hoàn tiền</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-sm text-gray-700">
                <th className="p-3">STT</th>
                <th className="p-3">Người đặt đơn</th>
                <th className="p-3">Tên đơn hàng & Mã đơn</th>
                <th className="p-3">Người cho thuê</th>
                <th className="p-3">Ngày đặt đơn</th>
                <th className="p-3">Số tiền thanh toán</th>
                <th className="p-3">Số tiền hoàn*</th>
                <th className="p-3">Tiền chủ nhận</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Thời gian hoàn tiền</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center p-6">Đang tải...</td>
                </tr>
              ) : paginatedRefunds.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center p-6">Không có yêu cầu hoàn tiền nào</td>
                </tr>
              ) : (
                paginatedRefunds.map((r, idx) => (
                  <tr key={r._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td className="p-3">{r?.renterName || "Không rõ"}</td>
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{r?.itemTitle || "Không rõ"}</span>
                        <span className="mt-0.5 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700 w-fit">
                          {r?._id ? `Mã đơn: ${r._id}` : "Không rõ"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">{r?.ownerName || "Không rõ"}</td>
                    <td className="p-3">
                      {r?.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "Không rõ"}
                    </td>
                    <td className="p-3">
                      {typeof r.totalAmount === "number" ? r.totalAmount.toLocaleString("vi-VN") : "Không rõ"}
                    </td>
                    <td className="p-3">
                      {typeof r.refundedAmount === "number" ? r.refundedAmount.toLocaleString("vi-VN") : "Không rõ"}
                    </td>
                    <td className="p-3">
                      {typeof r.ownerReceive === "number" ? r.ownerReceive.toLocaleString("vi-VN") : "Không rõ"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold text-xs ${r.isRefunded ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                        style={{
                          whiteSpace: "nowrap", // Ngăn xuống dòng!
                          display: "inline-block",
                          minWidth: 90 // Tùy chọn fix width hoặc max-width
                        }}
                      >
                        {r.isRefunded ? "Đã hoàn tiền" : "Chờ xử lý"}
                      </span>
                    </td>

                    <td className="p-3">
                      {r.refundedAt ? new Date(r.refundedAt).toLocaleString("vi-VN") : "Chưa có"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-gray-700">
                Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredRefunds.length)} của {filteredRefunds.length} kết quả
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  &lt;
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  &gt;
                </Button>
                <select
                  className="ml-2 px-2 py-1 border rounded"
                  value={pageSize}
                  onChange={e => {
                    setCurrentPage(1);
                    // setPageSize(parseInt(e.target.value));
                  }}
                >
                  <option value={10}>10 / trang</option>
                  <option value={15}>15 / trang</option>
                  <option value={25}>25 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
