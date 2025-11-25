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
import { FileText, Edit, Trash2, Eye, Search } from "lucide-react";
import BlogDetail from "@/components/ui/admin/blog/blog-details";
import AddPostDialog from "@/components/ui/admin/blog/add-blog-form";
import EditBlogForm from "@/components/ui/admin/blog/edit-blog-form";

interface BlogPost {
  _id: string;
  title: string;
  content: string;
  author?: {
    fullName: string;
  };
  createdAt: string;
  views?: number;
}

export  function BlogManagementTable() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editBlogId, setEditBlogId] = useState<string | null>(null); 

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

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    try {
      await deletePost(id);
      toast.success("Xóa bài viết thành công!");
      fetchPosts();
    } catch {
      toast.error("Không thể xóa bài viết!");
    }
  };

  const handleViewDetail = (id: string) => {
    setSelectedBlogId(id);
    setIsDetailOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditBlogId(id);
    setOpenEdit(true);
  };

  const filteredPosts = posts.filter((post) =>
    post.title?.toLowerCase().includes(query.toLowerCase()) ||
    post.content?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5" />
            Quản lý bài viết ({filteredPosts.length} bài viết)
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={() => setOpenAdd(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Thêm bài viết
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
          <Input
            type="text"
            placeholder="Tìm kiếm bài viết..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-white/50 focus:border-blue-500"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-white/70">Đang tải...</div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-white/30" />
              <p className="text-white/70">Không có bài viết nào</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div
                key={post._id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">{post.title}</h3>
                    <p className="text-white/70 text-sm mb-2 line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <span>Tác giả: {post.author?.fullName || 'Unknown'}</span>
                      <span>
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <span>Lượt xem: {post.views || 0}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-400 hover:bg-blue-500/10"
                      onClick={() => handleViewDetail(post._id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-yellow-400 hover:bg-yellow-500/10"
                      onClick={() => handleEdit(post._id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDelete(post._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Modals */}
      {isDetailOpen && selectedBlogId && (
        <BlogDetail
          blogId={selectedBlogId}
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedBlogId(null);
          }}
        />
      )}

      {openAdd && (
        <AddPostDialog
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          onSuccess={() => {
            setOpenAdd(false);
            fetchPosts();
          }}
        />
      )}

      {openEdit && editBlogId && (
        <EditBlogForm
          blogId={editBlogId}
          isOpen={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setEditBlogId(null);
          }}
          onSuccess={() => {
            setOpenEdit(false);
            setEditBlogId(null);
            fetchPosts();
          }}
        />
      )}
    </Card>
  );
}
