"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/redux_store';
import { 
  ArrowLeft, 
  CheckCircle, 
  Calendar, 
  Bell,
  Info,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/common/button';
import { Card, CardContent } from '@/components/ui/common/card';
import { Badge } from '@/components/ui/common/badge';
import { Separator } from '@/components/ui/common/separator';
import { toast } from 'sonner';
import { notificationApi, type Notification } from '@/services/auth/notification.api';

export default function NotificationDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { accessToken } = useSelector((state: RootState) => state.auth);

  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!accessToken) {
      router.push('/auth/login');
    }
  }, [accessToken, router]);

  const fetchNotification = useCallback(async () => {
    if (!accessToken || !id || typeof id !== 'string') return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch notification by ID
      const found = await notificationApi.getNotificationById(id);
      
      if (found) {
        setNotification(found);
        
        // Auto mark as read if unread
        if (!found.isRead) {
          try {
            await notificationApi.markAsRead(id);
            setNotification(prev => prev ? { ...prev, isRead: true } : null);
          } catch (error) {
            console.error('Error marking as read:', error);
          }
        }
      } else {
        setError('Không tìm thấy thông báo');
        toast.error('Không tìm thấy thông báo');
      }
    } catch (error: unknown) {
      console.error('Error fetching notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải thông báo';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    if (accessToken && id) {
      fetchNotification();
    }
  }, [accessToken, id, fetchNotification]);

  const handleMarkAsRead = async () => {
    if (!notification || notification.isRead) return;

    try {
      await notificationApi.markAsRead(notification._id);
      setNotification(prev => prev ? { ...prev, isRead: true } : null);
      toast.success('Đã đánh dấu đã đọc');
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const getNotificationIcon = (notificationType: string) => {
    const iconClass = "w-8 h-8";
    
    switch (notificationType) {
      case 'Identity Verified':
      case 'Login Success':
      case 'Registration Success':
      case 'Email Verified':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'Profile Updated':
      case 'Avatar Updated':
        return <CheckCircle2 className={`${iconClass} text-blue-500`} />;
      case 'Password Changed':
        return <AlertCircle className={`${iconClass} text-orange-500`} />;
      case 'Order Placed':
      case 'Order Confirmed':
      case 'Payment Received':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'Product Approved':
        return <CheckCircle className={`${iconClass} text-emerald-500`} />;
      case 'Product Rejected':
        return <AlertCircle className={`${iconClass} text-red-500`} />;
      case 'Loyalty':
        return <CheckCircle className={`${iconClass} text-purple-500`} />;
      default:
        return <Info className={`${iconClass} text-blue-500`} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationColor = (notificationType: string) => {
    switch (notificationType) {
      case 'Identity Verified':
      case 'Login Success':
      case 'Registration Success':
      case 'Email Verified':
      case 'Product Approved':
      case 'Payment Received':
        return 'from-green-500 to-emerald-600';
      case 'Profile Updated':
      case 'Avatar Updated':
      case 'Order Placed':
      case 'Order Confirmed':
        return 'from-blue-500 to-indigo-600';
      case 'Password Changed':
        return 'from-orange-500 to-amber-600';
      case 'Product Rejected':
        return 'from-red-500 to-rose-600';
      case 'Loyalty':
        return 'from-purple-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="py-20">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 text-lg">Đang tải thông báo...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          
          <Card>
            <CardContent className="py-20">
              <div className="flex flex-col items-center justify-center">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <p className="text-gray-900 text-lg mb-2 font-semibold">
                  {error || 'Không tìm thấy thông báo'}
                </p>
                <p className="text-gray-600 text-sm mb-6">
                  Thông báo có thể đã bị xóa hoặc không tồn tại
                </p>
                <Button onClick={() => router.push('/auth/notifications')} variant="outline">
                  Xem tất cả thông báo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        {/* Notification Detail Card */}
        <Card className="shadow-xl border-0 overflow-hidden">
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${getNotificationColor(notification.notificationType)} p-8 text-white`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  {getNotificationIcon(notification.notificationType)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">{notification.title}</h1>
                    {!notification.isRead && (
                      <Badge className="bg-white/20 text-white border-white/30">
                        Mới
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-white/90 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(notification.CreatedAt)}</span>
                  </div>
                </div>
              </div>
              
              {!notification.isRead && (
                <Button
                  onClick={handleMarkAsRead}
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Đánh dấu đã đọc
                </Button>
              )}
            </div>
          </div>

          <CardContent className="p-8">
            {/* Notification Type Badge */}
            <div className="mb-6">
              <Badge 
                variant="outline" 
                className="text-sm px-3 py-1 bg-gray-50 dark:bg-gray-900"
              >
                <Bell className="w-3 h-3 mr-1.5" />
                {notification.notificationType}
              </Badge>
            </div>

            <Separator className="mb-6" />

            {/* Notification Body */}
            <div className="prose max-w-none">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base whitespace-pre-wrap">
                  {notification.body}
                </p>
              </div>
            </div>

            {/* Metadata */}
            {notification.metaData && (() => {
              let parsedMetaData: Record<string, unknown> | null = null;
              const displayText = notification.metaData;

              // Try to parse JSON
              try {
                const parsed = JSON.parse(notification.metaData);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                  parsedMetaData = parsed as Record<string, unknown>;
                }
              } catch {
                // If not JSON, use as plain text
                parsedMetaData = null;
              }

              // Field labels mapping
              const fieldLabels: Record<string, string> = {
                itemId: 'ID Sản phẩm',
                productId: 'ID Sản phẩm',
                orderId: 'ID Đơn hàng',
                orderGuid: 'Mã đơn hàng',
                reason: 'Lý do',
                message: 'Thông điệp',
                amount: 'Số tiền',
                status: 'Trạng thái',
                date: 'Ngày',
                userId: 'ID Người dùng',
                points: 'RT Points',
              };

              const formatFieldLabel = (key: string): string => {
                return fieldLabels[key] || key.charAt(0).toUpperCase() + key.slice(1);
              };

              return (
                <>
                  <Separator className="my-6" />
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-6 border border-blue-200 dark:border-blue-900">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4">
                          Thông tin bổ sung
                        </p>
                        {parsedMetaData && typeof parsedMetaData === 'object' ? (
                          <div className="space-y-3">
                            {Object.entries(parsedMetaData).map(([key, value]) => (
                              <div key={key} className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                                  {formatFieldLabel(key)}:
                                </span>
                                <span className="text-sm text-blue-900 dark:text-blue-100 break-all bg-white/50 dark:bg-gray-800/50 rounded-md px-3 py-2 border border-blue-200 dark:border-blue-800">
                                  {String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-blue-800 dark:text-blue-200 break-all bg-white/50 dark:bg-gray-800/50 rounded-md px-3 py-2 border border-blue-200 dark:border-blue-800">
                            {displayText}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Footer Actions */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Trạng thái:</span>
                {notification.isRead ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Đã đọc
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Chưa đọc
                  </Badge>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/auth/notifications')}
                >
                  Xem tất cả
                </Button>
                {!notification.isRead && (
                  <Button
                    onClick={handleMarkAsRead}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Đánh dấu đã đọc
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

