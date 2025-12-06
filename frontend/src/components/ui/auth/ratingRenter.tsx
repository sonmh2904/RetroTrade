// src/components/renter/RenterRatingSection.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getUserById } from "@/services/auth/user.api";
import {
  getRenterRatings,
  createRenterRating,
  updateRenterRating,
  deleteRenterRating,
} from "@/services/products/product.api";
import { Star, Video, Camera, Edit2, Trash2, MoreVertical } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";
import { jwtDecode } from "jwt-decode";

const STARS = [5, 4, 3, 2, 1] as const;
type RatingValue = 1 | 2 | 3 | 4 | 5;

interface JwtPayload {
  _id: string;
  fullName: string;
  avatarUrl?: string;
}

interface RenterRating {
  _id: string;
  ownerId: {
    _id: string;
    fullName: string;
    avatarUrl?: string;
  };
  rating: RatingValue;
  comment: string;
  images?: string[];
  videos?: string[];
  createdAt: string;
  isEdited?: boolean;
}

interface Props {
  userId: string;
  orderId?: string;
  hasPurchased?: boolean; 
}

const RenterRatingSection: React.FC<Props> = ({
  userId,
  orderId,
  hasPurchased = false,
}) => {
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [currentUser, setCurrentUser] = useState<JwtPayload | null>(null);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [ratings, setRatings] = useState<RenterRating[]>([]);
  const [filteredRatings, setFilteredRatings] = useState<RenterRating[]>([]);
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [rating, setRating] = useState<RatingValue>(5);
  const [comment, setComment] = useState("");
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newVideo, setNewVideo] = useState<File | null>(null);

  // Edit & delete
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keptOldImages, setKeptOldImages] = useState<string[]>([]);
  const [keptOldVideo, setKeptOldVideo] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Decode token
  useEffect(() => {
    if (accessToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(accessToken);
        setCurrentUser(decoded);
      } catch {}
    }
  }, [accessToken]);

  // Tính toán thống kê
  const { average, total, starCounts } = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
      RatingValue,
      number
    >;
    ratings.forEach((r) => (counts[r.rating] += 1));

    const avg =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    return {
      average: avg.toFixed(1),
      total: ratings.length,
      starCounts: counts,
    };
  }, [ratings]);

  // Lọc sao
  useEffect(() => {
    setFilteredRatings(
      filterStar === null
        ? ratings
        : ratings.filter((r) => r.rating === filterStar)
    );
  }, [ratings, filterStar]);

  // Fetch dữ liệu
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const [userRes, ratingRes] = await Promise.all([
          getUserById(userId),
          getRenterRatings(userId, { limit: 100 }),
        ]);
        
        if (userRes.code !== 200) throw new Error("Không tải được user");
        setUser(userRes.data);
        setRatings(ratingRes.ratings || []);
      } catch (err: any) {
        setError(err.message || "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // Kiểm tra đã đánh giá chưa
  const hasRated = currentUser
    ? ratings.some((r) => r.ownerId._id === currentUser._id)
    : false;

  const startEdit = (r: RenterRating) => {
    setEditingId(r._id);
    setRating(r.rating);
    setComment(r.comment);
    setKeptOldImages(r.images || []);
    setKeptOldVideo(r.videos?.[0] || null);
    setNewImages([]);
    setNewVideo(null);
    setActiveDropdown(null);
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

  // Check cơ bản
  if (!currentUser) {
    toast.error("Bạn chưa đăng nhập");
    console.log("Submit failed: no currentUser");
    return;
  }
  if (!comment.trim()) {
    toast.error("Vui lòng nhập bình luận");
    console.log("Submit failed: comment empty");
    return;
  }

  if (!editingId && !hasPurchased) {
    toast.error("Bạn chỉ được đánh giá sau khi đã thuê của người này");
    console.log("Submit failed: user hasn't purchased");
    return;
  }

  // Log đầu vào trước khi gửi
  console.log("Submitting rating:", {
    editingId,
    orderId,
    userId: currentUser._id,
    rating,
    comment,
    keptOldImages,
    newImages,
    keptOldVideo,
    newVideo,
  });

  setSubmitting(true);
  const form = new FormData();
  form.append("rating", rating.toString());
  form.append("comment", comment.trim());
  if (!editingId && orderId) {
    form.append("orderId", orderId);
  }

  keptOldImages.forEach((url) => form.append("images", url));
  if (keptOldVideo && !newVideo) form.append("videos", keptOldVideo);

  newImages.slice(0, 5).forEach((f) => form.append("images", f));
  if (newVideo) form.append("videos", newVideo);

  try {
    if (editingId) {
      const updated = await updateRenterRating(editingId, form);
      toast.success("Cập nhật đánh giá thành công!");
      console.log("Update response:", updated);
    } else {
      const created = await createRenterRating(form);
      toast.success("Đánh giá thành công!");
      console.log("Create response:", created);
    }

    resetForm();
    const res = await getRenterRatings(userId, { limit: 100 });
    setRatings(res.ratings || []);
    console.log("Fetched ratings after submit:", res.ratings);
  } catch (err: any) {
    toast.error(err?.message || "Có lỗi xảy ra");
    console.error("Failed to submit rating:", err);
  } finally {
    setSubmitting(false);
  }
};


  const handleDelete = async (id: string) => {
    try {
      await deleteRenterRating(id);
      toast.success("Xóa đánh giá thành công!");
      const res = await getRenterRatings(userId, { limit: 100 });
      setRatings(res.ratings || []);
    } catch {
      toast.error("Xóa thất bại");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  if (error || !user)
    return (
      <div className="text-center py-12 text-red-600">
        {error || "Không tìm thấy người dùng"}
      </div>
    );

  return (
    <div className="mt-12 p-10">
      <div className="text-center text-4xl font-bold">
        Trang đánh giá người dùng
      </div>
      {/* Header user */}
      <div className="bg-white rounded-3xl shadow-lg p-8 mb-10 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.fullName}
              width={120}
              height={120}
              className="rounded-full border-4 border-green-100"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
              {user.fullName[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-3xl font-bold">{user.fullName}</h2>
            <p className="text-gray-600">{user.email}</p>
            {user.phone && <p className="text-gray-600">Phone: {user.phone}</p>}
            {user.bio ? (
              <p className="mt-3 italic text-gray-700">"{user.bio}"</p>
            ) : (
              <p className="text-gray-500 mt-3">Chưa có giới thiệu</p>
            )}
          </div>
        </div>
      </div>

      {/* Tổng quan */}
      <div className="bg-white rounded-3xl shadow-lg p-8 mb-10">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="text-center">
            <div className="text-7xl font-bold">{average}</div>
            <div className="flex justify-center gap-2 my-3">
              {STARS.map((i) => (
                <Star
                  key={i}
                  size={28}
                  className={
                    i <= Math.round(+average)
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-gray-300"
                  }
                />
              ))}
            </div>
            <p className="text-lg text-gray-600">{total} lượt đánh giá</p>
          </div>
          <div className="flex-1 space-y-3">
            {STARS.map((star) => {
              const count = starCounts[star];
              const percent = total ? (count / total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-4">
                  <span className="w-12 text-sm font-medium">{star} sao</span>
                  <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nút lọc */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setFilterStar(null)}
          className={`px-6 py-3 rounded-full font-medium transition-all shadow-sm ${
            filterStar === null
              ? "bg-green-600 text-white"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          Tất cả ({total})
        </button>
        {STARS.map((star) => (
          <button
            key={star}
            onClick={() => setFilterStar(star)}
            className={`px-5 py-3 rounded-full font-medium flex items-center gap-2 transition-all shadow-sm ${
              filterStar === star
                ? "bg-green-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {star} <Star size={18} className="fill-current" /> (
            {starCounts[star]})
          </button>
        ))}
      </div>

      {/* Form đánh giá – giống hệt ShopRatingSection */}
      {currentUser && hasPurchased && (!hasRated || editingId) && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-lg border p-8 mb-10"
        >
          <h3 className="text-2xl font-bold mb-8 text-center">
            {editingId ? "Chỉnh sửa đánh giá" : "Đánh giá người thuê này"}
          </h3>

          <div className="mb-8 text-center">
            <p className="text-lg font-medium mb-4">Bạn chấm bao nhiêu sao?</p>
            <div className="flex justify-center gap-6">
              {STARS.map((s) => (
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
            className="w-full p-5 border-2 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 outline-none transition"
            rows={6}
            placeholder="Chia sẻ trải nghiệm thuê đồ, thái độ, giữ đồ..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />

          {/* Upload ảnh/video */}
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

              {/* Video */}
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
                      if (
                        newImages.length + keptOldImages.length + files.length >
                        5
                      ) {
                        toast.error("Tối đa 5 ảnh");
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
              disabled={submitting || !comment.trim()}
              className="px-10 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {submitting
                ? "Đang gửi..."
                : editingId
                ? "Cập nhật"
                : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      )}

      {/* Danh sách đánh giá */}
      <div className="space-y-6">
        {filteredRatings.length === 0 ? (
          <p className="text-center py-16 text-xl text-gray-500 bg-gray-50 rounded-2xl">
            {filterStar === null
              ? "Chưa có đánh giá nào."
              : `Chưa có đánh giá ${filterStar} sao.`}
          </p>
        ) : (
          filteredRatings.map((r) => {
            const isMe = currentUser?._id === r.ownerId._id;
            return (
              <div
                key={r._id}
                className="bg-white rounded-2xl shadow-md border p-6 hover:shadow-xl transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    {r.ownerId.avatarUrl ? (
                      <Image
                        src={r.ownerId.avatarUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center text-white font-bold text-xl">
                        {r.ownerId.fullName[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">
                        {r.ownerId.fullName}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {STARS.map((i) => (
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

                  {isMe && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveDropdown(
                            activeDropdown === r._id ? null : r._id
                          )
                        }
                        className="p-2 hover:bg-gray-100 rounded-full"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                      {activeDropdown === r._id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveDropdown(null)}
                          />
                          <div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-xl border py-2 z-20">
                            <button
                              onClick={() => startEdit(r)}
                              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
                            >
                              <Edit2 className="w-4 h-4" /> Sửa
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirmId(r._id);
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" /> Xóa
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {r.comment}
                  {r.isEdited && (
                    <span className="text-xs text-gray-400 ml-2">
                      (đã chỉnh sửa)
                    </span>
                  )}
                </p>

                {(r.images?.length || r.videos?.length) && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {r.images?.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="review"
                        className="w-28 h-28 object-cover rounded-lg cursor-pointer hover:opacity-90 shadow-md"
                        onClick={() => setPreviewImage(img)}
                      />
                    ))}
                    {r.videos?.[0] && (
                      <div className="relative">
                        <video
                          src={r.videos[0]}
                          controls
                          className="w-28 h-28 object-cover rounded-lg shadow-md"
                        />
                        <Video className="absolute top-2 left-2 w-6 h-6 text-white bg-black/50 rounded-full p-1" />
                      </div>
                    )}
                  </div>
                )}

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
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="preview"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
          />
          <button className="absolute top-8 right-8 text-white text-6xl hover:opacity-70">
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default RenterRatingSection;
