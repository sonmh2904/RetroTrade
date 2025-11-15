"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic';

const ProductComparisonModal = dynamic(
  () => import('@/components/ui/products/ProductComparisonModal'),
  { ssr: false }
);
import AddToCartButton from "@/components/ui/common/AddToCartButton";
import {
  getPublicItemById,
  getTopViewedItemsByOwner,
  getProductsByCategoryId,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  getComparableProducts,
  getRatingsByItem,
} from "@/services/products/product.api";
import { createConversation, getConversations, Conversation } from "@/services/messages/messages.api";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Eye,
  Bookmark,
  ShoppingCart,
  Zap,
  CheckCircle,
  Leaf,
  MapPin,
  ShieldCheck,
  Calendar,
  MessageCircle,
  Truck,
} from "lucide-react";
import RatingSection from "@/components/ui/products/rating";
import { useDispatch } from "react-redux";
import { fetchOrderList } from "@/store/order/orderActions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface ProductDetailDto {
  _id: string;
  Title: string;
  ShortDescription?: string;
  Description?: string;
  BasePrice: number;
  Currency: string;
  DepositAmount: number;
  PriceUnit?: { UnitName: string } | null;
  Condition?: { ConditionName: string } | null;
  Category?: { _id: string; name: string } | null;
  Images?: { Url: string }[];
  Owner?: {
    _id?: string;
    userGuid?: string;
    DisplayName?: string;
    FullName?: string;
    AvatarUrl?: string;
  } | null;
  City?: string;
  District?: string;
  Address?: string;
  AvailableQuantity?: number;
  Quantity?: number;
  CreatedAt?: string;
  FavoriteCount?: number;
  ViewCount?: number;
  RentCount?: number;

  // Rental duration fields used in the UI (optional because backend may omit them)
  MinRentalDuration?: number;
  MaxRentalDuration?: number | null;

  // Some parts of the UI reference CategoryId / ConditionId (map backend shape)
  CategoryId?: { _id?: string; name?: string } | null;
  ConditionId?: number | null;
}

const formatPrice = (price: number, currency: string) => {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  }
  return `$${price}`;
};

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<
    "hour" | "day" | "week" | "month"
  >("day");
  const [durationUnits, setDurationUnits] = useState<string>(""); 
  const [dateError, setDateError] = useState<string>("");
  const [ownerTopItems, setOwnerTopItems] = useState<any[]>([]);
  const [similarItems, setSimilarItems] = useState<any[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [ratingAverage, setRatingAverage] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);

  const isAuthenticated = useSelector((state: RootState) => !!state.auth.accessToken);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useAppDispatch();
  const { orders = [] } = useAppSelector((state) => state.order || { orders: [] });
  const completedOrders = useMemo(() => {
    if (!id || !Array.isArray(orders)) return [];
    return orders
      .filter(
        (order: any) =>
          order.itemId?._id === id && order.orderStatus === "completed"
      )
      .map((order: any) => order._id);
  }, [orders, id]);

  useEffect(() => {
    console.log("isAuthenticated:", isAuthenticated);
    console.log("orders.length:", orders.length);
    if (isAuthenticated && orders.length === 0) {
      dispatch(fetchOrderList());
    }
  }, [isAuthenticated,]);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      // ...
    };
    fetchDetail();
  }, [id]);

  useEffect(() => {
    const fetchRatingSummary = async () => {
      if (!product?._id) return;
      try {
        const res = await getRatingsByItem(product._id);
        const list = Array.isArray(res?.data) ? res.data : [];
        setRatingCount(list.length);
        if (list.length > 0) {
          const sum = list.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
          setRatingAverage(sum / list.length);
        } else {
          setRatingAverage(0);
        }
      } catch (e) {
        setRatingAverage(0);
        setRatingCount(0);
      }
    };
    fetchRatingSummary();
  }, [product?._id]);

  // Handle compare button click
  const handleCompare = useCallback(() => {
    setShowComparisonModal(true);
  }, []);

  // Favorite states
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);

  // Get authentication state

  // Fetch favorite status when product or authentication changes
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (!id || !isAuthenticated) return;

      try {
        setFavoriteLoading(true);
        const res = await getFavorites();
        if (res.ok) {
          const data = await res.json();
          const favorites = data.data || [];
          const isFav = favorites.some(
            (fav: any) => fav.productId?._id === id || fav.productId?._id?.$oid === id
          );
          setIsFavorite(isFav);
        }
      } catch (error) {
        console.error("Error fetching favorite status:", error);
      } finally {
        setFavoriteLoading(false);
      }
    };

    fetchFavoriteStatus();
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getPublicItemById(id);
        // BE returns { success, message, data }
        const data = res?.data ?? res; // fallback if instance returns json body directly
        const detail: ProductDetailDto = data?.data || data;
        setProduct(detail);
        setFavoriteCount(detail.FavoriteCount || 0);
        setSelectedImageIndex(0);
      } catch (err: unknown) {
        console.error("Failed to load product detail", err);
        setError("Không thể tải chi tiết sản phẩm");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      toast.error("Vui lòng đăng nhập để thêm vào yêu thích.");
      return;
    }

    if (!product?._id) return;

    setFavoriteLoading(true);
    try {
      let res: Response;
      if (isFavorite) {
        res = await removeFromFavorites(product._id);
      } else {
        res = await addToFavorites(product._id);
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.message || `Lỗi! Mã trạng thái: ${res.status}`;

        if (res.status === 400) {
          if (errorMsg.includes("đã được yêu thích") && !isFavorite) {
            setIsFavorite(true);
            setFavoriteCount(prev => prev + 1);
            toast.success("Đã thêm vào yêu thích!");
            return;
          } else if (errorMsg.includes("chưa được yêu thích") && isFavorite) {
            setIsFavorite(false);
            setFavoriteCount(prev => Math.max(0, prev - 1));
            return;
          }
        }
        throw new Error(errorMsg);
      }

      // Toggle favorite status on success
      const newFavoriteStatus = !isFavorite;
      setIsFavorite(newFavoriteStatus);
      setFavoriteCount(prev => newFavoriteStatus ? prev + 1 : Math.max(0, prev - 1));

      toast.success(newFavoriteStatus
        ? "Đã thêm vào yêu thích!"
        : "Đã xóa khỏi yêu thích!"
      );
    } catch (err: any) {
      console.error("Error toggling favorite:", err);
      toast.error(err.message || "Lỗi khi cập nhật yêu thích.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      const ownerId = (product?.Owner as any)?._id;
      if (!ownerId) return;
      try {
        const res = await getTopViewedItemsByOwner(ownerId, 6);
        const data = res?.data ?? res;
        const items = data?.data?.items || data?.items || [];
        const filtered = (items || []).filter((it: any) => it?._id !== product?._id).slice(0, 5);
        setOwnerTopItems(filtered);
      } catch (e) {
        console.warn("Failed to load owner's featured items", e);
      }
    };
    run();
  }, [product?.Owner]);

  // Fetch similar items by same category
  useEffect(() => {
    const run = async () => {
      const catId = (product?.Category as any)?._id;
      if (!catId) return;
      try {
        const res = await getProductsByCategoryId(catId, { page: 1, limit: 12 });
        const data = res?.data ?? res;
        const items = data?.data?.items || data?.items || [];
        const filtered = (items || []).filter((it: any) => it?._id !== product?._id).slice(0, 8);
        setSimilarItems(filtered);
      } catch (e) {
        console.warn("Failed to load similar items", e);
        setSimilarItems([]);
      }
    };
    run();
  }, [product?.Category]);

  const images = useMemo(
    () => product?.Images?.map((i) => i.Url).filter(Boolean) || [],
    [product]
  );

  const outOfStock = useMemo(
    () => (product?.AvailableQuantity ?? 0) <= 0,
    [product]
  );

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const baseUnit = useMemo(() => {
    const raw = product?.PriceUnit?.UnitName?.toString().toLowerCase() || "day";
    if (raw.includes("giờ") || raw.includes("hour")) return "hour" as const;
    if (raw.includes("tuần") || raw.includes("week")) return "week" as const;
    if (raw.includes("tháng") || raw.includes("month")) return "month" as const;
    return "day" as const;
  }, [product]);

  const availablePlans = useMemo<("hour" | "day" | "week" | "month")[]>(() => {
    if (baseUnit === "hour") return ["hour", "day", "week", "month"];
    if (baseUnit === "week") return ["week", "month"];
    if (baseUnit === "month") return ["month"]; // fallback if month-only products exist
    return ["day", "week", "month"];
  }, [baseUnit]);

  const unitsFromDates = useMemo(() => {
    if (!dateFrom || !dateTo) return 0;
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const today = new Date(todayStr);
    // clear time
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (start < today || end < today) {
      return 0;
    }
    if (end < start) {
      return 0;
    }
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / msPerDay) + 1
    );
    if (selectedPlan === "hour") return days * 24;
    if (selectedPlan === "day") return days;
    if (selectedPlan === "week") return Math.ceil(days / 7);
    return Math.ceil(days / 30);
  }, [dateFrom, dateTo, selectedPlan, todayStr]);

  const hourUnitPrice = useMemo(() => {
    if (!product) return 0;
    if (baseUnit === "hour") return product.BasePrice;
    if (baseUnit === "day") return product.BasePrice / 24;
    if (baseUnit === "week") return product.BasePrice / (7 * 24);
    return product.BasePrice / (30 * 24); // month -> per-hour approx
  }, [product, baseUnit]);

  const dayUnitPrice = useMemo(() => {
    if (!product) return 0;
    if (baseUnit === "day") return product.BasePrice;
    if (baseUnit === "hour") return hourUnitPrice * 24;
    if (baseUnit === "week") return product.BasePrice / 7; // approximate per-day from per-week
    return product.BasePrice / 30; // base month -> per-day approx
  }, [product, baseUnit, hourUnitPrice]);

  const weekUnitPrice = useMemo(() => {
    if (!product) return 0;
    if (baseUnit === "week") return product.BasePrice;
    if (baseUnit === "hour") return hourUnitPrice * 24 * 7;
    if (baseUnit === "day") return product.BasePrice * 7;
    return product.BasePrice / 4; // base month -> per-week approx (4 weeks)
  }, [product, baseUnit, hourUnitPrice]);

  const monthUnitPrice = useMemo(() => {
    if (!product) return 0;
    if (baseUnit === "month") return product.BasePrice;
    if (baseUnit === "hour") return hourUnitPrice * 24 * 30;
    if (baseUnit === "day") return product.BasePrice * 30;
    return product.BasePrice * 4; // week -> month approx
  }, [product, baseUnit, hourUnitPrice]);

  const pricePerUnit = useMemo(() => {
    if (selectedPlan === "hour") return hourUnitPrice;
    if (selectedPlan === "day") return dayUnitPrice;
    if (selectedPlan === "week") return weekUnitPrice;
    return monthUnitPrice;
  }, [
    selectedPlan,
    hourUnitPrice,
    dayUnitPrice,
    weekUnitPrice,
    monthUnitPrice,
  ]);

  const baseUnitPrice = useMemo(() => {
    if (baseUnit === "hour") return hourUnitPrice;
    if (baseUnit === "day") return dayUnitPrice;
    if (baseUnit === "week") return weekUnitPrice;
    return monthUnitPrice;
  }, [baseUnit, hourUnitPrice, dayUnitPrice, weekUnitPrice, monthUnitPrice]);

  const baseUnitLabel = useMemo(() => {
    return baseUnit === "hour"
      ? "mỗi giờ"
      : baseUnit === "day"
        ? "mỗi ngày"
        : baseUnit === "week"
          ? "mỗi tuần"
          : "mỗi tháng";
  }, [baseUnit]);

  const totalUnits = useMemo(() => {
    const manual = Number(durationUnits);
    return Number.isFinite(manual) && manual > 0 ? manual : unitsFromDates;
  }, [durationUnits, unitsFromDates]);

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    const units = totalUnits || 0;
    const price = pricePerUnit || 0;
    return price * units;
  }, [pricePerUnit, totalUnits, product]);

  const displayTotalPrice = useMemo(() => {
    if (!product) return 0;

    if (dateFrom && dateTo && !dateError) {
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      const msPerDay = 24 * 60 * 60 * 1000;
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay) + 1);

      let calculatedUnits = 0;
      if (selectedPlan === "hour") calculatedUnits = days * 24;
      else if (selectedPlan === "day") calculatedUnits = days;
      else if (selectedPlan === "week") calculatedUnits = Math.ceil(days / 7);
      else calculatedUnits = Math.ceil(days / 30);

      return (pricePerUnit || 0) * calculatedUnits;
    }

    if (durationUnits && Number(durationUnits) > 0) {
      return (pricePerUnit || 0) * Number(durationUnits);
    }

    return 0;
  }, [product, dateFrom, dateTo, dateError, selectedPlan, pricePerUnit, durationUnits]);

  const handlePrev = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const handleRentNow = () => {
    if (!product) return;

    if (!dateFrom || !dateTo) {
      toast.error("Vui lòng chọn thời gian thuê");
      return;
    }

    if (dateError) {
      toast.error(dateError);
      return;
    }

    const checkoutItem = {
      _id: "temp-" + product._id,
      itemId: product._id,
      title: product.Title,
      basePrice: product.BasePrice,
      depositAmount: product.DepositAmount || 0,
      quantity: 1,
      priceUnit: product.PriceUnit?.UnitName || "ngày",
      rentalStartDate: dateFrom,
      rentalEndDate: dateTo,
      primaryImage: product.Images?.[0]?.Url || "",
      shortDescription: product.ShortDescription || "",
    };

    sessionStorage.setItem("checkoutItems", JSON.stringify([checkoutItem]));

    toast.success("Đang chuyển đến trang thanh toán...");
    router.push("/auth/order");
  };

  useEffect(() => {
    const today = new Date(todayStr);
    const start = dateFrom ? new Date(dateFrom) : null;
    const end = dateTo ? new Date(dateTo) : null;
    let err = "";
    if (start && start < today) err = "Không thể chọn ngày trong quá khứ";
    if (!err && end && end < today) err = "Không thể chọn ngày trong quá khứ";
    if (!err && start && end && end < start)
      err = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu";
    setDateError(err);
  }, [dateFrom, dateTo, todayStr]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Đang tải chi tiết...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {error || "Không tìm thấy sản phẩm"}
          </p>
          <button
            onClick={() => router.push("/products")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 max-w-7xl py-6">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4">
          <span
            className="hover:underline cursor-pointer"
            onClick={() => router.push("/")}
          >
            Home
          </span>
          <span className="mx-2">/</span>
          <span
            className="hover:underline cursor-pointer"
            onClick={() => router.push("/products")}
          >
            Product
          </span>
          {product.Category?.name && (
            <>
              <span className="mx-2">/</span>
              <span className="text-gray-600">{product.Category?.name}</span>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-gray-800">{product.Title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gallery */}
          <section>
            <div className="relative aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImageIndex]}
                  alt={product.Title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow"
                  >
                    <ChevronRight />
                  </button>
                </>
              )}
            </div>

            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {images.map((src, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border ${
                      idx === selectedImageIndex
                        ? "border-blue-600"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={src}
                      alt={`thumb-${idx}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Summary */}
          <section>
            <div className="space-y-5 md:space-y-6">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                  {product.Title}
                </h1>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleFavorite}
                    disabled={favoriteLoading}
                    className={`p-2 rounded-full transition-colors flex items-center gap-1 ${
                      isFavorite
                        ? "text-yellow-500 hover:text-yellow-600"
                        : "text-gray-400 hover:text-gray-500"
                    }`}
                    title={
                      isFavorite ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích"
                    }
                  >
                    {favoriteLoading ? (
                      <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Bookmark
                        className={`w-6 h-6 ${
                          isFavorite ? "fill-current" : ""
                        }`}
                      />
                    )}
                  </button>
                  <span className="text-sm text-gray-600">
                    {favoriteCount > 0 ? favoriteCount : ""}
                  </span>
                </div>
              </div>

              {product.ShortDescription && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {product.ShortDescription}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(ratingAverage || 0)
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    ({ratingCount} đánh giá)
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{product.ViewCount || 0} lượt xem</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShoppingCart className="w-4 h-4" />
                    <span>{product.RentCount || 0} lượt thuê</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-blue-50/60 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-600">Giá thuê</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <div className="text-3xl font-extrabold text-blue-600">
                        {formatPrice(baseUnitPrice, product.Currency)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {baseUnitLabel}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Đặt cọc</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">
                      {formatPrice(product.DepositAmount, product.Currency)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCompare}
                  className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50"
                >
                  So sánh sản phẩm
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-full">
                    <AddToCartButton
                      itemId={product._id}
                      availableQuantity={product.AvailableQuantity ?? 0}
                      size="md"
                      variant="outline"
                      showText={true}
                      className={`w-full h-full justify-center py-2.5 ${
                        outOfStock ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                  <button
                    onClick={handleRentNow}
                    disabled={outOfStock}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg h-full ${
                      outOfStock
                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    <Zap className="w-5 h-5" /> Thuê ngay
                  </button>
                </div>

                <div className="rounded-xl bg-white p-4 space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">
                        RetroTrade
                      </span>{" "}
                      cam kết: nhận sản phẩm đúng mô tả hoặc hoàn tiền. Thông
                      tin thanh toán của bạn được bảo mật tuyệt đối.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Leaf className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">
                        RetroTrade
                      </span>{" "}
                      - Nền tảng cho thuê đồ vì một trái đất xanh hơn!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Seller info section (based on provided design) */}
        <div className="mt-8">
          <div className="bg-white border rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">Thông tin người bán</h3>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden">
                {product.Owner?.AvatarUrl ? (
                  <img
                    src={product.Owner.AvatarUrl}
                    alt={
                      product.Owner?.DisplayName ||
                      product.Owner?.FullName ||
                      "avatar"
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    👤
                  </div>
                )}
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {product.Owner?.DisplayName || product.Owner?.FullName || "Người dùng"}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle className="w-3 h-3" /> Chủ cho thuê
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={async () => {
                        const ownerId =
                          (product as any)?.Owner?._id ||
                          (product as any)?.Owner?.userGuid ||
                          (product as any)?.Owner?.UserGuid;
                        if (!ownerId) {
                          toast.error("Không tìm thấy thông tin người bán");
                          return;
                        }

                        if (!accessToken) {
                          toast.error(
                            "Vui lòng đăng nhập để sử dụng tính năng chat"
                          );
                          router.push("/auth/login");
                          return;
                        }

                        try {
                          // Load danh sách cuộc trò chuyện hiện có
                          const conversationsRes = await getConversations();
                          if (!conversationsRes.ok) {
                            toast.error(
                              "Không thể tải danh sách cuộc trò chuyện"
                            );
                            return;
                          }

                          const conversationsData =
                            await conversationsRes.json();
                          const conversations = conversationsData.data || [];

                          // Tìm cuộc trò chuyện đã tồn tại với người bán này
                          const existingConversation = conversations.find(
                            (conv: Conversation) => {
                              const userId1 = String(
                                conv.userId1._id || conv.userId1
                              );
                              const userId2 = String(
                                conv.userId2._id || conv.userId2
                              );
                              const ownerIdStr = String(ownerId);
                              return (
                                userId1 === ownerIdStr || userId2 === ownerIdStr
                              );
                            }
                          );

                          if (existingConversation) {
                            // Đi đến trang chat với conversation ID
                            router.push(
                              `/auth/messages?conversationId=${existingConversation._id}`
                            );
                          } else {
                            // Tạo cuộc trò chuyện mới
                            const createRes = await createConversation(ownerId);
                            if (createRes.ok) {
                              const createData = await createRes.json();
                              const newConversation =
                                createData.data || createData;
                              router.push(
                                `/auth/messages?conversationId=${newConversation._id}`
                              );
                              toast.success("Đã tạo cuộc trò chuyện mới");
                            } else {
                              const errorData = await createRes
                                .json()
                                .catch(() => ({}));
                              toast.error(
                                errorData.message ||
                                  "Không thể tạo cuộc trò chuyện"
                              );
                            }
                          }
                        } catch (error) {
                          console.error("Error opening chat:", error);
                          toast.error("Có lỗi xảy ra khi mở chat");
                        }
                      }}
                      className="px-3 py-1.5 text-sm rounded-md border text-red-600 border-red-200 bg-red-50 hover:bg-red-100"
                    >
                      Chat ngay
                    </button>
                    <button
                      onClick={() => {
                        const ownerGuid =
                          product?.Owner?.userGuid || product?.Owner?._id;
                        if (ownerGuid) {
                          router.push(`/store/${ownerGuid}`);
                        } else {
                          toast.error("Không tìm thấy thông tin cửa hàng");
                        }
                      }}
                      className="px-3 py-1.5 text-sm rounded-md border text-gray-700 hover:bg-gray-50"
                    >
                      Xem shop
                    </button>
                  </div>
                </div>
                <div className="md:col-span-7">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="text-sm">Đối tác đáng tin cậy</div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="text-sm">
                        Thành viên từ{" "}
                        {product.CreatedAt
                          ? new Date(product.CreatedAt).getFullYear()
                          : "-"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                      <div className="text-sm">Hỗ trợ 24/7</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 10-col grid: left 7 info+desc, right 3 featured */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-10 gap-8">
          <section className="lg:col-span-7 space-y-6">
            {/* Product Information Card */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg
                      className="w-6 h-6 text-indigo-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6h2m7-6h2m2 6h2M5 7h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zm0 0V5a2 2 0 012-2h2M7 3h10a2 2 0 012 2v2H5V5a2 2 0 012-2z"
                      ></path>
                    </svg>
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Thông tin sản phẩm
                    </span>
                  </h3>
                  <div className="flex flex-col items-end space-y-1.5">
                    {product.AvailableQuantity === 0 ? (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200 shadow-sm flex items-center">
                        <svg
                          className="w-3.5 h-3.5 mr-1.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Hết hàng
                      </span>
                    ) : null}
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full flex items-center ${
                        product.Condition?.ConditionName === "Mới"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      <svg
                        className={`w-3.5 h-3.5 mr-1.5 ${
                          product.Condition?.ConditionName === "Mới"
                            ? "text-green-500"
                            : "text-amber-500"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {product.Condition?.ConditionName === "Mới" ? (
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                      {product.Condition?.ConditionName || "Đã sử dụng"}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* First Row - 2 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Location */}
                    <div className="flex items-start group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mr-3 group-hover:bg-indigo-100 transition-colors">
                        <MapPin className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-0.5">
                          Địa chỉ
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {[product.Address, product.District, product.City]
                            .filter(Boolean)
                            .join(", ")
                            .replace(/,\s*$/, "") || "Chưa cập nhật địa chỉ"}
                        </p>
                      </div>
                    </div>

                    {/* Posted Date */}
                    <div className="flex items-start group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-0.5">
                          Ngày đăng
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {product.CreatedAt
                            ? new Date(product.CreatedAt).toLocaleDateString(
                                "vi-VN"
                              )
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Second Row - 2 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Total Quantity */}
                    <div className="flex items-start group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mr-3 group-hover:bg-purple-100 transition-colors">
                        <svg
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          ></path>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-0.5">
                          Tổng số lượng
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {product.Quantity || 0}{" "}
                          <span className="text-sm font-normal text-gray-500">
                            sản phẩm
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Available Quantity */}
                    <div className="flex items-start group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mr-3 group-hover:bg-emerald-100 transition-colors">
                        <svg
                          className="w-5 h-5 text-emerald-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-0.5">
                          Có sẵn
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {product.AvailableQuantity || 0}{" "}
                          <span className="text-sm font-normal text-gray-500">
                            sản phẩm
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Third Row - Full width */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-amber-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          ></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500 mb-2">
                          Thời gian thuê
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                            <p className="text-xs text-amber-700 font-medium mb-1">
                              Tối thiểu
                            </p>
                            <p className="text-base font-semibold text-amber-900">
                              {product.MinRentalDuration || 1}{" "}
                              {product.PriceUnit?.UnitName?.toLowerCase() ||
                                "ngày"}
                            </p>
                          </div>
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                            <p className="text-xs text-amber-700 font-medium mb-1">
                              Tối đa
                            </p>
                            <p className="text-base font-semibold text-amber-900">
                              {product.MaxRentalDuration
                                ? `${product.MaxRentalDuration} ${
                                    product.PriceUnit?.UnitName?.toLowerCase() ||
                                    "ngày"
                                  }`
                                : "Không giới hạn"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-semibold mb-3">Mô tả sản phẩm</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {product.Description ||
                  product.ShortDescription ||
                  "Chưa có mô tả."}
              </p>
            </div>

     
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-6">
              <div className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <RatingSection
                    itemId={product._id}
                    orders={orders}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Sản phẩm tương tự</h3>
                {similarItems.length > 3 && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const container = document.querySelector(
                          ".similar-products-slider"
                        );
                        if (container) {
                          container.scrollBy({
                            left: -300,
                            behavior: "smooth",
                          });
                        }
                      }}
                      className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      aria-label="Previous products"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const container = document.querySelector(
                          ".similar-products-slider"
                        );
                        if (container) {
                          container.scrollBy({ left: 300, behavior: "smooth" });
                        }
                      }}
                      className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      aria-label="Next products"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                )}
              </div>

              {similarItems.length > 0 ? (
                <div className="relative">
                  <div className="similar-products-slider flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                    {similarItems.map((it: any) => {
                      const thumb = it?.Images?.[0]?.Url;
                      const href = `/products/details?id=${it._id}`;
                      return (
                        <div
                          key={it._id}
                          className="flex-none w-[calc(100%-2rem)] sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)] px-1 snap-start"
                        >
                          <Link href={href} className="block">
                            <div className="rounded-xl border bg-white overflow-hidden cursor-pointer transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-lg h-full">
                              <div className="w-full aspect-video bg-gray-100 relative">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt={it.Title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <span className="text-sm">
                                      Không có hình ảnh
                                    </span>
                                  </div>
                                )}
                                {it.AvailableQuantity === 0 && (
                                  <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                                    Hết hàng
                                  </div>
                                )}
                              </div>
                              <div className="p-4">
                                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 h-10 mb-2">
                                  {it.Title}
                                </h3>

                                {/* Price Row */}
                                <div className="flex items-center gap-2 mb-1">
                                  <svg
                                    className="w-4 h-4 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    ></path>
                                  </svg>
                                  <span className="text-orange-600 font-semibold">
                                    {formatPrice(it.BasePrice, it.Currency)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    /{it.PriceUnit?.UnitName || "ngày"}
                                  </span>
                                </div>

                                {/* Deposit Row */}
                                <div className="flex items-center gap-2 mb-2 text-sm">
                                  <svg
                                    className="w-4 h-4 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                    ></path>
                                  </svg>
                                  <span className="text-gray-600">
                                    Đặt cọc:{" "}
                                  </span>
                                  <span className="font-medium text-gray-800">
                                    {formatPrice(
                                      it.DepositAmount || 0,
                                      it.Currency
                                    )}
                                  </span>
                                </div>

                                {/* Address Row */}
                                {(it.District || it.City) && (
                                  <div className="flex items-start gap-2 text-sm mt-2 pt-2 border-t border-gray-100">
                                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-600 line-clamp-2">
                                      {[it.District, it.City]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 py-4">
                  Chưa có sản phẩm tương tự
                </div>
              )}

              <style jsx global>{`
                .similar-products-slider::-webkit-scrollbar {
                  display: none;
                }
                .similar-products-slider {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
                .snap-mandatory {
                  scroll-snap-type: x mandatory;
                }
                .snap-start {
                  scroll-snap-align: start;
                }
              `}</style>
            </div>
          </section>

          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-semibold mb-3">Sản phẩm nổi bật</h3>
              <div className="space-y-4">
                {(ownerTopItems || []).map((it) => {
                  const thumb = it?.Images?.[0]?.Url;
                  const href = `/products/details?id=${it._id}`;
                  return (
                    <Link key={it._id} href={href} className="block">
                      <div className="rounded-xl border bg-white overflow-hidden cursor-pointer transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                        <div className="w-full aspect-video bg-gray-100 relative">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={it.Title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No image
                            </div>
                          )}
                          {it.AvailableQuantity === 0 && (
                            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                              Hết hàng
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                            {it.Title}
                          </h3>

                          {/* Price Row */}
                          <div className="flex items-center gap-2 mb-1">
                            <svg
                              className="w-4 h-4 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              ></path>
                            </svg>
                            <span className="text-orange-600 font-semibold">
                              {formatPrice(it.BasePrice, it.Currency)}
                            </span>
                            <span className="text-xs text-gray-500">
                              /{it.PriceUnit?.UnitName || "ngày"}
                            </span>
                          </div>

                          {/* Deposit Row */}
                          <div className="flex items-center gap-2 mb-2 text-sm">
                            <svg
                              className="w-4 h-4 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                              ></path>
                            </svg>
                            <span className="text-gray-600">Đặt cọc: </span>
                            <span className="font-medium text-gray-800">
                              {formatPrice(it.DepositAmount || 0, it.Currency)}
                            </span>
                          </div>

                          {/* Address Row */}
                          {(it.District || it.City) && (
                            <div className="flex items-start gap-2 text-sm mt-2 pt-2 border-t border-gray-100">
                              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-600 line-clamp-2">
                                {[it.District, it.City]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {ownerTopItems.length === 0 && (
                  <div className="text-sm text-gray-500">
                    Chưa có sản phẩm nổi bật
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Comparison Modal */}
      {product && (
        <ProductComparisonModal
          isOpen={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          currentProduct={product}
        />
      )}
    </div>
  );
}