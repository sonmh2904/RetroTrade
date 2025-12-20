"use client";

import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface ChristmasCardProps {
  title?: string;
  message?: string;
  children?: ReactNode;
  className?: string;
}

export function ChristmasCard({ 
  title = "🎄 Chúc Mừng Giáng Sinh! 🎄", 
  message = "Chúc bạn một mùa Giáng Sinh an lành và hạnh phúc!",
  children,
  className = ""
}: ChristmasCardProps) {
  return (
    <div className={`relative bg-gradient-to-br from-red-50 via-white to-green-50 rounded-2xl p-8 shadow-2xl border-4 border-red-200 overflow-hidden ${className}`}>
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 left-4 text-4xl animate-bounce">🎄</div>
        <div className="absolute top-4 right-4 text-3xl animate-pulse">⭐</div>
        <div className="absolute bottom-4 left-1/4 text-3xl animate-bounce delay-300">🎁</div>
        <div className="absolute bottom-4 right-1/4 text-3xl animate-pulse delay-500">🔔</div>
      </div>

      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
          <h3 className="text-2xl font-bold text-center bg-gradient-to-r from-red-600 to-green-600 bg-clip-text text-transparent">
            {title}
          </h3>
          <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
        </div>
        
        {message && (
          <p className="text-gray-700 text-center mb-6 text-lg">
            {message}
          </p>
        )}

        {children && (
          <div className="mt-6">
            {children}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}

