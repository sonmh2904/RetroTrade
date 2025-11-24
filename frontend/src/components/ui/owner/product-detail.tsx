import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import Image from "next/image";
import {
  Bookmark,
  Eye,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Star,
  Package,
  Clock,
  DollarSign,
  CheckCircle,
  Edit2,
  Trash2,
  ArrowLeft,
  Clock as ClockIcon,
  XCircle,
  Tag,
} from "lucide-react";
import {
  getProductById,
  deleteProduct,
} from "../../../services/products/product.api";
import { toast } from "sonner";
import RatingSection from "@/components/ui/products/rating";

interface Image {
  _id?: string;
  Url: string;
  IsPrimary?: boolean;
  Ordinal?: number;
}

interface Category {
  _id: string;
  Name?: string;
  name?: string;
}

interface Condition {
  _id?: string;
  ConditionName: string;
}

interface PriceUnit {
  _id?: string;
  UnitName: string;
}

interface Tag {
  _id?: string;
  name: string;
}

interface ProductTag {
  _id?: string;
  TagId?: string;
  Tag?: Tag;
  name?: string;
}

interface Review {
  _id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  userAvatar?: string;
}

interface Product {
  _id: string;
  Title: string;
  ShortDescription: string;
  Description: string;
  StatusId?: number;
  Images: Image[];
  Category?: Category;
  Condition?: Condition;
  PriceUnit?: PriceUnit;
  BasePrice: number;
  DepositAmount: number;
  Currency: string;
  Quantity: number;
  AvailableQuantity: number;
  MinRentalDuration: number;
  MaxRentalDuration: number;
  Address: string;
  District: string;
  City: string;
  ViewCount: number;
  FavoriteCount: number;
  RentCount: number;
  Tags?: ProductTag[];
  Reviews?: Review[];
  CreatedAt: string;
  UpdatedAt: string;
  rejectReason?: string;
}

const ProductDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isAuthenticated = useSelector(
    (state: { auth: { accessToken: string } }) => !!state.auth.accessToken
  );

  const formatCurrency = (value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
  };

  const fetchProduct = useCallback(async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getProductById(productId);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setProduct(data.data as Product);
        } else {
          setError("Không thể tải thông tin sản phẩm");
        }
      } else {
        setError("Lỗi khi tải thông tin sản phẩm");
      }
    } catch (err) {
      console.error("Error fetching product:", err);
      setError("Có lỗi xảy ra khi tải sản phẩm");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id && isAuthenticated) {
      fetchProduct(id as string);
    } else if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [id, isAuthenticated, fetchProduct, router]);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!product) return;

    try {
      const response = await deleteProduct(product._id);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success("Xóa sản phẩm thành công!");
          router.push("/owner/myproducts");
        } else {
          toast.error(data.message || "Lỗi khi xóa sản phẩm");
        }
      } else {
        toast.error("Lỗi khi xóa sản phẩm");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      toast.error("Có lỗi xảy ra khi xóa sản phẩm");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handlePrevImage = () => {
    if (!product?.Images || product.Images.length === 0) return;
    setSelectedImageIndex((prev) =>
      prev === 0 ? product.Images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!product?.Images || product.Images.length === 0) return;
    setSelectedImageIndex((prev) =>
      prev === product.Images.length - 1 ? 0 : prev + 1
    );
  };

  const getStatusBadge = () => {
    const statuses: Record<
      number,
      { color: string; text: string; icon: React.FC<{ size?: number }> }
    > = {
      1: {
        color: "bg-yellow-500 text-white",
        text: "Chờ duyệt",
        icon: ClockIcon,
      },
      2: {
        color: "bg-green-500 text-white",
        text: "Đã duyệt",
        icon: CheckCircle,
      },
      3: { color: "bg-red-500 text-white", text: "Bị từ chối", icon: XCircle },
    };
    const statusId = product?.StatusId ?? 1;
    const statusConfig = statuses[statusId] || statuses[1];
    const StatusIcon = statusConfig.icon;

    return (
      <div
        className={`absolute top-4 left-4 flex flex-col items-start gap-1 px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.color} shadow-lg`}
      >
        <div className="flex items-center gap-1">
          <StatusIcon size={14} />
          <span>{statusConfig.text}</span>
        </div>
      </div>
    );
  };

  const getConditionBadge = () => {
    return (
      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-200">
        {product?.Condition?.ConditionName || "Như mới"}
      </span>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">
            Đang tải thông tin sản phẩm...
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">
            {error || "Không tìm thấy sản phẩm"}
          </div>
          <button
            onClick={() => router.push("/owner/myproducts")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const images = product.Images || [];
  const tags =
    product.Tags?.map((t: ProductTag) => t.Tag?.name || t.name || "").filter(
      Boolean
    ) || [];

  const hasRejectReason = product.StatusId === 3 && product.rejectReason;
  const rejectReason = product.rejectReason ?? "";

  const mainRejectReason = hasRejectReason
    ? rejectReason.substring(0, 100) + (rejectReason.length > 100 ? "..." : "")
    : "";

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div className="flex items-center justify-between">
              <div className="mb-8">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
                >
                  <ArrowLeft size={20} />
                  <span>Quay lại</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-600" />
                  Chi tiết sản phẩm
                </h1>
                <p className="text-gray-600">Xem chi tiết sản phẩm của bạn</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/owner/myproducts/update/${id}`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit2 size={18} />
                  Chỉnh sửa
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 font-medium rounded-lg border border-red-200 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden group mb-4">
                  {images.length > 0 && (
                    <Image
                      src={images[selectedImageIndex].Url}
                      alt={product.Title}
                      width={800}
                      height={600}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  {images.length > 0 && (
                    <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                      {selectedImageIndex + 1} / {images.length}
                    </div>
                  )}

                  {/* Status Badge */}
                  {getStatusBadge()}
                </div>

                {/* Thumbnail Gallery */}
                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {images.map((img: Image, idx: number) => (
                      <button
                        key={img._id || idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImageIndex === idx
                            ? "border-blue-500 ring-2 ring-blue-200"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Image
                          src={img.Url}
                          alt={`Ảnh ${idx + 1}`}
                          width={100}
                          height={100}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Information */}
            <div className="space-y-4">
              {/* Title & Status */}
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {hasRejectReason && (
                      <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md mb-2 border border-red-200">
                        Lý do từ chối: {mainRejectReason}
                      </p>
                    )}
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {product.Title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      {product.ShortDescription}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                      {product.Category?.Name ||
                        product.Category?.name ||
                        "Chưa phân loại"}
                    </span>
                    {getConditionBadge()}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Eye size={16} />
                      <span>{product.ViewCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bookmark size={16} />
                      <span>{product.FavoriteCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package size={16} />
                      <span>{product.RentCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star
                        size={16}
                        className="text-yellow-400 fill-yellow-400"
                      />
                      <span> - </span>{" "}
                      {/* Average rating sẽ được tính từ RatingSection */}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Info */}
              <div className="bg-white rounded-xl p-6 shadow-sm border min-h-[200px] mb-8">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign size={20} className="text-green-600" />
                  Thông tin giá
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-gray-700">Giá cho thuê</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(product.BasePrice)} /{" "}
                      {product.PriceUnit?.UnitName || "ngày"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-gray-700">Tiền đặt cọc</span>
                    <span className="text-lg font-semibold text-blue-600">
                      {formatCurrency(product.DepositAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inventory & Rental Info */}
              <div className="bg-white rounded-xl p-6 shadow-sm border min-h-[200px] mb-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package size={20} className="text-blue-600" />
                  Thông tin cho thuê
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">
                      Tổng số lượng
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {product.Quantity}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Còn trống</div>
                    <div className="text-xl font-bold text-green-600">
                      {product.AvailableQuantity || product.Quantity}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">
                      Thuê tối thiểu
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {product.MinRentalDuration}{" "}
                      {product.PriceUnit?.UnitName || "ngày"}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">
                      Thuê tối đa
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {product.MaxRentalDuration}{" "}
                      {product.PriceUnit?.UnitName || "ngày"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Timeline*/}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto">
            {/* Location */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin size={20} className="text-red-500" />
                Địa điểm
              </h3>
              <div className="space-y-1 text-gray-700">
                <p className="mb-2">{product.Address}</p>
                <p className="mb-1">
                  <span className="font-medium">Xã/Phường:</span>{" "}
                  {product.District}
                </p>
                <p>
                  <span className="font-medium">Tỉnh/Thành phố:</span>{" "}
                  {product.City}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock size={20} className="text-purple-600" />
                Thời gian
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngày tạo:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(product.CreatedAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cập nhật gần nhất:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(product.UpdatedAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-6">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Mô tả chi tiết
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-6">
                {product.Description}
              </p>
            </div>
          </div>

          {/* Tags Section */}
          {tags.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-6">
              <div className="border-b px-6 py-4 flex items-center gap-2">
                <Tag size={20} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Thẻ gắn kết (Tags)
                </h3>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 rounded-full text-sm font-medium border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <Tag size={14} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rating Section - Chỉ hiển thị đánh giá (không form) */}
          {product && (
            <RatingSection
              itemId={product._id}
              orders={[]} // Truyền mảng rỗng để canReview = false, chỉ hiển thị
            />
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="text-red-600" size={32} />
            </div>

            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Xác nhận xóa sản phẩm
            </h3>

            <p className="text-gray-600 text-center mb-6">
              Bạn có chắc chắn muốn xóa sản phẩm{" "}
              <span className="font-semibold">
                &quot;{product?.Title}&quot;
              </span>
              ? Hành động này không thể hoàn tác.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Xóa sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default ProductDetail;
