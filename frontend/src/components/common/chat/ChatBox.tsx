"use client";

import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { decodeToken } from '@/utils/jwtHelper';
import { useRouter } from "next/navigation";
import {
  connectSocket,
  disconnectSocket,
  socketHandlers,
  getMessages,
  getConversations,
  getStaff,
  createConversation,
  updateMessage as updateMessageAPI,
  deleteMessage as deleteMessageAPI,
  sendMessageWithMedia,
  markAsRead,
  Conversation,
  Message,
  StaffMember,
} from "@/services/messages/messages.api";
import { setOnline, setOffline, setOnlineUsers } from "@/store/presence/presence.slice";
import EmojiPicker from "./EmojiPicker";
import ImageModal from "./ImageModal";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import ChatAI from "./chatAI"; // Import ChatAI component

interface ChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversations?: Conversation[];
}

const ChatBox: React.FC<ChatBoxProps> = ({ isOpen, onClose, initialConversations }) => {
  const router = useRouter();
  const { accessToken } = useSelector((state: RootState) => state.auth);
  
  // Decode user from token
  const user = useMemo(() => {
    return decodeToken(accessToken);
  }, [accessToken]);
  
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations || []);
  const dispatch = useDispatch();
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingSelfRef = useRef(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const onlineByUserId = useSelector((state: RootState) => state.presence?.onlineByUserId || {});
  const [showSupport, setShowSupport] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  // New state for AI chat
  const [showAI, setShowAI] = useState(false);

  // Sort messages by createdAt (oldest first, newest last) to ensure correct order
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return aDate - bDate; // Ascending: oldest first
    });
  }, [messages]);

  // Use useLayoutEffect to scroll immediately after DOM update
  useLayoutEffect(() => {
    if (sortedMessages.length > 0 && messagesContainerRef.current && !showAI) {
      // Force scroll immediately after DOM update
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [sortedMessages, showAI]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    prevMessagesLengthRef.current = sortedMessages.length;

    // Always scroll to bottom on initial load or when new message arrives
    if (sortedMessages.length > 0 && !showAI) {
      // Force scroll to bottom function
      const scrollToBottom = () => {
        if (messagesContainerRef.current) {
          // Multiple methods to ensure scroll works
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          
          // Also try scrollIntoView if we have last message element
          if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
          }
        }
      };

      // Try multiple times to ensure scroll works
      const timeout1 = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 0);
      
      const timeout2 = setTimeout(scrollToBottom, 100);
      
      const timeout3 = setTimeout(() => {
        if (lastMessageRef.current) {
          lastMessageRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
      }, 150);
      
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
      };
    }
  }, [sortedMessages, showAI]);

  // Sync conversations from parent prefetch when provided
  useEffect(() => {
    if (initialConversations && initialConversations.length > 0) {
      setConversations(initialConversations);
    }
  }, [initialConversations]);

  // Connect socket when opened (only if not in AI mode)
  useEffect(() => {
    if (isOpen && user && !showAI) {
      loadConversations();
      connectSocket(typeof accessToken === 'string' ? accessToken : undefined);
    }

    return () => {
      // Disconnect socket when closing chat or user changes
      if (!isOpen || !user || showAI) {
        disconnectSocket();
      }
    };
  }, [isOpen, user, accessToken, showAI]);

  // Listen for new messages and real-time updates (only if not in AI mode)
  useEffect(() => {
    if (!isOpen || !user || showAI) return;

    // Listen for new messages
    socketHandlers.onNewMessage((message: Message) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convIdAny: any = (message as any).conversationId;
      const incomingConvId = typeof convIdAny === 'string' ? convIdAny : String(convIdAny?._id || "");
      const currentConvId = String(selectedConversation?._id || "");
      if (incomingConvId && currentConvId && incomingConvId === currentConvId) {
        // Avoid duplicates: check if message already exists
        setMessages((prev) => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
      }
    });

    // Presence listeners
    socketHandlers.onUserOnline(({ userId }) => dispatch(setOnline({ userId })));
    socketHandlers.onUserOffline(({ userId }) => dispatch(setOffline({ userId })));
    socketHandlers.onOnlineUsers((ids) => dispatch(setOnlineUsers(ids)));
    socketHandlers.requestOnlineUsers();

    // Typing listener
    socketHandlers.onTyping((data) => {
      const selfId = user?._id || user?.userGuid || undefined;
      if (data.conversationId === selectedConversation?._id && data.userId !== selfId) {
        setTypingUser(data.isTyping ? data.userId : null);
        if (data.isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        }
      }
    });

    return () => {
      socketHandlers.offNewMessage();
      socketHandlers.offPresence();
      socketHandlers.offTyping();
    };
  }, [isOpen, user, selectedConversation, dispatch, showAI]);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const response = await getConversations();
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.data || []);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Load messages when conversation changes (only if not AI)
  useEffect(() => {
    if (selectedConversation && !showAI) {
      loadMessages(selectedConversation._id);
      socketHandlers.joinConversation(selectedConversation._id);
      
      // Mark conversation as read when opened
      const markConversationAsRead = async () => {
        try {
          // Optimistic update: set unreadCount to 0 immediately
          setConversations(prev => prev.map(conv => 
            conv._id === selectedConversation._id 
              ? { ...conv, unreadCount: 0 }
              : conv
          ));
          
          await markAsRead(selectedConversation._id);
          // Also emit socket event for real-time
          socketHandlers.markAsRead(selectedConversation._id);
          
          // Reload conversations to sync with server
          loadConversations();
        } catch (error) {
          console.error("Error marking conversation as read:", error);
          // Revert optimistic update on error
          loadConversations();
        }
      };
      markConversationAsRead();
    }

    return () => {
      if (selectedConversation && !showAI) {
        socketHandlers.leaveConversation(selectedConversation._id);
      }
    };
  }, [selectedConversation, showAI]);

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await getMessages(conversationId);
      if (response.ok) {
        const data = await response.json();
        const messagesList = Array.isArray(data) ? data : (data.data || []);
        // Only keep the most recent 50
        const recent = messagesList.slice(-50);
        setMessages(recent);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessageInput("");
    setShowAI(false);
  };

  //handler for AI button
  const handleOpenAI = () => {
    setShowAI(true);
    setSelectedConversation(null);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || showAI) return;

    const messageContent = messageInput.trim();
    setMessageInput(""); // Clear input immediately

    // stop typing state
    if (selectedConversation?._id) {
      socketHandlers.setTyping(selectedConversation._id, false);
      isTypingSelfRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    try {
      // Only send via socket (socket handler saves to DB)
      socketHandlers.sendMessage(selectedConversation._id, messageContent);
      // Note: Socket will emit 'new_message' event which we listen to, no need to call REST API
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageInput(messageContent); // Restore input on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    if (!selectedConversation || showAI) return;
    // emit typing with debounce
    if (!isTypingSelfRef.current) {
      socketHandlers.setTyping(selectedConversation._id, true);
      isTypingSelfRef.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketHandlers.setTyping(selectedConversation._id, false);
      isTypingSelfRef.current = false;
    }, 1500);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
    // Focus back to input after selecting emoji
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Message..."]') as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation || showAI) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert('Chỉ hỗ trợ file ảnh hoặc video');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      alert('File quá lớn. Kích thước tối đa là 50MB');
      return;
    }

    try {
      setUploading(true);
      const response = await sendMessageWithMedia({
        conversationId: selectedConversation._id,
        content: messageInput.trim() || undefined,
        file
      });
      
      if (response.ok) {
        const data = await response.json();
        const newMessage = data.data || data;
        // Add to messages list
        setMessages((prev) => {
          const exists = prev.some(m => m._id === newMessage._id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        setMessageInput("");
        // Stop typing
        socketHandlers.setTyping(selectedConversation._id, false);
        isTypingSelfRef.current = false;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      } else {
        const error = await response.json();
        alert(error.message || 'Lỗi khi gửi media');
      }
    } catch (error) {
      console.error("Error sending media:", error);
      alert('Lỗi khi gửi media');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadStaff = async () => {
    try {
      setLoadingStaff(true);
      const res = await getStaff();
      if (res.ok) {
        const data = await res.json();
        setStaff(data.data || []);
        setShowSupport(true);
      }
    } catch (err) {
      console.error('Error loading staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleStartConversationWithStaff = async (staffId: string) => {
    try {
      const res = await createConversation(staffId);
      if (res.ok) {
        const data = await res.json();
        const conversationData = data.data || data;
        handleSelectConversation(conversationData);
        setShowSupport(false);
      }
    } catch (err) {
      console.error('Error creating conversation with staff:', err);
    }
  };

  const startEditMessage = (message: Message) => {
    setEditingMessageId(message._id);
    setEditingContent(message.content);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const confirmEditMessage = async () => {
    if (!editingMessageId || !editingContent.trim() || showAI) return;
    try {
      const res = await updateMessageAPI(editingMessageId, editingContent.trim());
      if (res.ok) {
        const data = await res.json();
        const updated: Message = data.data || data;
        setMessages(prev => prev.map(m => (m._id === editingMessageId ? updated : m)));
        setEditingMessageId(null);
        setEditingContent("");
      }
    } catch (err) {
      console.error('Error updating message:', err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (showAI) return;
    try {
      // optimistic update
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content: '[Tin nhắn đã được thu hồi]', isDeleted: true, deletedAt: new Date().toISOString() } as Message : m));
      await deleteMessageAPI(messageId);
    } catch (err) {
      console.error('Error deleting message:', err);
      // Optionally reload messages
    }
  };

  

  const getOtherUser = (conversation: Conversation) => {
    if (!user) return null;
    
    // Compare by converting to string to handle ObjectId comparison
    const currentUserId = String(user._id || user.userGuid);
    const userId1 = String(conversation.userId1._id || conversation.userId1);
    
    
    return userId1 === currentUserId ? conversation.userId2 : conversation.userId1;
  };

  if (!isOpen) return null;

  const otherUser = selectedConversation ? getOtherUser(selectedConversation) : null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <div className="w-[380px] h-[600px] bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {/* Back arrow - show when in conversation or AI */}
            {(selectedConversation || showAI) && (
              <button
                onClick={() => {
                  if (showAI) {
                    setShowAI(false);
                  } else {
                    setSelectedConversation(null);
                  }
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
            )}

            {/* Avatar with online status - only for conversations */}
            {selectedConversation && otherUser && !showAI && (
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                  {otherUser.avatarUrl ? (
                    <Image
                      src={otherUser.avatarUrl}
                      alt={otherUser.fullName || "User"}
                      width={40}
                      height={40}
                      className="rounded-full"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="text-white text-sm font-semibold">
                      {otherUser.fullName?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                {/* Online status indicator */}
                {otherUser._id && (
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                      onlineByUserId[String(otherUser._id)] ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                )}
              </div>
            )}

            {/* AI Avatar*/}
            {showAI && (
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="9" r="2" />
                    <circle cx="15" cy="9" r="2" />
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  </svg>
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 bg-green-500" />
              </div>
            )}

            {/* Title */}
            <div className="text-white font-medium text-sm">
              {showAI ? "RetroTrade AI" : selectedConversation ? otherUser?.fullName || "Chat" : "Messages"}
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-2">
            {!showAI && (
              <button
                onClick={() => router.push('/auth/messages')}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Mở trang tin nhắn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="14" height="14" rx="2"/>
                  <path d="M9 11l6 6M15 11l-6 6"/>
                </svg>
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-gray-900">
          {showAI ? (
            // Render embedded ChatAI
            <ChatAI 
              isOpen={true} 
              onClose={() => setShowAI(false)} 
              isEmbedded={true} 
            />
          ) : !selectedConversation ? (
            // Conversations List
            <div className="p-2">
              {/* AI Button */}
              <div className="mb-2 border-b border-gray-700 pb-2">
                <button
                  onClick={handleOpenAI}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:opacity-90 transition text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="9" r="2" />
                    <circle cx="15" cy="9" r="2" />
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  </svg>
                  <span>Chat với RetroTrade AI</span>
                </button>
              </div>

              {/* Support toggle */}
              <div className="mb-2 border-b border-gray-700 pb-2">
                {!showSupport ? (
                  <button
                    onClick={handleLoadStaff}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition text-sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 9V5a3 3 0 0 0-6 0v4"/>
                      <path d="M9 14H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4"/>
                      <path d="M15 14h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4"/>
                      <path d="M9 10H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4"/>
                    </svg>
                    <span>Yêu cầu hỗ trợ</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Hỗ trợ</span>
                    <button onClick={() => setShowSupport(false)} className="text-gray-400 hover:text-gray-200 text-sm">✕</button>
                  </div>
                )}
              </div>

              {/* Staff list */}
              {showSupport && (
                <div className="mb-2 space-y-1">
                  {loadingStaff ? (
                    <div className="text-gray-400 text-xs text-center py-2">Đang tải...</div>
                  ) : staff.length > 0 ? (
                    staff.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => handleStartConversationWithStaff(s._id)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-800/60 rounded-lg transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {s.avatarUrl ? (
                            <Image src={s.avatarUrl} alt={s.fullName} width={40} height={40} className="rounded-full" style={{ objectFit: 'cover' }} />
                          ) : (
                            <span className="text-white text-sm font-semibold">{s.fullName?.charAt(0).toUpperCase() || 'S'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-100 font-medium text-sm truncate flex items-center gap-2">
                            {s.fullName}
                            <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">{s.role === 'admin' ? 'Admin' : 'Mod'}</span>
                          </div>
                          <div className="text-gray-400 text-xs truncate">Nhân viên hỗ trợ</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-gray-400 text-xs text-center py-2">Không có nhân viên hỗ trợ</div>
                  )}
                </div>
              )}

              {/* Divider between staff and recent conversations */}
              {showSupport && (
                <div className="my-2">
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <div className="flex-1 h-px bg-gray-700" />
                    <span>Đã chat gần đây</span>
                    <div className="flex-1 h-px bg-gray-700" />
                  </div>
                </div>
              )}

              {loadingConversations ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Đang tải...
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Empty state when no conversations */}
                  {conversations.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">💬</div>
                        <div className="text-sm">Chưa có cuộc trò chuyện</div>
                      </div>
                        </div>
                  ) : (
                    [...conversations]
                      .filter((c) => !!c.lastMessage)
                      .sort((a, b) => {
                        const aDate = a.lastMessage?.createdAt
                          ? new Date(a.lastMessage.createdAt).getTime()
                          : new Date(a.updatedAt).getTime();
                        const bDate = b.lastMessage?.createdAt
                          ? new Date(b.lastMessage.createdAt).getTime()
                          : new Date(b.updatedAt).getTime();
                        return bDate - aDate;
                      })
                      .map((conversation) => {
                        const other = getOtherUser(conversation);
                        return (
                          <button
                            key={conversation._id}
                            onClick={() => handleSelectConversation(conversation)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-gray-800/60 rounded-lg transition-colors text-left"
                          >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                                {other && other.avatarUrl ? (
                                  <img src={other.avatarUrl} alt={other.fullName} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                  <span className="text-white text-sm font-semibold">{other?.fullName?.charAt(0).toUpperCase() || 'U'}</span>
                                )}
                              </div>
                              {/* Online status indicator */}
                              {other?._id && (
                                <span
                                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${
                                    onlineByUserId[String(other._id)] ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                />
                              )}
                            </div>
                            {/* Content */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-gray-100 text-sm font-medium truncate">{other?.fullName || 'Người dùng'}</div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {(conversation.unreadCount ?? 0) > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                      {conversation.unreadCount! > 9 ? "9+" : conversation.unreadCount}
                                    </span>
                                  )}
                                  {conversation.lastMessage && (
                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                      {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                                        addSuffix: true,
                                        locale: vi
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {conversation.lastMessage && (
                                <div className={`text-xs truncate ${(conversation.unreadCount ?? 0) > 0 ? 'font-semibold text-gray-100' : 'text-gray-400'}`}>
                                  {conversation.lastMessage.content || (conversation.lastMessage.mediaType === 'image' ? '📷 Hình ảnh' : conversation.lastMessage.mediaType === 'video' ? '🎥 Video' : '')}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full text-gray-500 p-4">
              Đang tải tin nhắn...
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 p-4">
              <div className="text-center">
                <div className="text-4xl mb-2">💬</div>
                <div className="text-sm">Chưa có tin nhắn</div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {sortedMessages.map((message, index) => {
                // Convert to string for comparison to handle ObjectId
                const messageUserId = String(message.fromUserId._id || message.fromUserId);
                const currentUserId = String(user?._id || user?.userGuid || "");
                const isOwnMessage = messageUserId === currentUserId;
                
                // Compare previous message's user
                const previousMessageUserId = index > 0 ? String(sortedMessages[index - 1].fromUserId._id || sortedMessages[index - 1].fromUserId) : "";
                const showAvatar = index === 0 || previousMessageUserId !== messageUserId;
                const isLastMessage = index === sortedMessages.length - 1;

                return (
                  <div
                    key={message._id}
                    ref={isLastMessage ? lastMessageRef : null}
                    className={`relative flex w-full ${isOwnMessage ? "flex-row-reverse justify-end items-end" : "flex-row gap-2"}`}
                  >
                    {/* Avatar */}
                    {!isOwnMessage && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                        {message.fromUserId.avatarUrl ? (
                          <img
                            src={message.fromUserId.avatarUrl}
                            alt={message.fromUserId.fullName}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-white text-xs font-semibold">
                            {message.fromUserId.fullName?.charAt(0).toUpperCase() || "U"}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message content wrapper - push to right for own messages */}
                    <div className={`flex items-end ${isOwnMessage ? "flex-row-reverse gap-0 ml-auto" : "flex-row gap-2"}`}>
                      {/* Check if message is image-only (no real text content) */}
                      {message.mediaType === 'image' && message.mediaUrl && 
                       (!message.content || message.content === '📷 Hình ảnh' || message.content.trim() === '') &&
                       editingMessageId !== message._id ? (
                        // Image only - no bubble, just the image
                        <div
                          className={`relative max-w-[75%] rounded-lg overflow-hidden ${isOwnMessage ? "mr-0" : ""}`}
                          style={{
                            marginLeft: !isOwnMessage && !showAvatar ? "40px" : "0",
                            marginRight: isOwnMessage ? "0" : undefined,
                          }}
                        >
                          <img
                            src={message.mediaUrl}
                            alt="Hình ảnh"
                            className="max-w-full max-h-96 object-cover cursor-pointer rounded-lg"
                            onClick={() => setSelectedImageUrl(message.mediaUrl!)}
                          />
                        </div>
                      ) : (
                        // Message with bubble (has text or video or editing)
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? "bg-blue-500 text-white mr-0"
                              : "bg-gray-800 text-gray-100"
                          }`}
                          style={{
                            marginLeft: !isOwnMessage && !showAvatar ? "40px" : "0",
                            marginRight: isOwnMessage ? "0" : undefined,
                          }}
                        >
                          {editingMessageId === message._id ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmEditMessage(); }
                                  if (e.key === 'Escape') cancelEditMessage();
                                }}
                                className="flex-1 bg-white/10 rounded px-2 py-1 text-sm"
                              />
                              <button onClick={confirmEditMessage} className="text-xs underline">Lưu</button>
                              <button onClick={cancelEditMessage} className="text-xs underline">Hủy</button>
                            </div>
                          ) : (
                            <>
                              {/* Media (image with text, or video) */}
                              {message.mediaType && message.mediaUrl && (
                                <div className="mb-2">
                                  {message.mediaType === 'image' ? (
                                    <div className="relative max-w-full rounded-lg overflow-hidden">
                                      <img
                                        src={message.mediaUrl}
                                        alt={message.content || "Hình ảnh"}
                                        className="max-w-full max-h-96 object-cover cursor-pointer rounded-lg"
                                        onClick={() => setSelectedImageUrl(message.mediaUrl!)}
                                      />
                                    </div>
                                  ) : message.mediaType === 'video' ? (
                                    <div className="relative max-w-full rounded-lg overflow-hidden">
                                      <video
                                        src={message.mediaUrl}
                                        controls
                                        className="max-w-full max-h-96 rounded-lg"
                                      >
                                        Your browser does not support the video tag.
                                      </video>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                              {/* Text content - hide defaults for image/video placeholders */}
                              {message.content && 
                               !(
                                 (message.mediaType === 'image' && (message.content === '📷 Hình ảnh' || message.content.trim() === '')) ||
                                 (message.mediaType === 'video' && (message.content === '🎥 Video' || message.content.trim() === ''))
                               ) && (
                                <div className={`text-sm ${message.isDeleted || message.content === '[Tin nhắn đã được thu hồi]' ? 'italic opacity-70' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                                  {message.content}
                                  {message.editedAt && !message.isDeleted && (
                                    <span className="ml-2 text-[10px] opacity-75">(đã sửa)</span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Kebab menu for own messages */}
                      {isOwnMessage && !message.isDeleted && message.content !== '[Tin nhắn đã được thu hồi]' && (
                        <div className="relative flex items-center self-end">
                          <button
                            onClick={() => setMenuMessageId(menuMessageId === message._id ? null : message._id)}
                            className="text-gray-300 hover:text-white text-base px-1 py-1 rounded hover:bg-gray-700/40 transition-colors"
                            title="Tùy chọn"
                          >
                            ⋮
                          </button>
                          {menuMessageId === message._id && (
                            <div className={`absolute right-full mr-1 top-0 bg-gray-800 text-white text-xs rounded shadow-lg border border-gray-700 z-10 min-w-[120px]`}
                                 onMouseLeave={() => setMenuMessageId(null)}>
                              <button onClick={() => { setMenuMessageId(null); startEditMessage(message); }}
                                      className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded-t">Sửa</button>
                              <button onClick={() => { setMenuMessageId(null); deleteMessage(message._id); }}
                                      className="block w-full text-left px-3 py-2 hover:bg-gray-700 text-red-300 rounded-b">Thu hồi</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {typingUser && !showAI && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Đang soạn tin nhắn...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input - only show when in conversation (not AI) */}
        {selectedConversation && !showAI && (
          <div className="p-3 bg-gray-800 border-t border-gray-700 relative">
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef}>
                <EmojiPicker onSelectEmoji={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Chọn emoji"
              >
                <span className="text-2xl">😀</span>
              </button>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message..."
                className="flex-1 bg-gray-700 text-white placeholder-gray-400 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    if (selectedConversation) {
                      try {
                        socketHandlers.sendMessage(selectedConversation._id, '❤️');
                        socketHandlers.setTyping(selectedConversation._id, false);
                        isTypingSelfRef.current = false;
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                      } catch (e) {
                        console.error('Error sending quick emoji:', e);
                      }
                    }
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title="Gửi ❤️"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !selectedConversation}
                  className="text-gray-400 hover:text-white transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Chọn hình ảnh hoặc video"
                >
                  {uploading ? (
                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                      <path d="M12 2A10 10 0 0 1 22 12" strokeLinecap="round"/>
                    </svg>
                  ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={messageInput.trim() ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    className={messageInput.trim() ? "text-blue-500" : "text-gray-500"}
                  >
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Image Modal */}
      <ImageModal
        imageUrl={selectedImageUrl || ""}
        isOpen={!!selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
};

export default ChatBox;