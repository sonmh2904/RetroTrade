const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "https://retrotrade.id.vn",
      "https://retrotrade.vercel.app",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const connectDB = require("./src/config/db");
const router = require("./src/routes/index");

const socketHandler = require("./src/socket/socket.handler");

const cron = require("node-cron");
const {
  updateTrendingItems,
} = require("./src/controller/products/updateTrending.controller");

const { autoUpdateServiceFeeStatus } = require("./src/controller/serviceFee/serviceFeeAutoUpdate.controller");
const { unbanExpiredCommentBans } = require("./src/cronJobs/unbanJob");
const { checkPendingDisputes, autoAssignOldDisputes } = require('./src/cronJobs/disputeJob');
const { checkPendingVerifications, autoAssignOldVerifications } = require('./src/cronJobs/verificationJob');
const { seedDefaultConfigs } = require("./src/controller/admin/systemConfig.controller");
require("dotenv").config();

require("./src/utils/orderReminder.job"); // Load cron nhắc nhở đơn hàng

// Socket.io
socketHandler(io);
// Set io instance for message emission helper
const { setIO } = require("./src/utils/emitMessage");
setIO(io);

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || "https://retrotrade.id.vn",
    "https://retrotrade.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ["Content-Length", "Content-Type"]
};

// Middleware
app.use(cors(corsOptions));

// Log CORS requests
app.use((req, res, next) => {
  next();
});



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// cập nhật lúc 0h mỗi ngày
cron.schedule('0 0 * * *', updateTrendingItems);

// Tự động cập nhật trạng thái serviceFee mỗi giờ
cron.schedule('0 * * * *', async () => {
  try {
    await autoUpdateServiceFeeStatus();
  } catch (error) {
    console.error("Lỗi cron job cập nhật serviceFee:", error);
  }
});

// Tự động unban comment bans đã hết hạn mỗi 10 phút
cron.schedule('*/10 * * * *', async () => {
  try {
    await unbanExpiredCommentBans();
  } catch (error) {
    console.error("Lỗi cron job unban comments:", error);
  }
});

// Test CORS route
app.get('/api/v1/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});
// Import util ngân hàng!
const { fetchBanks } = require("./src/utils/bankUtils"); // Sửa path đúng thư mục utils của bạn

// Gọi API lấy toàn bộ ngân hàng ngay khi start backend
fetchBanks()
  .then(() => console.log(" Đã tải danh sách ngân hàng ban đầu"))
  .catch(() => console.log("Không tải được danh sách ngân hàng từ VietQR"));

setInterval(fetchBanks, 1000 * 60 * 60 * 12); // Update tự động mỗi 12h (hoặc 24h tùy lịch trình)

require('./src/cronJobs/refundJob');

// Cron job kiểm tra tranh chấp chưa xử lý - Chạy mỗi 1 giờ
// Tìm tranh chấp Pending quá 24h → Gửi nhắc nhở moderator
// Tìm tranh chấp In Progress quá 48h → Tự động unassign
cron.schedule('0 * * * *', async () => {
  await checkPendingDisputes();
});

// Cron job tự động gán tranh chấp cũ - Chạy mỗi 6 giờ
// Tự động gán tranh chấp Pending quá 48h cho moderator có ít việc nhất
cron.schedule('0 */6 * * *', async () => {
  await autoAssignOldDisputes();
});

// Cron job kiểm tra yêu cầu xác minh chưa xử lý - Chạy mỗi 1 giờ
// Tìm yêu cầu Pending quá 24h → Gửi nhắc nhở moderator
// Tìm yêu cầu In Progress quá 48h → Tự động unassign
cron.schedule('0 * * * *', async () => {
  await checkPendingVerifications();
});

// Cron job tự động gán yêu cầu xác minh cũ - Chạy mỗi 6 giờ
// Tự động gán yêu cầu Pending quá 48h cho moderator có ít việc nhất
cron.schedule('0 */6 * * *', async () => {
  await autoAssignOldVerifications();
});

console.log(' Cron jobs đã được nạp và chạy');
// Routes
router(app);

// DB connect
connectDB()
  .then(async () => {
    console.log(" MongoDB connected");
    await seedDefaultConfigs();
  })
  .catch((err) => console.log(err));

// Use server.listen instead of app.listen for socket.io
server.listen(process.env.PORT, () =>
  console.log(` Server running on port ${process.env.PORT}`)
);

module.exports = { app, server, io };

