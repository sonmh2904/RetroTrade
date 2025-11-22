const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Đợi 1 giây giữa các lần thử

// Hàm sleep để chờ giữa các lần thử
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendToGemini = async (context, userId) => {
  // System prompt chống hallucination cho fallback AI
  const antiHallucinationPrompt = `Bạn là AI trợ lý của RetroTrade - nền tảng cho thuê sản phẩm.

⚠️ QUY TẮC NGHIÊM NGẶT:
- TUYỆT ĐỐI KHÔNG tạo dữ liệu sản phẩm ảo hoặc không có trong hệ thống
- CHỈ sử dụng dữ liệu sản phẩm được cung cấp trong JSON từ hệ thống
- Nếu không có sản phẩm nào, nói rõ: "Hiện tại hệ thống chưa có sản phẩm phù hợp"
- KHÔNG được tự tạo tên sản phẩm, giá, địa chỉ, hoặc bất kỳ thông tin nào không có trong dữ liệu thực tế

Nhiệm vụ: Trả lời câu hỏi của người dùng một cách thân thiện, nhưng TUYỆT ĐỐI không được tạo dữ liệu ảo.`;

  // Lịch sử chat và tin nhắn mới nhất
  const formattedHistory = context.slice(0, -1).map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));
  const newMessage = context[context.length - 1].content;

  // Validate history 
  if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
    console.warn("Fixing fallback history: Starting with model");
    // Truncate to last full user-model pair (số chẵn)
    let validLen = Math.floor(formattedHistory.length / 2) * 2;
    formattedHistory.splice(0, formattedHistory.length - validLen); 
    if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
      formattedHistory.shift(); 
    }
  }

  console.log(
    "Fallback formatted history roles:",
    formattedHistory.map((h) => h.role)
  );

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: antiHallucinationPrompt,
      });

      const chat = model.startChat({
        history: formattedHistory,
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
      });

      const result = await chat.sendMessage(newMessage);
      const response = await result.response;
      const content = response.text();

      let suggestions = [];
      let orderId = null;
      try {
        const jsonMatch = content.match(/\{.*\}/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          suggestions = parsed.suggestions || [];
          orderId = parsed.orderId;
        }
      } catch (parseErr) {
        console.warn("Could not parse structured response:", parseErr);
      }

      return {
        content: content.replace(/\{.*\}/s, "").trim(),
        suggestions,
        orderId,
      };
    } catch (error) {
      console.error(
        `Gemini API error (Attempt ${attempt + 1}/${MAX_RETRIES}):`,
        error.message
      );

      const isRetryableError =
        error.status === 503 || error.message.includes("Error fetching");

      if (isRetryableError && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      } else {
        throw new Error("Không thể lấy response từ AI sau nhiều lần thử.");
      }
    }
  }
};

module.exports = { sendToGemini };
