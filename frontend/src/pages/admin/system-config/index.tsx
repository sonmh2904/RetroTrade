"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/common/card";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/common/dialog";
import { Badge } from "@/components/ui/common/badge";
import { Settings, Edit, Trash2, Plus, RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { systemConfigApi, SystemConfig } from "@/services/admin/systemConfig.api";

const CATEGORY_LABELS: Record<string, string> = {
  fee: "Phí hệ thống",
  limit: "Giới hạn",
  setting: "Cài đặt",
  other: "Khác",
};

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editConfig, setEditConfig] = useState<SystemConfig | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ value: "", label: "", description: "" });

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await systemConfigApi.getAllConfigs("fee");
      setConfigs(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi tải cấu hình");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleEdit = (config: SystemConfig) => {
    setEditConfig(config);
    setFormData({
      value: String(config.value),
      label: config.label,
      description: config.description || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!editConfig) return;
    try {
      const value = editConfig.valueType === "number" ? Number(formData.value) : formData.value;
      await systemConfigApi.updateConfig(editConfig._id, {
        value,
        label: formData.label,
        description: formData.description,
      });
      toast.success("Cập nhật thành công");
      setShowDialog(false);
      fetchConfigs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi cập nhật");
    }
  };

  const formatValue = (config: SystemConfig) => {
    if (config.valueType === "number" && config.category === "fee") {
      return `${Number(config.value).toLocaleString("vi-VN")} VND`;
    }
    return String(config.value);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quản lý phí hệ thống</h2>
        <p className="text-gray-600">Cấu hình các loại phí trong hệ thống</p>
      </div>

      <Card className="bg-white border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cấu hình phí
          </CardTitle>
          <Button onClick={fetchConfigs} variant="ghost" size="sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có cấu hình phí nào. Khởi động server để seed dữ liệu mặc định.
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <div
                  key={config._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{config.label}</h3>
                      <Badge variant="outline" className="text-xs">
                        {config.key}
                      </Badge>
                      {config.isActive ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 text-xs">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatValue(config)}</p>
                    {config.description && (
                      <p className="text-sm text-gray-500 mt-1">{config.description}</p>
                    )}
                    {config.updatedBy && (
                      <p className="text-xs text-gray-400 mt-2">
                        Cập nhật bởi: {config.updatedBy.fullName} | {new Date(config.updatedAt).toLocaleString("vi-VN")}
                      </p>
                    )}
                  </div>
                  <Button onClick={() => handleEdit(config)} variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Sửa
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cấu hình: {editConfig?.key}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tên hiển thị</label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Giá trị {editConfig?.valueType === "number" && "(VND)"}
              </label>
              <Input
                type={editConfig?.valueType === "number" ? "number" : "text"}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
              {editConfig?.valueType === "number" && formData.value && (
                <p className="text-sm text-blue-600 mt-1">
                  = {Number(formData.value).toLocaleString("vi-VN")} VND
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mô tả</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả về cấu hình này..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Hủy</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

