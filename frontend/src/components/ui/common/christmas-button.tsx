"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface ChristmasButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  showSparkles?: boolean;
}

export function ChristmasButton({
  children,
  variant = "default",
  size = "md",
  showSparkles = true,
  className = "",
  ...props
}: ChristmasButtonProps) {
  const baseStyles = "relative overflow-hidden font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95";
  
  const variantStyles = {
    default: "bg-gradient-to-r from-red-600 via-red-500 to-green-600 text-white shadow-lg hover:shadow-xl",
    outline: "border-2 border-red-500 text-red-600 bg-white hover:bg-red-50",
    ghost: "text-red-600 hover:bg-red-50"
  };

  const sizeStyles = {
    sm: "text-sm px-4 py-2",
    md: "text-base px-6 py-3",
    lg: "text-lg px-8 py-4"
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {/* Background shimmer */}
      {variant === "default" && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {showSparkles && variant === "default" && (
          <Sparkles className="w-4 h-4 animate-pulse" />
        )}
        {children}
        {showSparkles && variant === "default" && (
          <Sparkles className="w-4 h-4 animate-pulse" />
        )}
      </span>

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
          animation: shimmer 2s infinite;
        }
      `}</style>
    </button>
  );
}

