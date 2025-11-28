const Item = require("../../models/Product/Item.model");
const Post = require("../../models/Blog/Post.model");
const User = require("../../models/User.model");
const Report = require("../../models/Order/Reports.model");
const Comment = require("../../models/Blog/Comment.model");
const VerificationRequest = require("../../models/VerificationRequest.model");
const OwnerRequest = require("../../models/OwnerRequest.model");
const Complaint = require("../../models/Complaint.model");
const mongoose = require("mongoose");

// Get product statistics (matching dashboard structure)
exports.getProductStats = async (req, res) => {
    try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Current month products
        const [totalProducts, approvedProducts, rejectedProducts, pendingProducts] = await Promise.all([
            Item.countDocuments({ IsDeleted: { $ne: true } }),
            Item.countDocuments({ StatusId: 2, IsDeleted: { $ne: true } }),
            Item.countDocuments({ StatusId: 3, IsDeleted: { $ne: true } }),
            Item.countDocuments({ StatusId: 1, IsDeleted: { $ne: true } })
        ]);

        // Previous month NEW products for change calculation
        const previousMonthNewProducts = await Item.countDocuments({
            CreatedAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
            IsDeleted: { $ne: true }
        });

        // Current month new products
        const currentMonthNewProducts = await Item.countDocuments({
            CreatedAt: { $gte: currentMonthStart },
            IsDeleted: { $ne: true }
        });

        const productsChange = previousMonthNewProducts > 0 
            ? ((currentMonthNewProducts - previousMonthNewProducts) / previousMonthNewProducts) * 100 
            : 0;

        res.json({
            success: true,
            data: {
                totalProducts: {
                    value: totalProducts.toLocaleString(),
                    rawValue: totalProducts,
                    change: parseFloat(productsChange.toFixed(1)),
                    changeType: productsChange >= 0 ? "increase" : "decrease"
                },
                approvedProducts: {
                    value: approvedProducts.toLocaleString(),
                    rawValue: approvedProducts
                },
                rejectedProducts: {
                    value: rejectedProducts.toLocaleString(),
                    rawValue: rejectedProducts
                },
                pendingProducts: {
                    value: pendingProducts.toLocaleString(),
                    rawValue: pendingProducts
                }
            }
        });
    } catch (err) {
        console.error("getProductStats error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get post statistics (matching dashboard structure)
exports.getPostStats = async (req, res) => {
    try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Current month posts
        const [totalPosts, activePosts, pendingPosts] = await Promise.all([
            Post.countDocuments(),
            Post.countDocuments({ isActive: true }),
            Post.countDocuments({ isActive: false })
        ]);

        // Previous month NEW posts for change calculation
        const previousMonthNewPosts = await Post.countDocuments({
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
        });

        // Current month new posts
        const currentMonthNewPosts = await Post.countDocuments({
            createdAt: { $gte: currentMonthStart }
        });

        const postsChange = previousMonthNewPosts > 0 
            ? ((currentMonthNewPosts - previousMonthNewPosts) / previousMonthNewPosts) * 100 
            : 0;

        // New posts today
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const newPostsToday = await Post.countDocuments({
            createdAt: { $gte: todayStart }
        });

        res.json({
            success: true,
            data: {
                totalPosts: {
                    value: totalPosts.toLocaleString(),
                    rawValue: totalPosts,
                    change: parseFloat(postsChange.toFixed(1)),
                    changeType: postsChange >= 0 ? "increase" : "decrease"
                },
                activePosts: {
                    value: activePosts.toLocaleString(),
                    rawValue: activePosts
                },
                pendingPosts: {
                    value: pendingPosts.toLocaleString(),
                    rawValue: pendingPosts
                },
                newPostsToday: {
                    value: newPostsToday.toLocaleString(),
                    rawValue: newPostsToday
                }
            }
        });
    } catch (err) {
        console.error("getPostStats error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get user statistics (matching dashboard structure)
exports.getUserStats = async (req, res) => {
    try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Current month users
        const [totalUsers, verifiedUsers, unverifiedUsers] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isIdVerified: true }),
            User.countDocuments({ isIdVerified: false })
        ]);

        // Previous month NEW users for change calculation
        const previousMonthNewUsers = await User.countDocuments({
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
        });

        // Current month new users
        const currentMonthNewUsers = await User.countDocuments({
            createdAt: { $gte: currentMonthStart }
        });

        const usersChange = previousMonthNewUsers > 0 
            ? ((currentMonthNewUsers - previousMonthNewUsers) / previousMonthNewUsers) * 100 
            : 0;

        // New users today
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const newUsersToday = await User.countDocuments({
            createdAt: { $gte: todayStart }
        });

        res.json({
            success: true,
            data: {
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
                unverifiedUsers: {
                    value: unverifiedUsers.toLocaleString(),
                    rawValue: unverifiedUsers
                },
                newUsersToday: {
                    value: newUsersToday.toLocaleString(),
                    rawValue: newUsersToday
                }
            }
        });
    } catch (err) {
        console.error("getUserStats error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get comment statistics (matching dashboard structure)
exports.getCommentStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Current comments
        const [totalComments, pendingComments, approvedComments] = await Promise.all([
            Comment.countDocuments(),
            Comment.countDocuments({ isApproved: false }),
            Comment.countDocuments({ isApproved: true })
        ]);

        // New comments today
        const newCommentsToday = await Comment.countDocuments({
            createdAt: { $gte: todayStart }
        });

        res.json({
            success: true,
            data: {
                totalComments: {
                    value: totalComments.toLocaleString(),
                    rawValue: totalComments
                },
                pendingComments: {
                    value: pendingComments.toLocaleString(),
                    rawValue: pendingComments
                },
                approvedComments: {
                    value: approvedComments.toLocaleString(),
                    rawValue: approvedComments
                },
                newCommentsToday: {
                    value: newCommentsToday.toLocaleString(),
                    rawValue: newCommentsToday
                }
            }
        });
    } catch (err) {
        console.error("getCommentStats error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get verification statistics (matching dashboard structure)
exports.getVerificationStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Verification requests
        const [totalVerifications, pendingVerifications, approvedVerifications, rejectedVerifications] = await Promise.all([
            VerificationRequest.countDocuments(),
            VerificationRequest.countDocuments({ status: "Pending" }),
            VerificationRequest.countDocuments({ status: "Approved" }),
            VerificationRequest.countDocuments({ status: "Rejected" })
        ]);

        // New verifications today
        const newVerificationsToday = await VerificationRequest.countDocuments({
            createdAt: { $gte: todayStart }
        });

        res.json({
            success: true,
            data: {
                totalVerifications: {
                    value: totalVerifications.toLocaleString(),
                    rawValue: totalVerifications
                },
                pendingVerifications: {
                    value: pendingVerifications.toLocaleString(),
                    rawValue: pendingVerifications
                },
                approvedVerifications: {
                    value: approvedVerifications.toLocaleString(),
                    rawValue: approvedVerifications
                },
                rejectedVerifications: {
                    value: rejectedVerifications.toLocaleString(),
                    rawValue: rejectedVerifications
                },
                newVerificationsToday: {
                    value: newVerificationsToday.toLocaleString(),
                    rawValue: newVerificationsToday
                }
            }
        });
    } catch (err) {
        console.error("getVerificationStats error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get owner request statistics (matching dashboard structure)
exports.getOwnerRequestStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Owner requests
        const [totalOwnerRequests, pendingOwnerRequests, approvedOwnerRequests, rejectedOwnerRequests] = await Promise.all([
            OwnerRequest.countDocuments(),
            OwnerRequest.countDocuments({ status: "pending" }),
            OwnerRequest.countDocuments({ status: "approved" }),
            OwnerRequest.countDocuments({ status: "rejected" })
        ]);

        // New owner requests today
        const newOwnerRequestsToday = await OwnerRequest.countDocuments({
            createdAt: { $gte: todayStart }
        });

        res.json({
            success: true,
            data: {
                totalOwnerRequests: {
                    value: totalOwnerRequests.toLocaleString(),
                    rawValue: totalOwnerRequests
                },
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
                newOwnerRequestsToday: {
                    value: newOwnerRequestsToday.toLocaleString(),
                    rawValue: newOwnerRequestsToday
                }
            }
        });
    } catch (err) {
        console.error("getOwnerRequestStats error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get complaint statistics (matching dashboard structure)
exports.getComplaintStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Complaints
        const [totalComplaints, pendingComplaints, reviewingComplaints, resolvedComplaints, rejectedComplaints] = await Promise.all([
            Complaint.countDocuments(),
            Complaint.countDocuments({ status: "pending" }),
            Complaint.countDocuments({ status: "reviewing" }),
            Complaint.countDocuments({ status: "resolved" }),
            Complaint.countDocuments({ status: "rejected" })
        ]);

        // New complaints today
        const newComplaintsToday = await Complaint.countDocuments({
            createdAt: { $gte: todayStart }
        });

        res.json({
            success: true,
            data: {
                totalComplaints: {
                    value: totalComplaints.toLocaleString(),
                    rawValue: totalComplaints
                },
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
                newComplaintsToday: {
                    value: newComplaintsToday.toLocaleString(),
                    rawValue: newComplaintsToday
                }
            }
        });
    } catch (err) {
        console.error("getComplaintStats error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get report statistics (matching dashboard structure)
exports.getReportStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Reports
        const [totalReports, pendingReports, inProgressReports, reviewedReports, resolvedReports, rejectedReports] = await Promise.all([
            Report.countDocuments(),
            Report.countDocuments({ status: "Pending" }),
            Report.countDocuments({ status: "In Progress" }),
            Report.countDocuments({ status: "Reviewed" }),
            Report.countDocuments({ status: "Resolved" }),
            Report.countDocuments({ status: "Rejected" })
        ]);

        // New reports today
        const newReportsToday = await Report.countDocuments({
            createdAt: { $gte: todayStart }
        });

        res.json({
            success: true,
            data: {
                totalReports: {
                    value: totalReports.toLocaleString(),
                    rawValue: totalReports
                },
                pendingReports: {
                    value: pendingReports.toLocaleString(),
                    rawValue: pendingReports
                },
                inProgressReports: {
                    value: inProgressReports.toLocaleString(),
                    rawValue: inProgressReports
                },
                reviewedReports: {
                    value: reviewedReports.toLocaleString(),
                    rawValue: reviewedReports
                },
                resolvedReports: {
                    value: resolvedReports.toLocaleString(),
                    rawValue: resolvedReports
                },
                rejectedReports: {
                    value: rejectedReports.toLocaleString(),
                    rawValue: rejectedReports
                },
                newReportsToday: {
                    value: newReportsToday.toLocaleString(),
                    rawValue: newReportsToday
                }
            }
        });
    } catch (err) {
        console.error("getReportStats error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get product chart data (daily statistics)
exports.getProductStatsByDate = async (req, res) => {
    try {
        const now = new Date();
        const { filter = '30days' } = req.query; // Default to 30days
        
        let matchCondition = {
            IsDeleted: { $ne: true }
        };
        
        // Only add date filter if not 'all'
        if (filter !== 'all') {
            const daysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchCondition.CreatedAt = { $gte: daysAgo };
        }

        const dailyStats = await Item.aggregate([
            {
                $match: matchCondition
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$CreatedAt"
                        }
                    },
                    total: { $sum: 1 },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ["$StatusId", 1] }, 1, 0]
                        }
                    },
                    approved: {
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

        // For 'all' filter, get the earliest date for range calculation
        let startDate;
        if (filter === 'all') {
            const earliestProduct = await Item.findOne({ IsDeleted: { $ne: true } }).sort({ CreatedAt: 1 });
            startDate = earliestProduct ? new Date(earliestProduct.CreatedAt) : new Date();
        } else {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Fill missing dates with zero counts
        const filledStats = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= now) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayData = dailyStats.find(stat => stat._id === dateStr);
            
            filledStats.push({
                date: dateStr,
                total: dayData ? dayData.total : 0,
                pending: dayData ? dayData.pending : 0,
                approved: dayData ? dayData.approved : 0,
                rejected: dayData ? dayData.rejected : 0
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json({
            success: true,
            data: filledStats
        });
    } catch (err) {
        console.error("getProductStatsByDate error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get post chart data (daily statistics)
exports.getPostStatsByDate = async (req, res) => {
    try {
        const now = new Date();
        const { filter = '30days' } = req.query; // Default to 30days
        
        let matchCondition = {};
        
        // Only add date filter if not 'all'
        if (filter !== 'all') {
            const daysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchCondition.createdAt = { $gte: daysAgo };
        }

        const dailyStats = await Post.aggregate([
            {
                $match: matchCondition
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt"
                        }
                    },
                    total: { $sum: 1 },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ["$isActive", false] }, 1, 0]
                        }
                    },
                    active: {
                        $sum: {
                            $cond: [{ $eq: ["$isActive", true] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // For 'all' filter, get the earliest date for range calculation
        let startDate;
        if (filter === 'all') {
            const earliestPost = await Post.findOne().sort({ createdAt: 1 });
            startDate = earliestPost ? new Date(earliestPost.createdAt) : new Date();
        } else {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Fill missing dates with zero counts
        const filledStats = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= now) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayData = dailyStats.find(stat => stat._id === dateStr);
            
            filledStats.push({
                date: dateStr,
                total: dayData ? dayData.total : 0,
                pending: dayData ? dayData.pending : 0,
                active: dayData ? dayData.active : 0
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json({
            success: true,
            data: filledStats
        });
    } catch (err) {
        console.error("getPostStatsByDate error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get user chart data (daily statistics)
exports.getUserStatsByDate = async (req, res) => {
    try {
        const now = new Date();
        const { filter = '30days' } = req.query; // Default to 30days
        
        let matchCondition = {};
        
        // Only add date filter if not 'all'
        if (filter !== 'all') {
            const daysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchCondition.createdAt = { $gte: daysAgo };
        }

        const dailyStats = await User.aggregate([
            {
                $match: matchCondition
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt"
                        }
                    },
                    total: { $sum: 1 },
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

        // For 'all' filter, get the earliest date for range calculation
        let startDate;
        if (filter === 'all') {
            const earliestUser = await User.findOne().sort({ createdAt: 1 });
            startDate = earliestUser ? new Date(earliestUser.createdAt) : new Date();
        } else {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Fill missing dates with zero counts
        const filledStats = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= now) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayData = dailyStats.find(stat => stat._id === dateStr);
            
            filledStats.push({
                date: dateStr,
                total: dayData ? dayData.total : 0,
                verified: dayData ? dayData.verified : 0
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json({
            success: true,
            data: filledStats
        });
    } catch (err) {
        console.error("getUserStatsByDate error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
