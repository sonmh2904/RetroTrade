"use client";

import { useRouter } from "next/router";
import OrdersPage from "@/components/ui/auth/order";

export default function OrdersListPage() {
  const router = useRouter();

  return (
    <OrdersPage
      onOpenDetail={(id: string) => {
        const targetPath = `/auth/my-orders/${id}`;
        if (router.asPath !== targetPath) {
          router.push(targetPath);
        }
      }}
    />
  );
}

