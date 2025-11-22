const mongoose = require("mongoose");
const { Types } = mongoose;
const User = require("../../models/User.model");
const LoyaltyPointTransaction = require("../../models/LoyaltyPointTransaction.model");
const Discount = require("../../models/Discount/Discount.model");
const DiscountAssignment = require("../../models/Discount/DiscountAssignment.model");
const { generateString } = require("../../utils/generateString");

/**
 * Thêm RT Points cho user
 * @param {string} userId - User ID
 * @param {number} points - Số điểm
 * @param {string} type - Loại transaction
 * @param {string} description - Mô tả
 * @param {object} options - Options: orderId, expiresAt, metadata
 * @returns {Promise<{success: boolean, transaction?: object, error?: string}>}
 */
async function addPoints(userId, points, type, description, options = {}) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Lấy user và cập nhật points
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return { success: false, error: "User not found" };
    }

    const newBalance = (user.points || 0) + points;

    // Tạo transaction record
    const transaction = await LoyaltyPointTransaction.create(
      [
        {
          userId,
          points,
          balance: newBalance,
          type,
          description,
          orderId: options.orderId,
          expiresAt: options.expiresAt,
          metadata: options.metadata || {},
        },
      ],
      { session }
    );

    // Cập nhật user points
    await User.findByIdAndUpdate(
      userId,
      { points: newBalance },
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      transaction: transaction[0],
      newBalance,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error adding loyalty points:", error);
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

/**
 * Cộng điểm khi đăng nhập hàng ngày
 */
async function addDailyLoginPoints(userId) {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));

  // Kiểm tra xem đã cộng điểm hôm nay chưa
  const todayTransaction = await LoyaltyPointTransaction.findOne({
    userId,
    type: "daily_login",
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  if (todayTransaction) {
    return {
      success: false,
      alreadyClaimed: true,
      message: "Đã nhận điểm đăng nhập hôm nay",
    };
  }

  // Cộng 10 RT Points cho đăng nhập hàng ngày
  const result = await addPoints(
    userId,
    10,
    "daily_login",
    "Đăng nhập hàng ngày - +10 RT Points",
    {
      expiresAt: null, // Không hết hạn
    }
  );

  return result;
}

/**
 * Cộng điểm khi đặt hàng thành công
 */
async function addOrderPoints(userId, orderId, orderAmount) {
  // Tính điểm: 1 RT Point cho mỗi 10,000 VND (làm tròn)
  const points = Math.floor(orderAmount / 10000);

  if (points <= 0) {
    return {
      success: false,
      message: "Đơn hàng quá nhỏ để nhận điểm",
    };
  }

  const result = await addPoints(
    userId,
    points,
    "order_completed",
    `Đặt hàng thành công - +${points} RT Points (${orderAmount.toLocaleString("vi-VN")}₫)`,
    {
      orderId,
      expiresAt: null, // Không hết hạn
    }
  );

  return result;
}

/**
 * Lấy lịch sử RT Points của user
 */
async function getLoyaltyHistory(userId, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      LoyaltyPointTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LoyaltyPointTransaction.countDocuments({ userId }),
    ]);

    return {
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error getting loyalty history:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Trừ RT Points từ user
 * @param {string} userId - User ID
 * @param {number} points - Số điểm cần trừ (số dương)
 * @param {string} type - Loại transaction
 * @param {string} description - Mô tả
 * @param {object} options - Options: orderId, expiresAt, metadata
 * @returns {Promise<{success: boolean, transaction?: object, error?: string}>}
 */
async function deductPoints(userId, points, type, description, options = {}) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Lấy user và kiểm tra số dư
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return { success: false, error: "User not found" };
    }

    const currentBalance = user.points || 0;
    if (currentBalance < points) {
      await session.abortTransaction();
      return { success: false, error: "Không đủ RT Points để thực hiện" };
    }

    const newBalance = currentBalance - points;

    // Tạo transaction record (số âm)
    const transaction = await LoyaltyPointTransaction.create(
      [
        {
          userId,
          points: -points, // Số âm để trừ
          balance: newBalance,
          type,
          description,
          orderId: options.orderId,
          expiresAt: options.expiresAt,
          metadata: options.metadata || {},
        },
      ],
      { session }
    );

    // Cập nhật user points
    await User.findByIdAndUpdate(
      userId,
      { points: newBalance },
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      transaction: transaction[0],
      newBalance,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error deducting loyalty points:", error);
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

/**
 * Quy đổi RT Points sang discount
 * @param {string} userId - User ID
 * @param {number} points - Số điểm muốn quy đổi
 * @returns {Promise<{success: boolean, discount?: object, error?: string}>}
 */
async function convertPointsToDiscount(userId, points) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Mapping điểm sang phần trăm discount
    const DISCOUNT_OPTIONS = {
      5000: 5,   // 5000 điểm = 5% discount
      10000: 10, // 10000 điểm = 10% discount
      20000: 20, // 20000 điểm = 20% discount
    };

    // Kiểm tra số điểm có hợp lệ không
    if (!DISCOUNT_OPTIONS[points]) {
      return { 
        success: false, 
        error: "Chỉ có thể quy đổi 5000 điểm (5%), 10000 điểm (10%), hoặc 20000 điểm (20%)" 
      };
    }

    const discountPercent = DISCOUNT_OPTIONS[points];

    // Kiểm tra số dư
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return { success: false, error: "User not found" };
    }

    if ((user.points || 0) < points) {
      await session.abortTransaction();
      return { success: false, error: "Không đủ RT Points để quy đổi" };
    }

    // Tạo discount
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    // Generate unique code (uppercase để đảm bảo consistency)
    let code;
    let attempts = 0;
    while (!code && attempts < 10) {
      const candidate = generateString(8).toUpperCase();
      // Tìm kiếm case-insensitive để tránh duplicate
      const exists = await Discount.findOne({ 
        $or: [
          { code: candidate },
          { code: { $regex: new RegExp(`^${candidate}$`, 'i') } }
        ]
      }).session(session);
      if (!exists) {
        code = candidate;
        break;
      }
      attempts++;
    }
    
    if (!code) {
      await session.abortTransaction();
      return { success: false, error: "Không thể tạo mã discount, vui lòng thử lại" };
    }

    const discount = await Discount.create(
      [
        {
          code: code, // Set code explicitly
          type: "percent",
          value: discountPercent, // Phần trăm giảm giá
          maxDiscountAmount: 0, // Không giới hạn số tiền tối đa (hoặc có thể set giới hạn)
          minOrderAmount: 0,
          startAt: now,
          endAt: oneMonthLater,
          usageLimit: 0, // Không giới hạn tổng (vì đã có perUserLimit trong assignment)
          usedCount: 0,
          isPublic: false, // Private discount
          allowedUsers: [userId], // Thêm vào allowedUsers để có thể query trong listAvailable
          active: true,
          createdBy: userId,
          notes: `Discount ${discountPercent}% từ quy đổi ${points} RT Points`,
        },
      ],
      { session }
    );
    
    // Verify discount was created with code
    console.log("Created discount:", {
      _id: discount[0]._id,
      code: discount[0].code,
      isPublic: discount[0].isPublic,
      allowedUsers: discount[0].allowedUsers,
      active: discount[0].active
    });

    // Tạo DiscountAssignment để user có thể sử dụng discount
    await DiscountAssignment.create(
      [
        {
          discountId: discount[0]._id,
          userId: userId,
          perUserLimit: 1, // Chỉ dùng được 1 lần
          usedCount: 0,
          effectiveFrom: now,
          effectiveTo: oneMonthLater,
          active: true,
        },
      ],
      { session }
    );

    // Trừ điểm (cần gọi trong cùng session)
    const currentBalance = (user.points || 0) - points;
    const newBalance = currentBalance;

    // Tạo transaction record (số âm)
    const transaction = await LoyaltyPointTransaction.create(
      [
        {
          userId,
          points: -points, // Số âm để trừ
          balance: newBalance,
          type: "points_to_discount",
          description: `Quy đổi ${points} RT Points sang discount ${discountPercent}%`,
          metadata: { discountId: discount[0]._id, discountPercent: discountPercent },
        },
      ],
      { session }
    );

    // Cập nhật user points
    await User.findByIdAndUpdate(
      userId,
      { points: newBalance },
      { session }
    );

    await session.commitTransaction();
    
    // Reload discount sau khi commit để đảm bảo có đầy đủ thông tin
    const savedDiscount = await Discount.findById(discount[0]._id).lean();
    console.log("Discount after commit:", {
      _id: savedDiscount?._id,
      code: savedDiscount?.code,
      isPublic: savedDiscount?.isPublic,
      active: savedDiscount?.active,
      allowedUsers: savedDiscount?.allowedUsers
    });

    return {
      success: true,
      discount: savedDiscount || discount[0],
      pointsUsed: points,
      discountPercent: discountPercent,
      newBalance: newBalance,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error converting points to discount:", error);
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

/**
 * Lấy thống kê RT Points của user
 */
async function getLoyaltyStats(userId) {
  try {
    const user = await User.findById(userId).select("points").lean();
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const [totalEarned, totalSpent] = await Promise.all([
      LoyaltyPointTransaction.aggregate([
        { $match: { userId: new Types.ObjectId(userId), points: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$points" } } },
      ]),
      LoyaltyPointTransaction.aggregate([
        { $match: { userId: new Types.ObjectId(userId), points: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: "$points" } } },
      ]),
    ]);

    const totalEarnedPoints = totalEarned[0]?.total || 0;
    const totalSpentPoints = Math.abs(totalSpent[0]?.total || 0);

    return {
      success: true,
      data: {
        currentBalance: user.points || 0,
        totalEarned: totalEarnedPoints,
        totalSpent: totalSpentPoints,
      },
    };
  } catch (error) {
    console.error("Error getting loyalty stats:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  addPoints,
  deductPoints,
  addDailyLoginPoints,
  addOrderPoints,
  getLoyaltyHistory,
  getLoyaltyStats,
  convertPointsToDiscount,
};

