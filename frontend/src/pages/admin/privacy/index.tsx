import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { PrivacyManagementTable } from "@/components/ui/admin/privacy/privacy-management-table";
import { PrivacyForm } from "@/components/ui/admin/privacy/privacy-form";
import { PrivacyViewModal } from "@/components/ui/admin/privacy/privacy-view-modal";
import { PrivacyHistoryModal } from "@/components/ui/admin/privacy/privacy-history-modal";
import { getAllPrivacy } from "@/services/privacy/privacy.api";
import { Privacy } from "@/services/privacy/privacy.api";
import { toast } from "sonner";
import { Button } from "@/components/ui/common/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/common/card";
import { History, Plus, Settings } from "lucide-react";
import { Badge } from "@/components/ui/common/badge";
import Link from "next/link";

export default function AdminPrivacyPage() {
  const [privacyList, setPrivacyList] = useState<Privacy[]>([]);
  const [selectedPrivacy, setSelectedPrivacy] = useState<Privacy | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrivacy();
  }, []);

  const fetchPrivacy = async () => {
    try {
      setLoading(true);
      const data = await getAllPrivacy();
      setPrivacyList(data);
    } catch {
      toast.error("Lỗi tải danh sách chính sách bảo mật");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (privacy: Privacy) => {
    setSelectedPrivacy(privacy);
    setIsEditModalOpen(true);
  };

  const handleView = (privacy: Privacy) => {
    setSelectedPrivacy(privacy);
    setIsViewModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setPrivacyList((prev) => prev.filter((p) => p._id !== id));
  };

  const handleToggle = (id: string, isActive: boolean) => {
    setPrivacyList((prev) =>
      prev.map((p) => (p._id === id ? { ...p, isActive } : p))
    );
  };

  const handleCreateSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedPrivacy(null);
    fetchPrivacy();
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedPrivacy(null);
  };

  const handleOpenHistory = () => {
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistory = () => {
    setIsHistoryModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const activePrivacy = privacyList.filter((p) => p.isActive);
  const inactivePrivacy = privacyList.filter((p) => !p.isActive);
  const activeCount = activePrivacy.length;
  const inactiveCount = inactivePrivacy.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Quản Lý Chính Sách
            </CardTitle>
            <div className="flex gap-2">
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                {activeCount} active
              </Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                {inactiveCount} inactive
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/privacy/types">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Các Loại Chính Sách
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleOpenHistory}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              Xem Lịch Sử
            </Button>
            <Button
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Tạo Mới
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Table or Empty State */}
      {activePrivacy.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Settings className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Chưa có chính sách nào
            </h3>
            <p className="text-gray-500 mb-6">
              Hãy tạo chính sách bảo mật đầu tiên để bắt đầu quản lý
            </p>
            <Button
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Tạo Chính Sách Đầu Tiên
            </Button>
          </div>
        </Card>
      ) : (
        <PrivacyManagementTable
          data={activePrivacy}
          onEdit={handleEdit}
          onView={handleView}
          isHistoryView={false}
        />
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <PrivacyForm
            isOpen={isEditModalOpen}
            onClose={handleCloseModal}
            privacy={selectedPrivacy}
            onSuccess={handleCreateSuccess}
          />
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {isViewModalOpen && selectedPrivacy && (
          <PrivacyViewModal
            privacy={selectedPrivacy}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <PrivacyHistoryModal
            data={inactivePrivacy}
            onView={handleView}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onClose={handleCloseHistory}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
