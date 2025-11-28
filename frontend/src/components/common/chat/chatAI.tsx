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
  isBest?: boolean;
  reasons?: string[];
  score?: number;
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
  bestProducts?: ProductSuggestion[];
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

  const cleanMarkdown = useCallback((text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/`(.*?)`/g, "$1");
  }, []);

  const renderProductSuggestions = useCallback(
    (
      suggestions: ProductSuggestion[],
      type: "products" | "best" = "products"
    ) => {
      if (!suggestions?.length) return null;

      return (
        <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-gray-800 rounded-lg">
          {suggestions.slice(0, 5).map((p, i) => (
            <button
              key={p.itemId || i}
              onClick={() => {
                const itemIdStr = normalizeId(p.itemId);
                if (itemIdStr)
                  router.push(
                    `/products/details?id=${encodeURIComponent(itemIdStr)}`
                  );
              }}
              className={`w-full text-left p-3 rounded-lg hover:bg-gray-600/70 transition-all border ${
                p.isBest
                  ? "border-yellow-500 bg-yellow-900/20"
                  : "border-gray-600 hover:border-blue-500 group"
              }`}
            >
              <div className="flex gap-3">
                <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-700">
                  {p.images?.[0] ? (
                    <Image
                      src={p.images[0]}
                      alt={p.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const placeholder = e.currentTarget.parentElement;
                        if (placeholder) {
                          placeholder.innerHTML = `
                            <svg viewBox="0 0 64 64" fill="none" class="w-full h-full p-2">
                              <rect width="64" height="64" rx="8" fill="#4B5563"/>
                              <path d="M20 20h24v24H20z" fill="#9CA3AF"/>
                              <circle cx="32" cy="32" r="8" fill="#6B7280"/>
                            </svg>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <svg
                      viewBox="0 0 64 64"
                      fill="none"
                      className="w-full h-full p-2"
                    >
                      <rect width="64" height="64" rx="8" fill="#4B5563" />
                      <path d="M20 20h24v24H20z" fill="#9CA3AF" />
                      <circle cx="32" cy="32" r="8" fill="#6B7280" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium truncate transition-colors ${
                      p.isBest
                        ? "text-yellow-300"
                        : "text-white group-hover:text-blue-400"
                    }`}
                  >
                    {p.title}
                  </div>
                  <div className="text-green-400 text-sm font-semibold mt-1">
                    {p.price?.toLocaleString("vi-VN")}₫
                  </div>
                  {p.fullAddress && (
                    <div className="text-gray-400 text-xs mt-1 truncate">
                      Location: {p.fullAddress}
                    </div>
                  )}
                  {p.isBest && p.reasons && (
                    <div className="text-xs text-yellow-200 mt-1">
                      {p.reasons.slice(0, 2).join(" | ")}
                    </div>
                  )}
                  <div
                    className={`text-xs mt-2 font-medium ${
                      p.isBest ? "text-yellow-300" : "text-blue-400"
                    }`}
                  >
                    Click để xem chi tiết →
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      );
    },
    [router]
  );

  // === HỢP NHẤT bestProduct & bestProducts THÀNH 1 MẢNG DUY NHẤT ===
  const renderBestProducts = useCallback(
    (msg: AIMessage) => {
      const bestItems: ProductSuggestion[] =
        msg.bestProducts && msg.bestProducts.length > 0
          ? msg.bestProducts
          : msg.bestProduct
          ? [msg.bestProduct]
          : [];

      if (bestItems.length === 0) return null;

      return (
        <div className="mt-3 p-3 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-lg border-2 border-yellow-500">
          <p className="text-xs font-bold text-yellow-300 mb-2">
            {bestItems.length === 1
              ? "SẢN PHẨM TỐT NHẤT"
              : `TOP ${bestItems.length} SẢN PHẨM TỐT NHẤT`}
          </p>

          {bestItems[0]?.reasons && bestItems[0].reasons.length > 0 && (
            <p className="text-xs text-yellow-200 mb-3">
              Lý do: {bestItems[0].reasons.join(", ")}
              {bestItems[0].score ? ` (Score: ${bestItems[0].score}/100)` : ""}
            </p>
          )}

          {renderProductSuggestions(bestItems, "best")}
        </div>
      );
    },
    [renderProductSuggestions]
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
            if (typeof img === "string") return img.trim();
            if (isObject(img))
              return (
                ((img as RawRecord).Url as string)?.trim() ||
                ((img as RawRecord).url as string)?.trim() ||
                ""
              );
            return "";
          })
          .filter((url) => url && url.length > 0)
      : [];

    const isBest = (p as RawRecord).isBest === true;
    const reasons = Array.isArray((p as RawRecord).reasons)
      ? ((p as RawRecord).reasons as string[])
      : [];

    const scoreRaw = (p as RawRecord).score;
    let score: number | undefined;
    if (typeof scoreRaw === "number") {
      score = scoreRaw;
    } else {
      score = undefined;
    }

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
      isBest,
      reasons,
      score,
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
            if (Array.isArray(mm.bestProducts)) {
              mm.bestProducts = mm.bestProducts.map((x) =>
                normalizeProduct(x)
              ) as unknown;
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
              bestProducts: Array.isArray(mm.bestProducts)
                ? (mm.bestProducts as ProductSuggestion[])
                : undefined,
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

        const aiMsg: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: cleanMarkdown(aiResponseData.content || aiResponseData),
          timestamp: new Date(),
          productSuggestions: formatProductsForDisplay(
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
          bestProducts: formatProductsForDisplay(data.data?.bestProducts ?? []),
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
      {/* Header */}
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
            <div className="text-white font-medium text-sm">RetroTrade AI</div>
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

      {/* Messages */}
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
              <div className="text-4xl mb-2">Robot Face</div>
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
                {renderBestProducts(msg)}
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

      {/* Input */}
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
