import api from '../customizeAPI';

export interface OwnerRequest {
  _id: string;
  user: {
    _id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    role: string;
  };
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string;
  additionalInfo?: string;
  reviewedBy?: {
    _id: string;
    email: string;
    fullName: string;
  };
  reviewedAt?: string;
  rejectionReason?: string;
  notes?: string;
  CreatedAt: string;
  UpdatedAt: string;
  serviceFeeAmount?: number;
  serviceFeePaidAt?: string;
  serviceFeeTransaction?: string;
}

export interface CreateOwnerRequestRequest {
  reason: string;
  additionalInfo?: string;
}

export interface RejectOwnerRequestRequest {
  rejectionReason: string;
  notes?: string;
}

export interface ApproveOwnerRequestRequest {
  notes?: string;
}

export interface OwnerRequestStats {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export const ownerRequestApi = {
  // User: Create a new owner request
  createOwnerRequest: async (data: CreateOwnerRequestRequest): Promise<OwnerRequest> => {
    const response = await api.post('/owner-requests-user', data);
    const result = await response.json();
    if (result.code !== 200) throw new Error(result.message || 'Failed to create owner request');
    return result.data;
  },

  // User: Get my requests
  getMyOwnerRequests: async (): Promise<OwnerRequest[]> => {
    const response = await api.get('/owner-requests-user/my-requests');
    const result = await response.json();
    if (result.code !== 200) throw new Error(result.message || 'Failed to fetch my requests');
    return result.data?.items || [];
  },

  // User: Get single request by ID
  getOwnerRequestById: async (id: string): Promise<OwnerRequest> => {
    const response = await api.get(`/owner-requests-user/${id}`);
    const result = await response.json();
    if (result.code !== 200) throw new Error(result.message || 'Failed to fetch request');
    return result.data;
  },

  // User: Cancel own request
  cancelOwnerRequest: async (id: string): Promise<void> => {
    const response = await api.put(`/owner-requests-user/${id}/cancel`, {});
    const result = await response.json();
    if (result.code !== 200) throw new Error(result.message || 'Failed to cancel request');
  },

  // Moderator: Get all owner requests
  getAllOwnerRequests: async (params?: { limit?: number; skip?: number; status?: string }): Promise<{ items: OwnerRequest[]; totalItems: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.status) queryParams.append('status', params.status);

    const response = await api.get(`/owner-requests-moderator/all?${queryParams.toString()}`);
    const result = await response.json();
    if (result.code !== 200) throw new Error(result.message || 'Failed to fetch requests');
    return result.data;
  },

  // Moderator: Approve owner request
  approveOwnerRequest: async (id: string, data?: ApproveOwnerRequestRequest): Promise<OwnerRequest> => {
    const response = await api.put(`/owner-requests-moderator/${id}/approve`, data || {});
    const result = await response.json();
    if (result.code !== 200) throw new Error(result.message || 'Failed to approve request');
    return result.data;
  },

  // Moderator: Reject owner request
  rejectOwnerRequest: async (id: string, data: RejectOwnerRequestRequest): Promise<OwnerRequest> => {
    const response = await api.put(`/owner-requests-moderator/${id}/reject`, data);
    const result = await response.json();
    if (result.code !== 200) throw new Error(result.message || 'Failed to reject request');
    return result.data;
  },

  // Moderator: Get statistics
  getOwnerRequestStats: async (): Promise<OwnerRequestStats> => {
    const response = await api.get('/owner-requests-moderator/stats/overview');
    const result = await response.json();
    if (result.code !== 200) throw new Error(result.message || 'Failed to fetch stats');
    return result.data;
  },
};

