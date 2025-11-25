"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { getAllWalletTransactions } from "@/services/wallet/wallet.api";

const DEFAULT_PAGE_SIZE = 15;

const typeLabelsVi: { [key: string]: string } = {
  deposit: "Nạp tiền",
  withdraw: "Rút tiền",
  payment: "Thanh toán",
  payout_renter_refund: "Hệ thống hoàn tiền cọc ",
  payout_owner_payment: "Hệ thống hoàn tiền người cho thuê ",
  SYSTEM_RECEIVE: "Hệ thống nhận tiền đơn hàng ",
  payout_cancel_refund: "Hệ thống hoàn tiền do chủ đồ hủy đơn ",
  refund_deposit: "Nhận lại tiền cọc",
  owner_payment: "Nhận tiền cho thuê",
  renter_payment: "Thanh toán tiền thuê",
  USER_PAYMENT: "Thanh toán đơn hàng",
  refund_from_cancelled: "Nhận lại tiền đơn thuê bị hủy",
};

const statusLabelsVi: { [key: string]: string } = {
  pending: "Chờ xử lý",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  completed: "Hoàn thành",
  paid: "Đã thanh toán",
};

interface WalletTransaction {
  _id: string;
  typeId: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed" | "paid";
  createdAt: string;
  walletId?: {
    userId?: {
      fullName?: string;
      email?: string;
    };
  };
  orderId?: string | { _id: string };
  orderCode?: string;
  balanceAfter?: number;
  note?: string;
}

export default function TransactionPage() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredTransactions.length);


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

  const renderStatus = (tx: WalletTransaction) => {
    if (tx.typeId === "deposit") return "Đã thanh toán";
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
      <div className="flex gap-3 items-center mb-6">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            {/* Icon kính lúp SVG */}
            <svg width="18" height="18" fill="none" stroke="currentColor">
              <circle cx="8" cy="8" r="7" strokeWidth="2" />
              <line x1="13" y1="13" x2="17" y2="17" strokeWidth="2" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm người dùng, ngân hàng, số tk, ngày..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="border border-gray-200 rounded-xl pl-9 pr-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 shadow-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 bg-white rounded-xl px-4 py-2 text-gray-900 shadow-sm min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                <th className="p-3 text-center">STT</th>
                <th className="p-3">Người dùng</th>
                <th className="p-3">Loại giao dịch</th>
                <th className="p-3 text-right">Số tiền</th>
                <th className="p-3">Ngày tạo</th>
                <th className="p-3 text-center">Trạng thái</th>
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
                    <td className="p-3 text-center">{startIndex + index}</td>
                    <td className="p-3 font-semibold">{tx.walletId?.userId?.fullName || "Không rõ"}</td>
                    <td className="p-3">{typeLabelsVi[tx.typeId] || "Khác"}</td>
                    <td className="p-3 whitespace-nowrap text-right font-bold text-indigo-600">
                      {tx.amount?.toLocaleString()} <span className="text-gray-500 text-xs">VNĐ</span>
                    </td>
                    <td className="p-3 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                    <td className="p-3 whitespace-nowrap text-center">
                      <span className={
                        `px-2 py-0.5 rounded font-semibold text-xs whitespace-nowrap
                        ${tx.status === "completed" || tx.status === "paid" || tx.status === "approved" ? "bg-green-100 text-green-700" :
                          tx.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                            tx.status === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-800"}`
                      }>
                        {renderStatus(tx)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-blue-50 px-4 py-2 rounded-xl mt-4">
            {/* Hiển thị số dòng */}
            <span className="text-gray-700 text-sm">
              Hiển thị {startIndex} - {endIndex} của {filteredTransactions.length} kết quả
            </span>
            <div className="flex items-center gap-1">
              <button
                className="px-3 py-1 rounded bg-white border border-gray-300 hover:bg-gray-100"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                &lt;
              </button>
              <span className="px-4 py-1 bg-white rounded font-semibold border border-gray-300">Trang {currentPage} / {totalPages}</span>
              <button
                className="px-3 py-1 rounded bg-white border border-gray-300 hover:bg-gray-100"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                &gt;
              </button>
              <select
                className="ml-2 px-2 py-1 rounded border border-gray-300 bg-white font-medium"
                value={pageSize}
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
        </CardContent>
      </Card>
    </div>
  );
}
