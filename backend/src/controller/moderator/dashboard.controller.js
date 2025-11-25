const Order = require("../../models/Order/Order.model");
const Item = require("../../models/Product/Item.model");
const User = require("../../models/User.model");
const Report = require("../../models/Order/Reports.model");
const Post = require("../../models/Blog/Post.model");
const Comment = require("../../models/Blog/Comment.model");
const VerificationRequest = require("../../models/VerificationRequest.model");
const OwnerRequest = require("../../models/OwnerRequest.model");
const Complaint = require("../../models/Complaint.model");
const mongoose = require("mongoose");

/**
 * Get dashboard statistics for moderator
 * Requires moderator authentication
 */
module.exports.getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Today's date range
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Last 24 hours
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Last 7 days for time series data
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Last 30 days for monthly trends
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Main statistics
        const [
            pendingProducts,
            approvedProducts,
            rejectedProducts,
            totalProducts,
            pendingPosts,
            totalPosts,
            pendingComments,
            totalComments,
            pendingVerifications,
            totalVerifications,
            pendingOwnerRequests,
            approvedOwnerRequests,
            rejectedOwnerRequests,
            totalOwnerRequests,
            pendingDisputes,
            totalDisputes,
            pendingComplaints,
            reviewingComplaints,
            resolvedComplaints,
            rejectedComplaints,
            totalComplaints,
            newUsersToday,
            newUsersThisMonth,
            totalUsers,
            verifiedUsers,
            newPostsToday,
            newCommentsToday
        ] = await Promise.all([
            // Products
            Item.countDocuments({ IsDeleted: { $ne: true }, StatusId: 1 }),
            Item.countDocuments({ IsDeleted: { $ne: true }, StatusId: 2 }),
            Item.countDocuments({ IsDeleted: { $ne: true }, StatusId: 3 }),
            Item.countDocuments({ IsDeleted: { $ne: true } }),
            
            // Posts (assuming isActive: false means pending)
            Post.countDocuments({ isActive: false }),
            Post.countDocuments({}),
            
            // Comments (count deleted comments as pending review, or all non-deleted)
            Comment.countDocuments({ isDeleted: true }),
            Comment.countDocuments({ isDeleted: { $ne: true } }),
            
            // Verification requests
            VerificationRequest.countDocuments({ status: "pending" }),
            VerificationRequest.countDocuments({}),
            
            // Owner requests
            OwnerRequest.countDocuments({ status: "pending" }),
            OwnerRequest.countDocuments({ status: "approved" }),
            OwnerRequest.countDocuments({ status: "rejected" }),
            OwnerRequest.countDocuments({}),
            
            // Disputes/Reports
            Report.countDocuments({ status: "Pending" }),
            Report.countDocuments({}),
            
            // Complaints
            Complaint.countDocuments({ status: "pending" }),
            Complaint.countDocuments({ status: "reviewing" }),
            Complaint.countDocuments({ status: "resolved" }),
            Complaint.countDocuments({ status: "rejected" }),
            Complaint.countDocuments({}),
            
            // Users
            User.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
            User.countDocuments({ createdAt: { $gte: currentMonthStart } }),
            User.countDocuments({}),
            User.countDocuments({ isIdVerified: true }),
            
            // New content today
            Post.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
            Comment.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } })
        ]);

        // Calculate changes - SO SÁNH SẢN PHẨM MỚI THÁNG NAY vs THÁNG TRƯỚC
        const previousMonthNewProducts = await Item.countDocuments({
            IsDeleted: { $ne: true },
            CreatedAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
        });
        const currentMonthNewProducts = await Item.countDocuments({
            IsDeleted: { $ne: true },
            CreatedAt: { $gte: currentMonthStart }
        });
        const productsChange = previousMonthNewProducts > 0 
            ? ((currentMonthNewProducts - previousMonthNewProducts) / previousMonthNewProducts) * 100 
            : 0;

        const previousMonthNewUsers = await User.countDocuments({
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
        });
        const currentMonthNewUsers = await User.countDocuments({
            createdAt: { $gte: currentMonthStart }
        });
        const usersChange = previousMonthNewUsers > 0 
            ? ((currentMonthNewUsers - previousMonthNewUsers) / previousMonthNewUsers) * 100 
            : 0;

        const previousMonthNewPosts = await Post.countDocuments({
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
        });
        const currentMonthNewPosts = await Post.countDocuments({
            createdAt: { $gte: currentMonthStart }
        });
        const postsChange = previousMonthNewPosts > 0 
            ? ((currentMonthNewPosts - previousMonthNewPosts) / previousMonthNewPosts) * 100 
            : 0;

        // Time series data for charts - Daily data for last 7 days
        const dailyStats = await Promise.all([
            // Products created per day
            Item.aggregate([
                { $match: { IsDeleted: { $ne: true }, CreatedAt: { $gte: last7Days } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$CreatedAt" } },
                        count: { $sum: 1 },
                        pending: { $sum: { $cond: [{ $eq: ["$StatusId", 1] }, 1, 0] } },
                        approved: { $sum: { $cond: [{ $eq: ["$StatusId", 2] }, 1, 0] } },
                        rejected: { $sum: { $cond: [{ $eq: ["$StatusId", 3] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Posts created per day
            Post.aggregate([
                { $match: { createdAt: { $gte: last7Days } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 },
                        pending: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
                        active: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Users registered per day
            User.aggregate([
                { $match: { createdAt: { $gte: last7Days } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 },
                        verified: { $sum: { $cond: [{ $eq: ["$isIdVerified", true] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Reports per day
            Report.aggregate([
                { $match: { createdAt: { $gte: last7Days } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 },
                        pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
                        resolved: { $sum: { $cond: [{ $ne: ["$status", "Pending"] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        // Hourly data for last 24 hours
        const hourlyStats = await Promise.all([
            // Products per hour
            Item.aggregate([
                { $match: { IsDeleted: { $ne: true }, CreatedAt: { $gte: last24Hours } } },
                {
                    $group: {
                        _id: { $hour: "$CreatedAt" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Users per hour
            User.aggregate([
                { $match: { createdAt: { $gte: last24Hours } } },
                {
                    $group: {
                        _id: { $hour: "$createdAt" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        // Category distribution for products
        const categoryStats = await Item.aggregate([
            { $match: { IsDeleted: { $ne: true } } },
            { $group: { _id: "$CategoryId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Status distribution pie chart data
        const statusDistribution = {
            products: {
                pending: pendingProducts,
                approved: approvedProducts,
                rejected: rejectedProducts
            },
            posts: {
                pending: pendingPosts,
                active: totalPosts - pendingPosts
            },
            users: {
                verified: verifiedUsers,
                unverified: totalUsers - verifiedUsers
            },
            disputes: {
                pending: pendingDisputes,
                resolved: totalDisputes - pendingDisputes
            }
        };

        return res.json({
            code: 200,
            message: "Lấy thống kê thành công",
            status: "success",
            data: {
                // Products
                pendingProducts: {
                    value: pendingProducts.toLocaleString(),
                    rawValue: pendingProducts
                },
                approvedProducts: {
                    value: approvedProducts.toLocaleString(),
                    rawValue: approvedProducts
                },
                rejectedProducts: {
                    value: rejectedProducts.toLocaleString(),
                    rawValue: rejectedProducts
                },
                totalProducts: {
                    value: totalProducts.toLocaleString(),
                    rawValue: totalProducts,
                    change: parseFloat(productsChange.toFixed(1)),
                    changeType: productsChange >= 0 ? "increase" : "decrease"
                },
                
                // Posts
                pendingPosts: {
                    value: pendingPosts.toLocaleString(),
                    rawValue: pendingPosts
                },
                totalPosts: {
                    value: totalPosts.toLocaleString(),
                    rawValue: totalPosts,
                    change: parseFloat(postsChange.toFixed(1)),
                    changeType: postsChange >= 0 ? "increase" : "decrease"
                },
                newPostsToday: {
                    value: newPostsToday.toLocaleString(),
                    rawValue: newPostsToday
                },
                
                // Comments
                pendingComments: {
                    value: pendingComments.toLocaleString(),
                    rawValue: pendingComments
                },
                totalComments: {
                    value: totalComments.toLocaleString(),
                    rawValue: totalComments
                },
                newCommentsToday: {
                    value: newCommentsToday.toLocaleString(),
                    rawValue: newCommentsToday
                },
                
                // Verifications
                pendingVerifications: {
                    value: pendingVerifications.toLocaleString(),
                    rawValue: pendingVerifications
                },
                totalVerifications: {
                    value: totalVerifications.toLocaleString(),
                    rawValue: totalVerifications
                },
                
                // Owner Requests
                pendingOwnerRequests: {
                    value: pendingOwnerRequests.toLocaleString(),
                    rawValue: pendingOwnerRequests
                },
                approvedOwnerRequests: {
                    value: approvedOwnerRequests.toLocaleString(),
                    rawValue: approvedOwnerRequests
                },
                rejectedOwnerRequests: {
                    value: rejectedOwnerRequests.toLocaleString(),
                    rawValue: rejectedOwnerRequests
                },
                totalOwnerRequests: {
                    value: totalOwnerRequests.toLocaleString(),
                    rawValue: totalOwnerRequests
                },
                
                // Disputes
                pendingDisputes: {
                    value: pendingDisputes.toLocaleString(),
                    rawValue: pendingDisputes
                },
                totalDisputes: {
                    value: totalDisputes.toLocaleString(),
                    rawValue: totalDisputes
                },
                
                // Complaints
                pendingComplaints: {
                    value: pendingComplaints.toLocaleString(),
                    rawValue: pendingComplaints
                },
                reviewingComplaints: {
                    value: reviewingComplaints.toLocaleString(),
                    rawValue: reviewingComplaints
                },
                resolvedComplaints: {
                    value: resolvedComplaints.toLocaleString(),
                    rawValue: resolvedComplaints
                },
                rejectedComplaints: {
                    value: rejectedComplaints.toLocaleString(),
                    rawValue: rejectedComplaints
                },
                totalComplaints: {
                    value: totalComplaints.toLocaleString(),
                    rawValue: totalComplaints
                },
                
                // Users
                newUsersToday: {
                    value: newUsersToday.toLocaleString(),
                    rawValue: newUsersToday
                },
                newUsersThisMonth: {
                    value: newUsersThisMonth.toLocaleString(),
                    rawValue: newUsersThisMonth
                },
                totalUsers: {
                    value: totalUsers.toLocaleString(),
                    rawValue: totalUsers,
                    change: parseFloat(usersChange.toFixed(1)),
                    changeType: usersChange >= 0 ? "increase" : "decrease"
                },
                verifiedUsers: {
                    value: verifiedUsers.toLocaleString(),
                    rawValue: verifiedUsers
                },
                
                // Time series data for charts
                timeSeries: {
                    daily: {
                        products: dailyStats[0].map(item => ({
                            date: item._id,
                            total: item.count,
                            pending: item.pending,
                            approved: item.approved,
                            rejected: item.rejected
                        })),
                        posts: dailyStats[1].map(item => ({
                            date: item._id,
                            total: item.count,
                            pending: item.pending,
                            active: item.active
                        })),
                        users: dailyStats[2].map(item => ({
                            date: item._id,
                            total: item.count,
                            verified: item.verified
                        })),
                        reports: dailyStats[3].map(item => ({
                            date: item._id,
                            total: item.count,
                            pending: item.pending,
                            resolved: item.resolved
                        }))
                    },
                    hourly: {
                        products: hourlyStats[0].map(item => ({
                            hour: item._id,
                            count: item.count
                        })),
                        users: hourlyStats[1].map(item => ({
                            hour: item._id,
                            count: item.count
                        }))
                    }
                },
                
                // Distribution data for pie charts
                distribution: statusDistribution,
                
                // Category data
                categories: categoryStats.map(item => ({
                    categoryId: item._id,
                    count: item.count
                }))
            }
        });
    } catch (error) {
        console.error("Error getting moderator dashboard stats:", error);
        return res.json({
            code: 500,
            message: "Lỗi khi lấy thống kê",
            status: "error",
            error: error.message
        });
    }
};

