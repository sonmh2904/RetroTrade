"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { decodeToken } from "@/utils/jwtHelper";
import EmojiPicker from "./EmojiPicker";
import {
  createAIChatSession,
  sendAIMessage,
  getAIChatHistory,
} from "@/services/messages/aichat.api";
import { toast } from "sonner";

const AI_SESSION_KEY = "aiSessionId";

interface AIMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
  productSuggestions?: Array<{
    id: string;
    title: string;
    price: number;
    detail: string;
    rating: number;
    distance: string;
  }>;
  orderId?: string;
}

interface ChatAIProps {
  isOpen: boolean;
  onClose: () => void;
  isEmbedded?: boolean;
}

const ChatAI: React.FC<ChatAIProps> = ({
  isOpen,
  onClose,
  isEmbedded = false,
}) => {
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const user = React.useMemo(() => decodeToken(accessToken), [accessToken]);

  const [aiSessionId, setAiSessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(AI_SESSION_KEY);
    }
    return null;
  });

  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiMessageInput, setAiMessageInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [aiSessionLoaded, setAiSessionLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedAiMessages = React.useMemo(() => {
    return [...aiMessages].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [aiMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [sortedAiMessages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && user && !aiSessionLoaded) {
      loadAIChat();
    } else if (!isOpen) {
      setAiMessages([]);
      setAiSessionLoaded(false);
    }
  }, [isOpen, user, aiSessionLoaded]);

  const loadAIChat = useCallback(async () => {
    if (!user || aiSessionLoaded) return;

    let currentSessionId = aiSessionId;

    try {
      if (!currentSessionId) {
        const res = await createAIChatSession();
        if (res.ok) {
          const data = await res.json();
          currentSessionId = data.data.sessionId;
          setAiSessionId(currentSessionId);
          localStorage.setItem(AI_SESSION_KEY, currentSessionId);
        } else {
          const errorData = await res.json().catch(() => ({}));
          toast.error(
            "Lỗi tạo session AI: " + (errorData.message || "Thử lại sau")
          );
          console.error("Lỗi tạo AI session:", res.status, errorData);
          return;
        }
      }

      if (currentSessionId) {
        const res = await getAIChatHistory(currentSessionId);
        if (res.ok) {
          const data = await res.json();
          setAiMessages(
            data.data.messages.map((msg: any) => ({
              ...msg,
              role: msg.role === "ai" ? "model" : msg.role,
            })) || []
          );
        } else {
          const errorData = await res.json().catch(() => ({}));
          toast.warning("Không tải được lịch sử chat AI");
          console.warn("Lỗi load history:", res.status, errorData);
        }
      }
      setAiSessionLoaded(true);
    } catch (error) {
      console.error("Error loading AI chat (non-fatal):", error);
      toast.error("Lỗi kết nối AI, thử lại sau");
    }
  }, [user, aiSessionLoaded, aiSessionId]);

  const handleSendAIMessage = useCallback(async () => {
    if (!aiMessageInput.trim() || !aiSessionId || aiLoading) return;

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: aiMessageInput.trim(),
      timestamp: new Date(),
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiMessageInput("");
    setAiLoading(true);

    try {
      const res = await sendAIMessage(aiSessionId, userMsg.content);
      if (res.ok) {
        const data = await res.json();
        const aiMsg: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: data.data.response.content || data.data.response,
          timestamp: new Date(),
          productSuggestions: data.data.response.productSuggestions,
          orderId: data.data.response.orderId,
        };
        setAiMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Frontend: AI API error:", res.status, errorData);

        if (res.status === 404) {
          toast.error("Session AI cũ không tồn tại. Đang tạo session mới.");
          localStorage.removeItem(AI_SESSION_KEY);
          setAiSessionId(null);
          setAiSessionLoaded(false);
        }

        const errMsg: AIMessage = {
          id: (Date.now() + 2).toString(),
          role: "model",
          content: `Lỗi: ${errorData.message || "Server AI bận, thử lại sau!"}`,
          timestamp: new Date(),
        };
        setAiMessages((prev) => [...prev, errMsg]);
      }
    } catch (error) {
      console.error("Frontend: Catch error sending AI message:", error);
      const errMsg: AIMessage = {
        id: (Date.now() + 2).toString(),
        role: "model",
        content: "Xin lỗi, có lỗi xảy ra. Hãy thử lại!",
        timestamp: new Date(),
      };
      setAiMessages((prev) => [...prev, errMsg]);
    } finally {
      setAiLoading(false);
    }
  }, [aiMessageInput, aiSessionId, aiLoading]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendAIMessage();
      }
    },
    [handleSendAIMessage]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAiMessageInput(e.target.value);
    },
    []
  );

  const handleEmojiSelect = useCallback((emoji: string) => {
    setAiMessageInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  if (!isOpen) return null;

  return (
    <div
      className={`${
        isEmbedded ? "w-full h-full" : "w-[380px] h-[600px]"
      } bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-700 ${
        isEmbedded ? "border-0 rounded-none" : ""
      }`}
    >
      {!isEmbedded && (
        <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="9" cy="9" r="2" />
                  <circle cx="15" cy="9" r="2" />
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                </svg>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 bg-green-500" />
            </div>
            <div className="text-white font-medium text-sm">AI Assistant</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900 ${
          isEmbedded ? "p-0" : ""
        }`}
      >
        {aiLoading && sortedAiMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            AI đang suy nghĩ...
          </div>
        ) : sortedAiMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🤖</div>
              <div className="text-sm">
                Bắt đầu chat với AI để tư vấn sản phẩm!
              </div>
            </div>
          </div>
        ) : (
          sortedAiMessages.map((msg) => (
            <div
              key={msg.id}
              className={`relative flex w-full ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </div>
                {msg.productSuggestions?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.productSuggestions.map((p, i) => (
                      <div key={i} className="p-2 bg-white/10 rounded text-xs">
                        {p.title} - {p.price?.toLocaleString()}đ - Rating:{" "}
                        {p.rating}
                      </div>
                    ))}
                  </div>
                )}
                {msg.orderId && (
                  <div className="mt-1 text-xs text-green-400">
                    Order ID: {msg.orderId}
                  </div>
                )}
                <small className="opacity-75 mt-1 block text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </small>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className={`p-3 bg-gray-800 border-t border-gray-700 relative ${
          isEmbedded ? "border-t-0" : ""
        }`}
      >
        {showEmojiPicker && (
          <div ref={emojiPickerRef}>
            <EmojiPicker
              onSelectEmoji={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <span className="text-2xl">😀</span>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={aiMessageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Nhập câu hỏi cho AI..."
            className="flex-1 bg-gray-700 text-white placeholder-gray-400 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={aiLoading}
          />
          <button
            onClick={handleSendAIMessage}
            disabled={!aiMessageInput.trim() || aiLoading}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={aiMessageInput.trim() ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              className={
                aiMessageInput.trim() ? "text-blue-500" : "text-gray-500"
              }
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAI;
