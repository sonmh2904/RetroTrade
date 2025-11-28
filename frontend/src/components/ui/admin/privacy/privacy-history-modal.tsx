import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Eye,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  AlertTriangle,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/common/button";
import { Badge } from "@/components/ui/common/badge";
import { Input } from "@/components/ui/common/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/common/table";
import { Privacy } from "@/services/privacy/privacy.api";
import {
  deletePrivacy,
  togglePrivacyActive,
} from "@/services/privacy/privacy.api";
import { toast } from "sonner";

interface PrivacyHistoryModalProps {
  data: Privacy[];
  onView: (privacy: Privacy) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onClose: () => void;
}

type SortOrder = "asc" | "desc";

export function PrivacyHistoryModal({
  data,
  onView,
  onDelete,
  onToggle,
  onClose,
}: PrivacyHistoryModalProps) {
  const [filteredPrivacy, setFilteredPrivacy] = useState<Privacy[]>(data);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    privacyId: string;
    privacyTitle: string;
  }>({ show: false, privacyId: "", privacyTitle: "" });
  const [toggleConfirm, setToggleConfirm] = useState<{
    show: boolean;
    privacyId: string;
    privacyTitle: string;
    toActive: boolean;
  }>({ show: false, privacyId: "", privacyTitle: "", toActive: false });

  useEffect(() => {
    const filtered = data.filter(
      (p) =>
        p.typeId?.displayName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        p.version.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      if (aDate < bDate) return sortOrder === "asc" ? -1 : 1;
      if (aDate > bDate) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredPrivacy(sorted);
    setCurrentPage(1);
  }, [searchTerm, data, sortOrder]);

  const totalPages = Math.ceil(filteredPrivacy.length / itemsPerPage);
  const paginatedPrivacy = filteredPrivacy.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSortToggle = (): void => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const handlePageChange = (newPage: number): void => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      const response = await deletePrivacy(id);

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success) {
          toast.success("Chính sách đã được xóa thành công");
          onDelete(id);
        } else {
          toast.error(responseData.message || "Xóa thất bại");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Xóa thất bại");
      }
    } catch {
      toast.error("Lỗi khi xóa chính sách");
    } finally {
      setDeleteConfirm({ show: false, privacyId: "", privacyTitle: "" });
    }
  };

  const handleToggle = async (
    id: string,
    currentIsActive: boolean
  ): Promise<void> => {
    const privacyItem = filteredPrivacy.find((p) => p._id === id);
    if (!privacyItem) return;

    try {
      const toActive = !currentIsActive;
      const response = await togglePrivacyActive(id);

      if (response.ok) {
        const responseData = await response.json();
        toast.success(
          responseData.message ||
            (toActive ? "Đã bật active thành công" : "Đã tắt active thành công")
        );

        // Update state: Set this to active, deactivate others with same typeId
        setFilteredPrivacy((prev) =>
          prev.map((p) => ({
            ...p,
            isActive:
              p._id === id
                ? toActive
                : p.typeId === privacyItem.typeId
                ? false
                : p.isActive,
          }))
        );

        onToggle(id, toActive);

        if (!toActive) {
          onDelete(id);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Toggle thất bại");
      }
    } catch {
      toast.error("Lỗi khi toggle chính sách");
    } finally {
      setToggleConfirm({
        show: false,
        privacyId: "",
        privacyTitle: "",
        toActive: false,
      });
    }
  };

  const showDeleteConfirm = (privacy: Privacy): void => {
    setDeleteConfirm({
      show: true,
      privacyId: privacy._id,
      privacyTitle: privacy.typeId?.displayName || privacy.version,
    });
  };

  const showToggleConfirm = (privacy: Privacy, toActive: boolean): void => {
    setToggleConfirm({
      show: true,
      privacyId: privacy._id,
      privacyTitle: privacy.typeId?.displayName || privacy.version,
      toActive,
    });
  };

  const handleCancelToggle = () => {
    setToggleConfirm({
      show: false,
      privacyId: "",
      privacyTitle: "",
      toActive: false,
    });
  };

  const renderViewButton = (privacy: Privacy) => (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        onView(privacy);
        onClose();
      }}
      className="gap-1 border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400"
    >
      <Eye className="w-3 h-3" />
      Xem
    </Button>
  );

  const renderDeleteButton = (privacy: Privacy) => (
    <Button
      size="sm"
      variant="destructive"
      onClick={() => showDeleteConfirm(privacy)}
      className="gap-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
    >
      <Trash2 className="w-3 h-3" />
      Xóa
    </Button>
  );

  const renderToggleButton = (privacy: Privacy) => {
    const handleLocalToggle = () => {
      showToggleConfirm(privacy, !privacy.isActive);
    };

    return (
      <button
        onClick={handleLocalToggle}
        className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
          privacy.isActive
            ? "bg-red-50 text-red-600 hover:bg-red-100 border-2 border-red-200"
            : "bg-green-50 text-green-600 hover:bg-green-100 border-2 border-green-200"
        }`}
      >
        <Power className="w-4 h-4" />
      </button>
    );
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={handleOverlayClick}
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Lịch Sử Chính Sách Bảo Mật
              </h2>
              <Button variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm theo loại hoặc phiên bản..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSortToggle}
                    className="gap-2 border-gray-300 hover:bg-blue-50 hover:border-blue-400"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    Sắp xếp
                    <Badge className="ml-1 bg-blue-500">
                      {sortOrder === "desc" ? "Mới nhất" : "Cũ nhất"}
                    </Badge>
                  </Button>
                </div>
              </div>
              <div className="overflow-auto flex-1">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0">
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="font-semibold text-gray-700">
                        Phiên Bản
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Loại Chính Sách
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Số Phần
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Tác Giả
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Ngày Tạo
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Trạng Thái
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Hành Động
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="overflow-y-auto">
                    <AnimatePresence>
                      {filteredPrivacy.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center">
                              <Search className="w-8 h-8 text-gray-400 mb-3" />
                              <p className="text-gray-500 font-medium">
                                Không tìm thấy kết quả
                              </p>
                              <p className="text-gray-400 text-sm">
                                Chưa có phiên bản không hoạt động.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedPrivacy.map((privacy) => (
                          <motion.tr
                            key={privacy._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-100"
                          >
                            <TableCell className="font-medium text-gray-900">
                              {privacy.version}
                            </TableCell>
                            <TableCell className="text-gray-600 max-w-xs truncate">
                              {privacy.typeId?.displayName || "N/A"}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {privacy.sections?.length || 0}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {privacy.createdBy?.fullName || "Admin"}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">
                              {new Date(privacy.createdAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className="bg-gradient-to-r from-red-500 to-red-700 text-white"
                                variant={
                                  privacy.isActive ? "default" : "secondary"
                                }
                              >
                                {privacy.isActive
                                  ? "Hoạt động"
                                  : "Không hoạt động"}
                              </Badge>
                            </TableCell>
                            <TableCell className="flex gap-2">
                              {renderViewButton(privacy)}
                              {renderToggleButton(privacy)}
                              {renderDeleteButton(privacy)}
                            </TableCell>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-t border-gray-200">
                  <div className="text-sm text-gray-700 font-medium">
                    Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredPrivacy.length
                    )}{" "}
                    của {filteredPrivacy.length} kết quả
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="border-blue-300 hover:bg-blue-100 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium px-4 py-2 bg-white border-2 border-blue-200 rounded-lg">
                      Trang {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="border-blue-300 hover:bg-blue-100 disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Đóng
              </Button>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
              {deleteConfirm.show && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60"
                    onClick={() =>
                      setDeleteConfirm({
                        show: false,
                        privacyId: "",
                        privacyTitle: "",
                      })
                    }
                  />
                  <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-none">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                      className="pointer-events-auto w-full max-w-md"
                    >
                      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="relative bg-gradient-to-br from-red-500 via-red-500 to-rose-600 p-6">
                          <div className="absolute inset-0 opacity-20">
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundImage:
                                  "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                                backgroundSize: "20px 20px",
                              }}
                            />
                          </div>
                          <div className="relative flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                              <AlertTriangle className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                Xác nhận xóa
                              </h3>
                              <p className="text-white/80 text-sm mt-1">
                                Hành động này không thể hoàn tác
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                show: false,
                                privacyId: "",
                                privacyTitle: "",
                              })
                            }
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <X className="w-5 h-5 text-white" />
                          </button>
                        </div>
                        <div className="p-6">
                          <p className="text-gray-700 mb-2">
                            Bạn có chắc chắn muốn xóa chính sách:
                          </p>
                          <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 mb-6">
                            <p className="font-semibold text-gray-900">
                              {deleteConfirm.privacyTitle}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">
                            Chính sách này sẽ bị xóa vĩnh viễn khỏi hệ thống.
                          </p>
                        </div>
                        <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setDeleteConfirm({
                                show: false,
                                privacyId: "",
                                privacyTitle: "",
                              })
                            }
                            className="flex-1 border-2 border-gray-300 hover:bg-gray-100 font-semibold"
                          >
                            Hủy bỏ
                          </Button>
                          <Button
                            onClick={() =>
                              handleDelete(deleteConfirm.privacyId)
                            }
                            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold shadow-lg"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Xóa ngay
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>

            {/* Toggle Confirmation Modal */}
            <AnimatePresence>
              {toggleConfirm.show && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60"
                    onClick={handleCancelToggle}
                  />
                  <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-none">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                      className="pointer-events-auto w-full max-w-md"
                    >
                      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="relative p-6 bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500">
                          <div className="absolute inset-0 opacity-20">
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundImage:
                                  "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                                backgroundSize: "20px 20px",
                              }}
                            />
                          </div>
                          <div className="relative flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                              <AlertTriangle className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                Xác nhận{" "}
                                {toggleConfirm.toActive ? "bật" : "tắt"} active
                              </h3>
                              <p className="text-white/80 text-sm mt-1">
                                Hành động này sẽ ảnh hưởng đến chính sách hiện
                                tại
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleCancelToggle}
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <X className="w-5 h-5 text-white" />
                          </button>
                        </div>
                        <div className="p-6">
                          <p className="text-gray-700 mb-2">
                            Bạn có chắc chắn muốn{" "}
                            {toggleConfirm.toActive ? "bật" : "tắt"} active cho
                            chính sách:
                          </p>
                          <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 mb-6">
                            <p className="font-semibold text-gray-900">
                              {toggleConfirm.privacyTitle}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">
                            {toggleConfirm.toActive
                              ? "Chính sách này sẽ có hiệu lực, và chính sách hiện tại sẽ bị tắt."
                              : "Chính sách này sẽ bị tắt active."}
                          </p>
                        </div>
                        <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
                          <Button
                            variant="outline"
                            onClick={handleCancelToggle}
                            className="flex-1 border-2 border-gray-300 hover:bg-gray-100 font-semibold"
                          >
                            Hủy bỏ
                          </Button>
                          <Button
                            onClick={() =>
                              handleToggle(
                                toggleConfirm.privacyId,
                                !toggleConfirm.toActive
                              )
                            }
                            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold shadow-lg"
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Xác nhận
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
