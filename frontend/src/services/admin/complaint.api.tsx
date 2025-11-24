import api from "../customizeAPI";
import type { ApiResponse } from "@iService";

export interface Complaint {
  _id: string;
  email: string;
  userId?: {
    _id: string;
    fullName?: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
    role?: string;
    isDeleted?: boolean;
    isActive?: boolean;
  };
  subject: string;
  message: string;
  status: "pending" | "reviewing" | "resolved" | "rejected";
  handledBy?: {
    _id: string;
    fullName?: string;
    email?: string;
    displayName?: string;
  };
  handledAt?: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
  banHistory?: {
    _id: string;
    reason: string;
    bannedAt: string;
    bannedBy?: {
      _id: string;
      fullName?: string;
      email?: string;
      displayName?: string;
    };
  };
}

interface ComplaintListResponse {
  items: Complaint[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

const parseResponse = async <T,>(response: Response): Promise<ApiResponse<T>> => {
  const data = await response.json();
  return data;
};

export const complaintAPI = {
  // Admin: Lấy danh sách khiếu nại
  getAllComplaints: async (
    page: number = 1,
    limit: number = 10,
    status: string = "all",
    search: string = ""
  ): Promise<ApiResponse<ComplaintListResponse>> => {
    const query = new URLSearchParams(
      Object.entries({ page: page.toString(), limit: limit.toString(), status, search }).reduce(
        (acc, [key, value]) => {
          if (value && value !== "all") acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      )
    ).toString();

    const response = await api.get(`/admin/complaints${query ? `?${query}` : ""}`);
    return await parseResponse<ComplaintListResponse>(response);
  },

  // Admin: Lấy chi tiết khiếu nại
  getComplaintById: async (id: string): Promise<ApiResponse<Complaint>> => {
    const response = await api.get(`/admin/complaints/${id}`);
    return await parseResponse<Complaint>(response);
  },

  // Admin: Xử lý khiếu nại
  handleComplaint: async (
    id: string,
    action: "resolve" | "reject",
    adminResponse?: string
  ): Promise<ApiResponse<Complaint>> => {
    const response = await api.post(`/admin/complaints/${id}/handle`, {
      action,
      adminResponse,
    });
    return await parseResponse<Complaint>(response);
  },
};

