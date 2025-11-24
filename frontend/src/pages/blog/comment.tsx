"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { decodeToken, type DecodedToken } from '@/utils/jwtHelper';
import type { RootState } from "@/store/redux_store";
import {
  getCommentsByPost,
  addComment,
  deleteCommentByUser,
  updateCommentByUser,
} from "@/services/auth/blog.api";
import { MoreHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/common/dropdown-menu";
interface CommentSectionProps {
  postId: string;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");

  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const isLoggedIn = !!accessToken;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const decoded = decodeToken(accessToken);
  const currentUserId = decoded?._id || null;

  const fetchComments = async () => {
    const res = await getCommentsByPost(postId);
    setComments(Array.isArray(res) ? res : []);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!isLoggedIn) {
      alert("Vui lòng đăng nhập để bình luận!");
      return;
    }

    const res = await addComment(postId, { content: newComment });
    if (res && res._id) {
      setComments([res, ...comments]);
      setNewComment("");
    }
    await fetchComments();
  };

const openDeleteModal = (id: string) => {
  setCommentToDelete(id);
  setIsDeleteModalOpen(true);
};

const confirmDelete = async () => {
  if (!commentToDelete) return;
  try {
    const res = await deleteCommentByUser(commentToDelete);
    if (!res.error) {
      setComments(comments.filter((c) => c._id !== commentToDelete));
    }
  } catch (err) {
    alert("Xóa thất bại!");
  } finally {
    setIsDeleteModalOpen(false);
    setCommentToDelete(null);
  }
};

  const handleEdit = (comment: any) => {
    setEditingCommentId(comment._id);
    setEditContent(comment.content);
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    const res = await updateCommentByUser(id, { content: editContent });
    if (!res.error) {
      setComments(
        comments.map((c) => (c._id === id ? { ...c, content: editContent } : c))
      );
      setEditingCommentId(null);
      setEditContent("");
    }
  };

  useEffect(() => {
    if (postId) fetchComments();
  }, [postId]);

  return (
    <div className="mt-10">
      <h3 className="font-semibold mb-4 text-lg">
        Bình luận ({comments.length})
      </h3>

     
      {isLoggedIn ? (
        <div className="flex flex-col gap-2 mb-6">
          <textarea
            className="border rounded-lg p-2 w-full"
            placeholder="Viết bình luận..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            onClick={handleAddComment}
            className="self-end bg-[#6677ee] text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Gửi bình luận
          </button>
        </div>
      ) : (
        <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg p-3 mb-6">
          🔒 Bạn cần{" "}
          <a href="/auth/login" className="text-blue-600 underline">
            đăng nhập
          </a>{" "}
          để bình luận.
        </div>
      )}

      {/* Danh sách bình luận */}
      <ul className="space-y-4">
        {comments.map((c) => {
          const isOwner =
            currentUserId === c.userId?._id || currentUserId === c.userId?.id;

          return (
            <li key={c._id} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <img
                  src={c.userId?.avatarUrl || "/user.png"}
                  alt={c.userId?.fullName || "User"}
                  className="w-6 h-6 rounded-full"
                />
                <span className="font-medium">
                  {c.userId?.fullName || "Ẩn danh"}
                </span>
                <span className="text-xs text-gray-400">
                  • {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                </span>

                {/* Menu ba chấm */}
                {isOwner && editingCommentId !== c._id && (
                  <div className="ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-gray-500 hover:text-gray-700 p-1 rounded">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem
                          onClick={() => handleEdit(c)}
                          className="cursor-pointer hover:bg-gray-100"
                        >
                          ✏️ Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteModal(c._id)}
                          className="cursor-pointer text-red-500 hover:bg-gray-100"
                        >
                          🗑️ Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {editingCommentId === c._id ? (
                <div className="mt-2">
                  <textarea
                    className="border rounded-lg p-2 w-full text-sm"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2 justify-end">
                    <button
                      onClick={() => handleUpdate(c._id)}
                      className="bg-[#6677ee] text-white px-3 py-1 rounded hover:bg-blue-500"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditContent("");
                      }}
                      className="bg-gray-300 text-black px-3 py-1 rounded hover:bg-gray-400"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1">{c.content}</p>
              )}

              {/* Modal Xóa */}
              {isDeleteModalOpen && (
                <>
                  <div
                    className="fixed inset-0  backdrop-blur-sm z-50"
                    onClick={() => setIsDeleteModalOpen(false)}
                  />

                  {/* Modal chính */}
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                      className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Nút × đóng */}
                      <button
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <h3 className="text-xl font-semibold text-gray-900 pr-8">
                        Xóa bình luận
                      </h3>

                      <div className="mt-4 text-gray-600">
                        Bạn có chắc chắn muốn xóa bình luận này không? Hành động
                        này <strong>không thể hoàn tác</strong>.
                      </div>

                      <div className="mt-8 flex justify-end gap-3">
                        <button
                          onClick={() => setIsDeleteModalOpen(false)}
                          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={confirmDelete}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md transition"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
