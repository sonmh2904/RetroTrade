import { useEffect, useState } from "react";
import { getUserWalletTransactions } from "@/services/wallet/wallet.api";

const convertWithdrawStatusVN = (st: string): string => {
    switch (st) {
        case "pending": return "Chờ duyệt";
        case "approved": return "Hoàn thành";
        case "rejected": return "Từ chối";
        case "completed": return "Hoàn thành";
        default: return st;
    }
};

const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700"
};

const PAGE_SIZE = 10;

export default function WalletTransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [date, setDate] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await getUserWalletTransactions();
                setTransactions(res.transactions ?? []);
            } catch {
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = transactions.filter((t) => {
        const matchSearch =
            !search ||
            (t.note && t.note.toLowerCase().includes(search.toLowerCase())) ||
            (t.typeId && t.typeId.toLowerCase().includes(search.toLowerCase())) ||
            (t.orderId?.itemSnapshot?.title &&
                t.orderId?.itemSnapshot?.title.toLowerCase().includes(search.toLowerCase()));
        const matchDate =
            !date ||
            new Date(t.createdAt).toLocaleDateString("vi-VN") ===
            new Date(date).toLocaleDateString("vi-VN");
        return matchSearch && matchDate;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const displayed = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-0 mt-2">Lịch sử giao dịch</h1>
            <div className="text-gray-500 mb-6">Quản lý và theo dõi các giao dịch ví của bạn</div>
            <div className="flex flex-wrap gap-3 mb-8 items-center">
                <input
                    type="text"
                    placeholder="Tìm kiếm giao dịch..."
                    className="border p-3 rounded-lg flex-1 min-w-[320px]"
                    value={search}
                    onChange={e => { setPage(1); setSearch(e.target.value); }}
                />
                <input
                    type="date"
                    className="border p-3 rounded-lg"
                    value={date}
                    onChange={e => { setPage(1); setDate(e.target.value); }}
                />
            </div>
            {loading ? (
                <div className="text-gray-500 p-6 text-center text-lg">Đang tải giao dịch...</div>
            ) : filtered.length === 0 ? (
                <div className="text-gray-500 p-6 text-center text-lg">Không có giao dịch nào.</div>
            ) : (
                <div className="flex flex-col gap-4">
                    {displayed.map((t, idx) => (
                        <div
                            key={t._id || idx}
                            className="flex items-center justify-between gap-3 bg-white rounded-2xl border p-6 shadow hover:shadow-md transition-all"
                        >
                            {/* Icon đầu dòng */}
                            <div
                                className={`flex-shrink-0 rounded-xl w-12 h-12 flex items-center justify-center ${t.amount > 0 ? "bg-green-50" : "bg-red-50"}`}
                            >
                                {t.amount > 0 ? (
                                    <svg width={24} height={24} fill="none" viewBox="0 0 24 24">
                                        <path d="M7 14l5-5 5 5" stroke="#16a34a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : (
                                    <svg width={24} height={24} fill="none" viewBox="0 0 24 24">
                                        <path d="M17 10l-5 5-5-5" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            {/* Nội dung */}
                            <div className="flex-grow ml-4">
                                <div className="font-semibold text-lg text-gray-900 mb-1">
                                    {t.typeId === "USER_PAYMENT"
                                        ? (
                                            "Thanh toán : " + t.orderId?.itemSnapshot?.title || "Thanh toán đơn hàng"
                                        )
                                        : t.typeId === "withdraw"
                                            ? "Rút tiền"
                                            : t.note || t.typeId}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm flex-col items-start">
                                    <span className="inline-flex items-center">
                                        <svg className="mr-1" width={17} height={17} fill="none" viewBox="0 0 20 20">
                                            <circle cx={10} cy={10} r={9} stroke="#888" strokeWidth={2} />
                                            <path d="M10 6v4l2.5 2.5" stroke="#888" strokeWidth={2} strokeLinecap="round" />
                                        </svg>
                                        {new Date(t.createdAt).toLocaleString("vi-VN")}
                                    </span>
                                    {/* Mã đơn hiển thị bên dưới ngày tháng */}
                                    {t.orderId && (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">
                                            Mã đơn: {typeof t.orderId === "string" ? t.orderId : t.orderId._id}
                                        </span>
                                    )}
                                    {t.typeId === "withdraw" && t.status && (
                                        <span className={`ml-2 px-3 py-1 text-xs font-semibold rounded-2xl ${(statusColor as any)[t.status] || "bg-gray-200 text-gray-800"}`}>
                                            {convertWithdrawStatusVN(t.status)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Số tiền */}
                            <div className={`font-bold text-xl min-w-[120px] text-right ${t.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                                {(t.amount > 0 ? "+" : "") + t.amount.toLocaleString("vi-VN")}đ
                            </div>

                        </div>
                    ))}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                            <button
                                className="px-3 py-1 rounded bg-gray-100"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                {"<"}
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    className={`px-3 py-1 rounded ${i + 1 === page ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                                    onClick={() => setPage(i + 1)}
                                    disabled={i + 1 === page}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                className="px-3 py-1 rounded bg-gray-100"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            >
                                {">"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
