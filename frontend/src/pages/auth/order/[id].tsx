// pages/order/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { getOrderDetails, Order } from "@/services/auth/order.api";
import { getPublicItemById } from "@/services/products/product.api";
import { format } from "date-fns";
import {
  Package,
  MapPin,
  Calendar,
  CreditCard,
  User,
  FileText,
  Loader2,
  Truck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  Home,
  ShoppingBag,
  Eye,
  ChevronRight,
  Store,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/common/button";
import Link from "next/link";

// Helper function to calculate rental duration
const calculateRentalDuration = (
  startDate: string,
  endDate: string,
  priceUnit?: string
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());

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
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
    default:
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }
};

const getRentalDurationText = (duration: number, priceUnit?: string): string => {
  const unit = priceUnit?.toLowerCase();
  switch (unit) {
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

// Format price helper
const formatPrice = (price: number, currency: string) => {
  if (currency === "VND" || !currency) {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  }
  return `$${price}`;
};

// Helper functions to convert status to Vietnamese
const getOrderStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    progress: "Đang thuê",
    returned: "Đã trả hàng",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
    disputed: "Tranh chấp",
  };
  return statusMap[status.toLowerCase()] || status;
};

const getPaymentStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "Chờ thanh toán",
    not_paid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
    partial: "Thanh toán một phần",
  };
  return statusMap[status.toLowerCase()] || status;
};

// Get status badge color
const getStatusBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "confirmed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "progress":
    case "active":
    case "in_progress":
      return "bg-green-100 text-green-800 border-green-200";
    case "returned":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "completed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    case "disputed":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "paid":
      return "bg-green-100 text-green-800 border-green-200";
    case "not_paid":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "refunded":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "partial":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// Interface cho địa chỉ sản phẩm
interface ItemAddress {
  Address?: string;
  City?: string;
  District?: string;
}

// Google Maps types
interface GoogleMapsLatLng {
  lat(): number;
  lng(): number;
}

interface GoogleMapsGeocoderResult {
  geometry: {
    location: GoogleMapsLatLng;
  };
}

interface GoogleMapsDirectionsResult {
  routes: unknown[];
}

interface GoogleMapsMap {
  fitBounds(bounds: GoogleMapsLatLngBounds): void;
}

interface GoogleMapsLatLngBounds {
  extend(latLng: GoogleMapsLatLng): void;
}

interface GoogleMapsDirectionsService {
  route(request: {
    origin: GoogleMapsLatLng | string;
    destination: GoogleMapsLatLng | string;
    travelMode: string;
  }, callback: (result: GoogleMapsDirectionsResult | null, status: string) => void): void;
}

interface GoogleMapsDirectionsRenderer {
  setDirections(result: GoogleMapsDirectionsResult): void;
  setMap(map: GoogleMapsMap | null): void;
}

interface GoogleMapsGeocoder {
  geocode(request: { address: string }, callback: (results: GoogleMapsGeocoderResult[] | null, status: string) => void): void;
}

// Marker is created but not stored, so no interface needed

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options?: Record<string, unknown>) => GoogleMapsMap;
        DirectionsService: new () => GoogleMapsDirectionsService;
        DirectionsRenderer: new (options?: Record<string, unknown>) => GoogleMapsDirectionsRenderer;
        Geocoder: new () => GoogleMapsGeocoder;
        LatLngBounds: new () => GoogleMapsLatLngBounds;
        Marker: new (options?: Record<string, unknown>) => void;
        TravelMode: {
          DRIVING: string;
          WALKING: string;
          BICYCLING: string;
          TRANSIT: string;
        };
      };
    };
  }
}

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemAddress, setItemAddress] = useState<ItemAddress | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMapsMap | null>(null);
  const directionsServiceRef = useRef<GoogleMapsDirectionsService | null>(null);
  const directionsRendererRef = useRef<GoogleMapsDirectionsRenderer | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}&libraries=places,directions`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => console.error("Failed to load Google Maps");
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    } else if (window.google) {
      setMapLoaded(true);
    }
  }, []);

  // Fetch order details
  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        const res = await getOrderDetails(id as string);
        if (res.code === 200 && res.data) {
          setOrder(res.data);
          
          // Fetch item details to get product address
          if (res.data.itemId?._id) {
            try {
              const itemRes = await getPublicItemById(res.data.itemId._id);
              const itemData = itemRes?.data || itemRes;
              if (itemData) {
                setItemAddress({
                  Address: itemData.Address,
                  City: itemData.City,
                  District: itemData.District,
                });
              }
            } catch (itemErr) {
              console.error("Error fetching item address:", itemErr);
            }
          }
        } else {
          setError(res.message || "Không tìm thấy đơn hàng");
          setOrder(null);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Lỗi khi tải dữ liệu đơn hàng"
        );
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  // Initialize map and draw route
  useEffect(() => {
    if (!mapLoaded || !window.google || !mapRef.current || !order || !itemAddress) return;

    // Initialize map
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 10.8231, lng: 106.6297 }, // Default to Ho Chi Minh City
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;
    directionsServiceRef.current = new window.google.maps.DirectionsService();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: false,
    });

    // Geocode addresses and draw route
    const geocoder = new window.google.maps.Geocoder();

    // Build addresses
    const originAddress = `${itemAddress.Address || ""}, ${itemAddress.District || ""}, ${itemAddress.City || ""}`.trim();
    const destinationAddress = `${order.shippingAddress.street}, ${order.shippingAddress.ward}${order.shippingAddress.district ? `, ${order.shippingAddress.district}` : ""}, ${order.shippingAddress.province}`.trim();

    if (!originAddress || !destinationAddress) {
      console.warn("Missing address information");
      return;
    }

    // Geocode both addresses
    Promise.all([
      new Promise<GoogleMapsLatLng>((resolve, reject) => {
        geocoder.geocode({ address: originAddress }, (results: GoogleMapsGeocoderResult[] | null, status: string) => {
          if (status === "OK" && results?.[0]) {
            resolve(results[0].geometry.location);
          } else {
            reject(new Error(`Geocoding failed for origin: ${status}`));
          }
        });
      }),
      new Promise<GoogleMapsLatLng>((resolve, reject) => {
        geocoder.geocode({ address: destinationAddress }, (results: GoogleMapsGeocoderResult[] | null, status: string) => {
          if (status === "OK" && results?.[0]) {
            resolve(results[0].geometry.location);
          } else {
            reject(new Error(`Geocoding failed for destination: ${status}`));
          }
        });
      }),
    ])
      .then(([originLatLng, destLatLng]) => {
        // Set map center to show both points
        const bounds = new window.google!.maps.LatLngBounds();
        bounds.extend(originLatLng);
        bounds.extend(destLatLng);
        map.fitBounds(bounds);

        // Add markers
        new window.google!.maps.Marker({
          position: originLatLng,
          map: map,
          title: "Nơi cho thuê",
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          },
          label: {
            text: "Nơi cho thuê",
            color: "#1e40af",
            fontWeight: "bold",
          },
        });

        new window.google!.maps.Marker({
          position: destLatLng,
          map: map,
          title: "Nơi nhận hàng",
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
          },
          label: {
            text: "Nơi nhận hàng",
            color: "#dc2626",
            fontWeight: "bold",
          },
        });

        // Draw route
        if (directionsServiceRef.current) {
          directionsServiceRef.current.route(
            {
              origin: originLatLng,
              destination: destLatLng,
              travelMode: window.google!.maps.TravelMode.DRIVING,
            },
            (result: GoogleMapsDirectionsResult | null, status: string) => {
              if (status === "OK" && result && directionsRendererRef.current) {
                directionsRendererRef.current.setDirections(result);
              } else {
                console.error("Directions request failed:", status);
              }
            }
          );
        }
      })
      .catch((err) => {
        console.error("Error geocoding addresses:", err);
      });
  }, [mapLoaded, order, itemAddress]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    // Breadcrumb data for error state
    const breadcrumbs = [
      { label: "Trang chủ", href: "/home", icon: Home },
      { label: "Giỏ hàng", href: "/auth/cartitem", icon: ShoppingBag },
      { label: "Xác nhận thuê", href: "/auth/order", icon: Truck },
      { label: "Chi tiết đơn hàng", href: `/auth/order/${id}`, icon: Eye },
    ];

    return (
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

          <div className="text-center max-w-md mx-auto px-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy đơn hàng</h2>
            <p className="text-gray-600 mb-6">{error || "Đơn hàng không tồn tại hoặc đã bị xóa"}</p>
            <Link href="/order">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Xem danh sách đơn hàng
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rentalDuration = calculateRentalDuration(
    order.startAt,
    order.endAt,
    order.itemSnapshot.priceUnit
  );
  const durationText = getRentalDurationText(
    rentalDuration,
    order.itemSnapshot.priceUnit
  );

  // Hiển thị giá từ backend - không tính toán lại
  // Backend đã tính sẵn tất cả các giá trị:
  // - totalAmount = rentalAmount (tiền thuê)
  // - serviceFee = phí dịch vụ (tính trên tiền thuê + tiền cọc)
  // - depositAmount = tiền cọc
  // - finalAmount = rentalAmount + depositAmount + serviceFee - totalDiscountAmount
  
  // Tiền thuê (rentalTotal) - lấy từ backend
  const rentalTotal = order.totalAmount || 0;
  
  // Tiền cọc (depositTotal) - lấy từ backend
  const depositTotal = order.depositAmount || 0;
  
  // Phí dịch vụ (serviceFeeAmount) - lấy từ backend
  const serviceFeeAmount = order.serviceFee || 0;
  
  // Lấy discount info từ order
  const discount = order.discount;
  const publicDiscountAmount = discount?.amountApplied || 0;
  const privateDiscountAmount = discount?.secondaryAmountApplied || 0;
  const totalDiscountAmount = discount?.totalAmountApplied || (publicDiscountAmount + privateDiscountAmount);
  
  // Sử dụng finalAmount từ backend (đã tính sẵn)
  // Nếu không có finalAmount, tính lại: rentalTotal + depositTotal + serviceFeeAmount - totalDiscountAmount
  const grandTotal = order.finalAmount || Math.max(0, rentalTotal + depositTotal + serviceFeeAmount - totalDiscountAmount);

  // Breadcrumb data
  const breadcrumbs = [
    { label: "Trang chủ", href: "/home", icon: Home },
    { label: "Giỏ hàng", href: "/auth/cartitem", icon: ShoppingBag },
    { label: "Xác nhận thuê", href: "/auth/order", icon: Truck },
    { label: "Chi tiết đơn hàng", href: `/auth/order/${id}`, icon: Eye },
  ];

  return (
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

        {/* Header */}
        <div className="mb-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 flex items-center justify-center gap-4">
              <FileText className="w-12 h-12 text-emerald-600" />
              Chi tiết đơn hàng
            </h1>
            <p className="text-lg text-gray-600 mt-3">
              Mã đơn hàng: <span className="font-mono font-semibold">{order.orderGuid}</span>
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status & Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex flex-wrap gap-3 mb-6">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusBadgeColor(
                    order.orderStatus
                  )}`}
                >
                  Trạng thái đơn hàng: {getOrderStatusLabel(order.orderStatus)}
                </span>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusBadgeColor(
                    order.paymentStatus
                  )}`}
                >
                  Thanh toán: {getPaymentStatusLabel(order.paymentStatus)}
                </span>
              </div>

              {/* Product Info */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="font-bold text-xl mb-6 flex items-center gap-3">
                  <Package className="w-6 h-6 text-blue-600" />
                  Thông tin sản phẩm
                </h2>
                <div className="flex gap-6">
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-32 h-32 flex-shrink-0 overflow-hidden">
                    {order.itemSnapshot.images?.[0] ? (
                      <img
                        src={order.itemSnapshot.images[0]}
                        alt={order.itemSnapshot.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="w-14 h-14" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {order.itemSnapshot.title}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                        {order.unitCount} cái
                      </span>
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                        {durationText}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-base text-gray-700">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      {format(new Date(order.startAt), "dd/MM/yyyy HH:mm")} →{" "}
                      {format(new Date(order.endAt), "dd/MM/yyyy HH:mm")}
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Giá thuê:</span>
                        <p className="text-xl font-bold text-emerald-600">
                          {formatPrice(rentalTotal, order.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-3">
                <MapPin className="w-6 h-6 text-red-600" />
                Địa chỉ giao hàng
              </h2>
              
              {/* Địa chỉ nơi cho thuê */}
              {itemAddress && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Nơi cho thuê
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    {itemAddress.Address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{itemAddress.Address}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>
                        {itemAddress.District && `${itemAddress.District}, `}
                        {itemAddress.City}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Địa chỉ nơi nhận hàng */}
              <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Nơi nhận hàng
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">{order.shippingAddress.fullName}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{order.shippingAddress.street}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>
                      {order.shippingAddress.ward}
                      {order.shippingAddress.district && `, ${order.shippingAddress.district}`}
                      {`, ${order.shippingAddress.province}`}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{order.shippingAddress.phone}</span>
                  </div>
                </div>
              </div>

              {/* Google Maps */}
              {itemAddress && (
                <div className="mt-6 relative">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-600" />
                    Bản đồ đường đi
                  </h3>
                  <div className="relative">
                    <div 
                      ref={mapRef}
                      className="w-full h-96 rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg"
                      style={{ minHeight: "400px" }}
                    />
                    {!mapLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Đang tải bản đồ...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" />
                Thông tin người tham gia
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Người thuê */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      {order.renterId.avatarUrl ? (
                        <Image
                          src={order.renterId.avatarUrl}
                          alt={order.renterId.fullName}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-200 border-2 border-blue-300 flex items-center justify-center">
                          <User className="w-8 h-8 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 mb-1">Người thuê</h3>
                      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full w-fit">
                        <User className="w-3 h-3" />
                        <span>Người mua</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <User className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Họ và tên</p>
                        <p className="text-base font-semibold text-gray-800">{order.renterId.fullName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Mail className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm text-gray-700 break-all">{order.renterId.email}</p>
                      </div>
                    </div>
                  </div>
      </div>

                {/* Người cho thuê */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      {order.ownerId.avatarUrl ? (
                        <Image
                          src={order.ownerId.avatarUrl}
                          alt={order.ownerId.fullName}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-emerald-200 border-2 border-emerald-300 flex items-center justify-center">
                          <Store className="w-8 h-8 text-emerald-600" />
                        </div>
                      )}
                    </div>
      <div>
                      <h3 className="font-bold text-lg text-gray-800 mb-1">Người cho thuê</h3>
                      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full w-fit">
                        <Store className="w-3 h-3" />
                        <span>Chủ cửa hàng</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-emerald-200">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <User className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Họ và tên</p>
                        <p className="text-base font-semibold text-gray-800">{order.ownerId.fullName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Mail className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm text-gray-700 break-all">{order.ownerId.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-emerald-200">
                    <Link href={`/store/${order.ownerId.userGuid || order.ownerId._id}`}>
                      <Button
                        variant="outline"
                        className="w-full text-emerald-600 border-emerald-300 hover:bg-emerald-100 font-medium"
                      >
                        <Store className="w-4 h-4 mr-2" />
                        Xem cửa hàng
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white rounded-2xl shadow-xl p-8 sticky top-24">
              <h2 className="font-bold text-2xl mb-6 flex items-center gap-3">
                <CreditCard className="w-8 h-8" />
                Tóm tắt thanh toán
              </h2>
              <div className="space-y-3 text-base">
                {/* 1. Tiền thuê */}
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-emerald-50">Tiền thuê</span>
                  <span className="font-semibold text-white">
                    {formatPrice(rentalTotal, order.currency)}
                  </span>
                </div>

                {/* 2. Phí dịch vụ */}
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-yellow-200">Phí dịch vụ</span>
                  <span className="font-semibold text-yellow-100">
                    {formatPrice(serviceFeeAmount, order.currency)}
                  </span>
                </div>

                {/* 3. Tiền cọc */}
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-amber-200">Tiền cọc</span>
                  <span className="font-semibold text-amber-100">
                    {formatPrice(depositTotal, order.currency)}
                  </span>
                </div>

                {/* 4. Giảm giá (nếu có) */}
                {totalDiscountAmount > 0 && (
                  <div className="space-y-1">
                    {publicDiscountAmount > 0 && discount?.code && (
                      <div className="flex justify-between items-center py-1 border-b border-white/10">
                        <span className="text-emerald-50 text-sm">
                          Giảm giá công khai ({discount.code})
                        </span>
                        <span className="font-semibold text-emerald-100 text-sm">
                          -{formatPrice(publicDiscountAmount, order.currency)}
                        </span>
                      </div>
                    )}
                    {privateDiscountAmount > 0 && discount?.secondaryCode && (
                      <div className="flex justify-between items-center py-1 border-b border-white/10">
                        <span className="text-emerald-50 text-sm">
                          Giảm giá riêng tư ({discount.secondaryCode})
                        </span>
                        <span className="font-semibold text-emerald-100 text-sm">
                          -{formatPrice(privateDiscountAmount, order.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-white/20">
                      <span className="text-emerald-50 font-semibold">Tổng giảm giá</span>
                      <span className="font-semibold text-emerald-100">
                        -{formatPrice(totalDiscountAmount, order.currency)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 5. Tổng cộng */}
                <div className="border-t border-emerald-400 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng cộng</span>
                    <span className="text-2xl">
                      {formatPrice(grandTotal, order.currency)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-emerald-100 text-center italic">
                    (Hoàn lại tiền cọc sau khi trả đồ)
                  </div>
                </div>

                {/* Chi tiết mã giảm giá đã sử dụng */}
                {discount && (discount.code || discount.secondaryCode) && (
                  <div className="mt-4 pt-4 border-t border-emerald-400">
                    <div className="text-xs text-emerald-200/80 space-y-1">
                      {discount.code && (
                        <div>
                          <span className="font-semibold">Mã công khai:</span> {discount.code}{" "}
                          {discount.type === "percent"
                            ? `(${discount.value}%)`
                            : `(${formatPrice(discount.value ?? 0, order.currency)})`}{" "}
                          -{" "}
                          {formatPrice(discount.amountApplied || 0, order.currency)}
                        </div>
                      )}
                      {discount.secondaryCode && (
                        <div>
                          <span className="font-semibold">Mã riêng tư:</span> {discount.secondaryCode}{" "}
                          {discount.secondaryType === "percent"
                            ? `(${discount.secondaryValue}%)`
                            : `(${formatPrice(discount.secondaryValue ?? 0, order.currency)})`}{" "}
                          -{" "}
                          {formatPrice(discount.secondaryAmountApplied || 0, order.currency)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-emerald-400 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-emerald-100">
                  <Truck className="w-4 h-4" />
                  <span>Phương thức: {order.paymentMethod}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ngày tạo: {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-emerald-100 bg-white/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4" />
                <span>Thanh toán an toàn qua {order.paymentMethod}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
