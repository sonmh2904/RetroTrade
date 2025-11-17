"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { getAdminRefundOrders } from "@/services/wallet/wallet.api";

// (Tùy chọn: Khai báo interface nếu dùng typescript strict)
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);

  useEffect(() => {
    fetchRefunds();
  }, []);

  async function fetchRefunds() {
    setLoading(true);
    try {
      const resp = await getAdminRefundOrders();
      const data = Array.isArray(resp?.data) ? resp.data : [];

      // 👉 Sắp xếp theo ngày đặt đơn mới nhất
      const sorted = data.sort((a: RefundOrder, b: RefundOrder) => {
        return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
      });

      setRefunds(sorted);
    } catch (err) {
      setRefunds([]);
      console.error("Lỗi lấy dữ liệu hoàn tiền:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter tìm kiếm
  const filteredRefunds = searchText.trim()
    ? refunds.filter((r) => {
        const txt = searchText.toLowerCase();
        return (
          String(r?.renterName ?? "").toLowerCase().includes(txt) ||
          String(r?.itemTitle ?? "").toLowerCase().includes(txt) ||
          String(r?.ownerName ?? "").toLowerCase().includes(txt)
        );
      })
    : refunds;

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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý hoàn tiền</h1>
        </div>
        <Link href="/admin/wallet">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
        </Link>
      </div>

      {/* Tìm kiếm */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Tìm kiếm họ tên, username, tên đơn hàng, chủ đơn ..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none flex-grow max-w-xs"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách yêu cầu hoàn tiền</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-sm text-gray-700">
                <th className="p-3">STT</th>
                <th className="p-3">Họ & Tên</th>
                <th className="p-3">Tên đơn hàng</th>
                <th className="p-3">Người Cho Thuê</th>
                <th className="p-3">Ngày đặt đơn</th>
                <th className="p-3">Số Tiền Thanh toán</th>
                <th className="p-3">Số Tiền Cọc</th>
                <th className="p-3">Tiền Thuê</th>
                <th className="p-3">Trạng Thái</th>
                <th className="p-3">Thời Gian Hoàn Tiền</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center p-6">Đang tải...</td>
                </tr>
              ) : paginatedRefunds.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center p-6">Không có yêu cầu hoàn tiền nào</td>
                </tr>
              ) : (
                paginatedRefunds.map(r => (
                  <tr key={r._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{refunds.indexOf(r) + 1}</td>
                    <td className="p-3">{r?.renterName || "Không rõ"}</td>
                    <td className="p-3">{r?.itemTitle || "Không rõ"}</td>
                    <td className="p-3">{r?.ownerName || "Không rõ"}</td>
                    <td className="p-3">
                      {r?.createdAt ? new Date(r.createdAt).toLocaleString() : "Không rõ"}
                    </td>
                    <td className="p-3">
                      {typeof r.totalAmount === "number" ? r.totalAmount.toLocaleString() : "Không rõ"}
                    </td>
                    <td className="p-3">
                      {typeof r.refundedAmount === "number" ? r.refundedAmount.toLocaleString() : "Không rõ"}
                    </td>
                    <td className="p-3">
                      {typeof r.ownerReceive === "number" ? r.ownerReceive.toLocaleString() : "Không rõ"}
                    </td>
                    <td className="p-3">{r.isRefunded ? "Đã hoàn tiền" : "Chờ xử lý"}</td>
                    <td className="p-3">
                      {r.refundedAt ? new Date(r.refundedAt).toLocaleString() : "Chưa có"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center items-center gap-3">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Trước
              </Button>
              <span className="text-gray-700">
                Trang <strong>{currentPage}</strong> / {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
