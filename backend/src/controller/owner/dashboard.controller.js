const Order = require("../../models/Order/Order.model");
const ExtensionRequest = require("../../models/Order/ExtensionRequest.model");
const Item = require("../../models/Product/Item.model");
const User = require("../../models/User.model");

const mongoose = require("mongoose");

/**
 * Get orders by owner ID
 * Requires owner authentication
 */
module.exports.getOrderByOwnerId = async (req, res) => {
    try {
        // Debug: Log user info from JWT
        console.log("JWT User Info:", req.user);
        
        const ownerId = req.user._id; // Use _id instead of id from JWT token
        console.log("Extracted Owner ID:", ownerId);
        
        const { period = '30d', status, page = 1, limit = 10 } = req.query;
        
        let days = 30;
        if (period === '7d') days = 7;
        else if (period === '30d') days = 30;
        else if (period === '90d') days = 90;
        else if (period === '1y') days = 365;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const rentalAmountExpression = {
            $let: {
                vars: {
                    gross: { $ifNull: ["$finalAmount", "$totalAmount"] },
                    deposit: { $ifNull: ["$depositAmount", 0] },
                    serviceFee: { $ifNull: ["$serviceFee", 0] },
                },
                in: {
                    $max: [
                        0,
                        {
                            $subtract: [
                                "$$gross",
                                { $add: ["$$deposit", "$$serviceFee"] }
                            ]
                        }
                    ]
                }
            }
        };

        // Build match conditions
        const matchConditions = {
            createdAt: { $gte: startDate },
            ownerId: new mongoose.Types.ObjectId(ownerId)
        };

        if (status && status !== 'all') {
            matchConditions.orderStatus = status;
        }

        // Get orders with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const timelinePipeline = [
            { $match: matchConditions },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    orders: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ["$orderStatus", "pending"] }, 1, 0] } },
                    confirmed: { $sum: { $cond: [{ $eq: ["$orderStatus", "confirmed"] }, 1, 0] } },
                    delivery: { $sum: { $cond: [{ $eq: ["$orderStatus", "delivery"] }, 1, 0] } },
                    received: { $sum: { $cond: [{ $eq: ["$orderStatus", "received"] }, 1, 0] } },
                    progress: { $sum: { $cond: [{ $eq: ["$orderStatus", "progress"] }, 1, 0] } },
                    returned: { $sum: { $cond: [{ $eq: ["$orderStatus", "returned"] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ["$orderStatus", "completed"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0] } },
                    disputed: { $sum: { $cond: [{ $eq: ["$orderStatus", "disputed"] }, 1, 0] } },
                }
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    orders: "$orders",
                    pending: "$pending",
                    confirmed: "$confirmed",
                    delivery: "$delivery",
                    received: "$received",
                    progress: "$progress",
                    returned: "$returned",
                    completed: "$completed",
                    cancelled: "$cancelled",
                    disputed: "$disputed"
                }
            },
            { $sort: { date: 1 } }
        ];

        const [orders, totalCount, rawTimelineData] = await Promise.all([
            Order.aggregate([
                { $match: matchConditions },
                {
                    $addFields: {
                        rentalAmount: rentalAmountExpression
                    }
                },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: parseInt(limit) },
                {
                    $lookup: {
                        from: "users",
                        localField: "renterId",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                { $unwind: "$user" },
                {
                    $project: {
                        orderGuid: 1,
                        orderStatus: 1,
                        totalAmount: 1,
                        rentalAmount: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        "user.fullName": 1,
                        "user.email": 1,
                        itemSnapshot: 1,
                        unitCount: 1,
                        startAt: 1,
                        endAt: 1
                    }
                }
            ]),
            Order.countDocuments(matchConditions),
            Order.aggregate(timelinePipeline)
        ]);

        const timelineMap = new Map();
        rawTimelineData.forEach(day => {
            timelineMap.set(day.date, day);
        });

        const filledTimeline = [];
        const timelineCursor = new Date(startDate);
        const today = new Date();
        while (timelineCursor <= today) {
            const dateStr = timelineCursor.toISOString().split('T')[0];
            const dayData = timelineMap.get(dateStr) || {
                date: dateStr,
                orders: 0,
                pending: 0,
                confirmed: 0,
                delivery: 0,
                received: 0,
                progress: 0,
                returned: 0,
                completed: 0,
                cancelled: 0,
                disputed: 0
            };
            filledTimeline.push(dayData);
            timelineCursor.setDate(timelineCursor.getDate() + 1);
        }

        // Get order statistics by status
        const orderStats = await Order.aggregate([
            { $match: { ownerId: new mongoose.Types.ObjectId(ownerId) } },
            {
                $addFields: {
                    rentalAmount: rentalAmountExpression
                }
            },
            {
                $group: {
                    _id: "$orderStatus",
                    count: { $sum: 1 },
                    rentalAmount: { $sum: "$rentalAmount" }
                }
            }
        ]);

        // Format order stats
        const stats = {
            pending: { count: 0, amount: 0, label: "Chờ xử lý" },
            confirmed: { count: 0, amount: 0, label: "Đã xác nhận" },
            delivery: { count: 0, amount: 0, label: "Đang giao hàng" },
            received: { count: 0, amount: 0, label: "Đã nhận hàng" },
            progress: { count: 0, amount: 0, label: "Đang thuê" },
            returned: { count: 0, amount: 0, label: "Đã trả hàng" },
            completed: { count: 0, amount: 0, label: "Hoàn thành" },
            cancelled: { count: 0, amount: 0, label: "Đã hủy" },
            disputed: { count: 0, amount: 0, label: "Tranh chấp" }
        };

        orderStats.forEach(stat => {
            if (stats[stat._id]) {
                stats[stat._id] = {
                    count: stat.count,
                    amount: stat.rentalAmount
                };
            }
        });

        return res.json({
            code: 200,
            message: "Lấy đơn hàng thành công",
            status: "success",
            data: {
                orders: orders.map(order => ({
                    ...order,
                    itemCount: order.unitCount || 1
                })),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalOrders: totalCount,
                    limit: parseInt(limit)
                },
                statistics: stats,
                timeline: filledTimeline
            }
        });
    } catch (error) {
        console.error("Error getting orders by owner ID:", error);
        return res.json({
            code: 500,
            message: "Lỗi khi lấy đơn hàng",
            status: "error",
            error: error.message
        });
    }
};

/**
 * Get revenue by owner ID
 * Requires owner authentication
 */
module.exports.getRevenueByOwnerId = async (req, res) => {
    try {
        // Debug: Log user info from JWT
        console.log("JWT User Info (Revenue):", req.user);
        
        const ownerId = req.user._id; // Use _id instead of id from JWT token
        console.log("Extracted Owner ID (Revenue):", ownerId);
        
        const { period = '30d' } = req.query;
        
        let days = 30;
        if (period === '7d') days = 7;
        else if (period === '30d') days = 30;
        else if (period === '90d') days = 90;
        else if (period === '1y') days = 365;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

        const netRevenueExpression = {
            $let: {
                vars: {
                    gross: { $ifNull: ["$finalAmount", "$totalAmount"] },
                    deposit: { $ifNull: ["$depositAmount", 0] },
                    serviceFee: { $ifNull: ["$serviceFee", 0] },
                },
                in: {
                    $max: [
                        0,
                        {
                            $subtract: [
                                "$$gross",
                                {
                                    $add: ["$$deposit", "$$serviceFee"]
                                }
                            ]
                        }
                    ]
                }
            }
        };

        // Get revenue timeline data
        const orderRevenueData = await Order.aggregate([
            {
                $match: {
                    orderStatus: "completed",
                    createdAt: { $gte: startDate },
                    ownerId: new mongoose.Types.ObjectId(ownerId)
                }
            },
            {
                $addFields: {
                    netRevenue: netRevenueExpression
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    revenue: { $sum: "$netRevenue" },
                    orders: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const extensionBasePipeline = [
            {
                $match: {
                    paymentStatus: "paid",
                    status: "approved"
                }
            },
            {
                $lookup: {
                    from: "orders",
                    let: { orderId: "$orderId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$_id", "$$orderId"] },
                                        { $eq: ["$ownerId", ownerObjectId] }
                                    ]
                                }
                            }
                        },
                        { $project: { createdAt: 1, ownerId: 1 } }
                    ],
                    as: "order"
                }
            },
            { $unwind: "$order" },
            {
                $addFields: {
                    effectiveDate: { $ifNull: ["$paidAt", "$updatedAt"] },
                    orderCreatedAt: "$order.createdAt",
                    netExtensionRevenue: {
                        $max: [
                            0,
                            {
                                $subtract: [
                                    { $ifNull: ["$extensionFee", 0] },
                                    { $ifNull: ["$serviceFee", 0] }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $match: {
                    effectiveDate: { $ne: null }
                }
            }
        ];

        const extensionTimeline = await ExtensionRequest.aggregate([
            ...extensionBasePipeline,
            {
                $match: {
                    effectiveDate: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$effectiveDate" }
                    },
                    revenue: { $sum: "$netExtensionRevenue" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill missing dates with zero counts
        const timelineMap = new Map();

        orderRevenueData.forEach((day) => {
            timelineMap.set(day._id, {
                revenue: day.revenue,
                orders: day.orders,
            });
        });

        extensionTimeline.forEach((day) => {
            const existing = timelineMap.get(day._id) || { revenue: 0, orders: 0 };
            existing.revenue += day.revenue;
            timelineMap.set(day._id, existing);
        });

        const filledStats = [];
        const currentDate = new Date(startDate);
        const today = new Date();
        
        while (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayData = timelineMap.get(dateStr);
            filledStats.push({
                date: dateStr,
                revenue: dayData ? dayData.revenue : 0,
                orders: dayData ? dayData.orders : 0
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Get total revenue statistics
        const totalRevenueStats = await Order.aggregate([
            {
                $match: {
                    orderStatus: "completed",
                    ownerId: new mongoose.Types.ObjectId(ownerId)
                }
            },
            {
                $addFields: {
                    netRevenue: netRevenueExpression
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$netRevenue" },
                    totalOrders: { $sum: 1 },
                    avgOrderValue: { $avg: "$netRevenue" }
                }
            }
        ]);

        const totalExtensionStats = await ExtensionRequest.aggregate([
            ...extensionBasePipeline,
            {
                $group: {
                    _id: null,
                    total: { $sum: "$netExtensionRevenue" }
                }
            }
        ]);

        // Get revenue by status
        const revenueByStatus = await Order.aggregate([
            {
                $match: {
                    ownerId: new mongoose.Types.ObjectId(ownerId)
                }
            },
            {
                $addFields: {
                    netRevenue: netRevenueExpression
                }
            },
            {
                $group: {
                    _id: "$orderStatus",
                    count: { $sum: 1 },
                    revenue: { $sum: "$netRevenue" }
                }
            }
        ]);

        // Get monthly revenue comparison
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const [currentMonthRevenue, previousMonthRevenue, currentMonthExtensions, previousMonthExtensions] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        orderStatus: "completed",
                        createdAt: { $gte: currentMonthStart },
                        ownerId: new mongoose.Types.ObjectId(ownerId)
                    }
                },
                {
                    $addFields: {
                        netRevenue: netRevenueExpression
                    }
                },
                { $group: { _id: null, total: { $sum: "$netRevenue" }, count: { $sum: 1 } } }
            ]),
            Order.aggregate([
                {
                    $match: {
                        orderStatus: "completed",
                        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
                        ownerId: new mongoose.Types.ObjectId(ownerId)
                    }
                },
                {
                    $addFields: {
                        netRevenue: netRevenueExpression
                    }
                },
                { $group: { _id: null, total: { $sum: "$netRevenue" }, count: { $sum: 1 } } }
            ]),
            ExtensionRequest.aggregate([
                ...extensionBasePipeline,
                {
                    $match: {
                        effectiveDate: { $gte: currentMonthStart }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$netExtensionRevenue" }
                    }
                }
            ]),
            ExtensionRequest.aggregate([
                ...extensionBasePipeline,
                {
                    $match: {
                        effectiveDate: { $gte: previousMonthStart, $lte: previousMonthEnd }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$netExtensionRevenue" }
                    }
                }
            ])
        ]);

        const currentExtensionRevenue = currentMonthExtensions?.[0]?.total || 0;
        const previousExtensionRevenue = previousMonthExtensions?.[0]?.total || 0;

        const currentRevenue = (currentMonthRevenue[0]?.total || 0) + currentExtensionRevenue;
        const prevRevenue = (previousMonthRevenue[0]?.total || 0) + previousExtensionRevenue;
        const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

        const extensionTotalRevenue = totalExtensionStats?.[0]?.total || 0;
        const baseRevenueStats = totalRevenueStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };
        const rentalRevenue = baseRevenueStats.totalRevenue || 0;
        const combinedTotalRevenue = rentalRevenue + extensionTotalRevenue;

        baseRevenueStats.avgOrderValue = baseRevenueStats.totalOrders > 0
            ? combinedTotalRevenue / baseRevenueStats.totalOrders
            : 0;

        // Format revenue by status
        const statusRevenue = {
            pending: { count: 0, revenue: 0, label: "Chờ xử lý" },
            confirmed: { count: 0, revenue: 0, label: "Đã xác nhận" },
            delivery: { count: 0, revenue: 0, label: "Đang giao hàng" },
            received: { count: 0, revenue: 0, label: "Đã nhận hàng" },
            progress: { count: 0, revenue: 0, label: "Đang thuê" },
            returned: { count: 0, revenue: 0, label: "Đã trả hàng" },
            completed: { count: 0, revenue: 0, label: "Hoàn thành" },
            cancelled: { count: 0, revenue: 0, label: "Đã hủy" },
            disputed: { count: 0, revenue: 0, label: "Tranh chấp" }
        };

        revenueByStatus.forEach(stat => {
            if (statusRevenue[stat._id]) {
                statusRevenue[stat._id] = {
                    count: stat.count,
                    revenue: stat.revenue
                };
            }
        });

        return res.json({
            code: 200,
            message: "Lấy doanh thu thành công",
            status: "success",
            data: {
                timeline: filledStats,
                totals: {
                    totalRevenue: combinedTotalRevenue,
                    rentalRevenue,
                    totalOrders: baseRevenueStats.totalOrders,
                    extensionRevenue: extensionTotalRevenue,
                    avgOrderValue: baseRevenueStats.avgOrderValue
                },
                monthlyComparison: {
                    currentMonth: currentRevenue,
                    previousMonth: prevRevenue,
                    change: parseFloat(revenueChange.toFixed(1)),
                    changeType: revenueChange >= 0 ? "increase" : "decrease"
                },
                byStatus: statusRevenue
            }
        });
    } catch (error) {
        console.error("Error getting revenue by owner ID:", error);
        return res.json({
            code: 500,
            message: "Lỗi khi lấy doanh thu",
            status: "error",
            error: error.message
        });
    }
};