"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/common/table";
import { Badge } from "@/components/ui/common/badge";
import { Button } from "@/components/ui/common/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/common/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";
import { Textarea } from "@/components/ui/common/textarea";
import { Input } from "@/components/ui/common/input";
import { Label } from "@/components/ui/common/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/common/dropdown-menu";
import {
  Eye,
  CheckCircle,
  XCircle,
  Flag,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  Bot,
  Shield,
  Ban,
  RotateCcw
} from "lucide-react";
import {
  getPendingComments,
  approveComment,
  rejectComment,
  flagComment,
  runAIModeration,
  ModerationComment
} from "@/services/moderator/moderation.api";
import { toast } from "sonner";

interface ModerationCommentsTableProps {
  status: 'pending' | 'flagged' | 'approved' | 'rejected';
  filters: {
    search: string;
    violationType: string;
  };
  refreshKey: number;
  onRefresh: () => void;
}

export function ModerationCommentsTable({
  status,
  filters,
  refreshKey,
  onRefresh
}: ModerationCommentsTableProps) {
  const [comments, setComments] = useState<ModerationComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1
  });

  // Modal states
  const [selectedComment, setSelectedComment] = useState<ModerationComment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);

  // Form states
  const [rejectReason, setRejectReason] = useState("");
  const [banDuration, setBanDuration] = useState(24); // hours
  const [penaltyUser, setPenaltyUser] = useState(true);
  const [flagReason, setFlagReason] = useState("");

  useEffect(() => {
    fetchComments();
  }, [status, filters, refreshKey, pagination.page]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await getPendingComments({
        status: status === 'pending' || status === 'flagged' ? status : 'all',
        search: filters.search,
        violationType: filters.violationType,
        skip: (pagination.page - 1) * pagination.limit,
        limit: pagination.limit
      });

      if (response.code === 200) {
        setComments(response.data.items);
        setPagination({
          ...pagination,
          totalItems: response.data.totalItems,
          totalPages: response.data.totalPages
        });
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      toast.error("Không thể tải danh sách bình luận");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (comment: ModerationComment) => {
    setSelectedComment(comment);
    setDetailModalOpen(true);
  };

  const handleApprove = async (commentId: string) => {
    try {
      const response = await approveComment(commentId);
      if (response.code === 200) {
        toast.success("Đã duyệt bình luận thành công");
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to approve comment:", error);
      toast.error("Không thể duyệt bình luận");
    }
  };

  const handleReject = async () => {
    if (!selectedComment || !rejectReason.trim()) return;

    try {
      const response = await rejectComment(selectedComment._id, {
        reason: rejectReason.trim(),
        penaltyUser,
        banDuration: penaltyUser ? banDuration : undefined
      });

      if (response.code === 200) {
        toast.success("Đã từ chối bình luận và áp dụng penalty");
        setRejectModalOpen(false);
        setRejectReason("");
        setBanDuration(24);
        setPenaltyUser(true);
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to reject comment:", error);
      toast.error("Không thể từ chối bình luận");
    }
  };

  const handleFlag = async () => {
    if (!selectedComment) return;

    try {
      const response = await flagComment(selectedComment._id, {
        reason: flagReason.trim() || "Cần review lại"
      });

      if (response.code === 200) {
        toast.success("Đã đánh dấu bình luận cần review");
        setFlagModalOpen(false);
        setFlagReason("");
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to flag comment:", error);
      toast.error("Không thể đánh dấu bình luận");
    }
  };

  const handleRunAIModeration = async (commentId: string) => {
    try {
      const response = await runAIModeration(commentId);
      if (response.code === 200) {
        toast.success("AI đã phân tích xong");
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to run AI moderation:", error);
      toast.error("Không thể chạy AI moderation");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: "Chờ duyệt",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock
      },
      approved: {
        label: "Đã duyệt",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle
      },
      rejected: {
        label: "Từ chối",
        className: "bg-red-100 text-red-800 border-red-200",
        icon: XCircle
      },
      flagged: {
        label: "Đánh dấu",
        className: "bg-orange-100 text-orange-800 border-orange-200",
        icon: Flag
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getViolationTypeBadge = (type: string | null) => {
    if (!type) return null;

    const typeLabels = {
      spam: "Spam",
      hate_speech: "Lăng mạ",
      harassment: "Quấy rối",
      inappropriate: "Không phù hợp",
      off_topic: "Ngoài chủ đề",
      troll: "Troll",
      other: "Khác"
    };

    return (
      <Badge variant="outline" className="text-xs">
        {typeLabels[type as keyof typeof typeLabels] || type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Đang tải bình luận...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/20">
              <TableHead className="text-gray-700">Nội dung</TableHead>
              <TableHead className="text-gray-700">Người dùng</TableHead>
              <TableHead className="text-gray-700">Trạng thái</TableHead>
              <TableHead className="text-gray-700">Vi phạm</TableHead>
              <TableHead className="text-gray-700">AI Confidence</TableHead>
              <TableHead className="text-gray-700">Thời gian</TableHead>
              <TableHead className="text-gray-700">Hành động</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {comments.map((comment) => (
              <TableRow key={comment._id} className="border-white/20 hover:bg-gray-50/50">
                <TableCell className="max-w-xs">
                  <div className="truncate" title={comment.content}>
                    {comment.content}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.user.avatarUrl} />
                      <AvatarFallback>
                        {comment.user.fullName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">
                        {comment.user.fullName}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          ⭐ {comment.user.reputationScore}/5
                        </span>
                        {comment.user.isCommentBanned && (
                          <Badge variant="destructive" className="text-xs">
                            Bị ban
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  {getStatusBadge(comment.moderationStatus)}
                </TableCell>

                <TableCell>
                  {getViolationTypeBadge(comment.violationType)}
                </TableCell>

                <TableCell>
                  {comment.aiConfidence !== null ? (
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm font-medium ${
                        comment.aiConfidence > 0.8 ? 'text-green-600' :
                        comment.aiConfidence > 0.5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(comment.aiConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>

                <TableCell className="text-gray-600 text-sm">
                  {new Date(comment.createdAt).toLocaleString('vi-VN')}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewDetail(comment)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {(status === 'pending' || status === 'flagged') && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleApprove(comment._id)}
                          className="text-green-600 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedComment(comment);
                            setRejectModalOpen(true);
                          }}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedComment(comment);
                                setFlagModalOpen(true);
                              }}
                            >
                              <Flag className="w-4 h-4 mr-2" />
                              Đánh dấu review
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRunAIModeration(comment._id)}
                            >
                              <Bot className="w-4 h-4 mr-2" />
                              Chạy AI
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalItems)} của {pagination.totalItems} bình luận
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Chi tiết bình luận
            </DialogTitle>
          </DialogHeader>

          {selectedComment && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarImage src={selectedComment.user.avatarUrl} />
                    <AvatarFallback>
                      {selectedComment.user.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedComment.user.fullName}</p>
                    <p className="text-sm text-gray-600">
                      ⭐ {selectedComment.user.reputationScore}/5
                      {selectedComment.user.isCommentBanned && (
                        <Badge variant="destructive" className="ml-2 text-xs">Bị ban</Badge>
                      )}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <p className="text-gray-900">{selectedComment.content}</p>
                </div>

                <div className="mt-3 text-sm text-gray-600">
                  <p>Bài viết: <span className="font-medium">{selectedComment.post.title}</span></p>
                  <p>Thời gian: {new Date(selectedComment.createdAt).toLocaleString('vi-VN')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Trạng thái</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedComment.moderationStatus)}
                  </div>
                </div>

                {selectedComment.violationType && (
                  <div>
                    <Label>Loại vi phạm</Label>
                    <div className="mt-1">
                      {getViolationTypeBadge(selectedComment.violationType)}
                    </div>
                  </div>
                )}

                {selectedComment.aiConfidence !== null && (
                  <div>
                    <Label>AI Confidence</Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {(selectedComment.aiConfidence * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                )}

                {selectedComment.moderationReason && (
                  <div className="col-span-2">
                    <Label>Lý do</Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                      {selectedComment.moderationReason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Từ chối bình luận
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-red-800 text-sm">
                Bạn sắp từ chối bình luận này. Hành động này sẽ ẩn bình luận và có thể áp dụng penalty cho người dùng.
              </p>
            </div>

            <div>
              <Label htmlFor="reject-reason">Lý do từ chối *</Label>
              <Textarea
                id="reject-reason"
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="penalty-user"
                checked={penaltyUser}
                onChange={(e) => setPenaltyUser(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="penalty-user">Áp dụng penalty cho người dùng</Label>
            </div>

            {penaltyUser && (
              <div>
                <Label htmlFor="ban-duration">Thời gian cấm bình luận (giờ)</Label>
                <Input
                  id="ban-duration"
                  type="number"
                  min="1"
                  max="720" // 30 days
                  value={banDuration}
                  onChange={(e) => setBanDuration(Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Người dùng sẽ bị cấm bình luận trong {banDuration} giờ và mất điểm uy tín.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              Từ chối bình luận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Modal */}
      <Dialog open={flagModalOpen} onOpenChange={setFlagModalOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Flag className="w-5 h-5" />
              Đánh dấu cần review lại
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="flag-reason">Lý do đánh dấu (tùy chọn)</Label>
              <Textarea
                id="flag-reason"
                placeholder="Nhập lý do cần review lại..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleFlag}>
              Đánh dấu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
