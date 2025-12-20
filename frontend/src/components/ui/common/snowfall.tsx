"use client";

import { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
  opacity: number;
}

export default function Snowfall() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    // Tạo 50-100 bông tuyết
    const count = Math.floor(Math.random() * 50) + 50;
    const flakes: Snowflake[] = [];

    for (let i = 0; i < count; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100, // Vị trí ngang ngẫu nhiên
        animationDuration: Math.random() * 3 + 2, // 2-5 giây
        animationDelay: Math.random() * 5, // Delay ngẫu nhiên
        size: Math.random() * 4 + 2, // Kích thước 2-6px
        opacity: Math.random() * 0.5 + 0.5, // Độ trong suốt 0.5-1
      });
    }

    setSnowflakes(flakes);

    // Thêm CSS animation vào head nếu chưa có
    if (typeof document !== "undefined") {
      const styleId = "snowfall-animation";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          @keyframes snowfall {
            0% {
              transform: translateY(-100vh) rotate(0deg);
            }
            100% {
              transform: translateY(100vh) rotate(360deg);
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute top-0 rounded-full bg-white"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animation: `snowfall ${flake.animationDuration}s linear infinite`,
            animationDelay: `${flake.animationDelay}s`,
            boxShadow: "0 0 6px rgba(255, 255, 255, 0.8)",
          }}
        />
      ))}
    </div>
  );
}

