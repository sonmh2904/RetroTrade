"use client";

import OrderListPage from "@/components/ui/auth/order/index";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MyOrdersPage() {
  const router = useRouter();
  const [key, setKey] = useState(0); 

  const handleOpenDetail = (orderId: string) => {
    router.push(`/auth/order/${orderId}`);
  };


  useEffect(() => {
    const handleFocus = () => setKey((prev) => prev + 1);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  return <OrderListPage key={key} onOpenDetail={handleOpenDetail} />;
}
