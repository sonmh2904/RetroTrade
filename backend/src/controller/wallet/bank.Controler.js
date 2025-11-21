
const BankAccount = require('../../models/BankAccount.model'); // import model bạn đã tạo
const { getAllBanks } = require('../../utils/bankUtils');


const getAllBankAccounts = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ message: "Chưa đăng nhập hoặc token không hợp lệ" });
        }

        // Lấy tất cả tài khoản ngân hàng của user, sắp xếp tài khoản mặc định lên trước
        const bankAccounts = await BankAccount.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

        return res.status(200).json({
            message: "Lấy danh sách tài khoản ngân hàng thành công",
            data: bankAccounts,
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách tài khoản ngân hàng:", error);
        return res.status(500).json({ message: "Lỗi server khi lấy danh sách", error: error.message });
    }
};

const addBankAccount = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { bankCode, bankName, accountNumber, accountName, isDefault } = req.body;

        // Validate dữ liệu đầu vào
        if (!bankCode || !bankName || !accountNumber || !accountName) {
            return res.status(400).json({ message: "Thiếu thông tin ngân hàng bắt buộc" });
        }

        // Validate số tài khoản: toàn số, 8-16 ký tự
        if (!/^\d{8,16}$/.test(accountNumber)) {
            return res.status(400).json({
                message: "Số tài khoản phải là số, từ 8-16 ký tự!"
            });
        }

        // Validate tên chủ TK: 3-50 ký tự, chữ cái + Tiếng Việt + khoảng trắng/dấu, không khoảng trắng liền tiếp
        if (!/^[A-Za-zÀ-Ỵà-ỵ\s.'-]{3,50}$/.test(accountName.trim()) || /\s{2,}/.test(accountName.trim())) {
            return res.status(400).json({
                message: "Tên chủ tài khoản từ 3-50 ký tự, chỉ chứa chữ cái và khoảng trắng!"
            });
        }


        // Kiểm tra số tài khoản đã tồn tại cùng user chưa để tránh duplicate
        const exists = await BankAccount.findOne({ userId, accountNumber });
        if (exists) {
            return res.status(409).json({ message: "Số tài khoản này đã được lưu trước đó." });
        }

        // Nếu đặt là mặc định, reset các tài khoản khác thành false
        if (isDefault) {
            await BankAccount.updateMany({ userId, isDefault: true }, { isDefault: false });
        }

        // Tạo bản ghi mới
        const newBankAccount = new BankAccount({
            userId,
            bankCode,
            bankName,
            accountNumber,
            accountName,
            isDefault: !!isDefault,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await newBankAccount.save();

        return res.status(201).json({
            message: "Thêm tài khoản ngân hàng thành công",
            data: newBankAccount,
        });
    } catch (error) {
        console.error("Lỗi thêm tài khoản ngân hàng:", error);
        return res.status(500).json({ message: "Lỗi server khi thêm tài khoản ngân hàng", error: error.message });
    }
};

const deleteBankAccount = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.userId;
        const bankAccountId = req.params.id; // lấy id tk cần xóa từ params

        // Kiểm tra user đăng nhập
        if (!userId) {
            return res.status(401).json({ message: "Chưa đăng nhập hoặc token không hợp lệ" });
        }

        // Tìm và xóa tài khoản ngân hàng chỉ với user này
        const deleted = await BankAccount.findOneAndDelete({ _id: bankAccountId, userId });
        if (!deleted) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản ngân hàng để xóa" });
        }

        return res.status(200).json({
            message: "Xóa tài khoản ngân hàng thành công",
            data: deleted,
        });
    } catch (error) {
        console.error("Lỗi xóa tài khoản ngân hàng:", error);
        return res.status(500).json({ message: "Lỗi server khi xóa tài khoản", error: error.message });
    }
};

// Lấy danh sách ngân hàng từ cache để trả về FE
const getBankList = async (req, res) => {
    try {
        const banks = getAllBanks();
        return res.status(200).json({
            message: "Lấy danh sách ngân hàng thành công",
            data: banks
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server khi lấy danh sách ngân hàng", error: error.message });
    }
};



module.exports = {
    addBankAccount,
    getAllBankAccounts,
    deleteBankAccount,
    getBankList
};
