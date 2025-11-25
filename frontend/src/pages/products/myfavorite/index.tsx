"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getAllItems,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
} from "@/services/products/product.api";
import React from "react";
import {
  MapPin,
  Eye,
  Package,
  Zap,
  Bookmark,
  Grid3x3,
  List,
  Search,
  X,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import AddToCartButton from "@/components/ui/common/AddToCartButton";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { toast } from "sonner";

interface Product {
  _id: string;
  title: string;
  shortDescription: string;
  thumbnail: string;
  basePrice: number;
  currency: string;
  depositAmount: number;
  createdAt: string;
  availableQuantity: number;
  quantity: number;
  viewCount: number;
  rentCount: number;
  favoriteCount: number;
  favoriteCreatedAt?: string;
  category?: {
    _id: string;
    name: string;
  };
  condition?: {
    ConditionName: string;
  };
  priceUnit?: {
    UnitName: string;
  };
  tags?: { _id: string; name: string }[];
  city?: string;
  district?: string;
}

interface RawItem {
  _id: string | { $oid: string };
  Title: string;
  ShortDescription: string;
  Images?: Array<{ Url: string }>;
  BasePrice: number;
  Currency: string;
  DepositAmount: number;
  CreatedAt: string;
  AvailableQuantity: number;
  Quantity: number;
  ViewCount: number;
  RentCount: number;
  FavoriteCount?: number;
  Category?: {
    _id: string | { $oid: string };
    name: string;
  };
  Condition?: {
    ConditionName: string;
  };
  PriceUnit?: {
    UnitName: string;
  };
  Tags?: Array<{
    TagId?: string | { $oid: string };
    Tag?: { _id?: string | { $oid: string }; name: string };
    TagName?: string;
    Name?: string;
    name?: string;
  }>;
  City?: string;
  District?: string;
}

interface RawFavorite {
  _id: string;
  createdAt: string;
  productId?: {
    _id: string | { $oid: string };
    FavoriteCount?: number;
  };
}

const toIdString = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (
    typeof v === "object" &&
    v !== null &&
    "$oid" in v &&
    typeof (v as { $oid: string }).$oid === "string"
  ) {
    return (v as { $oid: string }).$oid;
  }
  if (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { toString: () => string }).toString === "function"
  ) {
    return (v as { toString: () => string }).toString();
  }
  try {
    return String(v);
  } catch {
    return "";
  }
};

const normalizeItems = (rawItems: RawItem[]): Product[] => {
  return rawItems.map((item) => ({
    _id: toIdString(item._id),
    title: item.Title,
    shortDescription: item.ShortDescription,
    thumbnail: item.Images?.[0]?.Url || "/placeholder.jpg",
    basePrice: item.BasePrice,
    currency: item.Currency,
    depositAmount: item.DepositAmount,
    createdAt: item.CreatedAt,
    availableQuantity: item.AvailableQuantity,
    quantity: item.Quantity,
    viewCount: item.ViewCount,
    rentCount: item.RentCount,
    favoriteCount: item.FavoriteCount || 0,
    category: item.Category
      ? { _id: toIdString(item.Category._id), name: item.Category.name }
      : undefined,
    condition: item.Condition
      ? { ConditionName: item.Condition.ConditionName }
      : undefined,
    priceUnit: item.PriceUnit
      ? { UnitName: item.PriceUnit.UnitName }
      : undefined,
    tags: Array.isArray(item.Tags)
      ? item.Tags.map((t) => {
          const id = toIdString(t.TagId || t.Tag?._id);
          const name = t.Tag?.name || t.TagName || t.Name || t.name;
          if (!id || !name) return null;
          return { _id: id, name };
        }).filter((tag): tag is { _id: string; name: string } => Boolean(tag))
      : [],
    city: item.City,
    district: item.District,
  }));
};

const formatPrice = (price: number, currency: string): string => {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  }
  return `$${price}`;
};

export default function MyFavoritePage(): React.JSX.Element {

  const router = useRouter();
  const isAuthenticated = useSelector(
    (state: RootState) => !!state.auth.accessToken
  );
  const [, setAllItems] = useState<Product[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [localFavorites, setLocalFavorites] = useState<Set<string>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<Set<string>>(
    new Set()
  );
  const [localCounts, setLocalCounts] = useState<Map<string, number>>(
    new Map()
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<"recent" | "price" | "popular">(
    "recent"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [itemsPerPage, setItemsPerPage] = useState<number>(9);

  const fetchData = useCallback(async (): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    const [itemData, favoritesRes] = await Promise.all([
      getAllItems(),
      getFavorites(),
    ]);

    // Fix: Ép kiểu đúng và kiểm tra response
    interface ApiResponse {
      success?: boolean;
      data?: {
        items: RawItem[];
        total?: number;
      };
      items?: RawItem[];
    }

    const itemResponse = itemData as ApiResponse;
    const rawItems: RawItem[] =
      (itemResponse.success
        ? itemResponse.data?.items
        : itemResponse.items) || [];

    const normalizedItems = normalizeItems(rawItems);
    setAllItems(normalizedItems);

    if (favoritesRes.ok) {
      const data = await favoritesRes.json();
      const favorites: RawFavorite[] = (data?.data || []) as RawFavorite[];

      const favoriteIds = new Set<string>(
        favorites
          .map((fav) => toIdString(fav.productId?._id))
          .filter((id => id !== "")
      ));

      setLocalFavorites(favoriteIds);

      const countsMap = new Map<string, number>();
      const favoriteDates = new Map<string, string>();

      favorites.forEach((fav) => {
        const prodId = toIdString(fav.productId?._id);
        if (prodId) {
          countsMap.set(prodId, fav.productId?.FavoriteCount || 0);
          favoriteDates.set(prodId, fav.createdAt);
        }
      });

      setLocalCounts(countsMap);

      const favoriteProducts = normalizedItems
        .filter((item) => favoriteIds.has(item._id))
        .map((item) => ({
          ...item,
          favoriteCreatedAt: favoriteDates.get(item._id),
        }));

      setFavoriteItems(favoriteProducts);
    } else {
      const errorData = (await favoritesRes.json().catch(() => ({}))) as {
        message?: string;
      };
      const errorMsg =
        errorData.message ||
        `Lỗi tải danh sách yêu thích: ${favoritesRes.status}`;

      if (favoritesRes.status === 401 || favoritesRes.status === 403) {
        router.push("/auth/login");
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      } else {
        toast.error(errorMsg);
      }
      setFavoriteItems([]); // Đảm bảo không bị undefined
    }
  } catch (err) {
    console.error("Fetch data error:", err);
    const errorMsg = "Lỗi khi tải dữ liệu.";
    setError(errorMsg);
    toast.error(errorMsg);
    setFavoriteItems([]);
  } finally {
    setLoading(false);
  }
}, [router]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      toast.error("Vui lòng đăng nhập để xem danh sách yêu thích.");
      return;
    }

    fetchData();
  }, [isAuthenticated, router, fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortOrder]);

  const filteredAndSortedItems = useMemo((): Product[] => {
    let items = [...favoriteItems];

    if (searchQuery) {
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.shortDescription
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    const getCmp = (a: Product, b: Product): number => {
      switch (sortField) {
        case "recent":
          const aDate = new Date(a.favoriteCreatedAt || a.createdAt).getTime();
          const bDate = new Date(b.favoriteCreatedAt || b.createdAt).getTime();
          return aDate - bDate; // asc: older first
        case "popular":
          return a.viewCount - b.viewCount; // asc: less views first
        case "price":
          return a.basePrice - b.basePrice; // asc: low to high
        default:
          return 0;
      }
    };

    items.sort((a, b) => {
      const cmp = getCmp(a, b);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return items;
  }, [favoriteItems, searchQuery, sortField, sortOrder]);

  const updatePage = (page: number): void => {
    setCurrentPage(page);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const totalPages = useMemo(
    (): number =>
      Math.max(1, Math.ceil(filteredAndSortedItems.length / itemsPerPage)),
    [filteredAndSortedItems.length, itemsPerPage]
  );

  const pagedItems = useMemo((): Product[] => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredAndSortedItems.slice(start, end);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  const handleItemsPerPageChange = (newItemsPerPage: number): void => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const newField = e.target.value as "recent" | "price" | "popular";
    setSortField(newField);
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const handleOrderToggle = (): void => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setCurrentPage(1);
  };

  const handleRentNow = (productId: string): void => {
    router.push(`/products/details?id=${productId}`);
  };

  const toggleFavorite = async (
    productId: string,
    currentCount: number
  ): Promise<void> => {
    const isFavorite = localFavorites.has(productId);
    setFavoriteLoading((prev) => new Set([...prev, productId]));
    try {
      let res: Response;
      if (isFavorite) {
        res = await removeFromFavorites(productId);
      } else {
        res = await addToFavorites(productId);
      }
      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        const errorMsg =
          errorData.message || `Lỗi! Mã trạng thái: ${res.status}`;

        if (res.status === 400) {
          if (errorMsg.includes("chưa được yêu thích") && isFavorite) {
            setLocalFavorites((prev) => {
              const next = new Set(prev);
              next.delete(productId);
              return next;
            });
            setLocalCounts((prev) =>
              new Map(prev).set(productId, Math.max(0, (currentCount || 0) - 1))
            );
            toast.success("Đã xóa khỏi yêu thích!");
            return;
          }
        } else if (res.status === 401 || res.status === 403) {
          router.push("/auth/login");
          toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
          return;
        }

        throw new Error(errorMsg);
      }
      if (isFavorite) {
        setLocalFavorites((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        setLocalCounts((prev) =>
          new Map(prev).set(productId, Math.max(0, (currentCount || 0) - 1))
        );
        toast.success("Đã xóa khỏi yêu thích!");
      } else {
        setLocalFavorites((prev) => new Set([...prev, productId]));
        setLocalCounts((prev) =>
          new Map(prev).set(productId, (currentCount || 0) + 1)
        );
        toast.success("Đã thêm vào yêu thích!");
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Lỗi khi cập nhật yêu thích.";
      toast.error(errorMsg);
    } finally {
      setFavoriteLoading((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const getFavoriteCount = (productId: string, apiCount: number): number => {
    return localCounts.get(productId) ?? apiCount;
  };

  const Pagination = () => {
    const indexOfFirst = (currentPage - 1) * itemsPerPage;
    const indexOfLast = indexOfFirst + itemsPerPage;
    const displayLast = Math.min(indexOfLast, filteredAndSortedItems.length);

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => updatePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <button
            onClick={() => updatePage(currentPage + 1)}
            disabled={
              currentPage === totalPages || filteredAndSortedItems.length === 0
            }
            className="relative ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Hiển thị{" "}
              <span className="font-medium text-gray-900">
                {filteredAndSortedItems.length === 0 ? 0 : indexOfFirst + 1}
              </span>{" "}
              đến{" "}
              <span className="font-medium text-gray-900">{displayLast}</span>{" "}
              của{" "}
              <span className="font-medium text-gray-900">
                {filteredAndSortedItems.length}
              </span>{" "}
              kết quả
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) =>
                handleItemsPerPageChange(parseInt(e.target.value))
              }
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-gray-700"
            >
              <option value={9}>9</option>
              <option value={18}>18</option>
              <option value={27}>27</option>
            </select>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => updatePage(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => updatePage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page
                        ? "z-10 bg-blue-50 border-blue-300 text-blue-600"
                        : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => updatePage(currentPage + 1)}
                disabled={
                  currentPage === totalPages ||
                  filteredAndSortedItems.length === 0
                }
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (loading && favoriteItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <Bookmark className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <p className="text-gray-600 mt-4 font-medium">
            Đang tải danh sách yêu thích...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Có lỗi xảy ra
          </h3>
          <p className="text-red-500 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Header với Glassmorphism */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoLTJWMGhydjMwek0wIDMwaDJ2MzBIMFYzMHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>

        <div className="relative container mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Bookmark
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                  />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-1">
                    Danh sách yêu thích
                  </h1>
                  <p className="text-blue-100">
                    <span className="font-semibold">
                      {favoriteItems.length}
                    </span>{" "}
                    sản phẩm đã lưu
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/products")}
              className="group bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2 border border-white/20"
            >
              <span className="font-medium">Khám phá thêm</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Toolbar với Glassmorphism */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-4 mb-8 sticky top-4 z-10">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search Bar */}
            <div className="flex-1 w-full md:w-auto">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm yêu thích..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Sort and View Mode */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <select
                  value={sortField}
                  onChange={handleFieldChange}
                  className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white cursor-pointer"
                >
                  <option value="recent">Gần đây</option>
                  <option value="price">Giá thuê</option>
                  <option value="popular">Phổ biến nhất</option>
                </select>
                <button
                  onClick={handleOrderToggle}
                  className="p-3 rounded-xl border-2 border-gray-200 hover:border-blue-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-300 bg-white hover:bg-gray-50 flex items-center justify-center"
                >
                  <ArrowUpDown
                    className={`w-5 h-5 transition-transform duration-300 ${
                      sortOrder === "asc" ? "rotate-0" : "rotate-180"
                    }`}
                  />
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    viewMode === "grid"
                      ? "bg-white shadow-md text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    viewMode === "list"
                      ? "bg-white shadow-md text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {favoriteItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                <Bookmark className="w-16 h-16 text-gray-300" />
              </div>
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center animate-bounce">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              Chưa có sản phẩm yêu thích
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Khám phá hàng ngàn sản phẩm tuyệt vời và thêm vào danh sách yêu
              thích để thuê sau này
            </p>
            <button
              onClick={() => router.push("/products")}
              className="group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 inline-flex items-center gap-3"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              Khám phá sản phẩm
              <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <Search className="w-16 h-16 text-gray-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              Không tìm thấy sản phẩm nào
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc sắp xếp.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl"
            >
              Xóa tìm kiếm
            </button>
          </div>
        ) : (
          <>
            {/* Products Grid/List */}
            <div
              className={`grid gap-6 ${
                viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                  : "grid-cols-1"
              }`}
            >
              {pagedItems.map((item, index) => {
                const currentFavoriteCount = getFavoriteCount(
                  item._id,
                  item.favoriteCount
                );
                const isLocalFavorite = localFavorites.has(item._id);

                return (
                  <div
                    key={item._id}
                    onClick={() => handleRentNow(item._id)}
                    role="button"
                    tabIndex={0}
                    className={`group relative cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 overflow-hidden ${
                      viewMode === "list"
                        ? "flex flex-row h-auto"
                        : "h-full flex flex-col"
                    }`}
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                    }}
                  >
                    <div
                      className={`relative overflow-hidden bg-gray-200 ${
                        viewMode === "list" ? "w-72 h-56 flex-shrink-0" : "h-48"
                      }`}
                    >
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        className={`object-cover transition-transform duration-300 ease-out group-hover:scale-105 ${
                          viewMode === "list" ? "" : ""
                        }`}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                      {item.availableQuantity === 0 && (
                        <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                          Hết hàng
                        </div>
                      )}
                      {/* Favorite Button - Floating for list mode */}
                      {viewMode === "list" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item._id, currentFavoriteCount);
                          }}
                          disabled={favoriteLoading.has(item._id)}
                          className={`absolute top-3 left-3 w-10 h-10 rounded-full backdrop-blur-md border-2 flex items-center justify-center transition-all duration-300 ${
                            isLocalFavorite
                              ? "bg-yellow-500 border-yellow-400 text-white shadow-lg shadow-yellow-500/50"
                              : "bg-white/90 border-white/50 text-gray-600 hover:bg-yellow-500 hover:text-white hover:border-yellow-400"
                          } ${
                            favoriteLoading.has(item._id)
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:scale-110"
                          }`}
                        >
                          <Bookmark
                            size={18}
                            className={
                              favoriteLoading.has(item._id)
                                ? "animate-pulse"
                                : ""
                            }
                            fill={isLocalFavorite ? "currentColor" : "none"}
                          />
                        </button>
                      )}
                    </div>
                    <div
                      className={`${
                        viewMode === "list"
                          ? "p-6 flex flex-col flex-1 justify-between"
                          : "p-4 flex-1 flex flex-col"
                      }`}
                    >
                      {/* Category & Condition Tags - Only in grid mode */}
                      {viewMode === "grid" && (
                        <div className="flex items-center justify-between mb-3 text-xs text-gray-500 min-h-[2rem]">
                          <div className="flex items-center gap-2">
                            {item.category && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                {item.category.name}
                              </span>
                            )}
                            {item.condition && (
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {item.condition.ConditionName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item._id, currentFavoriteCount);
                              }}
                              disabled={favoriteLoading.has(item._id)}
                              className={`p-1 rounded transition-colors ${
                                isLocalFavorite
                                  ? "text-yellow-500 hover:text-yellow-600"
                                  : "text-gray-500 hover:text-yellow-500"
                              } ${
                                favoriteLoading.has(item._id)
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer"
                              }`}
                              title={
                                isLocalFavorite
                                  ? "Bỏ yêu thích"
                                  : "Thêm yêu thích"
                              }
                            >
                              <Bookmark
                                size={16}
                                className={
                                  favoriteLoading.has(item._id)
                                    ? "animate-pulse"
                                    : ""
                                }
                                fill={isLocalFavorite ? "currentColor" : "none"}
                              />
                            </button>
                            <span>{currentFavoriteCount}</span>
                          </div>
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>

                      {/* Location */}
                      <div
                        className={`flex items-center gap-1 text-sm text-gray-600 mb-3 min-h-[1.5rem] ${
                          viewMode === "list" ? "" : ""
                        }`}
                      >
                        <MapPin size={14} className="text-gray-400" />
                        <span className="truncate">
                          {item.district}, {item.city}
                        </span>
                      </div>

                      {/* Price Card */}
                      <div
                        className={`bg-blue-50 rounded-lg p-3 mb-3 min-h-[4.5rem] ${
                          viewMode === "list"
                            ? "border-2 border-blue-100 group-hover:border-blue-300 transition-colors"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">
                              Giá thuê
                            </p>
                            <p
                              className={`font-bold ${
                                viewMode === "list"
                                  ? "text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                                  : "text-lg text-blue-600"
                              }`}
                            >
                              {formatPrice(item.basePrice, item.currency)}
                              <span className="text-sm font-normal text-gray-600">
                                /{item.priceUnit?.UnitName || "ngày"}
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600 mb-1">
                              Đặt cọc
                            </p>
                            <p className="text-sm font-semibold text-gray-700">
                              {formatPrice(item.depositAmount, item.currency)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stock Info */}
                      <div
                        className={`flex items-center justify-between text-xs text-gray-600 mb-4 pb-4 border-b border-gray-100 min-h-[2rem] ${
                          viewMode === "list" ? "justify-between" : ""
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Eye size={14} className="text-gray-400" />
                          <span>{item.viewCount} lượt xem</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package size={14} className="text-gray-400" />
                          <span>{item.rentCount} lượt thuê</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">
                            {item.availableQuantity}/{item.quantity}
                          </span>{" "}
                          còn lại
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-auto flex gap-2">
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1"
                        >
                          <AddToCartButton
                            itemId={item._id}
                            availableQuantity={item.availableQuantity}
                            size="sm"
                            variant="outline"
                            showText
                            className={`w-full ${
                              viewMode === "list"
                                ? "border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300"
                                : ""
                            }`}
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRentNow(item._id);
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all duration-300 ${
                            viewMode === "list"
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105"
                              : "bg-blue-600 text-white hover:bg-blue-700 text-sm"
                          }`}
                        >
                          <Zap
                            size={16}
                            className={
                              viewMode === "list"
                                ? "group-hover:rotate-12 transition-transform"
                                : ""
                            }
                          />
                          {viewMode === "list"
                            ? "Xem chi tiết"
                            : "Xem chi tiết"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && <Pagination />}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
