const Order = require("../../models/Order/Order.model");
const Item = require("../../models/Product/Item.model");
const User = require("../../models/User.model");
const ExtensionRequest = require("../../models/Order/ExtensionRequest.model");
const Complaint = require("../../models/Complaint.model");
const Report = require("../../models/Order/Reports.model");
const Rating = require("../../models/Order/Rating.model");
const Favorites = require("../../models/Product/Favorites.model");
const Post = require("../../models/Blog/Post.model");
const Comment = require("../../models/Blog/Comment.model");
const Categories = require("../../models/Product/Categories.model");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const OwnerRequest = require("../../models/OwnerRequest.model");
const mongoose = require("mongoose");

const serviceFeeExpression = { $ifNull: ["$serviceFee", 0] };
const ADMIN_TIMEZONE = "Asia/Ho_Chi_Minh";
const formatDateKey = (date) =>
    new Intl.DateTimeFormat("sv-SE", {
        timeZone: ADMIN_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
const extensionMatchStage = {
    paymentStatus: "paid",
    status: "approved"
};
const MAX_REVENUE_ENTRIES = 300;

const buildOrderRevenuePipeline = (startDate = null, endDate = null) => {
    const matchStage = {
        orderStatus: "completed"
    };

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = startDate;
        if (endDate) matchStage.createdAt.$lte = endDate;
    }

    return [
        { $match: matchStage },
        {
            $group: {
                _id: null,
                total: { $sum: serviceFeeExpression },
                totalCount: { $sum: 1 }
            }
        }
    ];
};

const buildExtensionRevenuePipeline = (startDate = null, endDate = null) => {
    const pipeline = [
        { $match: extensionMatchStage },
        {
            $addFields: {
                effectiveDate: {
                    $ifNull: [
                        "$paidAt",
                        {
                            $ifNull: ["$updatedAt", "$createdAt"]
                        }
                    ]
                }
            }
        },
        { $match: { effectiveDate: { $ne: null } } }
    ];

    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;
        pipeline.push({ $match: { effectiveDate: dateFilter } });
    }

    pipeline.push({
        $group: {
            _id: null,
            total: { $sum: serviceFeeExpression },
            totalCount: { $sum: 1 }
        }
    });

    return pipeline;
};

const buildExtensionTimelinePipeline = (startDate) => [
    { $match: extensionMatchStage },
    {
        $addFields: {
            effectiveDate: {
                $ifNull: [
                    "$paidAt",
                    {
                        $ifNull: ["$updatedAt", "$createdAt"]
                    }
                ]
            }
        }
    },
    { $match: { effectiveDate: { $ne: null } } },
    { $match: { effectiveDate: { $gte: startDate } } },
    {
        $group: {
            _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$effectiveDate", timezone: ADMIN_TIMEZONE }
            },
            revenue: { $sum: serviceFeeExpression },
            extensions: { $sum: 1 }
        }
    },
    { $sort: { _id: 1 } }
];

const buildOrderRevenueEntriesPipeline = (startDate = null, endDate = null) => {
    const matchStage = {
        orderStatus: "completed"
    };

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = startDate;
        if (endDate) matchStage.createdAt.$lte = endDate;
    }

    return [
        { $match: matchStage },
        {
            $project: {
                _id: 0,
                orderId: "$_id",
                type: { $literal: "order" },
                referenceCode: "$orderGuid",
                itemTitle: "$itemSnapshot.title",
                serviceFee: serviceFeeExpression,
                date: "$createdAt"
            }
        },
        { $sort: { date: -1 } }
    ];
};

const buildExtensionRevenueEntriesPipeline = (startDate = null, endDate = null) => {
    const pipeline = [
        { $match: extensionMatchStage },
        {
            $addFields: {
                effectiveDate: {
                    $ifNull: [
                        "$paidAt",
                        {
                            $ifNull: ["$updatedAt", "$createdAt"]
                        }
                    ]
                }
            }
        },
        { $match: { effectiveDate: { $ne: null } } }
    ];

    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;
        pipeline.push({ $match: { effectiveDate: dateFilter } });
    }

    pipeline.push(
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "order"
            }
        },
        { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                orderId: "$orderId",
                type: { $literal: "extension" },
                referenceCode: { $ifNull: ["$order.orderGuid", null] },
                itemTitle: { $ifNull: ["$order.itemSnapshot.title", null] },
                serviceFee: serviceFeeExpression,
                date: "$effectiveDate",
                extensionDuration: "$extensionDuration",
                extensionUnit: "$extensionUnit"
            }
        },
        { $sort: { date: -1 } }
    );

    return pipeline;
};

module.exports.getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const [currentOrderAgg, currentExtensionAgg] = await Promise.all([
            Order.aggregate(buildOrderRevenuePipeline(currentMonthStart)),
            ExtensionRequest.aggregate(buildExtensionRevenuePipeline(currentMonthStart))
        ]);

        const [previousOrderAgg, previousExtensionAgg] = await Promise.all([
            Order.aggregate(buildOrderRevenuePipeline(previousMonthStart, previousMonthEnd)),
            ExtensionRequest.aggregate(buildExtensionRevenuePipeline(previousMonthStart, previousMonthEnd))
        ]);

        const currentOrderRevenue = currentOrderAgg[0]?.total || 0;
        const currentExtensionRevenue = currentExtensionAgg[0]?.total || 0;
        const prevOrderRevenue = previousOrderAgg[0]?.total || 0;
        const prevExtensionRevenue = previousExtensionAgg[0]?.total || 0;

        const revenue = currentOrderRevenue + currentExtensionRevenue;
        const prevRevenue = prevOrderRevenue + prevExtensionRevenue;
        const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

        const [currentMonthUsers, previousMonthUsers] = await Promise.all([
            User.countDocuments({
                createdAt: { $gte: currentMonthStart }
            }),
            User.countDocuments({
                createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
            })
        ]);
        const usersChange = previousMonthUsers > 0 ? ((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100 : 0;

        const [currentMonthOrders, previousMonthOrders] = await Promise.all([
            Order.countDocuments({
                createdAt: { $gte: currentMonthStart }
            }),
            Order.countDocuments({
                createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
            })
        ]);
        const ordersChange = previousMonthOrders > 0 ? ((currentMonthOrders - previousMonthOrders) / previousMonthOrders) * 100 : 0;

        const [currentMonthProducts, previousMonthProducts] = await Promise.all([
            Item.countDocuments({
                IsDeleted: { $ne: true },
                CreatedAt: { $gte: currentMonthStart }
            }),
            Item.countDocuments({
                IsDeleted: { $ne: true },
                CreatedAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
            })
        ]);
        const productsChange = previousMonthProducts > 0 ? ((currentMonthProducts - previousMonthProducts) / previousMonthProducts) * 100 : 0;

        const formatRevenue = (amount) => {
            if (amount >= 1000000000) {
                return `${(amount / 1000000000).toFixed(1)}B`;
            } else if (amount >= 1000000) {
                return `${(amount / 1000000).toFixed(1)}M`;
            } else if (amount >= 1000) {
                return `${(amount / 1000).toFixed(1)}K`;
            }
            return amount.toString();
        };

        // Additional statistics
        const [
            completedOrders,
            pendingProducts,
            totalDisputes,
            pendingOwnerRequests
        ] = await Promise.all([
            Order.countDocuments({ orderStatus: "completed" }),
            Item.countDocuments({ IsDeleted: { $ne: true }, StatusId: 1 }),
            Report.countDocuments({ type: "dispute", status: "Pending" }),
            OwnerRequest.countDocuments({ status: "pending" })
        ]);

        
        // Also get total values for display
        const [orderTotalsAgg, extensionTotalsAgg, totalUsers, totalOrders, totalProducts] = await Promise.all([
            Order.aggregate(buildOrderRevenuePipeline()),
            ExtensionRequest.aggregate(buildExtensionRevenuePipeline()),
            User.countDocuments({}),
            Order.countDocuments({}),
            Item.countDocuments({ IsDeleted: { $ne: true } })
        ]);

        const revenueTotal = (orderTotalsAgg[0]?.total || 0) + (extensionTotalsAgg[0]?.total || 0);

        return res.json({
            code: 200,
            message: "Lấy thống kê thành công",
            status: "success",
            data: {
                revenue: {
                    value: revenueTotal, 
                    rawValue: revenueTotal,
                    change: parseFloat(revenueChange.toFixed(1)),
                    changeType: revenueChange >= 0 ? "increase" : "decrease"
                },
                users: {
                    value: totalUsers.toLocaleString(), // Show total users
                    rawValue: totalUsers,
                    change: parseFloat(usersChange.toFixed(1)),
                    changeType: usersChange >= 0 ? "increase" : "decrease"
                },
                orders: {
                    value: totalOrders.toLocaleString(), // Show total orders
                    rawValue: totalOrders,
                    change: parseFloat(ordersChange.toFixed(1)),
                    changeType: ordersChange >= 0 ? "increase" : "decrease"
                },
                products: {
                    value: totalProducts.toLocaleString(), // Show total products
                    rawValue: totalProducts,
                    change: parseFloat(productsChange.toFixed(1)),
                    changeType: productsChange >= 0 ? "increase" : "decrease"
                },
                completedOrders: {
                    value: completedOrders.toLocaleString(),
                    rawValue: completedOrders
                },
                pendingProducts: {
                    value: pendingProducts.toLocaleString(),
                    rawValue: pendingProducts
                },
                orderDisputes: {
                    value: totalDisputes.toLocaleString(),
                    rawValue: totalDisputes
                },
                ownerRequests: {
                    value: pendingOwnerRequests.toLocaleString(),
                    rawValue: pendingOwnerRequests
                }
            }
        });
    } catch (error) {
        console.error("Error getting dashboard stats:", error);
        return res.json({
            code: 500,
            message: "Lỗi khi lấy thống kê",
            status: "error",
            error: error.message
        });
    }
};


module.exports.getRevenueStats = async (req, res) => {
    try {
        const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y
        
        let days = 30;
        if (period === '7d') days = 7;
        else if (period === '30d') days = 30;
        else if (period === '90d') days = 90;
        else if (period === '1y') days = 365;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const orderTimeline = await Order.aggregate([
            {
                $match: {
                    orderStatus: "completed",
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: ADMIN_TIMEZONE }
                    },
                    revenue: { $sum: serviceFeeExpression },
                    orders: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const extensionTimeline = await ExtensionRequest.aggregate(
            buildExtensionTimelinePipeline(startDate)
        );

        const timelineMap = new Map();

        orderTimeline.forEach(day => {
            timelineMap.set(day._id, {
                date: day._id,
                revenue: day.revenue,
                baseRevenue: day.revenue,
                extensionRevenue: 0,
                orders: day.orders,
                extensions: 0
            });
        });

        extensionTimeline.forEach(day => {
            const existing = timelineMap.get(day._id) || {
                date: day._id,
                revenue: 0,
                baseRevenue: 0,
                extensionRevenue: 0,
                orders: 0,
                extensions: 0
            };

            existing.revenue += day.revenue;
            existing.extensionRevenue += day.revenue;
            existing.extensions += day.extensions || 0;

            timelineMap.set(day._id, existing);
        });

        // Fill missing dates with zero counts
        const filledStats = [];
        const currentDate = new Date(startDate);
        const endDate = new Date();
        
        while (currentDate <= endDate) {
            const dateStr = formatDateKey(currentDate);
            const dayData = timelineMap.get(dateStr);
            filledStats.push({
                date: dateStr,
                revenue: dayData ? dayData.revenue : 0,
                baseRevenue: dayData ? dayData.baseRevenue : 0,
                extensionRevenue: dayData ? dayData.extensionRevenue : 0,
                orders: dayData ? dayData.orders : 0,
                extensions: dayData ? dayData.extensions : 0
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Get total revenue stats
        const [orderTotalsAgg, extensionTotalsAgg] = await Promise.all([
            Order.aggregate(buildOrderRevenuePipeline()),
            ExtensionRequest.aggregate(buildExtensionRevenuePipeline())
        ]);

        const baseTotals = orderTotalsAgg[0] || { total: 0, totalCount: 0 };
        const extensionTotals = extensionTotalsAgg[0] || { total: 0, totalCount: 0 };

        // Collect detailed revenue entries within period
        const [orderEntriesRaw, extensionEntriesRaw] = await Promise.all([
            Order.aggregate([
                ...buildOrderRevenueEntriesPipeline(startDate, endDate),
                { $limit: MAX_REVENUE_ENTRIES }
            ]),
            ExtensionRequest.aggregate([
                ...buildExtensionRevenueEntriesPipeline(startDate, endDate),
                { $limit: MAX_REVENUE_ENTRIES }
            ])
        ]);

        const combinedEntries = [...orderEntriesRaw, ...extensionEntriesRaw]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, MAX_REVENUE_ENTRIES)
            .map(entry => ({
                type: entry.type,
                date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
                serviceFee: entry.serviceFee || 0,
                referenceCode: entry.referenceCode || null,
                itemTitle: entry.itemTitle || null,
                extensionDuration: entry.extensionDuration || null,
                extensionUnit: entry.extensionUnit || null,
                orderId: entry.orderId ? entry.orderId.toString() : null
            }));

        return res.json({
            code: 200,
            message: "Lấy thống kê doanh thu thành công",
            status: "success",
            data: {
                timeline: filledStats,
                totals: {
                    total: baseTotals.total + extensionTotals.total,
                    orders: baseTotals.totalCount || 0,
                    baseRevenue: baseTotals.total || 0,
                    extensionRevenue: extensionTotals.total || 0,
                    extensionCount: extensionTotals.totalCount || 0
                },
                entries: combinedEntries
            }
        });
    } catch (error) {
        console.error("Error getting revenue stats:", error);
        return res.json({
            code: 500,
            message: "Lỗi khi lấy thống kê doanh thu",
            status: "error",
            error: error.message
        });
    }
};


module.exports.getUserStats = async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        let days = 30;
        if (period === '7d') days = 7;
        else if (period === '30d') days = 30;
        else if (period === '90d') days = 90;
        else if (period === '1y') days = 365;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const userData = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: ADMIN_TIMEZONE }
                    },
                    users: { $sum: 1 },
                    verified: {
                        $sum: {
                            $cond: [{ $eq: ["$isIdVerified", true] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Fill missing dates with zero counts
        const filledStats = [];
        const currentDate = new Date(startDate);
        const now = new Date();
        
        while (currentDate <= now) {
            const dateStr = formatDateKey(currentDate);
            const dayData = userData.find(stat => stat._id === dateStr);
            
            filledStats.push({
                date: dateStr,
                users: dayData ? dayData.users : 0,
                verified: dayData ? dayData.verified : 0
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Get total users by status
        const [totalUsers, activeUsers, verifiedUsers] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ isIdVerified: true })
        ]);

        return res.json({
            code: 200,
            message: "Lấy thống kê người dùng thành công",
            status: "success",
            data: {
                timeline: filledStats,
                totals: {
                    total: totalUsers,
                    active: activeUsers,
                    verified: verifiedUsers
                }
            }
        });
    } catch (error) {
        console.error("Error getting user stats:", error);
        return res.json({
            code: 500,
            message: "Lỗi khi lấy thống kê người dùng",
            status: "error",
            error: error.message
        });
    }
};


module.exports.getOrderStats = async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        let days = 30;
        if (period === '7d') days = 7;
        else if (period === '30d') days = 30;
        else if (period === '90d') days = 90;
        else if (period === '1y') days = 365;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const orderData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: ADMIN_TIMEZONE }
                    },
                    orders: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ["$orderStatus", "pending"] }, 1, 0]
                        }
                    },
                    confirmed: {
                        $sum: {
                            $cond: [{ $eq: ["$orderStatus", "confirmed"] }, 1, 0]
                        }
                    },
                    delivery: {
                        $sum: {
                            $cond: [{ $eq: ["$orderStatus", "delivery"] }, 1, 0]
                        }
                    },
                    received: {
                        $sum: {
                            $cond: [{ $eq: ["$orderStatus", "received"] }, 1, 0]
                        }
                    },
                    progress: {
                        $sum: {
                            $cond: [{ $eq: ["$orderStatus", "progress"] }, 1, 0]
                        }
                    },
                    returned: {
                        $sum: {
                            $cond: [{ $eq: ["$orderStatus", "returned"] }, 1, 0]
                        }
                    },
                    completed: {
                        $sum: {
                            $cond: [{ $eq: ["$orderStatus", "completed"] }, 1, 0]
                        }
                    },
                    cancelled: {
                        $sum: {
                            $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0]
                        }
                    },
                    disputed: {
                        $sum: {
                            $cond: [{ $eq: ["$orderStatus", "disputed"] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Fill missing dates with zero counts
        const filledStats = [];
        const currentDate = new Date(startDate);
        const now = new Date();
        
        while (currentDate <= now) {
            const dateStr = formatDateKey(currentDate);
            const dayData = orderData.find(stat => stat._id === dateStr);
            
            filledStats.push({
                date: dateStr,
                orders: dayData ? dayData.orders : 0,
                revenue: dayData ? dayData.totalAmount : 0,
                pending: dayData ? dayData.pending : 0,
                confirmed: dayData ? dayData.confirmed : 0,
                delivery: dayData ? dayData.delivery : 0,
                received: dayData ? dayData.received : 0,
                progress: dayData ? dayData.progress : 0,
                returned: dayData ? dayData.returned : 0,
                completed: dayData ? dayData.completed : 0,
                cancelled: dayData ? dayData.cancelled : 0,
                disputed: dayData ? dayData.disputed : 0
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Get orders by status for totals with Vietnamese labels
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

        const statusCounts = await Order.aggregate([
            {
                $match: {}
            },
            {
                $group: {
                    _id: "$orderStatus",
                    count: { $sum: 1 },
                    amount: { $sum: "$totalAmount" }
                }
            }
        ]);

        statusCounts.forEach(item => {
            if (stats[item._id]) {
                stats[item._id].count = item.count;
                stats[item._id].amount = item.amount;
            }
        });

        const totalOrders = await Order.countDocuments({});

        return res.json({
            code: 200,
            message: "Lấy thống kê đơn hàng thành công",
            status: "success",
            data: {
                timeline: filledStats,
                statistics: stats,
                pagination: {
                    totalOrders
                }
            }
        });
    } catch (error) {
        console.error("Error getting order stats:", error);
        return res.json({
            code: 500,
            message: "Lỗi khi lấy thống kê đơn hàng",
            status: "error",
            error: error.message
        });
    }
};


module.exports.getProductStats = async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        let days = 30;
        if (period === '7d') days = 7;
        else if (period === '30d') days = 30;
        else if (period === '90d') days = 90;
        else if (period === '1y') days = 365;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const productData = await Item.aggregate([
            {
                $match: {
                    IsDeleted: { $ne: true },
                    CreatedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$CreatedAt", timezone: ADMIN_TIMEZONE }
                    },
                    products: { $sum: 1 },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ["$StatusId", 1] }, 1, 0]
                        }
                    },
                    active: {
                        $sum: {
                            $cond: [{ $eq: ["$StatusId", 2] }, 1, 0]
                        }
                    },
                    rejected: {
                        $sum: {
                            $cond: [{ $eq: ["$StatusId", 3] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Fill missing dates with zero counts
        const filledStats = [];
        const currentDate = new Date(startDate);
        const now = new Date();
        
        while (currentDate <= now) {
            const dateStr = formatDateKey(currentDate);
            const dayData = productData.find(stat => stat._id === dateStr);
            
            filledStats.push({
                date: dateStr,
                products: dayData ? dayData.products : 0,
                pending: dayData ? dayData.pending : 0,
                active: dayData ? dayData.active : 0,
                rejected: dayData ? dayData.rejected : 0
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Get all products regardless of date for totals
        const [totalProducts, activeProducts, pendingProducts, rejectedProducts] = await Promise.all([
            Item.countDocuments({ IsDeleted: { $ne: true } }),
            Item.countDocuments({ IsDeleted: { $ne: true }, StatusId: 2 }), // StatusId 2 = approved/active
            Item.countDocuments({ IsDeleted: { $ne: true }, StatusId: 1 }), // StatusId 1 = pending
            Item.countDocuments({ IsDeleted: { $ne: true }, StatusId: 3 })  // StatusId 3 = rejected
        ]);

        return res.json({
            code: 200,
            message: "Lấy thống kê sản phẩm thành công",
            status: "success",
            data: {
                timeline: filledStats,
                totals: {
                    total: totalProducts,
                    active: activeProducts,
                    pending: pendingProducts,
                    rejected: rejectedProducts
                }
            }
        });
    } catch (error) {
        console.error("Error getting product stats:", error);
        return res.json({
            code: 500,
            message: "Lỗi khi lấy thống kê sản phẩm",
            status: "error",
            error: error.message
        });
    }
};

