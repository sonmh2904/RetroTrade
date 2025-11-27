"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import {
  CircleAlert,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/common/card";
import { Button } from "@/components/ui/common/button";
import { Badge } from "@/components/ui/common/badge";
import { Input } from "@/components/ui/common/input";
import { Avatar, AvatarFallback } from "@/components/ui/common/avatar";

import { getDisputes, Dispute } from "@/services/moderator/disputeOrder.api";

export default function DisputeManagementPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 5;

  const getOrderGuid = (orderId: Dispute["orderId"]) => {
    return typeof orderId === "string" ? orderId : orderId.orderGuid;
  };

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await getDisputes({
        page,
        limit,
        status: "Pending",
        orderGuid: search || undefined,
      });

      console.log("🔎 API response:", res);

      if (res.code === 200) {
        const list = Array.isArray(res.data) ? res.data : [];
        setDisputes(list);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [page, search]);

  const formatDate = (d: string) =>
    format(new Date(d), "dd/MM/yyyy HH:mm", { locale: vi });

  const badge = (s: string) => {
    switch (s) {
      case "Pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Đang chờ</Badge>
        );
      case "Resolved":
        return <Badge className="bg-green-100 text-green-800">Đã xử lý</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800">Từ chối</Badge>;
      default:
        return <Badge>{s}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 text-gray-400" />
              <Input
                placeholder="Tìm mã đơn..."
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 mr-1" /> Bộ lọc
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">Mã đơn</th>
                <th className="p-4 text-left">Người tố cáo</th>
                <th className="p-4 text-left">Lý do</th>
                <th className="p-4 text-left">Thời gian</th>
                <th className="p-4 text-left">Trạng thái</th>
                <th className="p-4 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-10">
                    Đang tải...
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-10 text-gray-500">
                    <CircleAlert
                      size={40}
                      className="mx-auto mb-2 opacity-40"
                    />
                    Không có Khiếu nại
                  </td>
                </tr>
              ) : (
                disputes.map((d) => (
                  <tr key={d._id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">
                      {getOrderGuid(d.orderId).slice(0, 12)}...
                    </td>

                    <td className="p-4 flex items-center gap-2">
                      <Avatar>
                        <AvatarFallback>
                          {d.reporterId.fullName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{d.reporterId.fullName}</p>
                        <p className="text-xs text-gray-500">
                          {d.reporterId.email}
                        </p>
                      </div>
                    </td>

                    <td className="p-4 truncate max-w-[180px]">{d.reason}</td>

                    <td className="p-4 text-xs text-gray-600">
                      {formatDate(d.createdAt)}
                    </td>

                    <td className="p-4">{badge(d.status)}</td>

                    <td className="p-4 text-center">
                      <Button
                        size="sm"
                        onClick={() =>
                          router.push(`/moderator/dispute/${d._id}`)
                        }
                      >
                        <Eye size={16} className="mr-1" /> Xem
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex justify-between p-4 border-t">
            <span className="text-xs text-gray-500">Trang {page}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button size="sm" onClick={() => setPage((p) => p + 1)}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
