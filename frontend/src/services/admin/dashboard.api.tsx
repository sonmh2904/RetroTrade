import api from "../customizeAPI";

export interface DashboardStats {
  revenue: {
    value: string;
    rawValue: number;
    change: number;
    changeType: "increase" | "decrease";
  };
  users: {
    value: string;
    rawValue: number;
    change: number;
    changeType: "increase" | "decrease";
  };
  orders: {
    value: string;
    rawValue: number;
    change: number;
    changeType: "increase" | "decrease";
  };
  products: {
    value: string;
    rawValue: number;
    change: number;
    changeType: "increase" | "decrease";
  };
  pendingOrders?: {
    value: string;
    rawValue: number;
  };
  completedOrders?: {
    value: string;
    rawValue: number;
  };
  cancelledOrders?: {
    value: string;
    rawValue: number;
  };
  pendingProducts?: {
    value: string;
    rawValue: number;
  };
  approvedProducts?: {
    value: string;
    rawValue: number;
  };
  complaints?: {
    value: string;
    rawValue: number;
  };
  disputes?: {
    value: string;
    rawValue: number;
  };
  ratings?: {
    value: string;
    rawValue: number;
  };
  views?: {
    value: string;
    rawValue: number;
  };
  favorites?: {
    value: string;
    rawValue: number;
  };
  posts?: {
    value: string;
    rawValue: number;
  };
  comments?: {
    value: string;
    rawValue: number;
  };
  categories?: {
    value: string;
    rawValue: number;
  };
  walletTransactions?: {
    value: string;
    rawValue: number;
  };
  walletBalance?: {
    value: string;
    rawValue: number;
  };
  verifiedUsers?: {
    value: string;
    rawValue: number;
  };
  activeUsers?: {
    value: string;
    rawValue: number;
  };
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface UserDataPoint {
  date: string;
  users: number;
}

export interface UserStats {
  timeline: UserDataPoint[];
  totals: {
    total: number;
    active: number;
    verified: number;
  };
}

export interface OrderDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface OrderStats {
  timeline: OrderDataPoint[];
  byStatus: Record<string, number>;
}

export interface ProductDataPoint {
  date: string;
  products: number;
}

export interface ProductStats {
  timeline: ProductDataPoint[];
  totals: {
    total: number;
    active: number;
    pending?: number;
    rejected?: number;
  };
  byStatus: Record<string, number>;
}

export const dashboardApi = {

  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get("/admin/dashboard/stats");
    const result = await response.json();
    if (result.code !== 200) {
      throw new Error(result.message || "Failed to fetch dashboard stats");
    }
    return result.data;
  },


  getRevenueStats: async (period: string = "30d"): Promise<RevenueDataPoint[]> => {
    const response = await api.get(`/admin/dashboard/revenue?period=${period}`);
    const result = await response.json();
    if (result.code !== 200) {
      throw new Error(result.message || "Failed to fetch revenue stats");
    }
    return result.data;
  },


  getUserStats: async (period: string = "30d"): Promise<UserStats> => {
    const response = await api.get(`/admin/dashboard/users?period=${period}`);
    const result = await response.json();
    if (result.code !== 200) {
      throw new Error(result.message || "Failed to fetch user stats");
    }
    return result.data;
  },


  getOrderStats: async (period: string = "30d"): Promise<OrderStats> => {
    const response = await api.get(`/admin/dashboard/orders?period=${period}`);
    const result = await response.json();
    if (result.code !== 200) {
      throw new Error(result.message || "Failed to fetch order stats");
    }
    return result.data;
  },

  /**
   * Get product statistics over time
   */
  getProductStats: async (period: string = "30d"): Promise<ProductStats> => {
    const response = await api.get(`/admin/dashboard/products?period=${period}`);
    const result = await response.json();
    if (result.code !== 200) {
      throw new Error(result.message || "Failed to fetch product stats");
    }
    return result.data;
  },
};

