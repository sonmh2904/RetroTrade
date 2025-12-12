"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/common/card";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import {
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
} from "@/services/auth/blog.api";

import { Search, Plus, Edit, Trash, Tag as TagIcon } from "lucide-react";

type Tag = {
  _id: string;
  name: string;
  createdAt: string;
};

export function TagManagementTable() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Modal states
  const [showDelete, setShowDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState("");

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await getAllTags();
      setTags(res);
    } catch (err) {
      console.error("Failed to load tags:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      toast.warning("Vui lòng nhập tên tag");
      return;
    }
    try {
      await createTag({ name: newTag });
      setNewTag("");
      fetchTags();
    } catch (err) {
      console.error("Failed to create tag:", err);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditTag(tag);
    setEditName(tag.name);
  };

  const confirmEdit = async () => {
    if (!editTag) return;
    try {
      await updateTag(editTag._id, { name: editName });
      setEditTag(null);
      fetchTags();
    } catch (err) {
      console.error("Failed to update tag:", err);
    }
  };

  const askDelete = (id: string) => {
    setDeleteId(id);
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTag(deleteId);
      setDeleteId(null);
      setShowDelete(false);
      fetchTags();
    } catch (err) {
      console.error("Failed to delete tag:", err);
    }
  };

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-gray-900">Quản lý Tag</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm tag..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <Input
                placeholder="Thêm tag mới..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 w-50"
              />
              <Button
                onClick={handleAddTag}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <Plus className="w-4 h-4 mr-1" />
                Thêm
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-gray-600 text-center py-4">
              Đang tải dữ liệu...
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Tên</th>
                    <th className="px-4 py-3 text-left font-medium">Tạo lúc</th>
                    <th className="px-4 py-3 text-center font-medium">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((tag) => (
                    <tr key={tag._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{tag.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(tag.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => handleEdit(tag)}
                            className="text-emerald-600 hover:bg-emerald-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => askDelete(tag._id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-3 text-center text-gray-600 italic"
                      >
                        Không có tag nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      
      {showDelete && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-96 shadow-lg">
            <div className="flex flex-col items-center text-gray-900 text-center">
              <Trash className="w-10 h-10 text-red-600 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Xóa Tag?</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Hành động này sẽ xóa vĩnh viễn tag đã chọn và không thể hoàn
                tác.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowDelete(false)}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Xóa
              </Button>
            </div>
          </div>
        </div>
      )}

     
      {editTag && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-96 shadow-lg">
            <div className="flex flex-col items-center text-gray-900 text-center">
              <TagIcon className="w-10 h-10 text-emerald-600 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Chỉnh sửa tên tag</h3>
            </div>

            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-4"
            />

            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => setEditTag(null)}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </Button>
              <Button
                onClick={confirmEdit}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Lưu
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
