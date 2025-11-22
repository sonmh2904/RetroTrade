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
            totalOwnerRequests,
            pendingDisputes,
            totalDisputes,
            pendingComplaints,
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
            OwnerRequest.countDocuments({}),
            
            // Disputes/Reports
            Report.countDocuments({ status: "Pending" }),
            Report.countDocuments({}),
            
            // Complaints
            Complaint.countDocuments({ status: "pending" }),
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

        // Calculate changes
        const previousMonthProducts = await Item.countDocuments({
            IsDeleted: { $ne: true },
            CreatedAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
        });
        const productsChange = previousMonthProducts > 0 
            ? ((totalProducts - previousMonthProducts) / previousMonthProducts) * 100 
            : 0;

        const previousMonthUsers = await User.countDocuments({
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
        });
        const usersChange = previousMonthUsers > 0 
            ? ((totalUsers - previousMonthUsers) / previousMonthUsers) * 100 
            : 0;

        const previousMonthPosts = await Post.countDocuments({
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
        });
        const postsChange = previousMonthPosts > 0 
            ? ((totalPosts - previousMonthPosts) / previousMonthPosts) * 100 
            : 0;

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
                }
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

