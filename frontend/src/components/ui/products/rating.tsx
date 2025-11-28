"use client";

import React, { useEffect, useState, useMemo } from "react";
import { listOrders } from "@/services/auth/order.api";
import {
  getRatingsByItem,
  createRating,
  updateRating,
  deleteRating,
} from "@/services/products/product.api";
import { Star } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";

interface Rating {
  _id: string;
  orderId: string;
  itemId: string;
  renterId: { _id: string; fullName: string; avatarUrl?: string };
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
}

interface Order {
  _id: string;
  itemId: string | { _id: string };
  renterId: { _id: string; fullName: string };
  orderStatus: string;
}

interface JwtPayload {
  _id: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  role?: string;
  exp: number;
  iat: number;
}

interface Props {
  itemId: string;
  orders?: Order[]; // Truyền từ trang chi tiết sản phẩm → tối ưu, không gọi API thừa
}

const RatingSection: React.FC<Props> = ({
  itemId,
  orders: propOrders = [],
}) => {
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [currentUser, setCurrentUser] = useState<JwtPayload | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [filteredRatings, setFilteredRatings] = useState<Rating[]>([]);
  const [filterStar, setFilterStar] = useState<number | null>(null);

  // Form state
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Decode token
  useEffect(() => {
    if (accessToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(accessToken);
        setCurrentUser(decoded);
      } catch (err) {
        console.error("Invalid token", err);
      }
    }
  }, [accessToken]);

  // Normalize orders từ props (truyền từ trang chi tiết)
  const normalizedOrders = useMemo(() => {
    if (!propOrders || propOrders.length === 0) return [];

    return propOrders.map((o: any) => ({
      ...o,
      itemId:
        typeof o.itemId === "object" ? o.itemId._id || o.itemId : o.itemId,
      renterId: o.renterId || { _id: "", fullName: "" },
      orderStatus: o.orderStatus || "",
    }));
  }, [propOrders]);

  // Fetch ratings
  const fetchRatings = async () => {
    try {
      const res = await getRatingsByItem(itemId);
      const data = Array.isArray(res?.data) ? res.data : [];
      setRatings(data);
      setFilteredRatings(data);
    } catch (err) {
      console.error("Error fetching ratings:", err);
      setRatings([]);
      setFilteredRatings([]);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [itemId]);

  // Kiểm tra người dùng có thể đánh giá không
  const canReview = useMemo(() => {
    if (!currentUser || normalizedOrders.length === 0) return false;

    const eligibleOrder = normalizedOrders.find(
      (order) =>
        order.itemId === itemId &&
        order.orderStatus.toLowerCase() === "completed" &&
        order.renterId._id === currentUser._id
    );

    if (!eligibleOrder) return false;

    const hasRated = ratings.some(
      (r) => r.itemId === itemId && r.renterId._id === currentUser._id
    );

    return !hasRated;
  }, [normalizedOrders, ratings, itemId, currentUser]);

  // Lấy orderId để gửi khi tạo đánh giá
  const reviewableOrderId = useMemo(() => {
    if (!currentUser) return null;
    const order = normalizedOrders.find(
      (o) =>
        o.itemId === itemId &&
        o.orderStatus.toLowerCase() === "completed" &&
        o.renterId._id === currentUser._id
    );
    return order?._id || null;
  }, [normalizedOrders, itemId, currentUser]);

  // Filter theo số sao
  const handleFilter = (star: number | null) => {
    setFilterStar(star);
    if (star === null) {
      setFilteredRatings(ratings);
    } else {
      setFilteredRatings(ratings.filter((r) => r.rating === star));
    }
  };

  // Submit (tạo hoặc sửa đánh giá)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !reviewableOrderId) return;

    if (!canReview && !editingRatingId) {
      toast.error("Bạn không đủ điều kiện để đánh giá sản phẩm này.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      if (!editingRatingId) formData.append("orderId", reviewableOrderId);
      formData.append("itemId", itemId);
      formData.append("renterId", currentUser._id);
      formData.append("rating", rating.toString());
      formData.append("comment", comment);
      if (images) {
        Array.from(images)
          .slice(0, 5)
          .forEach((file) => formData.append("images", file));
      }

      if (editingRatingId) {
        await updateRating(editingRatingId, formData);
        toast.success("Cập nhật đánh giá thành công!");
      } else {
        await createRating(formData);
        toast.success("Đánh giá thành công!");
      }

      await fetchRatings();
      setComment("");
      setImages(null);
      setRating(5);
      setEditingRatingId(null);
    } catch (err: any) {
      toast.error(err?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRating = async (ratingId: string) => {
    try {
      await deleteRating(ratingId, currentUser!._id);
      toast.success("Xóa đánh giá thành công!");
      fetchRatings();
    } catch (err: any) {
      toast.error(err?.message || "Xóa thất bại");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleEditRating = (r: Rating) => {
    setEditingRatingId(r._id);
    setRating(r.rating);
    setComment(r.comment);
    setImages(null);
    setActiveDropdown(null);
  };

  // Tính trung bình sao
  const averageRating =
    ratings.length > 0
      ? (
          ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
        ).toFixed(1)
      : "0.0";

  const countByStar = [5, 4, 3, 2, 1].map(
    (star) => ratings.filter((r) => r.rating === star).length
  );

  return (
    <div className="mt-6 border-t pt-6">
      <h2 className="text-2xl font-bold mb-6">Đánh giá sản phẩm</h2>

      {/* Tổng quan đánh giá */}
      <div className="bg-white border rounded-xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <p className="text-5xl font-bold text-yellow-500">{averageRating}</p>
          <div className="flex justify-center md:justify-start mt-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={24}
                className={
                  i < Math.round(+averageRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }
              />
            ))}
          </div>
          <p className="text-gray-600 mt-2">{ratings.length} đánh giá</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => handleFilter(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStar === null
                ? "bg-green-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Tất cả ({ratings.length})
          </button>
          {[5, 4, 3, 2, 1].map((star, i) => (
            <button
              key={star}
              onClick={() => handleFilter(star)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${
                filterStar === star
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {star} <Star size={16} className="fill-current" /> (
              {countByStar[i]})
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách đánh giá */}
      {filteredRatings.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Chưa có đánh giá nào.</p>
      ) : (
        <div className="space-y-4">
          {filteredRatings.map((r) => {
            const isOwner = currentUser?._id === r.renterId._id;

            return (
              <div
                key={r._id}
                className="bg-white border rounded-xl p-5 shadow-sm relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={r.renterId?.avatarUrl || "/user.png"}
                      alt={r.renterId.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{r.renterId.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  {isOwner && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveDropdown(
                            activeDropdown === r._id ? null : r._id
                          )
                        }
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                      >
                        ⋮
                      </button>
                      {activeDropdown === r._id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => handleEditRating(r)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => {
                              setDelete: setDeleteConfirmId(r._id);
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-1 mt-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className={
                        i < r.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }
                    />
                  ))}
                </div>

                <p className="mt-3 text-gray-700">{r.comment}</p>

                {r.images && r.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {r.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="Review"
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form đánh giá */}
      {(canReview || editingRatingId) && currentUser && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 bg-white border rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">
            {editingRatingId ? "Chỉnh sửa đánh giá của bạn" : "Viết đánh giá"}
          </h3>

          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={32}
                onClick={() => setRating(star)}
                className={`cursor-pointer transition ${
                  star <= rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>

          <textarea
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={4}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />

          <input
            type="file"
            multiple
            accept="image/*"
            className="mt-3 block text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 5) {
                toast.error("Chỉ được tải tối đa 5 ảnh");
                e.target.value = "";
              } else {
                setImages(e.target.files);
              }
            }}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-60 transition font-medium"
          >
            {loading
              ? "Đang gửi..."
              : editingRatingId
              ? "Cập nhật đánh giá"
              : "Gửi đánh giá"}
          </button>
        </form>
      )}

      {/* Modal xác nhận xóa */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold">Xác nhận xóa đánh giá?</h3>
            <p className="text-gray-600 mt-2">
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteRating(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingSection;
