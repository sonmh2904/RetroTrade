"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Wallet, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { getWithdrawalRequests, reviewWithdrawalRequest, completeWithdrawal } from "@/services/wallet/wallet.api";

const ITEMS_PER_PAGE = 15;

interface StatusLabels {
  [key: string]: string;
  pending: string;
  approved: string;
  rejected: string;
  completed: string;
}
const STATUS_LABEL_VN: StatusLabels = {
  pending: "Đang chờ",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
  completed: "Hoàn thành",
} as const;

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: STATUS_LABEL_VN.pending },
  { value: "approved", label: STATUS_LABEL_VN.approved },
  { value: "rejected", label: STATUS_LABEL_VN.rejected },
  { value: "completed", label: STATUS_LABEL_VN.completed },
];

// Format ngày/h/d/s: 26/10/2025 20:30:35
function formatDatetime(dateStr?: string | Date) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function WithdrawPage() {
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [localMessage, setLocalMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getWithdrawalRequests();
      setWithdrawRequests(res.data || []);
      setError(null);
      setCurrentPage(1);
    } catch {
      setError("Không thể lấy dữ liệu yêu cầu rút tiền");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setLocalMessage({ text, type });
    setTimeout(() => setLocalMessage(null), 3000);
  };

  const handleReview = async (transactionId: string, action: "approve" | "reject") => {
    setProcessingId(transactionId);
    try {
      const res = await reviewWithdrawalRequest(transactionId, action, "");
      fetchRequests();
      showMessage(res.message || "Đã xử lý", "success");

    } catch (err: any) {
      showMessage(err?.response?.data?.message || "Lỗi khi xử lý yêu cầu", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (transactionId: string) => {
    setProcessingId(transactionId);
    try {
      const res = await completeWithdrawal(transactionId, "");
      fetchRequests();
      showMessage(res.message || "Hoàn thành giao dịch", "success");
    } catch (err: any) {
      showMessage(err?.response?.data?.message || "Lỗi khi hoàn thành giao dịch", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Search thêm cả trong ngày tạo và ngày duyệt
  const filteredRequests = withdrawRequests.filter((req) => {
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const searchLower = searchText.toLowerCase();
    const createdAtStr = formatDatetime(req.createdAt).toLowerCase();
    const reviewedAtStr = formatDatetime(req.reviewedAt).toLowerCase();
    return (
      matchesStatus &&
      (
        req.walletId?.userId?.fullName?.toLowerCase().includes(searchLower) ||
        req.bankAccountId?.bankCode?.toLowerCase().includes(searchLower) ||
        req.bankAccountId?.accountNumber?.toLowerCase().includes(searchLower) ||
        (req.note || "").toLowerCase().includes(searchLower) ||
        createdAtStr.includes(searchLower) ||
        reviewedAtStr.includes(searchLower)
      )
    );
  });

  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }


  const getStatusBadge = (status: string) => {
    const base = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "pending":
        return `${base} bg-yellow-100 text-yellow-700`;
      case "approved":
        return `${base} bg-blue-100 text-blue-700`;
      case "completed":
        return `${base} bg-green-100 text-green-700`;
      case "rejected":
        return `${base} bg-red-100 text-red-700`;
      default:
        return base;
    }
  };

  // Bank info gộp
  const renderBankInfo = (req: any) => {
    const code = req.bankAccountId?.bankCode || "Không rõ";
    const acc = req.bankAccountId?.accountNumber || "(không rõ)";
    return (
      <div className="text-xs whitespace-nowrap text-gray-800">
        <span className="font-semibold">{code}</span>
        <span className="mx-1 text-gray-500">|</span>
        <span>{acc}</span>
      </div>
    );
  };

  // Ngày tạo - Ngày duyệt gộp cùng cell
  const renderDateInfo = (req: any) => (
    <div className="text-xs flex flex-col min-w-[135px] gap-1">
      <span>
        <span className="text-gray-500">Tạo: </span>
        {formatDatetime(req.createdAt)}
      </span>
      {req.reviewedAt && (
        <span>
          <span className="text-gray-500">Duyệt: </span>
          {formatDatetime(req.reviewedAt)}
        </span>
      )}
    </div>
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Local message/toast */}
      {localMessage && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg transition bg-white border ${localMessage.type === "success" ? "border-green-400 text-green-700 bg-green-50" : "border-red-400 text-red-700 bg-red-50"}`}>
          {localMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-xl">
            <Wallet className="text-blue-600 w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Quản lý rút tiền</h1>
        </div>
        <Link href="/admin/wallet">
          <Button variant="outline" className="flex items-center gap-2 border-gray-300">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
        </Link>
      </div>

      {/* Thanh tìm kiếm & bộ lọc */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng, ngân hàng, số tk, ngày..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 transition"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* Bảng dữ liệu */}
      <Card className="shadow-md border border-gray-200">
        <CardHeader className="bg-gray-100 rounded-t-xl">
          <CardTitle className="text-lg font-semibold text-gray-800">Danh sách yêu cầu rút tiền</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500 animate-pulse">Đang tải dữ liệu...</div>
          ) : (
            <table className="w-full text-sm text-gray-800">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-600">
                  <th className="p-3 text-left">Người dùng</th>
                  <th className="p-3 text-right">Số dư ví</th>
                  <th className="p-3 text-right">Số tiền rút</th>
                  <th className="p-3 text-left">Ngân hàng / Số TK</th>
                  <th className="p-3 text-left">Ghi chú</th>
                  <th className="p-3 text-center">Tạo - Duyệt</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-gray-500">
                      Không có yêu cầu rút tiền nào
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((req) => (
                    <tr key={req._id} className="border-b hover:bg-blue-50 transition-colors duration-150">
                      <td className="p-3">{req.walletId?.userId?.fullName || "Không rõ"}</td>
                      <td className="p-3 text-right">{req.walletId?.balance?.toLocaleString()} ₫</td>
                      <td className="p-3 text-right font-medium text-blue-700">{req.amount?.toLocaleString()} ₫</td>
                      <td className="p-3">{renderBankInfo(req)}</td>
                      <td className="p-3 text-gray-600">{req.note || "—"}</td>
                      <td className="p-3 text-center">{renderDateInfo(req)}</td>
                      <td className="p-3 text-center">
                        <span className={getStatusBadge(req.status)}>{STATUS_LABEL_VN[req.status] || req.status}</span>
                      </td>
                      <td className="p-3 text-center space-x-2">
                        {req.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleReview(req._id, "approve")}
                              disabled={processingId === req._id}
                            >
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReview(req._id, "reject")}
                              disabled={processingId === req._id}
                            >
                              Từ chối
                            </Button>
                          </>
                        )}
                        {req.status === "approved" && (
                          <Button
                            size="sm"
                            className="bg-blue-700 hover:bg-blue-800 text-white"
                            onClick={() => handleComplete(req._id)}
                            disabled={processingId === req._id}
                          >
                            Hoàn thành
                          </Button>
                        )}
                        {["rejected", "completed"].includes(req.status) && (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-blue-50 px-4 py-2 rounded-xl mt-4">
              {/* Hiển thị số dòng */}
              <span className="text-gray-700 text-sm">
                Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredRequests.length)} của {filteredRequests.length} kết quả
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="px-3 py-1 rounded bg-white border border-gray-300 hover:bg-gray-100"
                  disabled={currentPage === 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  &lt;
                </button>
                <span className="px-4 py-1 bg-white rounded font-semibold border border-gray-300">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  className="px-3 py-1 rounded bg-white border border-gray-300 hover:bg-gray-100"
                  disabled={currentPage === totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  &gt;
                </button>
                {/* Dropdown chọn số dòng/trang */}
                <select
                  className="ml-2 px-2 py-1 rounded border border-gray-300 bg-white font-medium"
                  value={ITEMS_PER_PAGE}
                  onChange={e => {
                    setCurrentPage(1);
                    setPageSize(parseInt(e.target.value));
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
