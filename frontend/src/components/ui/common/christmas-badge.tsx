"use client";

import { ReactNode } from "react";

interface ChristmasBadgeProps {
  children: ReactNode;
  variant?: "default" | "red" | "green" | "gold";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ChristmasBadge({ 
  children, 
  variant = "default",
  size = "md",
  className = ""
}: ChristmasBadgeProps) {
  const variantStyles = {
    default: "bg-gradient-to-r from-red-500 to-green-500 text-white",
    red: "bg-gradient-to-r from-red-600 to-red-400 text-white",
    green: "bg-gradient-to-r from-green-600 to-green-400 text-white",
    gold: "bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white"
  };

  const sizeStyles = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2"
  };

  return (
    <span 
      className={`
        ${variantStyles[variant]} 
        ${sizeStyles[size]}
        rounded-full font-semibold
        shadow-lg
        relative overflow-hidden
        inline-flex items-center gap-1
        ${className}
      `}
    >
      {/* Sparkle effect */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      
      <span className="relative z-10 flex items-center gap-1">
        {variant === "default" && "🎄"}
        {children}
      </span>

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
          animation: shimmer 2s infinite;
        }
      `}</style>
    </span>
  );
}

