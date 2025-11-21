import api from '../customizeAPI';

export interface Document {
  documentType: string;
  documentNumber: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface OwnerRequest {
  _id: string;
  user: {
    _id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    role: string;
    phone?: string;
    documents?: Document[];
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

