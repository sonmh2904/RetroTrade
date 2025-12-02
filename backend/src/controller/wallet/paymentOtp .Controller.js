const Otp = require("../../models/otp");
const UserModel = require("../../models/User.model");
const { generateOtp } = require("../../utils/generateOtp");
const { sendEmail } = require("../../utils/sendEmail");

const paymentOtp = async (req, res) => {
      try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    const otp = await generateOtp(6);

    await Otp.create({
      email: user.email,
      otp,
      purpose: 'wallet-payment',
      expireAt: new Date() // TTL 180s sẽ tính từ thời điểm này [web:111][web:112]
    });

    const subject = 'Mã OTP xác nhận thanh toán ví';
    const html = `
      <p>Xin chào ${user.fullName},</p>
      <p>Mã OTP xác nhận thanh toán đơn hàng của bạn là:</p>
      <h2>${otp}</h2>
      <p>Mã có hiệu lực trong 3 phút. Không chia sẻ cho bất kỳ ai.</p>
    `;

    await sendEmail(user.email, subject, html);

    return res.json({ success: true, message: 'Đã gửi OTP xác nhận thanh toán về email của bạn' });
  } catch (err) {
    console.error('requestPaymentOtp error:', err);
    return res.status(500).json({ error: 'Không gửi được OTP thanh toán' });
  }
};

module.exports = {
    paymentOtp,
};