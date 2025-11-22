const mongoose = require("mongoose");
const { Types } = mongoose;
const Order = require("../../models/Order/Order.model");
const Item = require("../../models/Product/Item.model");
const User = require("../../models/User.model");
const ItemImages = require("../../models/Product/ItemImage.model");
const { calculateTotals } = require("./calculateRental");
const {
  notifyOrderCreated,
  notifyOrderConfirmed,
  notifyOrderStarted,
  notifyOrderReturned,
  notifyOrderCompleted,
  notifyOrderCancelled,
  notifyOrderDisputed,
} = require("../../middleware/orderNotification");
const Discount = require("../../models/Discount/Discount.model");
const DiscountAssignment = require("../../models/Discount/DiscountAssignment.model");
const DiscountRedemption = require("../../models/Discount/DiscountRedemption.model");

function isTimeRangeOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

module.exports = {
  createOrder: async (req, res) => {
    // === CHẶN ADMIN & MODERATOR TẠO ORDER ===
    if (req.user.role === "admin" || req.user.role === "moderator") {
      return res.status(403).json({
        message: "Tài khoản quản trị không được phép tạo đơn hàng thuê",
      });
    }
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const renterId = req.user._id || req.user.id;
      const {
        itemId,
        quantity = 1,
        startAt,
        rentalStartDate,
        endAt,
        rentalEndDate,
        paymentMethod = "Wallet",
        shippingAddress,
        note = "",
        discountCode, // legacy
        publicDiscountCode,
        privateDiscountCode,
      } = req.body;

      const finalStartAt = startAt || rentalStartDate;
      const finalEndAt = endAt || rentalEndDate;

      // === VALIDATE REQUIRED FIELDS ===
      if (!itemId || !finalStartAt || !finalEndAt || !shippingAddress) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Thiếu các trường bắt buộc" });
      }

      // === LOAD ITEM ===
      const item = await Item.findById(itemId).session(session);
      if (!item || item.IsDeleted || item.StatusId !== 2) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Sản phẩm không có sẵn" });
      }
      if (item.AvailableQuantity < quantity) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Số lượng không đủ" });
      }

      // === CALCULATE TOTALS ===
      const images = await ItemImages.find({
        ItemId: item._id,
        IsPrimary: true,
        IsDeleted: false,
      })
        .sort({ Ordinal: 1 })
        .select("Url")
        .lean()
        .session(session);

      const calc = await calculateTotals(
        item,
        quantity,
        finalStartAt,
        finalEndAt
      );
      if (!calc) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Không thể tính tiền thuê" });
      }

      const {
        totalAmount,
        rentalAmount,
        depositAmount,
        serviceFee,
        duration,
        unitName,
      } = calc;

      // === DISCOUNT LOGIC (CHỈ ÁP DỤNG TRÊN TIỀN THUÊ) ===
      const baseForDiscount = rentalAmount; // ← Đây là điểm then chốt
      let totalDiscountAmount = 0;
      let discountInfo = null;

      const publicCode = publicDiscountCode || discountCode;
      const privateCode = privateDiscountCode;

      const DiscountController = require("./discount.controller");

      // --- Public Discount ---
      if (publicCode) {
        const result = await DiscountController.validateAndCompute({
          code: publicCode,
          baseAmount: baseForDiscount,
          ownerId: item.OwnerId,
          itemId: item._id,
          userId: renterId,
        });

        if (result.valid && result.discount.isPublic) {
          totalDiscountAmount += result.amount;
          discountInfo = {
            code: publicCode.toUpperCase(),
            type: result.discount.type,
            value: result.discount.value,
            amountApplied: result.amount,
            _publicDiscountData: {
              discount: result.discount,
              amount: result.amount,
            },
          };
        } else if (!result.valid) {
          console.log(
            `[DISCOUNT] Public code thất bại: ${publicCode} - Lý do: ${result.reason}`
          );
        }
      }

      // --- Private Discount (chỉ áp dụng nếu còn tiền thuê để giảm) ---
      if (privateCode && totalDiscountAmount < rentalAmount) {
        const remainingRental = rentalAmount - totalDiscountAmount;
        const result = await DiscountController.validateAndCompute({
          code: privateCode,
          baseAmount: remainingRental,
          ownerId: item.OwnerId,
          itemId: item._id,
          userId: renterId,
        });

        if (result.valid && !result.discount.isPublic) {
          const applyAmt = Math.min(result.amount, remainingRental);
          totalDiscountAmount += applyAmt;

          if (discountInfo) {
            discountInfo.secondaryCode = privateCode.toUpperCase();
            discountInfo.secondaryType = result.discount.type;
            discountInfo.secondaryValue = result.discount.value;
            discountInfo.secondaryAmountApplied = applyAmt;
            discountInfo.totalAmountApplied = totalDiscountAmount;
          } else {
            discountInfo = {
              code: privateCode.toUpperCase(),
              type: result.discount.type,
              value: result.discount.value,
              amountApplied: applyAmt,
            };
          }
          discountInfo._privateDiscountData = {
            discount: result.discount,
            amount: applyAmt,
          };
        } else if (!result.valid) {
          console.log(
            `[DISCOUNT] Private code thất bại: ${privateCode} - Lý do: ${result.reason}`
          );
        }
      }

      // === TÍNH TOÁN CUỐI CÙNG ===
      const finalOrderAmount = Math.max(0, totalAmount - totalDiscountAmount);

      const cleanDiscountInfo = discountInfo
        ? {
            code: discountInfo.code,
            type: discountInfo.type,
            value: discountInfo.value,
            amountApplied: discountInfo.amountApplied || 0,
            secondaryCode: discountInfo.secondaryCode,
            secondaryType: discountInfo.secondaryType,
            secondaryValue: discountInfo.secondaryValue,
            secondaryAmountApplied: discountInfo.secondaryAmountApplied || 0,
            totalAmountApplied:
              discountInfo.totalAmountApplied || totalDiscountAmount,
          }
        : null;

      // === TẠO ORDER ===
      const orderDoc = await Order.create(
        [
          {
            renterId,
            ownerId: item.OwnerId,
            itemId: item._id,
            itemSnapshot: {
              title: item.Title,
              images: images.map((i) => i.Url),
              basePrice: item.BasePrice,
              priceUnit: String(item.PriceUnitId),
            },
            unitCount: quantity,
            startAt: new Date(finalStartAt),
            endAt: new Date(finalEndAt),
            totalAmount,
            discount: cleanDiscountInfo || undefined,
            finalAmount: finalOrderAmount,
            depositAmount,
            serviceFee,
            currency: "VND",
            paymentMethod,
            orderStatus: "pending",
            paymentStatus: "not_paid",
            note,
            shippingAddress: { ...shippingAddress, snapshotAt: new Date() },
            rentalDuration: duration,
            rentalUnit: unitName,
            lifecycle: { createdAt: new Date() },
          },
        ],
        { session }
      );

      const newOrder = orderDoc[0];

      // === CẬP NHẬT DISCOUNT USAGE (usedCount, assignment, redemption) ===
      const updateDiscountUsage = async (data) => {
        if (!data) return;
        const { discount, amount } = data;

        await Discount.updateOne(
          { _id: discount._id },
          { $inc: { usedCount: 1 } },
          { session }
        );

        if (!discount.isPublic) {
          await DiscountAssignment.updateOne(
            { discountId: discount._id, userId: renterId },
            { $inc: { usedCount: 1 } },
            { session }
          );
        }

        await DiscountRedemption.create(
          [
            {
              discountId: discount._id,
              userId: renterId,
              orderId: newOrder._id,
              amountApplied: amount,
              status: "applied",
            },
          ],
          { session }
        ).catch((err) => console.error("Redemption error:", err));
      };

      await updateDiscountUsage(discountInfo?._publicDiscountData);
      await updateDiscountUsage(discountInfo?._privateDiscountData);

      // === COMMIT & RESPONSE ===
      await session.commitTransaction();
      session.endSession();

      console.log(
        `Order created - ID: ${newOrder._id} | Discount: ${totalDiscountAmount}đ`
      );

      await notifyOrderCreated(newOrder);

      return res.status(201).json({
        message: "Tạo đơn hàng thành công",
        data: {
          orderId: newOrder._id.toString(),
          orderGuid: newOrder.orderGuid,
          totalAmount,
          finalAmount: finalOrderAmount,
          discount: cleanDiscountInfo,
          depositAmount,
          serviceFee,
          rentalDuration: duration,
          rentalUnit: unitName,
        },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Lỗi tạo đơn hàng:", err);
      return res.status(500).json({
        message: "Lỗi máy chủ",
        error: err.message,
      });
    }
  },

  confirmOrder: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const ownerId = req.user._id;
      const orderId = req.params.id;
      if (!Types.ObjectId.isValid(orderId)) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid order id" });
      }

      const order = await Order.findById(orderId).session(session);
      if (!order || order.isDeleted) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.ownerId.toString() !== ownerId.toString()) {
        await session.abortTransaction();
        return res.status(403).json({ message: "Forbidden: not owner" });
      }

      if (order.orderStatus !== "pending") {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: "Only pending orders can be confirmed" });
      }

      const item = await Item.findOneAndUpdate(
        { _id: order.itemId, AvailableQuantity: { $gte: 1 }, IsDeleted: false },
        { $inc: { AvailableQuantity: -1 } },
        { new: true, session }
      );

      if (!item) {
        await session.abortTransaction();
        return res.status(409).json({ message: "Item is no longer available" });
      }

      order.orderStatus = "confirmed";
      order.lifecycle.confirmedAt = new Date();
      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Cộng RT Points cho renter khi order được xác nhận (không block nếu lỗi)
      try {
        const loyaltyController = require("../loyalty/loyalty.controller");
        const {
          createNotification,
        } = require("../../middleware/createNotification");
        const result = await loyaltyController.addOrderPoints(
          order.renterId,
          order._id,
          order.finalAmount || order.totalAmount
        );
        if (result && result.success && result.transaction) {
          await createNotification(
            order.renterId,
            "Loyalty",
            "Cộng RT Points từ đơn hàng",
            `Bạn đã nhận ${result.transaction.points} RT Points từ đơn hàng ${order.orderGuid}.`,
            {
              points: result.transaction.points,
              orderId: String(order._id),
              orderGuid: order.orderGuid,
              reason: "order_completed",
            }
          );
        }
      } catch (loyaltyError) {
        console.error("Error adding order points:", loyaltyError);
        // Không block order confirmation nếu lỗi loyalty points
      }

      await notifyOrderConfirmed(order); // Gửi notification khi xác nhận đơn
      return res.json({
        message: "Order confirmed and inventory reserved",
        orderGuid: order.orderGuid,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("confirmOrder err:", err);
      return res
        .status(500)
        .json({ message: "Failed to confirm order", error: err.message });
    }
  },

  startOrder: async (req, res) => {
    try {
      const ownerId = req.user._id;
      const orderId = req.params.id;
      if (!Types.ObjectId.isValid(orderId))
        return res.status(400).json({ message: "Invalid order id" });

      const order = await Order.findById(orderId);
      if (!order || order.isDeleted)
        return res.status(404).json({ message: "Order not found" });

      if (order.ownerId.toString() !== ownerId.toString())
        return res.status(403).json({ message: "Forbidden: not owner" });

      if (order.orderStatus !== "confirmed")
        return res
          .status(400)
          .json({ message: "Only confirmed orders can be started" });

      if (order.startAt && new Date(order.startAt) > new Date()) {
        return res.status(400).json({
          message: "Cannot start rental before scheduled start date",
        });
      }

      order.orderStatus = "progress";
      order.paymentStatus = "paid";
      order.lifecycle.startedAt = new Date();
      await order.save();
      await notifyOrderStarted(order); // Gửi notification khi bắt đầu thuê
      return res.json({
        message: "Order started",
        orderGuid: order.orderGuid,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
      });
    } catch (err) {
      console.error("startOrder err:", err);
      return res
        .status(500)
        .json({ message: "Failed to start order", error: err.message });
    }
  },

  renterReturn: async (req, res) => {
    try {
      const renterId = req.user._id;
      const orderId = req.params.id;
      const { notes } = req.body;

      if (!Types.ObjectId.isValid(orderId))
        return res.status(400).json({ message: "Invalid order id" });

      const order = await Order.findById(orderId);
      if (!order || order.isDeleted)
        return res.status(404).json({ message: "Order not found" });

      if (order.renterId.toString() !== renterId.toString())
        return res.status(403).json({ message: "Forbidden: not renter" });

      if (order.orderStatus !== "progress")
        return res.status(400).json({
          message: "Order must be in progress to mark as returned",
        });

      order.orderStatus = "returned";
      order.returnInfo.returnedAt = new Date();
      order.returnInfo.notes = notes || "";
      await order.save();
      await notifyOrderReturned(order); // Gửi notification khi trả sản phẩm
      return res.status(200).json({
        message: "Order marked as returned",
        orderGuid: order.orderGuid,
      });
    } catch (err) {
      console.error("renterReturn err:", err);
      return res
        .status(500)
        .json({ message: "Failed to mark as returned", error: err.message });
    }
  },

  ownerComplete: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const ownerId = req.user._id;
      const orderId = req.params.id;
      const {
        conditionStatus = "Good",
        damageFee = 0,
        ownerNotes = "",
      } = req.body;

      if (!Types.ObjectId.isValid(orderId)) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid order id" });
      }

      const order = await Order.findById(orderId).session(session);
      if (!order || order.isDeleted) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.ownerId.toString() !== ownerId.toString()) {
        await session.abortTransaction();
        return res.status(403).json({ message: "Forbidden: not owner" });
      }

      if (!order.returnInfo || !order.returnInfo.returnedAt) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: "Renter hasn't reported return yet" });
      }

      if (!["progress", "returned"].includes(order.orderStatus)) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Order must be in progress or returned to complete",
        });
      }

      const normalizeCondition = (status) => {
        const map = {
          good: "Good",
          slightlydamaged: "SlightlyDamaged",
          heavilydamaged: "HeavilyDamaged",
          lost: "Lost",
        };
        return map[status?.toLowerCase()] || "Good";
      };

      order.returnInfo.confirmedBy = ownerId;
      order.returnInfo.conditionStatus = normalizeCondition(conditionStatus);
      order.returnInfo.notes =
        (order.returnInfo.notes || "") + "\nOwnerNote: " + ownerNotes;
      order.returnInfo.damageFee = Math.max(0, Number(damageFee) || 0);

      order.paymentStatus = order.returnInfo.damageFee > 0 ? "partial" : "paid";

      order.orderStatus = "completed";
      order.lifecycle.completedAt = new Date();

      const item = await Item.findById(order.itemId).session(session);
      if (item) {
        item.RentCount = (item.RentCount || 0) + (order.unitCount || 1); // tang so luot thue
        if (order.returnInfo.conditionStatus === "Lost") {
          item.Quantity = Math.max(0, (item.Quantity || 0) - 1);

          if (item.AvailableQuantity > item.Quantity)
            item.AvailableQuantity = item.Quantity;
        } else {
          item.AvailableQuantity = (item.AvailableQuantity || 0) + 1;

          if (item.Quantity && item.AvailableQuantity > item.Quantity) {
            item.AvailableQuantity = item.Quantity;
          }
        }
        await item.save({ session });
      }

      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      await notifyOrderCompleted(order); // Gửi notification khi hoàn tất đơn
      return res.json({
        message: "Order completed",
        orderGuid: order.orderGuid,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("ownerComplete err:", err);
      return res
        .status(500)
        .json({ message: "Failed to complete order", error: err.message });
    }
  },

  cancelOrder: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const userId = req.user._id;
      const orderId = req.params.id;
      const { reason = "Cancelled by user" } = req.body;

      if (!Types.ObjectId.isValid(orderId)) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid order id" });
      }

      const order = await Order.findById(orderId).session(session);
      if (!order || order.isDeleted) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Order not found" });
      }

      if (
        ![order.renterId.toString(), order.ownerId.toString()].includes(
          userId.toString()
        )
      ) {
        await session.abortTransaction();
        return res.status(403).json({ message: "Forbidden" });
      }

      if (order.orderStatus === "pending") {
        order.orderStatus = "cancelled";
        order.cancelReason = reason;
        order.lifecycle.canceledAt = new Date();
        await order.save({ session });
        await session.commitTransaction();
        session.endSession();
        return res.json({
          message: "Order cancelled",
          orderGuid: order.orderGuid,
        });
      }

      if (order.orderStatus === "confirmed") {
        if (userId.toString() !== order.ownerId.toString()) {
          await session.abortTransaction();
          return res
            .status(403)
            .json({ message: "Only owner can cancel a confirmed order" });
        }

        const item = await Item.findById(order.itemId).session(session);
        if (item) {
          item.AvailableQuantity = (item.AvailableQuantity || 0) + 1;
          if (item.Quantity && item.AvailableQuantity > item.Quantity)
            item.AvailableQuantity = item.Quantity;
          await item.save({ session });
        }

        order.orderStatus = "cancelled";
        order.cancelReason = reason;
        order.lifecycle.canceledAt = new Date();
        await order.save({ session });

        await notifyOrderCancelled(order); // Gửi notification
        await session.commitTransaction();
        session.endSession();
        return res.json({
          message: "Confirmed order cancelled and inventory restored",
          orderGuid: order.orderGuid,
        });
      }

      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message:
          "Cannot cancel order at this stage; open dispute or contact admin",
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("cancelOrder err:", err);
      return res
        .status(500)
        .json({ message: "Failed to cancel order", error: err.message });
    }
  },

  disputeOrder: async (req, res) => {
    try {
      const userId = req.user._id;
      const orderId = req.params.id;
      const { reason = "" } = req.body;

      if (!Types.ObjectId.isValid(orderId))
        return res.status(400).json({ message: "Invalid order id" });

      const order = await Order.findById(orderId);
      if (!order || order.isDeleted)
        return res.status(404).json({ message: "Order not found" });

      if (
        ![order.renterId.toString(), order.ownerId.toString()].includes(
          userId.toString()
        )
      )
        return res.status(403).json({ message: "Forbidden" });

      if (order.orderStatus === "completed")
        return res
          .status(400)
          .json({ message: "Order already completed - contact admin" });

      order.orderStatus = "disputed";
      order.disputeReason = reason;
      order.lifecycle.disputedAt = new Date();
      await order.save();
      await notifyOrderDisputed(order); // Gửi notification
      return res.json({
        message: "Dispute opened",
        orderGuid: order.orderGuid,
      });
    } catch (err) {
      console.error("disputeOrder err:", err);
      return res
        .status(500)
        .json({ message: "Failed to open dispute", error: err.message });
    }
  },

  getOrder: async (req, res) => {
    try {
      const userId = req.user._id;
      const orderId = req.params.id;

      if (!Types.ObjectId.isValid(orderId))
        return res.status(400).json({ message: "Invalid order id" });

      const order = await Order.findById(orderId)
        .populate("renterId", "fullName email avatarUrl userGuid")
        .populate("ownerId", "fullName email avatarUrl userGuid")
        .populate({
          path: "disputeId",
          select: "status reason createdAt resolution",
          populate: {
            path: "handledBy",
            select: "fullName",
          },
        })
        .lean();

      if (!order || order.isDeleted)
        return res.status(404).json({ message: "Order not found" });

      // Allow moderator and admin to view any order
      const isModeratorOrAdmin =
        req.user.role === "moderator" || req.user.role === "admin";
      if (
        !isModeratorOrAdmin &&
        ![order.renterId._id.toString(), order.ownerId._id.toString()].includes(
          userId.toString()
        )
      )
        return res.status(403).json({ message: "Forbidden" });

      return res.json({ message: "OK", data: order });
    } catch (err) {
      console.error("getOrder err:", err);
      return res
        .status(500)
        .json({ message: "Failed to get order", error: err.message });
    }
  },

  listOrders: async (req, res) => {
    try {
      const userId = req.user._id;
      const { status, paymentStatus, search, page = 1, limit = 20 } = req.query;

      const filter = {
        isDeleted: false,
        $or: [{ renterId: userId }, { ownerId: userId }],
      };

      if (status) filter.orderStatus = status;
      if (paymentStatus) filter.paymentStatus = paymentStatus;
      if (search)
        filter["itemSnapshot.title"] = { $regex: search, $options: "i" };

      const skip = (Number(page) - 1) * Number(limit);

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate("renterId", "fullName email")
          .populate("ownerId", "fullName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Order.countDocuments(filter),
      ]);

      return res.json({
        message: "OK",
        data: orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (err) {
      console.error("listOrders err:", err);
      return res.status(500).json({
        message: "Failed to list orders",
        error: err.message,
      });
    }
  },
  listOrdersByOnwer: async (req, res) => {
    try {
      const userId = req.user._id;
      const { status, paymentStatus, search, page = 1, limit = 20 } = req.query;

      const filter = {
        isDeleted: false,
        ownerId: userId,
      };

      if (status) filter.orderStatus = status;
      if (paymentStatus) filter.paymentStatus = paymentStatus;
      if (search)
        filter["itemSnapshot.title"] = { $regex: search, $options: "i" };

      const skip = (Number(page) - 1) * Number(limit);

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate("renterId", "fullName email")
          .populate("ownerId", "fullName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Order.countDocuments(filter),
      ]);

      return res.json({
        message: "OK",
        data: orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (err) {
      console.error("listOrdersByOnwer err:", err);
      return res.status(500).json({
        message: "Failed to list orders",
        error: err.message,
      });
    }
  },
};
