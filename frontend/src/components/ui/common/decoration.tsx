"use client";

import { useEffect, useState } from "react";

interface DecorationItem {
  id: number;
  emoji: string;
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  duration: number;
  delay: number;
  size: number;
}

interface DecorationProps {
  emojis: string[];
}

export default function Decoration({ emojis = [] }: DecorationProps) {
  const [items, setItems] = useState<DecorationItem[]>([]);

  useEffect(() => {
    if (emojis.length === 0) {
      setItems([]);
      return;
    }

    const newItems: DecorationItem[] = [];
    const count = 12;

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let startX = 0,
        startY = 0,
        endX = 0,
        endY = 0,
        midX = 0,
        midY = 0;

      if (rand < 0.3) {
        startX = Math.random() * 8;
        startY = Math.random() * 30 + 10;
        endX = Math.random() * 8 + 92;
        endY = Math.random() * 40 + 60;
        midX = 50 + Math.random() * 20;
        midY = (startY + endY) / 2;
      } else if (rand < 0.6) {
        // Từ phải sang trái
        startX = 92 + Math.random() * 8;
        startY = Math.random() * 30 + 10;
        endX = Math.random() * 8;
        endY = Math.random() * 40 + 60;
        midX = 50 - Math.random() * 20;
        midY = (startY + endY) / 2;
      } else {
        // Từ dưới lên trên (bay ngược lên)
        startX = Math.random() * 80 + 10;
        startY = 90 + Math.random() * 20;
        endX = Math.random() * 80 + 10;
        endY = -20; // Bay ra khỏi màn hình trên
        midX = startX + (Math.random() - 0.5) * 20;
        midY = 40 + Math.random() * 20;
      }

      newItems.push({
        id: i + Date.now(),
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        startX,
        startY,
        midX,
        midY,
        endX,
        endY,
        duration: Math.random() * 12 + 10, 
        delay: Math.random() * 5,
        size: Math.random() * 20 + 25, 
      });
    }

    setItems(newItems);
  }, [emojis]); 
  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute select-none"
          style={{
            left: `${item.startX}%`,
            top: `${item.startY}%`,
            fontSize: `${item.size}px`,
            animation: `move${item.id} ${item.duration}s ease-in-out infinite`,
            animationDelay: `${item.delay}s`,
            filter: "drop-shadow(0 0 10px rgba(255,255,255,0.9))",
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Keyframes động */}
      <style jsx global>{`
        ${items
          .map((item) => {
            const offsetMidX = (item.midX - item.startX) * 10; 
            const offsetMidY = (item.midY - item.startY) * 10;
            const offsetEndX = (item.endX - item.startX) * 10;
            const offsetEndY = (item.endY - item.startY) * 10;

            return `
              @keyframes move${item.id} {
                0% {
                  opacity: 0;
                  transform: translate(0px, 0px) rotate(0deg) scale(0.8);
                }
                10% {
                  opacity: 1;
                }
                50% {
                  transform: translate(${offsetMidX}px, ${offsetMidY}px) rotate(180deg) scale(1.3);
                }
                90% {
                  opacity: 1;
                }
                100% {
                  opacity: 0;
                  transform: translate(${offsetEndX}px, ${offsetEndY}px) rotate(360deg) scale(0.8);
                }
              }
            `;
          })
          .join("")}
      `}</style>
    </div>
  );
}
