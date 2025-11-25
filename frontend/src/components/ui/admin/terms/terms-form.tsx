import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Textarea } from "@/components/ui/common/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/common/card";
import {
  Save,
  X,
  FileText,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Shield,
  Clock,
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
  ChevronDown,
} from "lucide-react";
import { createTerms, updateTerms } from "@/services/terms/terms.api";
import { toast } from "sonner";
import { Terms, TermsSection } from "@/services/terms/terms.api";
import type { LucideIcon } from "lucide-react";

interface TermsFormProps {
  isOpen: boolean;
  terms?: Terms | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface IconOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
} as const;

const availableIcons: IconOption[] = [
  { value: "FileText", label: "Tài liệu", icon: FileText },
  { value: "Shield", label: "Bảo mật", icon: Shield },
  { value: "Clock", label: "Thời gian", icon: Clock },
  { value: "AlertCircle", label: "Cảnh báo", icon: AlertCircle },
  { value: "CheckCircle", label: "Xác nhận", icon: CheckCircle },
  { value: "User", label: "Người dùng", icon: User },
  { value: "Key", label: "Khóa", icon: Key },
  { value: "Lock", label: "Khóa", icon: Lock },
  { value: "Mail", label: "Email", icon: Mail },
  { value: "Phone", label: "Điện thoại", icon: Phone },
  { value: "MapPin", label: "Vị trí", icon: MapPin },
  { value: "CreditCard", label: "Thẻ tín dụng", icon: CreditCard },
  { value: "DollarSign", label: "Tiền tệ", icon: DollarSign },
  { value: "Users", label: "Người dùng nhóm", icon: Users },
  { value: "Globe", label: "Toàn cầu", icon: Globe },
  { value: "Database", label: "Cơ sở dữ liệu", icon: Database },
  { value: "Settings", label: "Cài đặt", icon: Settings },
  { value: "Info", label: "Thông tin", icon: Info },
  { value: "HelpCircle", label: "Trợ giúp", icon: HelpCircle },
  { value: "Zap", label: "Tia sét", icon: Zap },
  { value: "Star", label: "Ngôi sao", icon: Star },
];

export function TermsForm({
  isOpen,
  terms,
  onClose,
  onSuccess,
}: TermsFormProps) {
  const isEditing = !!terms;
  const [formData, setFormData] = useState({
    version: "",
    title: "",
    sections: [] as TermsSection[],
    effectiveDate: "",
    changesSummary: "",
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return new Date().toISOString().split("T")[0];
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  };

  useEffect(() => {
    const initialData = {
      version: terms?.version || "",
      title: terms?.title || "",
      sections: terms?.sections || [
        { icon: "FileText", title: "", content: [""] },
      ],
      effectiveDate: formatDateForInput(terms?.effectiveDate),
      changesSummary: terms?.changesSummary || "",
    };
    setFormData(initialData);
    setValidationErrors({});
  }, [terms]);

  if (!isOpen) {
    return null;
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = "Tiêu đề là bắt buộc";
    }

    if (!isEditing && !formData.version.trim()) {
      errors.version = "Phiên bản là bắt buộc khi tạo mới";
    }

    if (!formData.effectiveDate) {
      errors.effectiveDate = "Ngày hiệu lực là bắt buộc";
    }

    let hasSectionErrors = false;
    formData.sections.forEach((s, index) => {
      if (!s.title.trim()) {
        errors[`section-${index}-title`] = "Tiêu đề phần là bắt buộc";
        hasSectionErrors = true;
      }
      if (s.content.some((c) => !c.trim())) {
        errors[`section-${index}-content`] = "Nội dung phần không được rỗng";
        hasSectionErrors = true;
      }
    });

    if (hasSectionErrors) {
      errors.sections = "Vui lòng kiểm tra các phần điều khoản";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addSection = () => {
    setFormData({
      ...formData,
      sections: [
        ...formData.sections,
        { icon: "FileText", title: "", content: [""] },
      ],
    });
  };

  const removeSection = (index: number) => {
    if (formData.sections.length <= 1) {
      toast.warning("Phải có ít nhất một phần");
      return;
    }
    const newSections = formData.sections.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      sections: newSections,
    });
  };

  const updateSection = (
    index: number,
    field: "icon" | "title",
    value: string
  ) => {
    const newSections = [...formData.sections];
    newSections[index][field] = value;
    setFormData({ ...formData, sections: newSections });
  };

  const addContentItem = (sectionIndex: number) => {
    const newSections = [...formData.sections];
    newSections[sectionIndex].content.push("");
    setFormData({ ...formData, sections: newSections });
  };

  const removeContentItem = (sectionIndex: number, contentIndex: number) => {
    const newSections = [...formData.sections];
    newSections[sectionIndex].content.splice(contentIndex, 1);
    if (newSections[sectionIndex].content.length === 0) {
      newSections[sectionIndex].content.push("");
    }
    setFormData({ ...formData, sections: newSections });
  };

  const updateContent = (
    sectionIndex: number,
    contentIndex: number,
    value: string
  ) => {
    const newSections = [...formData.sections];
    newSections[sectionIndex].content[contentIndex] = value;
    setFormData({ ...formData, sections: newSections });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      let response: Response;
      if (isEditing) {
        response = await updateTerms(
          formData.title,
          formData.sections,
          formData.effectiveDate,
          formData.changesSummary || null
        );
      } else {
        response = await createTerms(
          formData.version,
          formData.title,
          formData.sections,
          formData.effectiveDate,
          formData.changesSummary || null
        );
      }
      if (response.ok) {
        toast.success(isEditing ? "Cập nhật thành công" : "Tạo mới thành công");
        onSuccess();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Thao tác thất bại");
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error("Lỗi hệ thống: " + error.message);
      } else {
        toast.error("Lỗi hệ thống không xác định");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const IconSelect = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (val: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const selectedOption = availableIcons.find((i) => i.value === value) || availableIcons[0];
    const IconComp = selectedOption.icon;
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="border-gray-300 rounded px-3 py-2 w-32 text-sm flex items-center justify-between bg-white"
        >
          <div className="flex items-center gap-2">
            <IconComp className="w-4 h-4" />
            <span className="truncate">{selectedOption.label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full left-0 z-10 bg-white border rounded shadow-lg w-48 max-h-60 overflow-y-auto">
            {availableIcons.map((iconOption) => {
              const OptionIcon = iconOption.icon;
              return (
                <button
                  key={iconOption.value}
                  type="button"
                  onClick={() => {
                    onChange(iconOption.value);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                >
                  <OptionIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{iconOption.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
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
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <Card className="border-0 shadow-none bg-transparent w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-8 rounded-t-2xl flex-shrink-0">
              <div className="absolute inset-0 opacity-10">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
              </div>
              <div className="relative flex justify-between items-center">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                      <FileText className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold">
                      {isEditing ? "Cập nhật điều khoản" : "Tạo điều khoản mới"}
                    </CardTitle>
                  </div>
                  <p className="text-white/80 text-sm ml-14">
                    {isEditing
                      ? "Chỉnh sửa thông tin điều khoản hiện có"
                      : "Tạo mới một phiên bản điều khoản chuyên nghiệp"}
                  </p>
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  type="button"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>
            </CardHeader>
            <CardContent className="p-8 bg-white overflow-y-auto flex-1">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {!isEditing && (
                  <motion.div variants={itemVariants}>
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Phiên Bản <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.version}
                      onChange={(e) =>
                        setFormData({ ...formData, version: e.target.value })
                      }
                      className={`border-2 rounded-xl transition-all duration-200 text-base px-4 py-3 ${
                        validationErrors.version
                          ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                          : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                      }`}
                      placeholder="Nhập phiên bản (e.g., v1.0)"
                      required
                    />
                    {validationErrors.version && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.version}
                      </p>
                    )}
                  </motion.div>
                )}
                <motion.div variants={itemVariants}>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Tiêu Đề <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={`border-2 rounded-xl transition-all duration-200 text-base px-4 py-3 ${
                      validationErrors.title
                        ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                        : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                    }`}
                    placeholder="Nhập tiêu đề điều khoản"
                    required
                  />
                  {validationErrors.title && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.title}
                    </p>
                  )}
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Ngày Hiệu Lực <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        effectiveDate: e.target.value,
                      })
                    }
                    className={`border-2 rounded-xl transition-all duration-200 text-base px-4 py-3 ${
                      validationErrors.effectiveDate
                        ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                        : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                    }`}
                    required
                  />
                  {validationErrors.effectiveDate && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.effectiveDate}
                    </p>
                  )}
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Tóm Tắt Thay Đổi (tùy chọn)
                  </label>
                  <Textarea
                    value={formData.changesSummary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        changesSummary: e.target.value,
                      })
                    }
                    className="border-2 border-gray-200 focus:border-indigo-500 focus:ring-indigo-100 rounded-xl transition-all duration-200 text-base px-4 py-3 min-h-[100px]"
                    placeholder="Mô tả ngắn gọn các thay đổi (nếu có)"
                    rows={3}
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Các Phần Điều Khoản <span className="text-red-500">*</span>
                  </label>
                  {validationErrors.sections && (
                    <p className="text-sm text-red-600 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.sections}
                    </p>
                  )}
                  {formData.sections.map((section, sectionIndex) => (
                    <div
                      key={sectionIndex}
                      className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex gap-2 mb-3 items-center">
                        <IconSelect
                          value={section.icon}
                          onChange={(val) =>
                            updateSection(sectionIndex, "icon", val)
                          }
                        />
                        <Input
                          value={section.title}
                          onChange={(e) =>
                            updateSection(sectionIndex, "title", e.target.value)
                          }
                          placeholder="Tiêu đề phần (e.g., Quyền và Trách nhiệm)"
                          className="flex-1 text-sm"
                          required
                        />
                        {formData.sections.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSection(sectionIndex)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {section.content.map((item, contentIndex) => (
                        <div key={contentIndex} className="flex gap-2 mb-2">
                          <Input
                            value={item}
                            onChange={(e) =>
                              updateContent(
                                sectionIndex,
                                contentIndex,
                                e.target.value
                              )
                            }
                            placeholder={`Nội dung bullet ${
                              contentIndex + 1
                            } (e.g., • Người dùng phải... )`}
                            className="flex-1 text-sm"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeContentItem(sectionIndex, contentIndex)
                            }
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            Xóa
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addContentItem(sectionIndex)}
                        className="text-indigo-600 hover:text-indigo-700 mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Thêm bullet
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSection}
                    className="mt-2 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm phần mới
                  </Button>
                </motion.div>
                <motion.div
                  variants={itemVariants}
                  className="flex justify-end gap-3 pt-6 border-t-2 border-gray-100"
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-xl font-semibold transition-all duration-200"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang lưu...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        {isEditing ? "Cập nhật" : "Tạo mới"}
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </>
    </AnimatePresence>
  );
}