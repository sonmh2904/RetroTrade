import instance from "../customizeAPI";

// Interfaces matching dashboard structure
export interface StatItem {
  value: string;
  rawValue: number;
  change?: number;
  changeType?: "increase" | "decrease";
}

export interface ProductStats {
  totalProducts: StatItem & { change: number; changeType: "increase" | "decrease" };
  approvedProducts: StatItem;
  rejectedProducts: StatItem;
  pendingProducts: StatItem;
}

export interface PostStats {
  totalPosts: StatItem & { change: number; changeType: "increase" | "decrease" };
  activePosts: StatItem;
  pendingPosts: StatItem;
  newPostsToday: StatItem;
}

export interface UserStats {
  totalUsers: StatItem & { change: number; changeType: "increase" | "decrease" };
  verifiedUsers: StatItem;
  unverifiedUsers: StatItem;
  newUsersToday: StatItem;
}

export interface CommentStats {
  totalComments: StatItem;
  pendingComments: StatItem;
  approvedComments: StatItem;
  newCommentsToday: StatItem;
}

export interface VerificationStats {
  totalVerifications: StatItem;
  pendingVerifications: StatItem;
  approvedVerifications: StatItem;
  rejectedVerifications: StatItem;
  newVerificationsToday: StatItem;
}

export interface OwnerRequestStats {
  totalOwnerRequests: StatItem;
  pendingOwnerRequests: StatItem;
  approvedOwnerRequests: StatItem;
  rejectedOwnerRequests: StatItem;
  newOwnerRequestsToday: StatItem;
}

export interface ComplaintStats {
  totalComplaints: StatItem;
  pendingComplaints: StatItem;
  reviewingComplaints: StatItem;
  resolvedComplaints: StatItem;
  rejectedComplaints: StatItem;
  newComplaintsToday: StatItem;
}

export interface ReportStats {
  totalReports: StatItem;
  pendingReports: StatItem;
  inProgressReports: StatItem;
  resolvedReports: StatItem;
  rejectedReports: StatItem;
  newReportsToday: StatItem;
}

// Chart data interfaces
export interface ProductChartData {
  date: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface PostChartData {
  date: string;
  total: number;
  pending: number;
  active: number;
}

export interface UserChartData {
  date: string;
  total: number;
  verified: number;
}

// Chart API service (matching dashboard structure)
export const chartApi = {
  // Product statistics
  getProductStats: async (): Promise<ProductStats> => {
    try {
      const response = await instance.get(`/moderator/dashboard/products/stats`);
      const data = await response.json();
      return data.data || data || {};
    } catch (error) {
      console.error("Error fetching product stats:", error);
      throw error;
    }
  },

  // Post statistics
  getPostStats: async (): Promise<PostStats> => {
    try {
      const response = await instance.get(`/moderator/dashboard/posts/stats`);
      const data = await response.json();
      return data.data || data || {};
    } catch (error) {
      console.error("Error fetching post stats:", error);
      throw error;
    }
  },

  // User statistics
  getUserStats: async (): Promise<UserStats> => {
    try {
      const response = await instance.get(`/moderator/dashboard/users/stats`);
      const data = await response.json();
      return data.data || data || {};
    } catch (error) {
      console.error("Error fetching user stats:", error);
      throw error;
    }
  },

  // Comment statistics
  getCommentStats: async (): Promise<CommentStats> => {
    try {
      const response = await instance.get(`/moderator/dashboard/comments/stats`);
      const data = await response.json();
      return data.data || data || {};
    } catch (error) {
      console.error("Error fetching comment stats:", error);
      throw error;
    }
  },

  // Verification statistics
  getVerificationStats: async (): Promise<VerificationStats> => {
    try {
      const response = await instance.get(`/moderator/dashboard/verifications/stats`);
      const data = await response.json();
      return data.data || data || {};
    } catch (error) {
      console.error("Error fetching verification stats:", error);
      throw error;
    }
  },

  // Owner request statistics
  getOwnerRequestStats: async (): Promise<OwnerRequestStats> => {
    try {
      const response = await instance.get(`/moderator/dashboard/owner-requests/stats`);
      const data = await response.json();
      return data.data || data || {};
    } catch (error) {
      console.error("Error fetching owner request stats:", error);
      throw error;
    }
  },

  // Complaint statistics
  getComplaintStats: async (): Promise<ComplaintStats> => {
    try {
      const response = await instance.get(`/moderator/dashboard/complaints/stats`);
      const data = await response.json();
      return data.data || data || {};
    } catch (error) {
      console.error("Error fetching complaint stats:", error);
      throw error;
    }
  },

  // Report statistics
  getReportStats: async (): Promise<ReportStats> => {
    try {
      const response = await instance.get(`/moderator/dashboard/reports/stats`);
      const data = await response.json();
      return data.data || data || {};
    } catch (error) {
      console.error("Error fetching report stats:", error);
      throw error;
    }
  },

  // Chart data functions
  getProductChartData: async (filter: '30days' | 'all' = '30days'): Promise<ProductChartData[]> => {
    try {
      const response = await instance.get(`/moderator/dashboard/products/chart?filter=${filter}`);
      const data = await response.json();
      return data.data || data || [];
    } catch (error) {
      console.error("Error fetching product chart data:", error);
      throw error;
    }
  },

  getPostChartData: async (filter: '30days' | 'all' = '30days'): Promise<PostChartData[]> => {
    try {
      const response = await instance.get(`/moderator/dashboard/posts/chart?filter=${filter}`);
      const data = await response.json();
      return data.data || data || [];
    } catch (error) {
      console.error("Error fetching post chart data:", error);
      throw error;
    }
  },

  getUserChartData: async (filter: '30days' | 'all' = '30days'): Promise<UserChartData[]> => {
    try {
      const response = await instance.get(`/moderator/dashboard/users/chart?filter=${filter}`);
      const data = await response.json();
      return data.data || data || [];
    } catch (error) {
      console.error("Error fetching user chart data:", error);
      throw error;
    }
  }
};
