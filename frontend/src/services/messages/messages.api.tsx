import api from "../customizeAPI";
import { io, Socket } from "socket.io-client";

// API endpoints
export interface SendMessageParams {
  conversationId: string;
  content: string;
}

export interface Conversation {
  _id: string;
  userId1: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  };
  userId2: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  };
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number; // Number of unread messages
  lastReadBy?: {
    userId1?: string; // Last read timestamp for userId1
    userId2?: string; // Last read timestamp for userId2
  };
}

export interface Message {
  _id: string;
  conversationId: string;
  fromUserId: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
  // optional soft-delete/edit fields
  isDeleted?: boolean;
  deletedAt?: string;
  editedAt?: string;
  // Media fields
  mediaType?: 'text' | 'image' | 'video';
  mediaUrl?: string;
  // Read status
  readBy?: string[]; // Array of user IDs who have read this message
}

export interface StaffMember {
  _id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'moderator';
}

// REST API methods

/**
 * Send a text message
 * @param params - Conversation ID and message content
 * @returns Response object
 */
export const sendMessage = async ({ conversationId, content }: SendMessageParams) => {
  return api.post(`/messages/send`, { conversationId, content });
};

export interface SendMediaParams {
  conversationId: string;
  content?: string;
  file: File;
}

/**
 * Send a message with media attachment
 * @param params - Conversation ID, optional content, and file
 * @returns Response object
 */
export const sendMessageWithMedia = async ({ conversationId, content, file }: SendMediaParams) => {
  const formData = new FormData();
  formData.append('media', file);
  formData.append('conversationId', conversationId);
  if (content) {
    formData.append('content', content);
  }
  
  // Don't set Content-Type header - let browser set it automatically with boundary for FormData
  return api.post(`/messages/send-media`, formData);
};

/**
 * Get all messages for a conversation
 * @param conversationId - Conversation ID
 * @returns Response object
 */
export const getMessages = async (conversationId: string) => {
  return api.get(`/messages/${conversationId}`);
};

export interface GetConversationsResponse {
  ok: boolean;
  json: () => Promise<{
    code?: number;
    success?: boolean;
    data?: Conversation[];
    message?: string;
  }>;
}

/**
 * Get all conversations for the current user
 * @returns Response object with conversations data (fetch-like response)
 */
export const getConversations = async (): Promise<GetConversationsResponse> => {
  try {
    const response = await api.get(`/messages/conversations`);
    
    // Response from customizeAPI is a Response object
    return {
      ok: response.ok ?? response.status === 200,
      json: async () => {
        try {
          return await response.json();
        } catch (error) {
          console.error("Error parsing conversations response:", error);
          return { code: 500, success: false, data: [], message: "Failed to parse response" };
        }
      },
    };
  } catch (error) {
    // Handle network/CORS errors gracefully
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch conversations";
    console.warn("Error fetching conversations (this may be normal if backend is not running):", errorMessage);
    
    // Return a valid response object instead of throwing
    return {
      ok: false,
      json: async () => ({ 
        code: 500, 
        success: false, 
        data: [], 
        message: "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng." 
      }),
    };
  }
};

/**
 * Get a specific conversation by ID
 * @param conversationId - Conversation ID
 * @returns Response object
 */
export const getConversation = async (conversationId: string) => {
  return api.get(`/messages/conversations/${conversationId}`);
};

/**
 * Create a new conversation with a target user
 * @param targetUserId - User ID to start conversation with
 * @returns Response object
 */
export const createConversation = async (targetUserId: string) => {
  return api.post(`/messages/conversations`, { targetUserId });
};

/**
 * Update an existing message
 * @param messageId - Message ID
 * @param content - New message content
 * @returns Response object
 */
export const updateMessage = async (messageId: string, content: string) => {
  return api.put(`/messages/message/${messageId}`, { content });
};

/**
 * Delete a message
 * @param messageId - Message ID
 * @returns Response object
 */
export const deleteMessage = async (messageId: string) => {
  return api.delete(`/messages/message/${messageId}`);
};

/**
 * Get list of staff members (admin/moderator)
 * @returns Response object
 */
export const getStaff = async () => {
  return api.get(`/messages/staff`);
};

/**
 * Mark a conversation as read
 * @param conversationId - Conversation ID
 * @returns Response object
 */
export const markAsRead = async (conversationId: string) => {
  return api.put(`/messages/conversations/${conversationId}/mark-read`);
};


// Socket.IO connection management
let socket: Socket | null = null;

// Socket configuration constants
const SOCKET_CONFIG = {
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
  TRANSPORTS: ['websocket', 'polling'] as const,
} as const;

/**
 * Get socket URL from environment or default
 */
const getSocketUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9999/api/v1';
  const baseUrl = apiUrl.replace(/\/api\/v1$/, '');
  return process.env.NEXT_PUBLIC_SOCKET_URL || baseUrl || 'http://localhost:9999';
};

/**
 * Extract and clean auth token
 */
const getAuthToken = (tokenFromRedux?: string): string | undefined => {
  const rawToken = 
    tokenFromRedux || 
    (typeof window !== 'undefined' 
      ? (localStorage.getItem('token') || localStorage.getItem('accessToken')) 
      : undefined);
  
  if (!rawToken || typeof rawToken !== 'string') {
    return undefined;
  }

  // Remove 'Bearer' prefix if present
  return rawToken.replace(/^Bearer\s+/i, '');
};

/**
 * Connect to Socket.IO server
 * @param tokenFromRedux - Optional token from Redux store
 * @returns Socket instance
 */
export const connectSocket = (tokenFromRedux?: string): Socket => {
  // Return existing connected socket
  if (socket?.connected) {
    return socket;
  }

  // Disconnect existing socket if not connected
  if (socket && !socket.connected) {
    socket.disconnect();
    socket = null;
  }

  const SOCKET_URL = getSocketUrl();
  const authToken = getAuthToken(tokenFromRedux);

  if (typeof window !== 'undefined') {
    console.log('[socket] connecting to', SOCKET_URL);
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: authToken,
    },
    transports: [...SOCKET_CONFIG.TRANSPORTS],
    reconnection: true,
    reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
    reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
    autoConnect: true,
  });

  // Set up socket event handlers
  socket.on('connect', () => {
    if (typeof window !== 'undefined') {
      console.log('✅ Socket connected:', socket?.id);
    }
    // Request current online users after connect
    socket?.emit('get_online_users');
  });

  socket.on('disconnect', (reason) => {
    if (typeof window !== 'undefined') {
      console.log('❌ Socket disconnected:', reason);
    }
  });

  socket.on('connect_error', (err) => {
    if (typeof window !== 'undefined') {
      console.error('[socket] connect_error:', err?.message || err);
    }
  });

  socket.on('error', (error) => {
    if (typeof window !== 'undefined') {
      console.error('Socket error:', error);
    }
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    if (typeof window !== 'undefined') {
      console.log('[socket] reconnect_attempt', attemptNumber);
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    if (typeof window !== 'undefined') {
      console.log('[socket] reconnected after', attemptNumber, 'attempts');
    }
  });

  return socket;
};

/**
 * Disconnect from Socket.IO server and cleanup
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get current socket instance
 * @returns Socket instance or null if not connected
 */
export const getSocket = (): Socket | null => {
  return socket?.connected ? socket : null;
};

// Socket event handlers
export const socketHandlers = {
  // Join conversation
  joinConversation: (conversationId: string) => {
    socket?.emit('join_conversation', conversationId);
  },

  // Leave conversation
  leaveConversation: (conversationId: string) => {
    socket?.emit('leave_conversation', conversationId);
  },

  // Send message
  sendMessage: (conversationId: string, content: string) => {
    socket?.emit('send_message', { conversationId, content });
  },

  // Typing indicator
  setTyping: (conversationId: string, isTyping: boolean) => {
    socket?.emit('typing', { conversationId, isTyping });
  },

  // Mark as read
  markAsRead: (conversationId: string) => {
    socket?.emit('mark_read', conversationId);
  },

  // Presence: request current online users
  requestOnlineUsers: () => {
    socket?.emit('get_online_users');
  },

  // Listen for new messages
  onNewMessage: (callback: (message: Message) => void) => {
    socket?.on('new_message', callback);
  },

  // Listen for user joined
  onUserJoined: (callback: (data: { userId: string; conversationId: string }) => void) => {
    socket?.on('user_joined', callback);
  },

  // Listen for typing
  onTyping: (callback: (data: { userId: string; conversationId: string; isTyping: boolean }) => void) => {
    socket?.on('user_typing', callback);
  },

  // Listen for read receipt
  onMessagesRead: (callback: (data: { userId: string; conversationId: string }) => void) => {
    socket?.on('messages_read', callback);
  },

  // Listen for errors
  onError: (callback: (error: { message: string }) => void) => {
    socket?.on('error', callback);
  },

  // Presence listeners
  onUserOnline: (callback: (data: { userId: string }) => void) => {
    socket?.on('user_online', callback);
  },
  onUserOffline: (callback: (data: { userId: string }) => void) => {
    socket?.on('user_offline', callback);
  },
  onOnlineUsers: (callback: (userIds: string[]) => void) => {
    socket?.on('online_users', callback);
  },

  // Remove listeners
  offNewMessage: () => {
    socket?.off('new_message');
  },

  offUserJoined: () => {
    socket?.off('user_joined');
  },

  offTyping: () => {
    socket?.off('user_typing');
  },

  offMessagesRead: () => {
    socket?.off('messages_read');
  },

  offError: () => {
    socket?.off('error');
  },
  offPresence: () => {
    socket?.off('user_online');
    socket?.off('user_offline');
    socket?.off('online_users');
  },
};
