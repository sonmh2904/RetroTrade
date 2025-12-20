"use client";

import { useState } from "react";

interface ChristmasGiftBoxProps {
  onOpen?: () => void;
  size?: "sm" | "md" | "lg";
}

export function ChristmasGiftBox({ onOpen, size = "md" }: ChristmasGiftBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeStyles = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-40 h-40"
  };

  const handleClick = () => {
    if (isOpen) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setIsOpen(true);
      setIsAnimating(false);
      onOpen?.();
    }, 600);
  };

  return (
    <div className="relative inline-block cursor-pointer" onClick={handleClick}>
      {!isOpen ? (
        <div className={`${sizeStyles[size]} relative`}>
          {/* Gift box */}
          <div className="absolute inset-0">
            {/* Box body - red */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-500 rounded-lg shadow-xl transform transition-transform duration-300 hover:scale-110">
              {/* Ribbon vertical */}
              <div className="absolute left-1/2 top-0 bottom-0 w-4 bg-yellow-400 transform -translate-x-1/2 shadow-md" />
              {/* Ribbon horizontal */}
              <div className="absolute top-1/2 left-0 right-0 h-4 bg-yellow-400 transform -translate-y-1/2 shadow-md" />
              {/* Bow */}
              <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-yellow-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg border-2 border-yellow-600" />
            </div>

            {/* Sparkle effect */}
            {isAnimating && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-2xl animate-sparkle"
                    style={{
                      transform: `rotate(${i * 30}deg) translateY(-40px)`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  >
                    ✨
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`${sizeStyles[size]} relative flex items-center justify-center`}>
          {/* Opened gift - confetti */}
          <div className="text-4xl animate-bounce">🎁</div>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-confetti"
              style={{
                transform: `rotate(${i * 45}deg)`,
                animationDelay: `${i * 0.1}s`
              }}
            >
              🎉
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes sparkle {
          0% {
            opacity: 1;
            transform: rotate(var(--rotation)) translateY(-40px) scale(1);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--rotation)) translateY(-80px) scale(0);
          }
        }
        .animate-sparkle {
          animation: sparkle 0.6s ease-out forwards;
        }

        @keyframes confetti {
          0% {
            transform: rotate(var(--rotation)) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation)) translateY(100px) scale(0);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

