import api from '../customizeAPI';

export interface VerificationRequest {
  _id: string;
  requestGuid: string;
  userId: {
    _id: string;
    fullName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
  };
  idCardInfo?: {
    idNumber?: string;
    fullName?: string;
    dateOfBirth?: string;
    address?: string;
  };
  documents: Array<{
    documentType: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  reason?: string;
  status: 'Pending' | 'In Progress' | 'Approved' | 'Rejected';
  assignedTo?: {
    _id: string;
    fullName?: string;
    email?: string;
  };
  assignedAt?: string;
  handledBy?: {
    _id: string;
    fullName?: string;
    email?: string;
  };
  handledAt?: string;
  moderatorNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
  total?: number;
}

const parseResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data;
    } else {
      const text = await response.text();
      return {
        code: response.status,
        message: text || 'Unexpected response format',
        data: undefined
      };
    }
  } catch (error) {
    console.error('Error parsing response:', error);
    return {
      code: response.status || 500,
      message: 'Failed to parse response',
      data: undefined
    };
  }
};

export const verificationRequestAPI = {
  // User: Tạo yêu cầu xác minh
  createVerificationRequest: async (formData: FormData): Promise<ApiResponse<VerificationRequest>> => {
    const response = await api.post('/auth/verification-request', formData);
    return await parseResponse<VerificationRequest>(response);
  },

  // User: Lấy danh sách yêu cầu của mình
  getMyVerificationRequests: async (params?: { status?: string }): Promise<ApiResponse<VerificationRequest[]>> => {
    const query = new URLSearchParams(
      Object.entries(params || {}).reduce((acc, [k, v]) => {
        if (v) acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const response = await api.get(`/auth/verification-request/my${query ? `?${query}` : ''}`);
    return await parseResponse<VerificationRequest[]>(response);
  },

  // User: Lấy chi tiết yêu cầu của mình
  getMyVerificationRequestById: async (id: string): Promise<ApiResponse<VerificationRequest>> => {
    const response = await api.get(`/auth/verification-request/${id}`);
    return await parseResponse<VerificationRequest>(response);
  },

  // Moderator: Lấy tất cả yêu cầu
  getAllVerificationRequests: async (params?: { status?: string; assignedTo?: string }): Promise<ApiResponse<VerificationRequest[]>> => {
    const query = new URLSearchParams(
      Object.entries(params || {}).reduce((acc, [k, v]) => {
        if (v) acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const response = await api.get(`/verification-request-moderator${query ? `?${query}` : ''}`);
    return await parseResponse<VerificationRequest[]>(response);
  },

  // Moderator: Lấy chi tiết yêu cầu
  getVerificationRequestById: async (id: string): Promise<ApiResponse<VerificationRequest>> => {
    const response = await api.get(`/verification-request-moderator/${id}`);
    return await parseResponse<VerificationRequest>(response);
  },

  // Moderator: Nhận yêu cầu (assign)
  assignVerificationRequest: async (id: string): Promise<ApiResponse<VerificationRequest>> => {
    const response = await api.post(`/verification-request-moderator/${id}/assign`);
    return await parseResponse<VerificationRequest>(response);
  },

  // Moderator: Xử lý yêu cầu (approve/reject)
  handleVerificationRequest: async (
    id: string,
    action: 'approved' | 'rejected',
    data?: { 
      moderatorNotes?: string; 
      rejectionReason?: string;
      idCardInfo?: {
        idNumber: string;
        fullName: string;
        dateOfBirth: string;
        address: string;
      };
    }
  ): Promise<ApiResponse<VerificationRequest>> => {
    const response = await api.post(`/verification-request-moderator/${id}/handle`, {
      action,
      moderatorNotes: data?.moderatorNotes,
      rejectionReason: data?.rejectionReason,
      idCardInfo: data?.idCardInfo
    });
    return await parseResponse<VerificationRequest>(response);
  }
};

export const createVerificationRequest = verificationRequestAPI.createVerificationRequest;
export const getMyVerificationRequests = verificationRequestAPI.getMyVerificationRequests;

