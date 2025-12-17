const mongoose = require("mongoose");
const Item = require("../../../models/Product/Item.model");
const ItemImages = require("../../../models/Product/ItemImage.model");
const ItemTag = require("../../../models/Product/ItemTag.model");
const Categories = require("../../../models/Product/Categories.model");
const ItemConditions = require("../../../models/Product/ItemConditions.model");
const PriceUnits = require("../../../models/Product/PriceUnits.model");
const Tags = require("../../../models/Tag.model");
const User = require("../../../models/User.model");
const ItemAddress = require("../../../models/Product/ItemAddress.model");
const { sendToGemini } = require("../../../utils/geminiUtils");

const getUserAddress = async (userId) => {
  try {
    const defaultAddress = await ItemAddress.findOne({
      UserId: userId,
      IsDefault: true,
    }).lean();
    if (defaultAddress) {
      return {
        address: `${defaultAddress.Address || ""}, ${
          defaultAddress.District || ""
        }, ${defaultAddress.City || ""}`.trim(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user address:", error);
    return null;
  }
};

//Extract filters từ previous user message trong context
const extractPreviousFilters = (context) => {
  for (let i = context.length - 2; i >= 0; i--) {
    if (context[i].role === "user" && context[i].content) {
      const prevMessage = context[i].content;
      const prevParsed = parseMessageToFilters(prevMessage);
      if (prevParsed.productType || prevMessage.trim().length > 0) {
        return {
          q: prevMessage.trim(),
          productType: prevParsed.productType,
          city: prevParsed.city,
        };
      }
    }
  }
  return null;
};

// Xây dựng context nâng cao với list sản phẩm từ trước
const buildEnhancedContext = (context, previousProducts = []) => {
  const lastMsg = context[context.length - 1];
  if (previousProducts.length > 0) {
    lastMsg.additionalData = { availableProducts: previousProducts };
  }
  return context;
};

// Detect intent cho best
const detectBestIntent = (messageText) => {
  const lowerMessage = messageText.toLowerCase();
  const bestKeywords = [
    "tốt nhất",
    "best",
    "gợi ý",
    "recommend",
    "chọn giúp",
    "nên chọn",
    "tối ưu",
    "phù hợp nhất",
    "hay nhất",
    "đáng thuê",
    "ưu tiên",
    "top 1",
    "số 1",
    "gợi ý cho tôi",
    "bạn khuyên",
    "lựa chọn tốt",
  ];
  const isBest = bestKeywords.some((keyword) => lowerMessage.includes(keyword));
  if (isBest) {
    const numMatch = lowerMessage.match(
      /top\s+(\d+)|(\d+)\s+(sản phẩm|sản|items?)/i
    );
    const limit = numMatch ? parseInt(numMatch[1] || numMatch[2]) : 1;
    return { type: "best", limit };
  }
  return null;
};

// Detect intent cho cheap, expensive, closest, và các sort mới
const detectSortIntent = (messageText) => {
  const lowerMessage = messageText.toLowerCase();
  const numberMatch = lowerMessage.match(/(\d+)\s*(sản phẩm|sản|items?)/);
  const num = numberMatch ? parseInt(numberMatch[1]) : 5;
  let sortType = null;
  if (
    lowerMessage.includes("rẻ nhất") ||
    lowerMessage.includes("cheapest") ||
    lowerMessage.includes("giá thấp")
  ) {
    sortType = "cheap";
  } else if (
    lowerMessage.includes("đắt nhất") ||
    lowerMessage.includes("expensive") ||
    lowerMessage.includes("giá cao")
  ) {
    sortType = "expensive";
  } else if (
    lowerMessage.includes("gần nhất") ||
    lowerMessage.includes("closest") ||
    lowerMessage.includes("gần tôi")
  ) {
    sortType = "closest";
  } else if (
    lowerMessage.includes("nhiều lượt thuê") ||
    lowerMessage.includes("thuê nhiều nhất") ||
    lowerMessage.includes("rent count cao")
  ) {
    sortType = "most_rented";
  } else if (
    lowerMessage.includes("yêu thích cao nhất") ||
    lowerMessage.includes("favorite nhiều nhất") ||
    lowerMessage.includes("lưu nhiều nhất") ||
    lowerMessage.includes("lượt thích cao")
  ) {
    sortType = "most_favorited";
  } else if (
    lowerMessage.includes("lượt xem cao nhất") ||
    lowerMessage.includes("view nhiều nhất") ||
    lowerMessage.includes("nhiều view nhất") ||
    lowerMessage.includes("view count cao")
  ) {
    sortType = "most_viewed";
  }
  return sortType ? { type: sortType, limit: num } : null;
};

// Hàm detect xem message có phải là simple search hay complex question
const isSimpleSearch = (messageText) => {
  const lowerMessage = messageText.toLowerCase();
  const sortIntent = detectSortIntent(messageText);
  if (sortIntent) return true;
  const complexQuestionKeywords = [
    "so sánh",
    "compare",
    "khác nhau",
    "giống nhau",
    "tư vấn",
    "advice",
    "tại sao",
    "why",
    "vì sao",
    "lý do",
    "như thế nào",
    "how",
    "cách",
    "hướng dẫn",
    "giải thích",
    "explain",
    "là gì",
    "what is",
    "đánh giá",
    "review",
    "ý kiến",
    "opinion",
    "có tốt không",
    "có nên",
    "có đáng",
    "worth",
    "ưu điểm",
    "nhược điểm",
    "pros",
    "cons",
    "với",
    "và",
    "vs",
    "versus",
  ];
  const hasComplexKeyword = complexQuestionKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );
  if (hasComplexKeyword) {
    return false;
  }
  const simpleSearchKeywords = [
    "tìm",
    "search",
    "có",
    "sản phẩm",
    "product",
    "muốn",
    "cần",
    "xem",
    "hiển thị",
    "liệt kê",
    "giá",
    "từ",
    "đến",
    "dưới",
    "trên",
    "quanh",
    "gần",
    "khu vực",
    "tại",
    "ở",
  ];
  const hasSimpleKeyword = simpleSearchKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );
  if (messageText.length < 50 && hasSimpleKeyword) {
    return true;
  }
  if (
    messageText.length < 30 &&
    !messageText.includes("?") &&
    !messageText.includes("？")
  ) {
    return true;
  }
  const complexVerbs = [
    "so sánh",
    "tư vấn",
    "giải thích",
    "đánh giá",
    "nên",
    "có nên",
  ];
  const hasComplexVerb = complexVerbs.some((verb) =>
    lowerMessage.includes(verb)
  );
  if (!hasComplexVerb && messageText.length < 40) {
    return true;
  }
  if (messageText.includes("?") || messageText.includes("？")) {
    const simpleQuestions = [
      "có không",
      "có gì",
      "ở đâu",
      "giá bao nhiêu",
      "giá",
      "bao nhiêu",
    ];
    const isSimpleQuestion = simpleQuestions.some((q) =>
      lowerMessage.includes(q)
    );
    if (isSimpleQuestion) {
      return true;
    }
    return false;
  }
  return hasSimpleKeyword;
};

// Hàm parse message để extract filters
const parseMessageToFilters = (messageText) => {
  const lowerMessage = messageText.toLowerCase();
  const filters = {
    productType: "",
    minPrice: null,
    maxPrice: null,
    city : null,
    district: null,
    intent: "search",
    sortConfig: null,
    bestConfig: null,
  };
  const productTypeKeywords = [
    "máy ảnh", "camera", "thiết bị văn phòng", "laptop", "macbook", "máy tính bảng",
    "máy tính", "dell", "điện thoại", "phone", "iphone", "android", "xe máy",
    "xe đạp", "bike", "moto", "máy móc", "thiết bị", "dụng cụ", "đồ dùng", "vật dụng",
    "đồ chơi", "game", "nhạc cụ", "quần áo", "thời trang", "fashion", "giày", "dép",
    "túi", "balo", "nội thất", "bàn", "ghế", "tủ", "giường", "sofa", "đồ điện tử",
    "tivi", "tủ lạnh", "máy giặt", "điều hòa", "quạt", "máy lạnh", "bóng bàn",
    "vợt bóng bàn", "table tennis", "ping pong", "thể thao", "bóng đá", "bóng rổ",
    "bóng chuyền", "cầu lông", "tennis", "golf", "áo dạ hội", "váy dạ hội", "đầm dạ hội",
    "áo", "quần", "váy", "đầm", "máy chiếu", "máy in", "flycam", "bút", "balo",
    "máy tính bỏ túi", "dụng cụ học tập", "lều", "trại", "vest" , "đồ án",
  ];
  for (const keyword of productTypeKeywords) {
    if (lowerMessage.includes(keyword)) {
      filters.productType = keyword;
      break;
    }
  }
  const locationKeywords = {
    "hà nội": "Hà Nội", hanoi: "Hà Nội", hn: "Hà Nội",
    "tp.hcm": "TP.HCM", "hồ chí minh": "TP.HCM", "ho chi minh": "TP.HCM",
    hcm: "TP.HCM", "sài gòn": "TP.HCM", "sai gon": "TP.HCM", sg: "TP.HCM",
    "đà nẵng": "Đà Nẵng", "da nang": "Đà Nẵng", dn: "Đà Nẵng",
    "hải phòng": "Hải Phòng", "hai phong": "Hải Phòng", hp: "Hải Phòng",
    "cần thơ": "Cần Thơ", "can tho": "Cần Thơ", ct: "Cần Thơ",
    "an giang": "An Giang", "bà rịa - vũng tàu": "Bà Rịa - Vũng Tàu",
    "bạc liêu": "Bạc Liêu", "bắc giang": "Bắc Giang", "bắc kan": "Bắc Kạn",
    "bắc ninh": "Bắc Ninh", "bến tre": "Bến Tre", "bình định": "Bình Định",
    "bình dương": "Bình Dương", "bình phước": "Bình Phước", "bình thuận": "Bình Thuận",
    "cà mau": "Cà Mau", "cao bằng": "Cao Bằng", "đắk lắk": "Đắk Lắk",
    "đắk nông": "Đắk Nông", "điện biên": "Điện Biên", "đồng nai": "Đồng Nai",
    "đồng tháp": "Đồng Tháp", "gia lai": "Gia Lai", "hà giang": "Hà Giang",
    "hà nam": "Hà Nam", "hà tĩnh": "Hà Tĩnh", "hải dương": "Hải Dương",
    "hậu giang": "Hậu Giang", "hòa bình": "Hòa Bình", "hưng yên": "Hưng Yên",
    "khánh hòa": "Khánh Hòa", "kiên giang": "Kiên Giang", "kon tum": "Kon Tum",
    "lai châu": "Lai Châu", "lâm đồng": "Lâm Đồng", "lạng sơn": "Lạng Sơn",
    "lào cai": "Lào Cai", "long an": "Long An", "nam định": "Nam Định",
    "nghệ an": "Nghệ An", "ninh bình": "Ninh Bình", "ninh thuận": "Ninh Thuận",
    "phú thọ": "Phú Thọ", "phú yên": "Phú Yên", "quảng bình": "Quảng Bình",
    "quảng nam": "Quảng Nam", "quảng ngãi": "Quảng Ngãi", "quảng ninh": "Quảng Ninh",
    "quảng trị": "Quảng Trị", "sóc trăng": "Sóc Trăng", "sơn la": "Sơn La",
    "tây ninh": "Tây Ninh", "thái bình": "Thái Bình", "thái nguyên": "Thái Nguyên",
    "thanh hóa": "Thanh Hóa", "thừa thiên huế": "Thừa Thiên Huế",
    "tiền giang": "Tiền Giang", "trà vinh": "Trà Vinh", "tuyên quang": "Tuyên Quang",
    "vĩnh long": "Vĩnh Long", "vĩnh phúc": "Vĩnh Phúc", "yên bái": "Yên Bái",
  };
  for (const [keyword, city] of Object.entries(locationKeywords)) {
    if (lowerMessage.includes(keyword)) {
      filters.city = city;
      break;
    }
  }
  if (
    lowerMessage.includes("quanh") ||
    lowerMessage.includes("gần") ||
    lowerMessage.includes("trong khu vực") ||
    lowerMessage.includes("khu vực")
  ) {
  }
  const sortConfig = detectSortIntent(messageText);
  if (sortConfig) {
    filters.sortConfig = sortConfig;
    filters.intent = sortConfig.type;
  } else {
    const bestConfig = detectBestIntent(messageText);
    if (bestConfig) {
      filters.intent = "best";
      filters.bestConfig = bestConfig;
    } else if (
      lowerMessage.includes("tốt nhất") ||
      lowerMessage.includes("tối ưu") ||
      lowerMessage.includes("đề xuất") ||
      lowerMessage.includes("recommend") ||
      lowerMessage.includes("gợi ý") ||
      lowerMessage.includes("chọn") ||
      lowerMessage.includes("nên")
    ) {
      filters.intent = "recommend";
    } else if (
      lowerMessage.includes("tìm") ||
      lowerMessage.includes("search") ||
      lowerMessage.includes("có") ||
      lowerMessage.includes("muốn")
    ) {
      filters.intent = "search";
    }
  }
  return filters;
};

// Hàm sort products theo type
const sortProductsByType = async (
  products,
  sortType,
  userAddress = null,
  limit = 5
) => {
  if (!products || products.length === 0) return [];
  let sortedProducts = [...products];
  switch (sortType) {
    case "cheap":
      sortedProducts.sort((a, b) => (a.BasePrice || 0) - (b.BasePrice || 0));
      break;
    case "expensive":
      sortedProducts.sort((a, b) => (b.BasePrice || 0) - (a.BasePrice || 0));
      break;
    case "most_rented":
      sortedProducts.sort((a, b) => (b.RentCount || 0) - (a.RentCount || 0));
      break;
    case "most_favorited":
      sortedProducts.sort((a, b) => (b.FavoriteCount || 0) - (a.FavoriteCount || 0));
      break;
    case "most_viewed":
      sortedProducts.sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0));
      break;
    default:
      sortedProducts.sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0));
  }
  return sortedProducts.slice(0, limit);
};

// Hàm tìm kiếm sản phẩm
const searchProducts = async (filters = {}, userId = null) => {
  try {
    const {
      q = "",
      categoryId = null,
      minPrice = null,
      maxPrice = null,
      city = null,
      sortType = null,
      limit = 10,
    } = filters;
    const query = { StatusId: 2, IsDeleted: false };
    if (q && q.trim()) {
      const searchTerm = q.trim();
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const exactTitleMatch = new RegExp(`^${escapedTerm}$`, "i");
      const words = searchTerm.split(/\s+/).filter((w) => w.length > 0);
      const wordRegexes = words.map((word) => {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escapedWord, "i");
      });
      const partialTitleMatch = new RegExp(escapedTerm, "i");
      const regex = partialTitleMatch;
      const searchConditions = [
        { Title: exactTitleMatch },
        { Title: partialTitleMatch },
        { ShortDescription: partialTitleMatch },
        { Description: partialTitleMatch },
      ];
      if (words.length > 1) {
        searchConditions.push({
          $and: words.map((word) => {
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return { Title: new RegExp(escapedWord, "i") };
          }),
        });
      }
      try {
        const matchingCategory = await Categories.findOne({
          $or: [{ Name: regex }, { name: regex }],
          isActive: true,
        })
          .select("_id")
          .lean();
        if (matchingCategory && matchingCategory._id) {
          searchConditions.push({ CategoryId: matchingCategory._id });
        }
      } catch (catErr) {
        console.warn("Category lookup error:", catErr);
      }
      try {
        const matchingTags = await Tags.find({
          $or: [{ name: regex }, { Name: regex }],
          isDeleted: false,
        })
          .select("_id")
          .lean();
        if (matchingTags.length > 0) {
          const tagIds = matchingTags.map((t) => t._id);
          const itemTags = await ItemTag.find({
            TagId: { $in: tagIds },
            IsDeleted: false,
          })
            .select("ItemId")
            .lean();
          if (itemTags.length > 0) {
            const itemIdsFromTags = itemTags.map((it) => it.ItemId);
            searchConditions.push({ _id: { $in: itemIdsFromTags } });
          }
        }
      } catch (tagError) {
        console.error("Error searching in tags:", tagError);
      }
      query.$or = searchConditions;
    }
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      query.CategoryId = new mongoose.Types.ObjectId(categoryId);
    }
    if (minPrice !== null && !isNaN(minPrice)) {
      query.BasePrice = {
        ...(query.BasePrice || {}),
        $gte: parseFloat(minPrice),
      };
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      query.BasePrice = {
        ...(query.BasePrice || {}),
        $lte: parseFile(maxPrice),
      };
    }
    if (city && city.trim()) {
      query.City = new RegExp(city.trim(), "i");
    }
    let items = await Item.find(query).lean();
    if (q && q.trim()) {
      const searchWords = q
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^\p{L}\p{N}]+/gu, ""))
        .filter(Boolean);
      if (searchWords.length > 0) {
        const itemsWithScore = items.map((it) => {
          const title = (it.Title || "").toLowerCase();
          let matchedWords = 0;
          for (const w of searchWords) {
            if (!w) continue;
            if (title.includes(w)) matchedWords++;
          }
          const fullPhraseBonus = title.includes(q.trim().toLowerCase()) ? 2 : 0;
          const titleMatchScore = matchedWords + fullPhraseBonus;
          return { item: it, titleMatchScore, matchedWords };
        });
        const anyMatched = itemsWithScore.some(
          (x) => x.matchedWords > 0 || x.titleMatchScore > 0
        );
        if (anyMatched) {
          items = itemsWithScore
            .filter((x) => x.matchedWords > 0 || x.titleMatchScore > 0)
            .sort((a, b) => b.titleMatchScore - a.titleMatchScore)
            .map((x) => x.item);
        }
      }
    }
    if (q && q.trim()) {
      const searchTermLower = q.trim().toLowerCase();
      items = items.sort((a, b) => {
        const aTitleLower = (a.Title || "").toLowerCase();
        const bTitleLower = (b.Title || "").toLowerCase();
        if (aTitleLower === searchTermLower && bTitleLower !== searchTermLower)
          return -1;
        if (bTitleLower === searchTermLower && aTitleLower !== searchTermLower)
          return 1;
        if (
          aTitleLower.startsWith(searchTermLower) &&
          !bTitleLower.startsWith(searchTermLower)
        )
          return -1;
        if (
          bTitleLower.startsWith(searchTermLower) &&
          !aTitleLower.startsWith(searchTermLower)
        )
          return 1;
        return (
          (b.ViewCount || 0) - (a.ViewCount || 0) ||
          (b.FavoriteCount || 0) - (a.FavoriteCount || 0) ||
          new Date(b.CreatedAt || 0) - new Date(a.CreatedAt || 0)
        );
      });
    } else {
      items = items.sort(
        (a, b) =>
          (b.ViewCount || 0) - (a.ViewCount || 0) ||
          (b.FavoriteCount || 0) - (a.FavoriteCount || 0) ||
          new Date(b.CreatedAt || 0) - new Date(a.CreatedAt || 0)
      );
    }
    if (sortType) {
      if (sortType === "cheap") {
        items = items.sort((a, b) => (a.BasePrice || 0) - (b.BasePrice || 0));
      } else if (sortType === "expensive") {
        items = items.sort((a, b) => (b.BasePrice || 0) - (a.BasePrice || 0));
      } else if (sortType === "most_rented") {
        items = items.sort((a, b) => (b.RentCount || 0) - (a.RentCount || 0));
      } else if (sortType === "most_favorited") {
        items = items.sort((a, b) => (b.FavoriteCount || 0) - (a.FavoriteCount || 0));
      } else if (sortType === "most_viewed") {
        items = items.sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0));
      }
    }
    items = items.slice(0, parseInt(limit));
    if (!items || items.length === 0) {
      return [];
    }
    const itemIds = items.map((i) => i._id);
    const [
      allImages,
      allItemTags,
      allConditions,
      allPriceUnits,
      categories,
      owners,
    ] = await Promise.all([
      ItemImages.find({ ItemId: { $in: itemIds }, IsDeleted: false })
        .sort({ Ordinal: 1 })
        .lean(),
      ItemTag.find({ ItemId: { $in: itemIds }, IsDeleted: false }).lean(),
      ItemConditions.find({ IsDeleted: false }).lean(),
      PriceUnits.find({ IsDeleted: false }).lean(),
      Categories.find({
        _id: { $in: [...new Set(items.map((i) => i.CategoryId))] },
        isActive: true,
      }).lean(),
      User.find({ _id: { $in: [...new Set(items.map((i) => i.OwnerId))] } })
        .select("FullName DisplayName AvatarUrl")
        .lean(),
    ]);
    const tagIdsAll = allItemTags.map((t) => t.TagId);
    const allTags =
      tagIdsAll.length > 0
        ? await Tags.find({ _id: { $in: tagIdsAll }, isDeleted: false }).lean()
        : [];
    const imagesMap = {};
    allImages.forEach((img) => {
      const k = img.ItemId.toString();
      if (!imagesMap[k]) imagesMap[k] = [];
      imagesMap[k].push(img);
    });
    const tagMapById = {};
    allTags.forEach((t) => (tagMapById[t._id.toString()] = t));
    const tagsMap = {};
    allItemTags.forEach((it) => {
      const k = it.ItemId.toString();
      if (!tagsMap[k]) tagsMap[k] = [];
      tagsMap[k].push({ ...it, Tag: tagMapById[it.TagId.toString()] });
    });
    const categoryMap = {};
    categories.forEach((c) => (categoryMap[c._id.toString()] = c));
    const ownerMap = {};
    owners.forEach((o) => (ownerMap[o._id.toString()] = o));
    const itemsWithDetails = items
      .map((item) => {
        const baseItem = {
          _id: item._id.toString(),
          Title: item.Title,
          ShortDescription: item.ShortDescription,
          BasePrice: item.BasePrice,
          DepositAmount: item.DepositAmount,
          Currency: item.Currency,
          AvailableQuantity: item.AvailableQuantity,
          Quantity: item.Quantity,
          City: item.City,
          District: item.District,
          Address: item.Address,
          FullAddress: `${item.Address || ""}, ${item.District || ""}, ${item.City || ""}`.trim(),
          ViewCount: item.ViewCount,
          FavoriteCount: item.FavoriteCount,
          RentCount: item.RentCount,
          Category: categoryMap[item.CategoryId?.toString()] || null,
          Condition:
            allConditions.find((c) => c.ConditionId === item.ConditionId) ||
            null,
          PriceUnit:
            allPriceUnits.find((p) => p.UnitId === item.PriceUnitId) || null,
          Owner: ownerMap[item.OwnerId?.toString()] || null,
          Images: imagesMap[item._id.toString()] || [],
          Tags: tagsMap[item._id.toString()] || [],
        };
        return baseItem;
      })
      .filter((x) => x.Category && x.AvailableQuantity > 0);
    itemsWithDetails.sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0));
    return itemsWithDetails;
  } catch (error) {
    console.error("Error in searchProducts:", error);
    return [];
  }
};

// Hàm lấy chi tiết sản phẩm
const getProductDetail = async (itemId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return null;
    }
    const item = await Item.findOne({
      _id: itemId,
      StatusId: 2,
      IsDeleted: false,
    })
      .populate("OwnerId", "FullName DisplayName AvatarUrl userGuid")
      .lean();
    if (!item) {
      return null;
    }
    const [images, itemTags, category, condition, priceUnit] =
      await Promise.all([
        ItemImages.find({ ItemId: item._id, IsDeleted: false })
          .sort({ Ordinal: 1 })
          .lean(),
        ItemTag.find({ ItemId: item._id, IsDeleted: false }).lean(),
        Categories.findOne({ _id: item.CategoryId, isActive: true }).lean(),
        ItemConditions.findOne({
          ConditionId: item.ConditionId,
          IsDeleted: false,
        }).lean(),
        PriceUnits.findOne({
          UnitId: item.PriceUnitId,
          IsDeleted: false,
        }).lean(),
      ]);
    const tagIds = itemTags.map((t) => t.TagId);
    const tags =
      tagIds.length > 0
        ? await Tags.find({ _id: { $in: tagIds }, isDeleted: false }).lean()
        : [];
    const tagMap = {};
    tags.forEach((t) => (tagMap[t._id.toString()] = t));
    const tagsFull = itemTags.map((it) => ({
      ...it,
      Tag: tagMap[it.TagId?.toString()],
    }));
    const fullAddress = `${item.Address || ""}, ${item.District || ""}, ${item.City || ""}`.trim();
    const isAvailableNow = item.AvailableQuantity > 0;
    const popularityScore = (
      (item.ViewCount + item.FavoriteCount + item.RentCount) /
      3
    ).toFixed(0);
    return {
      _id: item._id.toString(),
      Title: item.Title,
      ShortDescription: item.ShortDescription,
      Description: item.Description,
      BasePrice: item.BasePrice,
      DepositAmount: item.DepositAmount,
      Currency: item.Currency,
      AvailableQuantity: item.AvailableQuantity,
      Quantity: item.Quantity,
      MinRentalDuration: item.MinRentalDuration,
      MaxRentalDuration: item.MaxRentalDuration,
      City: item.City,
      District: item.District,
      Address: item.Address,
      FullAddress: fullAddress,
      IsAvailableNow: isAvailableNow,
      PopularityScore: popularityScore,
      ViewCount: item.ViewCount,
      FavoriteCount: item.FavoriteCount,
      RentCount: item.RentCount,
      Category: category || null,
      Condition: condition || null,
      PriceUnit: priceUnit || null,
      Owner: item.OwnerId || null,
      Images: images || [],
      Tags: tagsFull || [],
    };
  } catch (error) {
    console.error("Error in getProductDetail:", error);
    return null;
  }
};

// recommendOptimalProducts - ĐÃ BỎ HOÀN TOÀN KHOẢNG CÁCH
const recommendOptimalProducts = async (
  filters = {},
  previousProducts = [],
  userAddress = null
) => {
  try {
    let products =
      previousProducts.length > 0
        ? previousProducts
        : await searchProducts({
            ...filters,
            limit: 30,
          });

    if (products.length === 0) {
      return [];
    }

    const scoredProducts = products.map((product) => {
      let score = 0;
      let reasons = [];

      const engagement =
        (product.ViewCount || 0) +
        (product.FavoriteCount || 0) +
        (product.RentCount || 0);
      const maxEngagement = 1000;
      const engagementScore = Math.min((engagement / maxEngagement) * 40, 40);
      score += engagementScore;
      if (engagement > 100)
        reasons.push(`Phổ biến cao (${engagement} lượt tương tác)`);

      const normalizedPrice = Math.max(
        0,
        ((10000000 - (product.BasePrice || 0)) / 10000000) * 30
      );
      score += normalizedPrice;
      if (product.BasePrice < 500000)
        reasons.push(`Sản phẩm có tương tác cao`);

      const availabilityRatio = Math.min(
        (product.AvailableQuantity || 0) / (product.Quantity || 1),
        1
      );
      score += availabilityRatio * 15;
      if (product.AvailableQuantity > 5)
        reasons.push(`Còn nhiều (${product.AvailableQuantity} cái)`);

      if (
        product.Condition?.ConditionName === "Mới" ||
        product.ConditionId === 1
      ) {
        score += 15;
        reasons.push("Tình trạng mới");
      }

      return {
        ...product,
        recommendationScore: Math.round(score * 10) / 10,
        reasons,
      };
    });

    const limit = filters.bestConfig?.limit || 1;
    let topProducts = scoredProducts
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit)
      .map(({ recommendationScore, reasons, ...product }) => ({
        ...product,
        isBest: true,
        reasons,
        score: recommendationScore,
      }));

    const enrichedTopProducts = await Promise.all(
      topProducts.map(async (product) => {
        const fullDetail = await getProductDetail(product._id);
        if (fullDetail) {
          return {
            ...fullDetail,
            isBest: true,
            reasons: product.reasons,
            score: product.score,
          };
        }
        return product;
      })
    );

    return enrichedTopProducts;
  } catch (error) {
    console.error("Error in recommendOptimalProducts:", error);
    return [];
  }
};

module.exports = {
  searchProducts,
  getProductDetail,
  recommendOptimalProducts,
  getUserAddress,
  extractPreviousFilters,
  parseMessageToFilters,
  detectSortIntent,
  detectBestIntent,
  isSimpleSearch,
  buildEnhancedContext,
  sortProductsByType,
};