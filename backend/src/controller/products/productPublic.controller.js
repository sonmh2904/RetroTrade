const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const Item = require("../../models/Product/Item.model");
const ItemImages = require("../../models/Product/ItemImage.model");
const ItemTag = require("../../models/Product/ItemTag.model");
const AuditLog = require("../../models/AuditLog.model");
const Categories = require("../../models/Product/Categories.model");
const ItemConditions = require("../../models/Product/ItemConditions.model");
const PriceUnits = require("../../models/Product/PriceUnits.model");
const User = require("../../models/User.model");
const Tags = require("../../models/Tag.model");
const Rating = require("../../models/Order/Rating.model");


const viewThrottle = new Map();
const VIEW_WINDOW_MS = 30 * 1000; // 30 seconds
function shouldIncrementView(itemId, req) {
  try {
    const ip = (req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "").toString();
    const ua = (req.headers["user-agent"] || "").toString();
    const key = `${itemId}|${ip}|${ua}`;
    const now = Date.now();
    const last = viewThrottle.get(key) || 0;
    if (now - last >= VIEW_WINDOW_MS) {
      viewThrottle.set(key, now);
      return true;
    }
    return false;
  } catch {
    return true; // fail-open to avoid blocking counts if something goes wrong
  }
}

//list all product
const listAllItems = async (req, res) => {
  let success = false;
  try {
    const items = await Item.find({ StatusId: 2, IsDeleted: false })
      .sort({ CreatedAt: -1 })
      .lean();

    if (!items || items.length === 0) {
      success = true;
      return res.status(200).json({
        success: true,
        message: "Không có sản phẩm công khai nào",
        data: {
          items: [],
          total: 0,
        },
      });
    }

    const itemIds = items.map((item) => item._id);

    const allImages = await ItemImages.find({
      ItemId: { $in: itemIds },
      IsDeleted: false,
    })
      .sort({ Ordinal: 1 })
      .lean();

    const allItemTags = await ItemTag.find({
      ItemId: { $in: itemIds },
      IsDeleted: false,
    }).lean();
    const tagIds = allItemTags.map((tag) => tag.TagId);
    const allTags = await Tags.find({
      _id: { $in: tagIds },
      isDeleted: false,
    }).lean();

    const categoryIds = [...new Set(items.map((item) => item.CategoryId))];
    const categories = await Categories.find({
      _id: { $in: categoryIds },
      isActive: true,
    }).lean();

    const allConditions = await ItemConditions.find({
      IsDeleted: false,
    }).lean();
    const allPriceUnits = await PriceUnits.find({ IsDeleted: false }).lean();

    const ownerIds = [...new Set(items.map((item) => item.OwnerId))];
    const owners = await User.find({
      _id: { $in: ownerIds },
    })
      .select("FullName DisplayName AvatarUrl")
      .lean();

    const ownerMap = {};
    owners.forEach((owner) => {
      ownerMap[owner._id.toString()] = owner;
    });

    const imagesMap = {};
    allImages.forEach((img) => {
      if (!imagesMap[img.ItemId.toString()]) {
        imagesMap[img.ItemId.toString()] = [];
      }
      imagesMap[img.ItemId.toString()].push(img);
    });

    const tagsMap = {};
    const tagMapById = {};
    allTags.forEach((tag) => {
      tagMapById[tag._id.toString()] = tag;
    });
    allItemTags.forEach((itemTag) => {
      if (!tagsMap[itemTag.ItemId.toString()]) {
        tagsMap[itemTag.ItemId.toString()] = [];
      }
      const fullTag = {
        ...itemTag,
        Tag: tagMapById[itemTag.TagId.toString()],
      };
      tagsMap[itemTag.ItemId.toString()].push(fullTag);
    });

    const categoryMap = {};
    categories.forEach((cat) => {
      categoryMap[cat._id.toString()] = cat;
    });

    const itemsWithDetails = items
      .map((item) => ({
        ...item,
        Category: categoryMap[item.CategoryId.toString()],
        Condition: allConditions.find(
          (c) => c.ConditionId === item.ConditionId
        ),
        PriceUnit: allPriceUnits.find((p) => p.UnitId === item.PriceUnitId),
        Owner: ownerMap[item.OwnerId.toString()],
        Images: imagesMap[item._id.toString()] || [],
        Tags: tagsMap[item._id.toString()] || [],
      }))
      .filter((item) => item.Category);

    success = true;

    res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm công khai thành công",
      data: {
        items: itemsWithDetails,
        total: itemsWithDetails.length,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách sản phẩm công khai:", error);
    if (!success) {
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi server khi lấy danh sách sản phẩm công khai",
      });
    }
    res.status(200).json({
      success: true,
      message:
        "Lấy danh sách sản phẩm một phần thành công, một số phụ kiện có vấn đề nhỏ.",
      data: { items: [] },
    });
  }
};

// Get public products by CategoryId (e.g., cùng máy ảnh/cùng điện thoại)
const getProductsByCategoryId = async (req, res) => {
  let success = false;
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: "categoryId không hợp lệ" });
    }

    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.max(Math.min(parseInt(limit) || 20, 100), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const baseQuery = {
      StatusId: 2,
      IsDeleted: false,
      CategoryId: new mongoose.Types.ObjectId(categoryId),
    };

    const [total, items] = await Promise.all([
      Item.countDocuments(baseQuery),
      Item.find(baseQuery).sort({ CreatedAt: -1 }).skip(skip).limit(parsedLimit).lean(),
    ]);

    if (!items || items.length === 0) {
      success = true;
      return res.status(200).json({
        success: true,
        message: "Không có sản phẩm thuộc danh mục này",
        data: { items: [], total, page: parsedPage, limit: parsedLimit },
      });
    }

    const itemIds = items.map((i) => i._id);
    const [allImages, allItemTags, allConditions, allPriceUnits, categories, owners] = await Promise.all([
      ItemImages.find({ ItemId: { $in: itemIds }, IsDeleted: false }).sort({ Ordinal: 1 }).lean(),
      ItemTag.find({ ItemId: { $in: itemIds }, IsDeleted: false }).lean(),
      ItemConditions.find({ IsDeleted: false }).lean(),
      PriceUnits.find({ IsDeleted: false }).lean(),
      Categories.find({ _id: { $in: [...new Set(items.map((i) => i.CategoryId))] }, isActive: true }).lean(),
      User.find({ _id: { $in: [...new Set(items.map((i) => i.OwnerId))] } }).select("FullName DisplayName AvatarUrl").lean(),
    ]);

    const imagesMap = {};
    allImages.forEach((img) => {
      const k = img.ItemId.toString();
      if (!imagesMap[k]) imagesMap[k] = [];
      imagesMap[k].push(img);
    });

    const tagIdsAll = allItemTags.map((t) => t.TagId);
    const allTags = tagIdsAll.length
      ? await Tags.find({ _id: { $in: tagIdsAll }, isDeleted: false }).lean()
      : [];
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
      .map((item) => ({
        ...item,
        Category: categoryMap[item.CategoryId?.toString()] || null,
        Condition: allConditions.find((c) => c.ConditionId === item.ConditionId) || null,
        PriceUnit: allPriceUnits.find((p) => p.UnitId === item.PriceUnitId) || null,
        Owner: ownerMap[item.OwnerId?.toString()] || null,
        Images: imagesMap[item._id.toString()] || [],
        Tags: tagsMap[item._id.toString()] || [],
      }))
      .filter((x) => x.Category);

    success = true;
    return res.status(200).json({
      success: true,
      message: "Lấy sản phẩm theo danh mục thành công",
      data: { items: itemsWithDetails, total, page: parsedPage, limit: parsedLimit },
    });
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm theo danh mục:", error);
    if (!success) {
      return res.status(500).json({ success: false, message: error.message || "Lỗi server khi lấy sản phẩm theo danh mục" });
    }
    return res.status(200).json({ success: true, message: "Trả về rỗng", data: { items: [], total: 0 } });
  }
};

// Get public store by owner's userGuid
const getPublicStoreByUserGuid = async (req, res) => {
  let success = false;
  try {
    const { userGuid } = req.params;
    const { page = 1, limit = 20 } = req.query;
    if (!userGuid || typeof userGuid !== "string") {
      return res.status(400).json({ success: false, message: "userGuid không hợp lệ" });
    }

    const owner = await User.findOne({ userGuid, isDeleted: false })
      .select("userGuid email fullName displayName avatarUrl role reputationScore createdAt")
      .lean();
    if (!owner || !owner._id) {
      return res.status(404).json({ success: false, message: "Không tìm thấy chủ sở hữu" });
    }

    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.max(Math.min(parseInt(limit) || 20, 100), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = { StatusId: 2, IsDeleted: false, OwnerId: owner._id };
    const [total, items] = await Promise.all([
      Item.countDocuments(query),
      Item.find(query).sort({ CreatedAt: -1 }).skip(skip).limit(parsedLimit).lean(),
    ]);

    if (!items || items.length === 0) {
      success = true;
      return res.status(200).json({
        success: true,
        message: "Chủ shop chưa có sản phẩm công khai",
        data: { owner, items: [], total, page: parsedPage, limit: parsedLimit },
      });
    }

    const itemIds = items.map((i) => i._id);
    const [allImages, allItemTags, allConditions, allPriceUnits, categories] = await Promise.all([
      ItemImages.find({ ItemId: { $in: itemIds }, IsDeleted: false }).sort({ Ordinal: 1 }).lean(),
      ItemTag.find({ ItemId: { $in: itemIds }, IsDeleted: false }).lean(),
      ItemConditions.find({ IsDeleted: false }).lean(),
      PriceUnits.find({ IsDeleted: false }).lean(),
      Categories.find({ _id: { $in: [...new Set(items.map((i) => i.CategoryId))] }, isActive: true }).lean(),
    ]);

    const imagesMap = {};
    allImages.forEach((img) => {
      const k = img.ItemId.toString();
      if (!imagesMap[k]) imagesMap[k] = [];
      imagesMap[k].push(img);
    });

    const tagIdsAll = allItemTags.map((t) => t.TagId);
    const allTags = tagIdsAll.length
      ? await Tags.find({ _id: { $in: tagIdsAll }, isDeleted: false }).lean()
      : [];
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

    const itemsWithDetails = items
      .map((item) => ({
        ...item,
        Category: categoryMap[item.CategoryId?.toString()] || null,
        Condition: allConditions.find((c) => c.ConditionId === item.ConditionId) || null,
        PriceUnit: allPriceUnits.find((p) => p.UnitId === item.PriceUnitId) || null,
        Owner: {
          _id: owner._id,
          FullName: owner.fullName || owner.FullName,
          DisplayName: owner.displayName || owner.DisplayName,
          AvatarUrl: owner.avatarUrl || owner.AvatarUrl,
          userGuid: owner.userGuid,
        },
        Images: imagesMap[item._id.toString()] || [],
        Tags: tagsMap[item._id.toString()] || [],
      }))
      .filter((x) => x.Category);

    success = true;
    return res.status(200).json({
      success: true,
      message: "Lấy cửa hàng công khai theo userGuid thành công",
      data: { owner, items: itemsWithDetails, total, page: parsedPage, limit: parsedLimit },
    });
  } catch (error) {
    console.error("Lỗi khi lấy cửa hàng theo userGuid:", error);
    if (!success) {
      return res.status(500).json({ success: false, message: error.message || "Lỗi server khi lấy cửa hàng theo userGuid" });
    }
    return res.status(200).json({ success: true, message: "Trả về rỗng", data: { owner: null, items: [], total: 0 } });
  }
};

//get product (Item) by itemId (use for product detail page)
const getProductByProductId = async (req, res) => {
  const { id: itemId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: "itemId không hợp lệ",
      });
    }

    const item = await Item.findOne({
      _id: itemId,
      StatusId: 2,
      IsDeleted: false,
    })
      .populate({ 
        path: "OwnerId", 
        model: User, 
        select: "FullName DisplayName AvatarUrl fullName displayName avatarUrl userGuid" 
      })
      .lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm công khai",
      });
    }

    // increase view count with 30s throttle per client
    const allowInc = shouldIncrementView(item._id.toString(), req);
    if (allowInc) {
      await Item.updateOne({ _id: item._id }, { $inc: { ViewCount: 1 } });
    }

    const [images, itemTags, category, condition, priceUnit] = await Promise.all([
      ItemImages.find({ ItemId: item._id, IsDeleted: false }).sort({ Ordinal: 1 }).lean(),
      ItemTag.find({ ItemId: item._id, IsDeleted: false }).lean(),
      Categories.findOne({ _id: item.CategoryId, isActive: true }).lean(),
      ItemConditions.findOne({ ConditionId: item.ConditionId, IsDeleted: false }).lean(),
      PriceUnits.findOne({ UnitId: item.PriceUnitId, IsDeleted: false }).lean(),
    ]);

    const tagIds = itemTags.map((t) => t.TagId);
    const tags = tagIds.length
      ? await Tags.find({ _id: { $in: tagIds }, isDeleted: false }).lean()
      : [];
    const tagMap = {};
    tags.forEach((t) => (tagMap[t._id.toString()] = t));
    const tagsFull = itemTags.map((it) => ({ ...it, Tag: tagMap[it.TagId?.toString()] }));

    // owner info (from populate if available)
    const ownerPop = item && item.OwnerId && typeof item.OwnerId === "object" && item.OwnerId._id
      ? item.OwnerId
      : null;

    const itemWithDetails = {
      ...item,
      ViewCount: (item.ViewCount || 0) + (allowInc ? 1 : 0),
      Category: category || null,
      Condition: condition || null,
      PriceUnit: priceUnit || null,
      Owner: ownerPop
        ? {
            _id: ownerPop._id,
            userGuid: ownerPop.userGuid,
            FullName: ownerPop.FullName || ownerPop.fullName,
            DisplayName: ownerPop.DisplayName || ownerPop.displayName,
            AvatarUrl: ownerPop.AvatarUrl || ownerPop.avatarUrl,
          }
        : item.OwnerId
        ? { _id: item.OwnerId }
        : null,
      Images: images || [],
      Tags: tagsFull || [],
    };

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết sản phẩm thành công",
      data: itemWithDetails,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết sản phẩm:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi lấy chi tiết sản phẩm",
    });
  }
};

const searchProduct = async (req, res) => {
  let success = false;
  try {
    const {
      q,
      categoryId,
      minPrice,
      maxPrice,
      conditionIds,
      city,
      tagIds,
      sortBy = "CreatedAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.max(Math.min(parseInt(limit) || 20, 100), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = { StatusId: 2, IsDeleted: false };

    if (q && typeof q === "string" && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      query.$or = [{ Title: regex }, { ShortDescription: regex }];
    }

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      query.CategoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const priceFilters = {};
    if (minPrice !== undefined && minPrice !== null && !isNaN(minPrice)) {
      priceFilters.$gte = parseFloat(minPrice);
    }
    if (maxPrice !== undefined && maxPrice !== null && !isNaN(maxPrice)) {
      priceFilters.$lte = parseFloat(maxPrice);
    }
    if (Object.keys(priceFilters).length > 0) {
      query.BasePrice = priceFilters;
    }

    if (conditionIds) {
      let condArr = [];
      if (Array.isArray(conditionIds)) condArr = conditionIds;
      else if (typeof conditionIds === "string") condArr = conditionIds.split(",");
      condArr = condArr
        .map((c) => parseInt(c))
        .filter((n) => !isNaN(n));
      if (condArr.length > 0) {
        query.ConditionId = { $in: condArr };
      }
    }

    if (city && typeof city === "string" && city.trim()) {
      query.City = new RegExp(city.trim(), "i");
    }

    let filteredItemIds = null;
    if (tagIds) {
      let tagArr = [];
      if (Array.isArray(tagIds)) tagArr = tagIds;
      else if (typeof tagIds === "string") tagArr = tagIds.split(",");
      tagArr = tagArr.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (tagArr.length > 0) {
        const itemTagDocs = await ItemTag.find({
          TagId: { $in: tagArr },
          IsDeleted: false,
        }).lean();
        const ids = [...new Set(itemTagDocs.map((d) => d.ItemId.toString()))];
        filteredItemIds = ids.map((s) => new mongoose.Types.ObjectId(s));
        if (filteredItemIds.length === 0) {
          return res.status(200).json({
            success: true,
            message: "Không có sản phẩm phù hợp",
            data: { items: [], total: 0, page: parsedPage, limit: parsedLimit },
          });
        }
        query._id = { $in: filteredItemIds };
      }
    }

    const sortMap = {
      CreatedAt: "CreatedAt",
      ViewCount: "ViewCount",
      FavoriteCount: "FavoriteCount",
      RentCount: "RentCount",
      BasePrice: "BasePrice",
    };
    const sortField = sortMap[sortBy] || "CreatedAt";
    const sortOrder = order === "asc" ? 1 : -1;

    const [total, items] = await Promise.all([
      Item.countDocuments(query),
      Item.find(query).sort({ [sortField]: sortOrder }).skip(skip).limit(parsedLimit).lean(),
    ]);

    if (!items || items.length === 0) {
      success = true;
      return res.status(200).json({
        success: true,
        message: "Không có sản phẩm phù hợp",
        data: { items: [], total, page: parsedPage, limit: parsedLimit },
      });
    }

    const itemIds = items.map((i) => i._id);
    const [allImages, allItemTags, allConditions, allPriceUnits, owners] = await Promise.all([
      ItemImages.find({ ItemId: { $in: itemIds }, IsDeleted: false }).sort({ Ordinal: 1 }).lean(),
      ItemTag.find({ ItemId: { $in: itemIds }, IsDeleted: false }).lean(),
      ItemConditions.find({ IsDeleted: false }).lean(),
      PriceUnits.find({ IsDeleted: false }).lean(),
      User.find({ _id: { $in: [...new Set(items.map((i) => i.OwnerId))] } }).select("FullName DisplayName AvatarUrl").lean(),
    ]);

    const tagIdsAll = allItemTags.map((t) => t.TagId);
    const allTags = tagIdsAll.length
      ? await Tags.find({ _id: { $in: tagIdsAll }, isDeleted: false }).lean()
      : [];

    const categories = await Categories.find({
      _id: { $in: [...new Set(items.map((i) => i.CategoryId))] },
      isActive: true,
    }).lean();

    const ownerMap = {};
    owners.forEach((o) => (ownerMap[o._id.toString()] = o));

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

    const itemsWithDetails = items
      .map((item) => ({
        ...item,
        Category: categoryMap[item.CategoryId?.toString()],
        Condition: allConditions.find((c) => c.ConditionId === item.ConditionId) || null,
        PriceUnit: allPriceUnits.find((p) => p.UnitId === item.PriceUnitId) || null,
        Owner: ownerMap[item.OwnerId?.toString()] || null,
        Images: imagesMap[item._id.toString()] || [],
        Tags: tagsMap[item._id.toString()] || [],
      }))
      .filter((x) => x.Category);

    success = true;
    return res.status(200).json({
      success: true,
      message: "Tìm kiếm sản phẩm thành công",
      data: { items: itemsWithDetails, total, page: parsedPage, limit: parsedLimit },
    });
  } catch (error) {
    console.error("Lỗi tìm kiếm sản phẩm:", error);
    if (!success) {
      return res.status(500).json({ success: false, message: error.message || "Lỗi server khi tìm kiếm sản phẩm" });
    }
    return res.status(200).json({ success: true, message: "Tìm kiếm một phần thành công", data: { items: [], total: 0 } });
  }
};

const viewFeatureProduct = async (req, res) => {
  let success = false;
  try {
    const { page = 1, limit = 20 } = req.query;
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.max(Math.min(parseInt(limit) || 20, 100), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = { StatusId: 2, IsDeleted: false, IsTrending: true };

    const [total, items] = await Promise.all([
      Item.countDocuments(query),
      Item.find(query).sort({ CreatedAt: -1 }).skip(skip).limit(parsedLimit).lean(),
    ]);

    if (!items || items.length === 0) {
      success = true;
      return res.status(200).json({
        success: true,
        message: "Không có sản phẩm nổi bật",
        data: { items: [], total, page: parsedPage, limit: parsedLimit },
      });
    }

    const itemIds = items.map((i) => i._id);
    const [allImages, allItemTags, allConditions, allPriceUnits, owners] = await Promise.all([
      ItemImages.find({ ItemId: { $in: itemIds }, IsDeleted: false }).sort({ Ordinal: 1 }).lean(),
      ItemTag.find({ ItemId: { $in: itemIds }, IsDeleted: false }).lean(),
      ItemConditions.find({ IsDeleted: false }).lean(),
      PriceUnits.find({ IsDeleted: false }).lean(),
      User.find({ _id: { $in: [...new Set(items.map((i) => i.OwnerId))] } }).select("FullName DisplayName AvatarUrl").lean(),
    ]);

    const tagIdsAll = allItemTags.map((t) => t.TagId);
    const allTags = tagIdsAll.length
      ? await Tags.find({ _id: { $in: tagIdsAll }, isDeleted: false }).lean()
      : [];

    const categories = await Categories.find({
      _id: { $in: [...new Set(items.map((i) => i.CategoryId))] },
      isActive: true,
    }).lean();

    const ownerMap = {};
    owners.forEach((o) => (ownerMap[o._id.toString()] = o));

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

    const itemsWithDetails = items
      .map((item) => ({
        ...item,
        Category: categoryMap[item.CategoryId?.toString()],
        Condition: allConditions.find((c) => c.ConditionId === item.ConditionId) || null,
        PriceUnit: allPriceUnits.find((p) => p.UnitId === item.PriceUnitId) || null,
        Owner: ownerMap[item.OwnerId?.toString()] || null,
        Images: imagesMap[item._id.toString()] || [],
        Tags: tagsMap[item._id.toString()] || [],
      }))
      .filter((x) => x.Category);

    success = true;
    return res.status(200).json({
      success: true,
      message: "Lấy sản phẩm nổi bật thành công",
      data: { items: itemsWithDetails, total, page: parsedPage, limit: parsedLimit },
    });
  } catch (error) {
    console.error("Lỗi lấy sản phẩm nổi bật:", error);
    if (!success) {
      return res.status(500).json({ success: false, message: error.message || "Lỗi server khi lấy sản phẩm nổi bật" });
    }
    return res.status(200).json({ success: true, message: "Lấy một phần sản phẩm nổi bật", data: { items: [], total: 0 } });
  }
};

const listSearchTags = async (req, res) => {
  try {
    const agg = await ItemTag.aggregate([
      { $match: { IsDeleted: false } },
      { $lookup: { from: "items", localField: "ItemId", foreignField: "_id", as: "item" } },
      { $unwind: "$item" },
      { $match: { "item.StatusId": 2, "item.IsDeleted": false } },
      { $lookup: { from: "tags", localField: "TagId", foreignField: "_id", as: "tag" } },
      { $unwind: "$tag" },
      { $match: { "tag.isDeleted": false } },
      { $group: { _id: "$TagId", count: { $sum: 1 }, tag: { $first: "$tag" } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    const tags = agg.map((x) => ({
      _id: x._id,
      name: x.tag?.name,
      count: x.count,
    }));

    return res.status(200).json({ success: true, message: "Lấy tags thành công", data: { tags, total: tags.length } });
  } catch (error) {
    console.error("Lỗi lấy tags:", error);
    return res.status(500).json({ success: false, message: error.message || "Lỗi server khi lấy tags" });
  }
};

const getProductsByOwnerIdWithHighViewCount = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { limit = 4 } = req.query;

    if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
      return res.status(400).json({ success: false, message: "ownerId không hợp lệ" });
    }
    const parsedLimit = Math.max(Math.min(parseInt(limit) || 4, 20), 1);

    const items = await Item.find({
      StatusId: 2,
      IsDeleted: false,
      OwnerId: new mongoose.Types.ObjectId(ownerId),
    })
      .sort({ ViewCount: -1, CreatedAt: -1 })
      .limit(parsedLimit)
      .lean();

    if (!items || items.length === 0) {
      return res.status(200).json({ success: true, message: "Không có sản phẩm", data: { items: [], total: 0 } });
    }

    const itemIds = items.map((i) => i._id);
    const [allImages, allItemTags, allConditions, allPriceUnits, categories, owners] = await Promise.all([
      ItemImages.find({ ItemId: { $in: itemIds }, IsDeleted: false }).sort({ Ordinal: 1 }).lean(),
      ItemTag.find({ ItemId: { $in: itemIds }, IsDeleted: false }).lean(),
      ItemConditions.find({ IsDeleted: false }).lean(),
      PriceUnits.find({ IsDeleted: false }).lean(),
      Categories.find({ _id: { $in: [...new Set(items.map((i) => i.CategoryId))] }, isActive: true }).lean(),
      User.find({ _id: { $in: [...new Set(items.map((i) => i.OwnerId))] } }).select("FullName DisplayName AvatarUrl").lean(),
    ]);

    const imagesMap = {};
    allImages.forEach((img) => {
      const k = img.ItemId.toString();
      if (!imagesMap[k]) imagesMap[k] = [];
      imagesMap[k].push(img);
    });

    const tagIdsAll = allItemTags.map((t) => t.TagId);
    const allTags = tagIdsAll.length ? await Tags.find({ _id: { $in: tagIdsAll }, isDeleted: false }).lean() : [];
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
      .map((item) => ({
        ...item,
        Category: categoryMap[item.CategoryId?.toString()] || null,
        Condition: allConditions.find((c) => c.ConditionId === item.ConditionId) || null,
        PriceUnit: allPriceUnits.find((p) => p.UnitId === item.PriceUnitId) || null,
        Owner: ownerMap[item.OwnerId?.toString()] || null,
        Images: imagesMap[item._id.toString()] || [],
        Tags: tagsMap[item._id.toString()] || [],
      }))
      .filter((x) => x.Category);

    return res.status(200).json({ success: true, message: "Lấy top view theo shop thành công", data: { items: itemsWithDetails, total: itemsWithDetails.length } });
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm theo shop (top view):", error);
    return res.status(500).json({ success: false, message: error.message || "Lỗi server khi lấy top view theo shop" });
  }
};

// Get highlighted products with images and addresses
const getHighlightedProducts = async (req, res) => {
  try {
    const products = await Item.aggregate([
      { 
        $match: { 
          StatusId: 2, // Only approved products
          IsDeleted: false,
          IsHighlighted: true // Only highlighted products
        } 
      },
      { 
        $sort: { 
          ViewCount: -1, // Sort by view count in descending order
          CreatedAt: -1 
        } 
      },
      // { 
      //   $limit: 10 // Limit to 10 products
      // },
      {
        $lookup: {
          from: "itemimages",
          localField: "_id",
          foreignField: "ItemId",
          as: "images",
          pipeline: [
            { $match: { IsDeleted: false } },
            { $sort: { Ordinal: 1 } },
            { $limit: 1 } // Only get the first image as thumbnail
          ]
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "CategoryId",
          foreignField: "_id",
          as: "category"
        }
      },
      {
        $lookup: {
          from: "itemconditions",
          localField: "ConditionId",
          foreignField: "_id",
          as: "condition"
        }
      },
      {
        $lookup: {
          from: "priceunits",
          localField: "PriceUnitId",
          foreignField: "_id",
          as: "priceUnit"
        }
      },
      {
        $lookup: {
          from: "itemtags",
          localField: "_id",
          foreignField: "ItemId",
          as: "itemTags"
        }
      },
      {
        $lookup: {
          from: "tags",
          localField: "itemTags.TagId",
          foreignField: "_id",
          as: "tags"
        }
      },
      {
        $project: {
          _id: 1,
          Title: 1,
          Description: 1,
          BasePrice: 1,
          DepositAmount: 1,
          Currency: 1,
          ViewCount: 1,
          FavoriteCount: 1,
          RentCount: 1,
          IsHighlighted: 1,
          Address: 1,
          District: 1,
          City: 1,
          thumbnail: { $arrayElemAt: ["$images.Url", 0] },
          category: { $arrayElemAt: ["$category", 0] },
          condition: { $arrayElemAt: ["$condition", 0] },
          priceUnit: { $arrayElemAt: ["$priceUnit", 0] },
          PriceUnitId: 1,
          tags: {
            $map: {
              input: "$tags",
              as: "tag",
              in: {
                _id: "$$tag._id",
                name: "$$tag.name"
              }
            }
          },
          availableQuantity: "$AvailableQuantity",
          quantity: "$Quantity",
          createdAt: "$CreatedAt"
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: products,
      message: 'Lấy danh sách sản phẩm nổi bật thành công'
    });
  } catch (error) {
    console.error("Error in getHighlightedProducts:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi lấy danh sách sản phẩm nổi bật" 
    });
  }
};

// Add this function to your productPublic.controller.js
const getComparableProducts = async (req, res) => {
  let success = false;
  try {
    const { productId, categoryId } = req.params;

    // Validate input
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        success: false, 
        message: "ID sản phẩm không hợp lệ" 
      });
    }

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ 
        success: false, 
        message: "ID danh mục không hợp lệ" 
      });
    }

    // Get current product to exclude from results
    const currentProduct = await Item.findOne({
      _id: productId,
      IsDeleted: false,
      StatusId: 2 // Only active products
    });

    if (!currentProduct) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy sản phẩm" 
      });
    }

    // Find other products in the same category (level 2)
    const comparableProducts = await Item.aggregate([
      {
        $match: {
          _id: { $ne: new mongoose.Types.ObjectId(productId) },
          CategoryId: new mongoose.Types.ObjectId(categoryId),
          StatusId: 2, // Only active products
          IsDeleted: false
        }
      },
      // Removed $sample to get all matching products
      {
        $lookup: {
          from: "itemimages",
          localField: "_id",
          foreignField: "ItemId",
          as: "Images",
          pipeline: [
            { $match: { IsDeleted: false } },
            { $sort: { Ordinal: 1 } },
            { $limit: 5 } // Get up to 5 images for more complete info
          ]
        }
      },
      {
        $lookup: {
          from: "itemconditions",
          localField: "ConditionId",
          foreignField: "ConditionId",
          as: "Condition",
          pipeline: [{ $match: { IsDeleted: false } }]
        }
      },
      {
        $lookup: {
          from: "priceunits",
          localField: "PriceUnitId",
          foreignField: "UnitId",
          as: "PriceUnit",
          pipeline: [{ $match: { IsDeleted: false } }]
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "CategoryId",
          foreignField: "_id",
          as: "Category",
          pipeline: [{ $match: { IsDeleted: false } }]
        }
      },
      {
        $addFields: {
          Location: {
            $concat: [
              { $ifNull: ["$Address", ""] },
              { $cond: [
                { $and: [
                  { $gt: [{ $strLenCP: { $ifNull: ["$Address", ""] } }, 0] },
                  { $gt: [{ $strLenCP: { $ifNull: ["$City", ""] } }, 0] }
                ] },
                ", ",
                ""
              ] },
              { $ifNull: ["$City", ""] },
              { $cond: [
                { $and: [
                  { $gt: [{ $strLenCP: { $ifNull: ["$City", ""] } }, 0] },
                  { $gt: [{ $strLenCP: { $ifNull: ["$District", ""] } }, 0] }
                ] },
                ", ",
                ""
              ] },
              { $ifNull: ["$District", ""] }
            ]
          }
        }
      },
      {
        $project: {
          _id: 1,
          Title: 1,
          ShortDescription: 1,
          Description: 1,
          BasePrice: 1,
          DepositAmount: 1,
          MinRentalDuration: 1,
          MaxRentalDuration: 1,
          Currency: 1,
          Quantity: 1,
          AvailableQuantity: 1,
          Address: 1,
          City: 1,
          District: 1,
          Location: 1,
          IsHighlighted: 1,
          IsTrending: 1,
          ViewCount: 1,
          FavoriteCount: 1,
          RentCount: 1,
          CreatedAt: 1,
          UpdatedAt: 1,
          Images: 1,
          Condition: { $arrayElemAt: ["$Condition", 0] },
          PriceUnit: { $arrayElemAt: ["$PriceUnit", 0] },
          Category: { $arrayElemAt: ["$Category", 0] }
        }
      }
    ]);

    success = true;
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm so sánh thành công",
      data: comparableProducts
    });

  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm so sánh:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || "Lỗi server khi lấy sản phẩm so sánh" 
    });
  }
};


// Get all ratings for products owned by a specific owner
const getRatingByOwnerId = async (req, res) => {
  let success = false;
  try {
    const { ownerId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate ownerId
    if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
      return res.status(400).json({
        success: false,
        message: "ownerId không hợp lệ"
      });
    }

    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.max(Math.min(parseInt(limit) || 20, 100), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    // Get all items owned by the owner
    const ownerItems = await Item.find({ 
      OwnerId: new mongoose.Types.ObjectId(ownerId),
      IsDeleted: false 
    }).select('_id Title').lean();

    if (!ownerItems || ownerItems.length === 0) {
      success = true;
      return res.status(200).json({
        success: true,
        message: "Chủ sở hữu này không có sản phẩm nào",
        data: {
          ratings: [],
          total: 0,
          page: parsedPage,
          limit: parsedLimit
        }
      });
    }

    const itemIds = ownerItems.map(item => item._id);

    // Get ratings for all items owned by the owner
    const [total, ratings] = await Promise.all([
      Rating.countDocuments({
        itemId: { $in: itemIds },
        isDeleted: false
      }),
      Rating.find({
        itemId: { $in: itemIds },
        isDeleted: false
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('renterId', 'fullName displayName avatarUrl FullName DisplayName AvatarUrl')
        .populate('itemId', 'Title')
        .lean()
    ]);

    if (!ratings || ratings.length === 0) {
      success = true;
      return res.status(200).json({
        success: true,
        message: "Không có đánh giá nào cho sản phẩm của chủ sở hữu này",
        data: {
          ratings: [],
          total: 0,
          page: parsedPage,
          limit: parsedLimit
        }
      });
    }

    // Get item details for all rated items
    const ratedItemIds = [...new Set(ratings.map(rating => rating.itemId._id))];
    const itemsWithDetails = await Item.find({
      _id: { $in: ratedItemIds },
      IsDeleted: false
    })
      .populate('CategoryId', 'Name')
      .select('Title CategoryId BasePrice Currency Images')
      .lean();

    // Get item images
    const itemImages = await ItemImages.find({
      ItemId: { $in: ratedItemIds },
      IsDeleted: false
    })
      .sort({ Ordinal: 1 })
      .lean();

    // Create maps for efficient lookup
    const itemMap = {};
    itemsWithDetails.forEach(item => {
      itemMap[item._id.toString()] = item;
    });

    const imagesMap = {};
    itemImages.forEach(img => {
      const key = img.ItemId.toString();
      if (!imagesMap[key]) {
        imagesMap[key] = [];
      }
      imagesMap[key].push(img);
    });

    // Format ratings with full details
    const ratingsWithDetails = ratings.map(rating => {
      const item = itemMap[rating.itemId._id.toString()];
      return {
        ...rating,
        Item: {
          ...item,
          Images: imagesMap[rating.itemId._id.toString()] || []
        }
      };
    });

    success = true;
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách đánh giá theo chủ sở hữu thành công",
      data: {
        ratings: ratingsWithDetails,
        total,
        page: parsedPage,
        limit: parsedLimit
      }
    });

  } catch (error) {
    console.error("Lỗi khi lấy đánh giá theo chủ sở hữu:", error);
    if (!success) {
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi server khi lấy đánh giá theo chủ sở hữu"
      });
    }
    return res.status(200).json({
      success: true,
      message: "Trả về rỗng",
      data: {
        ratings: [],
        total: 0
      }
    });
  }
};


module.exports = {
  listAllItems,
  getProductByProductId,
  searchProduct,
  viewFeatureProduct,
  listSearchTags,
  getProductsByOwnerIdWithHighViewCount,
  getPublicStoreByUserGuid,
  getProductsByCategoryId,
  getHighlightedProducts,
  getComparableProducts,
  getRatingByOwnerId
};
