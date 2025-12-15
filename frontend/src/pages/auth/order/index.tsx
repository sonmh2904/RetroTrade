"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import { createOrderAction } from "@/store/order/orderActions";
import {
  removeItemFromCartAction,
  updateCartItemAction,
  fetchCartItems,
} from "@/store/cart/cartActions";
import { getPublicItemById } from "@/services/products/product.api";
import type { CartItem } from "@/services/auth/cartItem.api";
import { RootState } from "@/store/redux_store";
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
  listAvailableDiscounts,
} from "@/services/products/discount/discount.api";
import api from "../../../services/customizeAPI";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { type UserAddress } from "@/services/auth/userAddress.api";
import { payOrderWithWallet } from "@/services/wallet/wallet.api";
import PopupModal from "@/components/ui/common/PopupModal";
import { useAppDispatch } from "@/store/hooks";
import { AddressSelector } from "@/components/ui/auth/address/address-selector";
import RentalDatePicker from "@/components/ui/common/RentalDatePicker";
import {
  CheckoutPhoneInput,
  validateVietnamesePhone,
} from "@/components/ui/auth/checkout-phone-input";
import {
  getExactRentalUnits,
  getBillableUnits,
  validateRentalDuration,
} from "@/utils/rentalTimeCalculator";


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
  const dispatch = useAppDispatch();
  const router = useRouter();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shipping, setShipping] = useState({
    fullName: "",
    street: "",
    ward: "",
    district: "",
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
  const [editingDates, setEditingDates] = useState<
    Record<
      string,
      {
        rentalStartDateTime: string;
        rentalEndDateTime: string;
      }
    >
  >({});
  const [itemErrors, setItemErrors] = useState<
    Record<
      string,
      {
        rentalStartDate?: string;
        rentalEndDate?: string;
      }
    >
  >({});
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
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
    onConfirm: () => {},
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
  const [discountListError, setDiscountListError] = useState<string | null>(
    null
  );
  const [paymentOption, setPaymentOption] = useState<"pay_now" | "pay_later">(
    "pay_now"
  ); //Option payment

  // State để kiểm tra thông tin người dùng
  const [userInfoComplete, setUserInfoComplete] = useState(false);
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);


  // Lấy từ sessionStorage
  useEffect(() => {
    // CHẶN ADMIN & MODERATOR THUÊ ĐỒ
    if (accessToken) {
      try {
        const decoded = decodeToken(accessToken);
        const role = decoded?.role as string | undefined;

        if (role === "admin" || role === "moderator") {
          toast.error(
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="font-bold text-red-900">
                  Tài khoản quản trị không được phép thuê đồ!
                </div>
                <div className="text-sm text-red-700 mt-1">
                  Vui lòng sử dụng tài khoản người dùng thường.
                </div>
              </div>
            </div>,
            {
              duration: 8000,
              position: "top-center",
              style: {
                background: "#fef2f2",
                border: "2px solid #fca5a5",
                borderRadius: "12px",
                padding: "16px",
              },
            }
          );

          // Tự động chuyển hướng về trang chủ sau 3s
          const timer = setTimeout(() => {
            router.replace("/home");
          }, 3000);

          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error("Decode token error:", err);
      }
    }

    // LOAD CHECKOUT ITEMS (logic cũ + cải thiện UX)
    const itemsStr = sessionStorage.getItem("checkoutItems");
    if (!itemsStr) {
      toast.error("Giỏ hàng trống. Hãy thêm sản phẩm trước khi thanh toán!", {
        duration: 5000,
      });
      router.push("/auth/cartitem");
      return;
    }

    const loadCheckoutItems = async () => {
      try {
        const items: CartItem[] = JSON.parse(itemsStr);

        const invalidItem = items.find(
          (i) => !i.rentalStartDate || !i.rentalEndDate
        );

        if (invalidItem) {
          toast.error(
            <>
              <strong>{invalidItem.title}</strong> chưa có ngày thuê hợp lệ
            </>,
            {
              description: "Vui lòng quay lại giỏ hàng để chọn ngày thuê",
              duration: 6000,
            }
          );
          router.push("/auth/cartitem");
          return;
        }

        // Fetch availableQuantity trực tiếp từ product API cho từng item
        try {
          const itemsWithFreshQuantity = await Promise.all(
            items.map(async (item) => {
              try {
                // Fetch product details từ API bằng itemId
                const productResponse = await getPublicItemById(item.itemId);
                const productData = productResponse?.data || productResponse;
                
                // Lấy availableQuantity từ product (có thể là AvailableQuantity hoặc Quantity)
                const freshAvailableQuantity = 
                  productData?.AvailableQuantity ?? 
                  productData?.availableQuantity ?? 
                  productData?.Quantity ?? 
                  productData?.quantity ?? 
                  item.availableQuantity; // Fallback về giá trị cũ nếu không có
                
                return {
                  ...item,
                  availableQuantity: freshAvailableQuantity,
                };
              } catch (productError) {
                // Nếu không fetch được product, giữ nguyên availableQuantity cũ
                console.warn(`Could not fetch product ${item.itemId}:`, productError);
                return item;
              }
            })
          );

          // Validate số lượng sau khi có availableQuantity mới
          const invalidQuantityItems = itemsWithFreshQuantity.filter(
            (item) => item.quantity > item.availableQuantity
          );

          if (invalidQuantityItems.length > 0) {
            invalidQuantityItems.forEach((item) => {
              toast.error(
                `"${item.title}": Số lượng (${item.quantity}) vượt quá số lượng có sẵn (${item.availableQuantity}). Đã tự động điều chỉnh.`
              );
            });
            
            // Tự động điều chỉnh số lượng về availableQuantity
            const adjustedItems = itemsWithFreshQuantity.map((item) => {
              if (item.quantity > item.availableQuantity) {
                return {
                  ...item,
                  quantity: item.availableQuantity,
                };
              }
              return item;
            });
            
            setCartItems(adjustedItems);
            sessionStorage.setItem("checkoutItems", JSON.stringify(adjustedItems));
          } else {
            setCartItems(itemsWithFreshQuantity);
            sessionStorage.setItem("checkoutItems", JSON.stringify(itemsWithFreshQuantity));
          }
        } catch (fetchError) {
          // Nếu không fetch được, dùng items từ sessionStorage
          console.warn("Could not fetch fresh product data, using sessionStorage data:", fetchError);
          setCartItems(items);
        }

        setSelectedItemIds(items.map((item) => item._id));
        setHasInitializedSelection(true);
      } catch (err) {
        console.error("Error parsing checkout items from sessionStorage:", err);
        toast.error("Dữ liệu giỏ hàng bị lỗi", {
          description: "Đang làm mới giỏ hàng...",
        });
        sessionStorage.removeItem("checkoutItems");
        router.push("/auth/cartitem");
      }
    };

    loadCheckoutItems();
  }, [accessToken, router]);

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
    setShipping((prev) => ({
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
        setShipping((prev) => ({
          ...prev,
          fullName: decoded.fullName || "",
        }));
      }
    }
  }, [selectedAddressId, shipping.fullName, accessToken]);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        let fullName = "";
        let phone = "";

        // Get fullName from token
        const decoded = decodeToken(accessToken);
        if (decoded?.fullName) {
          fullName = decoded.fullName || "";
        }

        // Get phone from user profile
        const profileResponse = await getUserProfile();
        const userProfile = profileResponse?.user || profileResponse?.data;
        
        if (userProfile) {
          // Ưu tiên lấy từ profile, nếu không có thì lấy từ token
          if (userProfile.fullName) {
            fullName = userProfile.fullName;
          }
          if (userProfile.phone) {
            phone = userProfile.phone;
          }
        }

        // Cập nhật shipping info
        setShipping((prev) => ({
          ...prev,
          fullName: fullName,
          phone: phone,
        }));
        setDefaultPhone(phone);

        // Kiểm tra xem có đủ thông tin không
        if (!fullName || !phone) {
          setUserInfoComplete(false);
          setShowMissingInfoModal(true);
        } else {
          setUserInfoComplete(true);
        }
      } catch (error) {
        console.error("Error loading user info:", error);
        setUserInfoComplete(false);
        setShowMissingInfoModal(true);
      }
    };

    if (accessToken) {
      loadUserInfo();
    }
  }, [accessToken]);

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
        // Gộp cả public và special discounts vào một mảng
        const allDiscounts = [
          ...(response.data.public || []),
          ...(response.data.special || []),
        ];
        setAvailableDiscounts(allDiscounts);
      } else {
        setDiscountListError(
          response.message || "Không thể tải danh sách mã giảm giá."
        );
      }
    } catch (error) {
      console.error("Error loading available discounts:", error);
      setDiscountListError(
        "Không thể tải danh sách mã giảm giá. Vui lòng thử lại."
      );
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
      if (!target.closest(".discount-input-container")) {
        setShowDiscountList(false);
      }
    };

    if (showDiscountList) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDiscountList]);

  // Cache tính toán billableUnits và exactUnits cho tất cả items (chỉ tính 1 lần)
  const itemsCalculations = useMemo(() => {
    const calculations = new Map<string, { billableUnits: number; exactUnits: number }>();
    
    cartItems.forEach((item) => {
      const exactUnits = getExactRentalUnits(item);
      const billableUnits = getBillableUnits(item);
      calculations.set(item._id, { billableUnits, exactUnits });
    });
    
    return calculations;
  }, [cartItems]);

  // Helper function để lấy billableUnits từ cache
  const getCachedBillableUnits = useCallback((item: CartItem): number => {
    return itemsCalculations.get(item._id)?.billableUnits ?? getBillableUnits(item);
  }, [itemsCalculations]);

  // Memoize selectedItemIds as Set for O(1) lookup
  const selectedItemIdsSet = useMemo(
    () => new Set(selectedItemIds),
    [selectedItemIds]
  );

  // Memoize selected cart items
  const selectedCartItems = useMemo(
    () => cartItems.filter((item) => selectedItemIdsSet.has(item._id)),
    [cartItems, selectedItemIdsSet]
  );

  // Memoize pagination calculations
  const totalPages = useMemo(
    () => Math.ceil(cartItems.length / itemsPerPage),
    [cartItems.length, itemsPerPage]
  );

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return cartItems.slice(startIndex, endIndex);
  }, [cartItems, currentPage, itemsPerPage]);

  // Memoize rental calculations
  const rentalTotal = useMemo(() => {
    return selectedCartItems.reduce((sum, item) => {
      const days = getCachedBillableUnits(item);
      return sum + item.basePrice * item.quantity * days;
    }, 0);
  }, [selectedCartItems, getCachedBillableUnits]);

  const depositTotal = useMemo(
    () =>
      selectedCartItems.reduce(
        (sum, item) => sum + item.depositAmount * item.quantity,
        0
      ),
    [selectedCartItems]
  );

  const serviceFeeAmount = useMemo(
    () => (rentalTotal * serviceFeeRate) / 100,
    [rentalTotal, serviceFeeRate]
  );

  // Memoize discount calculations
  const effectivePublicDiscountAmount = useMemo(
    () => (selectedCartItems.length > 0 ? publicDiscountAmount : 0),
    [selectedCartItems.length, publicDiscountAmount]
  );

  const effectivePrivateDiscountAmount = useMemo(
    () => (selectedCartItems.length > 0 ? privateDiscountAmount : 0),
    [selectedCartItems.length, privateDiscountAmount]
  );

  const totalDiscountAmount = useMemo(
    () => effectivePublicDiscountAmount + effectivePrivateDiscountAmount,
    [effectivePublicDiscountAmount, effectivePrivateDiscountAmount]
  );

  // Memoize grand total
  const grandTotal = useMemo(
    () =>
      Math.max(
        0,
        rentalTotal - totalDiscountAmount + depositTotal + serviceFeeAmount
      ),
    [rentalTotal, totalDiscountAmount, depositTotal, serviceFeeAmount]
  );

  // Kiểm tra minOrderAmount cho public discount (chỉ kiểm tra trên tiền thuê)
  useEffect(() => {
    if (
      publicDiscount &&
      publicDiscount.minOrderAmount &&
      rentalTotal < publicDiscount.minOrderAmount
    ) {
      setPublicDiscount(null);
      setPublicDiscountAmount(0);
      toast.info(
        "Đơn hàng không còn đáp ứng điều kiện tối thiểu của mã giảm giá công khai đã chọn."
      );
    }
  }, [publicDiscount, rentalTotal]);

  // Kiểm tra minOrderAmount cho private discount (chỉ kiểm tra trên tiền thuê còn lại)
  useEffect(() => {
    if (privateDiscount && privateDiscount.minOrderAmount) {
      const baseAmountAfterPublic = Math.max(
        0,
        rentalTotal - publicDiscountAmount
      );
      if (baseAmountAfterPublic < privateDiscount.minOrderAmount) {
        setPrivateDiscount(null);
        setPrivateDiscountAmount(0);
        toast.info(
          "Đơn hàng không còn đáp ứng điều kiện tối thiểu của mã giảm giá riêng tư đã chọn."
        );
      }
    }
  }, [privateDiscount, rentalTotal, publicDiscountAmount]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [totalPages]
  );

  const handleToggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const prevSet = new Set(prev);
      if (prevSet.has(itemId)) {
        prevSet.delete(itemId);
      } else {
        prevSet.add(itemId);
      }
      return Array.from(prevSet);
    });
  }, []);

  const handleSelectAllItems = useCallback(() => {
    setSelectedItemIds(cartItems.map((item) => item._id));
  }, [cartItems]);

  const handleDeselectAllItems = useCallback(() => {
    setSelectedItemIds([]);
  }, []);

  // Helper function to calculate discount amount (same logic as backend)
  const calculateDiscountAmount = useCallback(
    (
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
    },
    []
  );

  // Tự động tính lại public discount amount khi rentalTotal thay đổi
  useEffect(() => {
    if (publicDiscount && selectedCartItems.length > 0) {
      const newAmount = calculateDiscountAmount(
        publicDiscount.type,
        publicDiscount.value,
        rentalTotal,
        publicDiscount.maxDiscountAmount
      );
      setPublicDiscountAmount(newAmount);
    }
  }, [rentalTotal, publicDiscount, selectedCartItems.length, calculateDiscountAmount]);

  // Tự động tính lại private discount amount khi rentalTotal hoặc publicDiscountAmount thay đổi
  useEffect(() => {
    if (privateDiscount && selectedCartItems.length > 0) {
      const baseAmountAfterPublic = Math.max(
        0,
        rentalTotal - publicDiscountAmount
      );
      const newAmount = calculateDiscountAmount(
        privateDiscount.type,
        privateDiscount.value,
        baseAmountAfterPublic,
        privateDiscount.maxDiscountAmount
      );
      setPrivateDiscountAmount(newAmount);
    }
  }, [rentalTotal, publicDiscountAmount, privateDiscount, selectedCartItems.length, calculateDiscountAmount]);

  // Handle discount code
  const handleApplyDiscount = async (code?: string) => {
    const codeToApply = code || discountCode.trim();
    if (!codeToApply) {
      setDiscountError("Vui lòng nhập mã giảm giá");
      return;
    }

    if (selectedCartItems.length === 0) {
      setDiscountError(
        "Vui lòng chọn ít nhất một sản phẩm để áp dụng mã giảm giá"
      );
      return;
    }

    setDiscountLoading(true);
    setDiscountError(null);

    try {
      // Tính discount chỉ dựa trên tiền thuê (không bao gồm tiền cọc)
      // Nếu đang áp dụng mã riêng tư và đã có mã công khai, validate trực tiếp với tiền thuê còn lại
      let baseAmountForDiscount = rentalTotal;
      let isPrivateDiscountWithPublic = false;

      // Validate lần đầu để kiểm tra mã có hợp lệ không
      const response = await validateDiscount({
        code: codeToApply.toUpperCase(),
        baseAmount: baseAmountForDiscount,
      });

      if (response.status === "success" && response.data) {
        const discount = response.data.discount;
        let amount = response.data.amount || 0;

        // Nếu là mã riêng tư và đã có mã công khai, cần validate lại với tiền thuê còn lại
        if (!discount.isPublic && publicDiscountAmount > 0) {
          isPrivateDiscountWithPublic = true;
          baseAmountForDiscount = Math.max(
            0,
            rentalTotal - publicDiscountAmount
          );
        }

        // Tính lại discount amount để đảm bảo chính xác
        const calculatedAmount = calculateDiscountAmount(
          discount.type,
          discount.value,
          baseAmountForDiscount,
          discount.maxDiscountAmount
        );
        amount = calculatedAmount;

        // Kiểm tra loại discount (public hay private)
        if (discount.isPublic) {
          // Mã công khai - chỉ cho phép 1 mã công khai
          if (publicDiscount) {
            setDiscountError(
              "Bạn đã áp dụng mã công khai. Chỉ được áp dụng 1 mã công khai."
            );
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

          // Nếu đã có mã private, tính lại mã private với baseAmount mới (chỉ trên tiền thuê còn lại)
          if (privateDiscount) {
            const baseAmountAfterPublic = Math.max(0, rentalTotal - amount);
            try {
              const revalidatePrivateResponse = await validateDiscount({
                code: privateDiscount.code.toUpperCase(),
                baseAmount: baseAmountAfterPublic,
              });
              if (
                revalidatePrivateResponse.status === "success" &&
                revalidatePrivateResponse.data
              ) {
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
            setDiscountError(
              "Bạn đã áp dụng mã riêng tư. Chỉ được áp dụng 1 mã riêng tư."
            );
            setDiscountLoading(false);
            return;
          }
          // Không được có mã private nếu đã có mã public có cùng code
          if (publicDiscount && publicDiscount.code === discount.code) {
            setDiscountError("Mã này đã được áp dụng");
            setDiscountLoading(false);
            return;
          }

          // Nếu đã có mã công khai, validate lại với tiền thuê còn lại
          if (isPrivateDiscountWithPublic) {
            try {
              const revalidateResponse = await validateDiscount({
                code: discount.code.toUpperCase(),
                baseAmount: baseAmountForDiscount, // Đã được tính = rentalTotal - publicDiscountAmount
              });
              if (
                revalidateResponse.status === "success" &&
                revalidateResponse.data
              ) {
                // Sử dụng amount từ revalidate (tính trên tiền thuê còn lại)
                amount = revalidateResponse.data.amount;
              } else {
                // Nếu revalidate thất bại, hiển thị lý do cụ thể
                const errorMsg =
                  revalidateResponse.message ||
                  "Mã giảm giá riêng tư không thể áp dụng sau khi trừ mã công khai";
                const reason = (revalidateResponse as { reason?: string })
                  .reason;
                let detailedMessage = errorMsg;

                if (reason === "BELOW_MIN_ORDER") {
                  const discountInfo = availableDiscounts.find(
                    (d) => d.code === discount.code.toUpperCase()
                  );
                  if (discountInfo?.minOrderAmount) {
                    const needed =
                      discountInfo.minOrderAmount - baseAmountForDiscount;
                    detailedMessage = `Đơn hàng cần thêm ${needed.toLocaleString(
                      "vi-VN"
                    )}₫ tiền thuê để áp dụng mã này sau khi trừ mã công khai (Tối thiểu: ${discountInfo.minOrderAmount.toLocaleString(
                      "vi-VN"
                    )}₫, Tiền thuê còn lại: ${baseAmountForDiscount.toLocaleString(
                      "vi-VN"
                    )}₫)`;
                  } else {
                    detailedMessage = `Đơn hàng chưa đạt mức tối thiểu để áp dụng mã này sau khi trừ mã công khai (Tiền thuê còn lại: ${baseAmountForDiscount.toLocaleString(
                      "vi-VN"
                    )}₫)`;
                  }
                }

                setDiscountError(detailedMessage);
                setDiscountLoading(false);
                return;
              }
            } catch (e) {
              console.error("Error revalidating private discount:", e);
              setDiscountError(
                "Có lỗi xảy ra khi xác thực mã giảm giá riêng tư"
              );
              setDiscountLoading(false);
              return;
            }
          } else {
            // Không có mã công khai, tính lại amount với baseAmount chính xác
            amount = calculateDiscountAmount(
              discount.type,
              discount.value,
              baseAmountForDiscount,
              discount.maxDiscountAmount
            );
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
              // minOrderAmount được kiểm tra trên tiền thuê (rentalTotal)
              const baseAmount = rentalTotal;
              // Try to get minOrderAmount from available discounts
              const discountInfo = availableDiscounts.find(
                (d) => d.code === codeToApply.toUpperCase()
              );
              if (discountInfo?.minOrderAmount) {
                const needed = discountInfo.minOrderAmount - baseAmount;
                detailedMessage = `Đơn hàng cần thêm ${needed.toLocaleString(
                  "vi-VN"
                )}₫ tiền thuê để áp dụng mã này (Tối thiểu: ${discountInfo.minOrderAmount.toLocaleString(
                  "vi-VN"
                )}₫, Hiện tại: ${baseAmount.toLocaleString("vi-VN")}₫)`;
              } else {
                detailedMessage = `Đơn hàng chưa đạt mức tối thiểu để áp dụng mã này (Hiện tại: ${baseAmount.toLocaleString(
                  "vi-VN"
                )}₫ tiền thuê)`;
              }
              break;
            case "NOT_ALLOWED_USER":
              detailedMessage = "Bạn không có quyền sử dụng mã giảm giá này";
              break;
            case "PER_USER_LIMIT":
              detailedMessage = "Bạn đã sử dụng hết số lần cho phép của mã này";
              break;
            case "OWNER_NOT_MATCH":
              detailedMessage =
                "Mã giảm giá này chỉ áp dụng cho sản phẩm của chủ sở hữu cụ thể";
              break;
            case "ITEM_NOT_MATCH":
              detailedMessage =
                "Mã giảm giá này chỉ áp dụng cho sản phẩm cụ thể";
              break;
            case "ASSIGN_NOT_STARTED":
              detailedMessage =
                "Mã giảm giá riêng tư chưa đến thời gian sử dụng";
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
          response,
        });

        setDiscountError(detailedMessage);
      }
    } catch (error: unknown) {
      console.error("Error applying discount:", error);
      let errorMessage = "Có lỗi xảy ra khi áp dụng mã giảm giá";
      if (error && typeof error === "object") {
        const apiError = error as ApiError;
        errorMessage =
          apiError?.response?.data?.message ||
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

  // Quantity controls - sử dụng logic từ cartitem
  const updateQuantity = useCallback(
    async (cartItemId: string, newQuantity: number) => {
      const cartItem = cartItems.find((item) => item._id === cartItemId);
      if (!cartItem) {
        toast.error("Không tìm thấy sản phẩm trong giỏ hàng");
        return;
      }

      // Fetch availableQuantity mới nhất từ product API trước khi validate
      let freshAvailableQuantity = cartItem.availableQuantity;
      try {
        const productResponse = await getPublicItemById(cartItem.itemId);
        const productData = productResponse?.data || productResponse;
        freshAvailableQuantity = 
          productData?.AvailableQuantity ?? 
          productData?.availableQuantity ?? 
          productData?.Quantity ?? 
          productData?.quantity ?? 
          cartItem.availableQuantity;
        
        // Cập nhật availableQuantity trong state
        const updatedCartItems = cartItems.map((item) =>
          item._id === cartItemId
            ? { ...item, availableQuantity: freshAvailableQuantity }
            : item
        );
        setCartItems(updatedCartItems);
        sessionStorage.setItem("checkoutItems", JSON.stringify(updatedCartItems));
      } catch (error) {
        console.warn("Could not fetch fresh availableQuantity, using cached value:", error);
      }

      // Validation checks - giống cartitem
      if (newQuantity <= 0) {
        // Nếu là temp item, xóa khỏi local
        if (cartItemId.startsWith("temp-")) {
          const updatedItems = cartItems.filter((item) => item._id !== cartItemId);
          sessionStorage.setItem("checkoutItems", JSON.stringify(updatedItems));
          setCartItems(updatedItems);
          return;
        }
        // Nếu là real item, xóa khỏi cart
        try {
          await dispatch(removeItemFromCartAction(cartItemId));
          const updatedItems = cartItems.filter((item) => item._id !== cartItemId);
          sessionStorage.setItem("checkoutItems", JSON.stringify(updatedItems));
          setCartItems(updatedItems);
        } catch {
          toast.error("Có lỗi xảy ra khi xóa sản phẩm");
        }
        return;
      }

      if (newQuantity > freshAvailableQuantity) {
        toast.error(`Số lượng không hợp lệ: Hiện tại chỉ có ${freshAvailableQuantity} sản phẩm`);
        return;
      }

      if (newQuantity > 99) {
        toast.error("Số lượng không hợp lệ: Số lượng không được vượt quá 99 sản phẩm");
        return;
      }

      if (!Number.isInteger(newQuantity)) {
        toast.error("Số lượng không hợp lệ: Số lượng phải là số nguyên");
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
        await dispatch(
          updateCartItemAction(cartItemId, { quantity: newQuantity })
        );
        await dispatch(fetchCartItems());

        const updatedItems = cartItems.map((item) =>
          item._id === cartItemId ? { ...item, quantity: newQuantity } : item
        );
        sessionStorage.setItem("checkoutItems", JSON.stringify(updatedItems));
        setCartItems(updatedItems);
      } catch {
        // If API fails, revert the optimistic update
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

  // Immediate UI update for quantity - sử dụng logic từ cartitem
  const handleQuantityChange = async (cartItemId: string, newQuantity: number) => {
    const cartItem = cartItems.find((item) => item._id === cartItemId);
    if (!cartItem) return;

    // Fetch availableQuantity mới nhất từ product API trước khi validate
    let freshAvailableQuantity = cartItem.availableQuantity;
    try {
      const productResponse = await getPublicItemById(cartItem.itemId);
      const productData = productResponse?.data || productResponse;
      freshAvailableQuantity = 
        productData?.AvailableQuantity ?? 
        productData?.availableQuantity ?? 
        productData?.Quantity ?? 
        productData?.quantity ?? 
        cartItem.availableQuantity;
      
      // Cập nhật availableQuantity trong state
      const updatedCartItems = cartItems.map((item) =>
        item._id === cartItemId
          ? { ...item, availableQuantity: freshAvailableQuantity }
          : item
      );
      setCartItems(updatedCartItems);
      sessionStorage.setItem("checkoutItems", JSON.stringify(updatedCartItems));
    } catch (error) {
      console.warn("Could not fetch fresh availableQuantity, using cached value:", error);
    }

    // Quick validation for immediate UI update - giống cartitem
    if (newQuantity <= 0) {
      return;
    }

    if (newQuantity > freshAvailableQuantity) {
      // Don't update UI, show error - giống cartitem
      toast.error(`Số lượng không hợp lệ: Hiện tại chỉ có ${freshAvailableQuantity} sản phẩm`);
      return;
    }

    if (newQuantity > 99) {
      // Don't update UI, show error - giống cartitem
      toast.error("Số lượng không hợp lệ: Số lượng không được vượt quá 99 sản phẩm");
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

  // Helper function to format date to datetime-local format
  const formatToDateTimeLocal = useCallback((isoString?: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    // Lấy giá trị local time thay vì UTC để tránh nhảy thời gian
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  // Helper function to convert datetime-local string to ISO string - từ cartitem
  const convertDateTimeLocalToISO = useCallback((dateTimeLocal: string): string => {
    if (!dateTimeLocal) return "";
    // datetime-local format: "YYYY-MM-DDTHH:mm"
    // Convert to ISO: "YYYY-MM-DDTHH:mm:ss.sssZ"
    const date = new Date(dateTimeLocal);
    return date.toISOString();
  }, []);

  // Dates editing - mượn logic từ cart page
  const startEditingDates = useCallback(
    (cartItemId: string, rentalStartDate?: string, rentalEndDate?: string) => {
      setEditingDates((prev) => ({
        ...prev,
        [cartItemId]: {
          rentalStartDateTime: formatToDateTimeLocal(rentalStartDate),
          rentalEndDateTime: formatToDateTimeLocal(rentalEndDate),
        },
      }));
      setItemErrors((prev) => ({ ...prev, [cartItemId]: {} }));
    },
    [formatToDateTimeLocal]
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

  // Update rental dates - sử dụng logic từ cartitem
  const updateRentalDates = useCallback(
    async (
      cartItemId: string,
      rentalStartDateTime: string,
      rentalEndDateTime: string
    ) => {
      // Validation - giống cartitem
      if (!rentalStartDateTime || !rentalEndDateTime) {
        toast.error("Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc");
        return;
      }

      // Convert datetime-local string to ISO string if needed - từ cartitem
      // RentalDatePicker may return datetime-local format from input
      const startDateISO = rentalStartDateTime.includes("T") && !rentalStartDateTime.includes("Z") && rentalStartDateTime.length === 16
        ? convertDateTimeLocalToISO(rentalStartDateTime)
        : rentalStartDateTime;
      const endDateISO = rentalEndDateTime.includes("T") && !rentalEndDateTime.includes("Z") && rentalEndDateTime.length === 16
        ? convertDateTimeLocalToISO(rentalEndDateTime)
        : rentalEndDateTime;

      const startDate = new Date(startDateISO);
      const endDate = new Date(endDateISO);

      // Validate dates - giống cartitem
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        toast.error("Thời gian thuê không hợp lệ");
        return;
      }

      if (endDate <= startDate) {
        toast.error("Ngày kết thúc phải sau ngày bắt đầu");
        return;
      }

      const diffDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 365) {
        toast.error("Thời gian thuê không được vượt quá 365 ngày");
        return;
      }

      const item = cartItems.find((i) => i._id === cartItemId);
      if (!item) return;

      // Tạo item tạm với thời gian mới để validate
      const tempItemForValidation = {
        ...item,
        rentalStartDate: startDateISO,
        rentalEndDate: endDateISO,
      };

      // VALIDATE CHÍNH XÁC THEO ĐƠN VỊ GIÁ (giờ/ngày/tuần/tháng) với thời gian mới
      const validation = validateRentalDuration(tempItemForValidation);

      if (!validation.isValid) {
        if (validation.exactUnits < validation.min) {
          toast.error(
            `"${item.title}" yêu cầu thuê tối thiểu ${validation.min} ${validation.unitName}.\n` +
              `Bạn chỉ chọn ${validation.exactUnits.toFixed(1)} ${validation.unitName}.`,
            { duration: 8000 }
          );
        } else if (validation.exactUnits > validation.max) {
          toast.error(`"${item.title}" chỉ cho thuê tối đa ${validation.max} ${validation.unitName}.`);
        } else {
          toast.error(`"${item.title}" có thời gian thuê không hợp lệ.`);
        }
        return;
      }

      // Nếu qua hết validate → mới cho lưu
      try {
        setUpdatingItems((prev) => new Set(prev).add(cartItemId));

        if (cartItemId.startsWith("temp-")) {
          const updatedItems = cartItems.map((i) =>
            i._id === cartItemId
              ? {
                  ...i,
                  rentalStartDate: startDateISO,
                  rentalEndDate: endDateISO,
                }
              : i
          );
          sessionStorage.setItem("checkoutItems", JSON.stringify(updatedItems));
          setCartItems(updatedItems);
          cancelEditingDates(cartItemId);
          toast.success("Đã cập nhật thời gian thuê");
          return;
        }

        await dispatch(
          updateCartItemAction(cartItemId, {
            rentalStartDate: startDateISO,
            rentalEndDate: endDateISO,
          })
        );
        
        // Fetch lại từ server để đảm bảo dữ liệu chính xác
        await dispatch(fetchCartItems());

        // Cập nhật với giá trị đã lưu thành công (sử dụng ISO format)
        const updatedItems = cartItems.map((i) =>
          i._id === cartItemId
            ? {
                ...i,
                rentalStartDate: startDateISO,
                rentalEndDate: endDateISO,
              }
            : i
        );
        sessionStorage.setItem("checkoutItems", JSON.stringify(updatedItems));
        setCartItems(updatedItems);

        toast.success("Đã cập nhật thời gian thuê thành công");
        cancelEditingDates(cartItemId);
      } catch {
        toast.error("Có lỗi xảy ra khi cập nhật thời gian thuê");
        dispatch(fetchCartItems());
      } finally {
        setUpdatingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cartItemId);
          return newSet;
        });
      }
    },
    [cartItems, dispatch, cancelEditingDates, convertDateTimeLocalToISO]
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

      // Tính trước grandTotal cho từng sản phẩm riêng (rất quan trọng!)
      const getItemGrandTotal = (item: CartItem) => {
        const itemRental =
          item.basePrice * item.quantity * getCachedBillableUnits(item);
        const itemDeposit = item.depositAmount * item.quantity;
        const itemServiceFee = (itemRental * serviceFeeRate) / 100;

        // Phân bổ giảm giá (nếu có) theo tỷ lệ tiền thuê của item này
        let itemDiscount = 0;
        if (totalDiscountAmount > 0 && rentalTotal > 0) {
          const itemRatio = itemRental / rentalTotal;
          itemDiscount = Math.floor(totalDiscountAmount * itemRatio);
        }

        return Math.max(
          0,
          itemRental - itemDiscount + itemDeposit + itemServiceFee
        );
      };

      for (const item of itemsToProcess) {
        console.log("Bắt đầu xử lý cho:", item.title);

        // Validate rental dates
        if (!item.rentalStartDate || !item.rentalEndDate) {
          toast.error(
            `Vui lòng chọn thời gian thuê cho sản phẩm: ${item.title}`
          );
          failedItemMessages.push(item.title);
          failedItemIds.push(item._id);
          continue;
        }

        // Tạo đơn hàng
        const result = await dispatch(
          createOrderAction({
            itemId: item.itemId,
            unitCount: getCachedBillableUnits(item),
            startAt: item.rentalStartDate,
            endAt: item.rentalEndDate,
            shippingAddress: {
              ...shipping,
              district: shipping.ward || "",
            },
            paymentMethod: "Wallet",
            note,
            discountCode: privateDiscount?.code || publicDiscount?.code,
          })
        );

        if (!result?.success) {
          const errorMessage = result?.error || "Không thể tạo đơn hàng";
          toast.error(`Tạo đơn thất bại: ${item.title} - ${errorMessage}`);
          failedItemMessages.push(item.title);
          failedItemIds.push(item._id);
          continue;
        }

        const orderId = result.data?._id || result.data?.orderId;
        if (!orderId) {
          toast.error(
            `Lỗi hệ thống: Không lấy được ID đơn hàng cho ${item.title}`
          );
          failedItemMessages.push(item.title);
          failedItemIds.push(item._id);
          continue;
        }

        console.log("Đã tạo đơn:", orderId);

        // Nếu chọn "Thanh toán sau" → xong, bỏ qua thanh toán
        if (paymentOption === "pay_later") {
          console.log("Thanh toán sau → không trừ ví");

          // Xóa khỏi giỏ (nếu không phải temp)
          if (!item._id.startsWith("temp-")) {
            try {
              await dispatch(removeItemFromCartAction(item._id));
            } catch (e) {
              console.error("Remove cart item failed:", e);
            }
          }
          continue;
        }

        // CHỈ VÀO ĐÂY KHI CHỌN "THANH TOÁN NGAY"
        // Tính số tiền cần trừ cho chính xác từng đơn (không dùng grandTotal chung!)
        const amountToPay = getItemGrandTotal(item);

        try {
          const paymentResult = await payOrderWithWallet(orderId);

          if (!paymentResult?.success) {
            const msg =
              paymentResult?.message ||
              paymentResult?.error ||
              "Thanh toán thất bại";
            toast.error(`Thanh toán thất bại: ${item.title} - ${msg}`);

            // Đặc biệt: nếu ví không đủ → hiện modal + dừng toàn bộ
            if (msg.includes("không đủ") || msg.includes("insufficient")) {
              const balance = paymentResult?.balance ?? 0;
              const required = paymentResult?.required ?? amountToPay;
              const shortage = required - balance;

              // Chỉ hiển thị modal nếu thực sự thiếu tiền (shortage > 0 và required > 0)
              if (shortage > 0 && required > 0) {
                setErrorModalTitle("Ví không đủ tiền");
                setErrorModalMessage(
                  `Số dư ví: ${balance.toLocaleString("vi-VN")}₫\n\n` +
                    `Cần thanh toán: ${required.toLocaleString("vi-VN")}₫\n\n` +
                    `Thiếu: ${shortage.toLocaleString("vi-VN")}₫\n\n` +
                    `Vui lòng nạp thêm tiền để tiếp tục.`
                );
                setIsErrorModalOpen(true);

                // DỪNG LUÔN vòng lặp khi thiếu tiền
                failedItemIds.push(item._id);
                failedItemMessages.push(item.title + " (thiếu tiền ví)");
                break; // ← QUAN TRỌNG: Không xử lý các đơn tiếp theo
              } else {
                // Nếu không thực sự thiếu tiền, chỉ log lỗi thông thường
                failedItemIds.push(item._id);
                failedItemMessages.push(item.title);
              }
            } else {
              failedItemIds.push(item._id);
              failedItemMessages.push(item.title);
            }
            continue;
          }

          console.log("Thanh toán thành công:", orderId);
        } catch (err: unknown) {
          console.error("Lỗi thanh toán ví:", err);

          // Xử lý lỗi không đủ tiền
          const apiError = err as ApiError;
          if (apiError?.response?.data?.balance !== undefined) {
            const balance = apiError.response.data.balance ?? 0;
            const required = apiError.response.data.required ?? amountToPay;
            const shortage = required - balance;

            // Chỉ hiển thị modal nếu thực sự thiếu tiền (shortage > 0 và required > 0)
            if (shortage > 0 && required > 0) {
              setErrorModalTitle("Ví không đủ tiền");
              setErrorModalMessage(
                `Số dư ví: ${balance.toLocaleString("vi-VN")}₫\n\n` +
                  `Cần thanh toán: ${required.toLocaleString("vi-VN")}₫\n\n` +
                  `Thiếu: ${shortage.toLocaleString("vi-VN")}₫`
              );
              setIsErrorModalOpen(true);

              failedItemIds.push(item._id);
              failedItemMessages.push(item.title + " (thiếu tiền ví)");
              break; // Dừng luôn
            } else {
              // Nếu không thực sự thiếu tiền, chỉ log lỗi thông thường
              toast.error(`Thanh toán thất bại: ${item.title}`);
              failedItemIds.push(item._id);
              failedItemMessages.push(item.title);
            }
          } else {
            toast.error(`Thanh toán thất bại: ${item.title}`);
            failedItemIds.push(item._id);
            failedItemMessages.push(item.title);
          }
          continue;
        }

        if (!item._id.startsWith("temp-")) {
          try {
            await dispatch(removeItemFromCartAction(item._id));
          } catch (error) {
            // Ignore errors when removing items from cart
          }
        }
      }

      // KẾT THÚC XỬ LÝ
      const successCount = itemsToProcess.length - failedItemIds.length;

      if (failedItemIds.length === 0) {
        toast.success(
          paymentOption === "pay_now"
            ? "Tất cả đơn hàng đã được thanh toán thành công!"
            : "Tạo đơn thành công! Bạn có thể thanh toán sau trong mục Đơn thuê."
        );

        sessionStorage.removeItem("checkoutItems");
        router.push("/auth/my-orders");
      } else if (successCount > 0) {
        toast.warning(
          `Đã xử lý thành công ${successCount} sản phẩm. ` +
            `${
              failedItemIds.length
            } sản phẩm thất bại: ${failedItemMessages.join(", ")}`
        );

        const remaining = [
          ...unselectedItems,
          ...itemsToProcess.filter((i) => failedItemIds.includes(i._id)),
        ];
        sessionStorage.setItem("checkoutItems", JSON.stringify(remaining));
      } else {
        toast.error("Tất cả đơn hàng đều thất bại. Vui lòng thử lại.");
        sessionStorage.setItem(
          "checkoutItems",
          JSON.stringify([...unselectedItems, ...itemsToProcess])
        );
      }
    } catch (err) {
      console.error("Lỗi checkout:", err);
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    // Kiểm tra thông tin người dùng trước
    if (!shipping.fullName || !shipping.phone) {
      setShowMissingInfoModal(true);
      return;
    }

    // Validate số điện thoại trước khi submit
    const phoneValidationError = validateVietnamesePhone(shipping.phone);
    if (phoneValidationError) {
      toast.error(phoneValidationError);
      return;
    }

    // Check if address is selected or manually filled
    const hasSelectedAddress = selectedAddressId !== null;
    const hasManualAddress = shipping.street && shipping.province;

    if (!hasSelectedAddress && !hasManualAddress) {
      toast.error("Vui lòng chọn địa chỉ đã lưu hoặc nhập địa chỉ mới");
      return;
    }

    if (!shipping.street || !shipping.province) {
      const missingFields = [];
      if (!shipping.street) missingFields.push("Địa chỉ");
      if (!shipping.province) missingFields.push("Tỉnh/Thành phố");

      toast.error(
        `Vui lòng điền đầy đủ thông tin: ${missingFields.join(", ")}`
      );
      return;
    }

    if (selectedCartItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm để đặt thuê");
      return;
    }

    for (const item of selectedCartItems) {
      const validation = validateRentalDuration(item);

      if (!validation.isValid) {
        if (validation.exactUnits < validation.min) {
          toast.error(
            `Sản phẩm "${item.title}" yêu cầu thuê tối thiểu ${validation.min} ${validation.unitName}.\n` +
              `Bạn chỉ chọn ${
                validation.exactUnits === 0 ? "0" : validation.exactUnits.toFixed(1)
              } ${validation.unitName}.`
          );
        } else if (validation.exactUnits > validation.max) {
          toast.error(
            `Sản phẩm "${item.title}" chỉ cho thuê tối đa ${validation.max} ${validation.unitName}.`
          );
        } else {
          toast.error(
            `Sản phẩm "${item.title}" có thời gian thuê không hợp lệ.`
          );
        }
        return;
      }
    }

    // Hiển thị popup xác nhận thanh toán
    const paymentDetails = [
      `• Tiền thuê: ${rentalTotal.toLocaleString("vi-VN")}₫`,
      `• Phí dịch vụ (${serviceFeeRate}%): ${serviceFeeAmount.toLocaleString(
        "vi-VN"
      )}₫`,
      `• Tiền cọc: ${depositTotal.toLocaleString("vi-VN")}₫`,
    ];

    if (totalDiscountAmount > 0) {
      paymentDetails.push(
        `• Giảm giá: -${totalDiscountAmount.toLocaleString("vi-VN")}₫`
      );
    }

    paymentDetails.push(
      `\n💰 Tổng cộng: ${grandTotal.toLocaleString("vi-VN")}₫`
    );

    const warningText =
      paymentOption === "pay_now"
        ? "⚠️ Sau khi xác nhận, tiền sẽ được trừ ngay từ ví của bạn."
        : "✅ Bạn chỉ tạo đơn hàng, chưa bị trừ tiền ví. Có thể thanh toán sau trong mục Đơn thuê.";

    const message = `Bạn có chắc chắn muốn ${
      paymentOption === "pay_now" ? "thanh toán" : "tạo đơn thuê"
    } ${selectedCartItems.length} sản phẩm?\n\n${paymentDetails.join(
      "\n"
    )}\n\n${warningText}`;

    setConfirmPopup({
      isOpen: true,
      title: "Xác nhận thanh toán",
      message: message,
      onConfirm: processPayment,
    });
  };

  // Kiểm tra xem có pop-up nào đang mở không
  const isAnyModalOpen = confirmPopup.isOpen || modal.open || isErrorModalOpen || showMissingInfoModal;

  // Ngăn scroll body khi pop-up mở
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAnyModalOpen]);

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
      <div 
        className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-10 px-6 transition-opacity duration-300 ${
          isAnyModalOpen ? "pointer-events-none opacity-50" : ""
        }`}
      >
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
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          selectedItemIds.length > 0
                            ? "text-emerald-600"
                            : "text-gray-400"
                        }`}
                      />
                      <span className="text-sm font-semibold text-gray-700">
                        Đã chọn{" "}
                        <span className="text-emerald-600">
                          {selectedItemIds.length}
                        </span>
                        /{cartItems.length} sản phẩm
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleSelectAllItems}
                      disabled={
                        cartItems.length === 0 ||
                        selectedItemIds.length === cartItems.length
                      }
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
                    const isSelected = selectedItemIdsSet.has(item._id);
                    const billableUnits = getCachedBillableUnits(item);
                    const itemTotal =
                      item.basePrice * item.quantity * billableUnits;
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
                              onChange={() =>
                                handleToggleItemSelection(item._id)
                              }
                              className="sr-only peer"
                              aria-label={`Chọn sản phẩm ${item.title}`}
                            />
                            <div
                              className={`relative w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                                isSelected
                                  ? "bg-emerald-600 border-emerald-600 shadow-md scale-110"
                                  : "bg-white border-gray-300 group-hover/checkbox:border-emerald-400 group-hover/checkbox:bg-emerald-50"
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                          </label>
                        </div>

                        {/* Product Image */}
                        <div
                          className={`relative bg-gray-100 rounded-xl w-32 h-32 flex-shrink-0 overflow-hidden ring-2 transition-all ${
                            isSelected
                              ? "ring-emerald-300 shadow-md"
                              : "ring-gray-200 group-hover:ring-emerald-200"
                          }`}
                        >
                          {item.primaryImage ? (
                            <Image
                              src={item.primaryImage}
                              alt={item.title}
                              width={128}
                              height={128}
                              className="object-cover w-full h-full"
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
                              <h3
                                className={`text-xl font-bold line-clamp-2 mb-2 transition-colors ${
                                  isSelected
                                    ? "text-emerald-800"
                                    : "text-gray-800 group-hover:text-emerald-700"
                                }`}
                              >
                                {item.title}
                              </h3>
                              <p className="text-sm text-gray-500 line-clamp-2">
                                {item.shortDescription}
                              </p>
                            </div>
                          </div>

                          {/* Quantity Controls - chỉnh sửa trực tiếp */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">
                              Số lượng:
                            </span>
                            <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-2 border border-gray-200">
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    item._id,
                                    item.quantity - 1
                                  )
                                }
                                disabled={
                                  updatingItems.has(item._id) ||
                                  item.quantity <= 1
                                }
                                className="text-gray-700 hover:text-emerald-600 hover:bg-white h-8 w-8 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                title="Giảm số lượng"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-gray-800 font-bold w-10 text-center text-lg">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    item._id,
                                    item.quantity + 1
                                  )
                                }
                                disabled={
                                  updatingItems.has(item._id) ||
                                  item.quantity >= item.availableQuantity
                                }
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

                            {/* ==================== EDIT MODE ==================== */}
                            {editingDates[item._id] ? (
                              <div className="space-y-3">
                                <RentalDatePicker
                                  rentalStartDate={
                                    editingDates[item._id].rentalStartDateTime
                                  }
                                  rentalEndDate={
                                    editingDates[item._id].rentalEndDateTime
                                  }
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
                                  startDateError={
                                    itemErrors[item._id]?.rentalStartDate
                                  }
                                  endDateError={
                                    itemErrors[item._id]?.rentalEndDate
                                  }
                                  size="sm"
                                  showLabel={false}
                                  disabled={updatingItems.has(item._id)}
                                  itemId={item.itemId}
                                />

                                {/* VALIDATION MESSAGE - Gộp vào cùng form */}
                                {(() => {
                                  const tempItem = {
                                    ...item,
                                    rentalStartDate:
                                      editingDates[item._id]
                                        .rentalStartDateTime || "",
                                    rentalEndDate:
                                      editingDates[item._id]
                                        .rentalEndDateTime || "",
                                  };

                                  const validation = validateRentalDuration(tempItem);
                                   
                                  return (
                                    <>
                                      {/* CẢNH BÁO */}
                                      {validation.exactUnits > 0 && !validation.isValid && validation.errorMessage && (
                                        <div className="p-2.5 bg-red-50 border border-red-300 rounded-lg text-red-700 text-xs font-medium flex items-center gap-2 animate-pulse">
                                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                          {validation.errorMessage}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* NÚT LƯU / HỦY */}
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() =>
                                      updateRentalDates(
                                        item._id,
                                        editingDates[item._id]
                                          .rentalStartDateTime,
                                        editingDates[item._id].rentalEndDateTime
                                      )
                                    }
                                    disabled={
                                      updatingItems.has(item._id) ||
                                      getExactRentalUnits({
                                        ...item,
                                        rentalStartDate:
                                          editingDates[item._id]
                                            .rentalStartDateTime,
                                        rentalEndDate:
                                          editingDates[item._id]
                                            .rentalEndDateTime,
                                      }) < (item.minRentalDuration ?? 1)
                                    }
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-4 text-xs rounded font-medium transition-all duration-200 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
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
                                    disabled={updatingItems.has(item._id)}
                                    className="border border-gray-300 text-gray-600 hover:bg-gray-50 h-7 px-4 text-xs rounded font-medium transition-all duration-200 flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <X className="w-3 h-3" />
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* ==================== DISPLAY MODE (giữ nguyên) ==================== */
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
                                      const startDate = new Date(
                                        item.rentalStartDate
                                      );
                                      const endDate = new Date(
                                        item.rentalEndDate
                                      );
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
                                        )} - ${endDate.toLocaleDateString(
                                          "vi-VN"
                                        )}`;
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
                              <span className="text-sm font-medium text-gray-700">
                                Giá thuê:
                              </span>
                              <p className="text-2xl font-bold text-emerald-600">
                                {itemTotal.toLocaleString("vi-VN")}₫
                              </p>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">
                                Tiền cọc:
                              </span>
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
                    Trang {currentPage} / {totalPages} ({cartItems.length} sản
                    phẩm)
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow">
                <h2 className="font-bold text-xl mb-6 flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg" />
                  <span>Địa chỉ nhận hàng</span>
                </h2>

                <div className="space-y-4">
                  {/* Thông tin người dùng (read-only) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 whitespace-nowrap block mb-2">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <div className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                        {shipping.fullName || (
                          <span className="text-gray-400 italic">
                            Chưa có thông tin
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 whitespace-nowrap block mb-2">
                        Số điện thoại <span className="text-red-500">*</span>
                      </label>
                      <div className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                        {shipping.phone || (
                          <span className="text-gray-400 italic">
                            Chưa có thông tin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {(!shipping.fullName || !shipping.phone) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        ⚠️ Vui lòng cập nhật đầy đủ thông tin cá nhân (họ tên và số điện thoại) trong{" "}
                        <Link
                          href="/auth/profile?menu=security"
                          className="font-semibold underline hover:text-amber-900"
                        >
                          trang cá nhân
                        </Link>{" "}
                        để tiếp tục đặt thuê.
                      </p>
                    </div>
                  )}
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
                        Địa chỉ (số nhà, đường...){" "}
                        <span className="text-red-500">*</span>
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
                  style={{
                    zIndex: showDiscountList ? 50 : 1,
                    overflow: showDiscountList ? "visible" : "visible",
                  }}
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
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                publicDiscount.type === "percent"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {publicDiscount.type === "percent"
                                ? `-${publicDiscount.value}%`
                                : `-${publicDiscount.value.toLocaleString(
                                    "vi-VN"
                                  )}₫`}
                            </span>
                          </div>
                          <p className="text-[10px] text-blue-100/90 font-medium">
                            Đã giảm:{" "}
                            <span className="font-bold">
                              {effectivePublicDiscountAmount.toLocaleString(
                                "vi-VN"
                              )}
                              ₫
                            </span>
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
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                privateDiscount.type === "percent"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {privateDiscount.type === "percent"
                                ? `-${privateDiscount.value}%`
                                : `-${privateDiscount.value.toLocaleString(
                                    "vi-VN"
                                  )}₫`}
                            </span>
                          </div>
                          <p className="text-[10px] text-purple-100/90 font-medium">
                            Đã giảm:{" "}
                            <span className="font-bold">
                              {effectivePrivateDiscountAmount.toLocaleString(
                                "vi-VN"
                              )}
                              ₫
                            </span>
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
                                <p className="text-xs font-bold text-emerald-700">
                                  Mã giảm giá có sẵn
                                </p>
                                <span className="text-[10px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  {availableDiscounts.length} mã
                                </span>
                              </div>
                            </div>
                            {loadingDiscounts ? (
                              <div className="p-4 text-center">
                                <div className="inline-block w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                <p className="text-xs text-gray-500">
                                  Đang tải mã giảm giá...
                                </p>
                              </div>
                            ) : availableDiscounts.length > 0 ? (
                              <div className="divide-y divide-gray-100">
                                {availableDiscounts.map((discount) => {
                                  const now = new Date();
                                  const start = new Date(discount.startAt);
                                  const end = new Date(discount.endAt);
                                  const isInTimeWindow =
                                    start <= now && end >= now;
                                  const isUpcoming = start > now;
                                  const isExpired = end < now;
                                  const isAlreadyApplied = Boolean(
                                    (publicDiscount &&
                                      publicDiscount.code === discount.code) ||
                                      (privateDiscount &&
                                        privateDiscount.code === discount.code)
                                  );
                                  const canUse =
                                    discount.active &&
                                    isInTimeWindow &&
                                    !isAlreadyApplied;

                                  return (
                                    <button
                                      key={discount._id}
                                      onClick={() =>
                                        canUse && handleSelectDiscount(discount)
                                      }
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
                                            <span
                                              className={`font-bold text-sm ${
                                                !canUse
                                                  ? "text-gray-500"
                                                  : "text-emerald-600"
                                              }`}
                                            >
                                              {discount.code}
                                            </span>
                                            <span
                                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                                discount.type === "percent"
                                                  ? "bg-orange-100 text-orange-700"
                                                  : "bg-blue-100 text-blue-700"
                                              }`}
                                            >
                                              {discount.type === "percent"
                                                ? `-${discount.value}%`
                                                : `-${discount.value.toLocaleString(
                                                    "vi-VN"
                                                  )}₫`}
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
                                            {discount.isSpecial && (
                                              <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                                                Đặc biệt
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
                                              <span className="font-medium">
                                                Đơn tối thiểu:
                                              </span>{" "}
                                              {discount.minOrderAmount.toLocaleString(
                                                "vi-VN"
                                              )}
                                              ₫
                                            </p>
                                          )}
                                          {discount.maxDiscountAmount &&
                                            discount.maxDiscountAmount > 0 && (
                                              <p className="text-[10px] text-gray-600">
                                                <span className="font-medium">
                                                  Giảm tối đa:
                                                </span>{" "}
                                                {discount.maxDiscountAmount.toLocaleString(
                                                  "vi-VN"
                                                )}
                                                ₫
                                              </p>
                                            )}
                                          {canUse &&
                                            (() => {
                                              // Preview discount chỉ tính trên tiền thuê (rentalTotal)
                                              // Nếu là mã riêng tư và đã có mã công khai, tính trên tiền thuê còn lại
                                              let baseAmount = rentalTotal;
                                              if (
                                                !discount.isPublic &&
                                                publicDiscountAmount > 0
                                              ) {
                                                baseAmount = Math.max(
                                                  0,
                                                  rentalTotal -
                                                    publicDiscountAmount
                                                );
                                              }
                                              const previewAmount =
                                                calculateDiscountAmount(
                                                  discount.type,
                                                  discount.value,
                                                  baseAmount,
                                                  discount.maxDiscountAmount
                                                );
                                              return (
                                                <p className="text-[10px] text-emerald-600 font-bold mt-1.5">
                                                  Sẽ giảm:{" "}
                                                  <span className="text-emerald-700">
                                                    {previewAmount.toLocaleString(
                                                      "vi-VN"
                                                    )}
                                                    ₫
                                                  </span>
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
                        {showDiscountList ? "Ẩn" : "Xem"} mã giảm giá có sẵn (
                        {availableDiscounts.length})
                      </button>
                    )}

                    {discountError && (
                      <p className="text-[10px] text-red-200">
                        {discountError}
                      </p>
                    )}
                    {discountListError && (
                      <p className="text-[10px] text-red-200">
                        {discountListError}
                      </p>
                    )}
                    {!loadingDiscounts &&
                      availableDiscounts.length === 0 &&
                      !discountListError && (
                        <p className="text-[10px] text-white/70">
                          Hiện chưa có mã giảm giá khả dụng.
                        </p>
                      )}
                  </div>
                </div>

                <div
                  className="space-y-3 text-base bg-white/10 rounded-xl p-4 backdrop-blur-sm relative"
                  style={{ zIndex: 1 }}
                >
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
                            -
                            {effectivePublicDiscountAmount.toLocaleString(
                              "vi-VN"
                            )}
                            ₫
                          </span>
                        </div>
                      )}
                      {effectivePrivateDiscountAmount > 0 && (
                        <div className="flex justify-between items-center py-1 border-b border-white/10">
                          <span className="text-emerald-50 text-sm">
                            Giảm giá riêng tư ({privateDiscount?.code})
                          </span>
                          <span className="font-semibold text-emerald-100 text-sm">
                            -
                            {effectivePrivateDiscountAmount.toLocaleString(
                              "vi-VN"
                            )}
                            ₫
                          </span>
                        </div>
                      )}
                      
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-b border-white/20">
                    <span className="text-yellow-200">
                      Phí dịch vụ ({serviceFeeRate}%)
                    </span>
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
                <div className="mt-6 space-y-3">
                  <h3 className="font-semibold text-lg">
                    Phương thức thanh toán
                  </h3>

                  <div className="space-y-2">
                    {/* Thanh toán ngay */}
                    <label className="flex items-center gap-3 cursor-pointer border p-3 rounded-lg">
                      <input
                        type="radio"
                        name="paymentOption"
                        value="pay_now"
                        checked={paymentOption === "pay_now"}
                        onChange={() => setPaymentOption("pay_now")}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium">Thanh toán ngay</p>
                        <p className="text-sm text-amber-200">
                          Thanh toán bằng ví, tiền sẽ bị trừ ngay
                        </p>
                      </div>
                    </label>

                    {/* Thanh toán sau */}
                    <label className="flex items-center gap-3 cursor-pointer border p-3 rounded-lg">
                      <input
                        type="radio"
                        name="paymentOption"
                        value="pay_later"
                        checked={paymentOption === "pay_later"}
                        onChange={() => setPaymentOption("pay_later")}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium">Thanh toán sau</p>
                        <p className="text-sm text-amber-200">
                          Chỉ tạo đơn hàng, thanh toán sau trong mục đơn thuê
                        </p>
                      </div>
                    </label>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop - ngăn chặn tương tác với phần còn lại */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            onClick={() =>
              setConfirmPopup({
                isOpen: false,
                title: "",
                message: "",
                onConfirm: () => {},
              })
            }
            onMouseDown={(e) => e.preventDefault()}
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
                      onConfirm: () => {},
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
                      onConfirm: () => {},
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            onClick={() => setModal({ ...modal, open: false })}
            onMouseDown={(e) => e.preventDefault()}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full text-center z-10">
            <h3 className="font-bold text-lg mb-4 text-emerald-700">
              {modal.title}
            </h3>
            <p className="text-gray-800 mb-6">{modal.message}</p>
            <button
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl"
              onClick={() => setModal({ ...modal, open: false })}
            >
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
            setIsErrorModalOpen(false);
          }}
          type="error"
          title={errorModalTitle || "Ví không đủ tiền"}
          message={
            errorModalMessage ||
            "Số dư ví của bạn không đủ để thanh toán đơn hàng này. Vui lòng nạp thêm tiền vào ví."
          }
          buttonText="Đã hiểu"
          secondaryButtonText="Đến ví"
          onSecondaryButtonClick={() => {
            setIsErrorModalOpen(false);
            router.push("/wallet");
          }}
        />
      )}

      {/* Modal thông báo thiếu thông tin người dùng */}
      {showMissingInfoModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            onClick={() => setShowMissingInfoModal(false)}
            onMouseDown={(e) => e.preventDefault()}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl border-2 border-amber-200 transform transition-all duration-300 scale-100 opacity-100">
            <div className="p-6">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-amber-100 rounded-full">
                  <AlertCircle className="w-12 h-12 text-amber-600" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold mb-3 text-gray-900 text-center">
                Thiếu thông tin cá nhân
              </h3>

              {/* Message */}
              <div className="text-base mb-6 leading-relaxed text-gray-700 text-left bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="mb-3">
                  Để thuê đồ, bạn cần cập nhật đầy đủ thông tin cá nhân:
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  {!shipping.fullName && (
                    <li className="text-amber-700 font-medium">
                      ✗ Họ và tên
                    </li>
                  )}
                  {!shipping.phone && (
                    <li className="text-amber-700 font-medium">
                      ✗ Số điện thoại
                    </li>
                  )}
                </ul>
                <p className="mt-3 text-sm text-gray-600">
                  Vui lòng cập nhật thông tin trong trang cá nhân để tiếp tục đặt thuê.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMissingInfoModal(false);
                    router.push("/auth/cartitem");
                  }}
                  className="flex-1 py-2.5 px-5 text-base font-semibold rounded-lg transition-all duration-200 hover:scale-105 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
                >
                  Quay lại giỏ hàng
                </button>
                <button
                  onClick={() => {
                    setShowMissingInfoModal(false);
                    router.push("/auth/profile?menu=security");
                  }}
                  className="flex-1 py-2.5 px-5 text-base font-semibold rounded-lg transition-all duration-200 hover:scale-105 bg-amber-600 hover:bg-amber-700 text-white shadow-md"
                >
                  Đến trang cá nhân
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
