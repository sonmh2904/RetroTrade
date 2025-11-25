"use client";

import { FileText, FolderOpen, MessageSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/common/button";

interface BlogSidebarProps {
  activeTab: "posts" | "categories" | "comments" | "tags";
  onTabChange: (tab: "posts" | "categories" | "comments" | "tags") => void;
}

export function BlogSidebar({ activeTab, onTabChange }: BlogSidebarProps) {
  const menuItems = [
    {
      id: "posts" as const,
      label: "Quản lý bài viết",
      icon: FileText,
    },
    {
      id: "categories" as const,
      label: "Quản lý danh mục",
      icon: FolderOpen,
    },
    {
      id: "comments" as const,
      label: "Quản lý bình luận",
      icon: MessageSquare,
    },
    {
      id: "tags" as const,
      label: "Quản lý thẻ",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-72 bg-white/10 backdrop-blur-md border-r border-white/20 z-20">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Blog Manager</h2>
            <p className="text-sm text-white/70">Content Control</p>
          </div>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start h-12 px-4 ${
                  isActive
                    ? "bg-white/20 text-white border border-white/30"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <Button
            variant="ghost"
            className="w-full justify-start h-12 px-4 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Đăng xuất
          </Button>
        </div>
      </div>
    </div>
  );
}
