"use client";

import React, { useEffect, useState, useMemo } from "react";
import { listOrders } from "@/services/auth/order.api"; // import hàm API
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
  createdAt: string;
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
  orders?: Order[]; // ← Thêm prop này (tùy chọn)
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

  
  useEffect(() => {
    if (orders && orders.length > 0) {
      // Nếu đã có orders từ props thì chuẩn hóa một lần thôi
      const normalizedOrders = orders.map((o: any) => ({
        ...o,
        itemId:
          typeof o.itemId === "object" ? o.itemId._id || o.itemId : o.itemId,
        renterId: o.renterId || { _id: "" },
        orderStatus: o.orderStatus || "",
      }));
      setOrders(normalizedOrders);
    } else {
      // Chỉ fetch nếu không có orders từ props
      const fetchOrders = async () => {
        try {
          const res = await listOrders();
          if (res.data) {
            const normalizedOrders = (res.data as any[]).map((o) => ({
              ...o,
              itemId:
                typeof o.itemId === "object"
                  ? o.itemId._id || o.itemId
                  : o.itemId,
              renterId: o.renterId || { _id: "" },
              orderStatus: o.orderStatus || "",
            }));
            setOrders(normalizedOrders);
          }
        } catch (err) {
          console.error("Error fetching orders:", err);
        }
      };
      fetchOrders();
    }
  }, [itemId, orders?.length]); // chỉ phụ thuộc vào itemId hoặc length của orders

  // Check if user can review
  const canReview = useMemo(() => {
    if (!currentUser) return false;

    const eligibleOrder = orders.find(
      (order) =>
        order.itemId === itemId &&
        order.orderStatus.toLowerCase() === "completed" &&
        order.renterId._id.toString() === currentUser._id.toString()
    );

    if (!eligibleOrder) return false;

    const hasRated = ratings.some(
      (r) =>
        r.itemId === itemId &&
        r.renterId._id.toString() === currentUser._id.toString()
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

  const handleFilter = (star: number | null) => {
    setFilterStar(star);
    if (star === null) {
      setFilteredRatings(ratings);
    } else {
      setFilteredRatings(ratings.filter((r) => r.rating === star));
    }
  };

  // Submit rating (create/update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!canReview && !editingRatingId) {
      toast.error("Bạn không đủ điều kiện để đánh giá sản phẩm này.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      if (!editingRatingId && reviewableOrderId) {
        formData.append("orderId", reviewableOrderId);
      }
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

      // Refresh ratings
      await fetchRatings();

      // Reset form
      setComment("");
      setImages(null);
      setRating(5);
      setEditingRatingId(null);
    } catch (err: unknown) {
      console.error("Error submitting rating:", err);
      toast.error((err as Error)?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  // Delete rating
  const handleDeleteRating = async (ratingId: string) => {
    if (!currentUser) return;

    try {
      await deleteRating(ratingId, currentUser._id);
      toast.success("Xóa đánh giá thành công!");
      setActiveDropdown(null);
      fetchRatings();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Xóa đánh giá thất bại");
    }
  };

  // Edit rating
  const handleEditRating = (r: Rating) => {
    setEditingRatingId(r._id);
    setRating(r.rating);
    setComment(r.comment);
    setImages(null); // Optionally: set images if supporting editing
    setActiveDropdown(null);
  };

  // Average rating
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
    <div className="mt-6 border-t pt-4">
      <h2 className="text-xl font-semibold mb-4">Đánh giá sản phẩm</h2>

      {/* Tổng quan */}
      <div className="bg-white border rounded-lg p-4 mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="text-center md:text-left">
          <p className="text-4xl font-bold text-yellow-500">{averageRating}</p>
          <div className="flex justify-center md:justify-start mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={18}
                className={
                  i < Math.round(Number(averageRating))
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }
              />
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {ratings.length} lượt đánh giá
          </p>
        </div>

        <div className="flex flex-wrap justify-center md:justify-end gap-2 mt-3 md:mt-0">
          <button
            onClick={() => handleFilter(null)}
            className={`px-3 py-1 border rounded-md text-sm ${
              filterStar === null ? "bg-green-600 text-white" : ""
            }`}
          >
            Tất cả ({ratings.length})
          </button>
          {[5, 4, 3, 2, 1].map((star, i) => (
            <button
              key={i}
              onClick={() => handleFilter(star)}
              className={`px-3 py-1 border rounded-md text-sm flex items-center gap-1 ${
                filterStar === star ? "bg-yellow-500 text-white" : ""
              }`}
            >
              {star}{" "}
              <Star size={14} className="text-yellow-400 fill-yellow-400" /> (
              {countByStar[i]})
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách đánh giá */}
      {filteredRatings.length === 0 ? (
        <p className="text-gray-500">Chưa có đánh giá nào.</p>
      ) : (
        <div className="space-y-4">
          {filteredRatings.map((r) => {
            const isOwner = currentUser?._id === r.renterId._id;

            return (
              <div
                key={r._id}
                className="border rounded-lg p-3 bg-white shadow-sm relative"
              >
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={r.renterId?.avatarUrl || "/user.png"}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="font-medium">{r.renterId?.fullName}</span>
                  </div>

                  {isOwner && (
                    <div className="relative">
                      <button
                        className="p-1 hover:bg-gray-200 rounded-full"
                        onClick={() =>
                          setActiveDropdown(
                            r._id === activeDropdown ? null : r._id
                          )
                        }
                      >
                        ⋮
                      </button>

                      {activeDropdown === r._id && (
                        <div className="absolute right-0 mt-1 w-28 bg-white border rounded shadow-md z-10">
                          <button
                            className="w-full text-left px-3 py-1 hover:bg-gray-100"
                            onClick={() => handleEditRating(r)}
                          >
                            Sửa
                          </button>
                          <button
                            className="w-full text-left px-3 py-1 text-red-600 hover:bg-gray-100"
                            onClick={() => {
                              setActiveDropdown(null);
                              setDeleteConfirmId(r._id); // mở modal
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
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
                <p className="text-gray-700 mt-2">{r.comment}</p>
                {r.images && r.images.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {r.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    ))}
                  </div>
                )}
                <small className="text-gray-400 block mt-1">
                  {new Date(r.createdAt).toLocaleString("vi-VN")}
                </small>
              </div>
            );
          })}
        </div>
      )}

      {/* Form đánh giá - KIỂU SHOPEE CHUẨN 2025 */}
      {(canReview || editingRatingId) && currentUser && (
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-5">
          {/* Chọn số sao */}
          <div className="mb-5">
            <h3 className="text-2xl font-bold text-gray-900 mb-5 tracking-tight">
              Đánh giá của bạn
            </h3>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={30}
                    className={`drop-shadow-md ${
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Textarea + tag gợi ý */}
          <div className="mb-5">
            <textarea
              className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={4}
              placeholder="Hãy chia sẻ cảm nhận của bạn về sản phẩm này nhé..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          {/* Upload ảnh + video - giống hệt Shopee */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">
              Thêm tối đa 5 ảnh và 1 video (15s)
            </p>

            <div className="grid grid-cols-6 gap-3">
              {/* Ảnh đã chọn (preview) */}
              {images &&
                Array.from(images)
                  .slice(0, 5)
                  .map((file, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`preview ${idx}`}
                        className="w-full aspect-square object-cover rounded-lg border-2 border-dashed border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const dt = new DataTransfer();
                          Array.from(images!).forEach((f, i) => {
                            if (i !== idx) dt.items.add(f);
                          });
                          setImages(dt.files);
                        }}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                      {idx === 0 && (
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {Array.from(images).length}/5
                        </div>
                      )}
                    </div>
                  ))}

              {/* Nút upload ảnh */}
              {(!images || images.length < 5) && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition">
                  <Camera size={28} className="text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;

                      const total = (images?.length || 0) + files.length;
                      if (total > 5) {
                        toast.error("Chỉ được tải tối đa 5 ảnh");
                        return;
                      }

                      const dt = new DataTransfer();
                      if (images) {
                        Array.from(images).forEach((f) => dt.items.add(f));
                      }
                      Array.from(files).forEach((f) => dt.items.add(f));
                      setImages(dt.files);
                    }}
                  />
                </label>
              )}

              {/* Nút quay/chọn video (chỉ 1 video) */}
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition">
                <Video size={28} className="text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">Video</span>
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      toast.info("Tính năng video đang phát triển");
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Nút gửi */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setRating(5);
                setComment("");
                setImages(null);
                setEditingRatingId(null);
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading || !comment.trim()}
              onClick={handleSubmit}
              className="px-8 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-md"
            >
              {loading
                ? "Đang gửi..."
                : editingRatingId
                ? "Cập nhật"
                : "Gửi đánh giá"}
            </button>
          </div>
        </div>
      )}
      {/* {!canReview && !editingRatingId && currentUser && (
        <p className="mt-4 text-sm text-gray-500">
          Bạn chỉ có thể đánh giá sản phẩm sau khi hoàn thành đơn hàng và chưa
          từng đánh giá trước đó.
        </p>
      )} */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop kính mờ */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          />

          {/* Modal */}
          <div className="relative bg-white/80 backdrop-blur-md rounded-lg shadow-lg p-5 w-80 animate-fadeIn z-10">
            <h2 className="text-lg font-semibold">Xác nhận xoá</h2>
            <p className="text-gray-600 mt-2">
              Bạn có chắc chắn muốn xoá đánh giá này không? Hành động này không
              thể hoàn tác.
            </p>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1 rounded border"
                onClick={() => setDeleteConfirmId(null)}
              >
                Hủy
              </button>

              <button
                className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={async () => {
                  await handleDeleteRating(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
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
