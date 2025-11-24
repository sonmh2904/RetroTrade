import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/common/dialog";
import { toast } from "sonner";
import { getCommentDetail } from "@/services/auth/blog.api";

interface User {
  _id: string;
  fullName: string;
  avatarUrl?: string;
  displayName?: string;
}

interface Comment {
  _id: string;
  content: string;
  postId?: { _id: string; title: string };
  userId?: User;
  parentCommentId?: { _id: string; content: string; userId?: User };
  createdAt: string;
  updatedAt: string;
}

interface CommentDetailProps {
  open: boolean;
  onClose: () => void;
  commentId: string | null;
}

const CommentDetail: React.FC<CommentDetailProps> = ({
  open,
  onClose,
  commentId,
}) => {
  const [comment, setComment] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(false);

  // 🌀 Gọi API khi mở dialog hoặc đổi ID
  useEffect(() => {
    if (open && commentId) {
      fetchCommentDetail(commentId);
    }
  }, [open, commentId]);

  const fetchCommentDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await getCommentDetail(id); 
      if (res.comment) {
        setComment(res.comment); 
      } else {
        toast.error("Không tìm thấy comment");
      }
    } catch {
      toast.error("Không thể tải chi tiết comment");
    } finally {
      setLoading(false);
    }
  };
  

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-[#6E8CFB] text-white border border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Chi tiết comment
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Xem thông tin chi tiết về comment.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-center text-white/60 py-10">Đang tải...</p>
        ) : comment ? (
          <div className="space-y-4 mt-2">
   
            <div className="gap-3 text-sm">
              <div>
                <p className="text-white/60">Người dùng:</p>
                <p className="text-white">
                  {comment.userId?.fullName || "Không rõ"}
                </p>
              </div>

             
              <div>
                <p className="text-white/60">Bài viết:</p>
                <p className="text-white">
                  {comment.postId?.title || "Không rõ"}
                </p>
              </div>

              {/* Comment cha */}
              <div className="col-span-2">
                <p className="text-white/60">Comment cha:</p>
                <p className="text-white">
                  {comment.parentCommentId?.content || "Không có"}
                </p>
              </div>

              {/* Ngày tạo */}
              <div className="col-span-2">
                <p className="text-white/60">Ngày tạo:</p>
                <p className="text-white">
                  {new Date(comment.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>

              {/* Ngày cập nhật */}
              <div className="col-span-2">
                <p className="text-white/60">Ngày cập nhật:</p>
                <p className="text-white">
                  {new Date(comment.updatedAt).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            {/* Nội dung comment */}
            <div className="border-t border-white/10 pt-3">
              <p className="text-white/60 mb-1">Nội dung:</p>
              <div className="prose prose-invert max-w-none">
                {comment.content}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-white/60 py-10">
            Không tìm thấy comment
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommentDetail;
