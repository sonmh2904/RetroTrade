"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getAllPosts, deletePost } from "@/services/auth/blog.api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/common/card";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Edit, Trash2, Eye, Search } from "lucide-react";
import BlogDetail from "@/components/ui/moderator/blog/blog-details";
import AddPostDialog from "@/components/ui/moderator/blog/add-blog-form";
import EditBlogForm from "@/components/ui/moderator/blog/edit-blog-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";

interface BlogPost {
  _id: string;
  title: string;
  isFeatured?: boolean;
  isActive?: boolean;
  createdAt: string;
  categoryId?: {
    name?: string;
  };
  tags?: Array<{
    _id: string;
    name: string;
  }>;
}

export function BlogManagementTable() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editBlogId, setEditBlogId] = useState<string | null>(null); 
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteBlog, setDeleteBlog] = useState<BlogPost | null>(null);


  const fetchPosts = async () => {
    try {
      setLoading(true); 
      const res = await getAllPosts(1, 20);
      setPosts(Array.isArray(res) ? res : res?.data || []);
    } catch {
      toast.error("Không thể tải danh sách bài viết!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);



  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase())
  );
  const handleEditClick = (id: string) => {
    setEditBlogId(id);
    setOpenEdit(true);
  };

 
  const handleCloseEdit = () => {
    setOpenEdit(false);
    setEditBlogId(null);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    try {
      await deletePost(id);
      toast.success("Xóa bài viết thành công!");
      fetchPosts();
    } catch {
      toast.error("Không thể xóa bài viết. Vui lòng thử lại.");
    }
  };


  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-gray-900">Quản lý bài viết</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm theo tiêu đề..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <Button
                className="bg-emerald-600 hover:bg-emerald-500"
                onClick={() => setOpenAdd(true)}
              >
                + Thêm bài viết
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tiêu đề</th>

                  <th className="px-4 py-3 text-left font-medium">Danh mục</th>
                  <th className="px-4 py-3 text-left font-medium">Thẻ</th>
                  <th className="px-4 py-3 text-center font-medium">Nổi bật</th>
                  <th className="px-4 py-3 text-center font-medium">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    Ngày tạo
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    Hành động
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-3 text-center text-gray-600"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((post) => (
                    <tr key={post._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate">
                        {post.title}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {post.categoryId?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {post.tags?.length
                          ? post.tags.map((tag) => tag.name).join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {post.isFeatured ? "⭐ Có" : "Không"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {post.isActive ? "Hoạt động" : "Ẩn"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {new Date(post.createdAt).toLocaleDateString("vi-VN")}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedBlogId(post._id);
                              setIsDetailOpen(true);
                            }}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            onClick={() => handleEditClick(post._id)}
                            className="text-emerald-600 hover:bg-emerald-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            onClick={() => {
                              setDeleteBlog(post);
                              setOpenDelete(true);
                            }}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-3 text-center text-gray-600 italic"
                    >
                      {query
                        ? `Không tìm thấy bài viết nào khớp với "${query}"`
                        : "Không có bài viết nào."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <BlogDetail
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        blogId={selectedBlogId}
      />
      <AddPostDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSuccess={() => {
          toast.success("Làm mới danh sách bài viết!");
          fetchPosts();
        }}
      />
      {openEdit && editBlogId && (
        <EditBlogForm
          open={openEdit}
          postId={editBlogId}
          onClose={handleCloseEdit}
          onSuccess={async () => {
            toast.success("Cập nhật bài viết thành công!");
            await fetchPosts(); 
          }}
        />
      )}
      {openDelete && deleteBlog && (
        <Dialog open={openDelete} onOpenChange={setOpenDelete}>
          <DialogContent className="bg-white border border-gray-200 text-gray-900">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Xóa bài viết
              </DialogTitle>
            </DialogHeader>

            <p>
              Bạn có chắc muốn xoá bài viết:{" "}
              <span className="font-semibold text-red-600">
                {deleteBlog.title}
              </span>
              ?
            </p>

            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setOpenDelete(false)}>
                Hủy
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-500"
                onClick={async () => {
                  await handleDelete(deleteBlog._id);
                  setOpenDelete(false);
                }}
              >
                Xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
 
}
