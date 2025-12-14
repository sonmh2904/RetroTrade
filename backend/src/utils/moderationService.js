const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// Hàm sleep để chờ giữa các lần thử
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// System prompt cho moderation AI
const getModerationPrompt = () => {
  return `Bạn là AI kiểm duyệt nội dung cho RetroTrade - nền tảng cho thuê sản phẩm.

NHIỆM VỤ: Phân tích bình luận và phân loại xem có vi phạm quy tắc cộng đồng không.

QUY TẮC VI PHẠM:
1. **SPAM**: Quảng cáo, lặp lại nội dung, nội dung không liên quan, link spam
2. **HATE_SPEECH**: Lăng mạ, phân biệt chủng tộc, tôn giáo, giới tính, định hướng tính dục
3. **HARASSMENT**: Đe dọa, quấy rối, bắt nạt, đe dọa bạo lực
4. **INAPPROPRIATE**: Nội dung khiêu dâm, bạo lực, không phù hợp với cộng đồng
5. **OFF_TOPIC**: Bình luận hoàn toàn không liên quan đến chủ đề bài viết
6. **TROLL**: Bình luận chọc tức, khiêu khích, gây tranh cãi vô ích

ĐỘ TIN CẬY:
- Chỉ đánh dấu vi phạm khi CHẮC CHẮN (confidence > 0.8)
- Nếu nghi ngờ nhưng không chắc chắn → không vi phạm
- Ưu tiên cho quyền tự do ngôn luận

ĐỊNH DẠNG TRẢ LỜI JSON:
{
  "isViolation": boolean,
  "violationType": "spam|hate_speech|harassment|inappropriate|off_topic|troll|null",
  "confidence": number (0-1),
  "reason": "Lý do ngắn gọn nếu vi phạm"
}`;
};

// Hàm kiểm duyệt nội dung bằng AI
const moderateContent = async (content, context = null) => {
  if (!content || content.trim().length === 0) {
    return {
      isViolation: false,
      violationType: null,
      confidence: 0,
      reason: null
    };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: getModerationPrompt(),
      });

      const prompt = `Hãy phân tích bình luận sau và xác định xem có vi phạm quy tắc không:

BÌNH LUẬN: "${content}"

${context ? `NGỮ CẢNH: ${context}` : ''}

Trả lời CHỈ dưới dạng JSON.`;

      const chat = model.startChat();
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const responseText = response.text().trim();

      // Parse JSON response
      try {
        // Tìm JSON trong response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate response format
        if (typeof parsed.isViolation !== 'boolean') {
          throw new Error("Invalid isViolation format");
        }

        if (parsed.isViolation && (!parsed.violationType || !parsed.reason)) {
          throw new Error("Missing violation details");
        }

        return {
          isViolation: parsed.isViolation,
          violationType: parsed.violationType || null,
          confidence: parsed.confidence || 0,
          reason: parsed.reason || null
        };

      } catch (parseError) {
        console.warn(`AI moderation parse error (attempt ${attempt + 1}):`, parseError.message);
        // Fallback: nếu không parse được, coi là không vi phạm
        if (attempt === MAX_RETRIES - 1) {
          return {
            isViolation: false,
            violationType: null,
            confidence: 0,
            reason: null
          };
        }
        continue;
      }

    } catch (error) {
      console.error(`AI moderation error (attempt ${attempt + 1}):`, error.message);

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      } else {
        // Fallback khi AI không hoạt động: chỉ check từ khóa cơ bản
        return basicKeywordCheck(content);
      }
    }
  }
};

// Fallback function khi AI không hoạt động
const basicKeywordCheck = (content) => {
  const lowerContent = content.toLowerCase();

  // Từ khóa spam
  const spamKeywords = ['http', 'www', '.com', '.vn', 'mua ngay', 'liên hệ', 'zalo', 'telegram'];
  const hasSpam = spamKeywords.some(keyword => lowerContent.includes(keyword));

  // Từ khóa hate speech
  const hateKeywords = ['đồ ngu', 'đồ điên', 'cút đi', 'chết đi', 'mẹ mày', 'địt mẹ'];
  const hasHate = hateKeywords.some(keyword => lowerContent.includes(keyword));

  if (hasSpam) {
    return {
      isViolation: true,
      violationType: 'spam',
      confidence: 0.9,
      reason: 'Chứa link hoặc từ khóa quảng cáo'
    };
  }

  if (hasHate) {
    return {
      isViolation: true,
      violationType: 'hate_speech',
      confidence: 0.8,
      reason: 'Chứa ngôn ngữ lăng mạ'
    };
  }

  return {
    isViolation: false,
    violationType: null,
    confidence: 0,
    reason: null
  };
};

// Hàm tính điểm uy tín dựa trên violation
const calculateReputationPenalty = (violationType, severity = 'medium') => {
  const basePenalties = {
    'spam': 0.1,
    'hate_speech': 0.3,
    'harassment': 0.4,
    'inappropriate': 0.2,
    'off_topic': 0.1,
    'troll': 0.2,
    'other': 0.1
  };

  const multipliers = {
    'low': 0.5,
    'medium': 1.0,
    'high': 1.5
  };

  const basePenalty = basePenalties[violationType] || 0.1;
  return basePenalty * multipliers[severity];
};

// Hàm tính thời gian ban dựa trên violation history
const calculateBanDuration = (violationType, userViolationHistory = []) => {
  const baseDurations = {
    'spam': 1, // 1 giờ
    'hate_speech': 24, // 24 giờ
    'harassment': 72, // 3 ngày
    'inappropriate': 12, // 12 giờ
    'off_topic': 1, // 1 giờ
    'troll': 6, // 6 giờ
    'other': 1 // 1 giờ
  };

  const baseHours = baseDurations[violationType] || 1;

  // Tăng thời gian ban dựa trên lịch sử vi phạm
  const recentViolations = userViolationHistory.filter(v =>
    v.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 ngày gần nhất
  );

  const multiplier = Math.min(recentViolations.length + 1, 5); // Tối đa 5x

  return baseHours * multiplier;
};

module.exports = {
  moderateContent,
  calculateReputationPenalty,
  calculateBanDuration
};
