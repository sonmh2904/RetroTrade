"use client";

import { useEffect, useState } from "react";

interface Decoration {
  id: number;
  emoji: string;
  side: "left" | "right" | "bottom";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midX: number;
  midY: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
}

const decorations = ["🎄", "⭐", "🎁", "🔔", "❄️", "🌟", "🎅"];

export default function ChristmasDecorations() {
  const [items, setItems] = useState<Decoration[]>([]);

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    
    // Chỉ hiển thị trong tháng 12
    if (month !== 12) return;

    const decorationItems: Decoration[] = [];
    const count = 12; // Số lượng decoration

    for (let i = 0; i < count; i++) {
      // Chọn vị trí: left (30%), right (30%), bottom (40%)
      const rand = Math.random();
      let side: "left" | "right" | "bottom";
      let startX: number, startY: number, endX: number, endY: number, midX: number, midY: number;

      if (rand < 0.3) {
        // Bên trái - di chuyển từ trên xuống dưới
        side = "left";
        startX = Math.random() * 5; // 0-5% từ trái
        startY = Math.random() * 20 + 20; // 20-40% từ trên (tránh header)
        endX = Math.random() * 5;
        endY = Math.random() * 30 + 70; // 70-100% từ trên
        midX = Math.random() * 8 + 2; // Điểm giữa lệch ra ngoài một chút
        midY = (startY + endY) / 2;
      } else if (rand < 0.6) {
        // Bên phải - di chuyển từ trên xuống dưới
        side = "right";
        startX = 95 + Math.random() * 5; // 95-100% từ trái
        startY = Math.random() * 20 + 20; // 20-40% từ trên
        endX = 95 + Math.random() * 5;
        endY = Math.random() * 30 + 70; // 70-100% từ trên
        midX = 92 + Math.random() * 6; // Điểm giữa lệch vào trong một chút
        midY = (startY + endY) / 2;
      } else {
        // Bên dưới - di chuyển từ trái sang phải
        side = "bottom";
        startX = Math.random() * 80 + 10; // 10-90% từ trái (tránh 2 bên)
        startY = 85 + Math.random() * 15; // 85-100% từ trên
        endX = Math.random() * 80 + 10;
        endY = 85 + Math.random() * 15;
        midX = (startX + endX) / 2;
        midY = 80 + Math.random() * 10; // Điểm giữa hơi lên trên
      }

      decorationItems.push({
        id: i,
        emoji: decorations[Math.floor(Math.random() * decorations.length)],
        side,
        startX,
        startY,
        endX,
        endY,
        midX,
        midY,
        animationDuration: Math.random() * 15 + 10, // 10-25s để di chuyển chậm
        animationDelay: Math.random() * 5,
        size: Math.random() * 15 + 20, // 20-35px
      });
    }

    setItems(decorationItems);
  }, []);

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
      <style>{`
        ${items.map((item) => {
          // Tính toán offset từ điểm bắt đầu
          const offsetMidX = item.midX - item.startX;
          const offsetMidY = item.midY - item.startY;
          const offsetEndX = item.endX - item.startX;
          const offsetEndY = item.endY - item.startY;
          
          return `
          @keyframes movePath${item.id} {
            0% {
              transform: translate(0, 0) rotate(0deg) scale(1);
            }
            50% {
              transform: translate(${offsetMidX}vw, ${offsetMidY}vh) rotate(180deg) scale(1.2);
            }
            100% {
              transform: translate(${offsetEndX}vw, ${offsetEndY}vh) rotate(360deg) scale(1);
            }
          }
        `;
        }).join('')}
      `}</style>
    </div>
  );
}

