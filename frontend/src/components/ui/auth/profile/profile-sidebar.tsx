"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/common/avatar";

type MenuKey = "discounts" | "messages" | "settings" | "security" | "addresses" | "ownership" | "disputes" | "changePassword" | "signature" | "loyalty" | "details";

export interface ProfileSidebarProps {
  active: MenuKey | null;
  onChange: (key: MenuKey) => void;
  user?: { fullName?: string; email: string; avatarUrl?: string };
}

const MENU_SECTIONS: Array<{ title: string; items: Array<{ key: MenuKey; label: string }> }> = [
  {
    title: "Hoạt động",
    items: [
      { key: "discounts", label: "Mã giảm giá" },
      { key: "loyalty", label: "RT Points" },
    ],
  },
  {
    title: "Tài khoản của tôi",
    items: [
      { key: "settings", label: "Cài đặt tài khoản" },
      { key: "details", label: "Xem thông tin chi tiết" },
      { key: "changePassword", label: "Đổi mật khẩu" },
      { key: "security", label: "Bảo mật" },
      { key: "addresses", label: "Địa chỉ" },
      { key: "signature", label: "Chữ ký số" },
    ],
  },
  {
    title: "Quyền sở hữu",
    items: [
      { key: "ownership", label: "Yêu cầu quyền cho thuê" },
      { key: "disputes", label: "Khiếu nại của tôi" },
    ],
  },
];

export function ProfileSidebar({ active, onChange, user }: ProfileSidebarProps) {
  const maskEmail = (email: string) => {
    if (!email || !email.includes("@")) return email;
    const [local, domain] = email.split("@");
    const keep = Math.min(4, local.length);
    return `${"*".repeat(Math.max(0, local.length - keep))}${local.slice(-keep)}@${domain}`;
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* User summary */}
      {user && (
        <div className="relative p-5 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="absolute inset-0 opacity-30" />
          <div className="flex items-center gap-3 relative z-10">
            <Avatar className="w-12 h-12 ring-2 ring-white shadow-sm">
              <AvatarImage src={user.avatarUrl} alt={user.email} />
              <AvatarFallback className="text-sm">
                {user.email?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{user.fullName || user.email?.split("@")[0]}</div>
              <div className="text-xs text-gray-600 truncate">{maskEmail(user.email)}</div>
            </div>
          </div>
        </div>
      )}
      {MENU_SECTIONS.map((section, idx) => (
        <div key={idx}>
          <div className="px-4 py-3 border-b text-xs font-semibold tracking-wide text-gray-500 uppercase bg-gray-50">{section.title}</div>
          <nav className="p-2">
            {section.items.map((item) => (
              <button
                key={item.key}
                onClick={() => onChange(item.key)}
                className={`group w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition flex items-center justify-between ${active === item.key
                  ? "bg-indigo-50 text-indigo-700 font-medium border border-indigo-100"
                  : "hover:bg-gray-50 text-gray-700 border border-transparent"
                  }`}
              >
                <span className="truncate">{item.label}</span>
                <span className={`w-2 h-2 rounded-full ${active === item.key ? 'bg-indigo-500' : 'bg-gray-300 group-hover:bg-gray-400'}`} />
              </button>
            ))}
          </nav>
        </div>
      ))}
    </div>
  );
}


