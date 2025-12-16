import api from "../customizeAPI";
import type { ApiResponse } from "@iService";

export interface ExtensionRequest {
  _id: string;
  orderId: {
    _id: string;
    orderGuid?: string;
    startAt: string;
    endAt: string;
    rentalDuration: number;
    itemId: {
      Title: string;
      PriceUnitId: number;
    };
  };
  requestedEndAt: string;
  originalEndAt: string;
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
  paymentStatus: "unpaid" | "paid" | "refunded";
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

interface ErrorResponseBody {
  message?: string;
  error?: string;
  [key: string]: unknown;
}

const parseResponse = async <T,>(
  response: Response
): Promise<ApiResponse<T>> => {
  let raw: unknown = null;
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    try {
      raw = await response.json();
    } catch {
      raw = null;
    }
  } else {
    raw = await response.text();
  }

  // Xác định message
  let message: string;

  if (typeof raw === "string" && raw.trim() !== "") {
    message = raw;
  } else if (raw && typeof raw === "object" && raw !== null) {
    const body = raw as ErrorResponseBody;

    if (body.message && typeof body.message === "string") {
      message = body.message;
    } else if (body.error && typeof body.error === "string") {
      message = body.error;
    } else if (response.ok) {
      message = "Success";
    } else {
      message = `HTTP ${response.status}: ${response.statusText}`;
    }
  } else if (response.ok) {
    message = "Success";
  } else {
    message = `HTTP ${response.status}: ${response.statusText}`;
  }

  // Xác định data 
  let data: T | undefined = undefined;

  if (raw && typeof raw === "object" && raw !== null) {
    const body = raw as Record<string, unknown>;

    if ("data" in body) {
      if (body.data !== null && body.data !== undefined) {
        data = body.data as T;
      }
      // Nếu body.data === null → data giữ undefined
    } else {
      // Không có key "data" → toàn bộ raw là data
      data = raw as T;
    }
  }

  return {
    code: response.status,
    message,
    data,
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
