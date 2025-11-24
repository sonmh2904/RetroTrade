"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getBlogDetail, updatePost } from "@/services/auth/blog.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Textarea } from "@/components/ui/common/textarea";
import { Label } from "@/components/ui/common/label";
import { X } from "lucide-react";

interface EditBlogFormProps {
  blogId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditBlogForm({ blogId, isOpen, onClose, onSuccess }: EditBlogFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen && blogId) {
      fetchBlog();
    }
  }, [isOpen, blogId]);

  const fetchBlog = async () => {
    try {
      setFetching(true);
      const blog = await getBlogDetail(blogId);
      setFormData({
        title: blog.title || "",
        content: blog.content || "",
        excerpt: blog.excerpt || "",
      });
    } catch (error) {
      toast.error("Không thể tải thông tin bài viết!");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await updatePost(blogId, formData);
      toast.success("Cập nhật bài viết thành công!");
      onSuccess();
    } catch (error) {
      toast.error("Không thể cập nhật bài viết!");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ title: "", content: "", excerpt: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Chỉnh sửa bài viết</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {fetching ? (
          <div className="text-center py-8">
            <div className="text-white/70">Đang tải...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Tiêu đề</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Nhập tiêu đề bài viết..."
                required
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Tóm tắt</Label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Nhập tóm tắt bài viết..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Nội dung</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Nhập nội dung bài viết..."
                rows={10}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="text-slate-300 hover:bg-slate-800"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {loading ? "Đang cập nhật..." : "Cập nhật bài viết"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
