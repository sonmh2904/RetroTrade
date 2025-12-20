"use client";

import { useEffect, useState } from "react";

interface DecorationItem {
  id: number;
  emoji: string;
  left: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midX: number;
  midY: number;
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

    const decorationItems: DecorationItem[] = [];
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
        startX = Math.random() * 5;
        startY = Math.random() * 20 + 20;
        endX = Math.random() * 5;
        endY = Math.random() * 30 + 70;
        midX = Math.random() * 8 + 2;
        midY = (startY + endY) / 2;
      } else if (rand < 0.6) {
        startX = 95 + Math.random() * 5;
        startY = Math.random() * 20 + 20;
        endX = 95 + Math.random() * 5;
        endY = Math.random() * 30 + 70;
        midX = 92 + Math.random() * 6;
        midY = (startY + endY) / 2;
      } else {
        startX = Math.random() * 80 + 10;
        startY = 85 + Math.random() * 15;
        endX = Math.random() * 80 + 10;
        endY = 85 + Math.random() * 15;
        midX = (startX + endX) / 2;
        midY = 80 + Math.random() * 10;
      }

      decorationItems.push({
        id: i,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        left: Math.random() * 100,
        animationDuration: Math.random() * 15 + 10,
        animationDelay: Math.random() * 5,
        size: Math.random() * 15 + 20,
        startX,
        startY,
        endX,
        endY,
        midX,
        midY,
      });
    }

    setItems(decorationItems);
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
            animation: `movePath${item.id} ${item.animationDuration}s ease-in-out infinite`,
            animationDelay: `${item.animationDelay}s`,
            filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))",
          }}
        >
          {item.emoji}
        </div>
      ))}
      <style jsx>{`
        ${items
          .map((item) => {
            const offsetMidX = item.midX - item.startX;
            const offsetMidY = item.midY - item.startY;
            const offsetEndX = item.endX - item.startX;
            const offsetEndY = item.endY - item.startY;
            return `
            @keyframes movePath${item.id} {
              0% { transform: translate(0, 0) rotate(0deg) scale(1); }
              50% { transform: translate(${offsetMidX}vw, ${offsetMidY}vh) rotate(180deg) scale(1.2); }
              100% { transform: translate(${offsetEndX}vw, ${offsetEndY}vh) rotate(360deg) scale(1); }
            }
          `;
          })
          .join("")}
      `}</style>
    </div>
  );
}
