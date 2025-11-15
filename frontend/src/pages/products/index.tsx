"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getAllItems,
  getAllCategories,
  getFeaturedItems,
  getSearchTags,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  getHighlightedProducts,
} from "@/services/products/product.api";
import { vietnamProvinces } from "@/lib/vietnam-locations";
import {
  Search,
  Filter,
  MapPin,
  Eye,
  Package,
  X,
  ShoppingCart,
  Zap,
  Star,
  Bookmark,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AddToCartButton from "@/components/ui/common/AddToCartButton";
import FeaturedProductsSlider from "@/components/ui/products/featured-products-slider";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/redux_store";
import { toast } from "sonner";

// If your project exports a logout action from your auth slice, prefer importing it:
// import { logout } from "@/store/slices/auth";
// Fallback local action creator to avoid "Cannot find name 'logout'". This will dispatch
// a plain action { type: "auth/logout" } which your reducer can handle; replace with
// the real import when available.
const logout = () => ({ type: "auth/logout" });

interface Category {
  _id: string;
  name: string;
  parentCategoryId?: string | null;
  isActive?: boolean;
  level?: number;
}
interface TagItem {
  _id: string;
  name: string;
  count?: number;
}
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
const toIdString = (v: any): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof v.$oid === "string") return v.$oid;
  if (typeof v === "object" && typeof v.toString === "function")
    return v.toString();
  try {
    return String(v);
  } catch {
    return "";
  }
};
const normalizeItems = (rawItems: any[]): Product[] => {
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
      ? (item.Tags.map((t: any) => {
        const id = toIdString(t.TagId || t.Tag?._id || t._id || t.id);
        const name = t.Tag?.name || t.TagName || t.Name || t.name;
        if (!id || !name) return null;
        return { _id: id, name };
      }).filter(Boolean) as { _id: string; name: string }[])
      : [],
    city: item.City,
    district: item.District,
  }));
};
const formatPrice = (price: number, currency: string) => {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  }
  return `$${price}`;
};
export default function ProductPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isAuthenticated = useSelector(
    (state: RootState) => !!state.auth.accessToken
  );
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [mounted, setMounted] = useState(false);
  const [allItems, setAllItems] = useState<Product[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [maxPrice, setMaxPrice] = useState(5000000);
  const [featuredItems, setFeaturedItems] = useState<Product[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [showAllProvinces, setShowAllProvinces] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [localFavorites, setLocalFavorites] = useState<Set<string>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<Set<string>>(
    new Set()
  );
  const [localCounts, setLocalCounts] = useState<Map<string, number>>(
    new Map()
  );
  const [initialFavoritesLoaded, setInitialFavoritesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const itemsPerPage = 9;

  // Initialize currentPage from URL
  useEffect(() => {
    const p = Number(searchParams?.get("page") || "");
    if (Number.isFinite(p) && p >= 1) {
      setCurrentPage(p);
    }
  }, [searchParams]);
  const updatePageInUrl = (page: number) => {
    try {
      const sp = new URLSearchParams(searchParams?.toString() || "");
      if (page <= 1) sp.delete("page");
      else sp.set("page", String(page));
      const qs = sp.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    } catch { }
  };
  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(clamped);
    updatePageInUrl(clamped);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Fetch featured products
  const fetchFeaturedProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getHighlightedProducts();
      const result = await response.json();

      if (response.ok && result.success) {
        const formattedProducts = (result.data || []).map((product: any) => {
          // Get the thumbnail URL from the API response
          let thumbnailUrl = product.thumbnail || '/placeholder-image.jpg';

          // If no thumbnail, check the images array as fallback
          if (!thumbnailUrl || thumbnailUrl === '/placeholder-image.jpg') {
            if (product.images && product.images.length > 0) {
              const firstImage = product.images[0];
              if (typeof firstImage === 'object') {
                thumbnailUrl = firstImage.Url || firstImage.url || firstImage.thumbnail || thumbnailUrl;
              } else if (typeof firstImage === 'string') {
                thumbnailUrl = firstImage;
              }
            }
          }

          // Ensure the URL is properly formatted
          if (thumbnailUrl && thumbnailUrl !== '/placeholder-image.jpg') {
            // If it's a relative path, make sure it's served from the public folder
            if (!thumbnailUrl.startsWith('http') && !thumbnailUrl.startsWith('/')) {
              thumbnailUrl = `/${thumbnailUrl}`;
            }
            // If it's a local path, make sure it's served from the public folder
            if (thumbnailUrl.startsWith('/') && !thumbnailUrl.startsWith('http')) {
              // Remove any leading slashes to prevent double slashes
              const cleanPath = thumbnailUrl.replace(/^\/+/, '');
              thumbnailUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/${cleanPath}`;
            }
          }

          console.log('Final thumbnail URL:', thumbnailUrl); // Debug log

          // Map PriceUnitId to the corresponding unit name
          const getUnitName = (priceUnitId: number) => {
            switch (priceUnitId) {
              case 1: return 'giờ';
              case 2: return 'ngày';
              case 3: return 'tuần';
              case 4: return 'tháng';
              default: return 'ngày';
            }
          };

          // Use PriceUnitId if available, otherwise fall back to priceUnit from the backend
          const unitName = product.PriceUnitId ? getUnitName(product.PriceUnitId) :
            (product.priceUnit?.UnitName || 'ngày');

          const priceUnit = { UnitName: unitName };

          return {
            _id: product._id || '',
            title: product.Title || 'No title',
            shortDescription: product.Description || '',
            thumbnail: thumbnailUrl,
            basePrice: product.BasePrice || 0,
            currency: product.Currency || 'VND',
            depositAmount: product.DepositAmount || 0,
            createdAt: product.CreatedAt || new Date().toISOString(),
            availableQuantity: 1, // Default to 1 as we don't have this in the API
            quantity: 1,
            viewCount: product.ViewCount || 0,
            rentCount: product.RentCount || 0,
            favoriteCount: product.FavoriteCount || 0,
            address: [product.Address, product.District, product.City].filter(Boolean).join(', '),
            city: product.City,
            district: product.District,
            condition: product.condition || { ConditionName: 'Used' },
            priceUnit: priceUnit,
            category: product.category ? {
              _id: product.category._id || (product.CategoryId || ''),
              name: product.category.Name || product.category.name || ''
            } : null,
            tags: (product.tags || []).map((tag: any) => ({
              _id: tag._id,
              name: tag.Name || tag.name
            })),
            isHighlighted: true // Since we're fetching highlighted products
          };
        });

        setFeaturedProducts(formattedProducts);
      } else {
        throw new Error(result.message || 'Failed to fetch highlighted products');
      }
    } catch (err) {
      console.error("Error fetching featured products:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : String(err || "Có lỗi xảy ra khi tải sản phẩm nổi bật");
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch featured products on component mount
  useEffect(() => {
    fetchFeaturedProducts();
  }, [fetchFeaturedProducts]);

  // Auto slide featured products with sliding window of 4 products
  useEffect(() => {
    if (featuredProducts.length <= 4) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % (featuredProducts.length - 3));
    }, 3000);
    return () => clearInterval(interval);
  }, [featuredProducts.length]);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % (featuredProducts.length - 3));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + (featuredProducts.length - 3)) % (featuredProducts.length - 3));
  };

  const getVisibleProducts = () => {
    if (featuredProducts.length <= 4) return featuredProducts;
    const endIndex = currentSlide + 4;
    if (endIndex > featuredProducts.length) {
      return [
        ...featuredProducts.slice(currentSlide),
        ...featuredProducts.slice(0, endIndex % featuredProducts.length)
      ];
    }
    return featuredProducts.slice(currentSlide, endIndex);
  };

  // Fetch data
  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [itemData, cateData, featuredRes, tagsRes] = await Promise.all([
          getAllItems(),
          getAllCategories(),
          getFeaturedItems({ page: 1, limit: 12 }),
          getSearchTags(),
        ]);
        const normalizedItems = normalizeItems(
          itemData?.data?.items || itemData?.items || []
        );
        const normalizedCates = cateData?.data || cateData || [];
        const processedCates: Category[] = (normalizedCates as any[]).map(
          (c: any) => ({
            _id: toIdString(c._id || c.id),
            name: c.name,
            parentCategoryId:
              c.parentCategoryId === "" || c.parentCategoryId == null
                ? null
                : toIdString(c.parentCategoryId),
            isActive: c.isActive,
            level: typeof c.level === "number" ? c.level : undefined,
          })
        );
        setAllItems(normalizedItems);
        setItems(normalizedItems);
        setCategories(processedCates);
        const normalizedFeatured = normalizeItems(
          featuredRes?.data?.items || featuredRes?.items || []
        );
        setFeaturedItems(normalizedFeatured);
        const tagList: TagItem[] = (tagsRes?.data?.tags || []).map(
          (t: any) => ({
            _id: toIdString(t._id),
            name: t.name,
            count: t.count,
          })
        );
        setTags(tagList);
      } catch (err) {
        const errorMsg = "Không thể tải dữ liệu sản phẩm. Vui lòng thử lại.";
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchFeaturedProducts();
  }, [fetchFeaturedProducts]);
  useEffect(() => {
    const fetchInitialFavorites = async () => {
      if (!isAuthenticated || initialFavoritesLoaded || !accessToken || loading)
        return;
      try {
        const res = await getFavorites();
        if (res.ok) {
          const data = await res.json();
          const favorites = data.data || [];
          const favoriteIds = new Set<string>(
            favorites.map((fav: any) => toIdString(fav.productId?._id))
          );
          setLocalFavorites(favoriteIds);
          const countsMap = new Map<string, number>();
          favorites.forEach((fav: any) => {
            const prodId = toIdString(fav.productId?._id);
            const count = Number(fav.productId?.FavoriteCount || 0);
            countsMap.set(prodId, count);
          });
          setLocalCounts(countsMap);
        } else {
          const errorData = await res.json().catch(() => ({}));
          const errorMsg =
            errorData.message || `Lỗi tải danh sách yêu thích: ${res.status}`;
          if (res.status === 401 || res.status === 403) {
            dispatch(logout());
            router.push("/auth/login");
            toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
          } else {
            toast.error(errorMsg);
          }
        }
      } catch (err) {
        const errorMsg = "Lỗi khi tải danh sách yêu thích ban đầu.";
        toast.error(errorMsg);
      } finally {
        setInitialFavoritesLoaded(true);
      }
    };
    fetchInitialFavorites();
  }, [
    isAuthenticated,
    accessToken,
    loading,
    initialFavoritesLoaded,
    dispatch,
    router,
  ]);

  // Filter items
  useEffect(() => {
    let filtered = [...allItems];

    if (selectedCategory) {
      const selected = categories.find((c) => c._id === selectedCategory);
      if (selected) {
        // For all category levels, get all descendant IDs
        const allowed = new Set([
          selectedCategory,
          ...getDescendantIds(selectedCategory),
        ]);
        filtered = filtered.filter(
          (item) => item.category && allowed.has(item.category._id)
        );
      }
    }
    filtered = filtered.filter((item) => item.basePrice <= maxPrice);
    if (search) {
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (selectedProvince) {
      const sp = selectedProvince.toLowerCase();
      filtered = filtered.filter((p) => (p.city || "").toLowerCase() === sp);
    }

    if (selectedTagIds.size > 0) {
      filtered = filtered.filter((item) => {
        const itemTagIds = new Set(
          (item.tags || []).map((t) => toIdString(t._id))
        );
        return [...selectedTagIds].some((id) => itemTagIds.has(id));
      });
    }

    setItems(filtered);
    setCurrentPage(1);
  }, [
    selectedCategory,
    maxPrice,
    search,
    selectedTagIds,
    selectedProvince,
    allItems,
    categories,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / itemsPerPage)),
    [items.length]
  );

  // Clamp currentPage when totalPages changes
  useEffect(() => {
    setCurrentPage((p) => {
      const clamped = Math.max(1, Math.min(totalPages, p));
      if (clamped !== p) {
        updatePageInUrl(clamped);
      }
      return clamped;
    });
  }, [totalPages, updatePageInUrl]);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return items.slice(start, end);
  }, [items, currentPage]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId));
  };

  const getChildren = (parentId: string | null) =>
    categories.filter((c) => (c.parentCategoryId ?? null) === parentId);

  const getRootCategories = () =>
    categories.filter((c) => (c.level ?? 0) === 0);

  const getDescendantIds = (categoryId: string): string[] => {
    const direct = getChildren(categoryId);
    const all: string[] = [];
    for (const c of direct) {
      all.push(c._id);
      all.push(...getDescendantIds(c._id));
    }
    return all;
  };

  const renderChildTree = (parentId: string, level = 0) => {
    const children = getChildren(parentId);
    if (!children.length) return null;
    return (
      <div className="space-y-1">
        {children.map((child) => (
          <div key={child._id}>
            <div
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
              onClick={() => toggleExpand(child._id)}
            >
              <input
                id={`cat-${child._id}`}
                type="radio"
                name="category"
                checked={selectedCategory === child._id}
                onClick={(e) => e.stopPropagation()}
                onChange={() => handleCategorySelect(child._id)}
                className="border-gray-300"
              />
              <label
                htmlFor={`cat-${child._id}`}
                className="text-sm text-gray-700 cursor-pointer"
                style={{ paddingLeft: level * 8 }}
              >
                {child.name}
              </label>
              {getChildren(child._id).length > 0 && (
                <span className="ml-auto text-xs text-gray-500">
                  {expandedNodes.has(child._id) ? "−" : "+"}
                </span>
              )}
            </div>
            {expandedNodes.has(child._id) && (
              <div className="pl-4">
                {renderChildTree(child._id, level + 1)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRentNow = (productId: string) => {
    router.push(`/products/details?id=${productId}`);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const toggleFavorite = async (productId: string, currentCount: number) => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      toast.error("Vui lòng đăng nhập để thêm vào yêu thích.");
      return;
    }
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
        const errorData = await res.json().catch(() => ({}));
        const errorMsg =
          errorData.message || `Lỗi! Mã trạng thái: ${res.status}`;

        if (res.status === 400) {
          if (errorMsg.includes("đã được yêu thích") && !isFavorite) {
            setLocalFavorites((prev) => new Set([...prev, productId]));
            setLocalCounts((prev) =>
              new Map(prev).set(productId, (currentCount || 0) + 1)
            );
            toast.success("Đã thêm vào yêu thích!");
            return;
          } else if (errorMsg.includes("chưa được yêu thích") && isFavorite) {
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
          dispatch(logout());
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
    } catch (err: any) {
      const errorMsg = err.message || "Lỗi khi cập nhật yêu thích.";
      toast.error(errorMsg);
      if (isFavorite) {
        setLocalFavorites((prev) => new Set([...prev, productId]));
        setLocalCounts((prev) =>
          new Map(prev).set(productId, (currentCount || 0) + 1)
        );
      } else {
        setLocalFavorites((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        setLocalCounts((prev) =>
          new Map(prev).set(productId, Math.max(0, (currentCount || 0) - 1))
        );
      }
    } finally {
      setFavoriteLoading((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };
  const getFavoriteCount = (productId: string, apiCount: number) => {
    return localCounts.get(productId) ?? apiCount;
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Đang tải sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-6">
      {/* Featured Products Slider */}
      <FeaturedProductsSlider
        featuredProducts={featuredProducts}
        isLoading={isLoading}
        formatPrice={formatPrice}
      />

      <div className="container mx-auto px-4 max-w-7xl py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-72 hidden lg:block">
            <div className="bg-white shadow rounded-2xl p-4 sticky top-6">
              <h3 className="font-semibold mb-4">Bộ lọc</h3>
              {/* Categories */}
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-gray-700">Danh mục</h4>
                <div className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === null}
                    onChange={() => setSelectedCategory(null)}
                    className="border-gray-300"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    Tất cả sản phẩm
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
                  {getRootCategories().map((root) => (
                    <div key={root._id}>
                      <div
                        className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleExpand(root._id)}
                      >
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === root._id}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleCategorySelect(root._id)}
                          className="border-gray-300"
                        />
                        <span className="text-sm text-gray-700 font-medium flex-1">
                          {root.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {expandedNodes.has(root._id) ? "−" : "+"}
                        </span>
                      </div>
                      {expandedNodes.has(root._id) &&
                        getChildren(root._id).length > 0 && (
                          <div className="pl-6 py-1">
                            {renderChildTree(root._id)}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Price */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">
                  Giá thuê (VND)
                </h4>
                <input
                  type="range"
                  min={0}
                  max={5000000}
                  step={50000}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0</span>
                  <span>5.000.000</span>
                </div>
                <div className="text-right text-sm text-gray-700 mt-1">
                  Tối đa: {new Intl.NumberFormat("vi-VN").format(maxPrice)}đ
                </div>
              </div>
              {/* Province */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-700">Nơi cho thuê</h4>
                  {selectedProvince && (
                    <button
                      onClick={() => setSelectedProvince("")}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {(showAllProvinces ? vietnamProvinces : vietnamProvinces.slice(0, 6)).map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="province"
                        checked={selectedProvince === p}
                        onChange={() => setSelectedProvince(p)}
                        className="accent-blue-600"
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                  {vietnamProvinces.length > 6 && (
                    <button
                      onClick={() => setShowAllProvinces((v) => !v)}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      {showAllProvinces ? "Thu gọn" : "Xem thêm"}
                    </button>
                  )}
                </div>
              </div>
              {/* Tags */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-700">Tag phổ biến</h4>
                  {selectedTagIds.size > 0 && (
                    <button
                      onClick={() => setSelectedTagIds(new Set())}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Xóa lọc
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => {
                    const active = selectedTagIds.has(t._id);
                    return (
                      <span
                        key={t._id}
                        onClick={() => toggleTag(t._id)}
                        className={`text-xs px-3 py-1 rounded-full cursor-pointer transition ${active
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-600"
                          }`}
                      >
                        #{t.count ? `${t.name} (${t.count})` : t.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main
            className={`flex-1 transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
          >
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Sản phẩm cho thuê</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/products/myfavorite")}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
                  disabled={!isAuthenticated}
                >
                  <Bookmark className="w-4 h-4 text-yellow-300" />
                  <span>Danh sách yêu thích</span>
                </button>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-blue-500 hover:underline"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>
            <div className="mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                  <Search size={20} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {pagedItems.length > 0 ? (
                pagedItems.map((item, index) => {
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
                      className="group h-full flex flex-col cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 overflow-hidden opacity-0 translate-y-2"
                      style={{
                        transitionDelay: `${index * 50}ms`,
                        opacity: mounted ? 1 : 0,
                        transform: mounted
                          ? "translateY(0)"
                          : "translateY(0.5rem)",
                      }}
                    >
                      <div className="relative h-48 bg-gray-200 overflow-hidden">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                        />
                        {item.availableQuantity === 0 && (
                          <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                            Hết hàng
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2 min-h-[3.5rem]">
                          {item.title}
                        </h3>
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
                              disabled={
                                favoriteLoading.has(item._id) ||
                                !isAuthenticated
                              }
                              className={`p-1 rounded transition-colors ${isLocalFavorite
                                  ? "text-yellow-500 hover:text-yellow-600"
                                  : "text-gray-500 hover:text-yellow-500"
                                } ${favoriteLoading.has(item._id) ||
                                  !isAuthenticated
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer"
                                }`}
                              title={
                                isLocalFavorite
                                  ? "Bỏ yêu thích"
                                  : isAuthenticated
                                    ? "Thêm yêu thích"
                                    : "Đăng nhập để yêu thích"
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
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3 min-h-[1.5rem]">
                          <MapPin size={14} className="text-gray-400" />
                          <span className="truncate">
                            {item.district}, {item.city}
                          </span>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 mb-3 min-h-[4.5rem]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600 mb-1">
                                Giá thuê
                              </p>
                              <p className="text-lg font-bold text-blue-600">
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
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-4 pb-4 border-b border-gray-100 min-h-[2rem]">
                          <div className="flex items-center gap-1">
                            <Eye size={14} />
                            <span>{item.viewCount} lượt xem</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package size={14} />
                            <span>{item.rentCount} lượt thuê</span>
                          </div>
                          <div>
                            <span className="font-semibold">
                              {item.availableQuantity}/{item.quantity}
                            </span>{" "}
                            còn lại
                          </div>
                        </div>
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
                              className="w-full"
                            />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRentNow(item._id);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Zap size={16} />
                            Xem chi tiết
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <Package size={64} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Không tìm thấy sản phẩm
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.
                  </p>
                  <button
                    onClick={() => {
                      setSearch("");
                      setSelectedCategory(null);
                      setMaxPrice(5000000);
                      setSelectedTagIds(new Set());
                      setSelectedProvince("");
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Xem tất cả
                  </button>
                </div>
              )}
            </div>

            {/* Pagination */}
            {items.length > itemsPerPage && (
              <div className="mt-6 flex items-center justify-center gap-2 select-none">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded border text-sm ${currentPage === 1
                      ? "text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i + 1)}
                    className={`w-9 h-9 rounded border text-sm font-medium ${currentPage === i + 1
                        ? "bg-blue-600 text-white border-blue-600"
                        : "text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded border text-sm ${currentPage === totalPages
                      ? "text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  Sau
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}