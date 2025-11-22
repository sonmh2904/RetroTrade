const { addConnection } = require("../utils/sseManager");
const Notification = require("../models/Notification.model");
const jwt = require('jsonwebtoken');

/**
 * SSE endpoint cho notifications stream
 * Client kết nối và nhận notifications realtime
 * Hỗ trợ token qua Authorization header HOẶC query param (vì EventSource không hỗ trợ custom headers)
 */
module.exports.notificationStream = async (req, res, next) => {
  try {
    // EventSource không hỗ trợ custom headers, nên cần check token từ query param
    const tokenFromQuery = req.query.token;
    if (tokenFromQuery && !req.user) {
      // Verify token từ query param
      try {
        const decoded = jwt.verify(tokenFromQuery, process.env.TOKEN_SECRET || process.env.JWT_SECRET);
        req.user = decoded;
      } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
      }
    }
    
    const userId = req.user?._id || req.user?.userGuid;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // CORS headers nếu cần
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Gửi comment để giữ connection alive (theo chuẩn SSE)
    res.write(': SSE connection established\n\n');
    
    // Thêm connection vào manager
    addConnection(userId, res);
    
    // Gửi unread count ban đầu
    try {
      const unreadCount = await Notification.countDocuments({
        user: userId,
        isRead: false
      });
      
      const initialData = JSON.stringify({
        type: 'unread_count',
        data: { unreadCount }
      });
      res.write(`data: ${initialData}\n\n`);
    } catch (error) {
      console.error('Error sending initial unread count:', error);
    }

    // Keep connection alive với heartbeat
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (error) {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Mỗi 30 giây

    // Cleanup khi client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      res.end();
    });

  } catch (error) {
    console.error('Error in notificationStream:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

