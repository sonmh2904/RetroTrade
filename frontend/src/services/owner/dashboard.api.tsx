import api from "../customizeAPI";

export interface OwnerOrder {
  orderGuid: string;
  orderStatus: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    fullName: string;
    email: string;
  };
  itemSnapshot: {
    title: string;
    images: string[];
    basePrice: number;
    priceUnit: string;
  };
  unitCount: number;
  startAt: string;
  endAt: string;
  itemCount: number;
}

export interface OwnerOrderResponse {
  orders: OwnerOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    limit: number;
  };
  statistics: {
    pending: { count: number; amount: number };
    confirmed: { count: number; amount: number };
    in_progress: { count: number; amount: number };
    completed: { count: number; amount: number };
    cancelled: { count: number; amount: number };
  };
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface OwnerRevenueResponse {
  timeline: RevenueDataPoint[];
  totals: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
  };
  monthlyComparison: {
    currentMonth: number;
    previousMonth: number;
    change: number;
    changeType: "increase" | "decrease";
  };
  byStatus: {
    pending: { count: number; revenue: number };
    confirmed: { count: number; revenue: number };
    in_progress: { count: number; revenue: number };
    completed: { count: number; revenue: number };
    cancelled: { count: number; revenue: number };
  };
}

export const ownerDashboardApi = {
  /**
   * Get orders for the authenticated owner
   */
  getOrders: async (params?: {
    period?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<OwnerOrderResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`/owner/dashboard/orders?${queryParams.toString()}`);
    const result = await response.json();
    if (result.code !== 200) {
      throw new Error(result.message || "Failed to fetch orders");
    }
    return result.data;
  },

  /**
   * Get revenue statistics for the authenticated owner
   */
  getRevenue: async (period: string = "30d"): Promise<OwnerRevenueResponse> => {
    const response = await api.get(`/owner/dashboard/revenue?period=${period}`);
    const result = await response.json();
    if (result.code !== 200) {
      throw new Error(result.message || "Failed to fetch revenue data");
    }
    return result.data;
  },
};