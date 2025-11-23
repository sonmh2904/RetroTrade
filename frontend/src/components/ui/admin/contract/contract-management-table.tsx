import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/common/button";
import { Card, CardHeader, CardContent } from "@/components/ui/common/card";
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
import {
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  Filter,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  getContractTemplates,
  deleteContractTemplate,
} from "@/services/contract/contract.api";
import { toast } from "sonner";

interface ContractTemplate {
  _id: string;
  templateName: string;
  description: string;
  headerContent: string;
  bodyContent: string;
  footerContent: string;
  isActive: boolean;
  createdBy: {
    fullName: string;
    email: string;
  };
  createdAt: string;
}

interface ContractManagementTableProps {
  onEdit: (template: ContractTemplate) => void;
}

type SortField = "templateName" | "createdAt" | "createdBy";
type SortOrder = "asc" | "desc";
type FilterStatus = "all" | "active" | "inactive";

export function ContractManagementTable({
  onEdit,
}: ContractManagementTableProps) {
  const [allTemplates, setAllTemplates] = useState<ContractTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<
    ContractTemplate[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [sortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showFilterMenu, setShowFilterMenu] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    templateId: string;
    templateName: string;
  }>({ show: false, templateId: "", templateName: "" });

  const fetchTemplates = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await getContractTemplates();
      if (response.ok) {
        const data = await response.json();
        setAllTemplates(data.templates || []);
        setFilteredTemplates(data.templates || []);
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.message || "Không thể tải danh sách mẫu hợp đồng"
        );
      }
    } catch {
      toast.error("Không thể tải danh sách mẫu hợp đồng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    let filtered = allTemplates.filter((template) =>
      template.templateName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter by status
    if (filterStatus === "active") {
      filtered = filtered.filter((t) => t.isActive);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((t) => !t.isActive);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === "templateName") {
        comparison = a.templateName.localeCompare(b.templateName);
      } else if (sortField === "createdAt") {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "createdBy") {
        const nameA = a.createdBy?.fullName || "Admin";
        const nameB = b.createdBy?.fullName || "Admin";
        comparison = nameA.localeCompare(nameB);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredTemplates(filtered);
    setCurrentPage(1);
  }, [searchTerm, allTemplates, sortField, sortOrder, filterStatus]);

  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
  const paginatedTemplates = filteredTemplates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async (id: string): Promise<void> => {
    try {
      const response = await deleteContractTemplate(id);
      if (response.ok) {
        toast.success("Mẫu hợp đồng đã được xóa thành công");
        await fetchTemplates();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Xóa thất bại");
      }
    } catch {
      toast.error("Lỗi khi xóa mẫu hợp đồng");
    } finally {
      setDeleteConfirm({ show: false, templateId: "", templateName: "" });
    }
  };

  const showDeleteConfirm = (template: ContractTemplate): void => {
    setDeleteConfirm({
      show: true,
      templateId: template._id,
      templateName: template.templateName,
    });
  };

  const handlePageChange = (newPage: number): void => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="pb-6 border-b border-gray-200">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên mẫu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="gap-2 border-gray-300 hover:bg-blue-50 hover:border-blue-400"
                >
                  <Filter className="w-4 h-4" />
                  Lọc
                  {filterStatus !== "all" && (
                    <Badge className="ml-1 bg-blue-500">1</Badge>
                  )}
                </Button>
                {showFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10"
                  >
                    <div className="text-xs font-semibold text-gray-500 px-2 py-1">
                      Trạng thái
                    </div>
                    {[
                      { value: "all", label: "Tất cả" },
                      { value: "active", label: "Hoạt động" },
                      { value: "inactive", label: "Không hoạt động" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilterStatus(option.value as FilterStatus);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-blue-50 transition-colors ${
                          filterStatus === option.value
                            ? "bg-blue-100 text-blue-700 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (sortOrder === "asc") {
                    setSortOrder("desc");
                  } else {
                    setSortOrder("asc");
                  }
                }}
                className="gap-2 border-gray-300 hover:bg-blue-50 hover:border-blue-400"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === "asc" ? "A-Z" : "Z-A"}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-4">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <TableRow className="border-b border-gray-200">
                    <TableHead className="font-semibold text-gray-700">
                      Tên mẫu
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Mô tả
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Trạng thái
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Tác giả
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Ngày tạo
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Hành động
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {paginatedTemplates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                              <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">
                              Không tìm thấy kết quả
                            </p>
                            <p className="text-gray-400 text-sm">
                              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTemplates.map((template) => (
                        <motion.tr
                          key={template._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-100"
                        >
                          <TableCell className="font-medium text-gray-900">
                            {template.templateName}
                          </TableCell>
                          <TableCell className="text-gray-600 max-w-xs truncate">
                            {template.description || "Không có"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                template.isActive
                                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                  : "bg-gray-300 text-gray-700"
                              }
                            >
                              {template.isActive
                                ? "Hoạt động"
                                : "Không hoạt động"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {template.createdBy?.fullName || "Admin"}
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {new Date(template.createdAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </TableCell>
                          <TableCell className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit(template)}
                              className="gap-1 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
                            >
                              <Edit className="w-3 h-3" />
                              Sửa
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => showDeleteConfirm(template)}
                              className="gap-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                            >
                              <Trash2 className="w-3 h-3" />
                              Xóa
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-6 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-t border-gray-200">
              <div className="text-sm text-gray-700 font-medium">
                Hiển thị{" "}
                {paginatedTemplates.length > 0
                  ? (currentPage - 1) * itemsPerPage + 1
                  : 0}{" "}
                -{" "}
                {Math.min(currentPage * itemsPerPage, filteredTemplates.length)}{" "}
                của {filteredTemplates.length} kết quả
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || totalPages === 0}
                  className="border-blue-300 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium px-4 py-2 bg-white border-2 border-blue-200 rounded-lg shadow-sm">
                  Trang {totalPages === 0 ? 0 : currentPage} /{" "}
                  {totalPages === 0 ? 1 : totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="border-blue-300 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-sm border-2 border-blue-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                >
                  <option value={5}>5 / trang</option>
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.show && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() =>
                setDeleteConfirm({
                  show: false,
                  templateId: "",
                  templateName: "",
                })
              }
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
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
                  {/* Header */}
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
                          templateId: "",
                          templateName: "",
                        })
                      }
                      className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <p className="text-gray-700 mb-2">
                      Bạn có chắc chắn muốn xóa mẫu hợp đồng:
                    </p>
                    <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 mb-6">
                      <p className="font-semibold text-gray-900">
                        {deleteConfirm.templateName}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      Mẫu hợp đồng này sẽ bị xóa vĩnh viễn khỏi hệ thống.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setDeleteConfirm({
                          show: false,
                          templateId: "",
                          templateName: "",
                        })
                      }
                      className="flex-1 border-2 border-gray-300 hover:bg-gray-100 font-semibold"
                    >
                      Hủy bỏ
                    </Button>
                    <Button
                      onClick={() => handleDelete(deleteConfirm.templateId)}
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
    </Card>
  );
}
