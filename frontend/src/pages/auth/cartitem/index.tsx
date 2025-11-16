"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/common/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/common/empty-state";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Loader2,
  ChevronRight,
  Home,
  Calendar,
  Edit3,
  Check,
  X,
  Package,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store/redux_store";
import {
  fetchCartItems,
  updateCartItemAction,
  removeItemFromCartAction,
  clearCartAction,
} from "@/store/cart/cartActions";
import { setCartItems } from "@/store/cart/cartReducer";
import PopupModal from "@/components/ui/common/PopupModal";
import { getCurrentServiceFee } from "@/services/serviceFee/serviceFee.api";
import RentalDatePicker from "@/components/ui/common/RentalDatePicker";


export default function CartPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const {
    items: cartItems,
    loading,
    error,
  } = useSelector((state: RootState) => state.cart);

  // Popup modal state
  const [popupModal, setPopupModal] = useState({
    isOpen: false,
    type: "info" as "error" | "success" | "info",
    title: "",
    message: "",
  });

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Edit rental dates state
  const [editingDates, setEditingDates] = useState<{
    [cartItemId: string]: {
      rentalStartDateTime: string;
      rentalEndDateTime: string;
    };
  }>({});

  // Loading state for individual items
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  // Selected items state for checkout
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // ServiceFee rate state
  const [serviceFeeRate, setServiceFeeRate] = useState<number>(3); // Default 3%

  useEffect(() => {
    dispatch(fetchCartItems());
  }, [dispatch]);

  // Fetch serviceFee rate
  useEffect(() => {
    const fetchServiceFeeRate = async () => {
      try {
        const response = await getCurrentServiceFee();
        if (response.success && response.data) {
          setServiceFeeRate(response.data.serviceFeeRate);
        }
      } catch (error) {
        console.error("Error fetching serviceFee rate:", error);
        // Keep default 3% if error
      }
    };
    fetchServiceFeeRate();
  }, []);

  // Initialize all items as selected when cart items change
  useEffect(() => {
    if (cartItems.length === 0) return;

    const getDisplayKeyLocal = (item: (typeof cartItems)[0]) => {
      if (item.rentalStartDate && item.rentalEndDate) {
        return `${item.itemId}_${item.rentalStartDate}_${item.rentalEndDate}`;
      }
      return item._id;
    };
    const allItemKeys = new Set(
      cartItems.map((item) => getDisplayKeyLocal(item))
    );
    setSelectedItems(allItemKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length]); // Only depend on length to prevent unnecessary updates

  // Breadcrumb data
  const breadcrumbs = [
    { label: "Trang chủ", href: "/", icon: Home },
    { label: "Sản phẩm", href: "/products", icon: null },
    { label: "Giỏ hàng", href: "/auth/cartitem", icon: ShoppingCart },
  ];

  // Handle back navigation
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/products");
    }
  };

  // Show popup modal
  const showPopup = useCallback(
    (type: "error" | "success" | "info", title: string, message: string) => {
      setPopupModal({
        isOpen: true,
        type,
        title,
        message,
      });
    },
    []
  );

  // Close popup modal
  const closePopup = useCallback(() => {
    setPopupModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Show confirm modal
  const showConfirmModal = useCallback(
    (title: string, message: string, onConfirm: () => void) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        onConfirm,
      });
    },
    []
  );

  // Close confirm modal
  const closeConfirmModal = useCallback(() => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    confirmModal.onConfirm();
    closeConfirmModal();
  }, [confirmModal, closeConfirmModal]);

  // Remove item function
  const removeItem = useCallback(
    async (cartItemId: string) => {
      try {
        await dispatch(removeItemFromCartAction(cartItemId));
        showPopup("success", "Thành công", "Đã xóa sản phẩm khỏi giỏ hàng");
      } catch {
        showPopup("error", "Lỗi", "Có lỗi xảy ra khi xóa sản phẩm");
      }
    },
    [dispatch, showPopup]
  );

  // Remove all items function
  const handleRemoveAllClick = useCallback(() => {
    if (cartItems.length === 0) {
      showPopup("info", "Thông báo", "Giỏ hàng của bạn đang trống");
      return;
    }

    showConfirmModal(
      "Xác nhận xóa tất cả",
      `Bạn có chắc chắn muốn xóa tất cả ${cartItems.length} sản phẩm khỏi giỏ hàng?`,
      async () => {
        try {
          await dispatch(clearCartAction());
          setSelectedItems(new Set());
          showPopup("success", "Thành công", "Đã xóa tất cả sản phẩm khỏi giỏ hàng");
        } catch {
          showPopup("error", "Lỗi", "Có lỗi xảy ra khi xóa tất cả sản phẩm");
        }
      }
    );
  }, [cartItems.length, showConfirmModal, showPopup, dispatch]);

  // Update rental dates function
  const updateRentalDates = useCallback(
    async (
      cartItemId: string,
      rentalStartDateTime: string,
      rentalEndDateTime: string
    ) => {
      // Validation
      if (!rentalStartDateTime || !rentalEndDateTime) {
        showPopup(
          "error",
          "Lỗi",
          "Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc"
        );
        return;
      }

      // Convert datetime-local string to ISO string if needed
      // RentalDatePicker may return datetime-local format from input
      const startDateISO = rentalStartDateTime.includes("T") && !rentalStartDateTime.includes("Z") && rentalStartDateTime.length === 16
        ? convertDateTimeLocalToISO(rentalStartDateTime)
        : rentalStartDateTime;
      const endDateISO = rentalEndDateTime.includes("T") && !rentalEndDateTime.includes("Z") && rentalEndDateTime.length === 16
        ? convertDateTimeLocalToISO(rentalEndDateTime)
        : rentalEndDateTime;

      const startDate = new Date(startDateISO);
      const endDate = new Date(endDateISO);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        showPopup(
          "error",
          "Lỗi",
          "Thời gian thuê không hợp lệ"
        );
        return;
      }

      if (endDate <= startDate) {
        showPopup(
          "error",
          "Lỗi",
          "Ngày kết thúc phải sau ngày bắt đầu"
        );
        return;
      }

      const diffDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 365) {
        showPopup(
          "error",
          "Lỗi",
          "Thời gian thuê không được vượt quá 365 ngày"
        );
        return;
      }

      try {
        // Set loading state for this specific item
        setUpdatingItems((prev) => new Set(prev).add(cartItemId));

        await dispatch(
          updateCartItemAction(cartItemId, {
            rentalStartDate: startDateISO,
            rentalEndDate: endDateISO,
          })
        );

        showPopup(
          "success",
          "Thành công",
          "Đã cập nhật thời gian thuê thành công"
        );

        // Clear editing state
        setEditingDates((prev) => {
          const newState = { ...prev };
          delete newState[cartItemId];
          return newState;
        });
      } catch {
        showPopup("error", "Lỗi", "Có lỗi xảy ra khi cập nhật thời gian thuê");
      } finally {
        // Clear loading state
        setUpdatingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cartItemId);
          return newSet;
        });
      }
    },
    [dispatch, showPopup]
  );

  // Create unique display key for each cart item based on product + rental dates
  // This allows same products with different rental dates to be treated as separate items
  const getDisplayKey = useCallback((item: (typeof cartItems)[0]) => {
    if (item.rentalStartDate && item.rentalEndDate) {
      return `${item.itemId}_${item.rentalStartDate}_${item.rentalEndDate}`;
    }
    return item._id;
  }, []);

  // Toggle item selection
  const toggleItemSelection = useCallback((displayKey: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(displayKey)) {
        newSet.delete(displayKey);
      } else {
        newSet.add(displayKey);
      }
      return newSet;
    });
  }, []);

  // Select/Deselect all items
  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map((item) => getDisplayKey(item))));
    }
  }, [selectedItems.size, cartItems, getDisplayKey]);

  // Helper function to convert datetime-local string to ISO string
  const convertDateTimeLocalToISO = (dateTimeLocal: string): string => {
    if (!dateTimeLocal) return "";
    // datetime-local format: "YYYY-MM-DDTHH:mm"
    // Convert to ISO: "YYYY-MM-DDTHH:mm:ss.sssZ"
    const date = new Date(dateTimeLocal);
    return date.toISOString();
  };

  // Helper functions for editing dates
  const startEditingDates = useCallback(
    (cartItemId: string, rentalStartDate?: string, rentalEndDate?: string) => {
      // RentalDatePicker expects ISO strings, so we pass them directly
      // It will handle the conversion to datetime-local format internally
      setEditingDates((prev) => ({
        ...prev,
        [cartItemId]: {
          rentalStartDateTime: rentalStartDate || "",
          rentalEndDateTime: rentalEndDate || "",
        },
      }));
    },
    []
  );

  const cancelEditingDates = useCallback((cartItemId: string) => {
    setEditingDates((prev) => {
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

  // Update quantity function
  const updateQuantity = useCallback(
    async (cartItemId: string, newQuantity: number) => {
      // Find the cart item to get available quantity
      const cartItem = cartItems.find((item) => item._id === cartItemId);

      if (!cartItem) {
        showPopup("error", "Lỗi", "Không tìm thấy sản phẩm trong giỏ hàng");
        return;
      }

      // Validation checks
      if (newQuantity <= 0) {
        await removeItem(cartItemId);
        return;
      }

      if (newQuantity > cartItem.availableQuantity) {
        showPopup(
          "error",
          "Số lượng không hợp lệ",
          `Hiện tại chỉ có ${cartItem.availableQuantity} sản phẩm`
        );
        return;
      }

      if (newQuantity > 99) {
        showPopup(
          "error",
          "Số lượng không hợp lệ",
          "Số lượng không được vượt quá 99 sản phẩm"
        );
        return;
      }

      if (!Number.isInteger(newQuantity)) {
        showPopup(
          "error",
          "Số lượng không hợp lệ",
          "Số lượng phải là số nguyên"
        );
        return;
      }

      try {
        // Make API call
        await dispatch(
          updateCartItemAction(cartItemId, { quantity: newQuantity })
        );
      } catch {
        // If API fails, revert the optimistic update
        dispatch(fetchCartItems());
        showPopup("error", "Lỗi", "Có lỗi xảy ra khi cập nhật số lượng");
      }
    },
    [cartItems, dispatch, showPopup, removeItem]
  );

  // Debounced update function to prevent spam clicks
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedUpdate = useCallback(
    (cartItemId: string, newQuantity: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        updateQuantity(cartItemId, newQuantity);
      }, 300); // 300ms delay
    },
    [updateQuantity]
  );

  // Immediate UI update for better UX
  const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
    // Find the cart item to get available quantity
    const cartItem = cartItems.find((item) => item._id === cartItemId);

    if (!cartItem) return;
    // Quick validation for immediate UI update
    if (newQuantity <= 0) {
      return;
    }

    if (newQuantity > cartItem.availableQuantity) {
      // Don't update UI, show error
      showPopup(
        "error",
        "Số lượng không hợp lệ",
        `Hiện tại chỉ có ${cartItem.availableQuantity} sản phẩm`
      );
      return;
    }

    if (newQuantity > 99) {
      // Don't update UI, show error
      showPopup(
        "error",
        "Số lượng không hợp lệ",
        "Số lượng không được vượt quá 99 sản phẩm"
      );
      return;
    }

    // Immediate UI update
    const updatedCartItems = cartItems.map((item) =>
      item._id === cartItemId ? { ...item, quantity: newQuantity } : item
    );
    dispatch(setCartItems(updatedCartItems));

    // Debounced API call
    debouncedUpdate(cartItemId, newQuantity);
  };

  
  const calculateRentalDuration = (
    startDate?: string,
    endDate?: string,
    priceUnit?: string
  ) => {
    if (!startDate || !endDate) return 1;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());

    // Calculate based on price unit
    switch (priceUnit?.toLowerCase()) {
      case "giờ":
      case "hour":
      case "hours":
        return Math.ceil(diffTime / (1000 * 60 * 60)) || 1;
      case "ngày":
      case "day":
      case "days":
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      case "tuần":
      case "week":
      case "weeks":
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)) || 1;
      case "tháng":
      case "month":
      case "months":
        // Approximate month calculation (30 days)
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
      default:
        // Default to days if unit is not recognized
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }
  };


const handleCheckout = () => {
  // Lấy các sản phẩm được chọn
  const selectedCartItems = cartItems.filter((item) =>
    selectedItems.has(getDisplayKey(item))
  );

  if (selectedCartItems.length === 0) {
    showPopup(
      "error",
      "Lỗi",
      "Vui lòng chọn ít nhất một sản phẩm để thanh toán"
    );
    return;
  }

  // Kiểm tra tất cả có ngày thuê không
  for (const item of selectedCartItems) {
    if (!item.rentalStartDate || !item.rentalEndDate) {
      showPopup(
        "error",
        "Thiếu thông tin",
        `Sản phẩm "${item.title}" chưa có thời gian thuê`
      );
      return;
    }
  }


  sessionStorage.setItem("checkoutItems", JSON.stringify(selectedCartItems));


  router.push("/auth/order/");
};


  // Get display text for rental duration
  const getRentalDurationText = (duration: number, priceUnit?: string) => {
    switch (priceUnit?.toLowerCase()) {
      case "giờ":
      case "hour":
      case "hours":
        return `${duration} giờ`;
      case "ngày":
      case "day":
      case "days":
        return `${duration} ngày`;
      case "tuần":
      case "week":
      case "weeks":
        return `${duration} tuần`;
      case "tháng":
      case "month":
      case "months":
        return `${duration} tháng`;
      default:
        return `${duration} ngày`;
    }
  };

  // Calculate totals for selected items only
  const subtotal = cartItems.reduce((sum, item) => {
    if (selectedItems.has(getDisplayKey(item))) {
      const rentalDuration = calculateRentalDuration(
        item.rentalStartDate,
        item.rentalEndDate,
        item.priceUnit
      );
      return sum + item.basePrice * item.quantity * rentalDuration;
    }
    return sum;
  }, 0);

  // Calculate total deposit for selected items
  const totalDeposit = cartItems.reduce((sum, item) => {
    if (selectedItems.has(getDisplayKey(item))) {
      return sum + item.depositAmount * item.quantity;
    }
    return sum;
  }, 0);

  // Tính serviceFee trên (tiền thuê + tiền cọc) theo công thức mới
  const serviceFee = ((subtotal + totalDeposit) * serviceFeeRate) / 100;
  // Tính tổng: tiền thuê + tiền cọc + phí dịch vụ
  const total = subtotal + totalDeposit + serviceFee;

  // Format price helper
  const formatPrice = (price: number, currency: string) => {
    if (currency === "VND") {
      return new Intl.NumberFormat("vi-VN").format(price) + "đ";
    }
    return `$${price}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <main className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-2 text-gray-700">Đang tải giỏ hàng...</span>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <main className="container mx-auto px-4 py-20">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              onClick={() => dispatch(fetchCartItems())}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Thử lại
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <main className="container mx-auto px-4 py-20">
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

          <Empty className="border-gray-200 bg-white shadow-lg">
            <EmptyMedia variant="icon" className="bg-blue-100">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle className="text-gray-900">Giỏ hàng trống</EmptyTitle>
              <EmptyDescription className="text-gray-600">
                Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá các sản
                phẩm của chúng tôi!
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleGoBack}
                  className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại
                </Button>
                <Link href="/products">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Tiếp tục mua sắm
                  </Button>
                </Link>
              </div>
            </EmptyContent>
          </Empty>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
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
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 flex items-center justify-center gap-4">
            <ShoppingCart className="w-12 h-12 text-emerald-600" />
            Giỏ hàng thuê của bạn
          </h1>
          <p className="text-lg text-gray-600 mt-3">
            Bạn có {cartItems.length} sản phẩm trong giỏ hàng
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Select All Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedItems.size === cartItems.length &&
                        cartItems.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                    />
                    <span className="text-base font-medium text-gray-700">
                      Chọn tất cả ({selectedItems.size}/{cartItems.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {selectedItems.size > 0 && (
                      <span className="text-base text-emerald-600 font-semibold">
                        Đã chọn {selectedItems.size} sản phẩm
                      </span>
                    )}
                    {cartItems.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={handleRemoveAllClick}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Xóa tất cả</span>
                      </Button>
                    )}
                  </div>
                </div>
            </div>

            {cartItems.map((item, index) => {
              const rentalDuration = calculateRentalDuration(
                item.rentalStartDate,
                item.rentalEndDate,
                item.priceUnit
              );
              const itemTotal = item.basePrice * item.quantity * rentalDuration;
              const displayKey = getDisplayKey(item);

              return (
                <div
                  key={item._id}
                  className={`group relative flex gap-4 p-8 rounded-2xl border-2 transition-all duration-300 ${
                    selectedItems.has(displayKey)
                      ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-white shadow-xl ring-2 ring-emerald-200"
                      : "bg-white border-gray-200 hover:border-emerald-300 hover:shadow-lg opacity-60"
                  } ${
                    updatingItems.has(item._id)
                      ? "ring-2 ring-emerald-200 shadow-lg"
                      : ""
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                    <div className="flex gap-6">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 pt-1">
                        <label className="relative flex items-center justify-center cursor-pointer group/checkbox">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(displayKey)}
                            onChange={() => toggleItemSelection(displayKey)}
                            className="sr-only peer"
                            aria-label={`Chọn sản phẩm ${item.title}`}
                          />
                          <div className={`relative w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                            selectedItems.has(displayKey)
                              ? "bg-emerald-600 border-emerald-600 shadow-md scale-110"
                              : "bg-white border-gray-300 group-hover/checkbox:border-emerald-400 group-hover/checkbox:bg-emerald-50"
                          }`}>
                            {selectedItems.has(displayKey) && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </label>
                      </div>

                      {/* Product Image */}
                      <div className={`relative bg-gray-100 rounded-xl w-32 h-32 flex-shrink-0 overflow-hidden ring-2 transition-all ${
                        selectedItems.has(displayKey)
                          ? "ring-emerald-300 shadow-md"
                          : "ring-gray-200 group-hover:ring-emerald-200"
                      }`}>
                        {item.primaryImage ? (
                          <img
                            src={item.primaryImage}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-14 h-14" />
                          </div>
                        )}
                        {selectedItems.has(displayKey) && (
                          <div className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full p-1 shadow-lg animate-pulse">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 space-y-3">
                        <h3 className="text-xl font-semibold text-gray-800 line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-base text-gray-600 line-clamp-1">
                          {item.shortDescription || `Còn lại ${item.availableQuantity} sản phẩm`}
                        </p>
                        <div className="flex flex-wrap gap-3 text-base">
                          <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                            {item.quantity} cái
                          </span>
                          {item.rentalStartDate && item.rentalEndDate && (
                            <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                              {getRentalDurationText(rentalDuration, item.priceUnit)}
                            </span>
                          )}
                        </div>

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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    startEditingDates(
                                      item._id,
                                      item.rentalStartDate,
                                      item.rentalEndDate
                                    )
                                  }
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-6 px-2 transition-all duration-200"
                                >
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  <span className="text-xs">Chỉnh sửa</span>
                                </Button>
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
                                size="sm"
                                showLabel={false}
                                disabled={updatingItems.has(item._id)}
                                itemId={item.itemId}
                              />
                              <div className="flex justify-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    updateRentalDates(
                                      item._id,
                                      editingDates[item._id]
                                        .rentalStartDateTime,
                                      editingDates[item._id].rentalEndDateTime
                                    )
                                  }
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-6 px-3 text-xs transition-all duration-200"
                                  disabled={updatingItems.has(item._id)}
                                >
                                  {updatingItems.has(item._id) ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      Đang lưu...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3 mr-1" />
                                      Lưu
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => cancelEditingDates(item._id)}
                                  className="border-gray-300 text-gray-600 hover:bg-gray-50 h-6 px-3 text-xs transition-all duration-200"
                                  disabled={updatingItems.has(item._id)}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Hủy
                                </Button>
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
                                <>
                                  <div className="text-sm text-gray-700 mb-1">
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
                                </>
                              ) : (
                                <div className="text-sm text-gray-500 italic">
                                  Chưa chọn thời gian thuê
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Pricing */}
                        <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Giá thuê:</span>
                            <p className="text-2xl font-bold text-emerald-600">
                              {formatPrice(itemTotal, item.currency)}
                            </p>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Tiền cọc:</span>
                            <p className="text-lg font-semibold text-amber-600">
                              {formatPrice(item.depositAmount * item.quantity, item.currency)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col justify-between items-end gap-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-3 border border-gray-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleQuantityChange(item._id, item.quantity - 1)
                            }
                            className="text-gray-700 hover:text-emerald-600 hover:bg-white h-8 w-8"
                            disabled={loading}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="text-gray-800 font-bold w-10 text-center text-lg">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleQuantityChange(item._id, item.quantity + 1)
                            }
                            className="text-gray-700 hover:text-emerald-600 hover:bg-white h-8 w-8"
                            disabled={loading}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          onClick={() => removeItem(item._id)}
                          className="text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Xóa</span>
                        </Button>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white rounded-2xl shadow-xl p-8 sticky top-24">
              <h2 className="font-bold text-2xl mb-6 flex items-center gap-3">
                <CreditCard className="w-8 h-8" />
                Tóm tắt đơn hàng
              </h2>
              <div className="space-y-4 text-base">
                {/* Warning when no items selected */}
                {selectedItems.size === 0 && (
                  <div className="bg-white/20 border border-white/30 rounded-lg p-3 text-center">
                    <p className="text-sm font-medium">
                      ⚠️ Vui lòng chọn ít nhất một sản phẩm để thanh toán
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-emerald-50">Tiền thuê</span>
                  <span className="font-semibold text-white">
                    {subtotal.toLocaleString("vi-VN")}₫
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-yellow-200">Phí dịch vụ ({serviceFeeRate}%)</span>
                  <span className="font-semibold text-yellow-100">
                    {serviceFee.toLocaleString("vi-VN")}₫
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-amber-200">Tiền cọc</span>
                  <span className="font-semibold text-amber-100">
                    {totalDeposit.toLocaleString("vi-VN")}₫
                  </span>
                </div>
                <div className="flex justify-between text-yellow-200 text-xs">
                  <span>(Hoàn lại tiền cọc sau khi trả đồ)</span>
                </div>
                <div className="border-t border-emerald-400 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng cộng</span>
                    <span className="text-2xl">
                      {total.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                </div>
              </div>
              <Button
                className="mt-6 w-full bg-white text-emerald-700 font-bold py-4 rounded-xl hover:bg-emerald-50 transition transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                disabled={selectedItems.size === 0}
                onClick={handleCheckout}
              >
                <CheckCircle2 className="w-6 h-6" />
                Thanh toán 
              </Button>
              <Link href="/products">
                <Button
                  variant="outline"
                  className="mt-3 w-full border-white/30 text-white hover:bg-white/10 bg-transparent"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tiếp tục mua sắm
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Popup Modal */}
      <PopupModal
        isOpen={popupModal.isOpen}
        onClose={closePopup}
        type={popupModal.type}
        title={popupModal.title}
        message={popupModal.message}
      />

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeConfirmModal}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl border-2 border-red-200 transform transition-all duration-300 scale-100 opacity-100">
            {/* Content */}
            <div className="p-8 text-center">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold mb-4 text-red-900">
                {confirmModal.title}
              </h3>

              {/* Message */}
              <p className="text-lg mb-8 leading-relaxed text-red-700">
                {confirmModal.message}
              </p>

              {/* Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={closeConfirmModal}
                  className="flex-1 py-3 px-6 text-lg font-semibold rounded-lg transition-all duration-200 hover:scale-105 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 py-3 px-6 text-lg font-semibold rounded-lg transition-all duration-200 hover:scale-105 bg-red-600 hover:bg-red-700 text-white"
                >
                  Xác nhận
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
