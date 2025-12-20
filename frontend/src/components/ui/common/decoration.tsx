"use client";

import { useEffect, useState } from "react";

interface DecorationProps {
  emojis: string[];
}

export default function Decoration({ emojis = [] }: DecorationProps) {
  const [items, setItems] = useState<{ emoji: string; direction: number }[]>(
    []
  );

  useEffect(() => {
    if (emojis.length === 0) {
      setItems([]);
      return;
    }

    const newItems = Array.from({ length: 15 }, () => ({
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      direction: Math.floor(Math.random() * 4), // 0: lên, 1: xuống, 2: trái→phải, 3: phải→trái
    }));
    setItems(newItems);
  }, [emojis]);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {items.map((item, i) => (
        <div
          key={i}
          className={`absolute text-4xl md:text-6xl select-none drop-shadow-2xl ${
            item.direction === 0
              ? "animate-float-up"
              : item.direction === 1
              ? "animate-float-down"
              : item.direction === 2
              ? "animate-float-left-to-right"
              : "animate-float-right-to-left"
          }`}
          style={{
            left: `${Math.random() * 100}%`,
            top:
              item.direction < 2
                ? `${Math.random() * 100}%`
                : item.direction === 2
                ? "50%"
                : "50%",
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${12 + Math.random() * 12}s`,
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* 4 keyframes static – chắc chắn chạy trên Vercel */}
      <style jsx global>{`
        @keyframes float-up {
          0% {
            transform: translateY(110vh) rotate(0deg) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateY(-20vh) rotate(180deg) scale(1.4);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-110vh) rotate(360deg) scale(0.6);
            opacity: 0;
          }
        }
        @keyframes float-down {
          0% {
            transform: translateY(-110vh) rotate(0deg) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateY(20vh) rotate(180deg) scale(1.4);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(360deg) scale(0.6);
            opacity: 0;
          }
        }
        @keyframes float-left-to-right {
          0% {
            transform: translateX(-110vw) translateY(0) rotate(0deg) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateX(10vw) translateY(-20vh) rotate(180deg)
              scale(1.3);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(110vw) translateY(0) rotate(360deg) scale(0.8);
            opacity: 0;
          }
        }
        @keyframes float-right-to-left {
          0% {
            transform: translateX(110vw) translateY(0) rotate(0deg) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateX(-10vw) translateY(20vh) rotate(-180deg)
              scale(1.3);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(-110vw) translateY(0) rotate(-360deg)
              scale(0.8);
            opacity: 0;
          }
        }

        .animate-float-up {
          animation: float-up linear infinite;
        }
        .animate-float-down {
          animation: float-down linear infinite;
        }
        .animate-float-left-to-right {
          animation: float-left-to-right linear infinite;
        }
        .animate-float-right-to-left {
          animation: float-right-to-left linear infinite;
        }
      `}</style>
    </div>
  );
}
