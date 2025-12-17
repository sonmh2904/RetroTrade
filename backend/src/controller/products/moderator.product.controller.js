const Item = require("../../models/Product/Item.model");
const ItemImage = require("../../models/Product/ItemImage.model");
const ItemReject = require("../../models/Product/ItemReject.model");
const User = require("../../models/User.model");
const Category = require("../../models/Product/Categories.model");
const ItemConditions = require("../../models/Product/ItemConditions.model");
const PriceUnits = require("../../models/Product/PriceUnits.model");
const Notification = require("../../models/Notification.model");
const AuditLog = require("../../models/AuditLog.model");
const { sendEmail } = require("../../utils/sendEmail");
const mongoose = require("mongoose");

const logAudit = async (
  tableName,
  primaryKeyValue,
  operation,
  changedByUserId,
  changeSummary
) => {
  await AuditLog.create({
    TableName: tableName,
    PrimaryKeyValue: primaryKeyValue.toString(),
    Operation: operation,
    ChangedByUserId: changedByUserId,
    ChangedAt: new Date(),
    ChangeSummary: changeSummary,
  });
};

const getPendingProducts = async (req, res) => {
  try {
    const query = {
      StatusId: 1, // Pending
      IsDeleted: false,
    };

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "users",
          localField: "OwnerId",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            { $project: { fullName: 1, avatarUrl: 1, reputationScore: 1 } },
          ],
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "CategoryId",
          foreignField: "_id",
          as: "category",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $lookup: {
          from: "itemconditions",
          localField: "ConditionId",
          foreignField: "ConditionId",
          as: "condition",
          pipeline: [
            { $match: { IsDeleted: false } },
            { $project: { ConditionName: 1 } },
          ],
        },
      },
      {
        $lookup: {
          from: "priceunits",
          localField: "PriceUnitId",
          foreignField: "UnitId",
          as: "priceUnit",
          pipeline: [
            { $match: { IsDeleted: false } },
            { $project: { UnitName: 1 } },
          ],
        },
      },
      {
        $lookup: {
          from: "itemimages",
          localField: "_id",
          foreignField: "ItemId",
          as: "images",
          pipeline: [
            { $match: { IsDeleted: false } },
            { $sort: { Ordinal: 1 } },
            { $limit: 1 }, 
          ],
        },
      },
      { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$condition", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$priceUnit", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$images", preserveNullAndEmptyArrays: true } },
      { $sort: { CreatedAt: -1 } },
      {
        $project: {
          _id: { $toString: "$_id" },
          ItemGuid: 1,
          Title: 1,
          ownerName: "$owner.fullName",
          categoryName: "$category.name",
          conditionName: "$condition.ConditionName",
          priceUnitName: "$priceUnit.UnitName",
          thumbnailUrl: { $ifNull: ["$images.Url", null] }, 
          createdAt: {
            $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$CreatedAt" },
          },
          viewCount: "$ViewCount",
          basePrice: "$BasePrice",
          currency: "$Currency",
        },
      },
    ];

    const products = await Item.aggregate(pipeline);

    res.json({
      data: products,
    });
  } catch (error) {
    console.error("Error in getPendingProducts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getPendingProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Item.findOne({
      _id: new mongoose.Types.ObjectId(id),
      StatusId: 1,
      IsDeleted: false,
    })
      .populate({
        path: "OwnerId",
        select: "fullName avatarUrl reputationScore bio email",
        model: User,
      })
      .populate({
        path: "CategoryId",
        select: "name description",
        model: Category,
      });

    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found or not pending" });
    }

    const condition = await ItemConditions.findOne({
      ConditionId: product.ConditionId,
      IsDeleted: false,
    }).select("ConditionName");

    const priceUnit = await PriceUnits.findOne({
      UnitId: product.PriceUnitId,
      IsDeleted: false,
    }).select("UnitName");

    const images = await ItemImage.find({
      ItemId: product._id,
      IsDeleted: false,
    }).sort({ Ordinal: 1 });

    res.json({
      ...product.toObject(),
      _id: product._id.toString(),
      images: images.map((img) => ({

        url: img.Url,
        isPrimary: img.IsPrimary,
        ordinal: img.Ordinal,
      })),
      ownerInfo: product.OwnerId,
      categoryName: product.CategoryId?.name || "N/A",
      conditionName: condition?.ConditionName || "N/A",
      priceUnitName: priceUnit?.UnitName || "N/A",
    });
  } catch (error) {
    console.error("Error in getPendingProductDetails:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const approveProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const productToUpdate = await Item.findOne({
      _id: new mongoose.Types.ObjectId(id),
      IsDeleted: false,
    }).populate("OwnerId", "email fullName");

    if (!productToUpdate) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (productToUpdate.StatusId !== 1) {
      return res
        .status(400)
        .json({ message: "Product is not pending approval" });
    }

    const updatedProduct = await Item.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), IsDeleted: false },
      {
        StatusId: 2, // Approved
        UpdatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Log audit 
    await logAudit(
      "items",
      updatedProduct._id,
      "UPDATE",
      req.user._id,
      "Product approved by moderator"
    );

    try {
      const ownerEmail = productToUpdate.OwnerId?.email;
      const ownerName = productToUpdate.OwnerId?.fullName || "User";
      if (ownerEmail) {
        const htmlBody = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { margin:0; padding:0; background:#f5f7fa; font-family:'Inter',sans-serif; }
        .container { max-width:600px; margin:20px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08); }
        .header { background:linear-gradient(135deg,#00c853,#00a045); padding:32px 24px; text-align:center; color:#fff; }
        .header img { height:48px; margin-bottom:12px; }
        .header h1 { margin:0; font-size:28px; font-weight:700; }
        .body { padding:40px 32px; text-align:center; }
        .success-icon { font-size:48px; margin-bottom:20px; }
        .btn { display:inline-block; background:#00c853; color:#fff; font-weight:600; padding:14px 32px; border-radius:12px; text-decoration:none; margin:20px 0; box-shadow:0 4px 12px rgba(0,200,83,0.3); }
        .footer { background:#f9f9f9; padding:24px; text-align:center; color:#666; font-size:13px; }
        @media (max-width:480px) { .body { padding:32px 20px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Sản phẩm đã được duyệt!</h1>
        </div>
        <div class="body">
            <p style="font-size:32px;">🎉</p>
            <p>Xin chào <strong>${ownerName}</strong>,</p>
            <p>Chúng tôi rất vui thông báo sản phẩm của bạn:</p>
            <h2 style="color:#00a045; margin:20px 0;">"${updatedProduct.Title}"</h2>
            <p>đã chính thức được <strong>DUYỆT</strong> và hiển thị công khai trên RetroTrade.</p>
            <a href="https://retrotrade.id.vn/owner/my-products"
   style="display:inline-block;
          background:#00c853;
          color:#000000 !important;
          font-weight:700;
          font-size:17px;
          padding:16px 44px;
          border-radius:50px;
          text-decoration:none;
          box-shadow:0 8px 20px rgba(0,200,83,0.5);
          border:3px solid #009624;"
   target="_blank">
  Xem sản phẩm của tôi
</a>
            <p>Bạn sẽ sớm nhận được lượt xem và đơn thuê mới. Chúc bạn kinh doanh thành công!</p>
            <p>Team RetroTrade ❤️</p>
        </div>
        <div class="footer">
            © 2025 RetroTrade - Nền tảng chia sẻ, cho thuê và tái sử dụng đồ dùng<br>
            Email này được gửi tự động, vui lòng không trả lời.
        </div>
    </div>
</body>
</html>
        `;
        sendEmail(ownerEmail, "Sản phẩm của bạn đã được duyệt trên RetroTrade", htmlBody);
      }

      // Tạo notification
      if (productToUpdate.OwnerId?._id) {
        await Notification.create({
          user: productToUpdate.OwnerId._id,
          notificationType: "Product Approved",
          title: "Duyệt sản phẩm",
          body: `Sản phẩm "${updatedProduct.Title}" đã được duyệt.`,
          metaData: JSON.stringify({ itemId: updatedProduct._id }),
          isRead: false,
        });
      }
    } catch (notificationError) {
      console.error("Error in notification/email for approve:", notificationError);
    }

    res.json({
      message: "Sản phẩm đã được duyệt thành công",
      itemId: updatedProduct._id.toString(),
    });
  } catch (error) {
    console.error("Error in approveProduct:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const rejectProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const productToUpdate = await Item.findOne({
      _id: new mongoose.Types.ObjectId(id),
      IsDeleted: false,
    }).populate("OwnerId", "email fullName");

    if (!productToUpdate) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (productToUpdate.StatusId !== 1) {
      return res
        .status(400)
        .json({ message: "Product is not pending approval" });
    }

    const updatedProduct = await Item.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), IsDeleted: false },
      {
        StatusId: 3, // Rejected
        UpdatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    await ItemReject.create({
      ItemId: updatedProduct._id,
      RejectReason: reason || "No reason provided",
    });

    await logAudit(
      "items",
      updatedProduct._id,
      "UPDATE",
      req.user._id,
      `Product rejected by moderator: ${reason || "No reason provided"}`
    );

    try {
      const ownerEmail = productToUpdate.OwnerId?.email;
      const ownerName = productToUpdate.OwnerId?.fullName || "User";
      if (ownerEmail) {
        const htmlBody = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { margin:0; padding:0; background:#f5f7fa; font-family:'Inter',sans-serif; }
        .container { max-width:600px; margin:20px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08); }
        .header { background:linear-gradient(135deg,#ff3b30,#d32f2f); padding:32px 24px; text-align:center; color:#fff; }
        .header img { height:48px; margin-bottom:12px; }
        .header h1 { margin:0; font-size:28px; font-weight:700; }
        .body { padding:40px 32px; text-align:center; }
        .alert-icon { font-size:48px; margin-bottom:20px; }
        .btn { display:inline-block; background:#ff3b30; color:#fff; font-weight:600; padding:14px 32px; border-radius:12px; text-decoration:none; margin:20px 0; box-shadow:0 4px 12px rgba(255,59,48,0.3); }
        .reason-box { background:#fff8e1; border-left:4px solid #ffb300; padding:16px; margin:24px 0; text-align:left; border-radius:0 8px 8px 0; }
        .footer { background:#f9f9f9; padding:24px; text-align:center; color:#666; font-size:13px; }
        @media (max-width:480px) { .body { padding:32px 20px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Sản phẩm bị từ chối</h1>
        </div>
        <div class="body">
            <p style="font-size:32px;">⚠️</p>
            <p>Xin chào <strong>${ownerName}</strong>,</p>
            <p>Chúng tôi rất tiếc phải thông báo rằng sản phẩm của bạn:</p>
            <h2 style="color:#d32f2f; margin:20px 0;">"${
              updatedProduct.Title
            }"</h2>
            <p>chưa đạt tiêu chuẩn và <strong>bị từ chối</strong>.</p>

            <div class="reason-box">
                <strong>Lý do từ chối:</strong><br>
                ${
                  reason ||
                  "Vui lòng kiểm tra lại hình ảnh, mô tả và chính sách đăng sản phẩm."
                }
            </div>

            <p>Bạn có thể chỉnh sửa sản phẩm và gửi duyệt lại bất cứ lúc nào.</p>
            <a href="https://retrotrade.id.vn/owner/my-products"
   style="display:inline-block;
          background:#ff5252;
          color:#ffffff !important;
          font-weight:700;
          font-size:17px;
          padding:16px 44px;
          border-radius:50px;
          text-decoration:none;
          box-shadow:0 10px 25px rgba(255,82,82,0.4);
          border:3px solid #d32f2f;"
   target="_blank">
  Chỉnh sửa sản phẩm
</a>
            <p>Nếu cần hỗ trợ, hãy chat trực tiếp với chúng tôi nhé!</p>
            <p>Team RetroTrade ❤️</p>
        </div>
        <div class="footer">
            ©2025 RetroTrade - Nền tảng chia sẻ, cho thuê và tái sử dụng đồ dùng<br>
            Email này được gửi tự động, vui lòng không trả lời.
        </div>
    </div>
</body>
</html>
        `;
        sendEmail(ownerEmail, "Sản phẩm của bạn bị từ chối trên RetroTrade", htmlBody);
      }

      // Tạo notification 
      if (productToUpdate.OwnerId?._id) {
        await Notification.create({
          user: productToUpdate.OwnerId._id,
          notificationType: "Product Rejected",
          title: "Từ chối sản phẩm",
          body: `Sản phẩm "${updatedProduct.Title}" bị từ chối. Lý do: ${reason || "N/A"}.`,
          metaData: JSON.stringify({ itemId: updatedProduct._id, reason }),
          isRead: false,
        });
      }
    } catch (notificationError) {
      console.error("Error in notification/email for reject:", notificationError);
    }

    res.json({
      message: "Sản phẩm đã bị từ chối thành công",
      itemId: updatedProduct._id.toString(),
      reason: reason || null,
    });
  } catch (error) {
    console.error("Error in rejectProduct:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getTopProductsForHighlight = async (req, res) => {
  try {
    const topItems = await Item.aggregate([
      { $match: { StatusId: 2, IsDeleted: false } },
      // Tính score: ViewCount * 0.1 + FavoriteCount * 0.3 + RentCount * 0.6
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ['$ViewCount', 0.1] },
              { $multiply: ['$FavoriteCount', 0.3] },
              { $multiply: ['$RentCount', 0.6] }
            ]
          }
        }
      },
      { $sort: { score: -1 } },
      { $limit: 20 }, //số lượng sản phẩm lấy ra
      {
        $lookup: {
          from: "users",
          localField: "OwnerId",
          foreignField: "_id",
          as: "owner",
          pipeline: [{ $project: { fullName: 1 } }]
        }
      },
      { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "CategoryId",
          foreignField: "_id",
          as: "category",
          pipeline: [{ $project: { name: 1 } }]
        }
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "itemimages",
          localField: "_id",
          foreignField: "ItemId",
          as: "images",
          pipeline: [
            { $match: { IsDeleted: false } },
            { $sort: { Ordinal: 1 } },
            { $limit: 1 }
          ]
        }
      },
      { $unwind: { path: "$images", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: { $toString: "$_id" },
          Title: 1,
          BasePrice: 1,
          Currency: 1,
          IsHighlighted: 1,
          ViewCount: 1,
          FavoriteCount: 1,
          RentCount: 1,
          score: { $round: ["$score", 0] },
          ownerName: "$owner.fullName",
          categoryName: "$category.name",
          thumbnailUrl: { $ifNull: ["$images.Url", "/placeholder-image.jpg"] },
          CreatedAt: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: topItems,
      message: 'Top sản phẩm nổi bật nhất'
    });
  } catch (error) {
    console.error("Error in getTopProductsForHighlight:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const toggleHighlight = async (req, res) => {
  try {
    const { id } = req.params;
    const { isHighlighted } = req.body;

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
    }
    if (item.IsDeleted || item.StatusId !== 2) { 
      return res.status(400).json({ success: false, message: 'Không thể highlight sản phẩm này' });
    }

    const newValue = isHighlighted !== undefined ? isHighlighted : !item.IsHighlighted;
    item.IsHighlighted = newValue;
    await item.save();

    // Log audit
    await logAudit(
      "items",
      item._id,
      "UPDATE",
      req.user._id,
      `Product ${newValue ? 'highlighted' : 'unhighlighted'} by moderator`
    );

    if (newValue) {
      try {
        await Notification.create({
          user: item.OwnerId,
          notificationType: "Product Highlighted",
          title: "Sản phẩm nổi bật",
          body: `Sản phẩm "${item.Title}" đã được là sản phẩm nổi bật.`,
          metaData: JSON.stringify({ itemId: item._id }),
          isRead: false,
        });
      } catch (notificationError) {
        console.error("Lỗi thông báo nổi bật:", notificationError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Đã ${newValue ? 'highlight' : 'bỏ highlight'} sản phẩm thành công`,
      data: { IsHighlighted: newValue }
    });
  } catch (error) {
    console.error("Error in toggleHighlight:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getPendingProducts,
  getPendingProductDetails,
  approveProduct,
  rejectProduct,
  getTopProductsForHighlight,
  toggleHighlight,
};