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
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const connectDB = require("./src/config/db");
const router = require("./src/routes/index");

const socketHandler = require("./src/socket/socket.handler");

const cron = require("node-cron");
const {
  updateTrendingItems,
} = require("./src/controller/products/updateTrending.controller");

require("dotenv").config();

require("./src/utils/orderReminder.job"); // Load cron nhắc nhở đơn hàng

// Socket.io
socketHandler(io);
// Set io instance for message emission helper
const { setIO } = require("./src/utils/emitMessage");
setIO(io);

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
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

const { autoUpdateServiceFeeStatus } = require("./src/controller/serviceFee/serviceFeeAutoUpdate.controller");

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

// Test CORS route
app.get('/api/v1/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS is working!', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Routes
router(app);

// DB connect
connectDB()
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log(err));

// Use server.listen instead of app.listen for socket.io
server.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on port ${process.env.PORT}`)
);

module.exports = { app, server, io };

