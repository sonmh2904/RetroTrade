const Order = require("../../models/Order/Order.model");
const Item = require("../../models/Product/Item.model");
const User = require("../../models/User.model");
const Complaint = require("../../models/Complaint.model");
const Report = require("../../models/Order/Reports.model");
const Rating = require("../../models/Order/Rating.model");
const Favorites = require("../../models/Product/Favorites.model");
const Post = require("../../models/Blog/Post.model");
const Comment = require("../../models/Blog/Comment.model");
const Categories = require("../../models/Product/Categories.model");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
const mongoose = require("mongoose");

/**
 * Get dashboard statistics (revenue, users, orders, products)
 * Requires admin authentication
 */
module.exports.getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const [totalRevenue, previousMonthRevenue] = await Promise.all([
            Order.aggregate([
                { $match: { orderStatus: "completed" } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]),
            Order.aggregate([
                { 
                    $match: { 
                        orderStatus: "completed",
                        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
                    } 
                },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ])
        ]);

        const revenue = totalRevenue[0]?.total || 0;
        const prevRevenue = previousMonthRevenue[0]?.total || 0;
        const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

        const [totalUsers, previousMonthUsers] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({
                createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
            })
        ]);
        const usersChange = previousMonthUsers > 0 ? ((totalUsers - previousMonthUsers) / previousMonthUsers) * 100 : 0;

        const [totalOrders, previousMonthOrders] = await Promise.all([
            Order.countDocuments({}),
            Order.countDocuments({
                createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
            })
        ]);
        const ordersChange = previousMonthOrders > 0 ? ((totalOrders - previousMonthOrders) / previousMonthOrders) * 100 : 0;

        const [totalProducts, previousMonthProducts] = await Promise.all([
            Item.countDocuments({ IsDeleted: { $ne: true } }),
            Item.countDocuments({
                IsDeleted: { $ne: true },
                createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
            })
        ]);
        const productsChange = previousMonthProducts > 0 ? ((totalProducts - previousMonthProducts) / previousMonthProducts) * 100 : 0;

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
            pendingOrders,
            completedOrders,
            cancelledOrders,
            pendingProducts,
            approvedProducts,
            totalComplaints,
            totalDisputes,
            totalRatings,
            totalViews,
            totalFavorites,
            totalPosts,
            totalComments,
            totalCategories,
            totalWalletTransactions,
            totalWalletBalance,
            verifiedUsers,
            activeUsers
        ] = await Promise.all([
            Order.countDocuments({ orderStatus: { $in: ["pending", "confirmed", "progress"] } }),
            Order.countDocuments({ orderStatus: "completed" }),
            Order.countDocuments({ orderStatus: "cancelled" }),
            Item.countDocuments({ IsDeleted: { $ne: true }, StatusId: 1 }),
            Item.countDocuments({ IsDeleted: { $ne: true }, StatusId: 2 }),
            Complaint.countDocuments({}),
            Report.countDocuments({ type: "dispute" }),
            Rating.countDocuments({}),
            Item.aggregate([
                { $match: { IsDeleted: { $ne: true } } },
                { $group: { _id: null, total: { $sum: "$ViewCount" } } }
            ]),
            Favorites.countDocuments({}),
            Post.countDocuments({}),
            Comment.countDocuments({}),
            Categories.countDocuments({}),
            WalletTransaction.countDocuments({}),
            Wallet.aggregate([
                { $group: { _id: null, total: { $sum: "$balance" } } }
            ]),
            User.countDocuments({ isIdVerified: true }),
            User.countDocuments({ isActive: true })
        ]);

        const viewsTotal = totalViews[0]?.total || 0;
        const walletBalanceTotal = totalWalletBalance[0]?.total || 0;

        return res.json({
            code: 200,
            message: "Lấy thống kê thành công",
            status: "success",
            data: {
                revenue: {
                    value: formatRevenue(revenue),
                    rawValue: revenue,
                    change: parseFloat(revenueChange.toFixed(1)),
                    changeType: revenueChange >= 0 ? "increase" : "decrease"
                },
                users: {
                    value: totalUsers.toLocaleString(),
                    rawValue: totalUsers,
                    change: parseFloat(usersChange.toFixed(1)),
                    changeType: usersChange >= 0 ? "increase" : "decrease"
                },
                orders: {
                    value: totalOrders.toLocaleString(),
                    rawValue: totalOrders,
                    change: parseFloat(ordersChange.toFixed(1)),
                    changeType: ordersChange >= 0 ? "increase" : "decrease"
                },
                products: {
                    value: totalProducts.toLocaleString(),
                    rawValue: totalProducts,
                    change: parseFloat(productsChange.toFixed(1)),
                    changeType: productsChange >= 0 ? "increase" : "decrease"
                },
                // Additional stats
                pendingOrders: {
                    value: pendingOrders.toLocaleString(),
                    rawValue: pendingOrders
                },
                completedOrders: {
                    value: completedOrders.toLocaleString(),
                    rawValue: completedOrders
                },
                cancelledOrders: {
                    value: cancelledOrders.toLocaleString(),
                    rawValue: cancelledOrders
                },
                pendingProducts: {
                    value: pendingProducts.toLocaleString(),
                    rawValue: pendingProducts
                },
                approvedProducts: {
                    value: approvedProducts.toLocaleString(),
                    rawValue: approvedProducts
                },
                complaints: {
                    value: totalComplaints.toLocaleString(),
                    rawValue: totalComplaints
                },
                disputes: {
                    value: totalDisputes.toLocaleString(),
                    rawValue: totalDisputes
                },
                ratings: {
                    value: totalRatings.toLocaleString(),
                    rawValue: totalRatings
                },
                views: {
                    value: viewsTotal.toLocaleString(),
                    rawValue: viewsTotal
                },
                favorites: {
                    value: totalFavorites.toLocaleString(),
                    rawValue: totalFavorites
                },
                posts: {
                    value: totalPosts.toLocaleString(),
                    rawValue: totalPosts
                },
                comments: {
                    value: totalComments.toLocaleString(),
                    rawValue: totalComments
                },
                categories: {
                    value: totalCategories.toLocaleString(),
                    rawValue: totalCategories
                },
                walletTransactions: {
                    value: totalWalletTransactions.toLocaleString(),
                    rawValue: totalWalletTransactions
                },
                walletBalance: {
                    value: formatRevenue(walletBalanceTotal),
                    rawValue: walletBalanceTotal
                },
                verifiedUsers: {
                    value: verifiedUsers.toLocaleString(),
                    rawValue: verifiedUsers
                },
                activeUsers: {
                    value: activeUsers.toLocaleString(),
                    rawValue: activeUsers
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

        const revenueData = await Order.aggregate([
            {
                $match: {
                    orderStatus: "completed",
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    revenue: { $sum: "$totalAmount" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        return res.json({
            code: 200,
            message: "Lấy thống kê doanh thu thành công",
            status: "success",
            data: revenueData.map(item => ({
                date: item._id,
                revenue: item.revenue,
                orders: item.count
            }))
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
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

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
                timeline: userData.map(item => ({
                    date: item._id,
                    users: item.count
                })),
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
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Get orders by status
        const ordersByStatus = await Order.aggregate([
            {
                $group: {
                    _id: "$orderStatus",
                    count: { $sum: 1 }
                }
            }
        ]);

        const statusMap = {};
        ordersByStatus.forEach(item => {
            statusMap[item._id] = item.count;
        });

        return res.json({
            code: 200,
            message: "Lấy thống kê đơn hàng thành công",
            status: "success",
            data: {
                timeline: orderData.map(item => ({
                    date: item._id,
                    orders: item.count,
                    revenue: item.totalAmount
                })),
                byStatus: statusMap
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
                        $dateToString: { format: "%Y-%m-%d", date: "$CreatedAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Get products by status
        const productsByStatus = await Item.aggregate([
            {
                $match: { IsDeleted: { $ne: true } }
            },
            {
                $group: {
                    _id: "$StatusId",
                    count: { $sum: 1 }
                }
            }
        ]);

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
                timeline: productData.map(item => ({
                    date: item._id,
                    products: item.count
                })),
                totals: {
                    total: totalProducts,
                    active: activeProducts,
                    pending: pendingProducts,
                    rejected: rejectedProducts
                },
                byStatus: productsByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
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

