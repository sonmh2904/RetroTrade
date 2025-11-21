import api from "../customizeAPI";

export interface ModeratorDashboardStats {
  // Products
  pendingProducts: {
    value: string;
    rawValue: number;
  };
  approvedProducts: {
    value: string;
    rawValue: number;
  };
  rejectedProducts: {
    value: string;
    rawValue: number;
  };
  totalProducts: {
    value: string;
    rawValue: number;
    change: number;
    changeType: "increase" | "decrease";
  };
  
  // Posts
  pendingPosts: {
    value: string;
    rawValue: number;
  };
  totalPosts: {
    value: string;
    rawValue: number;
    change: number;
    changeType: "increase" | "decrease";
  };
  newPostsToday: {
    value: string;
    rawValue: number;
  };
  
  // Comments
  pendingComments: {
    value: string;
    rawValue: number;
  };
  totalComments: {
    value: string;
    rawValue: number;
  };
  newCommentsToday: {
    value: string;
    rawValue: number;
  };
  
  // Verifications
  pendingVerifications: {
    value: string;
    rawValue: number;
  };
  totalVerifications: {
    value: string;
    rawValue: number;
  };
  
  // Owner Requests
  pendingOwnerRequests: {
    value: string;
    rawValue: number;
  };
  totalOwnerRequests: {
    value: string;
    rawValue: number;
  };
  
  // Disputes
  pendingDisputes: {
    value: string;
    rawValue: number;
  };
  totalDisputes: {
    value: string;
    rawValue: number;
  };
  
  // Complaints
  pendingComplaints: {
    value: string;
    rawValue: number;
  };
  totalComplaints: {
    value: string;
    rawValue: number;
  };
  
  // Users
  newUsersToday: {
    value: string;
    rawValue: number;
  };
  newUsersThisMonth: {
    value: string;
    rawValue: number;
  };
  totalUsers: {
    value: string;
    rawValue: number;
    change: number;
    changeType: "increase" | "decrease";
  };
  verifiedUsers: {
    value: string;
    rawValue: number;
  };
}

export const moderatorDashboardApi = {
  getDashboardStats: async (): Promise<ModeratorDashboardStats> => {
    const response = await api.get("/moderator/dashboard/stats");
    const result = await response.json();
    if (result.code !== 200) {
      throw new Error(result.message || "Failed to fetch moderator dashboard stats");
    }
    return result.data;
  },
};

