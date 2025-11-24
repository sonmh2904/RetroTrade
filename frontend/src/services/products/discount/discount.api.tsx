import api from "../../customizeAPI";

export type Discount = {
  _id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startAt: string;
  endAt: string;
  usageLimit?: number;
  usedCount?: number;
  ownerId?: string;
  itemId?: string;
  active: boolean;
  isPublic?: boolean;
  allowedUsers?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isClaimed?: boolean; // Thêm field để track việc user đã claim mã chưa
  isSpecial?: boolean; // Đánh dấu discount đặc biệt (gán riêng cho user)
};

export type CreateDiscountRequest = {
  type: "percent" | "fixed";
  value: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startAt: string;
  endAt: string;
  usageLimit?: number;
  ownerId?: string;
  itemId?: string;
  notes?: string;
  codeLength?: number;
  codePrefix?: string;
  isPublic?: boolean;
};

type ApiListResponse<T> = {
  status: "success" | "error";
  message: string;
  data?: T[];
  pagination?: { total: number; page: number; limit: number; totalPages: number };
};

type ApiSingleResponse<T> = {
  status: "success" | "error";
  message: string;
  data?: T;
};

export async function listDiscounts(page = 1, limit = 20) {
  const res = await api.get(`/discounts?page=${page}&limit=${limit}`);
  const json: ApiListResponse<Discount> = await res.json();
  return json;
}

export async function createDiscount(payload: CreateDiscountRequest) {
  const res = await api.post(`/discounts`, payload);
  const json: ApiSingleResponse<Discount> = await res.json();
  return json;
}

export async function getDiscountByCode(code: string) {
  const res = await api.get(`/discounts/${encodeURIComponent(code)}`);
  const json: ApiSingleResponse<Discount> = await res.json();
  return json;
}

export async function deactivateDiscount(id: string) {
  const res = await api.post(`/discounts/${id}/deactivate`);
  const json: ApiSingleResponse<Discount> = await res.json();
  return json;
}

export async function activateDiscount(id: string) {
  const res = await api.post(`/discounts/${id}/activate`);
  const json: ApiSingleResponse<Discount> = await res.json();
  return json;
}

export async function assignUsersToDiscount(
  id: string,
  payload: { userIds: string[]; perUserLimit?: number; effectiveFrom?: string; effectiveTo?: string }
) {
  // Kiểm tra discount có phải public không trước khi gán
  // Lấy thông tin discount trước
  try {
    const discountRes = await api.get(`/discounts/${id}`);
    const discountJson: ApiSingleResponse<Discount> = await discountRes.json();
    
    if (discountJson.status === "success" && discountJson.data?.isPublic === true) {
      return {
        status: "error" as const,
        message: "Không thể gán discount công khai với người dùng. Discount công khai có thể được sử dụng bởi tất cả người dùng.",
      };
    }
  } catch (error) {
    // Nếu không lấy được thông tin discount, tiếp tục gọi API assign (backend sẽ validate)
    console.warn("Could not check discount status before assigning:", error);
  }
  
  const res = await api.post(`/discounts/${id}/assign-users`, payload);
  const json: ApiSingleResponse<Discount> = await res.json();
  return json;
}

export async function setDiscountPublic(id: string) {
  const res = await api.post(`/discounts/${id}/set-public`);
  const json: ApiSingleResponse<Discount> = await res.json();
  return json;
}

export type UpdateDiscountRequest = {
  type?: "percent" | "fixed";
  value?: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startAt?: string;
  endAt?: string;
  usageLimit?: number;
  notes?: string;
  isPublic?: boolean;
};

export async function updateDiscount(id: string, payload: UpdateDiscountRequest) {
  const res = await api.put(`/discounts/${id}`, payload);
  const json: ApiSingleResponse<Discount> = await res.json();
  return json;
}

// User-facing APIs
export type AvailableDiscountsResponse = {
  status: "success" | "error";
  message: string;
  data?: {
    public: Discount[];
    special: Discount[];
  };
  pagination?: { total: number; page: number; limit: number; totalPages: number };
};

export async function listAvailableDiscounts(page = 1, limit = 20, ownerId?: string, itemId?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (ownerId) params.set("ownerId", ownerId);
  if (itemId) params.set("itemId", itemId);
  const res = await api.get(`/discounts/public/available?${params.toString()}`);
  const json: AvailableDiscountsResponse = await res.json();
  return json;
}

export async function validateDiscount(payload: { code: string; baseAmount: number; ownerId?: string; itemId?: string }) {
  const res = await api.post(`/discounts/validate`, payload);
  const json: { status: "success" | "error"; message: string; data?: { amount: number; discount: Discount } } = await res.json();
  return json;
}

export async function claimDiscount(discountId: string) {
  const res = await api.post(`/discounts/claim`, { discountId });
  type DiscountAssignment = {
    userId?: string;
    uses?: number;
    perUserLimit?: number;
    effectiveFrom?: string;
    effectiveTo?: string;
  };

  type ClaimResponse = {
    discount: Discount;
    assignment?: DiscountAssignment;
    alreadyClaimed?: boolean;
  };

  const json: ApiSingleResponse<ClaimResponse> = await res.json();
  return json;
}


