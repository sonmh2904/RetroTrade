"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/common/dialog";
import { toast } from "sonner";
import {
  createPost,
  getAllCategories,
  getAllTags,
  type Category,
  type Tag,
} from "@/services/auth/blog.api";
import { Switch } from "@/components/ui/common/switch";
import { Label } from "@/components/ui/common/label";

interface AddBlogFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BlogFormData {
  title: string;
  shortDescription?: string;
  content: string;
  categoryId?: string;
  tags: string[];
  images: File[];
  isActive: boolean;
  isFeatured: boolean;
}

const AddBlogForm: React.FC<AddBlogFormProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState<BlogFormData>({
    title: "",
    shortDescription: "",
    content: "",
    categoryId: "",
    tags: [],
    images: [],
    isActive: true,
    isFeatured: false,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchTags();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const res = await getAllCategories();
      setCategories(res?.data || res || []);
    } catch {
      toast.error("Không thể tải danh mục");
    }
  };

  const fetchTags = async () => {
    try {
      const res = await getAllTags();
      setTags(res?.data || res || []);
    } catch {
      toast.error("Không thể tải thẻ tag");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setForm((prev) => ({
      ...prev,
      images: files ? Array.from(files) : [],
    }));
  };

  // 🏷️ Chọn tag
  const handleTagToggle = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter((id) => id !== tagId)
        : [...prev.tags, tagId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung!");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("shortDescription", form.shortDescription || "");
      formData.append("content", form.content);
      if (form.categoryId) formData.append("categoryId", form.categoryId);
      if (form.tags.length > 0)
        formData.append("tags", JSON.stringify(form.tags));
      formData.append("isActive", String(form.isActive));
      formData.append("isFeatured", String(form.isFeatured));
      form.images.forEach((file) => formData.append("images", file));

      const res = await createPost(formData);

      if (res && !res.error && res._id) {
        toast.success("Thêm bài viết thành công!");
        onSuccess?.();
        onClose();
        setForm({
          title: "",
          shortDescription: "",
          content: "",
          categoryId: "",
          tags: [],
          images: [],
          isActive: true,
          isFeatured: false,
        });
      } else {
        toast.error(res?.message || "Không thể thêm bài viết");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi thêm bài viết");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#6E8CFB] text-white border border-white/10">
        <DialogHeader>
          <DialogTitle>Thêm bài viết mới</DialogTitle>
          <DialogDescription className="text-white/60">
            Nhập thông tin bài viết đầy đủ để thêm vào hệ thống.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tiêu đề */}
          <div>
            <label className="block text-sm mb-1">Tiêu đề *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
            />
          </div>

          {/* Mô tả ngắn */}
          <div>
            <label className="block text-sm mb-1">Mô tả ngắn</label>
            <textarea
              name="shortDescription"
              value={form.shortDescription}
              onChange={handleChange}
              rows={2}
              className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
            />
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-sm mb-1">Nội dung *</label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={6}
              required
              className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
            />
          </div>

          {/* Danh mục */}
          <div>
            <label className="block text-sm mb-1">Danh mục</label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className="w-full p-2 rounded bg-[#4B66CC] text-white border border-white/20 focus:outline-none"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag */}
          <div>
            <label className="block text-sm mb-1">Thẻ (tags)</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  type="button"
                  key={tag._id}
                  onClick={() => handleTagToggle(tag._id)}
                  className={`px-3 py-1 rounded-full border ${
                    form.tags.includes(tag._id)
                      ? "bg-white text-[#6E8CFB]"
                      : "bg-transparent border-white/30 text-white"
                  }`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Ảnh bài viết */}
          <div>
            <label className="block text-sm mb-1">Ảnh bài viết</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-white"
            />
          </div>

          {/* Switch */}
          <div className="flex gap-4">
            <Label className="flex items-center gap-2">
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(checked: boolean) =>
                  setForm((prev) => ({ ...prev, isFeatured: checked }))
                }
              />
              Nổi bật
            </Label>
            <Label className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked: boolean) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
              Hiển thị
            </Label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-white text-[#6E8CFB] font-semibold rounded hover:bg-white/90 transition"
          >
            {loading ? "Đang thêm..." : "Thêm bài viết"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBlogForm;
