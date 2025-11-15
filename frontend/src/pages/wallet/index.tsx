import { useEffect, useState } from "react";
import { CreditCard, ArrowDown, ArrowUp, Send, PlusCircle } from "lucide-react";
import { getMyWallet, depositToWallet, getAllBankAccounts, deleteBankAccount, addBankAccount, withdrawFromWallet, getRecentWalletTransactions } from "@/services/wallet/wallet.api";
import BankAccountModal from "./bankaccountmodal";
import { useRouter } from "next/router";

export default function WalletPage() {
  const weekLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const weekSpend = [120000, 450000, 160000, 90000, 172000, 370000, 240000];
  const maxSpend = Math.max(...weekSpend);

  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [depositError, setDepositError] = useState<string | null>(null);

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  // Lấy thông tin ví khi load trang
  useEffect(() => {
    (async () => {
      try {
        const res = await getMyWallet();
        const parsed = res?.data?.data ?? res?.data ?? res;
        setWallet(parsed || { balance: 0 });
      } catch (err) {
        setWallet({ balance: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Lấy danh sách tài khoản ngân hàng
  useEffect(() => {
    (async () => {
      try {
        const res = await getAllBankAccounts();
        const parsed = res?.data?.data ?? res?.data ?? res;
        setBankAccounts(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        setBankAccounts([]);
      }
    })();
  }, []);
  // Chọn tài khoản mặc định khi load danh sách ngân hàng
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedBankId) {
      const def = bankAccounts.find(acc => acc.isDefault);
      setSelectedBankId(def ? def._id : bankAccounts[0]._id);
    }
  }, [bankAccounts]);

  // Nạp tiền
  const handleDeposit = async () => {
    setDepositError(null);
    setSuccessMessage(null);
    if (!amount || isNaN(Number(amount))) {
      setDepositError("Vui lòng nhập số tiền hợp lệ!");
      return;
    }
    setLoadingDeposit(true);

    try {
      const res = await depositToWallet(Number(amount), note);
      const payload = res?.data?.data ?? res?.data ?? res;

      const checkoutUrl = payload?.checkoutUrl ?? null;
      const qrString = payload?.qrCode ?? null;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        setQrUrl(null);
        setShowDepositModal(false);
      } else if (qrString) {
        setQrUrl(qrString);
        setSuccessMessage("Vui lòng dùng mã QR bên dưới để quét thanh toán.");
      } else if (payload?.message) {
        // Nếu BE trả về { message: "..."}, show luôn
        setDepositError(payload.message);
      } else {
        setDepositError("Server không trả về link thanh toán hoặc mã QR. Kiểm tra console (DEPOSIT PAYLOAD).");
      }
    } catch (err: any) {
      setDepositError(
        err?.response?.data?.message || "Lỗi khi tạo mã QR!"
      );
    } finally {
      setLoadingDeposit(false);
    }
  };


  // Xóa tài khoản ngân hàng
  const handleShowDeleteModal = (id: string) => {
    setSelectedBankId(id);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };
  const handleConfirmDelete = async () => {
    if (!selectedBankId) return;
    try {
      await deleteBankAccount(selectedBankId);
      const res = await getAllBankAccounts();
      const parsed = res?.data?.data ?? res?.data ?? res;
      setBankAccounts(Array.isArray(parsed) ? parsed : []);
      setSuccessMessage("Xóa tài khoản ngân hàng thành công!");
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (error) {
      setWithdrawError("Xóa tài khoản thất bại");
      setTimeout(() => setWithdrawError(null), 3500);
    }
    setShowDeleteModal(false);
    setSelectedBankId(null);
  };
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedBankId(null);
  };

  // Rút tiền
  const handleWithdraw = async () => {
    setWithdrawError(null);
    setSuccessMessage(null);

    // Validate đầu vào phía trước
    if (!withdrawAmount || isNaN(Number(withdrawAmount))) {
      setWithdrawError("Vui lòng nhập số tiền hợp lệ!");
      return;
    }
    if (!selectedBankId) {
      setWithdrawError("Vui lòng chọn tài khoản ngân hàng nhận tiền!");
      return;
    }

    setLoadingWithdraw(true);

    try {
      // Nhận về data từ API
      const res = await withdrawFromWallet(
        Number(withdrawAmount),
        withdrawNote,
        selectedBankId
      ); // với parseFetchResponse đã fix, res chính là { message, transaction }

      // Lấy message thành công từ response (hoặc fallback)
      const msg = res?.message || "Yêu cầu rút tiền đã được gửi. Vui lòng chờ admin duyệt.";

      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawNote("");
      setWithdrawError(null);
      setSuccessMessage(msg); // Thông báo thành công cho user

      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (error: any) {
      let msg = "Có lỗi xảy ra khi rút tiền.";
      if (error && typeof error === "object") {
        if (error.response?.data?.message) {
          msg = error.response.data.message;
        } else if (error.message) {
          msg = error.message;
        }
      }
      setWithdrawError(msg);
    } finally {
      setLoadingWithdraw(false);
    }
  };
  // Lấy giao dịch gần đây (3 giao dịch gần nhất)
  useEffect(() => {
    (async () => {
      setLoadingTransactions(true);
      try {
        const res = await getRecentWalletTransactions();
        setRecentTransactions(res.transactions ?? []);
      } catch {
        setRecentTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    })();
  }, []);
  // Chuyển đến trang xem tất cả giao dịch
  const router = useRouter();
  const handleViewAllTransactions = () => {
    router.push('/wallet/transactions'); 
  };
  const convertWithdrawStatusVN = (st: string): string => {
    switch (st) {
      case "pending":
        return "Chờ duyệt";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Từ chối";
      case "completed":
        return "Hoàn thành";
      default:
        return st;
    }
  };




  return (
    <div className="p-10 bg-gray-50 min-h-screen">


      <h1 className="text-4xl font-bold text-gray-900 mb-1">Ví của tôi</h1>
      <div className="text-lg text-gray-500 mb-8">Quản lý tài chính cho thuê đồ của bạn</div>
      {successMessage && (
        <div className="mb-6 text-green-600 text-sm text-center font-semibold border border-green-200 bg-green-50 px-3 py-2 rounded-lg">
          {successMessage}
        </div>
      )}
      <div className="flex flex-wrap gap-8">
        {/* Số dư ví */}
        <div className="flex-1 min-w-[340px]">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-6 text-white shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 p-2 rounded-full">
                  <CreditCard className="text-white" size={28} />
                </span>
                <span className="font-semibold text-lg">Số dư ví</span>
              </div>
            </div>
            <div className="text-4xl font-bold tracking-tight mb-2">
              {loading
                ? "Đang tải..."
                : wallet && typeof wallet.balance === "number"
                  ? wallet.balance.toLocaleString("vi-VN")
                  : "0"}
              <span className="text-lg font-medium">đ</span>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <button
              className="flex flex-col items-center px-5 py-4 bg-white rounded-xl shadow transition hover:bg-indigo-100"
              onClick={() => setShowDepositModal(true)}
            >
              <ArrowDown className="mb-1 text-indigo-500" />
              <span className="text-sm font-medium">Nạp tiền</span>
            </button>
            <button
              className="flex flex-col items-center px-5 py-4 bg-white rounded-xl shadow transition hover:bg-indigo-100"
              onClick={() => setShowWithdrawModal(true)}
            >
              <ArrowUp className="mb-1 text-indigo-500" />
              <span className="text-sm font-medium">Rút tiền</span>
            </button>
            <button className="flex flex-col items-center px-5 py-4 bg-white rounded-xl shadow transition hover:bg-indigo-100">
              <Send className="mb-1 text-indigo-500" />
              <span className="text-sm font-medium">Chuyển</span>
            </button>
            <button
              className="flex flex-col items-center px-5 py-4 bg-white rounded-xl shadow transition hover:bg-indigo-100"
              onClick={() => setSuccessMessage("Tính năng sắp ra mắt!")}
            >
              <PlusCircle className="mb-1 text-indigo-500" />
              <span className="text-sm font-medium">Thêm thẻ</span>
            </button>
          </div>
        </div>

        {/* Danh sách ngân hàng */}
        <div className="w-[330px] flex-shrink-0">
          <div className="text-xl font-semibold text-gray-900 mb-4">
            Tài khoản ngân hàng
          </div>
          <div className="flex flex-col gap-3">
            {bankAccounts.map((acc, idx) => (
              <div
                key={acc._id || idx}
                className={`relative flex items-center gap-3 p-4 rounded-2xl border shadow-sm transition-all duration-200 ${acc.isDefault
                  ? "bg-indigo-50 border-indigo-200 shadow-md"
                  : "bg-white border-gray-100 hover:border-indigo-100 hover:shadow"
                  }`}
              >
                {/* Icon */}
                <span
                  className={`p-2 rounded-full ${acc.isDefault ? "bg-indigo-100" : "bg-purple-50"
                    }`}
                >
                  <CreditCard
                    className={`${acc.isDefault ? "text-indigo-500" : "text-purple-400"
                      }`}
                  />
                </span>
                <div className="flex-grow">
                  <div className="font-semibold text-gray-900 text-sm">
                    {acc.accountNumber} • {acc.bankCode}
                  </div>
                  <div className="text-xs text-gray-500 mt-px">{acc.bankName}</div>
                  <div className="text-xs text-gray-500 mt-px">
                    Chủ TK: {acc.accountName}
                  </div>
                </div>
                {/* Badge Mặc định */}
                {acc.isDefault && (
                  <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm">
                    Mặc định
                  </span>
                )}
                {/* Menu ba chấm */}
                <button
                  onClick={() =>
                    setOpenMenuId(openMenuId === acc._id ? null : acc._id)
                  }
                  className="ml-2 p-1 rounded hover:bg-gray-200"
                >
                  ...
                </button>
                {/* Dropdown menu */}
                {openMenuId === acc._id && (
                  <div className="absolute top-full right-2 mt-1 w-36 bg-white border rounded-xl shadow-lg z-10">
                    <button
                      onClick={() => handleShowDeleteModal(acc._id)}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-100 rounded-t-xl"
                    >
                      Xóa tài khoản
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Nút thêm tài khoản mới */}
          <button
            onClick={() => setShowBankModal(true)}
            className="flex items-center justify-center outline-dashed outline-1 outline-gray-300 rounded-2xl py-3 bg-white text-gray-700 w-full transition hover:bg-indigo-50 gap-2 mt-2"
          >
            <svg
              width={18}
              height={18}
              className="text-indigo-500 mr-1"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" />
              <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" />
              <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" />
            </svg>
            Thêm tài khoản mới
          </button>
        </div>
      </div>

      {/* Biểu đồ + Giao dịch */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Biểu đồ chi tiêu */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-lg font-bold mb-4">Chi tiêu trong tuần</div>
          <div className="flex items-end h-48 gap-4 justify-between px-6">
            {weekSpend.map((amt, i) => (
              <div key={i} className="flex flex-col items-center w-14">
                <div
                  style={{
                    height: Math.max((amt / maxSpend) * 170, 12),
                    width: 26,
                    background: "#7c3aed",
                    borderRadius: 8,
                  }}
                  className="mb-2"
                  title={`${amt.toLocaleString()}đ`}
                />
                <div className="text-xs text-gray-500 mt-1">{weekLabels[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Giao dịch gần đây */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold text-lg">Giao dịch gần đây</div>
              <button onClick={handleViewAllTransactions} className="text-indigo-600 hover:underline text-sm font-medium">
                Xem tất cả
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {loadingTransactions ? (
                <div className="text-gray-500">Đang tải giao dịch...</div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-gray-500">Chưa có giao dịch gần đây.</div>
              ) : (
                recentTransactions.map((t, idx) => (
                  <div key={t._id || idx} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 transition">
                    <div>
                      <div className={`font-medium ${t.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                        {t.typeId === "USER_PAYMENT"
                          ? "Thanh toán : " + t.orderId?.itemSnapshot?.title || "Thanh toán đơn hàng"
                          : t.note || t.typeId}

                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(t.createdAt).toLocaleString("vi-VN")}
                        {t.typeId === "withdraw" && t.status
                          ? (
                            <span style={{ marginLeft: 8, color: "#64748b", fontWeight: 500 }}>
                              | {convertWithdrawStatusVN(t.status)}
                            </span>
                          )
                          : null}
                      </div>

                    </div>
                    <div className={`font-bold ${t.amount > 0 ? "text-green-600" : "text-red-600"} text-lg`}>
                      {(t.amount > 0 ? "+" : "") + t.amount.toLocaleString("vi-VN")}đ
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>


      {/* Modal nạp tiền */}
      {showDepositModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[420px] animate-slideUp">
            <h2 className="text-2xl font-bold text-center mb-6 text-indigo-700">
              Nạp tiền vào ví
            </h2>
            {/* ERROR TRONG MODAL */}
            {depositError && (
              <div className="mb-3 text-red-600 text-sm text-center font-semibold border border-red-200 bg-red-50 px-3 py-2 rounded-lg">
                {depositError}
              </div>
            )}
            <div className="space-y-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Số tiền (VND)"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú (tùy chọn)"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowDepositModal(false); setDepositError(null); }}
                className="px-5 py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleDeposit}
                disabled={loadingDeposit}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-md hover:opacity-90 transition"
              >
                {loadingDeposit ? "Đang xử lý..." : "Nạp tiền"}
              </button>
            </div>
          </div>
          <style>{`
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
      .animate-slideUp { animation: slideUp 0.3s ease-out; }
    `}</style>
        </div>
      )}

      {/* Modal rút tiền */}
      {showWithdrawModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[420px] animate-slideUp">
            <h2 className="text-2xl font-bold text-center mb-6 text-indigo-700">
              Rút tiền từ ví
            </h2>
            {withdrawError && (
              <div className="mb-3 text-red-600 text-sm text-center font-semibold border border-red-200 bg-red-50 px-3 py-2 rounded-lg">
                {withdrawError}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Số tiền (VND)"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
              <select
                value={selectedBankId || ""}
                onChange={e => setSelectedBankId(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              >
                <option value="">-- Chọn tài khoản ngân hàng nhận tiền --</option>
                {bankAccounts.map(acc => (
                  <option value={acc._id} key={acc._id}>
                    {acc.accountNumber} • {acc.bankCode} - {acc.bankName}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                placeholder="Ghi chú (tuỳ chọn)"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowWithdrawModal(false); setWithdrawError(null); }}
                className="px-5 py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                disabled={loadingWithdraw}
              >
                Hủy
              </button>
              <button
                onClick={handleWithdraw}
                disabled={loadingWithdraw}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-md hover:opacity-90 transition"
              >
                {loadingWithdraw ? "Đang xử lý..." : "Xác nhận rút tiền"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* model thêm tài khoản ngân hàng */}
      {showBankModal && (
        <BankAccountModal
          onClose={() => setShowBankModal(false)}
          onAdd={async (data) => {
            // Gọi API thêm tài khoản ngân hàng từ frontend
            try {
              await addBankAccount(data); // API thêm tài khoản
              setShowBankModal(false);
              // Load lại danh sách bank để cập nhật giao diện:
              const res = await getAllBankAccounts();
              const parsed = res?.data?.data ?? res?.data ?? res;
              setBankAccounts(Array.isArray(parsed) ? parsed : []);
              setSuccessMessage("Thêm tài khoản ngân hàng thành công!");
              setTimeout(() => setSuccessMessage(null), 3500);
            } catch (error) {
              // setSuccessMessage(null);
              // setWithdrawError("Thêm tài khoản thất bại!");
              // setTimeout(() => setWithdrawError(null), 3500);
              throw error;
            }
          }}
        />
      )}

      {/* modal xóa tài khoản ngân hàng */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[420px] animate-slideUp">
            <h2 className="text-2xl font-bold text-center mb-6 text-indigo-700">
              Xác nhận xóa tài khoản
            </h2>
            <div className="mb-8 text-center text-gray-700 text-base">
              Bạn có chắc muốn xóa tài khoản này?
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="px-5 py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-md hover:opacity-90 transition"
              >
                OK
              </button>
            </div>
          </div>
          <style>{`
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
      .animate-slideUp { animation: slideUp 0.3s ease-out; }
    `}</style>
        </div>
      )}

    </div>
  );
}
