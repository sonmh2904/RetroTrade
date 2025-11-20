"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
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

interface ProductSuggestion {
  itemId: string;
  title: string;
  price: number;
  detail: string;
  rating: number;
  distance: string;
  fullAddress?: string;
  estimatedDistance?: number;
  images?: string[];
}

interface AIMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
  productSuggestions?: ProductSuggestion[];
  orderId?: string;
  products?: ProductSuggestion[]; 
  recommendations?: ProductSuggestion[]; 
  bestProduct?: ProductSuggestion; 
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
  const router = useRouter();
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

  // Helper để clean markdown * (loại bỏ italic/strong)
  const cleanMarkdown = useCallback((text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1") // Bold
      .replace(/\*(.*?)\*/g, "$1") // Italic
      .replace(/__(.*?)__/g, "$1") // Underline
      .replace(/`(.*?)`/g, "$1"); // Inline code
  }, []);

  // Helper render product suggestions (clickable links)
  const renderProductSuggestions = useCallback(
    (
      suggestions: ProductSuggestion[],
      // keep param name but now only used to render product cards (no "Gợi ý" label)
      type: "products" | "best" = "products"
    ) => {
      if (!suggestions?.length) return null;

      // Render only product cards (no "Gợi ý" header)
      return (
        <div className="mt-3 p-0 rounded-lg">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {suggestions.slice(0, 5).map((p, i) => (
              <button
                key={p.itemId || i}
                onClick={() => {
                  const itemIdStr = safeToString(
                    (p as unknown as RawRecord).itemId ?? p.itemId
                  );
                  if (itemIdStr)
                    router.push(
                      `/products/details?id=${encodeURIComponent(itemIdStr)}`
                    );
                }}
                className="w-full text-left p-3 bg-gray-700/50 rounded-lg hover:bg-gray-600/70 transition-all border border-gray-600 hover:border-blue-500 group"
              >
                <div className="flex gap-3">
                  {p.images?.[0] && (
                    <Image
                      src={p.images[0]}
                      alt={p.title}
                      width={64} // w-16
                      height={64} // h-16
                      className="rounded object-cover flex-shrink-0"
                      onError={(e) => {
                        // Next/Image không cho thay đổi style trực tiếp
                        // → cần state để ẩn ảnh khi lỗi
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                      {p.title}
                    </div>
                    <div className="text-green-400 text-sm font-semibold mt-1">
                      {p.price?.toLocaleString("vi-VN")}₫
                    </div>
                    {p.fullAddress && (
                      <div className="text-gray-400 text-xs mt-1 truncate">
                        📍 {p.fullAddress}
                      </div>
                    )}
                    {p.estimatedDistance && (
                      <div className="text-blue-400 text-xs mt-1">
                        📏 Khoảng cách: {p.estimatedDistance}km
                      </div>
                    )}
                    <div className="text-blue-400 text-xs mt-2 font-medium">
                      👆 Click để xem chi tiết →
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    },
    [router]
  );

  type RawRecord = Record<string, unknown>;

  const isObject = (v: unknown): v is RawRecord =>
    v !== null && typeof v === "object";

  const safeToString = (id: unknown): string => {
    if (id === null || id === undefined) return "";
    if (typeof id === "string") return id;
    if (typeof id === "number") return String(id);
    if (isObject(id)) {
      const maybeToStr = (id as { toString?: () => string }).toString;
      if (typeof maybeToStr === "function") {
        try {
          const s = maybeToStr.call(id);
          if (s && !s.includes("[object")) return s;
        } catch {}
      }
      if ("$oid" in id && typeof (id as RawRecord)["$oid"] === "string")
        return (id as RawRecord)["$oid"] as string;
      if ("$uuid" in id && typeof (id as RawRecord)["$uuid"] === "string")
        return (id as RawRecord)["$uuid"] as string;
      if ("_id" in id) return safeToString((id as RawRecord)["_id"]);
    }
    try {
      return String(id);
    } catch {
      return "";
    }
  };

  const normalizeId = (id: unknown): string => {
    return safeToString(id);
  };

  const emptyProduct = (): ProductSuggestion => ({
    itemId: "",
    title: "",
    price: 0,
    detail: "",
    rating: 0,
    distance: "",
    fullAddress: "",
    estimatedDistance: undefined,
    images: [],
  });

  const normalizeProduct = (p: unknown): ProductSuggestion => {
    if (!isObject(p)) return emptyProduct();

    const getStr = (k: string) =>
      (p[k] && typeof p[k] === "string" ? (p[k] as string) : "") || "";

    const id = normalizeId(
      (p as RawRecord)._id ?? (p as RawRecord).itemId ?? (p as RawRecord).id
    );
    const title = getStr("Title") || getStr("title");
    const detail =
      getStr("ShortDescription") ||
      getStr("detail") ||
      getStr("Description") ||
      "";
    const basePriceRaw =
      (p as RawRecord).BasePrice ?? (p as RawRecord).price ?? 0;
    const price =
      typeof basePriceRaw === "number"
        ? basePriceRaw
        : Number(basePriceRaw) || 0;
    const addressParts = [
      (p as RawRecord).Address,
      (p as RawRecord).District,
      (p as RawRecord).City,
    ].filter((v) => typeof v === "string" && v) as string[];
    const fullAddress =
      getStr("FullAddress") || getStr("fullAddress") || addressParts.join(", ");
    const estimatedDistance =
      typeof (p as RawRecord).estimatedDistance === "number"
        ? ((p as RawRecord).estimatedDistance as number)
        : undefined;
    const rawImages = (p as RawRecord).Images ?? (p as RawRecord).images;
    const images: string[] = Array.isArray(rawImages)
      ? (rawImages as unknown[])
          .map((img) => {
            if (typeof img === "string") return img;
            if (isObject(img))
              return (
                ((img as RawRecord).Url as string) ||
                ((img as RawRecord).url as string) ||
                ""
              );
            return "";
          })
          .filter(Boolean)
      : [];

    const cityOrDistance = getStr("City") || getStr("city") || "";

    return {
      itemId: id,
      title: title || "",
      price,
      detail,
      rating: 0,
      distance: cityOrDistance,
      fullAddress,
      estimatedDistance,
      images,
    };
  };

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
          if (currentSessionId) {
            localStorage.setItem(AI_SESSION_KEY, currentSessionId);
          }
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
          const normalized = (data.data.messages || []).map((m: unknown) => {
            if (!isObject(m)) return m as AIMessage;
            const mm = { ...(m as RawRecord) } as RawRecord;
            if (Array.isArray(mm.products)) {
              mm.products = mm.products.map((x) =>
                normalizeProduct(x)
              ) as unknown;
            }
            if (Array.isArray(mm.productSuggestions)) {
              mm.productSuggestions = mm.productSuggestions.map((x) =>
                normalizeProduct(x)
              ) as unknown;
            }
            if (Array.isArray(mm.recommendations)) {
              mm.recommendations = mm.recommendations.map((x) =>
                normalizeProduct(x)
              ) as unknown;
            }
            if (mm.bestProduct) {
              mm.bestProduct = normalizeProduct(mm.bestProduct);
            }
            const safeRole = (mm.role === "user" ? "user" : "model") as
              | "user"
              | "model";
            const safeContent =
              typeof mm.content === "string" ? mm.content : "";
            const safeTimestamp = mm.timestamp
              ? new Date(String(mm.timestamp))
              : new Date();
            return {
              id: normalizeId(
                mm.id ?? mm._id ?? mm.itemId ?? safeTimestamp.getTime()
              ),
              role: safeRole,
              content: safeContent,
              timestamp: safeTimestamp,
              productSuggestions: Array.isArray(mm.productSuggestions)
                ? (mm.productSuggestions as ProductSuggestion[])
                : undefined,
              products: Array.isArray(mm.products)
                ? (mm.products as ProductSuggestion[])
                : undefined,
              recommendations: Array.isArray(mm.recommendations)
                ? (mm.recommendations as ProductSuggestion[])
                : undefined,
              bestProduct: mm.bestProduct as ProductSuggestion | undefined,
              orderId: typeof mm.orderId === "string" ? mm.orderId : undefined,
            } as AIMessage;
          });
          setAiMessages(normalized);
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
        const aiResponseData = data.data.response;
        const formatProductsForDisplay = (
          products: unknown
        ): ProductSuggestion[] => {
          if (!Array.isArray(products)) return [];
          return (products as unknown[]).map((p) => normalizeProduct(p));
        };

        // Format productSuggestions từ AI response để đảm bảo itemId là string
        const formatSuggestions = (
          suggestions: unknown
        ): ProductSuggestion[] => {
          if (!Array.isArray(suggestions)) return [];
          return (suggestions as unknown[]).map((s) => normalizeProduct(s));
        };

        const aiMsg: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: cleanMarkdown(aiResponseData.content || aiResponseData), // Clean markdown
          timestamp: new Date(),
          productSuggestions: formatSuggestions(
            aiResponseData?.productSuggestions ?? []
          ),
          orderId: aiResponseData.orderId,
          products: formatProductsForDisplay(data.data?.products ?? []),
          recommendations: formatProductsForDisplay(
            data.data?.recommendations ?? []
          ),
          bestProduct: data.data.bestProduct
            ? formatProductsForDisplay([data.data.bestProduct])[0]
            : undefined,
        };

        if (aiMsg.orderId) {
          toast.success(`Đơn thuê tạo thành công! Order ID: ${aiMsg.orderId}`);
          router.push(`/order/${aiMsg.orderId}`);
        }

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
          content: `Server AI đang bận ${
            errorData.message || "Server AI bận, thử lại sau!"
          }`,
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
  }, [aiMessageInput, aiSessionId, aiLoading, cleanMarkdown, router]);

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
                  {msg.role === "model"
                    ? cleanMarkdown(msg.content)
                    : msg.content}
                </div>
                {/* Render bestProduct nếu có (1 cái duy nhất) */}
                {msg.bestProduct && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-lg border-2 border-yellow-500">
                    <p className="text-xs font-bold text-yellow-300 mb-2">
                      ⭐ SẢN PHẨM TỐT NHẤT
                    </p>
                    {renderProductSuggestions([msg.bestProduct], "best")}
                  </div>
                )}
                {/* Only show products (actual search results) */}
                {msg.products &&
                  renderProductSuggestions(msg.products, "products")}
                {msg.orderId && (
                  <div className="mt-1 text-xs text-green-400">
                    Order ID: {msg.orderId} (Đã tạo thành công!)
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
