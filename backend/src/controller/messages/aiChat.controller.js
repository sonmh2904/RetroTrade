const AIChat = require("../../models/Chat/AIChat.model");
const { v4: uuidv4 } = require("uuid");
const { sendToGemini } = require("../../utils/geminiUtils");
const Order = require("../../models/Order/Order.model");
const mongoose = require("mongoose");

// Tạo session chat mới hoặc Tải session gần nhất
const createChatSession = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user._id) {
      return res
        .status(401)
        .json({ message: "Unauthorized - User ID missing" });
    }
    let userId = user._id || user.userGuid;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    const searchUserId = new mongoose.Types.ObjectId(userId);

    const existingChat = await AIChat.findOne({
      userId: searchUserId,
      status: "active",
    }).sort({ updatedAt: -1 }); 

    if (existingChat) {
      return res.status(200).json({
        message: "Tiếp tục session chat AI cũ",
        data: { sessionId: existingChat.sessionId, chatId: existingChat._id },
      });
    }

    const sessionId = uuidv4();

    const newChat = new AIChat({
      userId: searchUserId,
      sessionId,
      messages: [],
    });

    await newChat.save();
    res.status(201).json({
      message: "Tạo session chat AI thành công",
      data: { sessionId, chatId: newChat._id },
    });
  } catch (error) {
    console.error("Lỗi tạo/tìm session:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Gửi message và nhận response từ AI 
const sendMessage = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user._id) {
      return res
        .status(401)
        .json({ message: "Unauthorized - User ID missing" });
    }
    let searchUserId = user._id || user.userGuid;
    if (!mongoose.Types.ObjectId.isValid(searchUserId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    searchUserId = new mongoose.Types.ObjectId(searchUserId);

    const { sessionId, message } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ message: "Thiếu sessionId hoặc message" });
    }

    const chatSession = await AIChat.findOne({
      userId: searchUserId,
      sessionId,
    });

    if (!chatSession) {
      return res.status(404).json({ message: "Session không tồn tại" });
    }

    // 1. Thêm tin nhắn user vào lịch sử và lưu
    chatSession.messages.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });
    await chatSession.save();

    // 2. Xây dựng context chính xác cho AI API
    const fullHistory = chatSession.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMessage = fullHistory[fullHistory.length - 1];

    // Lấy tối đa 9 tin nhắn lịch sử (trừ tin nhắn user mới nhất)
    const historyForAPI = fullHistory.slice(
      -10,
      fullHistory.length - 1 // Loại bỏ tin nhắn cuối cùng (user)
    );

    // Kết hợp Lịch sử (tối đa 9 tin cũ) + Tin nhắn mới (1 tin user)
    const context = historyForAPI.concat(userMessage);

    // Gửi context đã được làm sạch
    const aiResponse = await sendToGemini(context, searchUserId);

    const aiMsg = {
      role: "model", 
      content: aiResponse.content || aiResponse,
      timestamp: new Date(),
      productSuggestions: aiResponse.suggestions || [],
      orderId: aiResponse.orderId,
    };

    chatSession.messages.push(aiMsg);
    chatSession.updatedAt = new Date();
    await chatSession.save();

    if (aiResponse.orderId) {
    }

    res.json({
      message: "Gửi message thành công",
      data: { response: aiMsg, sessionId },
    });
  } catch (error) {
    console.error("Lỗi gửi message:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy lịch sử chat theo session
const getChatHistory = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user._id) {
      return res
        .status(401)
        .json({ message: "Unauthorized - User ID missing" });
    }
    let searchUserId = user._id || user.userGuid;
    if (!mongoose.Types.ObjectId.isValid(searchUserId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    searchUserId = new mongoose.Types.ObjectId(searchUserId);

    const { sessionId } = req.params;

    const chatSession = await AIChat.findOne({
      userId: searchUserId,
      sessionId,
    })
      .populate("messages.productSuggestions.itemId", "Title BasePrice")
      .populate("messages.orderId", "OrderGuid TotalAmount OrderStatusId");

    if (!chatSession) {
      return res.status(404).json({ message: "Session không tồn tại" });
    }

    res.json({
      message: "Lấy lịch sử thành công",
      data: { sessionId, messages: chatSession.messages },
    });
  } catch (error) {
    console.error("Lỗi lấy lịch sử:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = {
  createChatSession,
  sendMessage,
  getChatHistory,
};
