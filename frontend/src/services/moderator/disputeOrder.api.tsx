import api from "@/services/customizeAPI";
import type { ApiResponse } from "@iService";
import type { Order } from "@/services/auth/order.api";
export interface Dispute {
  _id: string;
  orderId: Order
  reporterId: { _id: string; fullName: string; email: string };
  reportedUserId: { _id: string; fullName: string; email: string };
  reason: string;
  description?: string;
  evidence?: string[];
  type: "dispute";
  status: "Pending" | "In Progress" | "Reviewed" | "Resolved" | "Rejected";
  resolution?: {
    decision: string;
    notes?: string;
    refundAmount: number;
  };
  assignedBy?: { _id: string; fullName: string; email: string };
  assignedAt?: string;
  handledBy?: { _id: string; fullName: string };
  handledAt?: string;
  createdAt: string;
}


export interface CreateDisputeRequest {
  orderId: string;
  reason: string;
  description?: string;
  evidence?: File[];
}

const parseResponse = async <T,>(
  response: Response
): Promise<ApiResponse<T>> => {
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

export const createDispute = async (
  payload: CreateDisputeRequest
): Promise<ApiResponse<Dispute>> => {
  const formData = new FormData();

  formData.append("orderId", payload.orderId);
  formData.append("reason", payload.reason);
  if (payload.description?.trim()) {
    formData.append("description", payload.description.trim());
  }

  if (payload.evidence && payload.evidence.length > 0) {
    if (payload.evidence.length > 5) {
      throw new Error("Chỉ được upload tối đa 5 ảnh bằng chứng.");
    }

    payload.evidence.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`File "${file.name}" quá lớn. Tối đa 10MB.`);
      }
      formData.append("evidence", file);
    });
  }

  const response = await api.post("/dispute", formData);
  return await parseResponse<Dispute>(response);
};


export const getDisputes = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  orderGuid?: string;
  search?: string;
}): Promise<ApiResponse<{ total: number; data: Dispute[] }>> => {
  const query = new URLSearchParams();

  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.status) query.append("status", params.status);
  if (params?.orderGuid) query.append("orderGuid", params.orderGuid);
  if (params?.search) query.append("search", params.search);

  const url = `/dispute${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await api.get(url);
  return await parseResponse(response);
};

export const getMyDisputes = async (params?: {
  status?: string;
}): Promise<ApiResponse<{ total: number; data: Dispute[] }>> => {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);

  const url = `/dispute/my${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await api.get(url);
  return await parseResponse(response);
};

export const getDisputeById = async (
  id: string
): Promise<ApiResponse<Dispute>> => {
  const response = await api.get(`/dispute/${id}`);
  return await parseResponse(response);
};

export const resolveDispute = async (
  id: string,
  payload: { decision: string; notes?: string; refundAmount?: number }
): Promise<ApiResponse<Dispute>> => {
  const response = await api.put(`/dispute/${id}/resolve`, payload);
  return await parseResponse(response);
};
