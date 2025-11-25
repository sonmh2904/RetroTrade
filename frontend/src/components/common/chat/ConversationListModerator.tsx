"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { Conversation, getConversations } from "@/services/messages/messages.api";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Image from "next/image";

interface ConversationListModeratorProps {
  conversations?: Conversation[]; // Optional: if provided, use it instead of loading
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
  currentUserId: string;
}

// Type for user in conversation
type ConversationUser = Conversation["userId1"];

const roleOptions = [
  { value: "", label: "Tất cả" },
  { value: "user", label: "User" },
  { value: "owner", label: "Owner" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
] as const;

const ConversationListModerator: React.FC<ConversationListModeratorProps> = ({
  conversations: conversationsProp,
  onSelectConversation,
  selectedConversationId,
  currentUserId,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  const onlineByUserId = useSelector((state: RootState) => state.presence?.onlineByUserId || {});

  // Use conversations from props if provided, otherwise load from API
  useEffect(() => {
    if (conversationsProp) {
      setConversations(conversationsProp);
      setLoading(false);
    } else {
      const loadConversations = async () => {
        try {
          setLoading(true);
          const res = await getConversations();
          if (res.ok) {
            const data = await res.json();
            setConversations(data.data || []);
          } else {
            setError("Không thể tải danh sách cuộc trò chuyện");
          }
        } catch {
          setError("Lỗi khi tải cuộc trò chuyện");
        } finally {
          setLoading(false);
        }
      };
      loadConversations();
    }
  }, [conversationsProp]);

  const getOtherUser = useCallback(
    (conversation: Conversation): ConversationUser => {
      return conversation.userId1._id === currentUserId
        ? conversation.userId2
        : conversation.userId1;
    },
    [currentUserId]
  );

  const filteredConversations = useMemo(() => {
    // conversations with at least one message
    let list = conversations.filter((c) => !!c.lastMessage);
    
    // filter by role if selected
    if (roleFilter) {
      const roleLower = roleFilter.toLowerCase();
      list = list.filter((c) => {
        const other = getOtherUser(c);
        return (other.role || "").toLowerCase() === roleLower;
      });
    }
    
    // search by name/email
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      list = list.filter((c) => {
        const other = getOtherUser(c);
        return (
          other.fullName.toLowerCase().includes(query) ||
          other.email.toLowerCase().includes(query)
        );
      });
    }
    
    // sort by last message time desc
    return list.sort((a, b) => {
      const aDate = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : new Date(a.updatedAt).getTime();
      const bDate = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : new Date(b.updatedAt).getTime();
      return bDate - aDate;
    });
  }, [conversations, roleFilter, searchTerm, getOtherUser]);

  const getLastMessagePreview = (conversation: Conversation): string => {
    if (!conversation.lastMessage) {
      return "Bắt đầu cuộc trò chuyện";
    }
    const content = conversation.lastMessage.content;
    return content.length > 40 ? `${content.substring(0, 40)}...` : content;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Controls */}
      <div className="p-3 border-b">
        <div className="flex gap-2">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
          <div className="text-4xl">💬</div>
          <div>Không có cuộc trò chuyện</div>
        </div>
      ) : (
        filteredConversations.map((conversation) => {
          const otherUser = getOtherUser(conversation);
          const isSelected = selectedConversationId === conversation._id;
          const unreadCount = conversation.unreadCount ?? 0;
          const isOnline = otherUser._id ? onlineByUserId[String(otherUser._id)] : false;
          
          return (
            <div
              key={conversation._id}
              onClick={() => onSelectConversation(conversation)}
              className={`p-4 border-b cursor-pointer transition-colors ${
                isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                    {otherUser.avatarUrl ? (
                      <Image
                        src={otherUser.avatarUrl}
                        alt={otherUser.fullName}
                        width={48}
                        height={48}
                        className="rounded-full"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span>{otherUser.fullName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {otherUser._id && (
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        isOnline ? "bg-green-500" : "bg-red-500"
                      }`}
                      aria-label={isOnline ? "Đang online" : "Đang offline"}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 truncate">
                      {otherUser.fullName}
                      {otherUser.role && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          {otherUser.role}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(
                            new Date(conversation.lastMessage.createdAt),
                            { addSuffix: true, locale: vi }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`text-sm truncate ${
                      unreadCount > 0
                        ? "font-semibold text-gray-900"
                        : "text-gray-600"
                    }`}
                  >
                    {getLastMessagePreview(conversation)}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ConversationListModerator;


