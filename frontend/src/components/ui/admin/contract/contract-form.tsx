import { useState } from "react";
import { motion } from "framer-motion";
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
  AlignLeft,
  FileCheck,
  Sparkles,
  FileUp,
  FileDown,
  Eye,
  XCircle,
} from "lucide-react";
import {
  createContractTemplate,
  updateContractTemplate,
} from "@/services/contract/contract.api";
import { toast } from "sonner";

interface ContractTemplate {
  _id?: string;
  templateName: string;
  description: string;
  headerContent: string;
  bodyContent: string;
  footerContent: string;
  isActive: boolean;
}

interface ContractTemplateFormProps {
  template?: ContractTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContractTemplateForm({
  template,
  onClose,
  onSuccess,
}: ContractTemplateFormProps) {
  const [formData, setFormData] = useState({
    templateName: template?.templateName || "",
    description: template?.description || "",
    headerContent: template?.headerContent || "",
    bodyContent: template?.bodyContent || "",
    footerContent: template?.footerContent || "",
    isActive: template?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const unifiedStyle = {
    fontFamily: "'Times New Roman', Times, serif",
    lineHeight: "1.6",
    fontSize: "14px",
    wordBreak: "break-word" as const,
    hyphens: "auto" as const,
    whiteSpace: "pre-wrap" as const,
    maxWidth: "800px",
    letterSpacing: "0.02em",
    overflowWrap: "anywhere" as const,
    margin: "0 auto",
  } as React.CSSProperties;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const preservedData = {
      ...formData,
      headerContent: formData.headerContent
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n"),
      bodyContent: formData.bodyContent
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n"),
      footerContent: formData.footerContent
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n"),
      templateContent: `${formData.headerContent}\n\n${formData.bodyContent}\n\n${formData.footerContent}`,
    };
    try {
      setLoading(true);
      let response;
      if (template?._id) {
        response = await updateContractTemplate(template._id, preservedData);
      } else {
        response = await createContractTemplate(preservedData);
      }
      if (response.ok) {
        toast.success(template ? "Cập nhật thành công" : "Tạo mới thành công");
        onSuccess();
        onClose();
        // Reload trang để cập nhật dữ liệu mới nhất
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Thao tác thất bại");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] as const,
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  const updateField = (field: keyof ContractTemplate, value: string) => {
    setFormData({ ...formData, [field]: value });
  };
  const combinedContent = `${formData.headerContent}\n\n${formData.bodyContent}\n\n${formData.footerContent}`;

  const footerPlaceholder = `                                                                                                    
ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)                                                                 ĐẠI DIỆN BÊN THUÊ (BÊN B)
Họ và tên: {ownerName}                                                                                      Họ và tên: {renterName}   `;

  const handlePreviewClick = () => {
    if (
      !formData.headerContent.trim() ||
      !formData.bodyContent.trim() ||
      !formData.footerContent.trim()
    ) {
      toast.warning(
        "Vui lòng nhập đầy đủ nội dung header, body và footer trước khi xem trước."
      );
      return;
    }

    if (!combinedContent.includes("\n\n")) {
      toast.warning(
        "Cảnh báo: Đảm bảo có ít nhất 2 newline giữa header-body-footer để align chính xác."
      );
    }
    setShowPreviewModal(true);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="relative"
    >
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-8 rounded-t-2xl">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>

          <motion.div
            className="absolute top-4 right-20 w-2 h-2 bg-white rounded-full"
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-10 right-40 w-3 h-3 bg-white rounded-full"
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />

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
                  {template ? "Cập nhật mẫu hợp đồng" : "Tạo mẫu hợp đồng mới"}
                </CardTitle>
              </div>
              <p className="text-white/80 text-sm ml-14">
                {template
                  ? "Chỉnh sửa thông tin mẫu hợp đồng hiện có"
                  : "Tạo mới một mẫu hợp đồng chuyên nghiệp"}
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

        <CardContent className="p-8 bg-white">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                Tên mẫu hợp đồng <span className="text-red-500">*</span>
              </label>
              <motion.div
                animate={{
                  scale: focusedField === "templateName" ? 1.01 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                <Input
                  value={formData.templateName}
                  onChange={(e) => updateField("templateName", e.target.value)}
                  onFocus={() => setFocusedField("templateName")}
                  onBlur={() => setFocusedField(null)}
                  className="border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl transition-all duration-200 text-base px-4 py-3"
                  placeholder="Nhập tên mẫu hợp đồng"
                  required
                />
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-indigo-600" />
                Mô tả
              </label>
              <motion.div
                animate={{
                  scale: focusedField === "description" ? 1.01 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                <Textarea
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  onFocus={() => setFocusedField("description")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Mô tả ngắn gọn về mục đích sử dụng của mẫu hợp đồng này..."
                  className="border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl transition-all duration-200 min-h-[100px] text-base px-4 py-3 resize-none"
                />
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileUp className="w-4 h-4 text-indigo-600" />
                Phần đầu (Header) <span className="text-red-500">*</span>
              </label>
              <motion.div
                animate={{
                  scale: focusedField === "headerContent" ? 1.01 : 1,
                }}
                transition={{ duration: 0.2 }}
                className="relative"
                style={{ maxWidth: "800px" }}
              >
                <Textarea
                  value={formData.headerContent}
                  onChange={(e) => updateField("headerContent", e.target.value)}
                  onFocus={() => setFocusedField("headerContent")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Nhập phần đầu hợp đồng (ví dụ: tiêu đề, thông tin cơ bản, Cộng hòa xã hội chủ nghĩa Việt Nam...)\n\nSử dụng spaces và newlines chính xác - định dạng sẽ giống hệt khi xem trước."
                  className="border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl transition-all duration-200 text-base px-4 py-3 resize-none overflow-y-auto min-h-[150px] mx-auto"
                  style={unifiedStyle}
                  required
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white px-2 py-1 rounded">
                  {formData.headerContent.length} ký tự (bao gồm spaces)
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Phần thân (Body) <span className="text-red-500">*</span>
              </label>
              <motion.div
                animate={{
                  scale: focusedField === "bodyContent" ? 1.01 : 1,
                }}
                transition={{ duration: 0.2 }}
                className="relative"
                style={{ maxWidth: "800px" }}
              >
                <Textarea
                  value={formData.bodyContent}
                  onChange={(e) => updateField("bodyContent", e.target.value)}
                  onFocus={() => setFocusedField("bodyContent")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Nhập nội dung chính của hợp đồng tại đây...\n\nBạn có thể sử dụng các biến động như {{renterName}}, {{ownerName}}, {{itemTitle}}, {{basePrice}}, {{depositAmount}}, {{rentalStartDate}}, {{rentalEndDate}}, {{totalAmount}}, {{serviceFee}}, {{currency}}, {{unitCount}} để tự động điền thông tin.\n\nLưu ý: Sử dụng spaces chính xác để align - định dạng sẽ giống hệt khi xem trước."
                  className="border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl transition-all duration-200 text-base px-4 py-3 resize-none overflow-y-auto min-h-[400px] mx-auto"
                  style={unifiedStyle}
                  required
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white px-2 py-1 rounded">
                  {formData.bodyContent.length} ký tự (bao gồm spaces)
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileDown className="w-4 h-4 text-indigo-600" />
                Phần chân (Footer) <span className="text-red-500">*</span>
              </label>
              <motion.div
                animate={{
                  scale: focusedField === "footerContent" ? 1.01 : 1,
                }}
                transition={{ duration: 0.2 }}
                className="relative"
                style={{ maxWidth: "800px" }}
              >
                <Textarea
                  value={formData.footerContent}
                  onChange={(e) => updateField("footerContent", e.target.value)}
                  onFocus={() => setFocusedField("footerContent")}
                  onBlur={() => setFocusedField(null)}
                  placeholder={footerPlaceholder}
                  className="border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl transition-all duration-200 text-base px-4 py-3 resize-none overflow-y-auto min-h-[300px] mx-auto"
                  style={unifiedStyle}
                  required
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white px-2 py-1 rounded">
                  {formData.footerContent.length} ký tự (bao gồm spaces)
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex justify-end">
              <Button
                type="button"
                onClick={handlePreviewClick}
                disabled={
                  loading ||
                  !formData.headerContent.trim() ||
                  !formData.bodyContent.trim() ||
                  !formData.footerContent.trim()
                }
                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-all font-medium flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Xem trước hợp đồng
              </Button>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:from-indigo-50 hover:to-purple-50 transition-all duration-200">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-2 border-gray-400 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
                  />
                  {formData.isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute left-0 w-5 h-5 bg-indigo-600 rounded pointer-events-none flex items-center justify-center"
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">
                      Kích hoạt mẫu hợp đồng
                    </span>
                    {formData.isActive && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full"
                      >
                        Đang hoạt động
                      </motion.span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 mt-1 block">
                    Mẫu hợp đồng sẽ có thể được sử dụng ngay lập tức
                  </span>
                </div>
              </label>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex justify-end gap-3 pt-6 border-t-2 border-gray-100"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-xl font-semibold transition-all duration-200"
                >
                  Hủy bỏ
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.headerContent.trim() ||
                    !formData.bodyContent.trim() ||
                    !formData.footerContent.trim()
                  }
                  className="relative px-8 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && (
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  )}
                  {loading ? (
                    <span className="flex items-center gap-2 relative z-10">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Đang lưu...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 relative z-10">
                      <Save className="w-5 h-5" />
                      {template ? "Cập nhật mẫu" : "Tạo mẫu mới"}
                    </span>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </form>
        </CardContent>
      </Card>

      {/* Preview Modal*/}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <Eye className="w-5 h-5 text-blue-500" />
                Xem trước hợp đồng
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div
              className="border border-gray-200 rounded-xl p-4 mb-6 max-h-[50vh] overflow-y-auto bg-gray-50"
              lang="vi"
              style={{ maxWidth: "800px", margin: "0 auto" }}
            >
              <pre
                className="prose prose-lg max-w-none whitespace-pre-wrap font-serif leading-relaxed text-base tracking-wide"
                style={unifiedStyle}
              >
                {combinedContent}
              </pre>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
