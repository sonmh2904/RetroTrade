// src/components/shop/ShopRatingSection.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  getRatingShop,
  createOwnerRating,
  updateOwnerRating,
  deleteOwnerRating,
} from "@/services/products/product.api";
import { Camera, Star, Video, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface OwnerRating {
  _id: string;
  ownerId: string;
  renterId: { _id: string; fullName: string; avatarUrl?: string };
  rating: number;
  comment: string;
  images?: string[];
  videos?: string[];
  createdAt: string;
  isEdited?: boolean;
}

interface JwtPayload {
  _id: string;
  fullName: string;
  avatarUrl?: string;
}

interface Props {
  ownerId: string;
  orderId?: string; // ← đổi thành optional
  hasPurchased?: boolean; // ← thêm flag để biết user đã từng mua chưa
}


const ShopRating: React.FC<Props> = ({
  ownerId,
  orderId,
  hasPurchased = false,
}) => {
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [currentUser, setCurrentUser] = useState<JwtPayload | null>(null);
  const [ratings, setRatings] = useState<OwnerRating[]>([]);
  const [filteredRatings, setFilteredRatings] = useState<OwnerRating[]>([]);
  const [filterStar, setFilterStar] = useState<number | null>(null);

  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newVideo, setNewVideo] = useState<File | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keptOldImages, setKeptOldImages] = useState<string[]>([]);
  const [keptOldVideo, setKeptOldVideo] = useState<string | null>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Decode token
  useEffect(() => {
    if (accessToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(accessToken);
        setCurrentUser(decoded);
      } catch {}
    }
  }, [accessToken]);

  // Fetch ratings
  const fetchRatings = async () => {
    try {
      const res = await getRatingShop(ownerId, { limit: 100 });
      if (res.success) {
        const list = (res.ratings || []) as OwnerRating[];
        setRatings(list);
        setFilteredRatings(list);
      }
    } catch (err) {
      console.error(err);
      setRatings([]);
    }
  };

  useEffect(() => {
    if (ownerId) fetchRatings();
  }, [ownerId]);

  // Kiểm tra đã đánh giá chưa
  const hasRated = useMemo(() => {
    return currentUser
      ? ratings.some((r) => r.renterId._id === currentUser._id)
      : false;
  }, [ratings, currentUser]);


  // Filter theo sao
  useEffect(() => {
    if (filterStar === null) {
      setFilteredRatings(ratings);
    } else {
      setFilteredRatings(ratings.filter((r) => r.rating === filterStar));
    }
  }, [ratings, filterStar]);

  // Đếm sao
  const starCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
    });
    return counts;
  }, [ratings]);

  const average =
    ratings.length > 0
      ? (ratings.reduce((a, r) => a + r.rating, 0) / ratings.length).toFixed(1)
      : "0.0";

  // Form actions
  const handleEdit = (r: OwnerRating) => {
    setEditingId(r._id);
    setRating(r.rating);
    setComment(r.comment);
    setNewImages([]);
    setNewVideo(null);
    setKeptOldImages(r.images || []);
    setKeptOldVideo(r.videos?.[0] || null);
  };

  const resetForm = () => {
    setRating(5);
    setComment("");
    setNewImages([]);
    setNewVideo(null);
    setEditingId(null);
    setKeptOldImages([]);
    setKeptOldVideo(null);
  };

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   if (!currentUser || !comment.trim()) return;

   if (!editingId && !orderId) {
     toast.error(
       "Bạn chỉ có thể đánh giá sau khi hoàn thành đơn hàng với shop này"
     );
     return;
   }

   try {
     setLoading(true);
     const form = new FormData();

     // BẮT BUỘC PHẢI CÓ orderId KHI TẠO MỚI
     if (!editingId && orderId) {
       form.append("orderId", orderId);
     }

     form.append("rating", rating.toString());
     form.append("comment", comment.trim());

     // ... phần upload ảnh/video như cũ
     if (editingId) {
       keptOldImages.forEach((url) => form.append("images", url));
       if (keptOldVideo && !newVideo) form.append("videos", keptOldVideo);
     }

     newImages.slice(0, 5).forEach((f) => form.append("images", f));
     if (newVideo) form.append("videos", newVideo);

     if (editingId) {
       await updateOwnerRating(editingId, form);
       toast.success("Cập nhật đánh giá thành công!");
     } else {
       await createOwnerRating(form); // ← giờ đã có orderId rồi
       toast.success("Đánh giá shop thành công!");
     }

     await fetchRatings();
     resetForm();
   } catch (err: any) {
     toast.error(err?.message || "Có lỗi xảy ra");
   } finally {
     setLoading(false);
   }
 };

  const handleDelete = async (id: string) => {
    try {
      await deleteOwnerRating(id);
      toast.success("Xóa đánh giá thành công!");
      fetchRatings();
    } catch (err: any) {
      toast.error(err?.message || "Xóa thất bại");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="mt-12 border-t pt-8">
      {/* Tổng quan + Thanh sao */}
      <div className="bg-white rounded-3xl shadow-lg p-6 mb-10">
        <div className="flex flex-col lg:flex-row items-center gap-8 w-full">
          <div className="text-center flex-shrink-0">
            <div className="text-6xl font-bold text-gray-900">{average}</div>
            <div className="flex justify-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={24}
                  className={
                    i <= Math.round(+average)
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-gray-300"
                  }
                />
              ))}
            </div>
            <p className="text-gray-600 text-base">
              {ratings.length} lượt đánh giá
            </p>
          </div>

          <div className="w-full lg:ml-8">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starCounts[star];
              const percent = ratings.length
                ? (count / ratings.length) * 100
                : 0;
              return (
                <div key={star} className="flex items-center gap-4 mb-2">
                  <span className="w-10 text-sm text-gray-600">{star} sao</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-700"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-10 text-sm text-right text-gray-600">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nút lọc sao */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setFilterStar(null)}
          className={`px-5 py-2.5 rounded-full font-medium transition-all shadow-sm ${
            filterStar === null
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Tất cả ({ratings.length})
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            onClick={() => setFilterStar(star)}
            className={`px-4 py-2.5 rounded-full font-medium flex items-center gap-2 transition-all shadow-sm ${
              filterStar === star
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {star} <Star size={16} className="fill-current" /> (
            {starCounts[star]})
          </button>
        ))}
      </div>

      {/* Form đánh giá shop – giống hệt RatingSection */}
      {(currentUser && hasPurchased && (!hasRated || editingId)) ||
      editingId ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-lg border p-8 mb-10"
        >
          <h3 className="text-2xl font-bold mb-8 text-center">
            {editingId ? "Chỉnh sửa đánh giá của bạn" : "Đánh giá chủ shop"}
          </h3>

          {/* Chọn sao */}
          <div className="mb-8 text-center">
            <p className="text-lg font-medium mb-4">
              Bạn đánh giá shop này bao nhiêu sao?
            </p>
            <div className="flex justify-center gap-6">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={48}
                    className={
                      s <= rating
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-gray-300"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="w-full p-5 border-2 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 outline-none transition text-gray-700"
            rows={6}
            placeholder="Chia sẻ trải nghiệm của bạn: giao hàng, hỗ trợ, uy tín..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />

          {/* Upload ảnh & video */}
          <div className="mt-8">
            <p className="text-sm text-gray-600 mb-4">
              Thêm ảnh/video minh họa (tối đa 5 ảnh, 1 video)
            </p>
            <div className="grid grid-cols-6 gap-4">
              {/* Ảnh cũ */}
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
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition"
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
                    alt="new"
                    className="w-full aspect-square object-cover rounded-lg border-2 border-green-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNewImages((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Video cũ/mới */}
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

              {/* Thêm ảnh */}
              {newImages.length + keptOldImages.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition">
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

              {/* Thêm video */}
              {!newVideo && !keptOldVideo && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition">
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

          <div className="flex justify-end gap-4 mt-10">
            <button
              type="button"
              onClick={resetForm}
              className="px-8 py-3 border rounded-xl hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !comment.trim()}
              className="px-10 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {loading
                ? "Đang gửi..."
                : editingId
                ? "Cập nhật"
                : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      ) : null}

      {/* Danh sách đánh giá */}
      <div className="space-y-6">
        {filteredRatings.length === 0 ? (
          <p className="text-center text-gray-500 py-12 text-lg">
            Chưa có đánh giá nào.
          </p>
        ) : (
          filteredRatings.map((r) => {
            const isMe = currentUser?._id === r.renterId._id;
            return (
              <div
                key={r._id}
                className="bg-white rounded-2xl shadow-md border p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    {r.renterId.avatarUrl ? (
                      <Image
                        src={r.renterId.avatarUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                        {r.renterId.fullName[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">
                        {r.renterId.fullName}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={18}
                            className={
                              i <= r.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-gray-300"
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Nút 3 chấm + Dropdown */}
                  {isMe && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveDropdown(
                            activeDropdown === r._id ? null : r._id
                          )
                        }
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>

                      {/* Dropdown menu */}
                      {activeDropdown === r._id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveDropdown(null)}
                          />

                          <div className="absolute right-0 top-10 w-30 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                            {/* Nút Sửa */}
                            <button
                              onClick={() => {
                                handleEdit(r);
                                setActiveDropdown(null);
                                
                              }}
                              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-700"
                            >
                              <Edit2 className="w-4 h-4" />
                              Sửa 
                            </button>

                            {/* Nút Xóa */}
                            <button
                              onClick={() => {
                                setDeleteConfirmId(r._id);
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              Xóa 
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {r.comment}
                </p>
                {r.isEdited && (
                  <span className="text-xs text-gray-400 ml-2">
                    (đã chỉnh sửa)
                  </span>
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

                <p className="text-sm text-gray-500 mt-4">
                  {formatDistanceToNow(new Date(r.createdAt), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Xác nhận xóa */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-3">Xóa đánh giá?</h3>
            <p className="text-gray-600 mb-6">
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2 border rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-5 py-2 bg-red-600 text-white rounded-lg"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview ảnh */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="preview"
            className="max-w-full max-h-full rounded-lg object-contain"
          />
          <button className="absolute top-6 right-6 text-white text-5xl font-light hover:opacity-70">
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ShopRating;
