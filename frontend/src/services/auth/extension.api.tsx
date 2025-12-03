import api from "../customizeAPI";
import type { ApiResponse } from "@iService";

export interface ExtensionRequest {
  _id: string;
  orderId: string;
  requestedEndAt: string;
  extensionDuration: number;
  extensionUnit: string;
  extensionFee: number;
  originalExtensionFee?: number;
  discount?: {
    code: string;
    type: "percent" | "fixed";
    value: number;
    amountApplied: number;
    secondaryCode?: string;
    secondaryType?: "percent" | "fixed";
    secondaryValue?: number;
    secondaryAmountApplied?: number;
    totalAmountApplied: number;
  } | null;
  status: "pending" | "approved" | "rejected";
  requestedBy: {
    _id: string;
    fullName: string;
    avatarUrl?: string;
  };
  approvedBy?: {
    _id: string;
    fullName: string;
    avatarUrl?: string;
  };
  notes?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExtensionRequest {
  extensionDuration: number;
  notes?: string;
  publicDiscountCode?: string;
  privateDiscountCode?: string;
}

export interface RejectExtensionRequest {
  rejectReason?: string;
}

// Response types
export interface ExtensionResponse {
  requestId: string;
  newEndAt: string;
  extensionFee: number;
  extensionDuration: number;
  extensionUnit: string;
  discount?: {
    code: string;
    type: "percent" | "fixed";
    value: number;
    amountApplied: number;
    secondaryCode?: string;
    secondaryType?: "percent" | "fixed";
    secondaryValue?: number;
    secondaryAmountApplied?: number;
    totalAmountApplied: number;
  } | null;
}

export interface ExtensionListResponse {
  code: number;
  message: string;
  data: ExtensionRequest[];
}

const parseResponse = async <T,>(
  response: Response
): Promise<ApiResponse<T>> => {
  const contentType = response.headers.get("content-type");
  const raw = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  return {
    code: response.status,
    message: typeof raw === "string" ? raw : raw?.message || "Success",
    data: (raw?.data ?? raw) as T,
  };
};

// 1. Renter yêu cầu gia hạn
export const requestExtension = async (
  orderId: string,
  payload: CreateExtensionRequest
): Promise<ApiResponse<ExtensionResponse>> => {
  const response = await api.post(`/order/${orderId}/extend`, payload);
  return await parseResponse<ExtensionResponse>(response);
};

// 2. Lấy danh sách yêu cầu gia hạn cho order
export const getExtensionRequests = async (
  orderId: string
): Promise<ApiResponse<ExtensionRequest[]>> => {
  try {
    const response = await api.get(`/order/${orderId}/extensions`);
    return await parseResponse<ExtensionRequest[]>(response);
  } catch (error) {
    console.error(`[getExtensionRequests] Error for order ${orderId}:`, error);
    return { code: 200, message: "No extensions", data: [] };
  }
};

// 3. Owner approve gia hạn
export const approveExtension = async (
  orderId: string,
  requestId: string
): Promise<ApiResponse<{ newEndAt: string; additionalFee: number }>> => {
  const response = await api.post(
    `/order/${orderId}/extension/${requestId}/approve`
  );
  return await parseResponse<{ newEndAt: string; additionalFee: number }>(
    response
  );
};

// 4. Owner reject gia hạn
export const rejectExtension = async (
  orderId: string,
  requestId: string,
  payload?: RejectExtensionRequest
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(
    `/order/${orderId}/extension/${requestId}/reject`,
    payload
  );
  return await parseResponse<{ message: string }>(response);
};
