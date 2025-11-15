"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  Eye,
  Package,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Bookmark,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getHighlightedProducts } from "@/services/products/product.api";

interface Product {
  _id: string;
  title: string;
  shortDescription?: string;
  thumbnail: string;
  basePrice: number;
  currency: string;
  depositAmount: number;
  viewCount?: number;
  rentCount?: number;
  favoriteCount?: number;
  city?: string;
  district?: string;
  priceUnit?: { UnitName: string };
}

interface FeaturedProductsSliderProps {
  featuredProducts?: Product[];
  isLoading?: boolean;
  formatPrice?: (price: number, currency: string) => string;
}

const formatPrice = (price: number, currency: string) => {
  if (currency === "VND") return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  return `$${price}`;
};

// Tối đa 180 ký tự
const truncateDescription = (desc?: string, max = 180) => {
  if (!desc) return "Khám phá sản phẩm nổi bật này ngay hôm nay!";
  return desc.length > max ? `${desc.slice(0, max)}...` : desc;
};

export default function FeaturedProductsSlider({
  featuredProducts: externalProducts,
  isLoading: externalLoading,
  formatPrice: externalFormatPrice,
}: FeaturedProductsSliderProps) {
  const router = useRouter();
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [internalProducts, setInternalProducts] = useState<Product[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  const [mainSlide, setMainSlide] = useState(0);
  const [stackSlide, setStackSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const featuredProducts = externalProducts ?? internalProducts;
  const isLoading = externalLoading ?? internalLoading;
  const priceFormatter = externalFormatPrice ?? formatPrice;
  const productsLength = featuredProducts?.length || 0;

  /* ---------- FETCH ---------- */
  const fetchFeaturedProducts = useCallback(async () => {
    if (externalProducts) return;
    try {
      setInternalLoading(true);
      const res = await getHighlightedProducts();
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Load error");
      const formatted = (json.data || []).map((p: any) => {
        let thumb = p.thumbnail || "/placeholder.jpg";
        if (!thumb.startsWith("http") && !thumb.startsWith("/")) thumb = `/${thumb}`;
        if (thumb.startsWith("/") && !thumb.startsWith("http"))
          thumb = `${process.env.NEXT_PUBLIC_API_URL || ""}${thumb.replace(/^\/+/, "/")}`;
        // Map numeric PriceUnitId (1=giờ,2=ngày,3=tuần,4=tháng) like products page
        const getUnitName = (priceUnitId: number) => {
          switch (priceUnitId) {
            case 1: return "giờ";
            case 2: return "ngày";
            case 3: return "tuần";
            case 4: return "tháng";
            default: return "ngày";
          }
        };

        const rawUnit = Array.isArray(p.priceUnit)
          ? p.priceUnit[0]
          : p.priceUnit || p.PriceUnit;

        const unitName = typeof p.PriceUnitId === "number"
          ? getUnitName(p.PriceUnitId)
          : (rawUnit && typeof rawUnit === "object" && "UnitName" in rawUnit
              ? (rawUnit as any).UnitName
              : "ngày");

        const unit = { UnitName: unitName };
        return {
          _id: p._id ?? "",
          title: p.Title ?? "No title",
          shortDescription: p.Description ?? "",
          thumbnail: thumb,
          basePrice: p.BasePrice ?? 0,
          currency: p.Currency ?? "VND",
          depositAmount: p.DepositAmount ?? 0,
          viewCount: p.ViewCount ?? 0,
          rentCount: p.RentCount ?? 0,
          favoriteCount: p.FavoriteCount ?? 0,
          city: p.City ?? "",
          district: p.District ?? "",
          priceUnit: unit,
        };
      });
      setInternalProducts(formatted);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi tải sản phẩm");
    } finally {
      setInternalLoading(false);
    }
  }, [externalProducts]);

  useEffect(() => {
    if (!externalProducts) fetchFeaturedProducts();
  }, [externalProducts, fetchFeaturedProducts]);

  /* ---------- AUTOPLAY 5s + LOOP VÔ HẠN ---------- */
  useEffect(() => {
    if (!featuredProducts || productsLength === 0 || isPaused) return;

    autoplayRef.current = setInterval(() => {
      setStackSlide((prev) => (prev + 1) % productsLength);
    }, 5000);

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [productsLength, isPaused, featuredProducts]);

  /* ---------- DELAY 2s CHO MAIN ---------- */
  useEffect(() => {
    if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);

    delayTimeoutRef.current = setTimeout(() => {
      setMainSlide(stackSlide);
    }, 2000);

    return () => {
      if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
    };
  }, [stackSlide]);

  /* ---------- CLICK CARD → MAIN NGAY ---------- */
  const handleCardClick = (index: number) => {
    setMainSlide(index);
    setStackSlide(index);
    if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
  };

  /* ---------- NÚT MAIN ---------- */
  const handleMainPrev = () => setMainSlide((p) => (p - 1 + productsLength) % productsLength);
  const handleMainNext = () => setMainSlide((p) => (p + 1) % productsLength);

  if (isLoading) {
    return (
      <section className="py-24 px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="container mx-auto text-center py-20">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-purple-600 animate-pulse" />
          </div>
          <p className="mt-6 text-black font-medium">Đang tải sản phẩm nổi bật...</p>
        </div>
      </section>
    );
  }

  if (productsLength === 0) {
    return (
      <section className="py-24 px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="container mx-auto text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 mb-6">
            <Package className="w-10 h-10 text-purple-600" />
          </div>
          <p className="text-black text-lg mb-6">Hiện chưa có sản phẩm nổi bật</p>
          <button
            onClick={fetchFeaturedProducts}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Tải lại
          </button>
        </div>
      </section>
    );
  }

  const mainProduct = featuredProducts[mainSlide];

  return (
    <section
      className="relative py-24 px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4664h2V6h4V4H6z\'/%3E%3C/g%3E%3C/svg%3E")',
            backgroundSize: "30px",
          }}
        />
      </div>

      <div className="container mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900"
          >
            SẢN PHẨM{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              NỔI BẬT
            </span>
          </motion.h2>
        </div>

        {/* MAIN + STACK */}
        <div className="relative h-[520px] md:h-[500px] rounded-3xl overflow-hidden bg-gray-900">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mainSlide}
              className="absolute inset-0 flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* BG */}
              <Image
                src={mainProduct.thumbnail || "/placeholder.jpg"}
                alt={mainProduct.title}
                fill
                className="object-cover"
                priority
                sizes="100vw"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  if (t.src !== "/placeholder.jpg") t.src = "/placeholder.jpg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

              {/* LEFT CONTENT */}
              <div className="relative z-10 flex items-center w-full md:w-1/2 pl-6 pr-8 md:pl-12 md:pr-16 lg:pl-20 xl:pl-24">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white"
                >
                  <motion.h1
                    className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight line-clamp-2 mb-3"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {mainProduct.title}
                  </motion.h1>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {mainProduct.district}, {mainProduct.city}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {mainProduct.viewCount ?? 0} xem
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {mainProduct.rentCount ?? 0} thuê
                    </div>
                    <div className="flex items-center gap-1">
                      <Bookmark className="w-4 h-4" />
                      {mainProduct.favoriteCount ?? 0} yêu thích
                    </div>
                  </div>

                  <p className="text-gray-200 mb-5 line-clamp-3">
                    {truncateDescription(mainProduct.shortDescription, 180)}
                  </p>

                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-300">Giá thuê</p>
                        <p className="text-xl font-bold">
                          {priceFormatter(mainProduct.basePrice, mainProduct.currency)}
                          {mainProduct.priceUnit?.UnitName && (
                            <span className="text-sm font-normal text-gray-300">
                              /{mainProduct.priceUnit.UnitName}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-300">Đặt cọc</p>
                        <p className="text-lg font-bold">
                          {priceFormatter(mainProduct.depositAmount, mainProduct.currency)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full font-bold w-full md:w-auto transition-all shadow-xl"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push(`/products/details?id=${mainProduct._id}`)}
                  >
                    <Sparkles className="w-4 h-4" />
                    Xem chi tiết
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              </div>

              {/* RIGHT – STACKED CARDS*/}
              <div className="hidden md:flex w-1/2 items-center justify-center">
                <div className="relative w-80 h-64">
                  <AnimatePresence initial={false}>
                    {featuredProducts.map((p, i) => {
                      const offset = (i - stackSlide + productsLength) % productsLength;
                      const isActive = offset === 0;

                      const rotate = offset * 8;
                      const x = offset * 22;
                      const y = offset * 18;
                      const scale = 1 - offset * 0.1;
                      const zIndex = 100 - offset;
                      const opacity = 1 - offset * 0.25;

                      return (
                        <motion.div
                          key={p._id}
                          className={`absolute top-8 right-28 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden cursor-pointer transition-all border-2 ${
                            isActive ? "border-purple-500" : "border-transparent"
                          }`}
                          style={{ zIndex, transformOrigin: "right center" }}
                          initial={{ x: 400, y: 200, rotate: 30, opacity: 0 }}
                          animate={{ x, y, rotate, scale, opacity }}
                          exit={{ x: -400, y: -200, rotate: -30, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 30,
                            mass: 1.2,
                          }}
                          whileHover={{
                            scale: scale + 0.12,
                            y: y - 20,
                            rotate: rotate - 3,
                            boxShadow: "0 25px 50px -12px rgba(139, 92, 246, 0.4)",
                          }}
                          onClick={() => handleCardClick(i)}
                        >
                          {/* GLOW KHI ACTIVE */}
                          {isActive && (
                            <div className="absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.6)] pointer-events-none animate-pulse" />
                          )}

                          <div className="relative h-40">
                            <Image
                              src={p.thumbnail || "/placeholder.jpg"}
                              alt={p.title}
                              fill
                              className="object-cover"
                              sizes="256px"
                              loading="lazy"
                            />
                            {isActive && (
                              <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                Đang xem
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-sm line-clamp-1 text-gray-800">
                              {p.title}
                            </h3>
                            <p className="text-purple-600 font-bold text-sm mt-1">
                              {priceFormatter(p.basePrice, p.currency)}
                              {p.priceUnit?.UnitName && `/${p.priceUnit.UnitName}`}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* NÚT MAIN */}
          {productsLength > 1 && (
            <>
              <button
                onClick={handleMainPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-xl z-20 hover:scale-110 transition"
                aria-label="Prev main"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleMainNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-xl z-20 hover:scale-110 transition"
                aria-label="Next main"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* DOTS */}
          {productsLength > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {Array.from({ length: productsLength }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleCardClick(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === mainSlide
                      ? "w-10 bg-white shadow-lg"
                      : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}