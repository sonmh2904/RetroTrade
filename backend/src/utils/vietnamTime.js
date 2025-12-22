// tự động phát hiện múi giờ server, chỉ cộng +7 nếu là UTC
function toVietnamTime(date) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;

  // Phát hiện múi giờ server: nếu offset ≈ 0 thì là UTC, nếu ≈ -420 thì là UTC+7 (Việt Nam)
  const serverOffsetMinutes = new Date().getTimezoneOffset(); // ví dụ: UTC → 0, VN → -420
  const isServerUTC = Math.abs(serverOffsetMinutes) < 60; // gần 0 phút → UTC
  // Chỉ cộng +7 giờ nếu server là UTC
  if (isServerUTC) {
    return new Date(d.getTime() + 7 * 60 * 60 * 1000);
  }
  // Nếu server đã là UTC+7 (local) → trả về nguyên bản
  return d;
}

module.exports = {
  formatDate: (date) => {
    const vn = toVietnamTime(date);
    return vn ? vn.toLocaleDateString("vi-VN") : "N/A";
  },
  formatTime: (date) => {
    const vn = toVietnamTime(date);
    return vn
      ? vn.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      : "N/A";
  },
  formatFull: (date) => {
    const vn = toVietnamTime(date);
    return vn
      ? vn.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";
  },
  formatToday: () => {
    const vn = toVietnamTime(new Date());
    return vn.toLocaleDateString("vi-VN");
  },
};
