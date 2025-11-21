// utils/bankUtils.js
const axios = require('axios');

// Lưu cache danh sách ngân hàng
let banksCache = [];

// Hàm tải danh sách ngân hàng từ API VietQR, cập nhật cache
async function fetchBanks() {
    try {
        const { data } = await axios.get('https://api.vietqr.io/v2/banks');
        banksCache = data.data || [];
        console.log(`Fetched ${banksCache.length} banks from VietQR`);
    } catch (e) {
        banksCache = [];
        console.error('Lỗi tải danh sách ngân hàng:', e.message);
    }
}

// Hàm lấy ngân hàng theo mã code (trả về object ngân hàng hoặc undefined)
function getBankByCode(code) {
    if (!banksCache.length) return undefined;
    return banksCache.find(b => b.code === code);
}

// Hàm lấy toàn bộ ngân hàng để trả về FE (select/autocomplete)
function getAllBanks() {
    return banksCache;
}

module.exports = {
    fetchBanks,
    getBankByCode,
    getAllBanks,
    banksCache
};
