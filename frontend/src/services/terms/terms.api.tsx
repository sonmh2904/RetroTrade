import instance from "../customizeAPI";

export interface TermsSection {
  icon: string;
  title: string;
  content: string[];
}

export interface Terms {
  _id: string;
  version: string;
  title: string;
  sections: TermsSection[];
  effectiveDate: string;
  isActive: boolean;
  createdBy: { fullName: string; email: string };
  changesSummary?: string;
  createdAt: string;
}

export const getActiveTerms = async (): Promise<Response> =>
  instance.get("/terms/active");

export const getTermsHistory = async (): Promise<Response> =>
  instance.get("/terms/history");

export const getAllTerms = async (): Promise<Terms[]> => {
  try {
    const [activeRes, historyRes] = await Promise.all([
      instance.get("/terms/active"),
      instance.get("/terms/history").catch(() => null),
    ]);

    let allData: Terms[] = [];

    if (activeRes.ok) {
      const activeData = await activeRes.json();
      if (activeData.success && activeData.data) allData.push(activeData.data);
    }

    if (historyRes?.ok) {
      const historyData = await historyRes.json();
      if (historyData.success)
        allData = [...allData, ...(historyData.data || [])];
    }

    return allData;
  } catch (error) {
    console.error("getAllTerms error:", error);
    throw new Error("Không thể tải danh sách điều khoản");
  }
};

export const createTerms = async (
  version: string,
  title: string,
  sections: TermsSection[],
  effectiveDate: string,
  changesSummary: string | null
): Promise<Response> => {
  const data = { version, title, sections, effectiveDate, changesSummary };
  return instance.post("/terms", data);
};

export const updateTerms = async (
  title: string,
  sections: TermsSection[],
  effectiveDate: string,
  changesSummary: string | null
): Promise<Response> => {
  const data = { title, sections, effectiveDate, changesSummary };
  return instance.put("/terms", data);
};

export const deleteTerms = async (id: string): Promise<Response> =>
  instance.delete(`/terms/${id}`);

export const toggleTermsActive = async (id: string): Promise<Response> => {
  return instance.put(`/terms/${id}/toggle-active`);
};