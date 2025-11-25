"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { decodeToken } from '@/utils/jwtHelper';
import { useRouter } from "next/router";
import {
  connectSocket,
  disconnectSocket,
  socketHandlers,
  getMessages,
  getConversations,
  sendMessageWithMedia,
  updateMessage as updateMessageAPI,
  deleteMessage as deleteMessageAPI,
  markAsRead,
  Conversation,
  Message,
} from "@/services/messages/messages.api";
import { setOnline, setOffline, setOnlineUsers } from "@/store/presence/presence.slice";
import ConversationList from "@/components/common/chat/ConversationList";
import MessageList from "@/components/common/chat/MessageList";
import EmojiPicker from "@/components/common/chat/EmojiPicker";
import { Search } from "lucide-react";
import Image from "next/image";
import Head from "next/head";

const MessagesPage = () => {
  const router = useRouter();
  const { accessToken } = useSelector((state: RootState) => state.auth);
  
  // Decode user from token
  const user = useMemo(() => {
    return decodeToken(accessToken);
  }, [accessToken]);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isTypingSelfRef = React.useRef(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (user === null && !accessToken) {
      router.push("/auth/login");
    }
  }, [user, accessToken, router]);

  // Load conversations and connect socket on mount
  useEffect(() => {
    if (user) {
      loadConversations();
      connectSocket(typeof accessToken === 'string' ? accessToken : undefined);
    }

    return () => {
      if (selectedConversation) {
        socketHandlers.leaveConversation(selectedConversation._id);
      }
      disconnectSocket();
    };
  }, [user]);

  // Auto-select conversation from query parameter
  useEffect(() => {
    const conversationId = router.query.conversationId as string;
    if (conversationId && conversations.length > 0 && !selectedConversation) {
      const targetConversation = conversations.find(conv => conv._id === conversationId);
      if (targetConversation) {
        setSelectedConversation(targetConversation);
        // Remove query parameter from URL after selecting
        router.replace('/auth/messages', undefined, { shallow: true });
      }
    }
  }, [router.query.conversationId, conversations, selectedConversation, router]);

  const loadConversations = async () => {
    try {
      const response = await getConversations();
      if (response.ok) {
        const data = await response.json();
        setConversations(data.data || []);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const dispatch = useDispatch();

  // Listen for new messages
  useEffect(() => {
    if (!user) return;

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
        
        // Auto mark as read when receiving new message in opened conversation
        // Only if message is from other user
        const messageFromUserId = String(message.fromUserId._id || message.fromUserId);
        const currentUserId = String(user?._id || user?.userGuid || "");
        if (messageFromUserId !== currentUserId && selectedConversation) {
          const markAsReadDebounced = async () => {
            try {
              // Optimistic update: keep unreadCount at 0
              setConversations(prev => prev.map(conv => 
                conv._id === selectedConversation._id 
                  ? { ...conv, unreadCount: 0 }
                  : conv
              ));
              
              await markAsRead(selectedConversation._id);
              socketHandlers.markAsRead(selectedConversation._id);
              // Reload to sync with server
              loadConversations();
            } catch (error) {
              console.error("Error auto-marking as read:", error);
              loadConversations(); // Revert on error
            }
          };
          // Small delay to ensure message is processed
          setTimeout(markAsReadDebounced, 500);
        }
      }
    });

    // Presence listeners
    socketHandlers.onUserOnline(({ userId }) => dispatch(setOnline({ userId })));
    socketHandlers.onUserOffline(({ userId }) => dispatch(setOffline({ userId })));
    socketHandlers.onOnlineUsers((ids) => dispatch(setOnlineUsers(ids)));
    socketHandlers.requestOnlineUsers();

    socketHandlers.onTyping((data) => {
      const userId = user?._id || user?.userGuid;
      if (data.conversationId === selectedConversation?._id && data.userId !== userId) {
        setTypingUser(data.userId);
        setTimeout(() => setTypingUser(null), 3000);
      }
    });

    return () => {
      socketHandlers.offNewMessage();
      socketHandlers.offPresence();
      socketHandlers.offTyping();
    };
  }, [user, selectedConversation]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
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
      if (selectedConversation) {
        socketHandlers.leaveConversation(selectedConversation._id);
      }
    };
  }, [selectedConversation]);

  // Removed staff support

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await getMessages(conversationId);
      if (response.ok) {
        const data = await response.json();
        const messagesList = data.data || [];
        const recent = messagesList.slice(-50);
        setMessages(recent);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // removed staff conversation starter

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessageInput("");
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !user) return;

    const messageContent = messageInput.trim();
    setMessageInput(""); // Clear input immediately

    try {
      // Only send via socket (socket handler saves to DB and emits new_message)
      socketHandlers.sendMessage(selectedConversation._id, messageContent);
      // stop typing
      socketHandlers.setTyping(selectedConversation._id, false);
      isTypingSelfRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      // Socket will emit 'new_message' event which we listen to
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageInput(messageContent); // Restore input on error
    }
  };

  const handleSendQuickEmoji = (emoji: string) => {
    if (!selectedConversation || !user) return;
    try {
      socketHandlers.sendMessage(selectedConversation._id, emoji);
      // stop typing if any
      socketHandlers.setTyping(selectedConversation._id, false);
      isTypingSelfRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    } catch (error) {
      console.error("Error sending quick emoji:", error);
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
    if (!selectedConversation) return;
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
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Enter Message"]') as HTMLInputElement;
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

  const startEditMessage = (message: Message) => {
    setEditingMessageId(message._id);
    setEditingContent(message.content);
    setMenuMessageId(null);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const confirmEditMessage = async () => {
    if (!editingMessageId || !editingContent.trim()) return;
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
    try {
      // Optimistic update
      setMessages(prev => prev.map(m => 
        m._id === messageId 
          ? { ...m, content: '[Tin nhắn đã được thu hồi]', isDeleted: true, deletedAt: new Date().toISOString() } as Message 
          : m
      ));
      await deleteMessageAPI(messageId);
    } catch (err) {
      console.error('Error deleting message:', err);
      // Optionally reload messages
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation || !user) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert('Chỉ hỗ trợ file ảnh hoặc video');
      return;
    }

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
        setMessages((prev) => {
          const exists = prev.some(m => m._id === newMessage._id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        setMessageInput("");
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getOtherUser = (conversation: Conversation) => {
    if (!user) return null;
    // Compare by converting to string to handle ObjectId
    const currentUserId = String(user._id || user.userGuid);
    const userId1 = String(conversation.userId1._id || conversation.userId1);
    const userId2 = String(conversation.userId2._id || conversation.userId2);
    
    return userId1 === currentUserId ? conversation.userId2 : conversation.userId1;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Tin nhắn | RetroTrade</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Tin nhắn</h1>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm border h-[calc(100vh-180px)] flex">
            {/* Sidebar - Conversations */}
            <div className="w-1/3 border-r flex flex-col">
              {/* Search bar */}
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm cuộc trò chuyện..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Conversations list */}
              <div className="flex-1 overflow-y-auto">
                {user && (
                  <ConversationList
                    conversations={conversations}
                    onSelectConversation={handleSelectConversation}
                    selectedConversationId={selectedConversation?._id}
                    currentUserId={user._id || user.userGuid || ""}
                  />
                )}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat header */}
                  <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 bg-white">
                    {getOtherUser(selectedConversation) && (
                      <>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                          {getOtherUser(selectedConversation)?.avatarUrl ? (
                            <Image
                              src={getOtherUser(selectedConversation)!.avatarUrl!}
                              alt={getOtherUser(selectedConversation)!.fullName}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <span>{getOtherUser(selectedConversation)!.fullName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-sm font-semibold text-gray-900">{getOtherUser(selectedConversation)?.fullName}</h2>
                          <p className="text-xs text-gray-500">Active now</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="h-9 w-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                          </button>
                          <button className="h-9 w-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                              <circle cx="12" cy="13" r="4"/>
                            </svg>
                          </button>
                          <button className="h-9 w-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 16v-4M12 8h.01"/>
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500">Đang tải tin nhắn...</div>
                      </div>
                    ) : (
                      <>
                        <MessageList 
                          messages={messages} 
                          currentUserId={user._id || user.userGuid || ""}
                          otherUserId={selectedConversation ? (
                            String(selectedConversation.userId1._id || selectedConversation.userId1) === String(user._id || user.userGuid) 
                              ? String(selectedConversation.userId2._id || selectedConversation.userId2)
                              : String(selectedConversation.userId1._id || selectedConversation.userId1)
                          ) : undefined}
                          onEditMessage={startEditMessage}
                          onDeleteMessage={deleteMessage}
                          editingMessageId={editingMessageId}
                          editingContent={editingContent}
                          onEditingContentChange={setEditingContent}
                          onConfirmEdit={confirmEditMessage}
                          onCancelEdit={cancelEditMessage}
                          menuMessageId={menuMessageId}
                          onMenuToggle={setMenuMessageId}
                        />
                        {typingUser && (
                          <div className="flex items-start gap-2 px-4 pb-4">
                            <div className="flex gap-1 rounded-3xl bg-gray-200 px-4 py-3">
                              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '-0.3s' }}></span>
                              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '-0.15s' }}></span>
                              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500"></span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Message input */}
                  <div className="border-t border-gray-200 p-4 bg-white relative">
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div ref={emojiPickerRef} className="absolute bottom-full right-4 mb-2">
                        <EmojiPicker onSelectEmoji={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="h-9 w-9 shrink-0 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-xl"
                        title="Chọn emoji"
                      >
                        😀
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || !selectedConversation}
                        className="h-9 w-9 shrink-0 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Chọn hình ảnh hoặc video"
                      >
                        {uploading ? (
                          <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                            <path d="M12 2A10 10 0 0 1 22 12" strokeLinecap="round"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
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
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => handleInputChange(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Enter Message"
                          className="h-11 w-full rounded-full border-0 bg-gray-100 pr-20 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pl-4"
                        />
                        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                          <button onClick={() => handleSendQuickEmoji('❤️')} className="h-7 w-7 rounded-full hover:bg-transparent flex items-center justify-center" title="Gửi ❤️">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          </button>
                          <button
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim()}
                            className="h-7 w-7 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                              <line x1="22" y1="2" x2="11" y2="13"/>
                              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <div className="text-xl font-semibold">Chọn một cuộc trò chuyện</div>
                    <div className="text-sm mt-2">Hoặc bắt đầu cuộc trò chuyện mới</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MessagesPage;

