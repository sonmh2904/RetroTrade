import api from "../customizeAPI";

export interface ServiceFeeSetting {
  _id: string;
  serviceFeeRate: number;
  description?: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  createdBy?: {
    _id: string;
    fullName: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    fullName: string;
    email: string;
  };
  history?: Array<{
    serviceFeeRate: number;
    description?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    changedAt: string;
    changedBy?: {
      _id: string;
      fullName: string;
      email: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceFeeRequest {
  serviceFeeRate: number;
  description?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateServiceFeeRequest {
  serviceFeeRate?: number;
  description?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export interface ServiceFeeApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Helper function to parse response
const parseResponse = async <T>(
  response: Response
): Promise<ServiceFeeApiResponse<T>> => {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return data;
    } else {
      const text = await response.text();
      return {
        success: false,
        message: text || "Unexpected response format",
        data: undefined,
      };
    }
  } catch (error) {
    console.error("Error parsing response:", error);
    return {
      success: false,
      message: "Failed to parse response",
      data: undefined,
    };
  }
};

// Get current serviceFee setting (public)
export const getCurrentServiceFee = async (): Promise<
  ServiceFeeApiResponse<{
    serviceFeeRate: number;
    description?: string;
    isActive: boolean;
    effectiveFrom: string;
    effectiveTo?: string;
    createdAt: string;
    updatedAt: string;
  }>
> => {
  const response = await api.get("/serviceFee/current");
  return await parseResponse(response);
};

// Get all serviceFee settings (admin only)
export const getAllServiceFeeSettings = async (
  page: number = 1,
  limit: number = 20,
  includeInactive: boolean = false
): Promise<ServiceFeeApiResponse<ServiceFeeSetting[]>> => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(includeInactive && { includeInactive: "true" }),
  });
  const response = await api.get(`/serviceFee?${queryParams}`);
  return await parseResponse(response);
};

// Create new serviceFee setting (admin only)
export const createServiceFeeSetting = async (
  payload: CreateServiceFeeRequest
): Promise<ServiceFeeApiResponse<ServiceFeeSetting>> => {
  const response = await api.post("/serviceFee", payload);
  return await parseResponse(response);
};

// Update serviceFee setting (admin only)
export const updateServiceFeeSetting = async (
  id: string,
  payload: UpdateServiceFeeRequest
): Promise<ServiceFeeApiResponse<ServiceFeeSetting>> => {
  const response = await api.put(`/serviceFee/${id}`, payload);
  return await parseResponse(response);
};

// Delete serviceFee setting (admin only)
export const deleteServiceFeeSetting = async (
  id: string
): Promise<ServiceFeeApiResponse<null>> => {
  const response = await api.delete(`/serviceFee/${id}`);
  return await parseResponse(response);
};

// Get serviceFee history (admin only)
export const getServiceFeeHistory = async (
  id: string
): Promise<
  ServiceFeeApiResponse<{
    currentServiceFee: {
      serviceFeeRate: number;
      description?: string;
      effectiveFrom: string;
      effectiveTo?: string;
    };
    history: Array<{
      serviceFeeRate: number;
      description?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
      changedAt: string;
      changedBy?: {
        _id: string;
        fullName: string;
        email: string;
      };
    }>;
  }>
> => {
  const response = await api.get(`/serviceFee/${id}/history`);
  return await parseResponse(response);
};

// Get all serviceFee history (admin only) - tất cả lịch sử của tất cả serviceFee
export const getAllServiceFeeHistory = async (): Promise<
  ServiceFeeApiResponse<{
    timeline: Array<{
      type: "create" | "update";
      serviceFeeId: string;
      serviceFeeRate: number;
      description?: string;
      effectiveFrom: string;
      effectiveTo?: string;
      isActive?: boolean;
      createdAt?: string;
      changedAt?: string;
      changedBy?: {
        _id: string;
        fullName: string;
        email: string;
      };
      serviceFeeInfo: {
        _id: string;
        serviceFeeRate: number;
        description?: string;
      };
    }>;
    totalEvents: number;
    totalServiceFees: number;
  }>
> => {
  const response = await api.get("/serviceFee/history/all");
  return await parseResponse(response);
};

// Activate serviceFee setting (admin only)
export const activateServiceFeeSetting = async (
  id: string
): Promise<ServiceFeeApiResponse<ServiceFeeSetting>> => {
  const response = await api.post(`/serviceFee/${id}/activate`);
  return await parseResponse(response);
};

