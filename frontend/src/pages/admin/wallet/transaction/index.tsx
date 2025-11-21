"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { getAllWalletTransactions } from "@/services/wallet/wallet.api";

const ITEMS_PER_PAGE = 15;

const typeLabelsVi: { [key: string]: string } = {
  deposit: "Nạp tiền",
  withdraw: "Rút tiền",
  payment: "Thanh toán",
  transfer: "Chuyển khoản",
  payout_renter_refund : "Admin hoàn tiền cọc ",
  payout_owner_payment : "Admin hoàn tiền người cho thuê ",
  refund_deposit : "Nhận lại tiền cọc",
  owner_payment : "Nhận tiền cho thuê",
  USER_PAYMENT : "Thanh toán đơn hàng",
  SYSTEM_RECEIVE : "Hệ thống nhận tiền đơn hàng",
};

const statusLabelsVi: { [key: string]: string } = {
  pending: "Chờ xử lý",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  completed: "Hoàn thành",
  paid: "Đã thanh toán",
};

export default function TransactionPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await getAllWalletTransactions();
      setTransactions(res.data || []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Lỗi tải giao dịch:", error);
    }
  };

  const transactionTypes = ["Tất cả", ...Array.from(new Set(transactions.map(t => typeLabelsVi[t.typeId] || "Khác")))];

  const filteredTransactions = transactions.filter(tx => {
    const userName = tx.walletId?.userId?.fullName || "";
    const typeVi = typeLabelsVi[tx.typeId] || "Khác";
    const lowerSearch = searchText.toLowerCase();
    const matchesSearch = userName.toLowerCase().includes(lowerSearch);
    const matchesType = typeFilter === "Tất cả" || typeVi === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const formatDateTime = (dateStr: string) => {
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
  };

  const renderStatus = (tx: any) => {
    if (tx.typeId === "deposit") return "Đã thanh toán";
    // Chuẩn hóa nếu backend dùng hoặc không dùng enum tiếng Việt
    return (
      statusLabelsVi[tx.status] ||
      (tx.status && tx.status[0].toUpperCase() + tx.status.slice(1)) ||
      "Chưa xác định"
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="text-purple-600 w-6 h-6" />
          <h1 className="text-2xl font-bold text-gray-900">Quản lý giao dịch</h1>
        </div>
        <Link href="/admin/wallet">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
        </Link>
      </div>

      {/* Filter & Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Tìm kiếm người dùng"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
        >
          {transactionTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử giao dịch</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-sm text-gray-700">
                <th className="p-3">STT</th>
                <th className="p-3">Người dùng</th>
                <th className="p-3">Loại giao dịch</th>
                <th className="p-3">Số tiền</th>
                <th className="p-3">Ngày tạo</th>
                <th className="p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-6 text-gray-500">
                    Không có giao dịch phù hợp
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx, index) => (
                  <tr key={tx._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                    <td className="p-3">{tx.walletId?.userId?.fullName || "Không rõ"}</td>
                    <td className="p-3">{typeLabelsVi[tx.typeId] || "Khác"}</td>
                    <td className="p-3">{tx.amount?.toLocaleString()} VNĐ</td>
                    <td className="p-3">{formatDateTime(tx.createdAt)}</td>
                    <td className="p-3">{renderStatus(tx)}</td>
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
                onClick={() => goToPage(currentPage - 1)}
              >
                Trước
              </Button>
              <span className="text-gray-700">
                Trang <strong>{currentPage}</strong> / {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
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
