"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  XCircle,
  PenTool,
  ChevronLeft,
  Home,
  ShoppingBag,
  AlertCircle,
  Loader2,
  Eye,
  ChevronRight,
  UserCheck,
  Clock,
  DollarSign,
  Calendar,
  Download,
  Filter as SelectIcon,
  MousePointer2,
  FilePlus2,
} from "lucide-react";
import {
  getOrCreateContractForOrder,
  previewTemplate,
  confirmCreateContract,
  signContract,
  updateSignaturePosition,
  exportContractPDF,
  type SignContractData,
  type PreviewTemplateData,
  type ConfirmCreateData,
  type GetOrCreateContractResponse,
} from "@/services/contract/contract.api";
import { getOrderDetails, type Order } from "@/services/auth/order.api";
import { getSignature, saveSignature } from "@/services/auth/auth.api";
import SignaturePad from "@/components/ui/auth/signature/signature-pad";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { decodeToken } from "@/utils/jwtHelper";
import { Textarea } from "@/components/ui/common/textarea";

interface SignatureResponse {
  signatureUrl?: string;
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  decryptedData?: string | null;
  isUsedInContract?: boolean;
  isExpired?: boolean;
}

interface ContractTemplate {
  _id: string;
  templateName: string;
  description?: string;
  headerContent?: string;
  bodyContent?: string;
  footerContent?: string;
}

interface SignatureInfo {
  _id: string;
  signatureId: {
    _id?: string;
    signatureImagePath?: string;
    signerName: string;
    signerRole?: number | null;
    signerUserId?: string;
    validFrom: string;
    validTo?: string;
    isActive: boolean;
  } | null;
  positionX: number;
  positionY: number;
  signedAt: string;
  isValid: boolean;
  verificationInfo: string;
}

interface ContractPayload {
  contractId: string;
  status: string;
  content: string;
  signatures: SignatureInfo[];
  templateName: string;
  signaturesCount: number;
  isFullySigned: boolean;
  canSign: boolean;
}

interface TempPosition {
  sigId: string;
  x: number;
  y: number;
}

interface PendingPosition {
  x: number;
  y: number;
}

export default function SignContractPage() {
  const router = useRouter();
  const { orderId } = router.query as { orderId: string };
  const [order, setOrder] = useState<Order | null>(null);
  const [pageData, setPageData] = useState<GetOrCreateContractResponse | null>(
    null
  );
  const [contractData, setContractData] = useState<ContractPayload | null>(
    null
  );
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customClauses, setCustomClauses] = useState<string>("");
  const [previewContent, setPreviewContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showSignatureDialog, setShowSignatureDialog] =
    useState<boolean>(false);
  const [showSavePositionDialog, setShowSavePositionDialog] =
    useState<boolean>(false);
  const [showConfirmSignModal, setShowConfirmSignModal] =
    useState<boolean>(false);
  const [termsChecked, setTermsChecked] = useState<boolean>(false);
  const [tempPosition, setTempPosition] = useState<TempPosition | null>(null);
  const [pendingSigId, setPendingSigId] = useState<string | null>(null);
  const [pendingPosition, setPendingPosition] =
    useState<PendingPosition | null>(null);
  const [, setOriginalPosition] = useState<TempPosition | null>(null);
  const [userSignature, setUserSignature] = useState<SignatureResponse | null>(
    null
  );
  const [useExistingSignature, setUseExistingSignature] =
    useState<boolean>(false);
  const [draggingSigId, setDraggingSigId] = useState<string | null>(null);
  const [savingNewSignature, setSavingNewSignature] = useState<boolean>(false);
  const contractRef = useRef<HTMLDivElement>(null);
  const proseRef = useRef<HTMLPreElement | null>(null);
  const draggingRef = useRef<string | null>(null);

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

  // Get current user from Redux token
  const token = useSelector((state: RootState) => state.auth.accessToken);
  const currentUser = useMemo(() => decodeToken(token), [token]);
  const currentUserId = currentUser?._id;
  const isOwnerOfOrder = currentUserId === order?.ownerId._id; // Check owner of item

  // Check if current user has already signed
  const hasSigned = useMemo(() => {
    return !!contractData?.signatures.find(
      (sig) => sig.signatureId?.signerUserId === currentUserId
    );
  }, [contractData, currentUserId]);

  const loadUserSignature = useCallback(async (): Promise<void> => {
    try {
      const res = await getSignature();
      if (res.ok) {
        const data: SignatureResponse = await res.json();
        setUserSignature(data);
        // Auto-set useExistingSignature based on usage
        if (data.isUsedInContract) {
          setUseExistingSignature(true);
        }
      } else if (res.status === 410) {
        // Handle expired signature
        const errorData = await res.json();
        setUserSignature({
          ...errorData,
          signatureUrl: null,
          isActive: false,
        });
        toast.warning("Chữ ký của bạn đã hết hạn. Vui lòng tạo chữ ký mới.");
      } else {
        setUserSignature(null);
      }
    } catch {
      setUserSignature(null);
    }
  }, []);

  const loadPageData = useCallback(async (): Promise<void> => {
    if (typeof orderId !== "string" || !orderId) {
      return;
    }
    setLoading(true);
    try {
      const orderRes = await getOrderDetails(orderId);
      if (orderRes?.data) {
        setOrder(orderRes.data);
      } else {
        toast.error("Không thể tải thông tin đơn hàng");
        return;
      }
      const res = await getOrCreateContractForOrder(orderId);
      if (!res.ok) {
        throw new Error("API response not ok");
      }
      const contractRes: GetOrCreateContractResponse = await res.json();
      setPageData(contractRes);
      if (contractRes && contractRes.hasContract && contractRes.data) {
        setContractData(contractRes.data as ContractPayload);
      } else if (contractRes && !contractRes.hasContract) {
        const availableTpls: ContractTemplate[] = Array.isArray(
          contractRes.availableTemplates
        )
          ? contractRes.availableTemplates
          : [];
        setTemplates(availableTpls);
        if (availableTpls.length === 0) {
          toast.warning("Chưa có mẫu hợp đồng nào. Vui lòng liên hệ admin.");
        }
      } else {
        toast.error("Không thể tải thông tin hợp đồng. Vui lòng thử lại.");
      }
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Lỗi tải đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      loadPageData();
      loadUserSignature();
    }
  }, [orderId, loadPageData, loadUserSignature]);

  const handlePreview = async (): Promise<void> => {
    if (!selectedTemplateId) {
      toast.error("Vui lòng chọn mẫu hợp đồng");
      return;
    }
    setLoadingAction(true);
    try {
      const previewData: PreviewTemplateData = {
        orderId,
        templateId: selectedTemplateId,
        ...(isOwnerOfOrder && customClauses.trim() && { customClauses }),
      };
      const res = await previewTemplate(previewData);
      if (!res.ok) {
        throw new Error("Preview API failed");
      }
      const data = await res.json();
      setPreviewContent(data.data.previewContent);
      setShowPreviewModal(true);
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Lỗi preview");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConfirmCreate = async (): Promise<void> => {
    if (!selectedTemplateId) {
      toast.error("Vui lòng chọn mẫu hợp đồng");
      return;
    }
    setLoadingAction(true);
    try {
      const createData: ConfirmCreateData = {
        orderId,
        templateId: selectedTemplateId,
        ...(customClauses.trim() && { customClauses }),
      };
      const res = await confirmCreateContract(createData);
      if (!res.ok) {
        throw new Error("Create contract API failed");
      }
      const backendData = await res.json();
      const data = backendData.data || backendData;
      if (!data.content) {
        data.content = "";
        toast.warning("Nội dung hợp đồng rỗng, vui lòng kiểm tra template.");
      }
      const contractPayload: ContractPayload = data as ContractPayload;
      setContractData(contractPayload);
      setPageData({ hasContract: true, data: contractPayload });
      setShowPreviewModal(false);
      toast.success("Hợp đồng đã được tạo thành công!");
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Lỗi tạo hợp đồng");
    } finally {
      setLoadingAction(false);
    }
  };
  const handleSignContract = async (
    forceUseExisting?: boolean
  ): Promise<void> => {
    if (!contractData || !contractData.contractId || !contractData.canSign) {
      toast.error("Không thể ký hợp đồng lúc này.");
      return;
    }
    // Set useExistingSignature if forced (for used signature case)
    if (forceUseExisting !== undefined) {
      setUseExistingSignature(forceUseExisting);
    }
    // Reset checkbox state when opening modal
    setTermsChecked(false);
    setShowConfirmSignModal(true);
  };

  const handleConfirmAndSign = async (): Promise<void> => {
    if (!termsChecked) return;
    setShowConfirmSignModal(false);
    if (useExistingSignature && userSignature?.signatureUrl) {
      await handleSignatureSave(userSignature.signatureUrl, true);
    } else {
      setShowSignatureDialog(true);
    }
  };

  const saveNewSignatureAndSign = async (
    signatureUrl: string
  ): Promise<void> => {
    if (!contractData?.contractId) return;
    setSavingNewSignature(true);
    try {
      const saveRes = await saveSignature(signatureUrl);
      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.message || "Lỗi lưu chữ ký mới");
      }
      toast.success("Chữ ký mới đã được lưu!");
      await loadUserSignature();
      const signRes = await signContract(contractData.contractId, {
        contractId: contractData.contractId,
        signatureData: undefined,
        useExistingSignature: true,
      } as SignContractData);
      if (!signRes.ok) {
        throw new Error("Sign contract API failed");
      }
      const signData = await signRes.json();
      if (signData?.contractId) {
        toast.success(
          "Hợp đồng đã được ký! Bạn có thể di chuyển chữ ký đến vị trí phù hợp trên hợp đồng."
        );
        setShowSignatureDialog(false);
        setUseExistingSignature(true);
        await loadPageData();
      }
    } catch (error: unknown) {
      toast.error(
        (error as Error)?.message || "Lỗi ký hợp đồng sau khi lưu chữ ký"
      );
    } finally {
      setSavingNewSignature(false);
    }
  };

  const handleSignatureSave = async (
    signatureUrl: string,
    useExisting = false
  ): Promise<void> => {
    if (!contractData?.contractId) return;
    setLoadingAction(true);
    try {
      const res = await signContract(contractData.contractId, {
        contractId: contractData.contractId,
        signatureData: useExisting ? undefined : signatureUrl,
        useExistingSignature: useExisting,
      } as SignContractData);
      if (!res.ok) {
        throw new Error("Sign contract API failed");
      }
      const data = await res.json();
      if (data?.contractId) {
        toast.success(
          "Hợp đồng đã được ký! Bạn có thể di chuyển chữ ký đến vị trí phù hợp trên hợp đồng."
        );
        setShowSignatureDialog(false);
        setUseExistingSignature(false);
        await loadPageData();
      }
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Lỗi ký hợp đồng");
    } finally {
      setLoadingAction(false);
    }
  };

  // Helper to check if signature belongs to current user
  const isMySignature = useCallback(
    (sig: SignatureInfo): boolean => {
      return sig.signatureId?.signerUserId === currentUserId;
    },
    [currentUserId]
  );

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLImageElement>,
      sigId: string,
      originalX: number,
      originalY: number
    ) => {
      // Safety check: Ensure it's the user's own signature
      const sig = contractData?.signatures.find((s) => s._id === sigId);
      if (!sig || !isMySignature(sig)) {
        toast.warning("Bạn chỉ có thể di chuyển chữ ký của chính mình!");
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      let hasMoved = false;
      let finalX = originalX;
      let finalY = originalY;
      draggingRef.current = sigId;
      setDraggingSigId(sigId);
      setOriginalPosition({ sigId, x: originalX, y: originalY });
      const target = e.currentTarget as HTMLElement;
      const container = contractRef.current;
      if (!container) {
        return;
      }
      if (proseRef.current) {
        proseRef.current.style.overflow = "hidden";
      }
      const containerRect = container.getBoundingClientRect();
      const startRect = target.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const initialLeft = startRect.left - containerRect.left;
      const initialTop = startRect.top - containerRect.top;
      const onMouseMove = (moveE: MouseEvent) => {
        if (!draggingRef.current) return;
        const deltaX = moveE.clientX - startX;
        const deltaY = moveE.clientY - startY;
        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
          hasMoved = true;
        }
        const newLeft = initialLeft + deltaX;
        const newTop = initialTop + deltaY;
        const newX = (newLeft / containerRect.width) * 100;
        const newY = (newTop / containerRect.height) * 100;
        finalX = Math.max(0, Math.min(100, newX));
        finalY = Math.max(0, Math.min(100, newY));
        setTempPosition({
          sigId,
          x: finalX,
          y: finalY,
        });
      };
      const onMouseUp = (moveE: MouseEvent) => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        if (proseRef.current) {
          proseRef.current.style.overflow = "auto";
        }
        draggingRef.current = null;
        setDraggingSigId(null);
        const deltaX = moveE.clientX - startX;
        const deltaY = moveE.clientY - startY;
        const newLeft = initialLeft + deltaX;
        const newTop = initialTop + deltaY;
        const finalNewX = Math.max(
          0,
          Math.min(100, (newLeft / containerRect.width) * 100)
        );
        const finalNewY = Math.max(
          0,
          Math.min(100, (newTop / containerRect.height) * 100)
        );
        if (hasMoved) {
          const xDiff = Math.abs(finalNewX - originalX);
          const yDiff = Math.abs(finalNewY - originalY);
          if (xDiff > 0.1 || yDiff > 0.1 || hasMoved) {
            setPendingSigId(sigId);
            setPendingPosition({ x: finalNewX, y: finalNewY });
            setShowSavePositionDialog(true);
          }
        } else {
          toast.info("Drag xa hơn một chút nhé!");
        }
        setTempPosition(null);
        setOriginalPosition(null);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [contractData, isMySignature]
  );

  const handleSavePosition = async (): Promise<void> => {
    if (!pendingSigId || !pendingPosition) return;
    setLoadingAction(true);
    try {
      const res = await updateSignaturePosition(pendingSigId, {
        positionX: pendingPosition.x,
        positionY: pendingPosition.y,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Update position failed");
      }
      await res.json();
      toast.success("Vị trí chữ ký đã được cập nhật!");
      setShowSavePositionDialog(false);
      setPendingSigId(null);
      setPendingPosition(null);
      setTempPosition(null);
      await loadPageData();
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Lỗi cập nhật vị trí");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelPosition = (): void => {
    setShowSavePositionDialog(false);
    setPendingSigId(null);
    setPendingPosition(null);
    setTempPosition(null);
    setOriginalPosition(null);
  };

  const exportToPDF = async (): Promise<void> => {
    if (!contractData?.contractId) {
      toast.error("Không tìm thấy hợp đồng để xuất PDF");
      return;
    }
    setLoadingAction(true);
    try {
      const res = await exportContractPDF(contractData.contractId);
      if (!res.ok) {
        throw new Error("API export PDF failed");
      }

      // Tải blob từ response
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `hop-dong-thue-${
        order?.orderGuid?.slice(0, 8) || contractData.contractId
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF đã được xuất và tải về thành công!");
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Lỗi xuất PDF từ server");
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
        <div className="text-center p-8 rounded-2xl bg-white shadow-lg">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 font-medium">
            Đang tải trang ký hợp đồng...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
        <div className="text-center p-8 rounded-2xl bg-white shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Đơn hàng không tồn tại
          </h2>
          <Link href="/my-orders">
            <button className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
              Quay lại danh sách đơn hàng
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const hasContract = pageData?.hasContract && !!contractData;
  const getCurrentPosition = (sig: SignatureInfo): { x: number; y: number } => {
    if (tempPosition && tempPosition.sigId === sig._id) {
      return { x: tempPosition.x, y: tempPosition.y };
    }
    return { x: sig.positionX, y: sig.positionY };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <nav className="mb-6 flex items-center space-x-2 text-sm text-gray-600 bg-white rounded-xl p-3 shadow-sm">
          <Link
            href="/home"
            className="hover:text-blue-600 flex items-center gap-1"
          >
            <Home className="w-4 h-4" />
            Trang chủ
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Link
            href={`/my-orders/${orderId}`}
            className="hover:text-blue-600 flex items-center gap-1"
          >
            <ShoppingBag className="w-4 h-4" />
            Đơn hàng #{order.orderGuid?.slice(0, 8) || "N/A"}
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-blue-600">Ký hợp đồng</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6 overflow-hidden">
          <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            {order.orderStatus || "Pending"}
          </div>
          <div className="flex items-center gap-4 mb-4 relative">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-xl text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Ký hợp đồng thuê
              </h1>
              <p className="text-gray-600">
                Đơn hàng #{order.orderGuid?.slice(0, 8) || "N/A"} -{" "}
                {order.itemSnapshot?.title || "N/A"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>
                {order.startAt
                  ? format(new Date(order.startAt), "dd/MM/yyyy")
                  : "N/A"}{" "}
                -{" "}
                {order.endAt
                  ? format(new Date(order.endAt), "dd/MM/yyyy")
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>
                {order.renterId?.fullName || "N/A"} &{" "}
                {order.ownerId?.fullName || "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span>{(order.totalAmount || 0).toLocaleString("vi-VN")}₫</span>
            </div>
          </div>
        </div>

        {!hasContract && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-gray-800 mb-6">
              <SelectIcon className="w-5 h-5 text-blue-500" />
              Chọn mẫu hợp đồng
            </h2>
            <div className="space-y-4">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Chọn mẫu hợp đồng...</option>
                {templates.map((tpl) => (
                  <option key={tpl._id} value={tpl._id}>
                    {tpl.templateName}{" "}
                    {tpl.description ? ` - ${tpl.description}` : ""}
                  </option>
                ))}
              </select>
              {isOwnerOfOrder && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FilePlus2 className="w-4 h-4 text-indigo-600" />
                    Điều khoản bổ sung (tùy chọn)
                  </label>
                  <Textarea
                    value={customClauses}
                    onChange={(e) => setCustomClauses(e.target.value)}
                    placeholder="Thêm điều khoản bổ sung từ chủ sở hữu (nếu có)..."
                    className="w-full border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl transition-all duration-200 min-h-[100px] text-base px-4 py-3 resize-none"
                  />
                </div>
              )}
              <button
                onClick={handlePreview}
                disabled={!selectedTemplateId || loadingAction}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-all font-medium flex items-center justify-center gap-2"
              >
                {loadingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Xem trước
              </button>
            </div>
          </div>
        )}

        {hasContract && contractData && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3 text-gray-800">
                <Eye className="w-5 h-5 text-blue-500" />
                Xem trước hợp đồng ({contractData.templateName})
              </h2>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">
                  {contractData.signaturesCount}/2 chữ ký
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    contractData.isFullySigned
                      ? "text-green-700 bg-green-100"
                      : "text-blue-700 bg-blue-100"
                  }`}
                >
                  {contractData.status === "Signed" ? "Đã ký" : "Chờ ký"}
                </span>
              </div>
            </div>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <MousePointer2 className="w-4 h-4" />
                <span>
                  Click và giữ chuột vào hình chữ ký bên dưới, sau đó di chuyển
                  chuột để kéo đến vị trí mong muốn. Thả chuột để xác nhận lưu.
                  <strong>
                    {" "}
                    Lưu ý: Bạn chỉ có thể di chuyển chữ ký của chính mình.
                  </strong>
                </span>
              </div>
            </div>
            <div
              ref={contractRef}
              className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 mb-6 bg-gradient-to-br from-gray-50 to-white min-h-[500px] overflow-hidden select-none touch-action-none"
              style={{ maxWidth: "800px", margin: "0 auto" }} // Khớp width và center với form
              lang="vi"
            >
              <pre
                ref={proseRef}
                className="prose prose-lg max-w-none h-full overflow-y-auto relative pointer-events-none whitespace-pre-wrap font-serif leading-relaxed text-base tracking-wide"
                style={unifiedStyle} // Áp dụng full unifiedStyle để khớp 100% (bao gồm letterSpacing cho align cột)
              >
                {contractData.content || ""}
              </pre>
              {contractData.signatures.map(
                (sig) =>
                  sig.signatureId?.signatureImagePath && (
                    <Image
                      key={sig._id}
                      src={sig.signatureId.signatureImagePath}
                      alt="Signature"
                      width={128}
                      height={64}
                      className={`absolute object-contain border-2 rounded shadow-lg pointer-events-auto z-20 select-none user-select-none transition-transform duration-100
                        ${
                          draggingSigId === sig._id
                            ? "cursor-grabbing scale-110 shadow-xl"
                            : isMySignature(sig)
                            ? "cursor-grab opacity-80 border-blue-300"
                            : "cursor-not-allowed opacity-60 border-gray-300"
                        }
                      `}
                      style={{
                        left: `${getCurrentPosition(sig).x}%`,
                        top: `${getCurrentPosition(sig).y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      unoptimized
                      {...(isMySignature(sig) && {
                        onMouseDown: (e) =>
                          handleMouseDown(
                            e,
                            sig._id,
                            sig.positionX,
                            sig.positionY
                          ),
                      })}
                      title={
                        isMySignature(sig)
                          ? "Kéo để di chuyển chữ ký của bạn"
                          : "Chữ ký của người khác - Không thể di chuyển"
                      }
                    />
                  )
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-end items-center">
              <button
                onClick={exportToPDF}
                disabled={loadingAction}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-all font-medium flex items-center gap-2"
              >
                {loadingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Xuất PDF
              </button>
              {!hasSigned &&
                contractData.canSign &&
                userSignature?.isActive &&
                !userSignature.isExpired && (
                  <>
                    {userSignature.isUsedInContract ? (
                      // Case: Signature exists and is used - only button, no checkbox
                      <button
                        onClick={() => handleSignContract(true)} // Force use existing
                        disabled={
                          loadingAction ||
                          !contractData.canSign ||
                          !userSignature.signatureUrl
                        }
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-xl hover:from-blue-600 hover:to-emerald-600 disabled:opacity-50 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg"
                      >
                        {loadingAction ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang ký...
                          </>
                        ) : (
                          <>
                            <PenTool className="w-4 h-4" />
                            Ký bằng chữ ký hiện có
                          </>
                        )}
                      </button>
                    ) : (
                      // Case: Signature exists but not used - checkbox + dynamic button
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useExistingSignature}
                            onChange={(e) => {
                              setUseExistingSignature(e.target.checked);
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-600">
                            Sử dụng chữ ký hiện có
                          </span>
                        </label>
                        <button
                          onClick={() => handleSignContract()}
                          disabled={
                            loadingAction ||
                            !contractData.canSign ||
                            (useExistingSignature &&
                              !userSignature?.signatureUrl)
                          }
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-xl hover:from-blue-600 hover:to-emerald-600 disabled:opacity-50 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg"
                        >
                          {loadingAction ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Đang ký...
                            </>
                          ) : (
                            <>
                              <PenTool className="w-4 h-4" />
                              {useExistingSignature
                                ? "Ký bằng chữ ký hiện có"
                                : "Ký mới"}
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}
              {!hasSigned &&
                contractData.canSign &&
                !userSignature?.isActive && (
                  <button
                    onClick={() => handleSignContract(false)} // Force new
                    disabled={loadingAction || !contractData.canSign}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-xl hover:from-blue-600 hover:to-emerald-600 disabled:opacity-50 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    {loadingAction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang ký...
                      </>
                    ) : (
                      <>
                        <PenTool className="w-4 h-4" />
                        Ký mới
                      </>
                    )}
                  </button>
                )}
            </div>
            {contractData.signaturesCount > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Trạng thái chữ ký
                </h3>
                <div className="flex flex-wrap gap-2">
                  {contractData.signatures.map((sig, index) => (
                    <div
                      key={index}
                      className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                        sig.signatureId?.signatureImagePath
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {sig.signatureId
                        ? `${sig.signatureId.signerName} - Đã ký`
                        : "Chờ ký"}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
                style={{ maxWidth: "800px", margin: "0 auto" }} // Khớp width với form để align chính xác
              >
                <pre
                  className="prose prose-lg max-w-none whitespace-pre-wrap font-serif leading-relaxed text-base tracking-wide"
                  style={unifiedStyle} // Áp dụng full unifiedStyle để khớp 100% (bao gồm letterSpacing cho align cột)
                >
                  {previewContent}
                </pre>
              </div>

              {isOwnerOfOrder ? ( // Code chỉ có Owner mới được tạo mẫu hợp đồng
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600"
                  >
                    Hủy
                  </button>

                  <button
                    onClick={handleConfirmCreate}
                    disabled={loadingAction}
                    className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingAction ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Xác nhận tạo hợp đồng
                  </button>
                </div>
              ) : (
                <p className="text-red-500 font-medium text-right">
                  Chỉ có chủ sở hữu của sản phẩm mới được tạo mẫu hợp đồng
                </p>
              )}
            </div>
          </div>
        )}

        {showSignatureDialog && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                  <PenTool className="w-5 h-5 text-blue-500" />
                  Vẽ chữ ký của bạn
                </h3>
                <button
                  onClick={() => setShowSignatureDialog(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Vẽ chữ ký vào khung bên dưới. Bạn có thể xóa và vẽ lại nếu cần.
              </p>
              <SignaturePad
                onSave={(sigUrl) => saveNewSignatureAndSign(sigUrl)}
                onClear={() => toast.info("Đã xóa chữ ký!")}
                disabled={savingNewSignature}
              />
            </div>
          </div>
        )}

        {showConfirmSignModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                  <PenTool className="w-5 h-5 text-blue-500" />
                  Xác nhận ký hợp đồng
                </h3>
                <button
                  onClick={() => setShowConfirmSignModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Trước khi ký, vui lòng xác nhận bạn đã đọc và đồng ý với nội
                dung hợp đồng.
              </p>
              <label className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Tôi đã đọc và đồng ý với{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    điều khoản của hệ thống
                  </a>
                  .
                </span>
              </label>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmSignModal(false)}
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmAndSign}
                  disabled={!termsChecked || loadingAction}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center gap-2 disabled:cursor-not-allowed"
                >
                  {loadingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Xác nhận ký
                </button>
              </div>
            </div>
          </div>
        )}

        {showSavePositionDialog && pendingSigId && pendingPosition && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                <PenTool className="w-5 h-5 text-blue-500" />
                Xác nhận vị trí chữ ký?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Vị trí mới: {pendingPosition.x.toFixed(1)}%,{" "}
                {pendingPosition.y.toFixed(1)}%
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelPosition}
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSavePosition}
                  disabled={loadingAction}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Lưu vị trí
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-12">
          <Link href={`/auth/order/${orderId}`}>
            <button className="px-8 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium flex items-center gap-2 mx-auto shadow-sm hover:shadow-md">
              <ChevronLeft className="w-5 h-5" />
              Quay lại chi tiết đơn hàng
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
