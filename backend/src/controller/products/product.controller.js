const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const Item = require("../../models/Product/Item.model");
const ItemImages = require("../../models/Product/ItemImage.model");
const ItemTag = require("../../models/Product/ItemTag.model");
const ItemReject = require("../../models/Product/ItemReject.model");
const ItemAddress = require("../../models/Product/ItemAddress.model");
const AuditLog = require("../../models/AuditLog.model");
const Categories = require("../../models/Product/Categories.model");
const ItemConditions = require("../../models/Product/ItemConditions.model");
const PriceUnits = require("../../models/Product/PriceUnits.model");
const User = require("../../models/User.model");
const Tags = require("../../models/Tag.model");
const Order = require("../../models/Order/Order.model");

const cloudinary = require("cloudinary").v2;

const DURATION_RULES = {
  1: { min: 1, max: 720, unit: "giờ" }, // Giờ: tối đa 30 ngày
  2: { min: 1, max: 365, unit: "ngày" }, // Ngày
  3: { min: 1, max: 52, unit: "tuần" }, // Tuần: tối đa ~1 năm
  4: { min: 1, max: 12, unit: "tháng" }, // Tháng: tối đa 1 năm
};
const MAX_PRICE = 1000000000; // 1 tỷ VND - giá trị tối đa cho BasePrice và DepositAmount

const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return null;

  const afterUpload = parts[1].split("/").slice(1).join("/");
  const publicId = afterUpload ? afterUpload.split(".")[0] : null;
  return publicId ? `retrotrade/${publicId}` : null;
};

const saveUserAddress = async (
  userId,
  address,
  city,
  district,
  session = null
) => {
  const query = {
    UserId: userId,
    Address: address.trim(),
    City: city.trim(),
    District: district.trim(),
  };

  // Kiểm tra tồn tại
  const existingAddress = await ItemAddress.findOne(query, null, { session });
  if (existingAddress) {
    return existingAddress;
  }

  const newAddress = new ItemAddress({
    ...query,
    IsDefault: false,
  });
  return await newAddress.save({ session });
};

// Hàm helper kiểm tra sản phẩm có đang được thuê (có order active) không
const hasActiveOrders = async (itemId, session = null) => {
  const activeStatuses = [
    "pending",
    "confirmed",
    "delivery",
    "received",
    "progress",
    "returned",
    "disputed",
  ];
  const activeOrders = await Order.find({
    itemId: itemId,
    orderStatus: { $in: activeStatuses },
  }).session(session);
  return activeOrders.length > 0;
};

const addProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let success = false;
  let committed = false;
  try {
    const ownerId = req.user._id;
    if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
      throw new Error("OwnerId không hợp lệ");
    }

    let {
      Title,
      ShortDescription,
      Description,
      CategoryId,
      ConditionId,
      BasePrice,
      PriceUnitId,
      DepositAmount,
      MinRentalDuration,
      MaxRentalDuration,
      Currency = "VND",
      Quantity,
      Address,
      City,
      District,
      Tags: TagsInput = [],
      ImageUrls = [],
    } = req.body;

    Title = Title?.trim() || "";
    ShortDescription = ShortDescription?.trim() || "";
    Description = Description?.trim() || "";
    Address = Address?.trim() || "";
    City = City?.trim() || "";
    District = District?.trim() || "";

    let tagsArray = [];
    if (TagsInput && Array.isArray(TagsInput)) {
      tagsArray = TagsInput.map((tag) =>
        typeof tag === "string" ? tag.trim() : null
      ).filter(
        (tag) =>
          tag !== null && tag !== undefined && tag !== "" && tag.length > 0
      );
    } else if (typeof TagsInput === "string" && TagsInput.trim()) {
      tagsArray = TagsInput.split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "" && tag.length > 0);
    }
    console.log("Processed tagsArray:", tagsArray);

    if (!Array.isArray(ImageUrls) || ImageUrls.length < 2) {
      throw new Error(
        "Sản phẩm phải có ít nhất 2 hình ảnh: 1 ảnh chính và 1 ảnh phụ"
      );
    }

    if (!Title) {
      throw new Error("Tiêu đề là bắt buộc");
    }
    if (
      !BasePrice ||
      isNaN(parseFloat(BasePrice)) ||
      parseFloat(BasePrice) <= 0
    ) {
      throw new Error("Giá cơ bản là bắt buộc và phải lớn hơn 0");
    }
    if (parseFloat(BasePrice) > MAX_PRICE) {
      throw new Error(`Giá cơ bản không được vượt quá ${MAX_PRICE} VND`);
    }
    if (
      !DepositAmount ||
      isNaN(parseFloat(DepositAmount)) ||
      parseFloat(DepositAmount) <= 0
    ) {
      throw new Error("Số tiền đặt cọc là bắt buộc và phải lớn hơn 0");
    }
    if (parseFloat(DepositAmount) > MAX_PRICE) {
      throw new Error(`Số tiền đặt cọc không được vượt quá ${MAX_PRICE} VND`);
    }
    if (!Quantity || isNaN(parseInt(Quantity)) || parseInt(Quantity) < 1) {
      throw new Error("Số lượng là bắt buộc và phải lớn hơn hoặc bằng 1");
    }
    if (!CategoryId || !mongoose.Types.ObjectId.isValid(CategoryId)) {
      throw new Error("Danh mục là bắt buộc và phải hợp lệ");
    }
    if (!ConditionId || isNaN(parseInt(ConditionId))) {
      throw new Error("Tình trạng là bắt buộc");
    }
    if (!Description || Description.trim().length === 0) {
      throw new Error("Mô tả là bắt buộc");
    }
    if (!PriceUnitId || isNaN(parseInt(PriceUnitId))) {
      throw new Error("Đơn vị giá là bắt buộc");
    }

    const parsedPriceUnitId = parseInt(PriceUnitId);
    const durationRule = DURATION_RULES[parsedPriceUnitId];
    if (!durationRule) {
      throw new Error("Đơn vị giá không hợp lệ");
    }

    const parsedMinDuration = parseInt(MinRentalDuration);
    const parsedMaxDuration = parseInt(MaxRentalDuration);

    if (
      isNaN(parsedMinDuration) ||
      parsedMinDuration < durationRule.min ||
      parsedMinDuration > durationRule.max
    ) {
      throw new Error(
        `Thời gian thuê tối thiểu là bắt buộc và phải từ ${durationRule.min} đến ${durationRule.max} ${durationRule.unit}`
      );
    }

    if (
      isNaN(parsedMaxDuration) ||
      parsedMaxDuration < durationRule.min ||
      parsedMaxDuration > durationRule.max
    ) {
      throw new Error(
        `Thời gian thuê tối đa là bắt buộc và phải từ ${durationRule.min} đến ${durationRule.max} ${durationRule.unit}`
      );
    }

    if (parsedMinDuration > parsedMaxDuration) {
      throw new Error(
        "Thời gian thuê tối thiểu không thể lớn hơn thời gian thuê tối đa"
      );
    }

    const parsedQuantity = parseInt(Quantity);
    const parsedBasePrice = parseFloat(BasePrice);
    const parsedDepositAmount = parseFloat(DepositAmount);
    const parsedCategoryId = new mongoose.Types.ObjectId(CategoryId);
    const parsedConditionId = parseInt(ConditionId);

    if (parsedMinDuration > parsedMaxDuration) {
      throw new Error(
        "Thời gian thuê tối thiểu không thể vượt quá thời gian thuê tối đa"
      );
    }

    const category = await Categories.findById(parsedCategoryId).session(
      session
    );
    if (!category || !category.isActive) {
      throw new Error("Danh mục không hợp lệ hoặc không hoạt động");
    }

    const condition = await ItemConditions.findOne({
      ConditionId: parsedConditionId,
    }).session(session);
    if (!condition || condition.IsDeleted) {
      throw new Error("Điều kiện không hợp lệ");
    }

    const priceUnit = await PriceUnits.findOne({
      UnitId: parsedPriceUnitId,
    }).session(session);
    if (!priceUnit || priceUnit.IsDeleted) {
      throw new Error("Đơn vị giá không hợp lệ");
    }

    const owner = await User.findById(ownerId).session(session);

    const newItem = await Item.create(
      [
        {
          ItemGuid: uuidv4(),
          OwnerId: ownerId,
          Title,
          ShortDescription,
          Description,
          CategoryId: parsedCategoryId,
          ConditionId: parsedConditionId,
          BasePrice: parsedBasePrice,
          PriceUnitId: parsedPriceUnitId,
          DepositAmount: parsedDepositAmount,
          MinRentalDuration: parsedMinDuration,
          MaxRentalDuration: parsedMaxDuration,
          Currency,
          Quantity: parsedQuantity,
          StatusId: 1,
          Address,
          City,
          District,
          IsHighlighted: false,
          IsTrending: false,
          ViewCount: 0,
          FavoriteCount: 0,
          RentCount: 0,
          IsDeleted: false,
        },
      ],
      { session }
    );
    const item = newItem[0];
    success = true;

    if (Address && City && District) {
      try {
        await saveUserAddress(ownerId, Address, City, District, session);
      } catch (addrError) {
        console.warn("Lưu địa chỉ thất bại, tiếp tục:", addrError.message);
      }
    }

    let images = [];
    if (Array.isArray(ImageUrls) && ImageUrls.length >= 2) {
      try {
        for (let i = 0; i < ImageUrls.length; i++) {
          const url = ImageUrls[i];
          if (typeof url !== "string" || !url.trim()) continue;
          const image = await ItemImages.create(
            [
              {
                ItemId: item._id,
                Url: url.trim(),
                IsPrimary: i === 0,
                Ordinal: i + 1,
                AltText: `${Title} - Image ${i + 1}`,
                IsDeleted: false,
              },
            ],
            { session }
          );
          images.push(image[0]);
        }
        const hasPrimary = images.some((img) => img.IsPrimary);
        if (!hasPrimary || images.length < 2) {
          throw new Error(
            "Không thể set ảnh chính và phụ - vui lòng cung cấp ít nhất 2 hình ảnh hợp lệ"
          );
        }
      } catch (imgError) {
        console.warn("Tạo hình ảnh thất bại :", imgError.message);
      }
    }

    // Process tags
    if (tagsArray.length > 0) {
      await ItemTag.deleteMany({ ItemId: item._id }, { session });

      for (let tagName of tagsArray) {
        const trimmedName = tagName.trim();
        if (!trimmedName || trimmedName.length === 0) {
          continue;
        }

        try {
          let tag = await Tags.findOne({
            name: trimmedName,
            isDeleted: false,
          }).session(session);

          if (!tag) {
            const newTag = await Tags.create(
              [{ name: trimmedName, isDeleted: false }],
              {
                session,
              }
            );
            tag = newTag[0];
          }

          if (tag && mongoose.Types.ObjectId.isValid(tag._id)) {
            await ItemTag.create(
              [
                {
                  ItemId: item._id,
                  TagId: tag._id,
                  IsDeleted: false,
                },
              ],
              { session }
            );
          }
        } catch (tagError) {
          console.warn(
            `Tag/ItemTag partial fail for "${trimmedName}", continuing:`,
            tagError.message
          );
        }
      }
    }

    // Audit log
    try {
      await AuditLog.create(
        [
          {
            TableName: "Items",
            PrimaryKeyValue: item._id.toString(),
            Operation: "INSERT",
            ChangedByUserId: ownerId,
            ChangeSummary: `Added new product: ${Title}`,
          },
        ],
        { session }
      );
    } catch (auditError) {
      console.warn("Audit log fail, continuing:", auditError.message);
    }

    await session.commitTransaction();
    committed = true;

    // Fetch updated item with details including current tags
    const updatedItemWithDetails = await Item.findById(item._id).session(
      session
    );
    const categoryDetail = await Categories.findById(parsedCategoryId).session(
      session
    );
    const conditionDetail = await ItemConditions.findOne({
      ConditionId: parsedConditionId,
    }).session(session);
    const ownerDetail = await User.findById(ownerId).session(session);
    const imagesDetail = await ItemImages.find({
      ItemId: item._id,
      IsDeleted: false,
    })
      .sort({ Ordinal: 1 })
      .session(session);
    const itemTagsDetail = await ItemTag.find({
      ItemId: item._id,
      IsDeleted: false,
    })
      .populate("TagId")
      .session(session);

    const itemWithDetails = {
      ...updatedItemWithDetails.toObject(),
      Category: categoryDetail,
      Condition: conditionDetail,
      Owner: ownerDetail,
      Images: imagesDetail,
      Tags: itemTagsDetail,
    };

    res.status(201).json({
      success: true,
      message: "Sản phẩm đã được tạo thành công và đang chờ phê duyệt.",
      data: itemWithDetails,
    });
  } catch (error) {
    if (!committed) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Abort transaction error:", abortError);
      }
    }
    console.error("Lỗi khi tạo sản phẩm:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi tạo sản phẩm",
    });
  } finally {
    session.endSession();
  }
};

const updateProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let success = false;
  let committed = false;
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("ID sản phẩm không hợp lệ");
    }

    const existingItem = await Item.findOne({
      _id: id,
      OwnerId: userId,
      IsDeleted: false,
    }).session(session);
    if (!existingItem) {
      throw new Error(
        "Sản phẩm không tồn tại hoặc bạn không có quyền chỉnh sửa"
      );
    }

    // Kiểm tra sản phẩm có đang được thuê (có order active) không
    const hasActive = await hasActiveOrders(id, session);
    if (hasActive) {
      throw new Error(
        "Không thể cập nhật sản phẩm khi có đơn hàng đang thuê. Chỉ có thể cập nhật sau khi tất cả đơn hàng hoàn tất hoặc bị hủy."
      );
    }

    // Xóa ItemReject nếu trước đó rejected
    if (existingItem.StatusId === 3) {
      await ItemReject.deleteOne({ ItemId: id });
    }

    let {
      Title,
      ShortDescription,
      Description,
      CategoryId,
      ConditionId,
      BasePrice,
      PriceUnitId,
      DepositAmount,
      MinRentalDuration,
      MaxRentalDuration,
      Currency = "VND",
      Quantity,
      Address,
      City,
      District,
      Tags: TagsInput = [],
      ImageUrls = [],
    } = req.body;

    Title = Title?.trim() || existingItem.Title;
    ShortDescription =
      ShortDescription?.trim() || existingItem.ShortDescription;
    Description = Description?.trim() || existingItem.Description;
    Address = Address?.trim() || existingItem.Address;
    City = City?.trim() || existingItem.City;
    District = District?.trim() || existingItem.District;

    let tagsArray = [];
    if (TagsInput && Array.isArray(TagsInput)) {
      tagsArray = TagsInput.map((tag) =>
        typeof tag === "string" ? tag.trim() : null
      ).filter(
        (tag) =>
          tag !== null && tag !== undefined && tag !== "" && tag.length > 0
      );
    } else if (typeof TagsInput === "string" && TagsInput.trim()) {
      tagsArray = TagsInput.split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "" && tag.length > 0);
    }
    console.log("Processed tagsArray for update:", tagsArray);

    let currentImageCount = await ItemImages.countDocuments({
      ItemId: id,
      IsDeleted: false,
    }).session(session);
    if (Array.isArray(ImageUrls) && ImageUrls.length > 0) {
      if (ImageUrls.length < 2) {
        throw new Error(
          "Nếu cập nhật hình ảnh, phải cung cấp ít nhất 2 hình ảnh: 1 ảnh chính và 1 ảnh phụ"
        );
      }
      const validImages = ImageUrls.filter(
        (url) => typeof url === "string" && url.trim()
      );
      if (validImages.length < 2) {
        throw new Error(
          "Sản phẩm phải có ít nhất 2 hình ảnh: 1 ảnh chính và 1 ảnh phụ"
        );
      }
    } else if (currentImageCount < 2) {
      throw new Error(
        "Sản phẩm phải có ít nhất 2 hình ảnh: 1 ảnh chính và 1 ảnh phụ"
      );
    }

    if (!Title) {
      throw new Error("Tiêu đề là bắt buộc");
    }
    if (
      !BasePrice ||
      isNaN(parseFloat(BasePrice)) ||
      parseFloat(BasePrice) <= 0
    ) {
      throw new Error("Giá cơ bản là bắt buộc và phải lớn hơn 0");
    }
    if (parseFloat(BasePrice) > MAX_PRICE) {
      throw new Error(`Giá cơ bản không được vượt quá ${MAX_PRICE} VND`);
    }
    if (
      !DepositAmount ||
      isNaN(parseFloat(DepositAmount)) ||
      parseFloat(DepositAmount) <= 0
    ) {
      throw new Error("Số tiền đặt cọc là bắt buộc và phải lớn hơn 0");
    }
    if (parseFloat(DepositAmount) > MAX_PRICE) {
      throw new Error(`Số tiền đặt cọc không được vượt quá ${MAX_PRICE} VND`);
    }
    if (!Quantity || isNaN(parseInt(Quantity)) || parseInt(Quantity) < 1) {
      throw new Error("Số lượng là bắt buộc và phải lớn hơn hoặc bằng 1");
    }
    if (!CategoryId || !mongoose.Types.ObjectId.isValid(CategoryId)) {
      throw new Error("Danh mục là bắt buộc và phải hợp lệ");
    }
    if (!ConditionId || isNaN(parseInt(ConditionId))) {
      throw new Error("Tình trạng là bắt buộc");
    }
    if (!PriceUnitId || isNaN(parseInt(PriceUnitId))) {
      throw new Error("Đơn vị giá là bắt buộc");
    }
    if (!Description || Description.trim().length === 0) {
      throw new Error("Mô tả là bắt buộc");
    }

    const parsedPriceUnitId = parseInt(PriceUnitId);
    const durationRule = DURATION_RULES[parsedPriceUnitId];
    if (!durationRule) {
      throw new Error("Đơn vị giá không hợp lệ");
    }

    // Lấy giá trị Min/Max: nếu người dùng gửi thì dùng mới, không thì giữ cũ
    const minValue =
      MinRentalDuration !== undefined
        ? parseInt(MinRentalDuration)
        : existingItem.MinRentalDuration;

    const maxValue =
      MaxRentalDuration !== undefined
        ? parseInt(MaxRentalDuration)
        : existingItem.MaxRentalDuration;

    if (
      !minValue ||
      isNaN(minValue) ||
      minValue < durationRule.min ||
      minValue > durationRule.max
    ) {
      throw new Error(
        `Thời gian thuê tối thiểu là bắt buộc và phải từ ${durationRule.min} đến ${durationRule.max} ${durationRule.unit}`
      );
    }

    if (
      !maxValue ||
      isNaN(maxValue) ||
      maxValue < durationRule.min ||
      maxValue > durationRule.max
    ) {
      throw new Error(
        `Thời gian thuê tối đa là bắt buộc và phải từ ${durationRule.min} đến ${durationRule.max} ${durationRule.unit}`
      );
    }

    if (minValue > maxValue) {
      throw new Error(
        "Thời gian thuê tối thiểu không thể lớn hơn thời gian thuê tối đa"
      );
    }

    const parsedQuantity = parseInt(Quantity);
    const parsedBasePrice = parseFloat(BasePrice);
    const parsedDepositAmount = parseFloat(DepositAmount);
    const parsedCategoryId = new mongoose.Types.ObjectId(CategoryId);
    const parsedConditionId = parseInt(ConditionId);
    const parsedMinDuration = minValue;
    const parsedMaxDuration = maxValue;

    if (parsedMinDuration > parsedMaxDuration) {
      throw new Error(
        "Thời gian thuê tối thiểu không thể vượt quá thời gian thuê tối đa"
      );
    }

    const category = await Categories.findById(parsedCategoryId).session(
      session
    );
    if (!category || !category.isActive) {
      throw new Error("Danh mục không hợp lệ hoặc không hoạt động");
    }

    const condition = await ItemConditions.findOne({
      ConditionId: parsedConditionId,
    }).session(session);
    if (!condition || condition.IsDeleted) {
      throw new Error("Điều kiện không hợp lệ");
    }

    const priceUnit = await PriceUnits.findOne({
      UnitId: parsedPriceUnitId,
    }).session(session);
    if (!priceUnit || priceUnit.IsDeleted) {
      throw new Error("Đơn vị giá không hợp lệ");
    }

    const owner = await User.findById(userId).session(session);

    const updateData = {
      Title,
      ShortDescription,
      Description,
      CategoryId: parsedCategoryId,
      ConditionId: parsedConditionId,
      BasePrice: parsedBasePrice,
      PriceUnitId: parsedPriceUnitId,
      DepositAmount: parsedDepositAmount,
      MinRentalDuration: parsedMinDuration,
      MaxRentalDuration: parsedMaxDuration,
      Currency,
      Quantity: parsedQuantity,
      AvailableQuantity: parsedQuantity,
      StatusId: 1,
      Address,
      City,
      District,
      UpdatedAt: new Date(),
    };

    const updatedItem = await Item.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      session,
    });
    success = true;

    // Lưu địa chỉ mới nếu thay đổi
    if (
      Address &&
      City &&
      District &&
      (Address !== existingItem.Address ||
        City !== existingItem.City ||
        District !== existingItem.District)
    ) {
      try {
        await saveUserAddress(userId, Address, City, District, session);
      } catch (addrError) {
        console.warn("Lưu địa chỉ thất bại, tiếp tục:", addrError.message);
      }
    }

    let images = [];
    if (Array.isArray(ImageUrls) && ImageUrls.length > 0) {
      try {
        const oldImages = await ItemImages.find({
          ItemId: updatedItem._id,
          IsDeleted: false,
        }).session(session);
        const deletePromises = oldImages.map(async (oldImage) => {
          await ItemImages.findByIdAndDelete(oldImage._id, { session });

          // Xóa khỏi Cloudinary
          const publicId = extractPublicId(oldImage.Url);
          if (publicId) {
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (cloudErr) {
              console.error(
                "Lỗi xóa hình ảnh cũ trên Cloudinary:",
                cloudErr.message
              );
            }
          }
        });
        await Promise.all(deletePromises);

        // Tạo hình ảnh mới
        for (let i = 0; i < ImageUrls.length; i++) {
          const url = ImageUrls[i];
          if (typeof url !== "string" || !url.trim()) continue;
          const image = await ItemImages.create(
            [
              {
                ItemId: updatedItem._id,
                Url: url.trim(),
                IsPrimary: i === 0,
                Ordinal: i + 1,
                AltText: `${Title} - Image ${i + 1}`,
                IsDeleted: false,
              },
            ],
            { session }
          );
          images.push(image[0]);
        }

        const hasPrimary = images.some((img) => img.IsPrimary);
        if (!hasPrimary || images.length < 2) {
          throw new Error(
            "Không thể cập nhật ảnh chính và phụ - vui lòng cung cấp ít nhất 2 hình ảnh hợp lệ"
          );
        }
      } catch (imgError) {
        console.warn(
          "Images update partial fail, continuing:",
          imgError.message
        );
      }
    } else {
      images = await ItemImages.find({
        ItemId: updatedItem._id,
        IsDeleted: false,
      })
        .sort({ Ordinal: 1 })
        .session(session);
      if (images.length < 2) {
        throw new Error(
          "Sản phẩm hiện tại không đủ 2 hình ảnh - vui lòng cập nhật thêm"
        );
      }
    }

    // Process tags
    if (tagsArray.length > 0) {
      // Hard delete all existing ItemTags
      await ItemTag.deleteMany({ ItemId: updatedItem._id }, { session });

      for (let tagName of tagsArray) {
        const trimmedName = tagName.trim();
        if (!trimmedName || trimmedName.length === 0) {
          continue;
        }

        try {
          let tag = await Tags.findOne({
            name: trimmedName,
            isDeleted: false,
          }).session(session);

          if (!tag) {
            const newTag = await Tags.create(
              [{ name: trimmedName, isDeleted: false }],
              {
                session,
              }
            );
            tag = newTag[0];
          }

          if (tag && mongoose.Types.ObjectId.isValid(tag._id)) {
            await ItemTag.create(
              [
                {
                  ItemId: updatedItem._id,
                  TagId: tag._id,
                  IsDeleted: false,
                },
              ],
              { session }
            );
          }
        } catch (tagError) {
          console.warn(
            `Tag/ItemTag partial fail for "${trimmedName}", continuing:`,
            tagError.message
          );
        }
      }
    } else {
      // If no tags, remove all active ItemTags
      await ItemTag.updateMany(
        {
          ItemId: updatedItem._id,
          IsDeleted: false,
        },
        { IsDeleted: true },
        { session }
      );
    }

    // Audit log
    try {
      await AuditLog.create(
        [
          {
            TableName: "Items",
            PrimaryKeyValue: updatedItem._id.toString(),
            Operation: "UPDATE",
            ChangedByUserId: userId,
            ChangeSummary: `Updated product: ${Title}`,
          },
        ],
        { session }
      );
    } catch (auditError) {
      console.warn("Audit log fail, continuing:", auditError.message);
    }

    await session.commitTransaction();
    committed = true;

    // Fetch updated item with details including current tags
    const updatedItemWithDetails = await Item.findById(updatedItem._id).session(
      session
    );
    const categoryDetail = await Categories.findById(parsedCategoryId).session(
      session
    );
    const conditionDetail = await ItemConditions.findOne({
      ConditionId: parsedConditionId,
    }).session(session);
    const ownerDetail = await User.findById(userId).session(session);
    const imagesDetail = await ItemImages.find({
      ItemId: updatedItem._id,
      IsDeleted: false,
    })
      .sort({ Ordinal: 1 })
      .session(session);
    const itemTagsDetail = await ItemTag.find({
      ItemId: updatedItem._id,
      IsDeleted: false,
    })
      .populate("TagId")
      .session(session);

    const itemWithDetails = {
      ...updatedItemWithDetails.toObject(),
      Category: categoryDetail,
      Condition: conditionDetail,
      Owner: ownerDetail,
      Images: imagesDetail || images,
      Tags: itemTagsDetail,
    };

    res.status(200).json({
      success: true,
      message: "Sản phẩm đã được cập nhật thành công và đang chờ phê duyệt.",
      data: itemWithDetails,
    });
  } catch (error) {
    if (!committed) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Abort transaction error:", abortError);
      }
    }
    const activeOrderErrorMsg =
      "Không thể cập nhật sản phẩm khi có đơn hàng đang thuê. Chỉ có thể cập nhật sau khi tất cả đơn hàng hoàn tất hoặc bị hủy.";
    if (error.message !== activeOrderErrorMsg) {
      console.error("Lỗi cập nhật sản phẩm:", error);
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi cập nhật sản phẩm",
    });
  } finally {
    session.endSession();
  }
};

const setDefaultAddress = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let success = false;
  let committed = false;
  try {
    const userId = req.user._id;
    const { Address, City, District } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("UserId không hợp lệ");
    }

    if (!Address || !Address.trim()) {
      throw new Error("Địa chỉ là bắt buộc");
    }
    if (!City || !City.trim()) {
      throw new Error("Thành phố là bắt buộc");
    }
    if (!District || !District.trim()) {
      throw new Error("Xã/Phường là bắt buộc");
    }

    const query = {
      UserId: userId,
      Address: Address.trim(),
      City: City.trim(),
      District: District.trim(),
    };

    let addressDoc = await ItemAddress.findOne(query).session(session);
    if (!addressDoc) {
      addressDoc = new ItemAddress({
        ...query,
        IsDefault: true,
      });
      addressDoc = await addressDoc.save({ session });
    } else {
      addressDoc.IsDefault = true;
      addressDoc.UpdatedAt = new Date();
      addressDoc = await addressDoc.save({ session });
    }

    await ItemAddress.updateMany(
      { UserId: userId, _id: { $ne: addressDoc._id } },
      { IsDefault: false },
      { session }
    );

    await session.commitTransaction();
    committed = true;

    success = true;

    res.status(200).json({
      success: true,
      message: "Đặt địa chỉ mặc định thành công",
      data: { addressId: addressDoc._id },
    });
  } catch (error) {
    if (!committed) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Abort transaction error:", abortError);
      }
    }
    console.error("Lỗi đặt địa chỉ mặc định:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi đặt địa chỉ mặc định",
    });
  } finally {
    session.endSession();
  }
};

const getUserAddresses = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "UserId không hợp lệ" });
    }

    const addresses = await ItemAddress.find({ UserId: userId })
      .sort({ IsDefault: -1, CreatedAt: -1 })
      .select("Address City District IsDefault")
      .lean();

    res.json({
      success: true,
      data: addresses || [],
    });
  } catch (error) {
    console.error("Error in getUserAddresses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let success = false;
  let committed = false;
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("ID sản phẩm không hợp lệ");
    }

    const existingItem = await Item.findOne({
      _id: id,
      OwnerId: userId,
      IsDeleted: false,
    }).session(session);
    if (!existingItem) {
      throw new Error("Sản phẩm không tồn tại hoặc bạn không có quyền xóa");
    }

    // Kiểm tra sản phẩm có đang được thuê (có order active) không
    const hasActive = await hasActiveOrders(id, session);
    if (hasActive) {
      throw new Error(
        "Không thể xóa sản phẩm khi có đơn hàng đang thuê. Chỉ có thể xóa sau khi tất cả đơn hàng hoàn tất hoặc bị hủy."
      );
    }

    await Item.findByIdAndUpdate(
      id,
      { IsDeleted: true, UpdatedAt: new Date() },
      { session }
    );
    success = true;

    const images = await ItemImages.find({
      ItemId: id,
      IsDeleted: false,
    }).session(session);
    const deletePromises = images.map(async (image) => {
      await ItemImages.findByIdAndDelete(image._id, { session });

      // Xóa khỏi Cloudinary
      const publicId = extractPublicId(image.Url);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Đã xóa hình ảnh trên Cloudinary: ${publicId}`);
        } catch (cloudErr) {
          console.error("Lỗi xóa hình ảnh trên Cloudinary:", cloudErr.message);
        }
      }
    });
    await Promise.all(deletePromises);

    await ItemTag.deleteMany({ ItemId: id }, { session });

    // Audit log
    try {
      await AuditLog.create(
        [
          {
            TableName: "Items",
            PrimaryKeyValue: id.toString(),
            Operation: "DELETE",
            ChangedByUserId: userId,
            ChangeSummary: `Đã xóa sản phẩm: ${existingItem.Title}`,
          },
        ],
        { session }
      );
    } catch (auditError) {
      console.warn("Audit log fail, continuing:", auditError.message);
    }

    await session.commitTransaction();
    committed = true;

    res.status(200).json({
      success: true,
      message: "Xóa sản phẩm thành công",
      data: { deletedItemId: id },
    });
  } catch (error) {
    if (!committed) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Abort transaction error:", abortError);
      }
    }
    const activeOrderErrorMsg =
      "Không thể xóa sản phẩm khi có đơn hàng đang thuê. Chỉ có thể xóa sau khi tất cả đơn hàng hoàn tất hoặc bị hủy.";
    if (error.message !== activeOrderErrorMsg) {
      console.error("Lỗi xóa sản phẩm:", error);
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi xóa sản phẩm",
    });
  } finally {
    session.endSession();
  }
};

const getUserProducts = async (req, res) => {
  let success = false;
  try {
    const userId = req.user._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("UserId không hợp lệ");
    }

    const items = await Item.find({ OwnerId: userId, IsDeleted: false })
      .sort({ CreatedAt: -1 })
      .lean();

    if (!items || items.length === 0) {
      success = true;
      return res.status(200).json({
        success: true,
        message: "Không có sản phẩm nào",
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

    const owner = await User.findById(userId)
      .select("FullName DisplayName AvatarUrl")
      .lean();

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
        Owner: owner,
        Images: imagesMap[item._id.toString()] || [],
        Tags: tagsMap[item._id.toString()] || [],
      }))
      .filter((item) => item.Category);

    success = true;

    res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm của người dùng thành công",
      data: {
        items: itemsWithDetails,
        total: itemsWithDetails.length,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy sản phẩm của người dùng:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi lấy sản phẩm của người dùng",
    });
  }
};

const getProductById = async (req, res) => {
  let success = false;
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("ID sản phẩm không hợp lệ");
    }

    const item = await Item.findOne({
      _id: id,
      OwnerId: userId,
      IsDeleted: false,
    }).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại hoặc bạn không có quyền xem",
      });
    }

    const images = await ItemImages.find({
      ItemId: id,
      IsDeleted: false,
    })
      .sort({ Ordinal: 1 })
      .lean();

    const itemTags = await ItemTag.find({
      ItemId: id,
      IsDeleted: false,
    }).lean();
    const tagIds = itemTags.map((tag) => tag.TagId);
    const tags = await Tags.find({
      _id: { $in: tagIds },
      isDeleted: false,
    }).lean();
    const category = await Categories.findOne({
      _id: item.CategoryId,
      isActive: true,
    }).lean();

    const condition = await ItemConditions.findOne({
      ConditionId: item.ConditionId,
      IsDeleted: false,
    }).lean();
    const priceUnit = await PriceUnits.findOne({
      UnitId: item.PriceUnitId,
      IsDeleted: false,
    }).lean();

    const owner = await User.findById(userId)
      .select("FullName DisplayName AvatarUrl")
      .lean();

    const fullTags = itemTags.map((itemTag) => ({
      ...itemTag,
      Tag: tags.find((t) => t._id.toString() === itemTag.TagId.toString()),
    }));

    const productWithDetails = {
      ...item,
      Category: category,
      Condition: condition,
      PriceUnit: priceUnit,
      Owner: owner,
      Images: images,
      Tags: fullTags,
    };

    if (item.StatusId === 3) {
      const reject = await ItemReject.findOne({ ItemId: id }).lean();
      if (reject) {
        productWithDetails.rejectReason = reject.RejectReason;
      }
    }

    success = true;

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết sản phẩm thành công",
      data: productWithDetails,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết sản phẩm:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi lấy chi tiết sản phẩm",
    });
  }
};

module.exports = {
  addProduct,
  updateProduct,
  deleteProduct,
  getUserProducts,
  getProductById,
  getUserAddresses,
  setDefaultAddress,
};
