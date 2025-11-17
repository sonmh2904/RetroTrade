const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Đợi 1 giây giữa các lần thử

// Hàm sleep để chờ giữa các lần thử
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendToGemini = async (context, userId) => {
  // Lịch sử chat và tin nhắn mới nhất
  const formattedHistory = context.slice(0, -1).map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));
  const newMessage = context[context.length - 1].content;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
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
