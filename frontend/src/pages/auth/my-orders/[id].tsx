"use client";

import { useRouter } from "next/router";
import OrderDetailInline from "@/components/ui/auth/order/[id]";

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== "string") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Đang tải...</p>
      </div>
    );
  }

  return <OrderDetailInline id={id} />;
}

