"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/common/card";
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
import { FolderOpen, Edit, Trash2, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/common/dialog";
import { Input } from "@/components/ui/common/input";
import { Textarea } from "@/components/ui/common/textarea";

import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/services/auth/blog.api";

type Category = {
  _id: string;
  name: string;
  description?: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export function CategoryManagementTable() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [openAdd, setOpenAdd] = useState<boolean>(false);
  const [openEdit, setOpenEdit] = useState<boolean>(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [search, setSearch] = useState<string>("");
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await getAllCategories();
      setCategories(res.data || res);
      console.log("✅ CategoryManagementTable rendered");

    } catch (error) {
      console.error("Lỗi khi tải danh mục:", error);
    }
  };

  const getStatusBadge = (isDeleted?: boolean) =>
    isDeleted ? (
      <Badge className="bg-gray-200 text-gray-700 border-gray-300">
        Đã xóa
      </Badge>
    ) : (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
        Hoạt động
      </Badge>
    );
const handleAddCategory = async (e : React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!formData.name.trim()) {
    toast.error("Vui lòng nhập tên danh mục");
    return;
  }

  try {
    const res = await createCategory(formData);
    if (res?.message && res.message.includes("tồn tại")) {
      toast.error(res.message);
      return;
    }

    toast.success("Thêm danh mục thành công!");
    await fetchCategories();
    setFormData({ name: "", description: "" });
    setOpenAdd(false);
  } catch (error : unknown) {
    const msg = (error as { message?: string; error?: string })?.message || (error as { error?: string })?.error || "Không thể thêm danh mục.";
    toast.error(msg);
    console.error(" Lỗi khi thêm danh mục:", error);
  }
};


const handleEditCategory = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!currentCategory?._id) return;

  try {
    const res = await updateCategory(currentCategory._id, formData);

    if (res?.message?.includes("tồn tại")) {
      toast.error(res.message);
      return;
    }

    toast.success("Cập nhật danh mục thành công!");
    await fetchCategories();
    setCurrentCategory(null);
    setOpenEdit(false);
  } catch (error: unknown) {
    const msg =
      (error as { message?: string })?.message ||
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      "Không thể cập nhật danh mục. Vui lòng thử lại.";

    if (
      msg.includes("tồn tại") ||
      msg.includes("duplicate") ||
      msg.includes("exists")
    ) {
      toast.error("Tên danh mục đã tồn tại. Vui lòng chọn tên khác.");
    } else {
      toast.error(msg);
    }

    console.error("Lỗi khi cập nhật danh mục:", error);
  }
};

const confirmDelete = async () => {
  if (!deleteId) return;
  try {
    await deleteCategory(deleteId);
    toast.success("Xóa danh mục thành công!");
    setOpenDelete(false);
    setDeleteId(null);
    fetchCategories();
  } catch (error) {
    toast.error("Không thể xóa danh mục!");
    console.error(error);
  }
};



  const openEditDialog = (category: Category) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setOpenEdit(true);
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <FolderOpen className="w-5 h-5" />
            Quản lý danh mục
          </CardTitle>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
              <Input
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/20 text-white placeholder-white/40 w-56"
              />
            </div>

            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setOpenAdd(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm danh mục
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20">
                <TableHead className="text-white/70">Tên danh mục</TableHead>
                <TableHead className="text-white/70">Mô tả</TableHead>
                <TableHead className="text-white/70">Trạng thái</TableHead>
                <TableHead className="text-white/70">Ngày tạo</TableHead>
                <TableHead className="text-white/70 text-left">
                  Hành động
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category._id} className="border-white/20">
                  <TableCell className="text-white font-medium">
                    {category.name}
                  </TableCell>
                  <TableCell className="text-white/70">
                    {category.description || "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(category.isDeleted)}</TableCell>
                  <TableCell className="text-white/70">
                    {new Date(category.createdAt).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => openEditDialog(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          setDeleteId(category._id);
                          setOpenDelete(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog thêm danh mục */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="bg-white/10 backdrop-blur-md border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Thêm danh mục mới</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCategory} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm mb-1">Tên danh mục</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Nhập tên danh mục..."
                className="bg-white/5 border-white/20 text-white placeholder-white/40"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Mô tả</label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Nhập mô tả (tùy chọn)..."
                className="bg-white/5 border-white/20 text-white placeholder-white/40"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenAdd(false)}
                className="text-gray-300 hover:bg-white/10"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog sửa danh mục */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="bg-white/10 backdrop-blur-md border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Cập nhật danh mục</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditCategory} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm mb-1">Tên danh mục</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Nhập tên danh mục..."
                className="bg-white/5 border-white/20 text-white placeholder-white/40"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Mô tả</label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Nhập mô tả..."
                className="bg-white/5 border-white/20 text-white placeholder-white/40"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenEdit(false)}
                className="text-gray-300 hover:bg-white/10"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Cập nhật
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
     
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="bg-white/10 backdrop-blur-md border-white/20 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">
              Xóa danh mục?
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-3 py-3">
            <img
              src="https://cdn-icons-png.flaticon.com/512/463/463612.png"
              alt="warning"
              className="w-20 opacity-90"
            />
            <p className="text-center text-white/80">
              Hành động này sẽ{" "}
              <span className="text-red-400 font-semibold">xóa vĩnh viễn</span>{" "}
              danh mục.
            </p>
          </div>

          <DialogFooter className="justify-center gap-3">
            <Button
              variant="ghost"
              className="text-gray-300 hover:bg-white/10"
              onClick={() => setOpenDelete(false)}
            >
              Hủy
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
