import React, { useState, useEffect } from "react";
import { getAllBanks } from "@/services/wallet/wallet.api";

interface IBank {
  code: string;
  name: string;
  shortName?: string;
  logo?: string;
}

interface BankAccountModalProps {
  onClose: () => void;
  onAdd: (data: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    isDefault: boolean;
  }) => void;
}

const BankAccountModal: React.FC<BankAccountModalProps> = ({ onClose, onAdd }) => {
  const [bankList, setBankList] = useState<IBank[]>([]);
  const [bankCode, setBankCode] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    getAllBanks()
      .then((data) => {
        // Nếu data là object {data: [...]}, lấy đúng mảng bên trong
        let banks = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        setBankList(banks);
      })
      .catch(() => setBankList([]));
  }, []);

  useEffect(() => {
    const selectedBank = bankList.find(b => b.code === bankCode);
    setBankName(selectedBank ? selectedBank.name : "");
  }, [bankCode, bankList]);

  const handleSubmit = async () => {
    setError(""); // reset error trước mỗi lần submit
    if (!bankCode || !bankName || !accountNumber || !accountName) {
      setError("Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }
    try {
      // onAdd nên là async function gọi API (promise)
      await onAdd({ bankCode, bankName, accountNumber, accountName, isDefault });
      // Nếu thành công, đóng modal hoặc clear state nếu muốn
    } catch (err: any) {
      // Nếu backend trả về lỗi, lấy message từ response hoặc error object
      const message = err?.response?.data?.message || err.message || "Có lỗi xảy ra!";
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-[420px] animate-slideUp">
        <h2 className="text-2xl font-bold text-center mb-6 text-indigo-700">
          Thêm tài khoản ngân hàng
        </h2>
        {error && (
          <div className="text-red-600 mb-2 rounded px-3 py-2 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <select
            value={bankCode}
            onChange={e => setBankCode(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            required
          >
            <option value="">Chọn mã ngân hàng</option>
            {Array.isArray(bankList) && bankList.length > 0
              ? bankList.map(bank => (
                <option value={bank.code}>
                  {bank.code}
                </option>
              ))
              : <option disabled value="">Không có dữ liệu ngân hàng</option>
            }
          </select>

          <input
            type="text"
            placeholder="Tên ngân hàng"
            value={bankName}
            disabled
            readOnly
            className="w-full border border-gray-300 p-3 rounded-lg bg-gray-100 text-gray-500"
          />
          <input
            type="text"
            placeholder="Số tài khoản"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
          <input
            type="text"
            placeholder="Tên chủ tài khoản"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={() => setIsDefault(!isDefault)}
              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            Đặt làm tài khoản mặc định
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-md hover:opacity-90 transition"
          >
            Thêm
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
  );
};

export default BankAccountModal;
