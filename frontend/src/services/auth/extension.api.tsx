import api from "../customizeAPI";
import type { ApiResponse } from "@iService";

export interface ExtensionRequest {
  _id: string;
  orderId: string;
  requestedEndAt: string;
  extensionDuration: number;
  extensionUnit: string;
  extensionFee: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateExtensionRequest {
  extensionDuration: number; 
  notes?: string; 
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
}

export interface ExtensionListResponse {
  message: string;
  data: ExtensionRequest[];
}

const parseResponse = async <T = unknown,>(
  response: Response
): Promise<ApiResponse<T>> => {
  const contentType = response.headers.get("content-type");
  const data = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  return {
    code: response.status,
    message: data?.message || "Request completed",
    data: (data?.data || data) as T,
  };
};

// 1. Renter yêu cầu gia hạn (POST /order/:id/extend)
export const requestExtension = async (
  orderId: string,
  payload: CreateExtensionRequest
): Promise<ApiResponse<ExtensionResponse>> => {
  const response = await api.post(`/order/${orderId}/extend`, payload);
  return await parseResponse<ExtensionResponse>(response);
};

// 2. Lấy danh sách yêu cầu gia hạn cho order (GET /order/:id/extensions)
export const getExtensionRequests = async (
  orderId: string
): Promise<ApiResponse<ExtensionRequest[]>> => {
  const response = await api.get(`/order/${orderId}/extensions`);
  return await parseResponse<ExtensionRequest[]>(response);
};

// 3. Owner approve gia hạn (POST /order/:orderId/extension/:requestId/approve)
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

// 4. Owner reject gia hạn (POST /order/:orderId/extension/:requestId/reject)
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
