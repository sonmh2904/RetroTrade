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

    const newItems = Array.from({ length: 12 }, () => ({
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      direction: Math.floor(Math.random() * 4),
    }));
    setItems(newItems);
  }, [emojis]);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {items.map((item, i) => (
        <div
          key={i}
          className={`absolute select-none drop-shadow-md ${
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
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${15 + Math.random() * 15}s`,
          }}
        >
          <span className="text-2xl md:text-3xl block animate-pulse-slow">
            {item.emoji}
          </span>
        </div>
      ))}

      <style jsx global>{`
        @keyframes float-up {
          0% {
            transform: translateY(110vh) rotate(0deg) scale(0.5);
            opacity: 0;
          }
          15% {
            opacity: 0.8;
          }
          50% {
            transform: translateY(-10vh) rotate(180deg) scale(1);
          }
          85% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-110vh) rotate(360deg) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes float-down {
          0% {
            transform: translateY(-110vh) rotate(0deg) scale(0.5);
            opacity: 0;
          }
          15% {
            opacity: 0.8;
          }
          50% {
            transform: translateY(10vh) rotate(-180deg) scale(1);
          }
          85% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(110vh) rotate(-360deg) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes float-left-to-right {
          0% {
            transform: translateX(-110vw) translateY(0) rotate(0deg) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 0.7;
          }
          50% {
            transform: translateX(10vw) translateY(-15vh) rotate(180deg)
              scale(1);
          }
          85% {
            opacity: 0.7;
          }
          100% {
            transform: translateX(110vw) translateY(0) rotate(360deg) scale(0.6);
            opacity: 0;
          }
        }

        @keyframes float-right-to-left {
          0% {
            transform: translateX(110vw) translateY(0) rotate(0deg) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 0.7;
          }
          50% {
            transform: translateX(-10vw) translateY(15vh) rotate(-180deg)
              scale(1);
          }
          85% {
            opacity: 0.7;
          }
          100% {
            transform: translateX(-110vw) translateY(0) rotate(-360deg)
              scale(0.6);
            opacity: 0;
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
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

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
