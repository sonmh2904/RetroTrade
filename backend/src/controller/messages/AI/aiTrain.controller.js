const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Item = require("../../../models/Product/Item.model");
const ItemImages = require("../../../models/Product/ItemImage.model");
const ItemTag = require("../../../models/Product/ItemTag.model");
const Categories = require("../../../models/Product/Categories.model");
const ItemConditions = require("../../../models/Product/ItemConditions.model");
const PriceUnits = require("../../../models/Product/PriceUnits.model");
const Tags = require("../../../models/Tag.model");
const User = require("../../../models/User.model");
const { calculateTotals } = require("../../order/calculateRental");
const DiscountController = require("../../order/discount.controller");

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

// System prompt để train AI về dự án 
const getSystemPrompt = () => {
  return `Bạn là AI trợ lý thông minh của RetroTrade - một nền tảng cho thuê sản phẩm.

QUY TẮC NGHIÊM NGẶT - ĐỌC KỸ:
⚠️ TUYỆT ĐỐI KHÔNG TẠO DỮ LIỆU ẢO:
- BẠN CHỈ ĐƯỢC PHÉP sử dụng dữ liệu sản phẩm được cung cấp trong JSON từ hệ thống (PROVIDED_PRODUCTS)
- KHÔNG BAO GIỜ tự tạo, bịa đặt, hoặc hallucinate thông tin sản phẩm không có trong dữ liệu được cung cấp
- Nếu không có sản phẩm nào trong dữ liệu, bạn PHẢI nói rõ: "Hiện tại hệ thống chưa có sản phẩm phù hợp với yêu cầu của bạn"
- KHÔNG được liệt kê sản phẩm không có trong JSON được cung cấp
- KHÔNG được tạo tên sản phẩm, giá cả, địa chỉ, hoặc bất kỳ thông tin nào không có trong dữ liệu thực tế

NHIỆM VỤ CỦA BẠN:
1. Tư vấn sản phẩm cho người dùng dựa trên nhu cầu của họ - CHỈ sử dụng dữ liệu thực từ hệ thống
2. Tìm kiếm và liệt kê sản phẩm phù hợp - CHỈ liệt kê sản phẩm có trong JSON được cung cấp
3. Cung cấp thông tin chi tiết về sản phẩm - CHỈ từ dữ liệu được cung cấp
4. Đề xuất sản phẩm tối ưu nhất dựa trên tiêu chí: giá cả, đánh giá, khoảng cách, tình trạng - CHỈ từ dữ liệu thực
5. Nếu người dùng hỏi "sản phẩm nào tốt nhất", "gợi ý", "chọn giúp", hoặc tương tự: 
   - Kiểm tra xem có PROVIDED_PRODUCTS không. Nếu có, chọn 1 sản phẩm tốt nhất từ list đó (ưu tiên gần vị trí user nếu có estimatedDistance).
   - Nếu thiếu vị trí user, HỎI NGAY: "Bạn đang ở khu vực nào (thành phố/quận) để tôi gợi ý sản phẩm gần nhất?"
   - Giải thích lý do chọn (dựa trên data: e.g., "Gần bạn nhất chỉ 2km, giá tốt, đánh giá cao").
   - KHÔNG chọn nếu không có data; fallback: "Tôi cần thêm thông tin vị trí để gợi ý chính xác."

THÔNG TIN VỀ HỆ THỐNG:
- RetroTrade là nền tảng cho thuê sản phẩm (không phải mua bán) , kết nối người có nhu cầu thuê với người cho thuê 
- Chủ sở hữu có thể đăng các sản phẩm của mình để cho thuê , và người thuê có thể xem và thuê sản phẩm
- Sản phẩm trên hệ thống là của chủ sở hữu (người dùng trong hệ thống) chứ không phải của hệ thống
- Sản phẩm có các trạng thái: 1=pending, 2=approved (công khai), 3=rejected
- Chỉ hiển thị sản phẩm có StatusId=2 và IsDeleted=false
- Mỗi sản phẩm có: giá thuê (BasePrice), tiền cọc (DepositAmount), đơn vị giá (giờ/ngày/tuần/tháng)
- Sản phẩm có thể có: Category, Condition (tình trạng), Tags, Images, địa chỉ chi tiết (Address, District, City)
- Người dùng có thể thuê sản phẩm với thời gian bắt đầu và kết thúc
- Hỗ trợ tìm kiếm theo khoảng cách: Nếu user cung cấp vị trí (lat/lng hoặc từ profile), ưu tiên sản phẩm gần nhất (estimatedDistance trong km)

CÁCH XỬ LÝ DỮ LIỆU:
- Khi nhận được JSON chứa danh sách sản phẩm, bạn CHỈ được phép liệt kê các sản phẩm đó
- Mỗi sản phẩm trong JSON có các trường: _id, Title, BasePrice, FullAddress, Category, Condition, PriceUnit, Images, Tags, etc.
- Bạn PHẢI sử dụng chính xác các giá trị từ JSON, không được thay đổi hoặc tạo mới
- Nếu JSON rỗng hoặc không có sản phẩm nào, bạn PHẢI thông báo: "Hiện tại hệ thống chưa có sản phẩm phù hợp. Bạn có thể thử tìm kiếm với từ khóa khác hoặc mở rộng tiêu chí tìm kiếm."

CÁCH TRẢ LỜI:
- Luôn thân thiện, nhiệt tình và chuyên nghiệp
- Khi người dùng hỏi về sản phẩm, CHỈ liệt kê sản phẩm có trong JSON được cung cấp
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
- ⚠️ TUYỆT ĐỐI KHÔNG hallucinate - chỉ sử dụng dữ liệu từ JSON được cung cấp
- ⚠️ Nếu JSON rỗng hoặc không có sản phẩm, PHẢI nói rõ không tìm thấy
- ⚠️ KHÔNG được tạo tên sản phẩm, giá, địa chỉ, hoặc bất kỳ thông tin nào không có trong JSON
- Luôn kiểm tra AvailableQuantity > 0 trước khi đề xuất
- Kiểm tra thời gian thuê hợp lệ (endAt > startAt)
- Yêu cầu địa chỉ giao hàng đầy đủ trước khi tạo đơn
- Nếu thiếu thông tin vị trí user, hỏi thêm (e.g., "Bạn đang ở khu vực nào?")
- Nếu thiếu thông tin, hãy hỏi người dùng một cách thân thiện`;
};

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

const getUserLocationFromContext = (context) => {
  for (let i = context.length - 1; i >= 0; i--) {
    const msg = context[i];
    if (msg.role === "user" && msg.content) {
      const locationMatch = msg.content.match(
        /(hà nội|tp\.hcm|sài gòn|đà nẵng|quận \d+|huyện \w+)/i
      );
      if (locationMatch) {
        return { city: locationMatch[1], lat: null, lng: null }; 
      }
    }
  }
  return null;
};

// Helper mới: Xây dựng context nâng cao với list sản phẩm từ trước
const buildEnhancedContext = (context, previousProducts = []) => {
  // Thêm info về list sản phẩm vào context cuối (cho AI biết có data sẵn)
  const lastMsg = context[context.length - 1];
  if (previousProducts.length > 0) {
    lastMsg.additionalData = { availableProducts: previousProducts };
  }
  return context;
};

// Hàm tìm kiếm sản phẩm
const searchProducts = async (filters = {}) => {
  try {
    const {
      q = "",
      categoryId = null,
      minPrice = null,
      maxPrice = null,
      city = null,
      userLat = null, 
      userLng = null,
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

    // Tính distance nếu có user location
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
          }`.trim(), // Thêm full address
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

// Hàm lấy chi tiết sản phẩm (cập nhật: thêm FullAddress và các info hữu ích khác)
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
    ).toFixed(0); // Điểm phổ biến

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
      FullAddress: fullAddress, // Thêm full address
      IsAvailableNow: isAvailableNow, // Thêm availability flag
      PopularityScore: popularityScore, // Thêm score hữu ích
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
  previousProducts = []
) => {
  try {
    let products =
      previousProducts.length > 0
        ? previousProducts
        : await searchProducts({ ...filters, limit: 30 });

    if (products.length === 0) {
      return [];
    }

    // Sắp xếp theo điểm số tối ưu (thêm trọng số distance cao hơn nếu có user location)
    const scoredProducts = products.map((product) => {
      let score = 0;

      // Điểm dựa trên lượt xem (15%)
      score += (product.ViewCount || 0) * 0.15;

      // Điểm dựa trên lượt yêu thích (15%)
      score += (product.FavoriteCount || 0) * 15;

      // Điểm dựa trên lượt thuê (15%)
      score += (product.RentCount || 0) * 15;

      // Điểm dựa trên số lượng còn lại (15%) - ưu tiên sản phẩm còn nhiều
      const availabilityRatio =
        (product.AvailableQuantity || 0) / (product.Quantity || 1);
      score += availabilityRatio * 15;

      // Điểm dựa trên khoảng cách (40%) - ưu tiên cao hơn, gần hơn = score cao hơn
      let distance = 999;
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
        }
        const distanceScore =
          Math.max(0, (50 - Math.min(distance, 50)) / 50) * 40; // Ưu tiên trong 50km
        score += distanceScore;
      } else {
        // Nếu không có location, giảm trọng số distance
        score += 20; // Default score nếu không ưu tiên distance
      }

      return {
        ...product,
        recommendationScore: score,
        estimatedDistance: distance,
      };
    });

    // Sắp xếp theo điểm và trả về top 1 (cho "best")
    return scoredProducts
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 1)
      .map(({ recommendationScore, ...product }) => ({
        ...product,
        isBest: true,
      }));
  } catch (error) {
    console.error("Error in recommendOptimalProducts:", error);
    return [];
  }
};

// Hàm detect xem message có phải là simple search (query trực tiếp) hay complex question (cần AI)
const isSimpleSearch = (messageText) => {
  const lowerMessage = messageText.toLowerCase();

  // Từ khóa chỉ định câu hỏi phức tạp (cần AI)
  const complexQuestionKeywords = [
    "so sánh",
    "compare",
    "khác nhau",
    "giống nhau",
    "tư vấn",
    "advice",
    "nên",
    "nên chọn",
    "nên mua",
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
    // Nếu có dấu hỏi nhưng là câu hỏi đơn giản (có không, ở đâu, giá bao nhiêu)
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
    intent: "search", // search, recommend, best
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

  // Detect intent
  if (detectBestIntent(messageText)) {
    filters.intent = "best";
  } else if (
    lowerMessage.includes("tốt nhất") ||
    lowerMessage.includes("tối ưu") ||
    lowerMessage.includes("đề xuất") ||
    lowerMessage.includes("recommend")
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

// Hàm gửi message với AI đã được train
const sendTrainedMessage = async (
  context,
  userId,
  userMessage,
  userLocation = null
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
    const isSimple = isSimpleSearch(messageText); // Giả sử hàm này đã có từ code cũ

    // Lấy previous products từ context (từ tin nhắn AI trước)
    let previousProducts = [];
    for (let i = context.length - 1; i >= 0; i--) {
      if (context[i].role === "model" && context[i].products) {
        previousProducts = context[i].products;
        break;
      }
    }
    const buildSearchQuery = () => {
      if (parsedFilters.productType && parsedFilters.productType.length > 1)
        return parsedFilters.productType;
      // strip noisy words but keep product identifiers
      const cleaned = messageText
        .replace(
          /tìm|search|sản phẩm|product|cho tôi|giúp tôi|gần tôi|khu vực gần|muốn|cần|tìm kiếm|bạn có|hệ thống có|giá|từ|đến|dưới|trên|quanh|gần|trong khu vực/gi,
          ""
        )
        .trim();
      return cleaned.length > 0 ? cleaned : messageText.trim();
    };

    // Always perform DB search first when query likely about products
    let shouldSearchDb = false;
    if (
      parsedFilters.productType ||
      parsedFilters.intent === "search" ||
      isSimple ||
      /\b(có|tìm|máy ảnh|điện thoại|camera|cho thuê|thuê)\b/i.test(lowerMessage)
    ) {
      shouldSearchDb = true;
    }

    let products = [];
    if (shouldSearchDb) {
      const q = buildSearchQuery();
      const searchFilters = {
        q: q || messageText.trim(),
        limit: 30,
      };
      if (parsedFilters.minPrice !== null)
        searchFilters.minPrice = parsedFilters.minPrice;
      if (parsedFilters.maxPrice !== null)
        searchFilters.maxPrice = parsedFilters.maxPrice;
      if (parsedFilters.city) searchFilters.city = parsedFilters.city;
      if (userLocation && userLocation.lat && userLocation.lng) {
        searchFilters.userLat = userLocation.lat;
        searchFilters.userLng = userLocation.lng;
      }
      products = await searchProducts(searchFilters);
    }

    // Xử lý intent "best": Kiểm tra vị trí, hỏi nếu thiếu, rồi recommend
    if (parsedFilters.intent === "best" && previousProducts.length > 0) {
      let location = userLocation || getUserLocationFromContext(context);
      if (!location || !location.lat || !location.lng) {
        // Hỏi thêm vị trí
        return {
          content:
            "Để gợi ý sản phẩm tốt nhất, bạn có thể cho tôi biết bạn đang ở khu vực nào (ví dụ: Quận 1, TP.HCM) không? Tôi sẽ ưu tiên sản phẩm gần bạn nhất!",
          suggestions: [],
          products: previousProducts, // Giữ list cũ
          needLocation: true, // Flag để frontend biết hỏi tiếp
          searchPerformed: false,
          searchResultsCount: previousProducts.length,
        };
      }

      // Tính best product với location
      const bestProducts = await recommendOptimalProducts(
        { ...parsedFilters, userLat: location.lat, userLng: location.lng },
        previousProducts
      );

      if (bestProducts.length > 0) {
        const bestProduct = bestProducts[0];
        return {
          content: `Dựa trên danh sách sản phẩm trước, tôi gợi ý **${
            bestProduct.Title
          }** là lựa chọn tốt nhất cho bạn!\n\nLý do: Giá ${bestProduct.BasePrice.toLocaleString()}đ/${
            bestProduct.PriceUnit?.UnitName
          }, còn ${
            bestProduct.AvailableQuantity
          } cái, cách bạn ${bestProduct.estimatedDistance?.toFixed(
            1
          )}km, đánh giá cao (${
            bestProduct.RentCount
          } lượt thuê).\n\nBạn muốn thuê ngay không?`,
          suggestions: [bestProduct],
          bestProduct: bestProduct,
          products: previousProducts,
          searchPerformed: true,
          searchResultsCount: 1,
        };
      } else {
        return {
          content:
            "Tôi không tìm thấy sản phẩm phù hợp nhất từ danh sách. Bạn có thể cung cấp thêm chi tiết (giá, loại) không?",
          suggestions: [],
          products: previousProducts,
          searchPerformed: false,
        };
      }
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
        estimatedDistance: p.estimatedDistance || null,
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
      };
    }

    // For complex/question intents: call Gemini BUT provide strict JSON & low temperature
    // Prepare providedProducts (serialize only necessary fields)
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
      estimatedDistance: p.estimatedDistance || null,
    }));

    // Build a short strict instruction chunk to append to system prompt
    const providedJson = JSON.stringify(providedProducts);
    const strictInstruction = `
IMPORTANT: ONLY use the JSON list named "PROVIDED_PRODUCTS" below as the source of truth for product data.
- DO NOT invent or hallucinate any product, price, address, quantity, or other details.
- IF you need to recommend or compare, use only data from PROVIDED_PRODUCTS.
- IF PROVIDED_PRODUCTS is empty, respond: "Hiện tại hệ thống chưa có sản phẩm phù hợp với yêu cầu của bạn."
- For "best product" queries: Select ONLY ONE from PROVIDED_PRODUCTS, explain based on estimatedDistance (nearer = better), price, availability.
- If location missing: Ask "Bạn đang ở khu vực nào để tôi gợi ý sản phẩm gần nhất?"
PROVIDED_PRODUCTS = ${providedJson}
End of PROVIDED_PRODUCTS.
`;

    const finalSystemPrompt = `${systemPrompt}\n\n${strictInstruction}`;

    // Build history for Gemini (keep minimal, last 6 messages) - enhanced với previous products
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

    // Call Gemini with low temperature to reduce hallucination
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Sử dụng 1.5 để ổn định
      systemInstruction: finalSystemPrompt,
    });

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.0,
        topK: 1,
        topP: 1,
        maxOutputTokens: 1024,
      },
    });

    // Build user query message: include user question and explicit remind to use PROVIDED_PRODUCTS only
    const userPrompt = `${messageText}\n\nPlease answer using only PROVIDED_PRODUCTS. If asked for product details, use the fields from PROVIDED_PRODUCTS. If you cannot answer with the given data, say you cannot find it.`;

    const result = await chat.sendMessage(userPrompt);
    const response = await result.response;
    let content = response.text().trim();

    // Try to extract machine-readable suggestions JSON from Gemini response
    let suggestions = [];
    try {
      const jsonMatch = content.match(/({[\s\S]*}|\[[\s\S]*\])/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // If parsed is object with suggestions/products field, extract
        if (Array.isArray(parsed)) {
          suggestions = parsed;
        } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions;
        } else if (parsed.products && Array.isArray(parsed.products)) {
          suggestions = parsed.products;
        }
      }
    } catch (err) {
      // ignore parse errors - we'll fallback to DB products
    }

    // Validate suggestions: only keep items whose _id exists in providedProducts
    if (suggestions.length > 0 && providedProducts.length > 0) {
      const allowedIds = new Set(providedProducts.map((p) => String(p._id)));
      suggestions = suggestions.filter((s) => {
        const sid = s._id || s.itemId || s.id || s.itemId;
        return sid && allowedIds.has(String(sid));
      });
    } else {
      suggestions = [];
    }

    // If Gemini returned no valid suggestions, fallback to using providedProducts as suggestions
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
        content = `Tôi tìm thấy ${providedProducts.length} sản phẩm phù hợp. Dưới đây là danh sách (chỉ sử dụng dữ liệu hệ thống).`;
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
      userLocation,
      searchPerformed: shouldSearchDb,
      searchResultsCount: products.length,
    };
  } catch (error) {
    console.error("Error in sendTrainedMessage:", error);
    throw error;
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
  searchProducts,
  getProductDetail,
  recommendOptimalProducts,
  trainAI,
  getSystemPrompt,
  haversineDistance,
};
