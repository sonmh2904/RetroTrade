"use client";

import React from "react";
import { ComplaintManagement } from "@/components/ui/admin/complaints/complaint-management";

export default function AdminComplaintsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Khiếu nại khóa/mở khóa tài khoản</h1>
        <p className="text-gray-600 mt-2">
          Xem xét và xử lý các khiếu nại về tài khoản bị khóa từ người dùng
        </p>
      </div>
      <ComplaintManagement />
    </div>
  );
}

