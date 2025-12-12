import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Edit,
  Trash2,
  Plus,
  FileText,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Key,
  Lock,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  Users,
  Globe,
  Database,
  Settings,
  Info,
  HelpCircle,
  Zap,
  Star,
  Search,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllPrivacyTypes,
  createPrivacyType,
  updatePrivacyType,
  deletePrivacyType,
} from "@/services/privacy/privacy.api";
import { PrivacyTypes } from "@/services/privacy/privacy.api";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface TypeFormModalProps {
  isOpen: boolean;
  type?: PrivacyTypes | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  type: PrivacyTypes;
  onClose: () => void;
  onConfirm: () => void;
}

interface IconOption {
  value: string;
  icon: LucideIcon;
}

const availableIcons: IconOption[] = [
  { value: "FileText", icon: FileText },
  { value: "Shield", icon: Shield },
  { value: "Clock", icon: Clock },
  { value: "AlertCircle", icon: AlertCircle },
  { value: "CheckCircle", icon: CheckCircle },
  { value: "User", icon: User },
  { value: "Key", icon: Key },
  { value: "Lock", icon: Lock },
  { value: "Mail", icon: Mail },
  { value: "Phone", icon: Phone },
  { value: "MapPin", icon: MapPin },
  { value: "CreditCard", icon: CreditCard },
  { value: "DollarSign", icon: DollarSign },
  { value: "Users", icon: Users },
  { value: "Globe", icon: Globe },
  { value: "Database", icon: Database },
  { value: "Settings", icon: Settings },
  { value: "Info", icon: Info },
  { value: "HelpCircle", icon: HelpCircle },
  { value: "Zap", icon: Zap },
  { value: "Star", icon: Star },
];

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

function TypeFormModal({
  isOpen,
  type,
  onClose,
  onSuccess,
}: TypeFormModalProps) {
  const isEditing = !!type;
  const [formData, setFormData] = useState({
    displayName: "",
    iconKey: "FileText",
    description: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);

  useEffect(() => {
    if (type) {
      setFormData({
        displayName: type.displayName,
        iconKey: type.iconKey,
        description: type.description || "",
        isActive: type.isActive,
      });
    } else {
      setFormData({
        displayName: "",
        iconKey: "FileText",
        description: "",
        isActive: true,
      });
    }
  }, [type]);

  const handleDisplayNameChange = (value: string) => {
    setFormData((prev) => ({ ...prev, displayName: value }));
  };

  const handleSubmit = async () => {
    if (!formData.displayName?.trim() || !formData.iconKey?.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    try {
      setLoading(true);
      let response: Response;
      if (isEditing) {
        response = await updatePrivacyType(
          type!._id,
          formData.displayName,
          formData.iconKey,
          formData.description?.trim() || undefined,
          formData.isActive
        );
      } else {
        response = await createPrivacyType(
          formData.displayName,
          formData.iconKey,
          formData.description?.trim() || undefined
        );
      }
      if (response.ok) {
        toast.success(isEditing ? "Cập nhật thành công" : "Tạo mới thành công");
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Thao tác thất bại");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const handleIconChange = (value: string) => {
    setFormData((prev) => ({ ...prev, iconKey: value }));
    setIconOpen(false);
  };

  const SelectedIconComponent =
    availableIcons.find((i) => i.value === formData.iconKey)?.icon || FileText;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <>
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {isEditing ? "Chỉnh sửa loại" : "Tạo loại mới"}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Icon & Display Name */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Icon & Tên hiển thị *
                </label>
                <div className="flex gap-3 items-center">
                  {/* FIXED: Dropdown không bay nữa */}
                  <div className="relative">
                    <button
                      onClick={() => setIconOpen(!iconOpen)}
                      type="button"
                      className="w-12 h-12 border-2 border-slate-200 rounded-xl flex items-center justify-center bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                    >
                      <SelectedIconComponent className="w-6 h-6 text-indigo-600" />
                    </button>

                    {/* Dropdown icon - giờ nằm đúng chỗ */}
                    {iconOpen && (
                      <div className="absolute top-14 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-5 gap-2 min-w-[280px]">
                        {availableIcons.map((iconOption) => {
                          const OptionIcon = iconOption.icon;
                          return (
                            <button
                              key={iconOption.value}
                              onClick={() => handleIconChange(iconOption.value)}
                              type="button"
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                                formData.iconKey === iconOption.value
                                  ? "bg-indigo-100 text-indigo-600"
                                  : "hover:bg-slate-100 text-slate-600"
                              }`}
                            >
                              <OptionIcon className="w-5 h-5" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Nhập tên hiển thị..."
                    value={formData.displayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    className="flex-1 h-12 px-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  placeholder="Mô tả ngắn gọn về loại chính sách này..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Trạng thái - chỉ hiện khi chỉnh sửa */}
              {isEditing && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Trạng thái</p>
                      <p className="text-xs text-slate-500">
                        Kích hoạt loại này
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 px-6 pb-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 h-11 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !formData.displayName.trim()}
                className="px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </div>
                ) : (
                  <span>{isEditing ? "Cập nhật" : "Tạo mới"}</span>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}

function DeleteConfirmModal({
  isOpen,
  type,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!isOpen || !type) return null;

  const isDeactivating = type.isActive;
  const title = isDeactivating
    ? "Xóa loại chính sách"
    : "Kích hoạt lại loại chính sách";
  const body = isDeactivating
    ? `Bạn có chắc chắn muốn xóa loại "${type.displayName}"? Hành động này sẽ vô hiệu hóa tất cả các chính sách liên quan đến loại này.`
    : `Bạn có chắc chắn muốn kích hoạt lại loại "${type.displayName}"?`;
  const buttonText = isDeactivating ? "Xóa loại này" : "Kích hoạt lại";
  const buttonClass = isDeactivating
    ? "bg-red-600 hover:bg-red-700"
    : "bg-green-600 hover:bg-green-700";

  return (
    <AnimatePresence>
      <>
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-md w-full"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200 flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isDeactivating
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-600"
                }`}
              >
                {isDeactivating ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {title}
                </h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 leading-relaxed">{body}</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 px-6 pb-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 h-11 border-2 border-slate-200 rounded-xl hover:bg-slate-50 font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-6 h-11 text-white rounded-xl font-medium transition-colors ${buttonClass}`}
              >
                {buttonText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}

export default function AdminPrivacyTypesPage() {
  const [typesList, setTypesList] = useState<PrivacyTypes[]>([]);
  const [selectedType, setSelectedType] = useState<PrivacyTypes | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingType, setDeletingType] = useState<PrivacyTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const data = await getAllPrivacyTypes();
      setTypesList(data);
    } catch (error) {
      console.error("Fetch types error:", error);
      toast.error("Lỗi tải danh sách loại chính sách");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (typeData: PrivacyTypes) => {
    setSelectedType(typeData);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (type: PrivacyTypes) => {
    setDeletingType(type);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingType) return;
    try {
      const response = await deletePrivacyType(deletingType._id);
      if (response.ok) {
        toast.success("Thao tác thành công");
        fetchTypes();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Thao tác thất bại");
      }
    } catch {
      toast.error("Lỗi khi thực hiện");
    } finally {
      setShowDeleteModal(false);
      setDeletingType(null);
    }
  };

  const handleCreateSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedType(null);
    fetchTypes();
  };

  const filteredTypes = typesList.filter((type) =>
    type.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/privacy">
                <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Quản Lý Loại Chính Sách
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {typesList.length} loại chính sách
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedType(null);
                setIsEditModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-11 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Tạo Mới
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              placeholder="Tìm kiếm theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 h-12 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Types Grid - GIỮ NGUYÊN 100% NHƯ CŨ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredTypes.map((typeItem, index) => {
              const IconComponent =
                availableIcons.find((i) => i.value === typeItem.iconKey)
                  ?.icon || FileText;
              return (
                <motion.div
                  key={typeItem._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow group flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <IconComponent className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {typeItem.displayName}
                        </h3>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        typeItem.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {typeItem.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="flex-1 mb-4">
                    {typeItem.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {typeItem.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-100 mt-auto">
                    <button
                      onClick={() => handleEdit(typeItem)}
                      className="flex-1 h-9 border-2 border-slate-200 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1 font-medium text-sm transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDeleteClick(typeItem)}
                      className="h-9 w-9 bg-red-50 text-red-600 hover:bg-red-100 border-2 border-red-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State - giữ nguyên */}
        {filteredTypes.length === 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Không tìm thấy kết quả
            </h3>
            <p className="text-slate-500">
              Thử tìm kiếm với từ khóa khác hoặc{" "}
              <button
                onClick={() => {
                  setSelectedType(null);
                  setIsEditModalOpen(true);
                }}
                className="text-indigo-600 hover:underline font-medium"
              >
                tạo loại mới
              </button>
            </p>
          </div>
        )}
      </div>

      <TypeFormModal
        isOpen={isEditModalOpen}
        type={selectedType}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedType(null);
        }}
        onSuccess={handleCreateSuccess}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        type={deletingType!}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingType(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
