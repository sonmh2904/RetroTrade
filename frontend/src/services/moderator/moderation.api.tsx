import instance from "../customizeAPI";

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      error: true,
      message: data.message || `HTTP error! status: ${res.status}`,
    };
  }

  return data;
};

export interface ModerationStats {
  overview: {
    pending: number;
    flagged: number;
    approved: number;
    rejected: number;
    totalProcessed: number;
  };
  violations: {
    total: number;
    last7Days: number;
    byType: Array<{
      _id: string;
      count: number;
    }>;
  };
  users: {
    currentlyBanned: number;
  };
}

export interface ModerationComment {
  _id: string;
  content: string;
  user: {
    _id: string;
    fullName: string;
    displayName: string;
    avatarUrl: string;
    reputationScore: number;
    isCommentBanned: boolean;
  };
  post: {
    _id: string;
    title: string;
  };
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
  violationType: string | null;
  moderationReason: string | null;
  aiConfidence: number | null;
  moderatedBy: {
    _id: string;
    fullName: string;
    displayName: string;
  } | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ModerationResponse {
  code: number;
  message: string;
  data: {
    items: ModerationComment[];
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Lấy danh sách comments cần moderation
 */
export const getPendingComments = async (
  params: {
    skip?: number;
    limit?: number;
    status?: 'pending' | 'flagged' | 'all';
    search?: string;
    violationType?: string;
  } = {}
): Promise<ModerationResponse> => {
  const queryParams = new URLSearchParams();

  if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params.status) queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  if (params.violationType) queryParams.append('violationType', params.violationType);

  const res = await instance.get(`/moderator/moderation/comments?${queryParams.toString()}`);
  return handleResponse(res);
};

/**
 * Duyệt comment
 */
export const approveComment = async (commentId: string): Promise<{ code: number; message: string; data: any }> => {
  const res = await instance.post(`/moderator/moderation/comments/${commentId}/approve`);
  return handleResponse(res);
};

/**
 * Từ chối comment với penalty
 */
export const rejectComment = async (
  commentId: string,
  data: {
    reason: string;
    penaltyUser?: boolean;
    banDuration?: number;
  }
): Promise<{ code: number; message: string; data: any }> => {
  const res = await instance.post(`/moderator/moderation/comments/${commentId}/reject`, data);
  return handleResponse(res);
};

/**
 * Đánh dấu comment cần review lại
 */
export const flagComment = async (
  commentId: string,
  data: { reason?: string }
): Promise<{ code: number; message: string; data: any }> => {
  const res = await instance.post(`/moderator/moderation/comments/${commentId}/flag`, data);
  return handleResponse(res);
};

/**
 * Chạy AI moderation thủ công
 */
export const runAIModeration = async (commentId: string): Promise<{ code: number; message: string; data: any }> => {
  const res = await instance.post(`/moderator/moderation/comments/${commentId}/moderate`);
  return handleResponse(res);
};

/**
 * Lấy thống kê moderation
 */
export const getModerationStats = async (): Promise<{ code: number; message: string; data: ModerationStats }> => {
  const res = await instance.get('/moderator/moderation/stats');
  return handleResponse(res);
};

/**
 * Unban user comments
 */
export const unbanUserComments = async (userId: string): Promise<{ code: number; message: string; data: any }> => {
  const res = await instance.post(`/moderator/moderation/users/${userId}/unban`);
  return handleResponse(res);
};

/**
 * Chạy migration (admin only)
 */
export const runModerationMigration = async (): Promise<{ code: number; message: string }> => {
  const res = await instance.post('/moderator/moderation/migrate');
  return handleResponse(res);
};
