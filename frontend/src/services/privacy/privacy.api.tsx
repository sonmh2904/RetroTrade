import instance from "../customizeAPI";

export interface PrivacySection {
  icon: string;
  title: string;
  content: string[];
}

export interface PrivacyTypeRef {
  _id: string;
  displayName?: string;
  iconKey?: string;
  isActive?: boolean;
}

export interface Privacy {
  _id: string;
  typeId: PrivacyTypeRef; // Populated object
  version: string;
  sections: PrivacySection[];
  effectiveDate: string;
  isActive: boolean;
  createdBy: { fullName: string; email: string };
  changesSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacyTypes {
  _id: string;
  displayName: string;
  iconKey: string;
  description?: string;
  isActive: boolean;
  createdBy: { fullName: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface ActivePrivacyResponse {
  [key: string]: Privacy | null; // Key by typeId string
}

export interface ActivePrivacyTypesResponse {
  [key: string]: PrivacyTypes | null;
}

export const getActivePrivacy = async (): Promise<Response> =>
  instance.get("/privacy/active");

export const getPrivacyHistory = async (): Promise<Response> =>
  instance.get("/privacy/history");

export const getPrivacyTypes = async (): Promise<Response> =>
  instance.get("/privacy-types");

export const getActivePrivacyTypes = async (): Promise<Response> =>
  instance.get("/privacy-types/active");

export const getAllPrivacy = async (): Promise<Privacy[]> => {
  try {
    const [activeRes, historyRes] = await Promise.all([
      instance.get("/privacy/active"),
      instance.get("/privacy/history").catch(() => null),
    ]);

    const allData: Privacy[] = [];

    if (activeRes.ok) {
      const activeData = await activeRes.json();
      if (activeData.success && activeData.data) {
        if (
          typeof activeData.data === "object" &&
          !Array.isArray(activeData.data)
        ) {
          const activePolicies: ActivePrivacyResponse = activeData.data;
          Object.values(activePolicies).forEach((p: Privacy | null) => {
            if (p && p.sections && p.sections.length > 0) {
              allData.push(p);
            }
          });
        } else if (Array.isArray(activeData.data)) {
          allData.push(...(activeData.data as Privacy[]));
        } else {
          allData.push(activeData.data as Privacy);
        }
      }
    }

    if (historyRes?.ok) {
      const historyData = await historyRes.json();
      if (historyData.success && Array.isArray(historyData.data)) {
        const historyPolicies: Privacy[] = historyData.data;
        historyPolicies.forEach((p) => {
          if (!allData.some((existing) => existing._id === p._id)) {
            allData.push(p);
          }
        });
      }
    }

    allData.sort(
      (a, b) =>
        new Date(b.effectiveDate).getTime() -
        new Date(a.effectiveDate).getTime()
    );

    return allData;
  } catch (error) {
    console.error("getAllPrivacy error:", error);
    throw new Error("Không thể tải danh sách chính sách bảo mật");
  }
};

export const getAllPrivacyTypes = async (): Promise<PrivacyTypes[]> => {
  try {
    const [typesRes, activeTypesRes] = await Promise.all([
      instance.get("/privacy-types"),
      instance.get("/privacy-types/active").catch(() => null),
    ]);

    const allData: PrivacyTypes[] = [];

    if (typesRes.ok) {
      const typesData = await typesRes.json();
      if (typesData.success && Array.isArray(typesData.data)) {
        allData.push(...(typesData.data as PrivacyTypes[]));
      }
    }

    if (activeTypesRes?.ok) {
      const activeTypesData = await activeTypesRes.json();
      if (activeTypesData.success && activeTypesData.data) {
        if (
          typeof activeTypesData.data === "object" &&
          !Array.isArray(activeTypesData.data)
        ) {
          const activeTypes: ActivePrivacyTypesResponse = activeTypesData.data;
          Object.values(activeTypes).forEach((t: PrivacyTypes | null) => {
            if (t && !allData.some((existing) => existing._id === t._id)) {
              allData.push(t);
            }
          });
        } else if (Array.isArray(activeTypesData.data)) {
          activeTypesData.data.forEach((t: PrivacyTypes) => {
            if (!allData.some((existing) => existing._id === t._id)) {
              allData.push(t);
            }
          });
        }
      }
    }

    allData.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return allData;
  } catch (error) {
    console.error("getAllPrivacyTypes error:", error);
    throw new Error("Không thể tải danh sách loại chính sách");
  }
};

// Updated: Remove title param
export const createPrivacy = async (
  typeId: string, // _id của PrivacyTypes
  version: string,
  sections: PrivacySection[],
  effectiveDate: string,
  changesSummary: string | null
): Promise<Response> => {
  const data = {
    typeId,
    version,
    sections,
    effectiveDate,
    changesSummary,
  };
  return instance.post("/privacy", data);
};

// Updated: Remove title param
export const updatePrivacy = async (
  typeId: string,
  sections: PrivacySection[],
  effectiveDate: string,
  changesSummary: string | null
): Promise<Response> => {
  const data = { typeId, sections, effectiveDate, changesSummary };
  return instance.put("/privacy", data);
};

export const togglePrivacyActive = async (id: string): Promise<Response> => {
  return instance.put(`/privacy/${id}/toggle-active`);
};

export const deletePrivacy = async (id: string): Promise<Response> =>
  instance.delete(`/privacy/${id}`);

export const createPrivacyType = async (
  displayName: string,
  iconKey: string,
  description?: string
): Promise<Response> => {
  const data = { displayName, iconKey, description };
  return instance.post("/privacy-types", data);
};

export const updatePrivacyType = async (
  id: string,
  displayName: string,
  iconKey: string,
  description?: string,
  isActive?: boolean
): Promise<Response> => {
  const data = { displayName, iconKey, description, isActive };
  return instance.put(`/privacy-types/${id}`, data);
};

export const deletePrivacyType = async (id: string): Promise<Response> =>
  instance.delete(`/privacy-types/${id}`);

export const togglePrivacyTypeActive = async (
  id: string
): Promise<Response> => {
  return instance.put(`/privacy-types/${id}/toggle-active`);
};
