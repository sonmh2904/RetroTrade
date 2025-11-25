import api from '../customizeAPI';
import type { ApiResponse } from '@iService';

export interface Notification {
  _id: string;
  user: string;
  notificationType: string;
  title: string;
  body: string;
  metaData?: string;
  isRead: boolean;
  CreatedAt: string;
}

export interface NotificationResponse {
  items: Notification[];
  totalItems: number;
}

const parseResponse = async <T = unknown>(response: Response): Promise<ApiResponse<T>> => {
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

export const notificationApi = {
  // Get all notifications with pagination
  getNotifications: async (params?: { limit?: number; skip?: number; isRead?: boolean }): Promise<NotificationResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());

    const response = await api.get(`/notifications?${queryParams.toString()}`);
    const parsed = await parseResponse<NotificationResponse>(response);
    
    if (parsed.code !== 200) {
      throw new Error(parsed.message || 'Failed to fetch notifications');
    }
    
    return parsed.data || { items: [], totalItems: 0 };
  },

  // Get a single notification by ID
  getNotificationById: async (id: string): Promise<Notification> => {
    const response = await api.get(`/notifications/${id}`);
    const parsed = await parseResponse<Notification>(response);
    
    if (parsed.code !== 200) {
      throw new Error(parsed.message || 'Failed to fetch notification');
    }
    
    if (!parsed.data) {
      throw new Error('Notification not found');
    }
    
    return parsed.data;
  },

  // Mark a notification as read
  markAsRead: async (id: string): Promise<void> => {
    const response = await api.put(`/notifications/${id}/read`, {});
    const parsed = await parseResponse<void>(response);
    
    if (parsed.code !== 200) {
      throw new Error(parsed.message || 'Failed to mark notification as read');
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    const response = await api.put('/notifications/read-all', {});
    const parsed = await parseResponse<void>(response);
    
    if (parsed.code !== 200) {
      throw new Error(parsed.message || 'Failed to mark all notifications as read');
    }
  },
};

