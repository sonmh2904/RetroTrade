import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/common/dialog";
import { Badge } from "@/components/ui/common/badge";
import { toast } from "sonner";
import { getBlogDetail } from "@/services/auth/blog.api";


interface Blog {
  _id: string;
  title: string;
  shortDescription?: string;
  content: string;
  thumbnail?: string;
  authorId?: { _id: string; fullName: string };
  categoryId?: { _id: string; name: string };
  tags?: { _id: string; name: string }[];
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
}


interface BlogDetailProps {
  open: boolean;
  onClose: () => void;
  blogId: string | null;
}

const BlogDetail: React.FC<BlogDetailProps> = ({ open, onClose, blogId }) => {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(false);

  // 🌀 Gọi API khi mở dialog hoặc đổi ID
  useEffect(() => {
    if (open && blogId) {
      fetchBlogDetail(blogId);
    }
  }, [open, blogId]);

const fetchBlogDetail = async (id: string) => {
  try {
    setLoading(true);
    const res = await getBlogDetail(id);
    console.log("🔥 Blog detail response:", res);
    setBlog(res);
  } catch {
    toast.error("Không thể tải chi tiết bài viết");
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
            Chi tiết bài viết
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Xem thông tin chi tiết về bài viết.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-center text-white/60 py-10">Đang tải...</p>
        ) : blog ? (
          <div className="space-y-4 mt-2">
            {blog.thumbnail && (
              <div className="w-full h-60 rounded-lg overflow-hidden border border-white/10">
                <img
                  src={blog.thumbnail}
                  alt={blog.title}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            {/* Tiêu đề và mô tả */}
            <div>
              <h2 className="text-2xl font-semibold">{blog.title}</h2>
              <p className="text-white/60 mt-1">
                {blog.shortDescription || "Không có mô tả ngắn"}
              </p>
            </div>

            {/* Thông tin meta */}
            <div className="grid grid-cols-2 gap-3 text-sm mt-3">
              <div>
                <p className="text-white/60">Tác giả:</p>
                <p className="text-white">
                  {blog.authorId?.fullName || "Không rõ"}
                </p>
              </div>
              <div>
                <p className="text-white/60">Danh mục:</p>
                <p className="text-white">
                  {blog.categoryId?.name || "Không có"}
                </p>
              </div>
              <div>
                <p className="text-white/60">Trạng thái:</p>
                <p className="text-white">
                  {blog.isActive ? "Đang hoạt động" : "Đã ẩn"}
                </p>
              </div>
              <div>
                <p className="text-white/60">Nổi bật:</p>
                <p className="text-white">{blog.isFeatured ? "Có" : "Không"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-white/60">Ngày tạo:</p>
                <p className="text-white">
                  {new Date(blog.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div>
                <p className="text-white/60 mb-1">Thẻ:</p>
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag) => (
                    <Badge key={tag._id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Nội dung */}
            <div className="border-t border-white/10 pt-3">
              <p className="text-white/60 mb-1">Nội dung:</p>
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: blog.content }}
              />
            </div>
          </div>
        ) : (
          <p className="text-center text-white/60 py-10">
            Không tìm thấy bài viết
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BlogDetail;
