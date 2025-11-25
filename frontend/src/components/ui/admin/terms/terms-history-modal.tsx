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
import { Terms } from "@/services/terms/terms.api";
import { deleteTerms, toggleTermsActive } from "@/services/terms/terms.api";
import { toast } from "sonner";

interface TermsHistoryModalProps {
  data: Terms[];
  onView: (terms: Terms) => void;
  onDelete: (id: string) => void;
  onToggle?: (id: string, isActive: boolean) => void;
  onClose: () => void;
}

type SortOrder = "asc" | "desc";


interface ToggleSwitchProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function ToggleSwitch({ isActive, onToggle, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full transition-all duration-200 ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
      style={{ width: "60px", height: "30px" }}
    >
      <div
        className={`w-full h-full rounded-full transition-colors duration-200 ${
          isActive ? "bg-green-500 shadow-lg" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 flex items-center justify-center text-xs font-bold ${
            isActive
              ? "translate-x-8 text-green-600"
              : "translate-x-0 text-gray-600"
          }`}
        >
          {isActive ? "ON" : "OFF"}
        </div>
      </div>
    </button>
  );
}

export function TermsHistoryModal({
  data,
  onView,
  onDelete,
  onToggle,
  onClose,
}: TermsHistoryModalProps) {
  const [filteredTerms, setFilteredTerms] = useState<Terms[]>(data);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    termsId: string;
    termsTitle: string;
  }>({ show: false, termsId: "", termsTitle: "" });
  const [toggleConfirm, setToggleConfirm] = useState<{
    show: boolean;
    termsId: string;
    termsTitle: string;
    toActive: boolean;
  }>({ show: false, termsId: "", termsTitle: "", toActive: false });

  useEffect(() => {
    const filtered = data.filter((t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      if (aDate < bDate) return sortOrder === "asc" ? -1 : 1;
      if (aDate > bDate) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredTerms(sorted);
    setCurrentPage(1);
  }, [searchTerm, data, sortOrder]);

  const totalPages = Math.ceil(filteredTerms.length / itemsPerPage);
  const paginatedTerms = filteredTerms.slice(
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
      const response = await deleteTerms(id);
      console.log("Delete response status:", response.status);
      const responseText = await response.text();
      console.log("Delete response text:", responseText);

      if (response.ok) {
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseErr) {
          console.error("JSON parse error:", parseErr);
          responseData = { success: true };
        }

        if (responseData.success) {
          toast.success("Điều khoản đã được xóa thành công");
          onDelete(id);
          setFilteredTerms((prev) => prev.filter((t) => t._id !== id));
        } else {
          toast.error(responseData.message || "Xóa thất bại");
        }
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: "Unknown server error" };
        }
        console.error("Delete error data:", errorData);
        toast.error(errorData.message || "Xóa thất bại");
      }
    } catch (error) {
      console.error("Delete catch error:", error);
      toast.error("Lỗi khi xóa điều khoản");
    } finally {
      setDeleteConfirm({ show: false, termsId: "", termsTitle: "" });
    }
  };

  const handleToggle = async (
    id: string,
    currentIsActive: boolean
  ): Promise<void> => {
    const terms = filteredTerms.find((t) => t._id === id);
    if (!terms) return;

    try {
      const toActive = !currentIsActive;
      const response = await toggleTermsActive(id);

      if (response.ok) {
        const responseData = await response.json();
        toast.success(
          responseData.message ||
            (toActive ? "Đã bật active thành công" : "Đã tắt active thành công")
        );

        // Cập nhật state local
        setFilteredTerms(
          (prev) =>
            prev
              .map(
                (t) =>
                  t._id === id
                    ? { ...t, isActive: toActive }
                    : { ...t, isActive: false }
              )
              .filter((t) => !t.isActive) // Giữ chỉ inactive trong history
        );

        // Callback nếu có
        onToggle?.(id, toActive);

        // Nếu tắt active, có thể cần refresh danh sách active ở nơi khác (qua onDelete hoặc event)
        if (!toActive) {
          onDelete?.(id); 
        }

        // Reload trang sau khi toggle thành công
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Toggle thất bại");
      }
    } catch {
      toast.error("Lỗi khi toggle điều khoản");
    } finally {
      setToggleConfirm({
        show: false,
        termsId: "",
        termsTitle: "",
        toActive: false,
      });
    }
  };

  const showDeleteConfirm = (terms: Terms): void => {
    setDeleteConfirm({
      show: true,
      termsId: terms._id,
      termsTitle: terms.title,
    });
  };

  const showToggleConfirm = (terms: Terms, toActive: boolean): void => {
    setToggleConfirm({
      show: true,
      termsId: terms._id,
      termsTitle: terms.title,
      toActive,
    });
  };

  const handleCancelToggle = () => {
    setToggleConfirm({
      show: false,
      termsId: "",
      termsTitle: "",
      toActive: false,
    });
  };

  const renderViewButton = (terms: Terms) => (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        onView(terms);
        onClose();
      }}
      className="gap-1 border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400"
    >
      <Eye className="w-3 h-3" />
      Xem
    </Button>
  );

  const renderDeleteButton = (terms: Terms) => (
    <Button
      size="sm"
      variant="destructive"
      onClick={() => showDeleteConfirm(terms)}
      className="gap-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
    >
      <Trash2 className="w-3 h-3" />
      Xóa
    </Button>
  );

  const renderToggleButton = (terms: Terms) => {
    const handleLocalToggle = () => {
      showToggleConfirm(terms, !terms.isActive);
    };

    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600">Active:</span>
        <ToggleSwitch
          isActive={terms.isActive || false}
          onToggle={handleLocalToggle}
          disabled={false}
        />
      </div>
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
                Lịch Sử Điều Khoản
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
                      placeholder="Tìm kiếm theo tiêu đề..."
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
                        Tiêu Đề
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
                      {filteredTerms.length === 0 ? (
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
                        paginatedTerms.map((terms) => (
                          <motion.tr
                            key={terms._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-100"
                          >
                            <TableCell className="font-medium text-gray-900">
                              {terms.version}
                            </TableCell>
                            <TableCell className="text-gray-600 max-w-xs truncate">
                              {terms.title}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {terms.sections?.length || 0}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {terms.createdBy?.fullName || "Admin"}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">
                              {new Date(terms.createdAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  terms.isActive ? "default" : "secondary"
                                }
                              >
                                {terms.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="flex gap-2">
                              {renderViewButton(terms)}
                              {renderToggleButton(terms)}
                              {renderDeleteButton(terms)}
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
                    {Math.min(currentPage * itemsPerPage, filteredTerms.length)}{" "}
                    của {filteredTerms.length} kết quả
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
                        termsId: "",
                        termsTitle: "",
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
                                termsId: "",
                                termsTitle: "",
                              })
                            }
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <X className="w-5 h-5 text-white" />
                          </button>
                        </div>
                        <div className="p-6">
                          <p className="text-gray-700 mb-2">
                            Bạn có chắc chắn muốn xóa điều khoản:
                          </p>
                          <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 mb-6">
                            <p className="font-semibold text-gray-900">
                              {deleteConfirm.termsTitle}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">
                            Điều khoản này sẽ bị xóa vĩnh viễn khỏi hệ thống.
                          </p>
                        </div>
                        <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setDeleteConfirm({
                                show: false,
                                termsId: "",
                                termsTitle: "",
                              })
                            }
                            className="flex-1 border-2 border-gray-300 hover:bg-gray-100 font-semibold"
                          >
                            Hủy bỏ
                          </Button>
                          <Button
                            onClick={() => handleDelete(deleteConfirm.termsId)}
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
                                Hành động này sẽ ảnh hưởng đến điều khoản hiện
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
                            điều khoản:
                          </p>
                          <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 mb-6">
                            <p className="font-semibold text-gray-900">
                              {toggleConfirm.termsTitle}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">
                            {toggleConfirm.toActive
                              ? "Điều khoản này sẽ có hiệu lực, và điều khoản hiện tại sẽ bị tắt."
                              : "Điều khoản này sẽ bị tắt active."}
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
                                toggleConfirm.termsId,
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
