"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { ContractManagementTable } from "@/components/ui/admin/contract/contract-management-table";
import { ContractTemplateForm } from "@/components/ui/admin/contract/contract-form";
import { Button } from "@/components/ui/common/button";

interface ContractTemplate {
  _id?: string;
  templateName: string;
  description: string;
  headerContent?: string;
  bodyContent?: string;
  footerContent?: string;
  isActive: boolean;
  createdBy?: {
    fullName: string;
    email: string;
  };
  createdAt?: string;
}

export default function ContractManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ContractTemplate | null>(null);

  const handleAddNew = (): void => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleEdit = (template: ContractTemplate): void => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleFormClose = (): void => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  const handleFormSuccess = (): void => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="mb-8" variants={itemVariants}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Quản Lý Mẫu Hợp Đồng
            </h1>
            <p className="text-0,5xl text-gray-600">
              Tạo, chỉnh sửa và tối ưu hóa các mẫu hợp đồng chuyên nghiệp cho
              nền tảng
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleAddNew}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <Plus className="w-5 h-5 mr-2" />
              Tạo Mẫu Mới
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ContractManagementTable onEdit={handleEdit} />
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={handleFormClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
                className="pointer-events-auto w-full max-w-4xl max-h-[90vh] overflow-hidden"
              >
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                  <div className="max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <ContractTemplateForm
                      template={
                        editingTemplate
                          ? ({
                              ...editingTemplate,
                              headerContent:
                                editingTemplate.headerContent ?? "",
                              bodyContent: editingTemplate.bodyContent ?? "",
                              footerContent:
                                editingTemplate.footerContent ?? "",
                            } as {
                              _id?: string;
                              templateName: string;
                              description: string;
                              headerContent: string;
                              bodyContent: string;
                              footerContent: string;
                              isActive: boolean;
                            })
                          : undefined
                      }
                      onClose={handleFormClose}
                      onSuccess={handleFormSuccess}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #6366f1 0%, #a855f7 100%);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #4f46e5 0%, #9333ea 100%);
        }
      `}</style>
    </motion.div>
  );
}
