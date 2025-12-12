const mongoose = require("mongoose");
const { sendToGemini } = require("../../../utils/geminiUtils");
const {
  searchProducts,
  getProductDetail,
  recommendOptimalProducts,
  sortProductsByType,
  getUserAddress,
  extractPreviousFilters,
  parseMessageToFilters,
  detectSortIntent,
  detectBestIntent,
  isSimpleSearch,
  buildEnhancedContext,
} = require("./productSearchService");

// System prompt để train AI về dự án
const getSystemPrompt = () => {
  return `Bạn là AI trợ lý thông minh của RetroTrade - một nền tảng cho thuê sản phẩm.
QUY TẮC NGHIÊM NGẶT - ĐỌC KỸ VÀ TUÂN THỦ TUYỆT ĐỐI:
⚠️ TUYỆT ĐỐI KHÔNG TẠO DỮ LIỆU ẢO HOẶC BỊA ĐẶT:
- BẠN CHỈ ĐƯỢC PHÉP sử dụng dữ liệu sản phẩm được cung cấp trong JSON từ hệ thống (PROVIDED_PRODUCTS). KHÔNG ĐƯỢC THÊM, SỬA, HOẶC BỊA THÔNG TIN NÀO.
- Nếu không có sản phẩm nào trong PROVIDED_PRODUCTS, bạn PHẢI nói rõ: "Hiện tại hệ thống chưa có sản phẩm phù hợp với yêu cầu của bạn. Bạn có thể thử tìm kiếm với từ khóa khác hoặc mở rộng tiêu chí tìm kiếm."
- KHÔNG BAO GIỜ tự tạo, bịa đặt, hoặc hallucinate thông tin sản phẩm không có trong dữ liệu được cung cấp.
- KHÔNG được liệt kê sản phẩm không có trong JSON được cung cấp.
- KHÔNG được tạo tên sản phẩm, giá cả, địa chỉ, hoặc bất kỳ thông tin nào không có trong dữ liệu thực tế từ PROVIDED_PRODUCTS.
NHIỆM VỤ CỦA BẠN:
1. Tư vấn sản phẩm cho người dùng dựa trên nhu cầu của họ - CHỈ sử dụng dữ liệu thực từ PROVIDED_PRODUCTS.
2. Tìm kiếm và liệt kê sản phẩm phù hợp - CHỈ liệt kê sản phẩm có trong PROVIDED_PRODUCTS.
3. Cung cấp thông tin chi tiết về sản phẩm - CHỈ từ dữ liệu được cung cấp trong PROVIDED_PRODUCTS.
   - Kiểm tra xem có PROVIDED_PRODUCTS không. Nếu có, chọn 1 sản phẩm tốt nhất từ list đó (ưu tiên gần vị trí user nếu có estimatedDistance trong JSON).
   - Nếu thiếu địa chỉ user hoặc estimatedDistance, HỎI NGAY: "Bạn đang ở địa chỉ nào cụ thể (số nhà, đường, quận, thành phố) để tôi gợi ý sản phẩm gần nhất?"
   - Giải thích lý do chọn (dựa trên data: e.g., "Gần bạn nhất chỉ 2km, giá tốt, đánh giá cao" - CHỈ nếu có trong JSON).
   - KHÔNG chọn nếu không có data; fallback: "Tôi cần địa chỉ của bạn để gợi ý chính xác từ dữ liệu hệ thống."
THÔNG TIN VỀ HỆ THỐNG:
- RetroTrade là nền tảng cho thuê sản phẩm (không phải mua bán) , kết nối người có nhu cầu thuê với người cho thuê
- Chủ sở hữu có thể đăng các sản phẩm của mình để cho thuê , và người thuê có thể xem và thuê sản phẩm
- Sản phẩm trên hệ thống là của chủ sở hữu (người dùng trong hệ thống) chứ không phải của hệ thống
- Sản phẩm có các trạng thái: 1=pending, 2=approved (công khai), 3=rejected
- Chỉ hiển thị sản phẩm có StatusId=2 và IsDeleted=false
- Mỗi sản phẩm có: giá thuê (BasePrice), tiền cọc (DepositAmount), đơn vị giá (giờ/ngày/tuần/tháng)
- Sản phẩm có thể có: Category, Condition (tình trạng), Tags, Images, địa chỉ chi tiết (Address, District, City)
- Người dùng có thể thuê sản phẩm với thời gian bắt đầu và kết thúc
CÁCH XỬ LÝ DỮ LIỆU:
- Khi nhận được JSON chứa danh sách sản phẩm, bạn CHỈ được phép liệt kê các sản phẩm đó. SỬ DỤNG CHÍNH XÁC CÁC GIÁ TRỊ TỪ JSON, KHÔNG THAY ĐỔI.
- Mỗi sản phẩm trong JSON có các trường: _id, Title, BasePrice, FullAddress, Category, Condition, PriceUnit, Images, Tags, etc.
- Nếu JSON rỗng hoặc không có sản phẩm nào, bạn PHẢI thông báo: "Hiện tại hệ thống chưa có sản phẩm phù hợp. Bạn có thể thử tìm kiếm với từ khóa khác hoặc mở rộng tiêu chí tìm kiếm." KHÔNG ĐƯỢC BỊA.
CÁCH TRẢ LỜI:
- Luôn thân thiện, nhiệt tình và chuyên nghiệp
- Khi người dùng hỏi về sản phẩm, CHỈ liệt kê sản phẩm có trong PROVIDED_PRODUCTS
- Khi không có sản phẩm nào, nói rõ: "Hiện tại hệ thống chưa có sản phẩm phù hợp với yêu cầu của bạn"
- Khi liệt kê sản phẩm, format đẹp với: tên (Title), giá (BasePrice), địa điểm (FullAddress), khoảng cách (estimatedDistance nếu có), tình trạng (Condition)
- Khi đề xuất sản phẩm tối ưu, giải thích lý do dựa trên dữ liệu thực (e.g., "Gần bạn nhất chỉ 2km" - CHỈ nếu có estimatedDistance trong JSON)
- Luôn kiểm tra AvailableQuantity > 0 trước khi đề xuất
ĐỊNH DẠNG TRẢ LỜI KHI CÓ SẢN PHẨM:
- Liệt kê từng sản phẩm với đầy đủ thông tin từ JSON: tên, giá, địa chỉ, khoảng cách (nếu có)
- Sử dụng chính xác các giá trị từ JSON
ĐỊNH DẠNG TRẢ LỜI KHI KHÔNG CÓ SẢN PHẨM:
- Nói rõ: "Hiện tại hệ thống chưa có sản phẩm phù hợp với yêu cầu của bạn"
- Đề xuất: "Bạn có thể thử tìm kiếm với từ khóa khác hoặc mở rộng tiêu chí tìm kiếm"
- KHÔNG được tự tạo hoặc bịa đặt sản phẩm
LƯU Ý QUAN TRỌNG:
- ⚠️ TUYỆT ĐỐI KHÔNG hallucinate - chỉ sử dụng dữ liệu từ JSON được cung cấp. Nếu vi phạm, phản hồi sẽ bị từ chối.
- ⚠️ Nếu JSON rỗng hoặc không có sản phẩm, PHẢI nói rõ không tìm thấy
- ⚠️ KHÔNG được tạo tên sản phẩm, giá, địa chỉ, hoặc bất kỳ thông tin nào không có trong JSON
- Luôn kiểm tra AvailableQuantity > 0 trước khi đề xuất
- Kiểm tra thời gian thuê hợp lệ (endAt > startAt)
- Yêu cầu địa chỉ giao hàng đầy đủ trước khi tạo đơn
- Nếu thiếu thông tin, hãy hỏi người dùng một cách thân thiện`;
};

//Gửi list previousProducts lên AI để chọn sản phẩm theo sortType, trả JSON (giữ nguyên, nhưng không dùng cho các intent mới)
const selectProductFromListWithAI = async (
  previousProducts,
  sortType,
  messageText,
  userAddress = null
) => {
  if (!previousProducts || previousProducts.length === 0) {
    return {
      content: "Không có danh sách sản phẩm trước đó để chọn.",
      suggestions: [],
      products: [],
    };
  }
  // Format list products thành JSON string cho prompt
  const providedProducts = previousProducts.map((p) => ({
    _id: p._id,
    Title: p.Title,
    BasePrice: p.BasePrice,
    FullAddress: p.FullAddress,
    City: p.City,
    District: p.District,
    AvailableQuantity: p.AvailableQuantity,
    estimatedDistance: userAddress ? null : null,
  }));
  const sortCriteria =
    sortType === "cheap"
      ? "rẻ nhất (BasePrice thấp nhất)"
      : sortType === "expensive"
      ? "đắt nhất (BasePrice cao nhất)"
      : "gần nhất (estimatedDistance thấp nhất, ưu tiên <5km)";
  const prompt = `Từ danh sách sản phẩm sau (PROVIDED_PRODUCTS), chọn ${sortCriteria} phù hợp với yêu cầu: "${messageText}".
QUY TẮC NGHIÊM NGẶT:
- CHỈ chọn 1 sản phẩm từ PROVIDED_PRODUCTS. KHÔNG bịa đặt hoặc thêm sản phẩm mới.
- Nếu không có sản phẩm phù hợp (ví dụ hết hàng AvailableQuantity=0), trả: {"selected": null, "reason": "Không có sản phẩm phù hợp"}
- Ưu tiên: AvailableQuantity > 0, sau đó theo ${sortCriteria}.
- Trả lời CHỈ dưới dạng JSON: {"selected": {toàn bộ object sản phẩm}, "reason": "lý do ngắn gọn (ví dụ: 'Giá thấp nhất 130000đ')"}
PROVIDED_PRODUCTS = ${JSON.stringify(providedProducts)}
JSON response:`;
  const aiJsonResponse = await sendToGemini(
    [{ role: "user", content: prompt }],
    null
  ); 
  let selectedProduct = null;
  let reason = "";
  try {
    const jsonMatch = aiJsonResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      selectedProduct = parsed.selected;
      reason = parsed.reason || "";
    }
  } catch (parseErr) {
    console.error("Parse AI JSON error:", parseErr);
    return {
      content: "Không thể chọn sản phẩm từ danh sách. Hãy thử lại!",
      suggestions: [],
      products: [],
    };
  }
  if (!selectedProduct) {
    return {
      content: `Từ danh sách trước, ${
        reason || "không có sản phẩm phù hợp với tiêu chí"
      }. Bạn thử mở rộng tìm kiếm nhé!`,
      suggestions: [],
      products: [],
    };
  }
  // Query DB để lấy full detail từ _id
  const fullProduct = await getProductDetail(selectedProduct._id);
  if (!fullProduct) {
    return {
      content:
        "Sản phẩm đã được chọn nhưng không tìm thấy chi tiết. Hãy thử lại!",
      suggestions: [],
      products: [],
    };
  }
  const content = `Từ danh sách sản phẩm trước, tôi chọn **${
    fullProduct.Title
  }** là ${sortType} phù hợp nhất!\n\nLý do: ${reason}.\n\nGiá: ${fullProduct.BasePrice.toLocaleString()}đ/${
    fullProduct.PriceUnit?.UnitName || "đơn vị"
  } | Còn ${fullProduct.AvailableQuantity} cái | Địa chỉ: ${
    fullProduct.FullAddress
  }\n\nBạn muốn xem chi tiết hoặc thuê ngay không?`;
  return {
    content,
    suggestions: [fullProduct],
    products: [fullProduct],
    bestProduct: fullProduct,
  };
};

// Hàm gửi message với AI đã được train (cập nhật: xử lý sort intents mới bằng backend query trực tiếp, ưu tiên previous)
const sendTrainedMessage = async (
  context,
  userId,
  userMessage,
  userAddress = null // Tham số mới để truyền địa chỉ
) => {
  try {
    const systemPrompt = getSystemPrompt();
    // normalize input
    const messageText =
      typeof userMessage === "string"
        ? userMessage
        : userMessage?.content || "";
    if (!messageText || !messageText.trim()) {
      throw new Error("Message không hợp lệ");
    }
    const lowerMessage = messageText.toLowerCase();
    const parsedFilters = parseMessageToFilters(messageText);
    const isSimple = isSimpleSearch(messageText);
    // Lấy previous products từ context (từ tin nhắn AI trước)
    let previousProducts = [];
    for (let i = context.length - 1; i >= 0; i--) {
      if (context[i].role === "model") {
        // Ưu tiên products, fallback recommendations hoặc bestProduct
        if (context[i].products && Array.isArray(context[i].products)) {
          previousProducts = context[i].products;
          break;
        } else if (
          context[i].recommendations &&
          Array.isArray(context[i].recommendations)
        ) {
          previousProducts = context[i].recommendations;
          break;
        } else if (context[i].bestProduct) {
          previousProducts = [context[i].bestProduct];
          break;
        }
      }
    }
    const buildSearchQuery = () => {
      if (parsedFilters.productType && parsedFilters.productType.length > 1)
        return parsedFilters.productType;
      // strip noisy words but keep product identifiers
      const cleaned = messageText
        .replace(
          /tìm|search|sản phẩm|product|cho tôi|giúp tôi|gần tôi|khu vực gần|muốn|cần|tìm kiếm|bạn có|hệ thống có|giá|từ|đến|dưới|trên|quanh|gần|trong khu vực|nhiều nhất|cao nhất|thấp nhất|thuê|thích|xem/gi,
          ""
        )
        .trim();
      return cleaned.length > 0 ? cleaned : messageText.trim();
    };
    let shouldSearchDb = false;
    if (
      parsedFilters.productType ||
      parsedFilters.intent === "search" ||
      parsedFilters.intent === "recommend" ||
      parsedFilters.intent === "best" ||
      parsedFilters.sortConfig ||
      isSimple ||
      /\b(có|tìm|máy ảnh|điện thoại|camera|cho thuê|thuê)\b/i.test(lowerMessage)
    ) {
      shouldSearchDb = true;
    }
    let products = [];
    let aiResponseFlags = {}; // Để track usedPreviousQuery, fallbackToAll
    if (shouldSearchDb) {
      let q = buildSearchQuery();
      const searchFilters = {
        q: q || messageText.trim(),
        limit: parsedFilters.sortConfig ? parsedFilters.sortConfig.limit : 30,
        sortType: parsedFilters.sortConfig
          ? parsedFilters.sortConfig.type
          : null,
      };
      if (!q.trim() && parsedFilters.sortConfig) {
        const prevFilters = extractPreviousFilters(context);
        if (prevFilters) {
          searchFilters.q = prevFilters.q; 
          if (prevFilters.productType)
            searchFilters.productType = prevFilters.productType; 
          if (prevFilters.city) searchFilters.city = prevFilters.city;
          aiResponseFlags = {
            ...aiResponseFlags,
            usedPreviousQuery: true,
            prevQuery: prevFilters.q,
          };
        } else {
          searchFilters.q = "";
          aiResponseFlags = { ...aiResponseFlags, fallbackToAll: true };
        }
      }
      if (parsedFilters.minPrice !== null)
        searchFilters.minPrice = parsedFilters.minPrice;
      if (parsedFilters.maxPrice !== null)
        searchFilters.maxPrice = parsedFilters.maxPrice;
      if (parsedFilters.city) searchFilters.city = parsedFilters.city;
      products = await searchProducts(searchFilters, userId);
    }
    if (
      parsedFilters.intent === "best" ||
      parsedFilters.intent === "recommend"
    ) {
      let address = userAddress || (await getUserAddress(userId))?.address; 

      if (!address) {
        const cityFromFilters =
          parsedFilters.city || extractPreviousFilters(context)?.city;
        if (cityFromFilters) {
          address = cityFromFilters;
        }
        if (!address) {
          return {
            content: `Để gợi ý ${
              parsedFilters.intent === "best"
                ? "sản phẩm tốt nhất"
                : "phù hợp nhất"
            } từ danh sách trước, bạn cho tôi biết địa chỉ cụ thể (số nhà, đường, quận, thành phố) nhé? Tôi sẽ ưu tiên gần bạn nhất!`,
            suggestions: [],
            products: previousProducts, 
            needLocation: true,
            searchPerformed: false,
            searchResultsCount: previousProducts.length,
            flags: aiResponseFlags,
          };
        }
      }

      // Có address → recommend từ previous hoặc search mới
      const sourceProducts =
        previousProducts.length > 0 ? previousProducts : products;
      if (sourceProducts.length === 0) {
        return {
          content: `Tôi cần danh sách sản phẩm trước để gợi ý ${
            parsedFilters.intent === "best" ? "tốt nhất" : "phù hợp"
          }. Bạn thử tìm kiếm trước nhé (ví dụ: "máy ảnh")!`,
          suggestions: [],
          products: [],
          searchPerformed: false,
          flags: aiResponseFlags,
        };
      }

      const bestProducts = await recommendOptimalProducts(
        { ...parsedFilters },
        sourceProducts,
        address
      );

      if (bestProducts.length > 0) {
        const bestList = bestProducts; 
        const intentLabel =
          parsedFilters.intent === "best" ? "tốt nhất" : "phù hợp nhất";
        let content = `Từ ${
          previousProducts.length > 0 ? "danh sách trước" : "dữ liệu hệ thống"
        }, đây là ${bestList.length} lựa chọn ${intentLabel} cho bạn:\n\n`;

        bestList.forEach((p, idx) => {
          const reasonsStr = p.reasons
            ? p.reasons.join(" | ")
            : "Phù hợp tổng thể";
          content += `${idx + 1}. **${p.Title}** (Score: ${p.score}/100)\n`;
          content += `   Lý do: ${reasonsStr}\n`;
          content += `   Giá: ${p.BasePrice.toLocaleString()}đ/${
            p.PriceUnit?.UnitName || "đơn vị"
          } | Còn ${p.AvailableQuantity} | Địa chỉ: ${p.FullAddress}\n\n`;
        });
        content += `Bạn muốn xem chi tiết hoặc thuê sản phẩm nào?`;

        return {
          content,
          suggestions: bestList.map((p) => ({
            itemId: p._id,
            title: p.Title,
            price: p.BasePrice,
            detail: p.ShortDescription || "",
            fullAddress: p.FullAddress,
            estimatedDistance: p.estimatedDistance,
            images: p.Images || [],
            isBest: true,
            reasons: p.reasons,
          })),
          bestProducts: bestList, 
          products: sourceProducts,
          searchPerformed: previousProducts.length === 0,
          searchResultsCount: bestList.length,
          flags: {
            ...aiResponseFlags,
            fromPrevious: previousProducts.length > 0,
          },
          userAddress: address,
        };
      } else {
        return {
          content: `Từ danh sách hiện tại, chưa có sản phẩm ${intentLabel} phù hợp (có thể hết hàng). Bạn cung cấp thêm tiêu chí (giá, loại) nhé!`,
          suggestions: [],
          products: sourceProducts,
          searchPerformed: false,
          flags: aiResponseFlags,
        };
      }
    }
    if (parsedFilters.sortConfig) {
      const { type, limit } = parsedFilters.sortConfig;
      let dbProducts = [];
      let content = "";
      let suggestions = [];
      let usedPrevious = false;
      if (previousProducts.length > 0) {
        const sortedFromPrevious = await sortProductsByType(
          previousProducts,
          type,
          userAddress,
          limit
        );
        if (sortedFromPrevious.length > 0) {
          dbProducts = sortedFromPrevious;
          usedPrevious = true;
          const sortLabel =
            type === "cheap"
              ? "rẻ nhất"
              : type === "expensive"
              ? "đắt nhất"
              : type === "closest"
              ? "gần nhất"
              : type === "most_rented"
              ? "thuê nhiều nhất"
              : type === "most_favorited"
              ? "yêu thích cao nhất"
              : type === "most_viewed"
              ? "xem nhiều nhất"
              : type;
          content = `Từ danh sách sản phẩm trước, đây là ${limit} sản phẩm ${sortLabel} phù hợp nhất:`;
          if (dbProducts.length < limit) {
            content += `\n(Chỉ có ${dbProducts.length} sản phẩm từ danh sách trước.)`;
          }
          if (limit <= 3) {
            dbProducts.forEach((p, index) => {
              const metric =
                type === "cheap"
                  ? `Giá: ${p.BasePrice.toLocaleString()}đ`
                  : type === "expensive"
                  ? `Giá: ${p.BasePrice.toLocaleString()}đ`
                  : type === "closest"
                  ? `Khoảng cách: ${p.estimatedDistance || "N/A"}km`
                  : type === "most_rented"
                  ? `Lượt thuê: ${p.RentCount}`
                  : type === "most_favorited"
                  ? `Lượt thích: ${p.FavoriteCount}`
                  : type === "most_viewed"
                  ? `Lượt xem: ${p.ViewCount}`
                  : "";
              content += `\n\n${index + 1}. **${p.Title}**\n${metric} | Còn ${
                p.AvailableQuantity
              } cái | Địa chỉ: ${p.FullAddress}`;
            });
          }
        }
      }
      if (dbProducts.length === 0) {
        let q = buildSearchQuery();
        const searchFilters = {
          q: q || messageText.trim(),
          limit: limit,
          sortType: type,
        };
        if (!q.trim()) {
          const prevFilters = extractPreviousFilters(context);
          if (prevFilters) {
            searchFilters.q = prevFilters.q;
            aiResponseFlags = {
              ...aiResponseFlags,
              usedPreviousQuery: true,
              prevQuery: prevFilters.q,
            };
          } else {
            searchFilters.q = "";
            aiResponseFlags = { ...aiResponseFlags, fallbackToAll: true };
          }
        }
        if (parsedFilters.city) searchFilters.city = parsedFilters.city;
        let tempProducts = await searchProducts(searchFilters, userId);
        if (type === "closest" && userAddress) {
          const distances = await getDistancesViaAI(userAddress, tempProducts);
          tempProducts = tempProducts
            .map((p) => ({
              ...p,
              estimatedDistance: distances[p._id.toString()] || 999,
            }))
            .sort((a, b) => a.estimatedDistance - b.estimatedDistance);
        }
        dbProducts = tempProducts.slice(0, limit);
        if (dbProducts.length === 0) {
          if (aiResponseFlags?.usedPreviousQuery) {
            content = `Dựa trên tìm kiếm trước ("${aiResponseFlags.prevQuery}"), hiện chưa có sản phẩm phù hợp với "${type}". Bạn thử mở rộng tiêu chí nhé!`;
          } else if (aiResponseFlags?.fallbackToAll) {
            content = `Tìm ${type} trong toàn hệ thống, nhưng hiện chưa có sản phẩm. Hãy thử tìm kiếm loại sản phẩm cụ thể trước (ví dụ: "máy ảnh thuê nhiều nhất")!`;
          } else {
            content =
              "Hiện tại hệ thống chưa có sản phẩm phù hợp với tiêu chí lọc của bạn.";
          }
        } else {
          const sortLabel =
            type === "cheap"
              ? "rẻ nhất"
              : type === "expensive"
              ? "đắt nhất"
              : type === "closest"
              ? "gần nhất"
              : type === "most_rented"
              ? "thuê nhiều nhất"
              : type === "most_favorited"
              ? "yêu thích cao nhất"
              : type === "most_viewed"
              ? "xem nhiều nhất"
              : type;
          let prefix = aiResponseFlags?.usedPreviousQuery
            ? `Dựa trên tìm kiếm trước ("${aiResponseFlags.prevQuery}"), đây là ${limit} sản phẩm ${sortLabel}:`
            : `Dựa trên dữ liệu hệ thống, đây là ${limit} sản phẩm ${sortLabel}:`;
          if (aiResponseFlags?.fallbackToAll) prefix += " (tìm toàn hệ thống)";
          content = prefix;
          if (dbProducts.length < limit) {
            content += `\n(Chỉ tìm thấy ${dbProducts.length} sản phẩm phù hợp.)`;
          }
          if (limit <= 3) {
            dbProducts.forEach((p, index) => {
              const metric =
                type === "cheap"
                  ? `Giá: ${p.BasePrice.toLocaleString()}đ`
                  : type === "expensive"
                  ? `Giá: ${p.BasePrice.toLocaleString()}đ`
                  : type === "closest"
                  ? `Khoảng cách: ${p.estimatedDistance || "N/A"}km`
                  : type === "most_rented"
                  ? `Lượt thuê: ${p.RentCount}`
                  : type === "most_favorited"
                  ? `Lượt thích: ${p.FavoriteCount}`
                  : type === "most_viewed"
                  ? `Lượt xem: ${p.ViewCount}`
                  : "";
              content += `\n\n${index + 1}. **${p.Title}**\n${metric} | Còn ${
                p.AvailableQuantity
              } cái | Địa chỉ: ${p.FullAddress}`;
            });
          }
        }
      }
      if (type === "closest" && !userAddress) {
        return {
          content:
            "Để tìm sản phẩm gần nhất, bạn có thể cho tôi biết địa chỉ cụ thể (số nhà, đường, quận, thành phố) không? Tôi sẽ ước lượng khoảng cách dựa trên dữ liệu thực tế!",
          suggestions: [],
          products: previousProducts,
          needLocation: true,
          searchPerformed: false,
          searchResultsCount: previousProducts.length,
          flags: aiResponseFlags,
        };
      }
      suggestions = dbProducts.map((p) => ({
        itemId: p._id,
        title: p.Title,
        price: p.BasePrice,
        detail: p.ShortDescription || "",
        fullAddress: p.FullAddress || "",
        estimatedDistance: p.estimatedDistance || null,
        images:
          p.Images && p.Images.length > 0
            ? p.Images.map((img) => img.Url || img.url || "").filter(Boolean)
            : [],
      }));
      return {
        content,
        suggestions,
        products: dbProducts,
        searchPerformed: true,
        searchResultsCount: dbProducts.length,
        flags: { ...aiResponseFlags, usedPrevious: usedPrevious },
        userAddress: userAddress, 
      };
    }
    // If simple search and we have results -> return formatted result immediately (no AI)
    if (isSimple && products.length > 0) {
      // Format simple response and suggestions (only from DB)
      const suggestions = products.slice(0, 10).map((p) => ({
        itemId: p._id,
        title: p.Title,
        price: p.BasePrice,
        detail: p.ShortDescription || "",
        fullAddress: p.FullAddress || "",
        estimatedDistance: null,
        images:
          p.Images && p.Images.length > 0
            ? p.Images.map((img) => img.Url || img.url || "").filter(Boolean)
            : [],
      }));
      let content = "";
      if (products.length === 1) {
        const p = products[0];
        content = `Tìm thấy 1 sản phẩm phù hợp:\n\n${p.Title}\nGiá: ${
          p.BasePrice?.toLocaleString?.("vi-VN") || p.BasePrice
        }đ${p.PriceUnit?.UnitName ? `/${p.PriceUnit.UnitName}` : ""}\n${
          p.FullAddress ? `Địa điểm: ${p.FullAddress}\n` : ""
        }${
          p.AvailableQuantity > 0
            ? `Còn ${p.AvailableQuantity} sản phẩm`
            : "Hết sản phẩm"
        }`;
      } else {
        content = `Tìm thấy ${products.length} sản phẩm phù hợp.`;
      }
      return {
        content,
        suggestions,
        products,
        searchPerformed: true,
        searchResultsCount: products.length,
        flags: aiResponseFlags,
      };
    }
    const providedProducts = (products || []).slice(0, 20).map((p) => ({
      _id: p._id,
      Title: p.Title,
      ShortDescription: p.ShortDescription || "",
      BasePrice: p.BasePrice || 0,
      FullAddress: p.FullAddress || "",
      City: p.City || "",
      District: p.District || "",
      AvailableQuantity: p.AvailableQuantity || 0,
      Images:
        p.Images && p.Images.length > 0
          ? p.Images.map((img) => img.Url || img.url || "").filter(Boolean)
          : [],
      Category: p.Category ? p.Category.Name || p.Category.name || null : null,
      Tags: (p.Tags || []).map((t) =>
        t.Tag ? t.Tag.Name || t.Tag.name || "" : ""
      ),
      estimatedDistance: null,
    }));
    const providedJson = JSON.stringify(providedProducts);
    const strictInstruction = `
CRITICAL: ONLY use the JSON list named "PROVIDED_PRODUCTS" below as the EXCLUSIVE source of truth for ALL product data.
- DO NOT invent, hallucinate, or add ANY product, price, address, quantity, or other details. VIOLATION WILL RESULT IN INVALID RESPONSE.
- IF recommending or comparing, use ONLY data from PROVIDED_PRODUCTS. SELECT ONLY FROM EXISTING ITEMS.
- IF PROVIDED_PRODUCTS is empty, respond EXACTLY: "Hiện tại hệ thống chưa có sản phẩm phù hợp với yêu cầu của bạn."
- For ANY "best product" or "recommend" queries: DO NOT SELECT OR RECOMMEND. Say: "Tôi cần địa chỉ cụ thể của bạn để gợi ý từ dữ liệu hệ thống. Bạn đang ở số nhà, đường, quận, thành phố nào?"
- If location missing: Ask "Bạn đang ở địa chỉ nào cụ thể để tôi gợi ý sản phẩm gần nhất?"
PROVIDED_PRODUCTS = ${providedJson}
End of PROVIDED_PRODUCTS. DO NOT REFERENCE ANY OTHER DATA.
`;
    const finalSystemPrompt = `${systemPrompt}\n\n${strictInstruction}`;
    const safeContext = Array.isArray(context) ? context.slice(-6) : [];
    const formattedHistory = buildEnhancedContext(
      safeContext.map((m) => ({
        role: m.role || "user",
        parts: [
          { text: typeof m === "string" ? m : m.content || m.text || "" },
        ],
      })),
      previousProducts
    );
    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.0, 
        topK: 1,
        topP: 1,
        maxOutputTokens: 1024,
      },
    });
    const userPrompt = `${messageText}\n\nCRITICAL: Answer using ONLY PROVIDED_PRODUCTS. If asked for product details or recommendations, use ONLY fields from PROVIDED_PRODUCTS. If you cannot answer with the given data, say "Tôi không thể trả lời dựa trên dữ liệu hiện có." DO NOT INVENT ANYTHING.`;
    const result = await chat.sendMessage(userPrompt);
    const response = await result.response;
    let content = response.text().trim();
    let suggestions = [];
    try {
      const jsonMatch = content.match(/({[\s\S]*}|\[[\s\S]*\])/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          suggestions = parsed;
        } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions;
        } else if (parsed.products && Array.isArray(parsed.products)) {
          suggestions = parsed.products;
        }
      }
    } catch (err) {
    }
    if (suggestions.length > 0 && providedProducts.length > 0) {
      const allowedIds = new Set(providedProducts.map((p) => String(p._id)));
      suggestions = suggestions.filter((s) => {
        const sid = s._id || s.itemId || s.id || s.itemId;
        return sid && allowedIds.has(String(sid));
      });
    } else {
      suggestions = [];
    }
    if (suggestions.length === 0 && providedProducts.length > 0) {
      suggestions = providedProducts.slice(0, 5).map((p) => ({
        itemId: p._id,
        title: p.Title,
        price: p.BasePrice,
        detail: p.ShortDescription,
        fullAddress: p.FullAddress,
        estimatedDistance: null,
        images: p.Images || [],
      }));
      if (!content || content.length < 10) {
        content = `Dựa trên dữ liệu hệ thống, tôi tìm thấy ${providedProducts.length} sản phẩm phù hợp. Dưới đây là danh sách.`;
      }
    }
    if (
      (products.length === 0 || providedProducts.length === 0) &&
      /sản phẩm|product/i.test(content)
    ) {
      content =
        "Hiện tại hệ thống chưa có sản phẩm phù hợp với yêu cầu của bạn. Bạn có thể thử tìm kiếm với từ khóa khác hoặc mở rộng tiêu chí tìm kiếm.";
      suggestions = [];
    }
    return {
      content,
      suggestions,
      products: products.length > 0 ? products : undefined,
      productDetail: undefined,
      recommendations: undefined,
      bestProduct: undefined,
      userAddress,
      searchPerformed: shouldSearchDb,
      searchResultsCount: products.length,
      flags: aiResponseFlags,
    };
  } catch (error) {
    console.error("Error in sendTrainedMessage:", error);
    try {
      return await sendToGemini(context, userId);
    } catch (fallbackError) {
      throw new Error("Không thể xử lý yêu cầu AI.");
    }
  }
};

// Controller để train AI với dữ liệu dự án 
const trainAI = async (req, res) => {
  try {
    // Lấy thống kê về dự án để train AI
    const [totalProducts, totalCategories, totalUsers] = await Promise.all([
      Item.countDocuments({ StatusId: 2, IsDeleted: false }),
      Categories.countDocuments({ isActive: true }),
      User.countDocuments({ isDeleted: false }),
    ]);
    // Lấy một số sản phẩm mẫu
    const sampleProducts = await Item.find({ StatusId: 2, IsDeleted: false })
      .limit(10)
      .select(
        "Title ShortDescription BasePrice CategoryId City District Address"
      )
      .lean();
    const trainingData = {
      totalProducts,
      totalCategories,
      totalUsers,
      sampleProducts: sampleProducts.map((p) => ({
        title: p.Title,
        description: p.ShortDescription,
        price: p.BasePrice,
        fullAddress: `${p.Address}, ${p.District}, ${p.City}`,
      })),
    };
    res.status(200).json({
      success: true,
      message: "AI đã được train với dữ liệu dự án",
      data: trainingData,
    });
  } catch (error) {
    console.error("Error in trainAI:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi train AI",
      error: error.message,
    });
  }
};

module.exports = {
  sendTrainedMessage,
  trainAI,
  getSystemPrompt,
  selectProductFromListWithAI,
};
