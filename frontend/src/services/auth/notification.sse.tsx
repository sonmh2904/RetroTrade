/**
 * SSE Client for Notifications
 * Kết nối với SSE endpoint để nhận notifications realtime
 */

import { Notification } from './notification.api';

export interface SSEMessage {
  type: 'notification' | 'unread_count';
  data: Notification | { unreadCount: number };
}

export interface NotificationSSECallbacks {
  onNotification?: (notification: Notification) => void;
  onUnreadCount?: (count: number) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

class NotificationSSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private callbacks: NotificationSSECallbacks = {};
  private isConnecting = false;
  private currentToken: string | null = null;

  /**
   * Lấy URL SSE endpoint
   */
  private getSSEUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9999/api/v1';
    return `${apiUrl}/notifications/stream`;
  }

  /**
   * Lấy auth token
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) return null;
    
    // Remove 'Bearer' prefix if present
    return token.replace(/^Bearer\s+/i, '');
  }

  /**
   * Kết nối đến SSE endpoint
   */
  connect(callbacks: NotificationSSECallbacks, tokenOverride?: string): void {
    if (this.isConnecting || this.eventSource?.readyState === EventSource.OPEN) {
      console.log('[SSE] Already connected or connecting');
      return;
    }

    const token = tokenOverride || this.getAuthToken();
    if (!token) {
      console.error('[SSE] No auth token available');
      callbacks.onError?.(new Event('no_token'));
      return;
    }

    this.callbacks = callbacks;
    this.isConnecting = true;
    this.currentToken = token;

    try {
      // EventSource không hỗ trợ custom headers
      // Gửi token qua query param (backend đã hỗ trợ)
      const url = `${this.getSSEUrl()}?token=${encodeURIComponent(token)}`;
      
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log('[SSE] Connected to notification stream');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.callbacks.onConnect?.();
      };

      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          console.log('[SSE] Received message:', event.data);
          const message: SSEMessage = JSON.parse(event.data);
          console.log('[SSE] Parsed message:', message);
          
          if (message.type === 'notification') {
            console.log('[SSE] Processing notification:', message.data);
            this.callbacks.onNotification?.(message.data as Notification);
          } else if (message.type === 'unread_count') {
            const { unreadCount } = message.data as { unreadCount: number };
            console.log('[SSE] Processing unread count:', unreadCount);
            this.callbacks.onUnreadCount?.(unreadCount);
          } else {
            console.warn('[SSE] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error, 'Raw data:', event.data);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        this.isConnecting = false;
        this.callbacks.onError?.(error);
        
        // Auto reconnect logic
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.scheduleReconnect();
        }
      };

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      this.isConnecting = false;
      this.callbacks.onError?.(error as Event);
    }
  }

  /**
   * Lên lịch reconnect
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSE] Max reconnect attempts reached');
      this.callbacks.onDisconnect?.();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts; // Exponential backoff

    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.disconnect(); // Close old connection
      this.connect(this.callbacks, this.currentToken || undefined); // Reconnect with same token
    }, delay);
  }

  /**
   * Ngắt kết nối SSE
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('[SSE] Disconnected from notification stream');
      this.callbacks.onDisconnect?.();
    }

    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.currentToken = null;
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Export singleton instance
export const notificationSSE = new NotificationSSEClient();

