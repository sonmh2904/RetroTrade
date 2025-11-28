import instance from "../customizeAPI";

export interface ContractTemplateData {
  _id?: string;
  templateName: string;
  description?: string;
  templateContent?: string;
}

export interface UpdateContractTemplateData {
  templateName?: string;
  description?: string;
  templateContent?: string;
  isActive?: boolean;
}

//admin quản lý mẫu
export const createContractTemplate = async (templateData: ContractTemplateData): Promise<Response> => {
  return await instance.post("/contract/templates", templateData);
};

//2 thằng get user xem được
export const getContractTemplates = async (): Promise<Response> => {
  return await instance.get("/contract/templates");
};

export const getContractTemplateById = async (id: string): Promise<Response> => {
  return await instance.get(`/contract/templates/${id}`);
};

export const updateContractTemplate = async (id: string, templateData: UpdateContractTemplateData): Promise<Response> => {
  return await instance.put(`/contract/templates/${id}`, templateData);
};

export const deleteContractTemplate = async (id: string): Promise<Response> => {
  return await instance.delete(`/contract/templates/${id}`);
};

//user
export interface PreviewTemplateData {
  orderId: string;
  templateId: string;
  customClauses?: string;
}

export const previewTemplate = async (data: PreviewTemplateData): Promise<Response> => {
  return await instance.post("/contract/preview", data);
};

export interface ConfirmCreateData {
  orderId: string;
  templateId: string;
  customClauses?: string;
}

export const confirmCreateContract = async (data: ConfirmCreateData): Promise<Response> => {
  return await instance.post("/contract/confirm-create", data);
};

export interface ContractSignatureInfo {
  _id: string;
  signatureId: {
    _id?: string;
    signatureImagePath?: string;
    signerName: string;
    signerUserId?: string;
    validFrom: string;
    validTo?: string;
    isActive: boolean;
  } | null;
  signedAt: string;
  isValid: boolean;
  verificationInfo: string;
  positionX: number;
  positionY: number;
}

export interface ContractData {
  contractId: string;
  status: string;
  content: string;
  signatures: ContractSignatureInfo[];
  templateName: string | null;
  signaturesCount: number;
  isFullySigned: boolean;
  canSign: boolean;
}

export interface GetOrCreateContractResponse {
  hasContract: boolean;
  data?: ContractData;
  availableTemplates?: ContractTemplateData[];
}

export const getOrCreateContractForOrder = async (orderId: string): Promise<Response> => {
  return await instance.get(`/contract/order/${orderId}`);
};

export const getContractById = async (contractId: string): Promise<Response> => {
  return await instance.get(`/contract/${contractId}`);
};

export const exportContractPDF = async (contractId: string): Promise<Response> => {
  return await instance.get(`/contract/${contractId}/export-pdf`);
};

export interface SignContractData {
  contractId: string;
  signatureData?: string;
  useExistingSignature?: boolean;
  positionX?: number;
  positionY?: number;
}

export const signContract = async (contractId: string, signData: SignContractData): Promise<Response> => {
  const formData = new FormData();
  if (signData.signatureData) {
    formData.append("signatureData", signData.signatureData);
  }
  formData.append("useExistingSignature", signData.useExistingSignature?.toString() || "false");
  formData.append("contractId", contractId);
  if (signData.positionX !== undefined) formData.append("positionX", signData.positionX.toString());
  if (signData.positionY !== undefined) formData.append("positionY", signData.positionY.toString());
  return await instance.post(`/contract/${contractId}/sign`, formData);
};

export const getContractSignatures = async (contractId: string): Promise<Response> => {
  return await instance.get(`/contract/${contractId}/signatures`);
};

export interface UpdatePositionData {
  positionX: number;
  positionY: number;
}

export const updateSignaturePosition = async (contractSignatureId: string, data: UpdatePositionData): Promise<Response> => {
  return await instance.put(`/contract/signatures/${contractSignatureId}/position`, data);
};

export const decryptSignature = async (signatureId: string): Promise<Response> => {
  return await instance.get(`/contract/signatures/${signatureId}/decrypt`);
};

export interface SignatureResponse {
  signatureUrl?: string;
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  decryptedData?: string | null;
  isUsedInContract?: boolean;
  isExpired?: boolean;
}

export const getUserSignature = async (): Promise<Response> => {
  return await instance.get("/signature");
};

export const saveUserSignature = async (signatureData: string): Promise<Response> => {
  const data = { signatureData };
  return await instance.post("/signature", data);
};

export const deleteUserSignature = async (): Promise<Response> => {
  return await instance.delete("/signature");
};