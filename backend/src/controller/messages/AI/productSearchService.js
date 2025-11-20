// File: productSearchService.js - Thêm hàm sortProductsByType để sort previous products theo type
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

// Helper function để tính khoảng cách haversine (km) giữa hai điểm lat/lng
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getApproxCoords = (city, district = null) => {
  const coords = {
    // TP.HCM (Quận nội thành)
    "TP.HCM": { lat: 10.8231, lng: 106.6297 },
    "Quận 1": { lat: 10.7778, lng: 106.7 },
    "Quận 2": { lat: 10.76, lng: 106.75 },
    "Quận 3": { lat: 10.7792, lng: 106.68 },
    "Quận 4": { lat: 10.76, lng: 106.71 },
    "Quận 5": { lat: 10.76, lng: 106.69 },
    "Quận 6": { lat: 10.745, lng: 106.65 },
    "Quận 7": { lat: 10.73, lng: 106.72 },
    "Quận 8": { lat: 10.74, lng: 106.67 },
    "Quận 10": { lat: 10.77, lng: 106.66 },
    "Quận 11": { lat: 10.76, lng: 106.64 },
    "Quận 12": { lat: 10.86, lng: 106.64 },
    "Bình Thạnh": { lat: 10.81, lng: 106.71 },
    "Phú Nhuận": { lat: 10.8, lng: 106.68 },
    "Tân Bình": { lat: 10.8, lng: 106.65 },
    "Tân Phú": { lat: 10.78, lng: 106.63 },

    // TP.HCM (Huyện ngoại thành)
    "Bình Chánh": { lat: 10.67, lng: 106.57 },
    "Cần Giờ": { lat: 10.62, lng: 106.95 },
    "Củ Chi": { lat: 11.0, lng: 106.47 },
    "Hóc Môn": { lat: 10.88, lng: 106.54 },
    "Nhà Bè": { lat: 10.7, lng: 106.72 },
    "Thủ Đức": { lat: 10.84, lng: 106.77 }, 

    // Hà Nội (Quận nội thành)
    "Hà Nội": { lat: 21.0285, lng: 105.8542 },
    "Ba Đình": { lat: 21.0388, lng: 105.8337 },
    "Hoàn Kiếm": { lat: 21.0285, lng: 105.8512 },
    "Hai Bà Trưng": { lat: 21.017, lng: 105.85 },
    "Đống Đa": { lat: 21.01, lng: 105.82 },
    "Cầu Giấy": { lat: 21.03, lng: 105.78 },
    "Thanh Xuân": { lat: 20.99, lng: 105.8 },
    "Hoàng Mai": { lat: 20.98, lng: 105.86 },
    "Long Biên": { lat: 21.06, lng: 105.91 },
    "Bắc Từ Liêm": { lat: 21.05, lng: 105.76 },
    "Nam Từ Liêm": { lat: 21.02, lng: 105.76 },
    "Hà Đông": { lat: 20.99, lng: 105.78 },
    "Gia Lâm": { lat: 21.07, lng: 105.95 },

    // Hà Nội (Huyện ngoại thành) 
    "Ba Vì": { lat: 21.05, lng: 105.45 },
    "Chương Mỹ": { lat: 20.8, lng: 105.65 },
    "Đan Phượng": { lat: 21.05, lng: 105.7 },
    "Đông Anh": { lat: 21.15, lng: 105.95 },
    "Mê Linh": { lat: 21.15, lng: 105.7 },
    "Mỹ Đức": { lat: 20.7, lng: 105.65 },
    "Phúc Thọ": { lat: 21.15, lng: 105.55 },
    "Phú Xuyên": { lat: 20.65, lng: 105.95 },
    "Quốc Oai": { lat: 20.85, lng: 105.6 },
    "Sóc Sơn": { lat: 21.25, lng: 105.85 },
    "Thạch Thất": { lat: 21.1, lng: 105.55 },
    "Thanh Oai": { lat: 20.75, lng: 105.8 },
    "Thanh Trì": { lat: 20.85, lng: 105.9 },
    "Thường Tín": { lat: 20.75, lng: 105.95 },
    "Ứng Hòa": { lat: 20.6, lng: 105.8 },
    "Sơn Tây": { lat: 21.15, lng: 105.35 },
    "Bắc Biên Hòa": { lat: 21.1, lng: 105.8 }, 

    // Các tỉnh thành Việt Nam (63 tỉnh/thành phố)
    "An Giang": { lat: 10.3804, lng: 105.42 },
    "Bà Rịa - Vũng Tàu": { lat: 10.3554, lng: 107.085 },
    "Bắc Giang": { lat: 21.267, lng: 106.2 },
    "Bắc Kạn": { lat: 22.1333, lng: 105.8333 },
    "Bạc Liêu": { lat: 9.2804, lng: 105.72 },
    "Bắc Ninh": { lat: 21.19, lng: 106.08 },
    "Bến Tre": { lat: 10.235, lng: 106.375 },
    "Bình Định": { lat: 13.78, lng: 109.18 },
    "Bình Dương": { lat: 10.9691, lng: 106.6527 },
    "Bình Phước": { lat: 11.6504, lng: 106.6 },
    "Bình Thuận": { lat: 10.9337, lng: 108.1001 },
    "Cà Mau": { lat: 9.1774, lng: 105.15 },
    "Cần Thơ": { lat: 10.05, lng: 105.77 },
    "Cao Bằng": { lat: 22.664, lng: 106.268 },
    "Đắk Lắk": { lat: 12.667, lng: 108.05 },
    "Đắk Nông": { lat: 12.2333, lng: 107.8 },
    "Điện Biên": { lat: 21.74, lng: 103.343 },
    "Đồng Nai": { lat: 10.97, lng: 106.8301 },
    "Đồng Tháp": { lat: 10.467, lng: 105.636 },
    "Gia Lai": { lat: 13.9833, lng: 108.0 },
    "Hà Giang": { lat: 22.8337, lng: 104.9833 },
    "Hà Nam": { lat: 20.15, lng: 105.917 },
    "Hà Tĩnh": { lat: 18.3338, lng: 105.9 },
    "Hải Dương": { lat: 20.942, lng: 106.331 },
    "Hải Phòng": { lat: 20.8651, lng: 106.6838 },
    "Hậu Giang": { lat: 9.7833, lng: 105.4667 },
    "Hòa Bình": { lat: 20.8137, lng: 105.3383 },
    "Hưng Yên": { lat: 20.65, lng: 106.05 },
    "Khánh Hòa": { lat: 12.25, lng: 109.17 },
    "Kiên Giang": { lat: 10.0154, lng: 105.0914 },
    "Kon Tum": { lat: 14.3838, lng: 107.9833 },
    "Lai Châu": { lat: 22.3833, lng: 103.45 },
    "Lâm Đồng": { lat: 11.9304, lng: 108.42 },
    "Lạng Sơn": { lat: 21.846, lng: 106.757 },
    "Lào Cai": { lat: 22.5014, lng: 103.966 },
    "Long An": { lat: 10.5337, lng: 106.4167 },
    "Nam Định": { lat: 20.42, lng: 106.2 },
    "Nghệ An": { lat: 18.7, lng: 105.68 },
    "Ninh Bình": { lat: 20.2543, lng: 105.975 },
    "Ninh Thuận": { lat: 11.567, lng: 108.9833 },
    "Phú Thọ": { lat: 21.3304, lng: 105.43 },
    "Phú Yên": { lat: 13.082, lng: 109.316 },
    "Quảng Bình": { lat: 17.4833, lng: 106.6 },
    "Quảng Nam": { lat: 15.5833, lng: 107.8 },
    "Quảng Ngãi": { lat: 15.1504, lng: 108.83 },
    "Quảng Ninh": { lat: 20.9604, lng: 107.1 },
    "Quảng Trị": { lat: 16.85, lng: 107.1333 },
    "Sóc Trăng": { lat: 9.6037, lng: 105.98 },
    "Sơn La": { lat: 21.328, lng: 103.91 },
    "Tây Ninh": { lat: 11.323, lng: 106.147 },
    "Thái Bình": { lat: 20.4503, lng: 106.333 },
    "Thái Nguyên": { lat: 21.6, lng: 105.83 },
    "Thanh Hóa": { lat: 19.82, lng: 105.8 },
    "Thừa Thiên Huế": { lat: 16.47, lng: 107.58 },
    "Tiền Giang": { lat: 10.3504, lng: 106.35 },
    "Trà Vinh": { lat: 9.934, lng: 106.334 },
    "Tuyên Quang": { lat: 21.818, lng: 105.211 },
    "Vĩnh Long": { lat: 10.256, lng: 105.964 },
    "Vĩnh Phúc": { lat: 21.3167, lng: 105.6 },
    "Yên Bái": { lat: 21.705, lng: 104.875 },
  };
  const key = district ? `${district} (${city})` : city;
  return coords[key] || coords[city] || { lat: null, lng: null };
};

// lấy location user từ ItemAddress (nếu có default)
const getUserLocation = async (userId) => {
  try {
    const defaultAddress = await ItemAddress.findOne({
      UserId: userId,
      IsDefault: true,
    }).lean();
    if (defaultAddress) {
      const { lat, lng } = getApproxCoords(
        defaultAddress.City,
        defaultAddress.District
      );
      return {
        lat,
        lng,
        city: defaultAddress.City,
        district: defaultAddress.District,
        fullAddress: defaultAddress.Address,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user location:", error);
    return null;
  }
};

//Extract filters từ previous user message trong context
const extractPreviousFilters = (context) => {
  for (let i = context.length - 2; i >= 0; i--) {
    // Bắt đầu từ message trước current user
    if (context[i].role === "user" && context[i].content) {
      const prevMessage = context[i].content;
      const prevParsed = parseMessageToFilters(prevMessage);
      if (prevParsed.productType || prevMessage.trim().length > 0) {
        return {
          q: prevMessage.trim(), // Dùng full prev message làm q (an toàn hơn clean)
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
  // Thêm info về list sản phẩm vào context cuối (cho AI biết có data sẵn)
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
  ];
  return bestKeywords.some((keyword) => lowerMessage.includes(keyword));
};

// Detect intent cho cheap, expensive, closest, và các sort mới (rent, favorite, view)
const detectSortIntent = (messageText) => {
  const lowerMessage = messageText.toLowerCase();
  const numberMatch = lowerMessage.match(/(\d+)\s*(sản phẩm|sản|items?)/);
  const num = numberMatch ? parseInt(numberMatch[1]) : 5; // Default 5 cho list
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

// Hàm detect xem message có phải là simple search (query trực tiếp) hay complex question (cần AI) 
const isSimpleSearch = (messageText) => {
  const lowerMessage = messageText.toLowerCase();
  const sortIntent = detectSortIntent(messageText);
  // Nếu có sort intent (cheap, expensive, closest, most_rented, etc.), coi là simple
  if (sortIntent) return true;
  // Từ khóa chỉ định câu hỏi phức tạp (cần AI)
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
    "versus", // So sánh
  ];
  // Nếu có từ khóa câu hỏi phức tạp -> không phải simple search
  const hasComplexKeyword = complexQuestionKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );
  if (hasComplexKeyword) {
    return false; // Câu hỏi phức tạp, cần AI
  }
  // Từ khóa chỉ định tìm kiếm đơn giản
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
  // Nếu có từ khóa tìm kiếm đơn giản -> simple search
  const hasSimpleKeyword = simpleSearchKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );
  // Nếu message ngắn (< 50 ký tự) và có từ khóa tìm kiếm -> simple search
  if (messageText.length < 50 && hasSimpleKeyword) {
    return true;
  }
  // Nếu message chỉ là tên sản phẩm hoặc từ khóa ngắn (không có dấu hỏi) -> simple search
  if (
    messageText.length < 30 &&
    !messageText.includes("?") &&
    !messageText.includes("？")
  ) {
    return true;
  }
  // Nếu message chỉ là từ khóa đơn giản (không có động từ phức tạp) -> simple search
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
  // Nếu có dấu hỏi -> kiểm tra kỹ hơn
  if (messageText.includes("?") || messageText.includes("？")) {
    // Nếu có dấu hỏi nhưng là câu hỏi đơn giản 
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
    return false; // Câu hỏi phức tạp
  }
  // Mặc định: nếu có từ khóa tìm kiếm -> simple search
  return hasSimpleKeyword;
};

// Hàm parse message để extract filters (product type, price, location, etc.) 
const parseMessageToFilters = (messageText) => {
  const lowerMessage = messageText.toLowerCase();
  const filters = {
    productType: "",
    minPrice: null,
    maxPrice: null,
    city: null,
    district: null,
    intent: "search", // search, recommend, best, cheap, expensive, closest, most_rented, most_favorited, most_viewed
    sortConfig: null, 
  };
  // Danh sách từ khóa về loại sản phẩm 
  const productTypeKeywords = [
    "máy ảnh",
    "camera",
    "thiết bị văn phòng",
    "laptop",
    "macbook",
    "máy tính bảng",
    "máy tính",
    "dell",
    "điện thoại",
    "phone",
    "iphone",
    "android",
    "xe",
    "xe máy",
    "xe đạp",
    "bike",
    "moto",
    "máy móc",
    "thiết bị",
    "dụng cụ",
    "đồ dùng",
    "vật dụng",
    "đồ chơi",
    "game",
    "nhạc cụ",
    "quần áo",
    "thời trang",
    "fashion",
    "giày",
    "dép",
    "túi",
    "balo",
    "nội thất",
    "bàn",
    "ghế",
    "tủ",
    "giường",
    "sofa",
    "đồ điện tử",
    "tivi",
    "tủ lạnh",
    "máy giặt",
    "điều hòa",
    "quạt",
    "máy lạnh",
    "bóng bàn",
    "vợt bóng bàn",
    "table tennis",
    "ping pong",
    "thể thao",
    "bóng đá",
    "bóng rổ",
    "bóng chuyền",
    "cầu lông",
    "tennis",
    "golf",
    "áo dạ hội",
    "váy dạ hội",
    "đầm dạ hội",
    "áo",
    "quần",
    "váy",
    "đầm",
    "máy chiếu",
    "máy in",
    "flycam",
    "bút",
    "balo",
    "máy tính bỏ túi",
    "dụng cụ học tập",
    "lều",
    "trại",
  ];
  // Tìm product type
  for (const keyword of productTypeKeywords) {
    if (lowerMessage.includes(keyword)) {
      filters.productType = keyword;
      break;
    }
  }
  // Extract địa điểm 
  const locationKeywords = {
    "hà nội": "Hà Nội",
    hanoi: "Hà Nội",
    hn: "Hà Nội",
    "tp.hcm": "TP.HCM",
    "hồ chí minh": "TP.HCM",
    "ho chi minh": "TP.HCM",
    hcm: "TP.HCM",
    "sài gòn": "TP.HCM",
    "sai gon": "TP.HCM",
    sg: "TP.HCM",
    "đà nẵng": "Đà Nẵng",
    "da nang": "Đà Nẵng",
    dn: "Đà Nẵng",
    "hải phòng": "Hải Phòng",
    "hai phong": "Hải Phòng",
    hp: "Hải Phòng",
    "cần thơ": "Cần Thơ",
    "can tho": "Cần Thơ",
    ct: "Cần Thơ",
    "an giang": "An Giang",
    "bà rịa - vũng tàu": "Bà Rịa - Vũng Tàu",
    "bạc liêu": "Bạc Liêu",
    "bắc giang": "Bắc Giang",
    "bắc kan": "Bắc Kạn",
    "bắc ninh": "Bắc Ninh",
    "bến tre": "Bến Tre",
    "bình định": "Bình Định",
    "bình dương": "Bình Dương",
    "bình phước": "Bình Phước",
    "bình thuận": "Bình Thuận",
    "cà mau": "Cà Mau",
    "cao bằng": "Cao Bằng",
    "đắk lắk": "Đắk Lắk",
    "đắk nông": "Đắk Nông",
    "điện biên": "Điện Biên",
    "đồng nai": "Đồng Nai",
    "đồng tháp": "Đồng Tháp",
    "gia lai": "Gia Lai",
    "hà giang": "Hà Giang",
    "hà nam": "Hà Nam",
    "hà tĩnh": "Hà Tĩnh",
    "hải dương": "Hải Dương",
    "hậu giang": "Hậu Giang",
    "hòa bình": "Hòa Bình",
    "hưng yên": "Hưng Yên",
    "khánh hòa": "Khánh Hòa",
    "kiên giang": "Kiên Giang",
    "kon tum": "Kon Tum",
    "lai châu": "Lai Châu",
    "lâm đồng": "Lâm Đồng",
    "lạng sơn": "Lạng Sơn",
    "lào cai": "Lào Cai",
    "long an": "Long An",
    "nam định": "Nam Định",
    "nghệ an": "Nghệ An",
    "ninh bình": "Ninh Bình",
    "ninh thuận": "Ninh Thuận",
    "phú thọ": "Phú Thọ",
    "phú yên": "Phú Yên",
    "quảng bình": "Quảng Bình",
    "quảng nam": "Quảng Nam",
    "quảng ngãi": "Quảng Ngãi",
    "quảng ninh": "Quảng Ninh",
    "quảng trị": "Quảng Trị",
    "sóc trăng": "Sóc Trăng",
    "sơn la": "Sơn La",
    "tây ninh": "Tây Ninh",
    "thái bình": "Thái Bình",
    "thái nguyên": "Thái Nguyên",
    "thanh hóa": "Thanh Hóa",
    "thừa thiên huế": "Thừa Thiên Huế",
    "tiền giang": "Tiền Giang",
    "trà vinh": "Trà Vinh",
    "tuyên quang": "Tuyên Quang",
    "vĩnh long": "Vĩnh Long",
    "vĩnh phúc": "Vĩnh Phúc",
    "yên bái": "Yên Bái",
  };
  // Tìm từ khóa địa điểm
  for (const [keyword, city] of Object.entries(locationKeywords)) {
    if (lowerMessage.includes(keyword)) {
      filters.city = city;
      break;
    }
  }
  // Tìm từ khóa "quanh", "gần", "trong khu vực"
  if (
    lowerMessage.includes("quanh") ||
    lowerMessage.includes("gần") ||
    lowerMessage.includes("trong khu vực") ||
    lowerMessage.includes("khu vực")
  ) {
    // Nếu có city thì dùng city, nếu không thì sẽ dùng user location
    // Logic này sẽ được xử lý ở phần gọi searchProducts
  }
  // Detect sort intent cho cheap/expensive/closest và các loại mới
  const sortConfig = detectSortIntent(messageText);
  if (sortConfig) {
    filters.sortConfig = sortConfig;
    filters.intent = sortConfig.type; // Set intent to sort type
  } else if (detectBestIntent(messageText)) {
    filters.intent = "best";
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
  return filters;
};

// Hàm mới: Sort products theo type (dùng cho previousProducts)
const sortProductsByType = (
  products,
  sortType,
  userLat = null,
  userLng = null,
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
    case "closest":
      if (userLat && userLng) {
        sortedProducts = sortedProducts
          .map((item) => {
            let estimatedDistance = null;
            if (item.City && item.District) {
              const { lat: itemLat, lng: itemLng } = getApproxCoords(
                item.City,
                item.District
              );
              if (itemLat !== null && itemLng !== null) {
                estimatedDistance = haversineDistance(
                  userLat,
                  userLng,
                  itemLat,
                  itemLng
                );
              }
            }
            return {
              ...item,
              estimatedDistance: Math.round(estimatedDistance * 10) / 10 || 999,
            };
          })
          .sort((a, b) => a.estimatedDistance - b.estimatedDistance);
      }
      break;
    case "most_rented":
      sortedProducts.sort((a, b) => (b.RentCount || 0) - (a.RentCount || 0));
      break;
    case "most_favorited":
      sortedProducts.sort(
        (a, b) => (b.FavoriteCount || 0) - (a.FavoriteCount || 0)
      );
      break;
    case "most_viewed":
      sortedProducts.sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0));
      break;
    default:
      // sắp xếp theo view count
      sortedProducts.sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0));
  }
  return sortedProducts.slice(0, limit);
};

// Hàm tìm kiếm sản phẩm với sort nâng cao
const searchProducts = async (filters = {}, userId = null) => {
  try {
    const {
      q = "",
      categoryId = null,
      minPrice = null,
      maxPrice = null,
      city = null,
      userLat = null,
      userLng = null,
      sortType = null, 
      limit = 10,
    } = filters;
    const query = { StatusId: 2, IsDeleted: false };
    if (q && q.trim()) {
      const searchTerm = q.trim();
      // Tạo regex để tìm kiếm (case-insensitive, escape special chars)
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Tìm kiếm chính xác trong Title (ưu tiên nhất)
      const exactTitleMatch = new RegExp(`^${escapedTerm}$`, "i");
      // Tách search term thành các từ và tìm từng từ trong title
      const words = searchTerm.split(/\s+/).filter((w) => w.length > 0);
      const wordRegexes = words.map((word) => {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(escapedWord, "i");
      });
      // Regex để tìm toàn bộ search term trong title (partial match)
      const partialTitleMatch = new RegExp(escapedTerm, "i");
      //định nghĩa regex dùng cho Tag/Category lookup và thêm tìm category/tag ---
      const regex = partialTitleMatch;
      const searchConditions = [
        { Title: exactTitleMatch }, // Ưu tiên tìm chính xác title trước
        { Title: partialTitleMatch }, // partial match trong title
        { ShortDescription: partialTitleMatch },
        { Description: partialTitleMatch },
      ];
      // Nếu có nhiều từ, thêm điều kiện tìm tất cả các từ trong title
      if (words.length > 1) {
        searchConditions.push({
          $and: words.map((word) => {
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return { Title: new RegExp(escapedWord, "i") };
          }),
        });
      }
      // Tìm category có tên khớp và thêm điều kiện
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
      // Tìm kiếm trong Tags: Tìm Tags có name match với search term
      try {
        const matchingTags = await Tags.find({
          $or: [{ name: regex }, { Name: regex }],
          isDeleted: false,
        })
          .select("_id")
          .lean();
        if (matchingTags.length > 0) {
          const tagIds = matchingTags.map((t) => t._id);
          // Tìm các ItemId có Tags này
          const itemTags = await ItemTag.find({
            TagId: { $in: tagIds },
            IsDeleted: false,
          })
            .select("ItemId")
            .lean();
          if (itemTags.length > 0) {
            const itemIdsFromTags = itemTags.map((it) => it.ItemId);
            // Thêm điều kiện tìm theo ItemId từ Tags
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
        $lte: parseFloat(maxPrice),
      };
    }
    if (city && city.trim()) {
      query.City = new RegExp(city.trim(), "i");
    }
    // Sắp xếp: ưu tiên Title match chính xác, sau đó mới đến ViewCount, FavoriteCount
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
          const fullPhraseBonus = title.includes(q.trim().toLowerCase())
            ? 2
            : 0;
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
        } else {
          items = items;
        }
      }
    }
    // Nếu có search term, ưu tiên sắp xếp theo độ khớp title
    if (q && q.trim()) {
      const searchTermLower = q.trim().toLowerCase();
      items = items.sort((a, b) => {
        const aTitleLower = (a.Title || "").toLowerCase();
        const bTitleLower = (b.Title || "").toLowerCase();
        // Ưu tiên title khớp chính xác
        if (aTitleLower === searchTermLower && bTitleLower !== searchTermLower)
          return -1;
        if (bTitleLower === searchTermLower && aTitleLower !== searchTermLower)
          return 1;
        // Ưu tiên title bắt đầu bằng search term
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
        // Sau đó mới sắp xếp theo ViewCount, FavoriteCount
        return (
          (b.ViewCount || 0) - (a.ViewCount || 0) ||
          (b.FavoriteCount || 0) - (a.FavoriteCount || 0) ||
          new Date(b.CreatedAt || 0) - new Date(a.CreatedAt || 0)
        );
      });
    } else {
      // Nếu không có search term, sắp xếp theo ViewCount, FavoriteCount
      items = items.sort(
        (a, b) =>
          (b.ViewCount || 0) - (a.ViewCount || 0) ||
          (b.FavoriteCount || 0) - (a.FavoriteCount || 0) ||
          new Date(b.CreatedAt || 0) - new Date(a.CreatedAt || 0)
      );
    }
    // Áp dụng sortType nếu có (mở rộng cho các loại mới)
    if (sortType) {
      if (sortType === "cheap") {
        items = items.sort((a, b) => (a.BasePrice || 0) - (b.BasePrice || 0));
      } else if (sortType === "expensive") {
        items = items.sort((a, b) => (b.BasePrice || 0) - (a.BasePrice || 0));
      } else if (sortType === "closest" && userLat && userLng) {
        // Tính distance cho tất cả items và sort
        items = items
          .map((item) => {
            let estimatedDistance = null;
            if (item.City && item.District) {
              const { lat: itemLat, lng: itemLng } = getApproxCoords(
                item.City,
                item.District
              );
              if (itemLat !== null && itemLng !== null) {
                estimatedDistance = haversineDistance(
                  userLat,
                  userLng,
                  itemLat,
                  itemLng
                );
              }
            }
            return {
              ...item,
              estimatedDistance: Math.round(estimatedDistance * 10) / 10 || 999,
            };
          })
          .sort((a, b) => a.estimatedDistance - b.estimatedDistance);
      } else if (sortType === "most_rented") {
        items = items.sort((a, b) => (b.RentCount || 0) - (a.RentCount || 0));
      } else if (sortType === "most_favorited") {
        items = items.sort(
          (a, b) => (b.FavoriteCount || 0) - (a.FavoriteCount || 0)
        );
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
        .limit(1)
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
    // Tính distance nếu có userLat/userLng
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
          FullAddress: `${item.Address || ""}, ${item.District || ""}, ${
            item.City || ""
          }`.trim(), 
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
        // Tính estimatedDistance nếu có userLat/userLng
        let estimatedDistance = null;
        if (userLat && userLng && item.City && item.District) {
          const { lat: itemLat, lng: itemLng } = getApproxCoords(
            item.City,
            item.District
          );
          // Chỉ tính distance nếu có coordinates hợp lệ
          if (itemLat !== null && itemLng !== null) {
            estimatedDistance = haversineDistance(
              parseFloat(userLat),
              parseFloat(userLng),
              itemLat,
              itemLng
            );
            baseItem.estimatedDistance =
              Math.round(estimatedDistance * 10) / 10; // Làm tròn 1 chữ số thập phân
          }
        }
        return baseItem;
      })
      .filter((x) => x.Category && x.AvailableQuantity > 0);
    // Sắp xếp theo distance nếu có (gần nhất trước), fallback sort gốc
    if (userLat && userLng) {
      itemsWithDetails.sort(
        (a, b) => (a.estimatedDistance || 999) - (b.estimatedDistance || 999)
      );
    } else {
      itemsWithDetails.sort((a, b) => (b.ViewCount || 0) - (a.ViewCount || 0));
    }
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
    // Thêm FullAddress và các info hữu ích
    const fullAddress = `${item.Address || ""}, ${item.District || ""}, ${
      item.City || ""
    }`.trim();
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

// Hàm đề xuất sản phẩm tối ưu
const recommendOptimalProducts = async (
  filters = {},
  previousProducts = [],
  userLocation = null
) => {
  try {
    let products =
      previousProducts.length > 0
        ? previousProducts
        : await searchProducts({
            ...filters,
            limit: 30,
            userLat: userLocation?.lat,
            userLng: userLocation?.lng,
          });
    if (products.length === 0) {
      return [];
    }
    // Sắp xếp theo điểm số tối ưu (tăng trọng số distance lên 50%, giá cả 20%, engagement 30%)
    const scoredProducts = products.map((product) => {
      let score = 0;
      let reasons = []; // Để giải thích lý do sau
      // Điểm dựa trên engagement (View + Favorite + Rent, 30%)
      const engagement =
        (product.ViewCount || 0) +
        (product.FavoriteCount || 0) +
        (product.RentCount || 0);
      score += engagement * 0.1; // 30% tổng, scale xuống
      if (engagement > 50)
        reasons.push("Phổ biến cao (nhiều lượt xem/thích/thuê)");
      // Điểm dựa trên giá cả (20%): ưu tiên giá thấp hơn (giả sử BasePrice thấp = tốt hơn)
      const normalizedPrice =
        Math.max(0, (10000 - (product.BasePrice || 0)) / 10000) * 20;
      score += normalizedPrice;
      if (product.BasePrice < 500000) reasons.push("Giá thuê hợp lý");
      // Điểm dựa trên số lượng còn lại (10%) - ưu tiên sản phẩm còn nhiều
      const availabilityRatio =
        (product.AvailableQuantity || 0) / (product.Quantity || 1);
      score += availabilityRatio * 10;
      if (product.AvailableQuantity > 5) reasons.push("Số lượng còn nhiều");
      // Điểm dựa trên khoảng cách (50%) - ưu tiên cao hơn, gần hơn = score cao hơn
      let distance = 999;
      let distanceReason = null;
      if (filters.userLat && filters.userLng) {
        const { lat: itemLat, lng: itemLng } = getApproxCoords(
          product.City,
          product.District
        );
        if (itemLat !== null && itemLng !== null) {
          distance = haversineDistance(
            parseFloat(filters.userLat),
            parseFloat(filters.userLng),
            itemLat,
            itemLng
          );
          const distanceScore =
            Math.max(0, (100 - Math.min(distance, 100)) / 100) * 50; // Ưu tiên trong 100km, scale 0-50
          score += distanceScore;
          distanceReason =
            distance <= 5
              ? "Rất gần bạn (dưới 5km)"
              : distance <= 20
              ? "Gần bạn (dưới 20km)"
              : distance <= 50
              ? "Khá gần bạn (dưới 50km)"
              : "Có thể giao hàng";
        } else {
          score += 25; // Default nếu không tính được distance chính xác
          distanceReason = "Vị trí khả dụng";
        }
      } else {
        // Nếu không có location, giảm trọng số distance xuống 0 và cảnh báo
        score += 0;
        reasons.push("Cần vị trí của bạn để ưu tiên khoảng cách");
      }
      if (distanceReason) reasons.push(distanceReason);
      // Điểm tình trạng 
      if (product.Condition && product.Condition.ConditionName === "Mới") {
        score += 5;
        reasons.push("Tình trạng tốt (mới)");
      }
      return {
        ...product,
        recommendationScore: score,
        estimatedDistance: distance,
        reasons: reasons, 
      };
    });
    // Sắp xếp theo điểm và trả về top 1
    const topProducts = scoredProducts
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 1)
      .map(({ recommendationScore, reasons, ...product }) => ({
        ...product,
        isBest: true,
        reasons,
      }));
    return topProducts;
  } catch (error) {
    console.error("Error in recommendOptimalProducts:", error);
    return [];
  }
};

module.exports = {
  searchProducts,
  getProductDetail,
  recommendOptimalProducts,
  getUserLocation,
  extractPreviousFilters,
  parseMessageToFilters,
  detectSortIntent,
  detectBestIntent,
  isSimpleSearch,
  haversineDistance,
  getApproxCoords,
  buildEnhancedContext,
  sortProductsByType, 
};
