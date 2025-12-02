"use client";

import React, { useEffect, useState, useMemo } from "react";
import { listOrders } from "@/services/auth/order.api";
import {
  getRatingsByItem,
  createRating,
  updateRating,
  deleteRating,
} from "@/services/products/product.api";
import { Camera, Star, Video } from "lucide-react";
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
  videos?: string[];
  createdAt: string;
  isEdited?: boolean;
}

interface Order {
  _id: string;
  itemId: string;
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
  orders?: any;
}

const RatingSection: React.FC<Props> = ({ itemId }) => {
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [currentUser, setCurrentUser] = useState<JwtPayload | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [filteredRatings, setFilteredRatings] = useState<Rating[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStar, setFilterStar] = useState<number | null>(null);

  // Form state
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newVideo, setNewVideo] = useState<File | null>(null);

  // State khi đang sửa đánh giá
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [keptOldImages, setKeptOldImages] = useState<string[]>([]); // ảnh cũ còn giữ
  const [keptOldVideo, setKeptOldVideo] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  // Fetch orders (để kiểm tra có được đánh giá không)
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await listOrders();
        if (res.data) {
          const normalized = (res.data as any[]).map((o) => ({
            ...o,
            itemId:
              typeof o.itemId === "object"
                ? o.itemId._id || o.itemId
                : o.itemId,
            renterId: o.renterId || { _id: "" },
            orderStatus: o.orderStatus || "",
          }));
          setOrders(normalized);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    };
    if (currentUser) fetchOrders();
  }, [currentUser]);

  // Kiểm tra người dùng có được đánh giá không
  const canReview = useMemo(() => {
    if (!currentUser) return false;
    const eligibleOrder = orders.find(
      (o) =>
        o.itemId === itemId &&
        o.orderStatus.toLowerCase() === "completed" &&
        o.renterId._id === currentUser._id
    );
    if (!eligibleOrder) return false;

    const hasRated = ratings.some(
      (r) => r.itemId === itemId && r.renterId._id === currentUser._id
    );
    return !hasRated;
  }, [orders, ratings, itemId, currentUser]);

  const reviewableOrderId = useMemo(() => {
    if (!currentUser) return null;
    const order = orders.find(
      (o) =>
        o.itemId === itemId &&
        o.orderStatus.toLowerCase() === "completed" &&
        o.renterId._id === currentUser._id
    );
    return order?._id || null;
  }, [orders, itemId, currentUser]);

  // Filter theo sao
  const handleFilter = (star: number | null) => {
    setFilterStar(star);
    if (star === null) {
      setFilteredRatings(ratings);
    } else {
      setFilteredRatings(ratings.filter((r) => r.rating === star));
    }
  };

  // Bắt đầu sửa đánh giá
  const handleEditRating = (r: Rating) => {
    setEditingRatingId(r._id);
    setRating(r.rating);
    setComment(r.comment || "");
    setNewImages([]);
    setNewVideo(null);

    // Lưu lại ảnh/video cũ để quản lý xóa/thêm
    setKeptOldImages(r.images || []);
    setKeptOldVideo(r.videos?.[0] || null);

    setActiveDropdown(null);

  };

  // Reset form
  const resetForm = () => {
    setRating(5);
    setComment("");
    setNewImages([]);
    setNewVideo(null);
    setEditingRatingId(null);
    setKeptOldImages([]);
    setKeptOldVideo(null);
  };

  // Submit (tạo hoặc cập nhật)
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!currentUser || !comment.trim()) return;

  if (!canReview && !editingRatingId) {
    toast.error("Bạn không đủ điều kiện để đánh giá.");
    return;
  }

  try {
    setLoading(true);
    const formData = new FormData();

    // Thông tin cơ bản
    if (!editingRatingId && reviewableOrderId) {
      formData.append("orderId", reviewableOrderId);
    }
    formData.append("itemId", itemId);
    formData.append("renterId", currentUser._id);
    formData.append("rating", rating.toString());
    formData.append("comment", comment.trim());



    // THÊM 4 DÒNG MỚI SAU ĐÂY (chỉ gửi ảnh/video cũ KHI ĐANG SỬA)
    if (editingRatingId) {
      keptOldImages.forEach((url) => formData.append("images", url));
      if (keptOldVideo && !newVideo) {
        formData.append("videos", keptOldVideo);
      }
    }

    // === ẢNH MỚI (giữ nguyên) ===
    newImages.slice(0, 5).forEach((file) => formData.append("images", file));

    // === VIDEO MỚI (giữ nguyên) ===
    if (newVideo) {
      formData.append("videos", newVideo);
    }

    // Gửi request (giữ nguyên)
    if (editingRatingId) {
      await updateRating(editingRatingId, formData);
      toast.success("Cập nhật đánh giá thành công!");
    } else {
      await createRating(formData);
      toast.success("Đánh giá thành công!");
    }

    await fetchRatings();
    resetForm();
  } catch (err: any) {
    console.error("Submit rating error:", err);
    toast.error(err?.message || "Có lỗi xảy ra, vui lòng thử lại");
  } finally {
    setLoading(false);
  }
};

  // Xóa đánh giá
  const handleDeleteRating = async (id: string) => {
    try {
      await deleteRating(id, currentUser!._id);
      toast.success("Xóa đánh giá thành công!");
      fetchRatings();
    } catch (err: any) {
      toast.error(err?.message || "Xóa thất bại");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Tính trung bình
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

      {/* Tổng quan */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6 flex flex-col md:flex-row items-center justify-between">
        <div className="text-center md:text-left">
          <p className="text-5xl font-bold text-orange-500">{averageRating}</p>
          <div className="flex justify-center md:justify-start mt-2">
            {Array(5)
              .fill(0)
              .map((_, i) => (
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

        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <button
            onClick={() => handleFilter(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStar === null ? "bg-orange-500 text-white" : "bg-gray-100"
            }`}
          >
            Tất cả ({ratings.length})
          </button>
          {[5, 4, 3, 2, 1].map((star, i) => (
            <button
              key={star}
              onClick={() => handleFilter(star)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${
                filterStar === star ? "bg-yellow-500 text-white" : "bg-gray-100"
              }`}
            >
              {star} <Star size={14} className="fill-current" /> (
              {countByStar[i]})
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách đánh giá */}
      {filteredRatings.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Chưa có đánh giá nào.</p>
      ) : (
        <div className="space-y-5">
          {filteredRatings.map((r) => {
            const isOwner = currentUser?._id === r.renterId._id;
            return (
              <div
                key={r._id}
                className="bg-white rounded-xl shadow-sm border p-5"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <img
                      src={r.renterId?.avatarUrl || "/user.png"}
                      alt={r.renterId?.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{r.renterId?.fullName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {Array(5)
                          .fill(0)
                          .map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={
                                i < r.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }
                            />
                          ))}
                      </div>
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
                        <div className="absolute right-0 mt-2 w-32 bg-white border rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => handleEditRating(r)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmId(r._id);
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-3 text-gray-700">{r.comment}</p>
                {r.isEdited && (
                  <span className="text-xs text-gray-400">(Đã chỉnh sửa)</span>
                )}

                {r.images?.length || r.videos?.length ? (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {r.images?.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="review"
                        className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                        onClick={() => setPreviewImage(img)}
                      />
                    ))}
                    {r.videos?.map((v, i) => (
                      <video
                        key={i}
                        src={v}
                        controls
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                ) : null}

                <p className="text-sm text-gray-500 mt-3">
                  {new Date(r.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Form đánh giá */}
      {(canReview || editingRatingId) && currentUser && (
        <form
          onSubmit={handleSubmit}
          className="mt-10 bg-white rounded-xl shadow-lg border p-6"
        >
          <h3 className="text-2xl font-bold mb-6">
            {editingRatingId ? "Chỉnh sửa đánh giá của bạn" : "Viết đánh giá"}
          </h3>

          {/* Chọn sao */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">Chất lượng sản phẩm</p>
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-125"
                >
                  <Star
                    size={40}
                    className={
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <textarea
            className="w-full p-4 border rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
            rows={5}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />

          {/* Media Grid */}
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-4">
              Thêm tối đa 5 ảnh và 1 video (không bắt buộc)
            </p>
            <div className="grid grid-cols-6 gap-4">
              {/* Ảnh cũ còn giữ */}
              {keptOldImages.map((url, i) => (
                <div key={`old-${i}`} className="relative group">
                  <img
                    src={url}
                    alt="old"
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setKeptOldImages((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Ảnh mới */}
              {newImages.map((file, i) => (
                <div key={`new-${i}`} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="w-full aspect-square object-cover rounded-lg border-2 border-green-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNewImages((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Video cũ */}
              {keptOldVideo && !newVideo && (
                <div className="relative group">
                  <video
                    src={keptOldVideo}
                    controls
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setKeptOldVideo(null)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Video mới */}
              {newVideo && (
                <div className="relative group">
                  <video
                    src={URL.createObjectURL(newVideo)}
                    controls
                    className="w-full aspect-square object-cover rounded-lg border-2 border-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => setNewVideo(null)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Nút thêm ảnh */}
              {newImages.length + keptOldImages.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition">
                  <Camera size={32} className="text-gray-400" />
                  <span className="text-xs text-gray-500 mt-2">Thêm ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const total =
                        newImages.length + keptOldImages.length + files.length;
                      if (total > 5) {
                        toast.error("Chỉ được chọn tối đa 5 ảnh");
                        return;
                      }
                      setNewImages((prev) => [...prev, ...files]);
                    }}
                  />
                </label>
              )}

              {/* Nút thêm video */}
              {!newVideo && !keptOldVideo && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition">
                  <Video size={32} className="text-gray-400" />
                  <span className="text-xs text-gray-500 mt-2">Thêm video</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && setNewVideo(e.target.files[0])
                    }
                  />
                </label>
              )}
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={resetForm}
              className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !comment.trim()}
              className="px-10 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-md"
            >
              {loading
                ? "Đang gửi..."
                : editingRatingId
                ? "Cập nhật"
                : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      )}

      {/* Modal xác nhận xóa */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-3">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa đánh giá này? Hành động này không thể
              hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteRating(deleteConfirmId)}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview ảnh lớn */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="preview"
            className="max-w-full max-h-full rounded-lg pt-20"
          />
          <button className="absolute top-6 right-6 text-white text-4xl">
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default RatingSection;
