const mongoose = require("mongoose");
const Discount = require("../../models/Discount/Discount.model");
const DiscountAssignment = require("../../models/Discount/DiscountAssignment.model");
const { generateString } = require("../../utils/generateString");

function clampDiscountAmount(type, value, baseAmount, maxDiscountAmount) {
    // Tính số tiền được giảm
    // Nếu là percent: số tiền = tiền thuê * tỉ lệ (%)
    // Nếu là fixed: số tiền = giá trị cố định
    let amount = type === "percent" ? (baseAmount * value) / 100 : value;
    
    // Không được vượt quá giá tiền tối đa có thể giảm (nếu có)
    if (maxDiscountAmount && maxDiscountAmount > 0) {
        amount = Math.min(amount, maxDiscountAmount);
    }
    
    // Đảm bảo số tiền giảm không âm và không vượt quá baseAmount
    amount = Math.max(0, Math.min(baseAmount, Math.floor(amount)));
    return amount;
}

module.exports = {
    create: async (req, res) => {
        try {
            const {
                type,
                value,
                maxDiscountAmount = 0,
                minOrderAmount = 0,
                startAt,
                endAt,
                usageLimit = 0,
                ownerId,
                itemId,
                notes,
                codeLength = 10,
                codePrefix,
                isPublic = true,
                allowedUsers = [],
            } = req.body;

            if (!type || value == null || !startAt || !endAt) {
                return res.status(400).json({ status: "error", message: "Thiếu dữ liệu bắt buộc" });
            }
            if (!["percent", "fixed"].includes(type)) {
                return res.status(400).json({ status: "error", message: "Loại giảm giá không hợp lệ" });
            }
            if (new Date(endAt) <= new Date(startAt)) {
                return res.status(400).json({ status: "error", message: "Thời gian kết thúc phải sau thời gian bắt đầu" });
            }

            // Chuẩn hóa và validate theo loại giảm giá
            let normalizedValue = Number(value);
            let normalizedMax = Number(maxDiscountAmount) || 0;
            let normalizedMinOrder = Number(minOrderAmount) || 0;
            if (type === "percent") {
                if (!(normalizedValue >= 0 && normalizedValue <= 100)) {
                    return res.status(400).json({ status: "error", message: "Giá trị phần trăm phải từ 0 đến 100" });
                }
                // phần trăm cho phép số lẻ, giới hạn 1 chữ số thập phân
                normalizedValue = Math.max(0, Math.min(100, Number.isFinite(normalizedValue) ? normalizedValue : 0));
            } else if (type === "fixed") {
                // Cố định: tiền tệ VNĐ, làm tròn xuống đơn vị đồng
                normalizedValue = Math.max(0, Math.floor(Number.isFinite(normalizedValue) ? normalizedValue : 0));
                normalizedMax = Math.max(0, Math.floor(normalizedMax));
                normalizedMinOrder = Math.max(0, Math.floor(normalizedMinOrder));
                if (normalizedValue <= 0) {
                    return res.status(400).json({ status: "error", message: "Giá trị giảm cố định (VNĐ) phải lớn hơn 0" });
                }
            }

            let code;
            const rawPrefix = (codePrefix || "").toString().toUpperCase();
            const sanitizedPrefix = rawPrefix.replace(/[^A-Z0-9]/g, "");
            const targetTotalLen = Math.max(1, Math.min(32, Number(codeLength) || 10));
            const prefixLen = Math.min(sanitizedPrefix.length, targetTotalLen);
            const randomLen = Math.max(0, targetTotalLen - prefixLen);
            for (let i = 0; i < 5; i++) {
                const suffix = randomLen > 0 ? generateString(randomLen).toUpperCase() : "";
                const candidate = (sanitizedPrefix.slice(0, prefixLen) + suffix).toUpperCase();
                // eslint-disable-next-line no-await-in-loop
                const exists = await Discount.exists({ code: candidate });
                if (!exists) {
                    code = candidate;
                    break;
                }
            }
            if (!code) {
                return res.status(500).json({ status: "error", message: "Tạo mã giảm giá thất bại, vui lòng thử lại" });
            }

            const doc = await Discount.create({
                code,
                type,
                value: normalizedValue,
                maxDiscountAmount: normalizedMax,
                minOrderAmount: normalizedMinOrder,
                startAt,
                endAt,
                usageLimit,
                ownerId,
                itemId,
                notes,
                isPublic: Boolean(isPublic),
                allowedUsers: Array.isArray(allowedUsers) ? allowedUsers : [],
                createdBy: req.user?._id,
            });

            return res.status(201).json({ status: "success", message: type === "fixed" ? "Tạo mã giảm giá thành công (đơn vị VNĐ)" : "Tạo mã giảm giá thành công", data: doc });
        } catch (err) {
            return res.status(500).json({ status: "error", message: "Lỗi máy chủ", error: err.message });
        }
    },

    list: async (req, res) => {
        try {
            const { active, ownerId, itemId, page = 1, limit = 20 } = req.query;
            const filter = {};
            if (active != null) filter.active = String(active) === "true";
            if (ownerId) filter.ownerId = ownerId;
            if (itemId) filter.itemId = itemId;
            const skip = (Number(page) - 1) * Number(limit);
            const [rows, total] = await Promise.all([
                Discount.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
                Discount.countDocuments(filter),
            ]);
            return res.json({ status: "success", message: "Thành công", data: rows, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
        } catch (err) {
            return res.status(500).json({ status: "error", message: "Không thể tải danh sách", error: err.message });
        }
    },

    getByCode: async (req, res) => {
        try {
            const { code } = req.params;
            const doc = await Discount.findOne({ code: code?.toUpperCase() }).lean();
            if (!doc) return res.status(404).json({ status: "error", message: "Không tìm thấy mã giảm giá" });
            return res.json({ status: "success", message: "Thành công", data: doc });
        } catch (err) {
            return res.status(500).json({ status: "error", message: "Lỗi khi lấy thông tin mã giảm giá", error: err.message });
        }
    },

    deactivate: async (req, res) => {
        try {
            const { id } = req.params;
            const updated = await Discount.findByIdAndUpdate(id, { active: false }, { new: true });
            if (!updated) return res.status(404).json({ status: "error", message: "Không tìm thấy mã giảm giá" });
            return res.json({ status: "success", message: "Đã vô hiệu hóa mã giảm giá", data: updated });
        } catch (err) {
            return res.status(500).json({ status: "error", message: "Vô hiệu hóa thất bại", error: err.message });
        }
    },

  activate: async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await Discount.findByIdAndUpdate(id, { active: true }, { new: true });
      if (!updated) return res.status(404).json({ status: "error", message: "Không tìm thấy mã giảm giá" });
      return res.json({ status: "success", message: "Đã kích hoạt mã giảm giá", data: updated });
    } catch (err) {
      return res.status(500).json({ status: "error", message: "Kích hoạt thất bại", error: err.message });
    }
  },

  assignUsers: async (req, res) => {
    try {
      const { id } = req.params;
      const { userIds = [], perUserLimit = 1, effectiveFrom, effectiveTo } = req.body;
      if (!Array.isArray(userIds)) {
        return res.status(400).json({ status: "error", message: "Danh sách người dùng không hợp lệ" });
      }
      
      // Kiểm tra discount trước khi gán
      const discount = await Discount.findById(id).lean();
      if (!discount) {
        return res.status(404).json({ status: "error", message: "Không tìm thấy mã giảm giá" });
      }
      
      // Không cho phép gán discount công khai với người dùng
      if (discount.isPublic === true) {
        return res.status(400).json({ 
          status: "error", 
          message: "Không thể gán discount công khai với người dùng. Discount công khai có thể được sử dụng bởi tất cả người dùng." 
        });
      }
      
      const updated = await Discount.findByIdAndUpdate(id, { isPublic: false }, { new: true });
      if (!updated) return res.status(404).json({ status: "error", message: "Không tìm thấy mã giảm giá" });

      const ops = userIds.map((uid) => ({
        updateOne: {
          filter: { discountId: id, userId: uid },
          update: {
            $setOnInsert: { usedCount: 0 },
            $set: {
              perUserLimit: Math.max(0, Number(perUserLimit) || 1),
              effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
              effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
              active: true,
            },
          },
          upsert: true,
        },
      }));

      if (ops.length > 0) {
        await DiscountAssignment.bulkWrite(ops);
      }
      return res.json({ status: "success", message: "Đã gán người dùng cho mã", data: updated });
    } catch (err) {
      return res.status(500).json({ status: "error", message: "Gán người dùng thất bại", error: err.message });
    }
  },

  setPublic: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Xóa tất cả assignment cũ khi set discount thành công khai
      // Vì discount công khai không cần assignment (tất cả người dùng đều có thể sử dụng)
      await DiscountAssignment.deleteMany({ discountId: id });
      
      const updated = await Discount.findByIdAndUpdate(
        id,
        { isPublic: true },
        { new: true }
      );
      if (!updated) return res.status(404).json({ status: "error", message: "Không tìm thấy mã giảm giá" });
      return res.json({ status: "success", message: "Đã đặt mã ở chế độ công khai. Tất cả assignment cũ đã được xóa.", data: updated });
    } catch (err) {
      return res.status(500).json({ status: "error", message: "Cập nhật thất bại", error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        type,
        value,
        maxDiscountAmount = 0,
        minOrderAmount = 0,
        startAt,
        endAt,
        usageLimit = 0,
        notes,
        isPublic,
      } = req.body;

      const discount = await Discount.findById(id);
      if (!discount) {
        return res.status(404).json({ status: "error", message: "Không tìm thấy mã giảm giá" });
      }

      // Validate dữ liệu
      if (type && !["percent", "fixed"].includes(type)) {
        return res.status(400).json({ status: "error", message: "Loại giảm giá không hợp lệ" });
      }

      if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
        return res.status(400).json({ status: "error", message: "Thời gian kết thúc phải sau thời gian bắt đầu" });
      }

      // Chuẩn hóa giá trị
      const updateData = {};
      
      if (type !== undefined) updateData.type = type;
      
      if (value !== undefined) {
        let normalizedValue = Number(value);
        const currentType = type !== undefined ? type : discount.type;
        if (currentType === "percent") {
          if (!(normalizedValue >= 0 && normalizedValue <= 100)) {
            return res.status(400).json({ status: "error", message: "Giá trị phần trăm phải từ 0 đến 100" });
          }
          normalizedValue = Math.max(0, Math.min(100, Number.isFinite(normalizedValue) ? normalizedValue : 0));
        } else {
          normalizedValue = Math.max(0, Math.floor(Number.isFinite(normalizedValue) ? normalizedValue : 0));
          if (normalizedValue <= 0) {
            return res.status(400).json({ status: "error", message: "Giá trị giảm cố định (VNĐ) phải lớn hơn 0" });
          }
        }
        updateData.value = normalizedValue;
      }

      if (maxDiscountAmount !== undefined) {
        const normalizedMax = Math.max(0, Math.floor(Number(maxDiscountAmount) || 0));
        updateData.maxDiscountAmount = normalizedMax;
      }

      if (minOrderAmount !== undefined) {
        const normalizedMinOrder = Math.max(0, Math.floor(Number(minOrderAmount) || 0));
        updateData.minOrderAmount = normalizedMinOrder;
      }

      if (startAt !== undefined) updateData.startAt = startAt;
      if (endAt !== undefined) updateData.endAt = endAt;
      if (usageLimit !== undefined) updateData.usageLimit = Number(usageLimit) || 0;
      if (notes !== undefined) updateData.notes = notes;
      
      // Nếu set discount thành công khai, xóa tất cả assignment cũ
      // Vì discount công khai không cần assignment (tất cả người dùng đều có thể sử dụng)
      if (isPublic !== undefined && isPublic === true) {
        await DiscountAssignment.deleteMany({ discountId: id });
      }
      
      if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);

      const updated = await Discount.findByIdAndUpdate(id, updateData, { new: true });
      if (!updated) {
        return res.status(404).json({ status: "error", message: "Không tìm thấy mã giảm giá" });
      }

      return res.json({ status: "success", message: "Cập nhật mã giảm giá thành công", data: updated });
    } catch (err) {
      return res.status(500).json({ status: "error", message: "Cập nhật thất bại", error: err.message });
    }
  },

  // === USER-FACING ===
  listAvailable: async (req, res) => {
    try {
      const { ownerId, itemId, page = 1, limit = 20 } = req.query;
      const now = new Date();
      // Filter: chỉ lấy discount public + active, KHÔNG filter thời gian
      // Frontend sẽ tự filter để chỉ hiển thị discount có thể sử dụng ngay
      const filter = {
        active: true,
        isPublic: true,
      };
      if (ownerId) filter.ownerId = ownerId;
      if (itemId) filter.itemId = itemId;
      const skip = (Number(page) - 1) * Number(limit);
      
      // Lấy user assignments với filter effectiveFrom/effectiveTo
      const userAssignmentsQuery = req.user?._id 
        ? DiscountAssignment.find({ 
            userId: req.user._id, 
            active: true,
            $and: [
              {
                $or: [
                  { effectiveFrom: { $exists: false } },
                  { effectiveFrom: null },
                  { effectiveFrom: { $lte: now } }
                ]
              },
              {
                $or: [
                  { effectiveTo: { $exists: false } },
                  { effectiveTo: null },
                  { effectiveTo: { $gte: now } }
                ]
              }
            ]
          }).select("discountId").lean()
        : Promise.resolve([]);
      
      // Lấy private discounts từ allowedUsers (discounts từ quy đổi RT Points)
      const privateDiscountsFromAllowedUsers = req.user?._id
        ? Discount.find({
            active: true,
            isPublic: false,
            allowedUsers: req.user._id,
            // Không filter thời gian - frontend sẽ tự filter
          }).sort({ createdAt: -1 }).lean()
        : Promise.resolve([]);
      
      const [publicRows, publicTotal, userAssignments, privateFromAllowedUsers] = await Promise.all([
        Discount.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        Discount.countDocuments(filter),
        userAssignmentsQuery,
        privateDiscountsFromAllowedUsers,
      ]);
      
      // Filter assignments properly (double check với date)
      const validAssignments = userAssignments.filter(assignment => {
        const from = assignment.effectiveFrom ? new Date(assignment.effectiveFrom) : null;
        const to = assignment.effectiveTo ? new Date(assignment.effectiveTo) : null;
        if (from && now < from) return false;
        if (to && now > to) return false;
        return true;
      });
      
      const assignedIds = validAssignments.map(a => a.discountId);
      const assignedIdsSet = new Set(assignedIds.map(id => String(id)));
      const claimedIds = new Set(validAssignments.map(a => String(a.discountId)));
      
      // Lấy TẤT CẢ discount được assign (bất kể isPublic) - không paginate để đảm bảo user thấy tất cả discount được assign
      // KHÔNG filter thời gian - frontend sẽ tự filter để chỉ hiển thị discount có thể sử dụng ngay
      const allAssignedDiscounts = assignedIds.length
        ? await Discount.find({
            _id: { $in: assignedIds },
            active: true,
            // Không filter startAt/endAt - lấy tất cả discount active được assign
            // Không filter isPublic để lấy cả discount công khai được assign
            // Không filter ownerId/itemId ở đây vì đây là discount được assign cho user
            // User có quyền sử dụng discount đã được assign, không cần match ownerId/itemId
          })
            .sort({ createdAt: -1 })
            .lean()
        : [];
      
      // Loại bỏ duplicate giữa assigned discounts và private discounts từ allowedUsers
      const privateFromAllowedUsersIds = new Set(privateFromAllowedUsers.map(d => String(d._id)));
      const assignedPrivateDiscountsFromAllowed = privateFromAllowedUsers.filter(
        d => !assignedIdsSet.has(String(d._id))
      );
      
      // Phân loại assigned discounts thành public và private
      const assignedPublicDiscounts = allAssignedDiscounts.filter(d => d.isPublic === true);
      const assignedPrivateDiscounts = allAssignedDiscounts.filter(d => d.isPublic === false);
      
      // Kết hợp private discounts từ assignments và allowedUsers
      const allPrivateDiscounts = [...assignedPrivateDiscounts, ...assignedPrivateDiscountsFromAllowed];
      
      // Loại bỏ các discount đã được assign khỏi publicRows để tránh duplicate
      const assignedPublicIdsSet = new Set(assignedPublicDiscounts.map(d => String(d._id)));
      const publicRowsFiltered = publicRows.filter(row => !assignedPublicIdsSet.has(String(row._id)));
      
      // Public rows: lấy discount công khai KHÔNG được assign + đánh dấu claimed cho các discount được assign
      const publicRowsWithClaimStatus = publicRowsFiltered.map(row => ({
        ...row,
        isClaimed: claimedIds.has(String(row._id)),
      }));
      
      // Thêm các discount công khai được assign vào public rows (với isClaimed: true)
      const assignedPublicRowsWithClaimStatus = assignedPublicDiscounts.map(row => ({
        ...row,
        isClaimed: true, // Đã được assign
      }));
      
      // Private rows: discount riêng tư được assign hoặc từ allowedUsers
      const privateRowsWithClaimStatus = allPrivateDiscounts.map(row => ({
        ...row,
        isClaimed: true, // Private rows đã được assign hoặc từ allowedUsers nên mặc định là claimed
      }));
      
      // Kết hợp: public (không assign) + public (đã assign) + private (đã assign + từ allowedUsers)
      const rows = [...publicRowsWithClaimStatus, ...assignedPublicRowsWithClaimStatus, ...privateRowsWithClaimStatus];
      const total = publicTotal + assignedPublicDiscounts.length + allPrivateDiscounts.length; // approximate
      return res.json({ status: "success", message: "Thành công", data: rows, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
    } catch (err) {
      return res.status(500).json({ status: "error", message: "Không thể tải danh sách mã", error: err.message });
    }
  },

  getPublicByCode: async (req, res) => {
    try {
      const { code } = req.params;
      const now = new Date();
      const doc = await Discount.findOne({ code: code?.toUpperCase(), active: true, startAt: { $lte: now }, endAt: { $gte: now } }).lean();
      if (!doc) return res.status(404).json({ status: "error", message: "Mã không khả dụng" });
      if (!doc.isPublic) {
        const assign = await DiscountAssignment.findOne({ discountId: doc._id, userId: req.user?._id, active: true }).lean();
        if (!assign) return res.status(403).json({ status: "error", message: "Bạn không được phép sử dụng mã này" });
        if (assign.effectiveFrom && now < new Date(assign.effectiveFrom)) return res.status(403).json({ status: "error", message: "Mã chưa đến thời gian sử dụng" });
        if (assign.effectiveTo && now > new Date(assign.effectiveTo)) return res.status(403).json({ status: "error", message: "Mã đã hết thời gian sử dụng" });
        if (assign.perUserLimit > 0 && (assign.usedCount || 0) >= assign.perUserLimit) return res.status(403).json({ status: "error", message: "Bạn đã dùng hết số lần cho phép" });
      }
      return res.json({ status: "success", message: "Thành công", data: doc });
    } catch (err) {
      return res.status(500).json({ status: "error", message: "Lỗi khi lấy thông tin mã", error: err.message });
    }
  },

  publicValidate: async (req, res) => {
    try {
      const { code, baseAmount, ownerId, itemId } = req.body;
      if (!code || baseAmount == null) {
        return res.status(400).json({ status: "error", message: "Thiếu mã hoặc tổng tiền" });
      }
      
      console.log("[DISCOUNT] publicValidate called:", {
        code: code?.toUpperCase()?.trim(),
        baseAmount,
        ownerId,
        itemId,
        userId: req.user?._id
      });
      
      const result = await module.exports.validateAndCompute({ 
        code, 
        baseAmount: Number(baseAmount), 
        ownerId, 
        itemId, 
        userId: req.user?._id 
      });
      
      console.log("[DISCOUNT] validateAndCompute result:", {
        valid: result.valid,
        reason: result.reason,
        code: code?.toUpperCase()?.trim()
      });
      
      if (!result.valid) {
        return res.status(400).json({ status: "error", message: "Mã không hợp lệ hoặc không áp dụng", reason: result.reason });
      }
      return res.json({ status: "success", message: "Áp dụng mã thành công", data: { amount: result.amount, discount: result.discount } });
    } catch (err) {
      console.error("[DISCOUNT] publicValidate error:", err);
      return res.status(500).json({ status: "error", message: "Lỗi xác thực mã", error: err.message });
    }
  },

  // Claim a public discount (add to user's account)
  claimDiscount: async (req, res) => {
    try {
      const { discountId } = req.body;
      const userId = req.user?._id;
      
      if (!discountId) {
        return res.status(400).json({ status: "error", message: "Thiếu mã giảm giá" });
      }
      
      if (!userId) {
        return res.status(401).json({ status: "error", message: "Chưa đăng nhập" });
      }

      const now = new Date();
      const discount = await Discount.findOne({ 
        _id: discountId, 
        active: true,
        isPublic: true, // Chỉ cho phép claim mã công khai
        startAt: { $lte: now },
        endAt: { $gte: now }
      }).lean();

      if (!discount) {
        return res.status(404).json({ status: "error", message: "Mã giảm giá không tồn tại hoặc không khả dụng" });
      }

      // Kiểm tra xem user đã claim mã này chưa
      const existingAssignment = await DiscountAssignment.findOne({ 
        discountId: discount._id, 
        userId: userId 
      }).lean();

      if (existingAssignment) {
        return res.json({ 
          status: "success", 
          message: "Bạn đã lấy mã này rồi", 
          data: { discount, assignment: existingAssignment, alreadyClaimed: true } 
        });
      }

      // Tạo assignment cho user (claim mã)
      const assignment = await DiscountAssignment.create({
        discountId: discount._id,
        userId: userId,
        perUserLimit: discount.usageLimit > 0 ? 1 : 0, // Nếu có giới hạn tổng thì mỗi user chỉ được dùng 1 lần
        usedCount: 0,
        active: true,
      });

      return res.json({ 
        status: "success", 
        message: "Lấy mã giảm giá thành công", 
        data: { discount, assignment } 
      });
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key error
        return res.json({ 
          status: "success", 
          message: "Bạn đã lấy mã này rồi", 
          data: { alreadyClaimed: true } 
        });
      }
      return res.status(500).json({ status: "error", message: "Lỗi khi lấy mã giảm giá", error: err.message });
    }
  },

    // Internal helper used by order create
  validateAndCompute: async ({ code, baseAmount, ownerId, itemId, userId }) => {
        const now = new Date();
        const codeUpper = code?.toUpperCase().trim();
        if (!codeUpper) return { valid: false, reason: "INVALID_CODE" };
        
        // Tìm discount với code (case-insensitive search)
       let discount = await Discount.findOne({ code: codeUpper }).lean();
        
     if (!discount) {
       console.log("[DISCOUNT] Not found with code:", codeUpper);
       // Thử tìm với case-insensitive
       const caseInsensitive = await Discount.findOne({ 
         code: { $regex: new RegExp(`^${codeUpper}$`, "i") } 
       }).lean();
       
       if (caseInsensitive) {
         console.log("[DISCOUNT] Found with case-insensitive search, but code mismatch:", {
           searched: codeUpper,
           found: caseInsensitive.code
         });
       }
       
       const similar = await Discount.find({
         code: { $regex: codeUpper, $options: "i" },
       })
         .select("code active isPublic")
         .limit(5);
       console.log(
         "[DISCOUNT] Similar codes in DB:",
         similar.map((d) => ({ code: d.code, active: d.active, isPublic: d.isPublic }))
       );
       return { valid: false, reason: "INVALID_CODE" };
     }
        
        // Kiểm tra active sau khi tìm thấy
        if (!discount.active) {
          console.error("Discount found but not active:", {
            code: discount.code,
            active: discount.active,
            isPublic: discount.isPublic,
            _id: discount._id
          });
          return { valid: false, reason: "INVALID_CODE" };
        }
        if (discount.startAt && now < new Date(discount.startAt)) return { valid: false, reason: "NOT_STARTED" };
        if (discount.endAt && now > new Date(discount.endAt)) return { valid: false, reason: "EXPIRED" };
        if (discount.minOrderAmount && baseAmount < discount.minOrderAmount) return { valid: false, reason: "BELOW_MIN_ORDER" };
        if (discount.ownerId && ownerId && String(discount.ownerId) !== String(ownerId)) return { valid: false, reason: "OWNER_NOT_MATCH" };
        if (discount.itemId && itemId && String(discount.itemId) !== String(itemId)) return { valid: false, reason: "ITEM_NOT_MATCH" };
    
    // Kiểm tra private discount permissions
    if (!discount.isPublic) {
      if (!userId) return { valid: false, reason: "NOT_ALLOWED_USER" };
      
      // Kiểm tra allowedUsers (cho discounts từ quy đổi RT Points)
      const isInAllowedUsers = discount.allowedUsers && discount.allowedUsers.some(
        (uid) => String(uid) === String(userId)
      );
      
      // Kiểm tra DiscountAssignment (cho discounts được assign thủ công)
      const assignment = await DiscountAssignment.findOne({ discountId: discount._id, userId, active: true }).lean();
      
      // User phải có trong allowedUsers HOẶC có DiscountAssignment
      if (!isInAllowedUsers && !assignment) {
        return { valid: false, reason: "NOT_ALLOWED_USER" };
      }
      
      // Nếu có assignment, kiểm tra thời gian và giới hạn của assignment
      if (assignment) {
        if (assignment.effectiveFrom && now < new Date(assignment.effectiveFrom)) return { valid: false, reason: "ASSIGN_NOT_STARTED" };
        if (assignment.effectiveTo && now > new Date(assignment.effectiveTo)) return { valid: false, reason: "ASSIGN_EXPIRED" };
        if (assignment.perUserLimit > 0 && (assignment.usedCount || 0) >= assignment.perUserLimit) return { valid: false, reason: "PER_USER_LIMIT" };
        // Nếu có assignment, vẫn kiểm tra discount.usageLimit để đảm bảo tổng số lần sử dụng không vượt quá giới hạn
        if (discount.usageLimit > 0 && (discount.usedCount || 0) >= discount.usageLimit) {
          return { valid: false, reason: "USAGE_LIMIT" };
        }
      } else if (isInAllowedUsers) {
        // Nếu chỉ có trong allowedUsers mà không có assignment, kiểm tra usageLimit của discount
        if (discount.usageLimit > 0 && (discount.usedCount || 0) >= discount.usageLimit) {
          return { valid: false, reason: "USAGE_LIMIT" };
        }
      }
    } else {
      // Đối với public discounts, kiểm tra usageLimit
      if (discount.usageLimit > 0 && (discount.usedCount || 0) >= discount.usageLimit) {
        return { valid: false, reason: "USAGE_LIMIT" };
      }
    }

        const amount = clampDiscountAmount(discount.type, discount.value, baseAmount, discount.maxDiscountAmount || 0);
        console.log("validateAndCompute result:", {
          code: discount.code,
          type: discount.type,
          value: discount.value,
          baseAmount: baseAmount,
          maxDiscountAmount: discount.maxDiscountAmount || 0,
          calculatedAmount: discount.type === "percent" ? (baseAmount * discount.value) / 100 : discount.value,
          finalAmount: amount,
        });
        return { valid: true, discount, amount };
    },
};


