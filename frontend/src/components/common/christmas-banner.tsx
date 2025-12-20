"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export default function ChristmasBanner() {
  const [isVisible, setIsVisible] = useState(true);

  // Ẩn banner sau 25/12 (có thể tùy chỉnh)
  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1; // 0-11 -> 1-12
    const day = today.getDate();
    
    // Chỉ hiển thị trong tháng 12
    if (month !== 12) {
      setIsVisible(false);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 w-full bg-gradient-to-r from-red-600 via-red-500 to-green-600 py-3 overflow-hidden z-[200]">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-2 left-4 animate-bounce">🎄</div>
        <div className="absolute top-2 right-20 animate-pulse">⭐</div>
        <div className="absolute top-1 right-40 animate-bounce delay-300">🎁</div>
        <div className="absolute top-2 left-1/4 animate-pulse delay-500">🔔</div>
        <div className="absolute top-1 right-1/4 animate-bounce delay-700">❄️</div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-3 text-white">
        <Sparkles className="w-5 h-5 animate-pulse text-yellow-300" />
        <p className="text-sm md:text-base font-semibold text-center">
          🎉 Chúc mừng Giáng Sinh! Giảm giá đặc biệt cho tất cả sản phẩm 🎉
        </p>
        <Sparkles className="w-5 h-5 animate-pulse text-yellow-300" />
      </div>

      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}

