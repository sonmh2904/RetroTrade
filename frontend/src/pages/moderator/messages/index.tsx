"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { RootState } from "@/store/redux_store";
import { decodeToken, type DecodedToken } from '@/utils/jwtHelper';
import { useRouter } from "next/router";
import Head from "next/head";
import { ModeratorSidebar } from "@/components/ui/moderator/moderator-sidebar";
import { ModeratorHeader } from "@/components/ui/moderator/moderator-header";
import {
  connectSocket,
  disconnectSocket,
  socketHandlers,
  getMessages,
  getConversations,
  sendMessageWithMedia,
  markAsRead,
  Conversation,
  Message,
} from "@/services/messages/messages.api";
import { setOnline, setOffline, setOnlineUsers } from "@/store/presence/presence.slice";
import ConversationListModerator from "@/components/common/chat/ConversationListModerator";
import MessageList from "@/components/common/chat/MessageList";
import EmojiPicker from "@/components/common/chat/EmojiPicker";
import Image from "next/image";
import { Search } from "lucide-react";

const ModeratorMessagesPage: React.FC = () => {
  const router = useRouter();
  const { accessToken } = useSelector((state: RootState) => state.auth);

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (user.role !== "moderator" && user.role !== "admin") {
      router.push("/home");
      return;
    }

    connectSocket(typeof accessToken === 'string' ? accessToken : undefined);
    loadConversations();
    return () => {
      if (selectedConversation) {
        socketHandlers.leaveConversation(selectedConversation._id);
      }
      disconnectSocket();
    };
  }, [user, router, selectedConversation]);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data || []);
      }
    } catch {
      // noop
    }
  };

  // Management chat page: no staff/support section

  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;
    socketHandlers.onNewMessage((message: Message) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convIdAny: any = (message as any).conversationId;
      const incomingConvId = typeof convIdAny === 'string' ? convIdAny : String(convIdAny?._id || "");
      const currentConvId = String(selectedConversation?._id || "");
      if (incomingConvId && currentConvId && incomingConvId === currentConvId) {
        // Avoid duplicates: check if message already exists
        setMessages(prev => {
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

    return () => {
      socketHandlers.offNewMessage();
      socketHandlers.offPresence();
    };
  }, [user, selectedConversation]);

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

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const res = await getMessages(conversationId);
      if (res.ok) {
        const data = await res.json();
        const list = data.data || [];
        setMessages(list.slice(-50));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !user) return;
    const content = messageInput.trim();
    setMessageInput("");

    try {
      // Only send via socket (socket handler saves to DB and emits new_message)
      socketHandlers.sendMessage(selectedConversation._id, content);
      // stop typing
      socketHandlers.setTyping(selectedConversation._id, false);
      isTypingSelfRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      // Socket will emit 'new_message' event which we listen to
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageInput(content); // Restore input on error
    }
  };

  const handleSendQuickEmoji = (emoji: string) => {
    if (!selectedConversation || !user) return;
    try {
      socketHandlers.sendMessage(selectedConversation._id, emoji);
      socketHandlers.setTyping(selectedConversation._id, false);
      isTypingSelfRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    } catch (error) {
      console.error("Error sending quick emoji:", error);
    }
  };

  const getOtherUser = (conversation: Conversation) => {
    if (!user) return null;
    const currentUserId = String(user._id || user.userGuid);
    const userId1 = String(conversation.userId1._id || conversation.userId1);
    return userId1 === currentUserId ? conversation.userId2 : conversation.userId1;
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
      const input = document.querySelector('input[placeholder*="Message"]') as HTMLInputElement;
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
    if (!file || !selectedConversation || !user) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast.warning('Chỉ hỗ trợ file ảnh hoặc video');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.warning('File quá lớn. Kích thước tối đa là 50MB');
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
        toast.error(error.message || 'Lỗi khi gửi media');
      }
    } catch (error) {
      console.error("Error sending media:", error);
      toast.error('Lỗi khi gửi media');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Tin nhắn Moderator | RetroTrade</title>
      </Head>

      <div className="min-h-screen bg-white relative overflow-hidden">
        <div className="relative z-10 flex">
          <ModeratorSidebar
            activeTab={"messages"}
            activeProductTab={"products"}
            activeBlogTab={"posts"}
            onTabChange={(tab) => {
              if (tab === "messages") {
                router.push("/moderator/messages");
              } else {
                const target = `/moderator?tab=${tab}`;
                router.push(target);
              }
            }}
            onProductTabChange={() => {
              router.push(`/moderator?tab=productManagement`);
            }}
            onBlogTabChange={() => {
              router.push(`/moderator?tab=blog`);
            }}
          />

          <div className="flex-1 transition-all duration-300 moderator-content-area min-w-0 bg-gray-50">
            <ModeratorHeader />

            <main className="p-4 lg:p-8">
              <div className="bg-white rounded-lg shadow-sm border h-[calc(100vh-180px)] flex">
                {/* Sidebar */}
                <div className="w-80 border-r flex flex-col flex-shrink-0">
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

              {/* Conversations list (moderator-specific: search + role filter) */}
              <div className="flex-1 overflow-y-auto">
                {user && (
                  <ConversationListModerator
                    conversations={conversations}
                    onSelectConversation={setSelectedConversation}
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
                      {/* Header */}
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
                          </>
                        )}
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto bg-gray-50">
                        {loading ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-gray-500">Đang tải tin nhắn...</div>
                          </div>
                        ) : (
                          <MessageList 
                            messages={messages} 
                            currentUserId={user._id || user.userGuid || ""}
                            otherUserId={selectedConversation ? (
                              String(selectedConversation.userId1._id || selectedConversation.userId1) === String(user._id || user.userGuid) 
                                ? String(selectedConversation.userId2._id || selectedConversation.userId2)
                                : String(selectedConversation.userId1._id || selectedConversation.userId1)
                            ) : undefined}
                          />
                        )}
                      </div>

                      {/* Input */}
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
                              onKeyPress={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              placeholder="Enter Message"
                              className="h-11 w-full rounded-full border-0 bg-gray-100 pr-20 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pl-4"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button
                                onClick={() => handleSendQuickEmoji('❤️')}
                                className="h-7 w-7 rounded-full hover:bg-transparent flex items-center justify-center"
                                title="Gửi ❤️"
                              >
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
                        <div className="text-sm mt-2">Bạn đang ở chế độ Moderator</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModeratorMessagesPage;


