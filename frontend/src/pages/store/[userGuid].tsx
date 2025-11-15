"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/redux_store";
import { MapPin, Star, Bookmark, ShieldCheck, Truck, BadgeCheck, Clock3, ChevronLeft, ChevronRight, Loader2, Eye, ChevronDown, MessageCircle, Zap } from "lucide-react";
import { getFavorites, getPublicStoreByUserGuid } from "@/services/products/product.api";
import OwnerRatingsSection from "@/components/owner/OwnerRatingsSection";
import type { OwnerRatingStats } from "@/components/owner/OwnerRatingsSection";
import AddToCartButton from "@/components/ui/common/AddToCartButton";
import { toast } from "sonner";

interface Product {
  DepositAmount: number;
  IsHighlighted: any;
  FavoriteCount: number;
  RentCount: number;
  ViewCount: number;
  Quantity: number;
  _id: string;
  Title: string;
  ShortDescription?: string;
  BasePrice: number;
  Currency: string;
  PriceUnit?: { UnitName: string } | null;
  Category?: { _id: string; name: string } | null;
  Images?: { Url: string }[];
  City?: string;
  District?: string;
  AvailableQuantity?: number;
  Owner?: {
    _id?: string;
    userGuid?: string;
    UserGuid?: string;
    DisplayName?: string;
    FullName?: string;
    AvatarUrl?: string;
  } | null;
}

interface Owner {
  _id: string;
  userGuid: string;
  email?: string;
  fullName?: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
  reputationScore?: number;
  createdAt?: string;
}

const formatPrice = (price: number, currency: string) => {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  }
  return `$${price}`;
};

const LIMIT = 8; // Updated to 8 products per page/load

export default function OwnerStorePage() {
  const router = useRouter();
  const { userGuid } = router.query as { userGuid?: string };

  // States
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [items, setItems] = useState<Product[]>([]); // For pagination mode
  const [products, setProducts] = useState<Product[]>([]); // For load more mode
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadMoreMode, setIsLoadMoreMode] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<Set<string>>(new Set());
  const [ownerRatingStats, setOwnerRatingStats] = useState<OwnerRatingStats | null>(null);
  const isAuthenticated = useAppSelector((state: RootState) => !!state.auth.accessToken);
  const accessToken = useAppSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useAppDispatch();

  const totalPages = useMemo(() => Math.ceil((total || 0) / LIMIT), [total]);

  const availableCategories = useMemo(() => {
    const displayItems = isLoadMoreMode ? products : items;
    return Array.from(new Set(displayItems.map((it) => it.Category?.name).filter(Boolean)));
  }, [isLoadMoreMode, products, items]);

  const displayItems = useMemo(() => (isLoadMoreMode ? products : items), [isLoadMoreMode, products, items]);
  const ownerInfo = useMemo(() => owner, [owner]);

  // Update URL with current query params (only for pagination mode)
  const updateUrl = useCallback((page: number) => {
    if (isLoadMoreMode) return; // No URL update in load more mode
    const query: any = { ...router.query };
    if (page > 1) {
      query.page = page.toString();
    } else {
      delete query.page;
    }
    router.replace(
      {
        pathname: router.pathname,
        query,
      },
      undefined,
      { shallow: true }
    );
  }, [router, isLoadMoreMode]);

  // Read page from URL and trigger data fetch (only for pagination mode)
  useEffect(() => {
    if (router.isReady && !isLoadMoreMode) {
      const page = parseInt(router.query.page as string) || 1;
      setCurrentPage(page);
      fetchStoreData(page);
    }
  }, [router.isReady, router.query.page, isLoadMoreMode]);

  // Fetch user's favorites on component mount
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!isAuthenticated) return;
      
      try {
        const { getFavorites } = await import('@/services/products/product.api');
        const res = await getFavorites();
        
        if (res.ok) {
          const data = await res.json();
          // Normalize IDs to string to satisfy Set<string> typing
          const favoriteIdsArray = (data?.data || []).map((fav: any) => {
            const id = fav?.productId?._id ?? fav?.productId;
            return id == null ? null : String(id);
          }).filter((id: string | null): id is string => id !== null);
          const favoriteIds = new Set<string>(favoriteIdsArray);
          setFavorites(favoriteIds);
        } else if (res.status === 401 || res.status === 403) {
          // Handle unauthorized
          router.push('/auth/login');
          toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
        toast.error('Không thể tải danh sách yêu thích');
      }
    };

    fetchFavorites();
  }, [isAuthenticated, router]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (productId: string, currentFavoriteCount: number) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      toast.error('Vui lòng đăng nhập để thêm vào yêu thích');
      return;
    }

    if (favoriteLoading.has(productId)) return;
    
    const isFavorite = favorites.has(productId);
    
    // Optimistic update
    setFavoriteLoading(prev => new Set(prev).add(productId));
    
    // Update local state
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (isFavorite) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });

    // Update the item's favorite count in display items
    const updateDisplayItems = (prevItems: Product[]) => 
      prevItems.map(item => 
        item._id === productId 
          ? { 
              ...item, 
              FavoriteCount: isFavorite 
                ? Math.max(0, (item.FavoriteCount || 1) - 1)
                : (item.FavoriteCount || 0) + 1
            } 
          : item
      );

    if (isLoadMoreMode) {
      setProducts(updateDisplayItems);
    } else {
      setItems(updateDisplayItems);
    }

    try {
      // Dynamically import the required API functions
      const { addToFavorites, removeFromFavorites } = await import('@/services/products/product.api');
      
      if (isFavorite) {
        await removeFromFavorites(productId);
      } else {
        await addToFavorites(productId);
      }

      // Success - state already updated optimistically
      toast.success(isFavorite ? 'Đã xóa khỏi yêu thích!' : 'Đã thêm vào yêu thích!');
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      
      // Revert optimistic update
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (isFavorite) {
          newSet.add(productId);
        } else {
          newSet.delete(productId);
        }
        return newSet;
      });
      
      const revertDisplayItems = (prevItems: Product[]) => 
        prevItems.map(item => 
          item._id === productId 
            ? { 
                ...item, 
                FavoriteCount: isFavorite 
                  ? (item.FavoriteCount || 0) + 1
                  : Math.max(0, (item.FavoriteCount || 1) - 1)
              } 
            : item
        );

      if (isLoadMoreMode) {
        setProducts(revertDisplayItems);
      } else {
        setItems(revertDisplayItems);
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        router.push('/auth/login');
        toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      } else {
        toast.error(error.message || 'Có lỗi xảy ra, vui lòng thử lại');
      }
    } finally {
      setFavoriteLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  }, [favorites, favoriteLoading, isAuthenticated, router, isLoadMoreMode]);

  async function fetchStoreData(page?: number) {
    if (!userGuid) {
      setError("Không có userGuid");
      setLoading(false);
      return;
    }
    
    const fetchPage = page || currentPage;

    try {
      setLoading(true);
      setError(null);
      const queryParams = { limit: LIMIT, page: fetchPage };
      const res = await getPublicStoreByUserGuid(String(userGuid), queryParams);
      const { owner: fetchedOwner, items: fetchedItems, total: fetchedTotal } = res?.data || res || { owner: null, items: [], total: 0 };
      setOwner(fetchedOwner);

      // Determine mode based on total (only on initial load)
      if (fetchPage === 1) {
        setTotal(fetchedTotal);
        setIsLoadMoreMode(false);
        setItems(fetchedItems);
      } else if (!isLoadMoreMode) {
        // For pagination mode, update items
        setItems(fetchedItems);
      }

    } catch (e) {
      console.error("Failed to load owner store", e);
      setError("Không thể tải dữ liệu cửa hàng");
    } finally {
      setLoading(false);
    }
  }

  // Load more handler for load more mode
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || products.length >= total) return;
    
    const nextPage = Math.ceil(products.length / LIMIT) + 1;
    try {
      setLoadingMore(true);
      const queryParams = { limit: LIMIT, page: nextPage };
      const res = await getPublicStoreByUserGuid(String(userGuid), queryParams);
      const { items: moreItems } = res?.data || res || { items: [] };
      setProducts(prev => [...prev, ...moreItems]);
    } catch (e) {
      console.error("Failed to load more", e);
      toast.error("Không thể tải thêm sản phẩm");
    } finally {
      setLoadingMore(false);
    }
  }, [userGuid, products.length, total, loadingMore]);

  // Handle page change with smooth scroll and URL update (only pagination mode)
  const handlePageChange = useCallback((newPage: number) => {
    if (isLoadMoreMode || newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchStoreData(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isLoadMoreMode, totalPages]);

  // Initial load is now handled by the URL-based effect above

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Đang tải cửa hàng...</p>
        </div>
      </div>
    );
  }

  if (error || !ownerInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Không tìm thấy chủ shop"}</p>
          <button
            onClick={() => router.push("/products")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 max-w-7xl py-6">
        {/* Back button */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()} 
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Quay lại
          </button>
        </div>

        {/* Owner header */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 mb-8 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 overflow-hidden ring-2 ring-white/50 shadow-md">
                {ownerInfo?.avatarUrl ? (
                  <img src={ownerInfo.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">👤</div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 flex-wrap mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {ownerInfo.displayName || ownerInfo.fullName || "Chủ shop"}
                </h1>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">Shop ID: {userGuid}</span>
              </div>
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-gray-900">
                    {ownerRatingStats?.average?.toFixed(1) ?? ownerInfo.reputationScore?.toFixed(1) ?? "5.0"}
                  </span>
                </div>
                <div className="hidden md:block w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1">
                  <Clock3 className="w-4 h-4 text-green-500" />
                  <span>Hoạt động tích cực</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
                  <BadgeCheck className="w-4 h-4" /> Uy tín
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200">
                  <MessageCircle className="w-4 h-4" /> Hỗ trợ 24/7
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-200">
                  <ShieldCheck className="w-4 h-4" /> Bảo đảm
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                  <div className="text-gray-600 text-sm">Sản phẩm</div>
                  <div className="text-2xl font-bold text-gray-900">{total}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                  <div className="text-gray-600 text-sm">Còn hàng</div>
                  <div className="text-2xl font-bold text-gray-900">{
                    displayItems.filter((it) => (it.AvailableQuantity ?? 0) > 0).length
                  }</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100">
                  <div className="text-gray-600 text-sm">Danh mục</div>
                  <div className="text-2xl font-bold text-gray-900">{
                    availableCategories.length
                  }</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100">
                  <div className="text-gray-600 text-sm">Lượt đánh giá</div>
                  <div className="text-2xl font-bold text-gray-900">{ownerRatingStats?.total ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product grid */}
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">Sản phẩm đang cho thuê</h2>
          </div>

          {displayItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <p>Chưa có sản phẩm nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayItems.map((it, index) => {
                const thumb = it.Images?.[0]?.Url || '/placeholder.jpg';
                const href = `/products/details?id=${it._id}`;
                const availableQuantity = it.AvailableQuantity || 0;
                const quantity = it.Quantity || 1;
                const viewCount = it.ViewCount || 0;
                const rentCount = it.RentCount || 0;
                const favoriteCount = it.FavoriteCount || 0;
                
                return (
                  <div
                    key={it._id}
                    onClick={() => router.push(href)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(href)}
                    className="group h-full flex flex-col cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 overflow-hidden"
                    style={{
                      transitionDelay: `${index * 50}ms`,
                    }}
                  >
                    <div className="relative h-48 bg-gray-200 overflow-hidden">
                      <img
                        src={thumb}
                        alt={it.Title}
                        className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                      />
                      {availableQuantity === 0 && (
                        <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                          Hết hàng
                        </div>
                      )}
                      {it.IsHighlighted && (
                        <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          <span>Nổi bật</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2 min-h-[3.5rem]">
                        {it.Title}
                      </h3>
                      <div className="flex items-center justify-between mb-3 text-xs text-gray-500 min-h-[2rem]">
                        <div className="flex items-center gap-2">
                          {it.Category && (
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              {it.Category.name}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(it._id, it.FavoriteCount || 0);
                          }}
                          className="flex items-center gap-1 group relative"
                          disabled={favoriteLoading.has(it._id)}
                          title={favorites.has(it._id) ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                        >
                          {favoriteLoading.has(it._id) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : (
                            <Bookmark 
                              size={16} 
                              className={`transition-colors ${
                                favorites.has(it._id) 
                                  ? 'text-yellow-500 fill-yellow-500' 
                                  : 'text-gray-400 hover:text-yellow-500'
                              }`} 
                            />
                          )}
                          <span 
                            className={`text-sm ${
                              favorites.has(it._id) 
                                ? 'text-yellow-600 font-medium' 
                                : 'text-gray-500'
                            }`}
                          >
                            {it.FavoriteCount || 0}
                          </span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-3 min-h-[1.5rem]">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="truncate">
                          {it.District || ''}{it.City ? `, ${it.City}` : ''}
                        </span>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 mb-3 min-h-[4.5rem]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">
                              Giá thuê
                            </p>
                            <p className="text-lg font-bold text-blue-600">
                              {formatPrice(it.BasePrice, it.Currency)}
                              <span className="text-sm font-normal text-gray-600">
                                /{it.PriceUnit?.UnitName || "ngày"}
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600 mb-1">
                              Đặt cọc
                            </p>
                            <p className="text-sm font-semibold text-gray-700">
                              {formatPrice(it.DepositAmount || 0, it.Currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Eye size={14} className="text-gray-400" />
                          <span>{viewCount} lượt xem</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Truck size={14} className="text-gray-400" />
                          <span>{rentCount} lượt thuê</span>
                        </div>
                        <div>
                          <span className="font-semibold">
                            {availableQuantity}/{quantity}
                          </span> sản phẩm
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div
                          className="h-full"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <AddToCartButton
                            itemId={it._id}
                            availableQuantity={availableQuantity}
                            size="sm"
                            variant="outline"
                            showText
                            className="w-full h-full justify-center py-2 text-[11px] sm:text-xs whitespace-nowrap"
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(href);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                        >
                          <Zap size={16} />
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button (for load more mode) */}
          {isLoadMoreMode && products.length < total && (
            <div className="text-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tải thêm...
                  </>
                ) : (
                  <>
                    Xem thêm
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Pagination (for pagination mode) */}
          {!isLoadMoreMode && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-12 space-y-4 sm:space-y-0">
              <div className="text-sm text-gray-500">
                Trang {currentPage} / {totalPages} ({total} sản phẩm)
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  } transition`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
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
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      } transition`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg border ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  } transition`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                
              </div>
            </div>
          )}
        </div>

        {/* Customer Reviews Section */}
        {ownerInfo?._id && (
          <OwnerRatingsSection 
            ownerId={ownerInfo._id} 
            onStatsUpdate={setOwnerRatingStats}
          />
        )}
      </div>
    </div>
  );
}