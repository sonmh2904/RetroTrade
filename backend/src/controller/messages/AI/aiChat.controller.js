const AIChat = require("../../../models/Chat/AIChat.model");
const { v4: uuidv4 } = require("uuid");
const { sendToGemini } = require("../../../utils/geminiUtils");
const { sendTrainedMessage } = require("./aiTrain.controller");
const Order = require("../../../models/Order/Order.model");
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
    res
      .status(500)
      .json({ message: "bạn thử lại sau nhé", error: error.message });
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
    // Lưu ý: Cần lưu cả products để có thể dùng lại trong context
    const fullHistory = chatSession.messages.map((m) => {
      const msg = {
        role: m.role,
        content: m.content,
      };
      // Lưu products từ message để có thể dùng lại (nếu có)
      if (m.products && Array.isArray(m.products) && m.products.length > 0) {
        msg.products = m.products;
      }
      if (
        m.recommendations &&
        Array.isArray(m.recommendations) &&
        m.recommendations.length > 0
      ) {
        msg.recommendations = m.recommendations;
      }
      if (m.bestProduct) {
        msg.bestProduct = m.bestProduct;
      }
      return msg;
    });

    // Loại user hiện tại để lấy previous history (số chẵn, kết thúc bằng 'model')
    const previousHistory = fullHistory.slice(0, -1);

    // Lấy last 10 tin từ previous (số chẵn, bắt đầu bằng 'user' nếu có)
    const historyForAPI = previousHistory.slice(-10); // -10 của chẵn = bắt đầu index chẵn (user)

    // Context: previous + current user (bao gồm cả products từ previous messages)
    const currentUserMsg = { role: "user", content: message };
    const context = [...historyForAPI, currentUserMsg];

    // Sử dụng AI đã được train để xử lý message
    let aiResponse;
    try {
      aiResponse = await sendTrainedMessage(
        context,
        searchUserId,
        currentUserMsg
      );
    } catch (error) {
      console.error("Error with trained AI, falling back to basic AI:", error);
      aiResponse = await sendToGemini(context, searchUserId);
    }

    // Format products để lưu vào message (chỉ lưu thông tin cần thiết)
    const formatProductsForStorage = (products) => {
      if (!products || !Array.isArray(products)) return [];
      return products.slice(0, 20).map((p) => {
        const rawId = p._id ?? p.itemId ?? "";
        const safeId =
          rawId &&
          typeof rawId === "object" &&
          typeof rawId.toString === "function"
            ? rawId.toString()
            : String(rawId || "");
        return {
          _id: safeId,
          Title: p.Title || p.title || "",
          BasePrice: p.BasePrice || p.price || 0,
          ShortDescription: p.ShortDescription || p.detail || "",
          FullAddress: p.FullAddress || p.fullAddress || "",
          City: p.City || p.city || "",
          District: p.District || p.district || "",
          Address: p.Address || p.address || "",
          ViewCount: p.ViewCount || 0,
          FavoriteCount: p.FavoriteCount || 0,
          RentCount: p.RentCount || 0,
          AvailableQuantity: p.AvailableQuantity || 0,
          Quantity: p.Quantity || 0,
          estimatedDistance: p.estimatedDistance || null,
          Category: p.Category || null,
          Condition: p.Condition || null,
          PriceUnit: p.PriceUnit || null,
          Images: p.Images || [],
        };
      });
    };

    const aiMsg = {
      role: "model",
      content: aiResponse.content || aiResponse,
      timestamp: new Date(),
      productSuggestions: aiResponse.suggestions || [],
      orderId: aiResponse.orderId,
      // Lưu products vào message để có thể dùng lại trong context (format đơn giản)
      products: formatProductsForStorage(aiResponse.products || []),
      recommendations: formatProductsForStorage(
        aiResponse.recommendations || []
      ),
      bestProduct: aiResponse.bestProduct
        ? formatProductsForStorage([aiResponse.bestProduct])[0]
        : null,
    };

    chatSession.messages.push(aiMsg);
    chatSession.updatedAt = new Date();
    await chatSession.save();


    res.json({
      message: "Gửi message thành công",
      data: {
        response: aiMsg,
        sessionId,
        products: aiResponse.products,
        productDetail: aiResponse.productDetail,
        recommendations: aiResponse.recommendations,
        bestProduct: aiResponse.bestProduct, // Sản phẩm tốt nhất (1 cái)
      },
    });
  } catch (error) {
    console.error("Lỗi gửi message:", error);
    res
      .status(500)
      .json({ message: "bạn thử lại sau nhé", error: error.message });
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
    res
      .status(500)
      .json({ message: "bạn thử lại sau nhé", error: error.message });
  }
};

module.exports = {
  createChatSession,
  sendMessage,
  getChatHistory,
};
