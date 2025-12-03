// pages/auth/rating.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import RenterRating from "@/components/ui/auth/ratingRenter";
import { getLatestOrderByOwner } from "@/services/auth/order.api";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux_store";

export default function RatingRenterPage() {
  const router = useRouter();
  const { userId } = router.query; // ID của renter
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !accessToken) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        
        const res = await getLatestOrderByOwner(userId as string, accessToken);
        console.log("getLatestOrderByOwner response:", res);

        if (res.code === 200 && res.data?.orderId) {
          setOrderId(res.data.orderId);
        } else {
          setOrderId(null);
        }
      } catch (err) {
        console.error("Lỗi lấy đơn hàng:", err);
        setOrderId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [userId, accessToken]);

  if (!userId || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-8 py-14 rounded-3xl">
          <h2 className="text-3xl font-bold mb-6">
            Không thể đánh giá người thuê này
          </h2>
          <p className="text-xl leading-relaxed">
            Bạn chỉ được đánh giá người thuê khi đã{" "}
            <strong>cho họ thuê đồ</strong> và
            <strong> đơn hàng đã hoàn thành</strong>.
          </p>
          <p className="mt-6 text-gray-600">
            Hiện tại chưa có đơn hàng nào hoàn tất với người này.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-10 px-8 py-4 bg-gray-700 text-white text-lg rounded-xl hover:bg-gray-800 transition"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <RenterRating
      userId={userId as string}
      orderId={orderId}
      hasPurchased={true}
    />
  );
}
