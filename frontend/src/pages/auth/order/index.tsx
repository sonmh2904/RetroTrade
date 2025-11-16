'use client';

import { useCallback, useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { createOrderAction } from "@/store/order/orderActions";
import { removeItemFromCartAction, updateCartItemAction, fetchCartItems } from "@/store/cart/cartActions";
import type { CartItem } from "@/services/auth/cartItem.api";
import { RootState, AppDispatch } from "@/store/redux_store";
import { decodeToken } from "@/utils/jwtHelper";
import { getUserProfile } from "@/services/auth/user.api";
import {
  Package,
  Truck,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Check,
  Home,
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  Edit2,
  X,
  Eye,
  ExternalLink,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import { 
  type Discount, 
  validateDiscount, 
  listAvailableDiscounts 
} from "@/services/products/discount/discount.api";
import api from "../../../services/customizeAPI";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  type UserAddress,
} from "@/services/auth/userAddress.api";
import { payOrderWithWallet } from "@/services/wallet/wallet.api";
import PopupModal from "@/components/ui/common/PopupModal";

import { AddressSelector } from "@/components/ui/auth/address/address-selector";
import RentalDatePicker from "@/components/ui/common/RentalDatePicker";


const calculateRentalDays = (item: CartItem): number => {
  if (!item.rentalStartDate || !item.rentalEndDate) return 0;
  const start = new Date(item.rentalStartDate);
  const end = new Date(item.rentalEndDate);
  const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  let unitCount: number;
  switch (item.priceUnit.toLowerCase()) {
    case "hour":
    case "giờ":
      unitCount = Math.ceil(totalHours);
      break;
    case "day":
    case "ngày":
      unitCount = Math.ceil(totalHours / 24);
      break;
    case "week":
    case "tuần":
      unitCount = Math.ceil(totalHours / (24 * 7));
      break;
    case "month":
    case "tháng":
      unitCount = Math.ceil(totalHours / (24 * 30));
      break;
    default:
      unitCount = Math.ceil(totalHours / 24);
  }
  return Math.max(1, unitCount);
};


type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
      balance?: number;
      required?: number;
      shortage?: number;
    };
  };
  message?: string;
};

export default function Checkout() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shipping, setShipping] = useState({
    fullName: "",
    street: "",
    ward: "",
    province: "",
    phone: "",
  });
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceFeeRate, setServiceFeeRate] = useState<number>(3); // Default 3%
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3; // Hiển thị 3 sản phẩm mỗi trang
  // State cho modal thông báo lỗi
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState("");
  const [errorModalMessage, setErrorModalMessage] = useState("");
  // Tách riêng editing dates (giống cart page)
  const [editingDates, setEditingDates] = useState<Record<string, {
    rentalStartDateTime: string;
    rentalEndDateTime: string;
  }>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, {
    rentalStartDate?: string;
    rentalEndDate?: string;
  }>>({});
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useDefaultPhone, setUseDefaultPhone] = useState(true);
  const [defaultPhone, setDefaultPhone] = useState<string>("");
  const [confirmPopup, setConfirmPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "Xác nhận",
    message: "",
    onConfirm: () => { },
  });
  // thanh toan 
  const [modal, setModal] = useState({ open: false, title: "", message: "" });


  // Discount state
  const [discountCode, setDiscountCode] = useState("");
  const [publicDiscount, setPublicDiscount] = useState<Discount | null>(null);
  const [privateDiscount, setPrivateDiscount] = useState<Discount | null>(null);
  const [publicDiscountAmount, setPublicDiscountAmount] = useState(0);
  const [privateDiscountAmount, setPrivateDiscountAmount] = useState(0);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [showDiscountList, setShowDiscountList] = useState(false);
  const [discountListError, setDiscountListError] = useState<string | null>(null);

  // Lấy từ sessionStorage
  useEffect(() => {
    const itemsStr = sessionStorage.getItem("checkoutItems");
    if (!itemsStr) {
      router.push("/auth/cartitem");
      return;
    }
    const items: CartItem[] = JSON.parse(itemsStr);
    const invalid = items.find((i) => !i.rentalStartDate || !i.rentalEndDate);
    if (invalid) {
      toast.error(`Sản phẩm "${invalid.title}" chưa có ngày thuê hợp lệ.`);
      toast.error(`Sản phẩm "${invalid.title}" chưa có ngày thuê hợp lệ.`);
      router.push("/auth/cartitem");
      return;
    }
    setCartItems(items);
    setSelectedItemIds(items.map((item) => item._id));
    setHasInitializedSelection(true);
  }, [router]);


  useEffect(() => {
    const fetchServiceFeeRate = async () => {
      try {
        const response = await api.get("/serviceFee/current");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (data?.success && data?.data?.serviceFeeRate !== undefined) {
          setServiceFeeRate(data.data.serviceFeeRate);
        }
      } catch (error) {
        console.error("Error fetching serviceFee rate:", error);

      }
    };
    fetchServiceFeeRate();
  }, []);
  // Note: Using default serviceFeeRate; dynamic fetch can be re-enabled when needed

  // Apply address to shipping form
  const applyAddressToShipping = (address: UserAddress) => {
    setShipping(prev => ({
      ...prev,
      street: address.Address,
      ward: address.District,
      province: address.City,
    }));
  };

  // Load missing fullName when address is selected
  useEffect(() => {
    if (selectedAddressId && !shipping.fullName) {
      const decoded = decodeToken(accessToken);
      if (decoded?.fullName) {
        setShipping(prev => ({
          ...prev,
          fullName: decoded.fullName || "",
        }));
      }
    }
  }, [selectedAddressId, shipping.fullName, accessToken]);

  // Update phone when useDefaultPhone changes
  useEffect(() => {
    if (useDefaultPhone && defaultPhone) {
      setShipping(prev => ({
        ...prev,
        phone: defaultPhone,
      }));
    } else if (!useDefaultPhone) {
      // Clear phone when switching to custom input
      setShipping(prev => ({
        ...prev,
        phone: "",
      }));
    }
  }, [useDefaultPhone, defaultPhone]);

 useEffect(() => {
  const loadUserInfo = async () => {
    try {
      // Get fullName from token
      const decoded = decodeToken(accessToken);
      if (decoded?.fullName) {
        setShipping(prev => ({
          ...prev,
          fullName: decoded.fullName || "",
        }));
      }

      // Get phone from user profile and save as default
      const profileResponse = await getUserProfile();
      if (profileResponse?.user?.phone || profileResponse?.data?.phone) {
        const phone = profileResponse.user?.phone || profileResponse.data?.phone || "";
        setDefaultPhone(phone);
        // Only set to shipping if useDefaultPhone is true
        if (useDefaultPhone) {
          setShipping(prev => ({
            ...prev,
            phone: phone,
          }));
        }
      }

    } catch (error) {
      console.error("Error loading user info:", error);
    }
  };

  if (accessToken) {
    loadUserInfo();
  }
}, [accessToken, useDefaultPhone]);

  useEffect(() => {
    if (!hasInitializedSelection) return;
    setSelectedItemIds((prev) =>
      prev.filter((id) => cartItems.some((item) => item._id === id))
    );
  }, [cartItems, hasInitializedSelection]);

  const loadAvailableDiscounts = useCallback(async () => {
      if (!accessToken) return;

      setLoadingDiscounts(true);
    setDiscountListError(null);
      try {
        const response = await listAvailableDiscounts(1, 50);
        if (response.status === "success" && response.data) {
          // Hiển thị tất cả discount active - logic validate sẽ kiểm tra thời gian khi áp dụng
          setAvailableDiscounts(response.data);
      } else {
        setDiscountListError(response.message || "Không thể tải danh sách mã giảm giá.");
        }
      } catch (error) {
        console.error("Error loading available discounts:", error);
      setDiscountListError("Không thể tải danh sách mã giảm giá. Vui lòng thử lại.");
      } finally {
        setLoadingDiscounts(false);
      }
  }, [accessToken]);

  // Load available discounts for user
  useEffect(() => {
    if (accessToken && cartItems.length > 0) {
      loadAvailableDiscounts();
    }
  }, [accessToken, cartItems.length, loadAvailableDiscounts]);

  // Close discount dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.discount-input-container')) {
        setShowDiscountList(false);
      }
    };

    if (showDiscountList) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDiscountList]);


  // Pagination calculations
  const totalPages = Math.ceil(cartItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = cartItems.slice(startIndex, endIndex);
  const selectedCartItems = cartItems.filter((item) =>
    selectedItemIds.includes(item._id)
  );

  const rentalTotal = selectedCartItems.reduce((sum, item) => {
    const days = calculateRentalDays(item);
    return sum + item.basePrice * item.quantity * days;
  }, 0);

  console.log("Render - rentalTotal:", rentalTotal, "cartItems:", cartItems.length);

  // Tính depositTotal
  const depositTotal = selectedCartItems.reduce(
    (sum, item) => sum + item.depositAmount * item.quantity,
    0
  );

  // Tính serviceFee trên (tiền thuê + tiền cọc) theo công thức mới
  const serviceFeeAmount = ((rentalTotal + depositTotal) * serviceFeeRate) / 100;

  // Tính totalDiscountAmount từ public và private discount (chỉ áp dụng khi có sản phẩm được chọn)
  const effectivePublicDiscountAmount = selectedCartItems.length > 0 ? publicDiscountAmount : 0;
  const effectivePrivateDiscountAmount = selectedCartItems.length > 0 ? privateDiscountAmount : 0;
  const totalDiscountAmount = effectivePublicDiscountAmount + effectivePrivateDiscountAmount;

  // Tính grandTotal theo công thức mới: 
  // Tổng = tiền thuê + tiền cọc + (tiền thuê + tiền cọc) * thuế - giảm giá
  const grandTotal = Math.max(0, rentalTotal + depositTotal + serviceFeeAmount - totalDiscountAmount);

  // Kiểm tra minOrderAmount cho public discount
  useEffect(() => {
    if (
      publicDiscount &&
      publicDiscount.minOrderAmount &&
      (rentalTotal + depositTotal) < publicDiscount.minOrderAmount
    ) {
      setPublicDiscount(null);
      setPublicDiscountAmount(0);
      toast.info("Đơn hàng không còn đáp ứng điều kiện tối thiểu của mã giảm giá công khai đã chọn.");
    }
  }, [publicDiscount, rentalTotal, depositTotal]);

  // Kiểm tra minOrderAmount cho private discount
  useEffect(() => {
    if (
      privateDiscount &&
      privateDiscount.minOrderAmount
    ) {
      const baseAmountAfterPublic = Math.max(0, (rentalTotal + depositTotal) - publicDiscountAmount);
      if (baseAmountAfterPublic < privateDiscount.minOrderAmount) {
        setPrivateDiscount(null);
        setPrivateDiscountAmount(0);
        toast.info("Đơn hàng không còn đáp ứng điều kiện tối thiểu của mã giảm giá riêng tư đã chọn.");
      }
    }
  }, [privateDiscount, rentalTotal, depositTotal, publicDiscountAmount]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAllItems = () => {
    setSelectedItemIds(cartItems.map((item) => item._id));
  };

  const handleDeselectAllItems = () => {
    setSelectedItemIds([]);
  };

  // Helper function to calculate discount amount (same logic as backend)
  const calculateDiscountAmount = (
    type: "percent" | "fixed",
    value: number,
    baseAmount: number,
    maxDiscountAmount?: number
  ): number => {
    let amount = type === "percent" ? (baseAmount * value) / 100 : value;
    if (maxDiscountAmount && maxDiscountAmount > 0) {
      amount = Math.min(amount, maxDiscountAmount);
    }
    amount = Math.max(0, Math.min(baseAmount, Math.floor(amount)));
    return amount;
  };

  // Handle discount code
  const handleApplyDiscount = async (code?: string) => {
    const codeToApply = code || discountCode.trim();
    if (!codeToApply) {
      setDiscountError("Vui lòng nhập mã giảm giá");
      return;
    }

    if (selectedCartItems.length === 0) {
      setDiscountError("Vui lòng chọn ít nhất một sản phẩm để áp dụng mã giảm giá");
      return;
    }

    setDiscountLoading(true);
    setDiscountError(null);

    try {
      // Tính discount dựa trên tổng tiền (tiền thuê + tiền cọc)
      const baseAmountForDiscount = rentalTotal + depositTotal;
      
      console.log("Validating discount:", {
        code: codeToApply.toUpperCase(),
        baseAmount: baseAmountForDiscount,
        rentalTotal,
        depositTotal,
        selectedItemsCount: selectedCartItems.length
      });
      
      const response = await validateDiscount({
        code: codeToApply.toUpperCase(),
        baseAmount: baseAmountForDiscount,
      });
      
      console.log("Validation response:", response);

      if (response.status === "success" && response.data) {
        const discount = response.data.discount;
        let amount = response.data.amount || 0;

        // Tính lại discount amount để đảm bảo chính xác
        const calculatedAmount = calculateDiscountAmount(
          discount.type,
          discount.value,
          baseAmountForDiscount,
          discount.maxDiscountAmount
        );
        
        // Sử dụng amount từ backend, nhưng log để debug
        console.log("Discount calculation:", {
          code: discount.code,
          type: discount.type,
          value: discount.value,
          baseAmount: baseAmountForDiscount,
          maxDiscountAmount: discount.maxDiscountAmount || 0,
          backendAmount: amount,
          calculatedAmount: calculatedAmount,
          match: Math.abs(amount - calculatedAmount) < 0.01
        });

        console.log("Applying discount:", {
          code: discount.code,
          isPublic: discount.isPublic,
          type: discount.type,
          value: discount.value,
          maxDiscountAmount: discount.maxDiscountAmount,
          minOrderAmount: discount.minOrderAmount,
          amount: amount,
          rentalTotal: rentalTotal,
          depositTotal: depositTotal,
          totalAmountForDiscount: rentalTotal + depositTotal,
          expectedAmount: discount.type === "percent"
            ? ((rentalTotal + depositTotal) * discount.value) / 100
            : discount.value,
          discount: discount
        });

        // Kiểm tra loại discount (public hay private)
        if (discount.isPublic) {
          // Mã công khai - chỉ cho phép 1 mã công khai
          if (publicDiscount) {
            setDiscountError("Bạn đã áp dụng mã công khai. Chỉ được áp dụng 1 mã công khai.");
            setDiscountLoading(false);
            return;
          }
          // Không được có mã công khai nếu đã có mã private có cùng code
          if (privateDiscount && privateDiscount.code === discount.code) {
            setDiscountError("Mã này đã được áp dụng");
            setDiscountLoading(false);
            return;
          }
          setPublicDiscount(discount);
          setPublicDiscountAmount(amount);
          console.log("Set public discount amount:", amount);

          // Nếu đã có mã private, tính lại mã private với baseAmount mới
          if (privateDiscount) {
            const baseAmountAfterPublic = Math.max(0, baseAmountForDiscount - amount);
            try {
              const revalidatePrivateResponse = await validateDiscount({
                code: privateDiscount.code.toUpperCase(),
                baseAmount: baseAmountAfterPublic,
              });
              if (revalidatePrivateResponse.status === "success" && revalidatePrivateResponse.data) {
                setPrivateDiscountAmount(revalidatePrivateResponse.data.amount);
              }
            } catch (e) {
              console.error("Error revalidating private discount:", e);
            }
          }

          toast.success("Áp dụng mã giảm giá công khai thành công!");
        } else {
          // Mã riêng tư - chỉ cho phép 1 mã riêng tư
          if (privateDiscount) {
            setDiscountError("Bạn đã áp dụng mã riêng tư. Chỉ được áp dụng 1 mã riêng tư.");
            setDiscountLoading(false);
            return;
          }
          // Không được có mã private nếu đã có mã public có cùng code
          if (publicDiscount && publicDiscount.code === discount.code) {
            setDiscountError("Mã này đã được áp dụng");
            setDiscountLoading(false);
            return;
          }
          // Tính lại discount amount dựa trên baseAmount sau khi đã trừ mã công khai
          const baseAmountAfterPublic = Math.max(0, baseAmountForDiscount - publicDiscountAmount);
          // Validate lại với baseAmount mới
          try {
            const revalidateResponse = await validateDiscount({
              code: discount.code.toUpperCase(),
              baseAmount: baseAmountAfterPublic,
            });
            if (revalidateResponse.status === "success" && revalidateResponse.data) {
              amount = revalidateResponse.data.amount;
            }
          } catch (e) {
            console.error("Error revalidating discount:", e);
          }
          setPrivateDiscount(discount);
          setPrivateDiscountAmount(amount);
          toast.success("Áp dụng mã giảm giá riêng tư thành công!");
        }

        setDiscountCode("");
        setShowDiscountList(false);
      } else {
        // Hiển thị lý do cụ thể từ backend nếu có
        const errorMessage = response.message || "Mã giảm giá không hợp lệ";
        const reason = (response as { reason?: string }).reason;
        
        let detailedMessage = errorMessage;
        if (reason) {
          switch (reason) {
            case "INVALID_CODE":
              detailedMessage = "Mã giảm giá không tồn tại";
              break;
            case "NOT_STARTED":
              detailedMessage = "Mã giảm giá chưa đến thời gian sử dụng";
              break;
            case "EXPIRED":
              detailedMessage = "Mã giảm giá đã hết hạn";
              break;
            case "USAGE_LIMIT":
              detailedMessage = "Mã giảm giá đã hết lượt sử dụng";
              break;
            case "BELOW_MIN_ORDER":
              const baseAmount = rentalTotal + depositTotal;
              // Try to get minOrderAmount from available discounts
              const discountInfo = availableDiscounts.find(d => d.code === codeToApply.toUpperCase());
              if (discountInfo?.minOrderAmount) {
                const needed = discountInfo.minOrderAmount - baseAmount;
                detailedMessage = `Đơn hàng cần thêm ${needed.toLocaleString("vi-VN")}₫ để áp dụng mã này (Tối thiểu: ${discountInfo.minOrderAmount.toLocaleString("vi-VN")}₫, Hiện tại: ${baseAmount.toLocaleString("vi-VN")}₫)`;
              } else {
                detailedMessage = `Đơn hàng chưa đạt mức tối thiểu để áp dụng mã này (Hiện tại: ${baseAmount.toLocaleString("vi-VN")}₫)`;
              }
              break;
            case "NOT_ALLOWED_USER":
              detailedMessage = "Bạn không có quyền sử dụng mã giảm giá này";
              break;
            case "PER_USER_LIMIT":
              detailedMessage = "Bạn đã sử dụng hết số lần cho phép của mã này";
              break;
            case "OWNER_NOT_MATCH":
              detailedMessage = "Mã giảm giá này chỉ áp dụng cho sản phẩm của chủ sở hữu cụ thể";
              break;
            case "ITEM_NOT_MATCH":
              detailedMessage = "Mã giảm giá này chỉ áp dụng cho sản phẩm cụ thể";
              break;
            case "ASSIGN_NOT_STARTED":
              detailedMessage = "Mã giảm giá riêng tư chưa đến thời gian sử dụng";
              break;
            case "ASSIGN_EXPIRED":
              detailedMessage = "Mã giảm giá riêng tư đã hết thời gian sử dụng";
              break;
            default:
              detailedMessage = errorMessage;
          }
        }
        
        // Log chi tiết để debug
        console.error("Discount validation failed:", {
          code: codeToApply,
          reason,
          message: detailedMessage,
          baseAmount: baseAmountForDiscount,
          response
        });
        
        setDiscountError(detailedMessage);
      }
    } catch (error: unknown) {
      console.error("Error applying discount:", error);
      let errorMessage = "Có lỗi xảy ra khi áp dụng mã giảm giá";
      if (error && typeof error === "object") {
        const apiError = error as ApiError;
        errorMessage = apiError?.response?.data?.message || 
                      apiError?.message || 
                      errorMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      setDiscountError(errorMessage);
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemovePublicDiscount = () => {
    setPublicDiscount(null);
    setPublicDiscountAmount(0);
    setDiscountError(null);
    toast.info("Đã xóa mã giảm giá công khai");
  };

  const handleRemovePrivateDiscount = () => {
    setPrivateDiscount(null);
    setPrivateDiscountAmount(0);
    setDiscountError(null);
    toast.info("Đã xóa mã giảm giá riêng tư");
  };

  const handleSelectDiscount = (discount: Discount) => {
    setDiscountCode(discount.code);
    handleApplyDiscount(discount.code);
  };


  // Quantity controls - mượn logic từ cart page
  const updateQuantity = useCallback(
    async (cartItemId: string, newQuantity: number) => {
      const cartItem = cartItems.find((item) => item._id === cartItemId);
      if (!cartItem) {
        toast.error("Không tìm thấy sản phẩm");
        return;
      }

      if (newQuantity <= 0) {
        return;
      }

      if (newQuantity > cartItem.availableQuantity) {
        toast.error(`Hiện tại chỉ có ${cartItem.availableQuantity} sản phẩm`);
        return;
      }

      if (newQuantity > 99) {
        toast.error("Số lượng không được vượt quá 99 sản phẩm");
        return;
      }

      if (!Number.isInteger(newQuantity)) {
        toast.error("Số lượng phải là số nguyên");
        return;
      }

      // Temp item - chỉ update local
      if (cartItemId.startsWith("temp-")) {
        const updatedItems = cartItems.map((item) =>
          item._id === cartItemId ? { ...item, quantity: newQuantity } : item
        );
        sessionStorage.setItem("checkoutItems", JSON.stringify(updatedItems));
        setCartItems(updatedItems);
        return;
      }

      // Real cart item - update trong database
      try {
        setUpdatingItems((prev) => new Set(prev).add(cartItemId));
        await dispatch(updateCartItemAction(cartItemId, { quantity: newQuantity }));
        await dispatch(fetchCartItems());
        
        const updatedItems = cartItems.map((item) =>
          item._id === cartItemId ? { ...item, quantity: newQuantity } : item
        );
        sessionStorage.setItem("checkoutItems", JSON.stringify(updatedItems));
        setCartItems(updatedItems);
      } catch {
        dispatch(fetchCartItems());
        toast.error("Có lỗi xảy ra khi cập nhật số lượng");
      } finally {
        setUpdatingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cartItemId);
          return newSet;
        });
      }
    },
    [cartItems, dispatch]
  );

  // Debounced update for quantity
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedUpdate = useCallback(
    (cartItemId: string, newQuantity: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        updateQuantity(cartItemId, newQuantity);
      }, 300);
    },
    [updateQuantity]
  );

  // Immediate UI update for quantity
  const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
    const cartItem = cartItems.find((item) => item._id === cartItemId);
    if (!cartItem) return;

    if (newQuantity <= 0 || newQuantity > cartItem.availableQuantity || newQuantity > 99) {
      return;
    }

    // Immediate UI update
    const updatedCartItems = cartItems.map((item) =>
      item._id === cartItemId ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedCartItems);
    sessionStorage.setItem("checkoutItems", JSON.stringify(updatedCartItems));

    // Debounced API call
    debouncedUpdate(cartItemId, newQuantity);
  };

  // Dates editing - mượn logic từ cart page
  const startEditingDates = useCallback(
    (cartItemId: string, rentalStartDate?: string, rentalEndDate?: string) => {
      const startDateTime = rentalStartDate
        ? rentalStartDate.replace("T", "T").substring(0, 16)
        : "";
      const endDateTime = rentalEndDate
        ? rentalEndDate.replace("T", "T").substring(0, 16)
        : "";

      setEditingDates((prev) => ({
        ...prev,
        [cartItemId]: {
          rentalStartDateTime: startDateTime,
          rentalEndDateTime: endDateTime,
        },
      }));
      setItemErrors({ ...itemErrors, [cartItemId]: {} });
    },
    [itemErrors]
  );

  const cancelEditingDates = useCallback((cartItemId: string) => {
    setEditingDates((prev) => {
      const newState = { ...prev };
      delete newState[cartItemId];
      return newState;
    });
    setItemErrors((prev) => {
      const newState = { ...prev };
      delete newState[cartItemId];
      return newState;
    });
  }, []);

  const updateEditingDates = useCallback(
    (
      cartItemId: string,
      field: "rentalStartDateTime" | "rentalEndDateTime",
      value: string
    ) => {
      setEditingDates((prev) => ({
        ...prev,
        [cartItemId]: {
          ...prev[cartItemId],
          [field]: value,
        },
      }));
    },
    []
  );

  // Update rental dates - mượn logic từ cart page
  const updateRentalDates = useCallback(
    async (
      cartItemId: string,
      rentalStartDateTime: string,
      rentalEndDateTime: string
    ) => {
      if (!rentalStartDateTime || !rentalEndDateTime) {
        toast.error("Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc");
        return;
      }

      const startDate = new Date(rentalStartDateTime);
      const endDate = new Date(rentalEndDateTime);
      const diffDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 365) {
        toast.error("Thời gian thuê không được vượt quá 365 ngày");
        return;
      }

      try {
        setUpdatingItems((prev) => new Set(prev).add(cartItemId));

        // Temp item - chỉ update local
        if (cartItemId.startsWith("temp-")) {
          const updatedItems = cartItems.map((item) =>
            item._id === cartItemId
              ? {
                  ...item,
                  rentalStartDate: rentalStartDateTime,
                  rentalEndDate: rentalEndDateTime,
                }
              : item
          );
          sessionStorage.setItem("checkoutItems", JSON.stringify(updatedItems));
          setCartItems(updatedItems);
          cancelEditingDates(cartItemId);
          toast.success("Đã cập nhật thời gian thuê");
          return;
        }

        // Real cart item - update trong database
        await dispatch(
          updateCartItemAction(cartItemId, {
            rentalStartDate: rentalStartDateTime,
            rentalEndDate: rentalEndDateTime,
          })
        );

        await dispatch(fetchCartItems());

        const updatedItems = cartItems.map((item) =>
          item._id === cartItemId
            ? {
                ...item,
                rentalStartDate: rentalStartDateTime,
                rentalEndDate: rentalEndDateTime,
              }
            : item
        );
        sessionStorage.setItem("checkoutItems", JSON.stringify(updatedItems));
        setCartItems(updatedItems);

        toast.success("Đã cập nhật thời gian thuê thành công");
        cancelEditingDates(cartItemId);
      } catch {
        toast.error("Có lỗi xảy ra khi cập nhật thời gian thuê");
      } finally {
        setUpdatingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cartItemId);
          return newSet;
        });
      }
    },
    [cartItems, dispatch, cancelEditingDates]
  );

  // ham submit mơi 

  const processPayment = async () => {
    setIsSubmitting(true);
    try {
      const itemsToProcess = selectedCartItems;
      const unselectedItems = cartItems.filter(
        (item) => !selectedItemIds.includes(item._id)
      );
      const failedItemIds: string[] = [];
      const failedItemMessages: string[] = [];

      for (const item of itemsToProcess) {
        console.log("Bắt đầu xử lý cho:", item.title);

        const result = await dispatch(
          createOrderAction({
            itemId: item.itemId,
            quantity: item.quantity,
            startAt: item.rentalStartDate,
            endAt: item.rentalEndDate,
            shippingAddress: shipping,
            paymentMethod: "Wallet",
            note,
            publicDiscountCode: publicDiscount?.code || null,
            privateDiscountCode: privateDiscount?.code || null,
          })
        );

        if (!result?.success) {
          const errorMessage = result?.error || "Không thể tạo đơn hàng";
          toast.error(`Không thể tạo đơn cho sản phẩm: ${item.title}. ${errorMessage}`);
          failedItemMessages.push(item.title);
          failedItemIds.push(item._id);
          console.error(`Order failed for ${item.title}:`, result?.error);
          continue;
        }
        const orderData = result?.data as
          | { orderId?: string; _id?: string; userId?: string }
          | undefined;
        const orderIdRaw = orderData?.orderId ?? orderData?._id;
        const userId = orderData?.userId;

        if (!orderIdRaw) {
          console.error("Response từ createOrder:", result);
          toast.error(`Không lấy được orderId cho sản phẩm: ${item.title}`);
          failedItemMessages.push(item.title + " (lỗi lấy orderId)");
          failedItemIds.push(item._id);
          continue;
        }

        const orderId =
          typeof orderIdRaw === "string" ? orderIdRaw : String(orderIdRaw);
        console.log(" Đã tạo order với ID:", orderId, "Bắt đầu thanh toán...");
        console.log(" Order data:", result?.data);

        try {
          // Kiểm tra số dư ví trước khi thanh toán
          const expectedPaymentAmount = grandTotal; // Số tiền hiển thị trên UI (đã trừ discount)
          
          console.log("Bắt đầu thanh toán:", {
            orderId,
            expectedAmount: expectedPaymentAmount,
            grandTotal,
            rentalTotal,
            serviceFeeAmount,
            depositTotal,
            totalDiscountAmount
          });

          const paymentResult = await payOrderWithWallet(orderId, userId);

          if (paymentResult && paymentResult.success === false) {
            const errorMsg =
              paymentResult.error ||
              paymentResult.message ||
              "Thanh toán thất bại";
            toast.error(
              `Thanh toán thất bại cho sản phẩm: ${item.title}. ${errorMsg}`
            );
            failedItemMessages.push(item.title + " (thanh toán không thành công)");
            failedItemIds.push(item._id);
            continue;
          }

          console.log("Thanh toán thành công cho order:", orderId, paymentResult);
        } catch (paymentError: unknown) {
          let errorMessage = "Thanh toán thất bại";

          if (paymentError && typeof paymentError === "object") {
            const error = paymentError as ApiError;
            const errorData = error.response?.data;

            if (errorData) {
              console.log(" Error data từ backend:", errorData);

              errorMessage =
                errorData.message || errorData.error || "Thanh toán thất bại";

              const isInsufficientBalance =
                errorData.error === "Ví người dùng không đủ tiền" ||
                errorMessage.includes("không đủ tiền") ||
                errorData.error?.includes("không đủ tiền") ||
                errorData.error?.includes("Ví người dùng không đủ tiền");

              console.log(
                "Is insufficient balance?",
                isInsufficientBalance,
                "error:",
                errorData.error,
                "errorData:",
                errorData
              );

              if (isInsufficientBalance) {
                // Hiển thị thông tin chi tiết về số dư và số tiền cần
                const balance = errorData.balance || 0;
                const required = errorData.required || grandTotal;
                const shortage = errorData.shortage || (required - balance);
                
                const detailedMessage = `Số dư ví của bạn: ${balance.toLocaleString("vi-VN")}₫\n\nCần thanh toán: ${required.toLocaleString("vi-VN")}₫\n\nThiếu: ${shortage.toLocaleString("vi-VN")}₫\n\nVui lòng nạp thêm tiền vào ví để tiếp tục thanh toán.`;

                setErrorModalTitle("Ví không đủ tiền");
                setErrorModalMessage(detailedMessage);
                setIsErrorModalOpen(true);
                console.log("Đã mở modal lỗi ví không đủ tiền:", {
                  balance,
                  required,
                  shortage,
                  message: detailedMessage
                });
              } else {
                toast.error(`${errorMessage} - Sản phẩm: ${item.title}`, {
                  duration: 5000,
                });
              }
              failedItemMessages.push(item.title + " (thanh toán không thành công)");
              failedItemIds.push(item._id);
              continue;
            }

            if (typeof error.message === "string") {
              errorMessage = error.message;
              toast.error(`${errorMessage} - Sản phẩm: ${item.title}`, {
                duration: 5000,
              });
              failedItemMessages.push(item.title + " (thanh toán không thành công)");
              failedItemIds.push(item._id);
              continue;
            }
          }

          if (typeof paymentError === "string") {
            errorMessage = paymentError;
          }

          toast.error(`Thanh toán thất bại cho sản phẩm: ${item.title}`, {
            duration: 5000,
          });
          console.error(" Lỗi thanh toán:", paymentError);
          failedItemMessages.push(item.title + " (thanh toán không thành công)");
          failedItemIds.push(item._id);
          continue;
        }

        if (!item._id?.startsWith("temp-")) {
          try {
            await dispatch(removeItemFromCartAction(item._id));
          } catch (cartError) {
            console.error(
              `Error removing item from cart: ${item.title}`,
              cartError
            );
          }
        }
      }

      const successCount = itemsToProcess.length - failedItemIds.length;

      if (failedItemIds.length === 0) {
        toast.success("Thanh toán & tạo đơn tất cả sản phẩm đã chọn thành công!");
        const remainingItems = unselectedItems;
        if (remainingItems.length > 0) {
          sessionStorage.setItem("checkoutItems", JSON.stringify(remainingItems));
        } else {
          sessionStorage.removeItem("checkoutItems");
        }
        router.push("/auth/order");
      } else if (successCount > 0) {
        toast.warning(
          `Đã xử lý thành công ${successCount} đơn hàng. ${failedItemMessages.length} đơn thất bại: ${failedItemMessages.join(", ")}`
        );
        const remainingItems = [
          ...unselectedItems,
          ...itemsToProcess.filter((item) => failedItemIds.includes(item._id)),
        ];
        sessionStorage.setItem(
          "checkoutItems",
          JSON.stringify(remainingItems)
        );
      } else {
        toast.error(
          `Không thể xử lý đơn hàng nào. Chi tiết: ${failedItemMessages.join(", ")}`
        );
        const remainingItems = [...unselectedItems, ...itemsToProcess];
        sessionStorage.setItem(
          "checkoutItems",
          JSON.stringify(remainingItems)
        );
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Có lỗi xảy ra khi tạo đơn hàng, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    // Check if address is selected or manually filled
    const hasSelectedAddress = selectedAddressId !== null;
    const hasManualAddress = shipping.street && shipping.province;
    
    if (!hasSelectedAddress && !hasManualAddress) {
      toast.error("Vui lòng chọn địa chỉ đã lưu hoặc nhập địa chỉ mới");
      return;
    }
    
    if (
      !shipping.fullName ||
      !shipping.street ||
      !shipping.province ||
      !shipping.phone
    ) {
      const missingFields = [];
      if (!shipping.fullName) missingFields.push("Họ và tên");
      if (!shipping.street) missingFields.push("Địa chỉ");
      if (!shipping.province) missingFields.push("Tỉnh/Thành phố");
      if (!shipping.phone) missingFields.push("Số điện thoại");
      
      toast.error(`Vui lòng điền đầy đủ thông tin: ${missingFields.join(", ")}`);
      return;
    }

    if (selectedCartItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm để đặt thuê");
      return;
    }

    // Hiển thị popup xác nhận thanh toán
    const paymentDetails = [
      `• Tiền thuê: ${rentalTotal.toLocaleString("vi-VN")}₫`,
      `• Phí dịch vụ (${serviceFeeRate}%): ${serviceFeeAmount.toLocaleString("vi-VN")}₫`,
      `• Tiền cọc: ${depositTotal.toLocaleString("vi-VN")}₫`,
    ];
    
    if (totalDiscountAmount > 0) {
      paymentDetails.push(`• Giảm giá: -${totalDiscountAmount.toLocaleString("vi-VN")}₫`);
    }
    
    paymentDetails.push(`\n💰 Tổng cộng: ${grandTotal.toLocaleString("vi-VN")}₫`);
    
    const message = `Bạn có chắc chắn muốn thanh toán ${selectedCartItems.length} sản phẩm?\n\n${paymentDetails.join("\n")}\n\n⚠️ Sau khi xác nhận, tiền sẽ được trừ từ ví của bạn.`;
    
    setConfirmPopup({
      isOpen: true,
      title: "Xác nhận thanh toán",
      message: message,
      onConfirm: processPayment,
    });
  };


    if (!cartItems.length) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Package className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-500">Đang tải...</p>
        </div>
      );
    }

    // Breadcrumb data
    const breadcrumbs = [
      { label: "Trang chủ", href: "/home", icon: Home },
      { label: "Giỏ hàng", href: "/auth/cartitem", icon: ShoppingCart },
      { label: "Xác nhận thuê đồ", href: "/auth/order", icon: Truck },
    ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6">
            <div className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((breadcrumb, index) => {
                const IconComponent = breadcrumb.icon;
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <div
                    key={breadcrumb.href}
                    className="flex items-center space-x-2"
                  >
                    {index > 0 && (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}

                    {isLast ? (
                      <span className="flex items-center space-x-1 text-gray-900 font-medium">
                        {IconComponent && <IconComponent className="w-4 h-4" />}
                        <span>{breadcrumb.label}</span>
                      </span>
                    ) : (
                      <Link
                        href={breadcrumb.href}
                        className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {IconComponent && <IconComponent className="w-4 h-4" />}
                        <span>{breadcrumb.label}</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-100 rounded-2xl mb-4">
              <Truck className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
              Xác nhận thuê đồ
            </h1>
            <p className="text-lg text-gray-600">
              Kiểm tra thông tin trước khi thanh toán
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left column: products + address */}
            <div className="lg:col-span-2 space-y-6">
              {/* Products */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="font-bold text-xl mb-6 flex items-center gap-3">
                  <Package className="w-7 h-7 text-blue-600" />
                  Sản phẩm thuê ({cartItems.length})
                </h2>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-emerald-200 shadow-sm">
                      <CheckCircle2 className={`w-4 h-4 ${selectedItemIds.length > 0 ? "text-emerald-600" : "text-gray-400"}`} />
                      <span className="text-sm font-semibold text-gray-700">
                        Đã chọn <span className="text-emerald-600">{selectedItemIds.length}</span>/{cartItems.length} sản phẩm
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleSelectAllItems}
                      disabled={cartItems.length === 0 || selectedItemIds.length === cartItems.length}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      Chọn tất cả
                    </button>
                    <button
                      onClick={handleDeselectAllItems}
                      disabled={selectedItemIds.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all transform hover:scale-105 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-sm"
                    >
                      <X className="w-4 h-4" />
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentItems.map((item) => {
                    const isSelected = selectedItemIds.includes(item._id);
                    const days = calculateRentalDays(item);
                    const itemTotal = item.basePrice * item.quantity * days;
                    const itemDeposit = item.depositAmount * item.quantity;

                    return (
                      <div
                        key={item._id}
                        className={`group relative flex gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${
                          isSelected
                            ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-white shadow-xl ring-2 ring-emerald-200"
                            : "bg-white border-gray-200 hover:border-emerald-300 hover:shadow-lg"
                        }`}
                      >
                        {/* Checkbox at the beginning */}
                        <div className="flex-shrink-0 pt-1">
                          <label className="relative flex items-center justify-center cursor-pointer group/checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItemSelection(item._id)}
                              className="sr-only peer"
                              aria-label={`Chọn sản phẩm ${item.title}`}
                            />
                            <div className={`relative w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                              isSelected
                                ? "bg-emerald-600 border-emerald-600 shadow-md scale-110"
                                : "bg-white border-gray-300 group-hover/checkbox:border-emerald-400 group-hover/checkbox:bg-emerald-50"
                            }`}>
                              {isSelected && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                          </label>
                        </div>

                        {/* Product Image */}
                        <div className={`relative bg-gray-100 rounded-xl w-32 h-32 flex-shrink-0 overflow-hidden ring-2 transition-all ${
                          isSelected
                            ? "ring-emerald-300 shadow-md"
                            : "ring-gray-200 group-hover:ring-emerald-200"
                        }`}>
                          {item.primaryImage ? (
                            <Image
                              src={item.primaryImage}
                              alt={item.title}
                              fill
                              sizes="128px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-14 h-14" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full p-1 shadow-lg animate-pulse">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Product Content */}
                        <div className="flex-1 space-y-4 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-xl font-bold line-clamp-2 mb-2 transition-colors ${
                                isSelected
                                  ? "text-emerald-800"
                                  : "text-gray-800 group-hover:text-emerald-700"
                              }`}>
                                {item.title}
                              </h3>
                              <p className="text-sm text-gray-500 line-clamp-2">
                                {item.shortDescription}
                              </p>
                            </div>
                          </div>

                          {/* Quantity Controls - chỉnh sửa trực tiếp */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">Số lượng:</span>
                            <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-2 border border-gray-200">
                              <button
                                onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                                disabled={updatingItems.has(item._id) || item.quantity <= 1}
                                className="text-gray-700 hover:text-emerald-600 hover:bg-white h-8 w-8 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                title="Giảm số lượng"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-gray-800 font-bold w-10 text-center text-lg">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                                disabled={updatingItems.has(item._id) || item.quantity >= item.availableQuantity}
                                className="text-gray-700 hover:text-emerald-600 hover:bg-white h-8 w-8 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                title="Tăng số lượng"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            {updatingItems.has(item._id) && (
                              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                            )}
                          </div>

                          {/* Rental Dates - chỉnh sửa trực tiếp như cart page */}
                          <div
                            className={`bg-gray-50 px-4 py-3 rounded-lg transition-all duration-300 ${
                              updatingItems.has(item._id)
                                ? "opacity-75 bg-gray-100"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Calendar
                                  className={`w-5 h-5 text-emerald-600 ${
                                    updatingItems.has(item._id)
                                      ? "animate-pulse"
                                      : ""
                                  }`}
                                />
                                <span className="text-base font-medium text-gray-700">
                                  Thời gian thuê:
                                </span>
                                {updatingItems.has(item._id) && (
                                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                                )}
                              </div>
                              {!editingDates[item._id] &&
                                !updatingItems.has(item._id) && (
                                  <button
                                    onClick={() =>
                                      startEditingDates(
                                        item._id,
                                        item.rentalStartDate,
                                        item.rentalEndDate
                                      )
                                    }
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-6 px-2 rounded transition-all duration-200 text-xs flex items-center gap-1"
                                    title="Chỉnh sửa"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Chỉnh sửa</span>
                                  </button>
                                )}
                            </div>

                            {editingDates[item._id] ? (
                              // Edit mode
                              <div className="space-y-3">
                                <RentalDatePicker
                                  rentalStartDate={editingDates[item._id].rentalStartDateTime}
                                  rentalEndDate={editingDates[item._id].rentalEndDateTime}
                                  onStartDateChange={(value) =>
                                    updateEditingDates(
                                      item._id,
                                      "rentalStartDateTime",
                                      value
                                    )
                                  }
                                  onEndDateChange={(value) =>
                                    updateEditingDates(
                                      item._id,
                                      "rentalEndDateTime",
                                      value
                                    )
                                  }
                                  startDateError={itemErrors[item._id]?.rentalStartDate}
                                  endDateError={itemErrors[item._id]?.rentalEndDate}
                                  size="sm"
                                  showLabel={false}
                                  disabled={updatingItems.has(item._id)}
                                  itemId={item.itemId}
                                />
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() =>
                                      updateRentalDates(
                                        item._id,
                                        editingDates[item._id].rentalStartDateTime,
                                        editingDates[item._id].rentalEndDateTime
                                      )
                                    }
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs rounded transition-all duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={updatingItems.has(item._id)}
                                  >
                                    {updatingItems.has(item._id) ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Đang lưu...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3 h-3" />
                                        Lưu
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => cancelEditingDates(item._id)}
                                    className="border border-gray-300 text-gray-600 hover:bg-gray-50 h-7 px-3 text-xs rounded transition-all duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={updatingItems.has(item._id)}
                                  >
                                    <X className="w-3 h-3" />
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Display mode
                              <div
                                className={`transition-all duration-300 ${
                                  updatingItems.has(item._id)
                                    ? "opacity-60"
                                    : "opacity-100"
                                }`}
                              >
                                {item.rentalStartDate && item.rentalEndDate ? (
                                  <div className="text-sm text-gray-700">
                                    {(() => {
                                      const startDate = new Date(item.rentalStartDate);
                                      const endDate = new Date(item.rentalEndDate);
                                      const hasTime =
                                        item.rentalStartDate.includes("T") ||
                                        item.rentalEndDate.includes("T");

                                      if (hasTime) {
                                        return `${startDate.toLocaleDateString(
                                          "vi-VN"
                                        )} ${startDate.toLocaleTimeString(
                                          "vi-VN",
                                          { hour: "2-digit", minute: "2-digit" }
                                        )} - ${endDate.toLocaleDateString(
                                          "vi-VN"
                                        )} ${endDate.toLocaleTimeString(
                                          "vi-VN",
                                          { hour: "2-digit", minute: "2-digit" }
                                        )}`;
                                      } else {
                                        return `${startDate.toLocaleDateString(
                                          "vi-VN"
                                        )} - ${endDate.toLocaleDateString("vi-VN")}`;
                                      }
                                    })()}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500 italic">
                                    Chưa chọn thời gian thuê
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {item.itemId && (
                            <div className="pt-2">
                              <Link
                                href={`/products/details?id=${item.itemId}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:from-blue-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-semibold"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="w-4 h-4" />
                                <span>Xem chi tiết sản phẩm</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                              </Link>
                            </div>
                          )}

                          <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 bg-gradient-to-r from-emerald-50/50 to-blue-50/50 -mx-6 px-6 pb-2 rounded-b-xl">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Giá thuê:</span>
                              <p className="text-2xl font-bold text-emerald-600">
                                {itemTotal.toLocaleString("vi-VN")}₫
                              </p>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Tiền cọc:</span>
                              <p className="text-xl font-bold text-amber-600">
                                {itemDeposit.toLocaleString("vi-VN")}₫
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {cartItems.length > itemsPerPage && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        currentPage === 1
                        ? "text-gray-400 border-gray-200 cursor-not-allowed bg-gray-50"
                        : "text-gray-700 border-gray-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                        }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                            currentPage === pageNum
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                            : "border-gray-300 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`flex items-center gap-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        currentPage === totalPages
                        ? "text-gray-400 border-gray-200 cursor-not-allowed bg-gray-50"
                        : "text-gray-700 border-gray-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                        }`}
                    >
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {cartItems.length > itemsPerPage && (
                  <div className="mt-3 text-center text-sm text-gray-600">
                    Trang {currentPage} / {totalPages} ({cartItems.length} sản phẩm)
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow">
                <h2 className="font-bold text-xl mb-6 flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg" />
                  <span>Địa chỉ nhận hàng</span>
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      placeholder="Nhập họ và tên"
                      className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition shadow-sm hover:border-gray-300"
                      value={shipping.fullName}
                      onChange={(e) =>
                        setShipping({ ...shipping, fullName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    
                    {/* Phone Options */}
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="phoneOption"
                          checked={useDefaultPhone}
                          onChange={() => setUseDefaultPhone(true)}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">
                          Dùng số mặc định
                          {defaultPhone && (
                            <span className="ml-2 text-emerald-600 font-medium">
                              ({defaultPhone})
                            </span>
                          )}
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="phoneOption"
                          checked={!useDefaultPhone}
                          onChange={() => setUseDefaultPhone(false)}
                          className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">Nhập số mới</span>
                      </label>
                    </div>

                    {/* Phone Input */}
                    {useDefaultPhone ? (
                      <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base text-gray-700">
                        {defaultPhone || "Đang tải số điện thoại..."}
                      </div>
                    ) : (
                      <input
                        type="tel"
                        placeholder="Nhập số điện thoại mới"
                        className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition shadow-sm hover:border-gray-300"
                        value={shipping.phone}
                        onChange={(e) =>
                          setShipping({ ...shipping, phone: e.target.value })
                        }
                      />
                    )}
                  </div>
                </div>

                <div className="mt-6">
                <AddressSelector
                  selectedAddressId={selectedAddressId}
                  onSelect={(addr) => {
                    setSelectedAddressId(addr._id);
                    applyAddressToShipping(addr);
                  }}
                />
              </div>

                {!selectedAddressId && (
                <div className="mt-6 space-y-4">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Địa chỉ (số nhà, đường...) <span className="text-red-500">*</span>
                    </label>
                    <input
                      placeholder="Nhập địa chỉ chi tiết"
                      className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition shadow-sm hover:border-gray-300"
                      value={shipping.street}
                      onChange={(e) =>
                        setShipping({ ...shipping, street: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Phường/Xã
                    </label>
                    <input
                      placeholder="Nhập phường/xã"
                      className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition shadow-sm hover:border-gray-300"
                      value={shipping.ward}
                      onChange={(e) =>
                        setShipping({ ...shipping, ward: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Tỉnh/Thành phố <span className="text-red-500">*</span>
                    </label>
                    <input
                      placeholder="Nhập tỉnh/thành phố"
                      className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition shadow-sm hover:border-gray-300"
                      value={shipping.province}
                      onChange={(e) =>
                        setShipping({ ...shipping, province: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  placeholder="Ví dụ: Giao giờ hành chính, vui lòng gọi trước..."
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none shadow-sm hover:border-gray-300"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          </div>

            {/* Right column: payment summary */}
            <aside className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 text-white rounded-2xl shadow-2xl p-8 sticky top-24 border-2 border-emerald-500/20">
              <h2 className="font-bold text-2xl mb-6 flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span>Tóm tắt thanh toán</span>
              </h2>

              {/* Discount Code Section */}
                <div
                  className="mb-4 bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/20 relative"
                  style={{ zIndex: showDiscountList ? 50 : 1, overflow: showDiscountList ? "visible" : "visible" }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-semibold text-white">
                  Mã giảm giá (Tối đa: 1 công khai + 1 riêng tư)
                </label>
                    <button
                      type="button"
                      onClick={loadAvailableDiscounts}
                      className="text-[10px] font-semibold text-white/80 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loadingDiscounts}
                    >
                      {loadingDiscounts ? "Đang tải..." : "Làm mới"}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {publicDiscount && (
                      <div className="flex items-center justify-between p-2.5 bg-blue-500/20 rounded-lg border border-blue-300/30 shadow-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <CheckCircle2 className="w-4 h-4 text-blue-300 flex-shrink-0" />
                            <span className="font-bold text-white text-sm truncate">
                              {publicDiscount.code}
                            </span>
                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                              Công khai
                            </span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                              publicDiscount.type === "percent"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {publicDiscount.type === "percent"
                                ? `-${publicDiscount.value}%`
                                : `-${publicDiscount.value.toLocaleString("vi-VN")}₫`}
                            </span>
                          </div>
                          <p className="text-[10px] text-blue-100/90 font-medium">
                            Đã giảm: <span className="font-bold">{effectivePublicDiscountAmount.toLocaleString("vi-VN")}₫</span>
                          </p>
                        </div>
                        <button
                          onClick={handleRemovePublicDiscount}
                          className="p-1 text-white/80 hover:text-red-200 hover:bg-red-500/20 rounded transition-all flex-shrink-0"
                          title="Xóa mã công khai"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {privateDiscount && (
                      <div className="flex items-center justify-between p-2.5 bg-purple-500/20 rounded-lg border border-purple-300/30 shadow-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <CheckCircle2 className="w-4 h-4 text-purple-300 flex-shrink-0" />
                            <span className="font-bold text-white text-sm truncate">
                              {privateDiscount.code}
                            </span>
                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">
                              Riêng tư
                            </span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                              privateDiscount.type === "percent"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {privateDiscount.type === "percent"
                                ? `-${privateDiscount.value}%`
                                : `-${privateDiscount.value.toLocaleString("vi-VN")}₫`}
                            </span>
                          </div>
                          <p className="text-[10px] text-purple-100/90 font-medium">
                            Đã giảm: <span className="font-bold">{effectivePrivateDiscountAmount.toLocaleString("vi-VN")}₫</span>
                          </p>
                        </div>
                        <button
                          onClick={handleRemovePrivateDiscount}
                          className="p-1 text-white/80 hover:text-red-200 hover:bg-red-500/20 rounded transition-all flex-shrink-0"
                          title="Xóa mã riêng tư"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                        <div className="flex gap-1.5">
                      <div
                        className="flex-1 relative discount-input-container min-w-0"
                        style={{ zIndex: showDiscountList ? 100 : 1 }}
                      >
                            <input
                              type="text"
                          placeholder={
                            publicDiscount && !privateDiscount
                              ? "Nhập mã riêng tư"
                              : !publicDiscount && privateDiscount
                              ? "Nhập mã công khai"
                              : "Nhập mã giảm giá"
                          }
                              value={discountCode}
                              onChange={(e) => {
                                setDiscountCode(e.target.value.toUpperCase());
                                setDiscountError(null);
                              }}
                          onKeyDown={(e) => {
                                if (e.key === "Enter") {
                              e.preventDefault();
                                  handleApplyDiscount();
                                }
                              }}
                              onFocus={() => setShowDiscountList(true)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white/20 border border-white/30 rounded-lg text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/50"
                            />

                        {showDiscountList && (
                          <div className="absolute top-full left-0 right-0 z-[10000] w-full mt-1 bg-white rounded-lg shadow-2xl border-2 border-emerald-200 max-h-64 overflow-y-auto">
                                <div className="sticky top-0 bg-emerald-50 p-2 border-b border-emerald-200">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-emerald-700">Mã giảm giá có sẵn</p>
                                    <span className="text-[10px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                      {availableDiscounts.length} mã
                                    </span>
                                  </div>
                                </div>
                                {loadingDiscounts ? (
                                  <div className="p-4 text-center">
                                    <div className="inline-block w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <p className="text-xs text-gray-500">Đang tải mã giảm giá...</p>
                                  </div>
                            ) : availableDiscounts.length > 0 ? (
                                  <div className="divide-y divide-gray-100">
                                    {availableDiscounts.map((discount) => {
                                      const now = new Date();
                                      const start = new Date(discount.startAt);
                                      const end = new Date(discount.endAt);
                                      const isInTimeWindow = start <= now && end >= now;
                                      const isUpcoming = start > now;
                                      const isExpired = end < now;
                                      const isAlreadyApplied = Boolean(
                                        (publicDiscount && publicDiscount.code === discount.code) ||
                                        (privateDiscount && privateDiscount.code === discount.code)
                                      );
                                      const canUse = discount.active && isInTimeWindow && !isAlreadyApplied;
                                      
                                      return (
                                        <button
                                          key={discount._id}
                                          onClick={() => canUse && handleSelectDiscount(discount)}
                                          disabled={!canUse}
                                          className={`w-full p-3 text-left transition-all ${
                                            !canUse
                                              ? "bg-gray-50 opacity-60 cursor-not-allowed"
                                              : "hover:bg-emerald-50 hover:shadow-sm"
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                <span className={`font-bold text-sm ${
                                                  !canUse ? "text-gray-500" : "text-emerald-600"
                                                }`}>
                                                  {discount.code}
                                                </span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                                  discount.type === "percent"
                                                    ? "bg-orange-100 text-orange-700"
                                                    : "bg-blue-100 text-blue-700"
                                                }`}>
                                                  {discount.type === "percent"
                                                    ? `-${discount.value}%`
                                                    : `-${discount.value.toLocaleString("vi-VN")}₫`}
                                                </span>
                                                {discount.isPublic ? (
                                                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                                    Công khai
                                                  </span>
                                                ) : (
                                                  <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                                    Riêng tư
                                                  </span>
                                                )}
                                                {isUpcoming && (
                                                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                                    Sắp tới
                                                  </span>
                                                )}
                                                {isExpired && (
                                                  <span className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                                                    Đã hết hạn
                                                  </span>
                                                )}
                                                {!discount.active && (
                                                  <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                                                    Đã tắt
                                                  </span>
                                                )}
                                                {isAlreadyApplied && (
                                                  <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                                    Đã áp dụng
                                                  </span>
                                                )}
                                              </div>
                                              {discount.minOrderAmount && (
                                                <p className="text-[10px] text-gray-600 mt-1">
                                                  <span className="font-medium">Đơn tối thiểu:</span> {discount.minOrderAmount.toLocaleString("vi-VN")}₫
                                                </p>
                                              )}
                                              {discount.maxDiscountAmount && discount.maxDiscountAmount > 0 && (
                                                <p className="text-[10px] text-gray-600">
                                                  <span className="font-medium">Giảm tối đa:</span> {discount.maxDiscountAmount.toLocaleString("vi-VN")}₫
                                                </p>
                                              )}
                                              {canUse && (() => {
                                                const baseAmount = rentalTotal + depositTotal;
                                                const previewAmount = calculateDiscountAmount(
                                                  discount.type,
                                                  discount.value,
                                                  baseAmount,
                                                  discount.maxDiscountAmount
                                                );
                                                return (
                                                  <p className="text-[10px] text-emerald-600 font-bold mt-1.5">
                                                    Sẽ giảm: <span className="text-emerald-700">{previewAmount.toLocaleString("vi-VN")}₫</span>
                                                  </p>
                                                );
                                              })()}
                                            </div>
                                            {canUse && (
                                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                            ) : (
                              <div className="p-4 text-center">
                                <div className="text-gray-400 mb-2">
                                  <Package className="w-8 h-8 mx-auto opacity-50" />
                                </div>
                                <p className="text-xs text-gray-500 font-medium">
                                  Hiện chưa có mã giảm giá khả dụng
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  Vui lòng thử lại sau
                                </p>
                        </div>
                        )}
                      </div>
                    )}
                  </div>

                      <button
                        onClick={() => handleApplyDiscount()}
                        disabled={discountLoading || !discountCode.trim()}
                        className="px-3 py-1.5 bg-white text-emerald-600 rounded-lg hover:bg-white/90 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {discountLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Áp dụng"
                        )}
                      </button>
                    </div>

                    {availableDiscounts.length > 0 && (
                      <button
                        onClick={() => setShowDiscountList((prev) => !prev)}
                        className="text-[10px] text-white/80 hover:text-white transition-colors underline"
                      >
                        {showDiscountList ? "Ẩn" : "Xem"} mã giảm giá có sẵn ({availableDiscounts.length})
                      </button>
                    )}

                    {discountError && <p className="text-[10px] text-red-200">{discountError}</p>}
                    {discountListError && <p className="text-[10px] text-red-200">{discountListError}</p>}
                    {!loadingDiscounts && availableDiscounts.length === 0 && !discountListError && (
                      <p className="text-[10px] text-white/70">Hiện chưa có mã giảm giá khả dụng.</p>
                    )}
                  </div>
              </div>

              <div className="space-y-3 text-base bg-white/10 rounded-xl p-4 backdrop-blur-sm relative" style={{ zIndex: 1 }}>
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-emerald-50">Tiền thuê</span>
                  <span className="font-semibold text-white">
                    {rentalTotal.toLocaleString("vi-VN")}₫
                  </span>
                </div>

                  {totalDiscountAmount > 0 && (
                    <div className="space-y-1">
                      {effectivePublicDiscountAmount > 0 && (
                        <div className="flex justify-between items-center py-1 border-b border-white/10">
                          <span className="text-emerald-50 text-sm">
                            Giảm giá công khai ({publicDiscount?.code})
                      </span>
                          <span className="font-semibold text-emerald-100 text-sm">
                            -{effectivePublicDiscountAmount.toLocaleString("vi-VN")}₫
                          </span>
                        </div>
                      )}
                      {effectivePrivateDiscountAmount > 0 && (
                        <div className="flex justify-between items-center py-1 border-b border-white/10">
                          <span className="text-emerald-50 text-sm">
                            Giảm giá riêng tư ({privateDiscount?.code})
                          </span>
                          <span className="font-semibold text-emerald-100 text-sm">
                            -{effectivePrivateDiscountAmount.toLocaleString("vi-VN")}₫
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-b border-white/20">
                        <span className="text-emerald-50 font-semibold">Tổng giảm giá</span>
                    <span className="font-semibold text-emerald-100">
                          -{totalDiscountAmount.toLocaleString("vi-VN")}₫
                    </span>
                      </div>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-white/20">
                    <span className="text-yellow-200">Phí dịch vụ ({serviceFeeRate}%)</span>
                  <span className="font-semibold text-yellow-100">
                      {serviceFeeAmount.toLocaleString("vi-VN")}₫
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-amber-200">Tiền cọc</span>
                  <span className="font-semibold text-amber-100">
                    {depositTotal.toLocaleString("vi-VN")}₫
                  </span>
                </div>
                {publicDiscount && publicDiscountAmount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-white/20">
                    <span className="text-blue-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Giảm giá công khai ({publicDiscount.code})
                    </span>
                    <span className="font-semibold text-blue-100">
                      -{publicDiscountAmount.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                )}
                {privateDiscount && privateDiscountAmount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-white/20">
                    <span className="text-purple-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Giảm giá riêng tư ({privateDiscount.code})
                    </span>
                    <span className="font-semibold text-purple-100">
                      -{privateDiscountAmount.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                )}
                {totalDiscountAmount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-white/20">
                    <span className="text-green-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Tổng giảm giá
                    </span>
                    <span className="font-semibold text-green-100">
                      -{totalDiscountAmount.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                )}
                <div className="pt-2">
                  <p className="text-xs text-emerald-100 text-center italic">
                    (Hoàn lại tiền cọc sau khi trả đồ)
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-white/20 rounded-xl p-4 backdrop-blur-sm border border-white/30">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">
                    Tổng cộng
                  </span>
                  <span className="text-3xl font-bold text-yellow-200">
                    {grandTotal.toLocaleString("vi-VN")}₫
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="mt-6 w-full bg-white text-emerald-700 font-bold py-4 rounded-xl hover:bg-emerald-50 transition-all transform hover:scale-[1.02] hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-xl border-2 border-white/20"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    <span>Đặt thuê ngay</span>
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-100 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Thanh toán an toàn qua Ví điện tử</span>
              </div>
            </div>
            </aside>
          </div>
        </div>
      </div>
     
      {/* Confirm Popup */}
      {confirmPopup.isOpen && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() =>
              setConfirmPopup({
                isOpen: false,
                title: "",
                message: "",
                onConfirm: () => { },
              })
            }
          />

          {/* Popup */}
          <div className="relative w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl border-2 border-emerald-200 transform transition-all duration-300 scale-100 opacity-100">
            {/* Content */}
            <div className="p-6 text-center">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-12 h-12 text-emerald-600" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {confirmPopup.title}
              </h3>

              {/* Message */}
              <div className="text-base mb-6 leading-relaxed text-gray-700 whitespace-pre-line text-left bg-gray-50 p-4 rounded-lg border border-gray-200">
                {confirmPopup.message}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setConfirmPopup({
                      isOpen: false,
                      title: "",
                      message: "",
                      onConfirm: () => { },
                    })
                  }
                  className="flex-1 py-2.5 px-5 text-base font-semibold rounded-lg transition-all duration-200 hover:scale-105 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    confirmPopup.onConfirm();
                    setConfirmPopup({
                      isOpen: false,
                      title: "",
                      message: "",
                      onConfirm: () => { },
                    });
                  }}
                  className="flex-1 py-2.5 px-5 text-base font-semibold rounded-lg transition-all duration-200 hover:scale-105 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {modal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="font-bold text-lg mb-4 text-emerald-700">{modal.title}</h3>
            <p className="text-gray-800 mb-6">{modal.message}</p>
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl" onClick={() => setModal({ ...modal, open: false })}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Modal thông báo lỗi ví không đủ tiền */}
      {isErrorModalOpen && (
        <PopupModal
          isOpen={isErrorModalOpen}
          onClose={() => {
            console.log("Đóng modal lỗi ví không đủ tiền");
            setIsErrorModalOpen(false);
          }}
          type="error"
          title={errorModalTitle || "Ví không đủ tiền"}
          message={errorModalMessage || "Số dư ví của bạn không đủ để thanh toán đơn hàng này. Vui lòng nạp thêm tiền vào ví."}
          buttonText="Đã hiểu"
          secondaryButtonText="Đến ví"
          onSecondaryButtonClick={() => {
            console.log("Chuyển đến trang ví");
            setIsErrorModalOpen(false);
            router.push("/wallet");
          }}
        />
      )}
    </>
  );
}
