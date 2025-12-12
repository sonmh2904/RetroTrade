"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import OwnerLayout from "../layout";
import {
  Edit2,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  MapPin,
  Package,
  Settings,
  LucideIcon,
  ChevronLeft,
  ChevronRight,
  Bookmark,
} from "lucide-react";
import {
  getUserProducts,
  deleteProduct,
} from "@/services/products/product.api";
import { toast } from "sonner";

interface Product {
  _id: string;
  Title: string;
  ShortDescription?: string;
  StatusId: number;
  Images?: Array<{ Url: string }>;
  Category?: { name: string };
  Condition?: { ConditionName: string };
  PriceUnit?: { UnitName: string };
  BasePrice: number;
  Currency: string;
  DepositAmount: number;
  District: string;
  City: string;
  ViewCount: number;
  FavoriteCount: number;
  RentCount: number;
  AvailableQuantity: number;
  Quantity: number;
}

// Component cho Counter Animation
const AnimatedCounter = ({ end, duration = 2000 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
     
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  return <span>{count}</span>;
};

const StatsCard = ({
  title,
  value,
  icon: Icon,
  bgColor,
  iconColor,
  borderColor,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-6 border-2 ${borderColor} relative overflow-hidden`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-2">
          <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            <AnimatedCounter end={value} />
          </p>
        </div>
        <div
          className={`w-16 h-16 ${bgColor} rounded-xl flex items-center justify-center`}
        >
          <Icon 
            className={`${iconColor} transition-transform duration-300 ${isHovered ? 'scale-110 rotate-6' : ''}`} 
            size={28} 
          />
        </div>
      </div>
     
      <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden relative z-10">
        <div
          className={`h-full ${bgColor} rounded-full opacity-80`}
          style={{
            width: '100%',
          }}
        />
      </div>
    </div>
  );
};

// Component StatusStats
interface Product {
  StatusId: number;
}
const StatusStats = ({ products }: { products: Product[] }) => {
  const pending = products.filter((p: Product) => p.StatusId === 1).length;
  const approved = products.filter((p: Product) => p.StatusId === 2).length;
  const rejected = products.filter((p: Product) => p.StatusId === 3).length;
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Tổng sản phẩm"
        value={products.length}
        icon={Package}
        bgColor="bg-gradient-to-br from-blue-500 to-blue-700"
        iconColor="text-white"
        borderColor="border-blue-200"
      />
     
      <StatsCard
        title="Chờ duyệt"
        value={pending}
        icon={Clock}
        bgColor="bg-gradient-to-br from-yellow-400 to-orange-500"
        iconColor="text-white"
        borderColor="border-yellow-200"
      />
     
      <StatsCard
        title="Đã duyệt"
        value={approved}
        icon={CheckCircle}
        bgColor="bg-gradient-to-br from-green-500 to-emerald-600"
        iconColor="text-white"
        borderColor="border-green-200"
      />
     
      <StatsCard
        title="Bị từ chối"
        value={rejected}
        icon={XCircle}
        bgColor="bg-gradient-to-br from-red-500 to-pink-600"
        iconColor="text-white"
        borderColor="border-red-200"
      />
    </div>
  );
};

export default function OwnerPanel() {
  return (
    <OwnerLayout>
      <MyProductsContent />
    </OwnerLayout>
  );
}

function MyProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getUserProducts();
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data.items || []);
        setFilteredProducts(data.data.items || []);
      } else {
        setError("Không thể tải danh sách sản phẩm. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error("Lỗi khi lấy sản phẩm:", err);
      setError("Có lỗi xảy ra khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = products;

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (p: Product) => p.StatusId === parseInt(statusFilter)
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (p: Product) =>
          p.Title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.ShortDescription?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
    setCurrentPage(1); 
  }, [statusFilter, searchTerm, products]);

  // Pagination logic
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const getStatusInfo = (statusId: number) => {
    const statuses: Record<
      number,
      { label: string; color: string; icon: LucideIcon }
    > = {
      1: {
        label: "Chờ duyệt",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      },
      2: {
        label: "Đã duyệt",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
      },
      3: {
        label: "Bị từ chối",
        color: "bg-red-100 text-red-800",
        icon: XCircle,
      },
    };
    return statuses[statusId] || statuses[1];
  };

  const getConditionName = (product: Product) => {
    return product.Condition?.ConditionName || "Không rõ";
  };

  const getPriceUnitName = (product: Product) => {
    return product.PriceUnit?.UnitName || "ngày";
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === "VND") {
      return new Intl.NumberFormat("vi-VN").format(price) + "đ";
    }
    return `$${price}`;
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      const response = await deleteProduct(productToDelete._id);
      if (response.ok) {
        setProducts(
          products.filter((p: Product) => p._id !== productToDelete._id)
        );
        setFilteredProducts(
          filteredProducts.filter((p: Product) => p._id !== productToDelete._id)
        );
        setShowDeleteModal(false);
        setProductToDelete(null);
        toast.success("Xóa sản phẩm thành công!");
      } else {
        const errorData = await response.json();
        toast.error(`Lỗi: ${errorData.message || "Không thể xóa sản phẩm."}`);
      }
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm:", error);
      toast.error("Có lỗi xảy ra khi xóa sản phẩm!");
    }
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Hiển thị <span className="font-medium">{indexOfFirst + 1}</span>{" "}
              đến{" "}
              <span className="font-medium">
                {Math.min(indexOfLast, filteredProducts.length)}
              </span>{" "}
              của <span className="font-medium">{filteredProducts.length}</span>{" "}
              kết quả
            </p>
          </div>
          <div>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => paginate(number)}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                    currentPage === number
                      ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {number}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <XCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Lỗi tải dữ liệu
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchProducts}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <Settings className="w-8 h-8 text-indigo-600" />
                  Sản phẩm của tôi
                </h1>
                <p className="text-gray-600">
                  Quản lý và theo dõi các sản phẩm cho thuê của bạn
                </p>
              </div>
              <Link
                href="/owner/myproducts/add"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Plus size={20} />
                Đăng sản phẩm mới
              </Link>
            </div>
      </div>

      <StatusStats products={products} />

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-400" />
                <select
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="1">Chờ duyệt</option>
                  <option value="2">Đã duyệt</option>
                  <option value="3">Bị từ chối</option>
                </select>
              </div>
            </div>
      </div>

      {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 mt-4">Đang tải...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Package size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Chưa có sản phẩm nào
              </h3>
              <Link
                href="/owner/myproducts/add"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Đăng sản phẩm mới
              </Link>
            </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-28 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hình ảnh
                        </th>
                        <th className="w-56 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tiêu đề & Mô tả
                        </th>
                        <th className="w-48 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Danh mục & Tình trạng
                        </th>
                        <th className="w-40 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Giá & Đặt cọc
                        </th>
                        <th className="w-28 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vị trí
                        </th>
                        <th className="w-30 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thống kê
                        </th>
                        <th className="w-24 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trạng thái
                        </th>
                        <th className="w-20 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentProducts.map((product: Product) => {
                        const statusInfo = getStatusInfo(product.StatusId);
                        const StatusIcon = statusInfo.icon;

                        return (
                          <tr
                            key={product._id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-3 py-2 whitespace-nowrap">
                              {product.Images && product.Images.length > 0 ? (
                                <Image
                                  src={product.Images[0].Url}
                                  alt={product.Title}
                                  width={60}
                                  height={50}
                                  className="object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                  <Package
                                    size={16}
                                    className="text-gray-400"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {product.Title}
                              </div>
                              <div className="text-xs text-gray-500 line-clamp-2">
                                {product.ShortDescription}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-sm text-gray-900 flex items-center gap-1">
                                <span className="font-medium">
                                  {product.Category?.name || "Chưa phân loại"}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {getConditionName(product)}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatPrice(
                                  product.BasePrice,
                                  product.Currency
                                )}
                                <span className="text-gray-500 text-xs">
                                  /{getPriceUnitName(product)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Đặt cọc:{" "}
                                {formatPrice(
                                  product.DepositAmount,
                                  product.Currency
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <MapPin
                                  size={14}
                                  className="text-gray-400 mr-1 flex-shrink-0"
                                />
                                <span className="text-xs text-gray-900 truncate">
                                  {product.District}, {product.City}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                              <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-1">
                                  <Eye size={12} />
                                  {product.ViewCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bookmark size={12} />
                                  {product.FavoriteCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Package size={12} />
                                  {product.RentCount}
                                </span>
                                <span className="text-xs">
                                  {product.AvailableQuantity}/{product.Quantity}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                              >
                                <StatusIcon size={10} className="mr-1" />
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-xs">
                              <div className="flex items-center gap-1 justify-end">
                                <Link
                                  href={`/owner/myproducts/${product._id}`}
                                  className="text-blue-600 hover:text-blue-900 p-0.5"
                                  title="Xem chi tiết"
                                >
                                  <Eye size={14} />
                                </Link>
                                <Link
                                  href={`/owner/myproducts/update/${product._id}`}
                                  className="text-blue-600 hover:text-blue-900 p-0.5"
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 size={14} />
                                </Link>
                                <button
                                  onClick={() => handleDeleteClick(product)}
                                  className="text-red-600 hover:text-red-900 p-0.5"
                                  title="Xóa"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            <Pagination />
          </div>
        </>
      )}

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
                    &quot;{productToDelete?.Title}&quot;
                  </span>
                  ? Hành động này không thể hoàn tác.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setProductToDelete(null);
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
    </div>
  );
}