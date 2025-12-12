const Order = require("../../models/Order/Order.model");
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
        
        const [orders, totalCount] = await Promise.all([
            Order.aggregate([
                { $match: matchConditions },
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
            Order.countDocuments(matchConditions)
        ]);

        // Get order statistics by status
        const orderStats = await Order.aggregate([
            { $match: { ownerId: new mongoose.Types.ObjectId(ownerId) } },
            {
                $group: {
                    _id: "$orderStatus",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" }
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
                    amount: stat.totalAmount
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
                statistics: stats
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

        // Get revenue timeline data
        const revenueData = await Order.aggregate([
            {
                $match: {
                    orderStatus: "completed",
                    createdAt: { $gte: startDate },
                    ownerId: new mongoose.Types.ObjectId(ownerId)
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Fill missing dates with zero counts
        const filledStats = [];
        const currentDate = new Date(startDate);
        const today = new Date();
        
        while (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayData = revenueData.find(stat => stat._id === dateStr);
            
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
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    totalOrders: { $sum: 1 },
                    avgOrderValue: { $avg: "$totalAmount" }
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
                $group: {
                    _id: "$orderStatus",
                    count: { $sum: 1 },
                    revenue: { $sum: "$totalAmount" }
                }
            }
        ]);

        // Get monthly revenue comparison
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const [currentMonthRevenue, previousMonthRevenue] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        orderStatus: "completed",
                        createdAt: { $gte: currentMonthStart },
                        ownerId: new mongoose.Types.ObjectId(ownerId)
                    }
                },
                { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
            ]),
            Order.aggregate([
                {
                    $match: {
                        orderStatus: "completed",
                        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
                        ownerId: new mongoose.Types.ObjectId(ownerId)
                    }
                },
                { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
            ])
        ]);

        const currentRevenue = currentMonthRevenue[0]?.total || 0;
        const prevRevenue = previousMonthRevenue[0]?.total || 0;
        const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

        const revenueStats = totalRevenueStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

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
                    totalRevenue: revenueStats.totalRevenue,
                    totalOrders: revenueStats.totalOrders,
                    avgOrderValue: revenueStats.avgOrderValue
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