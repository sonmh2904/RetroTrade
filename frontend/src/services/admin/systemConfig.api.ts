import api from "../customizeAPI";

export interface SystemConfig {
  _id: string;
  key: string;
  value: number | string | boolean;
  valueType: "number" | "string" | "boolean" | "json";
  label: string;
  description?: string;
  category: "fee" | "limit" | "setting" | "other";
  isActive: boolean;
  updatedBy?: { _id: string; fullName: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export const systemConfigApi = {
  // Admin: Lấy tất cả configs
  getAllConfigs: async (category?: string): Promise<SystemConfig[]> => {
    const query = category ? `?category=${category}` : "";
    const res = await api.get(`/system-config${query}`);
    const data = await res.json();
    if (data.code !== 200) throw new Error(data.message);
    return data.data;
  },

  // Public: Lấy phí nâng cấp owner
  getOwnerUpgradeFee: async (): Promise<number> => {
    const res = await api.get("/system-config/owner-upgrade-fee");
    const data = await res.json();
    if (data.code !== 200) throw new Error(data.message);
    return data.data.fee;
  },

  // Admin: Tạo config
  createConfig: async (config: Partial<SystemConfig>): Promise<SystemConfig> => {
    const res = await api.post("/system-config", config);
    const data = await res.json();
    if (data.code !== 200) throw new Error(data.message);
    return data.data;
  },

  // Admin: Cập nhật config
  updateConfig: async (id: string, updates: Partial<SystemConfig>): Promise<SystemConfig> => {
    const res = await api.put(`/system-config/${id}`, updates);
    const data = await res.json();
    if (data.code !== 200) throw new Error(data.message);
    return data.data;
  },

  // Admin: Xóa config
  deleteConfig: async (id: string): Promise<void> => {
    const res = await api.delete(`/system-config/${id}`);
    const data = await res.json();
    if (data.code !== 200) throw new Error(data.message);
  },
};

