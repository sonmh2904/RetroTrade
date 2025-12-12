import api from "../customizeAPI";
import type { ApiResponse } from "@iService";

export interface LoyaltyPointTransaction {
  _id: string;
  userId: string;
  points: number;
  balance: number;
  type:
    | "daily_login"
    | "order_completed"
    | "order_cancelled"
    | "referral"
    | "game_reward"
    | "admin_adjustment"
    | "expired"
    | "points_to_discount";
  description: string;
  orderId?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyStats {
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
}

const parseResponse = async <T = unknown>(response: Response): Promise<ApiResponse<T>> => {
  const contentType = response.headers.get("content-type");
  const data = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  return {
    code: response.status,
    message: data?.message || "Request completed",
    data: data?.data || data,
  };
};

/**
 * Lấy thống kê RT Points của user
 */
export const getLoyaltyStats = async (): Promise<ApiResponse<LoyaltyStats>> => {
  const response = await api.get("/loyalty/stats");
  return await parseResponse<LoyaltyStats>(response);
};

/**
 * Lấy lịch sử RT Points của user
 */
export const getLoyaltyHistory = async (
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<LoyaltyPointTransaction[]>> => {
  const response = await api.get(`/loyalty/history?page=${page}&limit=${limit}`);
  return await parseResponse<LoyaltyPointTransaction[]>(response);
};

/**
 * Nhận điểm đăng nhập hàng ngày
 */
export const claimDailyLoginPoints = async (): Promise<
  ApiResponse<{ points: number; balance: number; alreadyClaimed?: boolean }>
> => {
  const response = await api.post("/loyalty/claim-daily-login");
  return await parseResponse<{ points: number; balance: number; alreadyClaimed?: boolean }>(response);
};

export interface ConvertToDiscountResponse {
  discount: {
    _id: string;
    code: string;
    value: number;
    type: string;
    endAt: string;
  };
  pointsUsed: number;
  discountPercent: number;
  newBalance: number;
}

/**
 * Quy đổi RT Points sang discount
 */
export const convertPointsToDiscount = async (
  points: number
): Promise<ApiResponse<ConvertToDiscountResponse>> => {
  const response = await api.post("/loyalty/convert-to-discount", { points });
  return await parseResponse<ConvertToDiscountResponse>(response);
};

