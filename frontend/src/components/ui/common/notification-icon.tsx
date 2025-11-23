"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bell, CheckCircle, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/common/dropdown-menu';
import { notificationApi, Notification } from "@/services/auth/notification.api";
import { notificationSSE } from "@/services/auth/notification.sse";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";

interface NotificationIconProps {
  className?: string;
}

// Constants
const NOTIFICATIONS_LIMIT = 20;

export function NotificationIcon({ className }: NotificationIconProps) {
  const router = useRouter();
  const { accessToken, user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  const parseMetaData = useCallback((metaData?: string) => {
    if (!metaData) return null;
    try {
      const parsed = JSON.parse(metaData);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      console.warn("[Notifications] Failed to parse metadata:", error);
    }
    return null;
  }, []);

  const getNotificationRedirectPath = useCallback(
    (notification: Notification) => {
      const meta = parseMetaData(notification.metaData);

      if (meta && typeof meta === "object") {
        // Direct redirect URL if backend provided one
        if (typeof meta.redirectUrl === "string") {
          return meta.redirectUrl;
        }

        // Order related notifications
        if (meta.orderId) {
          return `/auth/my-orders/${meta.orderId}`;
        }

        // Dispute related notifications
        if (meta.disputeId) {
          if (user?.role === "moderator") {
            return `/moderator/dispute/${meta.disputeId}`;
          }
          return `/dispute/${meta.disputeId}`;
        }

        // Blog post or community notifications
        if (meta.postId) {
          return `/blog/${meta.postId}`;
        }

        // Product or item notifications
        if (meta.productId || meta.itemId) {
          const productId = (meta.productId || meta.itemId) as string;
          return `/products/details?id=${productId}`;
        }
      }

      // Verification related notifications
      if (meta?.requestId) {
        return '/auth/verification-history';
      }
      if (meta?.type && typeof meta.type === 'string') {
        if (meta.type.includes('verification') || meta.type.includes('phone_verification')) {
          return '/auth/verification-history';
        }
      }

      // Type-based fallback when no metadata route
      switch (notification.notificationType) {
        case "Xác minh số điện thoại thành công":
        case "Đã gửi yêu cầu xác minh CCCD":
        case "Yêu cầu xác minh CCCD đang được xử lý":
        case "Xác minh CCCD đã được duyệt":
        case "Xác minh CCCD bị từ chối":
        case "Yêu cầu xác minh CCCD mới":
        case "Phone Verification Success":
        case "ID Card Verification Request Submitted":
        case "ID Card Verification Request Assigned":
        case "ID Card Verification Approved":
        case "ID Card Verification Rejected":
        case "Verification Request Submitted":
        case "Verification Request Assigned":
        case "Verification Approved":
        case "Verification Rejected":
          return "/auth/verification-history";
        case "Identity Verified":
        case "Profile Updated":
        case "Avatar Updated":
          return "/auth/profile";
        case "Order Created":
        case "Order Confirmed":
        case "Order Completed":
        case "Order Started":
        case "Order Returned":
        case "Order Cancelled":
        case "Order Disputed":
        case "Payment Received":
          return "/auth/my-orders";
        case "Product Approved":
        case "Product Rejected":
          return "/owner/myproducts";
        case "Loyalty":
          return "/auth/profile?menu=loyalty";
        default:
          return `/auth/notifications/${notification._id}`;
      }
    },
    [parseMetaData, user?.role]
  );


  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await notificationApi.getNotifications({
        limit: NOTIFICATIONS_LIMIT,
        skip: 0
      });

      if (data?.items) {
        setNotifications(data.items);
        const calculatedUnreadCount = data.items.filter((n: Notification) => !n.isRead).length;
        setUnreadCount(calculatedUnreadCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Không thể tải thông báo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch once on mount so header always has latest data
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refetch whenever auth info becomes available/changes
  useEffect(() => {
    if (!user || !accessToken) return;
    fetchNotifications();
  }, [user, accessToken, fetchNotifications]);

  // SSE setup
  useEffect(() => {
    // Chỉ kết nối khi có user và token
    if (!user || !accessToken) {
      return;
    }

    // Disconnect previous SSE (nếu có) để đảm bảo dùng token mới nhất
    notificationSSE.disconnect();

    // Kết nối SSE để nhận notifications và unread count realtime
    notificationSSE.connect({
      onConnect: () => {
        console.log('[Notifications] SSE connected');
        setSseConnected(true);
        // Backend sẽ tự động gửi unread count ban đầu khi SSE kết nối
        // Unread count sẽ được cập nhật từ SSE callback (onUnreadCount)
      },
      onDisconnect: () => {
        console.log('[Notifications] SSE disconnected');
        setSseConnected(false);
      },
      onNotification: (notification: Notification) => {
        console.log('[Notifications] New notification received:', notification);

        // Thêm notification mới vào đầu danh sách
        setNotifications(prev => {
          // Kiểm tra xem notification đã tồn tại chưa (tránh duplicate)
          const exists = prev.some(n => n._id === notification._id);
          if (exists) return prev;

          // Thêm vào đầu danh sách và giới hạn số lượng
          return [notification, ...prev].slice(0, NOTIFICATIONS_LIMIT);
        });


        if (!notification.isRead) {
          setUnreadCount((prev) => prev + 1);
        }

        // Hiển thị toast notification
        toast.info(notification.title, {
          description: notification.body,
          duration: 5000,
        });
      },
      onUnreadCount: (count: number) => {
        console.log('[Notifications] Unread count updated from SSE:', count);
        // Cập nhật unread count từ SSE - đây là nguồn chính xác nhất
        // Backend gửi unread count ban đầu khi SSE kết nối và mỗi khi có thay đổi
        setUnreadCount(count);
        console.log('[Notifications] Unread count state updated to:', count);
      },
      onError: (error) => {
        console.error('[Notifications] SSE error:', error);
        setSseConnected(false);
      }
    }, accessToken);

    // Cleanup: disconnect SSE khi component unmount hoặc user logout
    return () => {
      notificationSSE.disconnect();
    };
  }, [user, accessToken]); // Reconnect khi user hoặc token thay đổi

  // Refresh notifications when dropdown opens (SSE đã tự động cập nhật unread count)
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = useCallback(async (id: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      // Không cập nhật unread count thủ công ở đây
      // Backend sẽ gửi unread count update qua SSE callback (onUnreadCount)
      toast.success("Đã đánh dấu đã đọc");
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error("Không thể đánh dấu đã đọc");
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      // Không cập nhật unread count thủ công ở đây
      // Backend sẽ gửi unread count update qua SSE callback (onUnreadCount)
      toast.success("Đã đánh dấu tất cả đã đọc");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Không thể đánh dấu tất cả đã đọc");
    }
  }, []);

  // Memoized date formatter
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  }, []);

  // Memoized notification icon getter
  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case "Login Success":
      case "Registration Success":
      case "Email Verified":
        return "✅";
      case "Xác minh số điện thoại thành công":
      case "Phone Verification Success":
        return "📱";
      case "Đã gửi yêu cầu xác minh CCCD":
      case "Yêu cầu xác minh CCCD đang được xử lý":
      case "Xác minh CCCD đã được duyệt":
      case "Xác minh CCCD bị từ chối":
      case "Yêu cầu xác minh CCCD mới":
      case "ID Card Verification Request Submitted":
      case "ID Card Verification Request Assigned":
      case "ID Card Verification Approved":
      case "ID Card Verification Rejected":
        return "🆔";
      case "Product Approved":
        return "✨";
      case "Product Rejected":
        return "⚠️";
      case "Order Placed":
      case "Order Confirmed":
        return "📦";
      case "Payment Received":
        return "💰";
      default:
        return "🔔";
    }
  }, []);

  // Format notification type name for display
  const getNotificationTypeName = useCallback((type: string) => {
    switch (type) {
      case "Xác minh số điện thoại thành công":
      case "Phone Verification Success":
        return "Xác minh số điện thoại";
      case "Đã gửi yêu cầu xác minh CCCD":
      case "ID Card Verification Request Submitted":
        return "Xác minh CCCD - Đã gửi";
      case "Yêu cầu xác minh CCCD đang được xử lý":
      case "ID Card Verification Request Assigned":
        return "Xác minh CCCD - Đang xử lý";
      case "Xác minh CCCD đã được duyệt":
      case "ID Card Verification Approved":
        return "Xác minh CCCD - Đã duyệt";
      case "Xác minh CCCD bị từ chối":
      case "ID Card Verification Rejected":
        return "Xác minh CCCD - Bị từ chối";
      case "Yêu cầu xác minh CCCD mới":
        return "Xác minh CCCD - Yêu cầu mới";
      default:
        return type;
    }
  }, []);

  // Unread count được cập nhật realtime từ SSE
  const displayUnreadCount = unreadCount;

  // Debug: Log unread count changes
  useEffect(() => {
    console.log('[Notifications] Unread count changed to:', unreadCount, 'Display count:', displayUnreadCount);
  }, [unreadCount, displayUnreadCount]);

  const handleNotificationClick = useCallback((notification: Notification, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    // Mark as read if unread
    if (!notification.isRead) {
      handleMarkAsRead(notification._id, event);
    }

    const targetUrl = getNotificationRedirectPath(notification);
    router.push(targetUrl);
    setIsOpen(false);
  }, [router, handleMarkAsRead, getNotificationRedirectPath]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
        >
          <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          {displayUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full min-w-[22px] h-5 px-1.5 flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-lg animate-pulse">
              {displayUnreadCount > 99 ? '99+' : displayUnreadCount > 9 ? '9+' : displayUnreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-96 max-h-[600px] overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xl rounded-xl z-[200]"
        align="end"
        sideOffset={12}
        alignOffset={0}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Thông báo</h3>
              <div className="flex items-center gap-2">
                {sseConnected && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Đang kết nối realtime"></span>
                )}
                {displayUnreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {displayUnreadCount} mới
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 hover:bg-white/50 dark:hover:bg-gray-700"
              onClick={() => {
                router.push('/auth/notifications');
                setIsOpen(false);
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Xem tất cả
            </Button>
          </div>

          {displayUnreadCount > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                Đánh dấu tất cả đã đọc
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[480px]">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Không có thông báo nào
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Thông báo mới sẽ hiển thị ở đây
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`group relative p-4 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!notification.isRead
                    ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-l-4 border-blue-500'
                    : 'hover:border-l-4 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  onClick={(e) => handleNotificationClick(notification, e)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${!notification.isRead
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                      {getNotificationIcon(notification.notificationType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm font-semibold line-clamp-1 ${!notification.isRead
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                          }`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5 animate-pulse"></span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                        {notification.body}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {formatDate(notification.CreatedAt)}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                            {getNotificationTypeName(notification.notificationType)}
                          </span>
                        </div>

                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-100 dark:hover:bg-green-900/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification._id, e);
                            }}
                          >
                            <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

