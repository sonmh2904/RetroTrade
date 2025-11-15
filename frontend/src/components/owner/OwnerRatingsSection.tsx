import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getRatingsByOwner } from "@/services/products/product.api";
import type { OwnerRating } from "@/services/products/product.api";

const OWNER_RATING_PAGE_SIZE = 6;

interface OwnerRatingsSectionProps {
  ownerId?: string;
  onStatsUpdate?: (stats: OwnerRatingStats) => void;
}

export type OwnerRatingStats = {
  total: number;
  average: number;
  counts: number[];
  page: number;
  limit: number;
  hasMore: boolean;
};

const DEFAULT_OWNER_RATING_STATS: OwnerRatingStats = {
  total: 0,
  average: 0,
  counts: [0, 0, 0, 0, 0],
  page: 1,
  limit: OWNER_RATING_PAGE_SIZE,
  hasMore: false,
};

export const OwnerRatingsSection: React.FC<OwnerRatingsSectionProps> = ({ ownerId, onStatsUpdate }) => {
  const [ownerRatings, setOwnerRatings] = useState<OwnerRating[]>([]);
  const [filteredOwnerRatings, setFilteredOwnerRatings] = useState<OwnerRating[]>([]);
  const [ownerRatingStats, setOwnerRatingStats] = useState<OwnerRatingStats>(DEFAULT_OWNER_RATING_STATS);
  const [ownerRatingFilter, setOwnerRatingFilter] = useState<number | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  const applyOwnerRatingFilter = useCallback((ratings: OwnerRating[], filter: number | null) => {
    if (filter === null) {
      setFilteredOwnerRatings(ratings);
    } else {
      setFilteredOwnerRatings(ratings.filter((r) => Number(r.rating) === filter));
    }
  }, []);

  const fetchOwnerRatings = useCallback(
    async (ownerIdParam?: string, page = 1) => {
      const targetOwnerId = ownerIdParam || ownerId;
      if (!targetOwnerId) return;
      setRatingsLoading(true);
      try {
        const limit = ownerRatingStats.limit || OWNER_RATING_PAGE_SIZE;
        const res = await getRatingsByOwner(targetOwnerId, { page, limit });
        const formattedRatings = Array.isArray(res.ratings) ? res.ratings : [];

        let nextRatings: OwnerRating[] = [];
        setOwnerRatings((prev) => {
          nextRatings = page === 1 ? formattedRatings : [...prev, ...formattedRatings];
          return nextRatings;
        });

        // Sử dụng total từ server
        const totalRatings = res.total ?? nextRatings.length;

        // Tính loaded stats để fallback
        const loadedCounts = [5, 4, 3, 2, 1].map((star) =>
          nextRatings.filter((r) => Number(r.rating) === star).length
        );
        const loadedAverage =
          nextRatings.length > 0
            ? nextRatings.reduce((acc, curr) => acc + Number(curr.rating || 0), 0) /
              nextRatings.length
            : 0;

        // Sử dụng server stats nếu có, fallback to loaded
        const counts = (res as any).counts && Array.isArray((res as any).counts) && (res as any).counts.length === 5
          ? (res as any).counts.map((c: number) => Number(c))
          : loadedCounts;
        const average = (res as any).average !== undefined
          ? Number((res as any).average)
          : loadedAverage;

        const limitValue = res.limit ?? limit;
        const currentPage = res.page ?? page;
        const totalPages = Math.max(1, Math.ceil(totalRatings / limitValue));

        const newStats = {
          total: totalRatings,
          average: parseFloat(average.toFixed(1)), // Lưu 1 chữ số thập phân cho UI
          counts,
          page: currentPage,
          limit: limitValue,
          hasMore: currentPage < totalPages,
        };

        setOwnerRatingStats(newStats);
        if (onStatsUpdate) {
          onStatsUpdate(newStats);
        }

        // Không gọi apply ở đây nữa, để useEffect xử lý
      } catch (error) {
        console.error("Failed to fetch owner ratings", error);
        toast.error("Không thể tải đánh giá cửa hàng");
      } finally {
        setRatingsLoading(false);
      }
    },
    [ownerId, ownerRatingStats.limit, onStatsUpdate]
  );

  useEffect(() => {
    applyOwnerRatingFilter(ownerRatings, ownerRatingFilter);
  }, [ownerRatings, ownerRatingFilter, applyOwnerRatingFilter]);

  useEffect(() => {
    if (!ownerId) return;
    setOwnerRatings([]);
    setFilteredOwnerRatings([]);
    setOwnerRatingStats({ ...DEFAULT_OWNER_RATING_STATS });
    setOwnerRatingFilter(null);
    fetchOwnerRatings(ownerId, 1);
  }, [ownerId, fetchOwnerRatings]);

  const handleOwnerRatingFilterChange = useCallback(
    (star: number | null) => {
      // Filter hoàn toàn client-side trên danh sách đã load
      setOwnerRatingFilter(star);
      applyOwnerRatingFilter(ownerRatings, star);
    },
    [applyOwnerRatingFilter, ownerRatings]
  );

  const hasRatings = ownerRatingStats.total > 0;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg mb-8 mt-8">
      <div className="flex items-center justify-between mb-8 p-6 bg-gray-50 rounded-xl flex-col lg:flex-row gap-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-gray-900 mb-1">
            {hasRatings ? ownerRatingStats.average.toFixed(1) : "0.0"}
          </div>
          <div className="flex justify-center mb-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Star
                key={idx}
                className={`w-6 h-6 ${idx < Math.round(ownerRatingStats.average) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
              />
            ))}
          </div>
          <p className="text-gray-600 text-sm">
            {ownerRatingStats.total} lượt đánh giá
          </p>
        </div>

        <div className="w-px h-20 bg-gray-200 hidden lg:block"></div>

        <div className="flex-1 w-full">
          {[5, 4, 3, 2, 1].map((rating, index) => {
            const count = ownerRatingStats.counts[index] || 0;
            const percent = ownerRatingStats.total ? (count / ownerRatingStats.total) * 100 : 0;
            return (
              <div key={rating} className="flex items-center mb-2">
                <span className="w-10 text-sm text-gray-600">{rating} sao</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full mx-3 overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-500 w-12 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleOwnerRatingFilterChange(null)}
          className={`px-3 py-1 border rounded-md text-sm ${ownerRatingFilter === null ? "bg-green-600 text-white" : "text-gray-600"}`}
        >
          Tất cả ({ownerRatingStats.total})
        </button>
        {[5, 4, 3, 2, 1].map((star) => {
          const starIndex = [5, 4, 3, 2, 1].indexOf(star);
          const count = ownerRatingStats.counts[starIndex] || 0;
          return (
            <button
              key={star}
              onClick={() => handleOwnerRatingFilterChange(star)}
              className={`px-3 py-1 border rounded-md text-sm flex items-center gap-1 ${ownerRatingFilter === star ? "bg-green-600 text-white" : "text-gray-600"}`}
            >
              {star}
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {ratingsLoading && filteredOwnerRatings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
            Đang tải đánh giá...
          </div>
        )}
        {!ratingsLoading && filteredOwnerRatings.length === 0 && (
          <p className="text-center text-gray-500">Chưa có đánh giá nào.</p>
        )}
        {filteredOwnerRatings.map((rating) => (
          <div key={rating._id} className="border rounded-2xl p-4 bg-white shadow-sm">
            <div className="flex items-center gap-3">
              <img
                src={rating?.renterId?.avatarUrl || rating?.renterId?.AvatarUrl || "/user.png"}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h4 className="font-semibold text-gray-900">
                  {rating?.renterId?.displayName || rating?.renterId?.fullName || rating?.renterId?.DisplayName || rating?.renterId?.FullName || "Khách hàng"}
                </h4>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        size={16}
                        className={idx < Number(rating.rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
                      />
                    ))}
                  </div>
                  <span>{rating.Item?.Title || (rating as any)?.itemId?.Title}</span>
                </div>
              </div>
              <span className="ml-auto text-sm text-gray-500">
                {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString("vi-VN") : ""}
              </span>
            </div>
            {rating.comment && <p className="text-gray-700 mt-3 whitespace-pre-line">{rating.comment}</p>}
            {Array.isArray(rating.images) && rating.images.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {rating.images.map((img: string, idx: number) => (
                  <img
                    key={`${rating._id}-img-${idx}`}
                    src={img}
                    alt="rating"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {ownerRatingStats.total > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={() => fetchOwnerRatings(ownerId, ownerRatingStats.page + 1)}
            disabled={ratingsLoading || !ownerRatingStats.hasMore}
            className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {ownerRatingStats.hasMore ? (ratingsLoading ? "Đang tải..." : "Xem thêm đánh giá") : "Đã hiển thị tất cả"}
          </button>
        </div>
      )}
    </div>
  );
};

export default OwnerRatingsSection;