"use client";

import { useEffect, useState } from "react";

interface CountdownSectionProps {
  targetDate: string;
  eventName: string;
  countdownType?: "christmas" | "newyear" | "tet" | "national-day" | "default";
}

export function CountdownSection({
  targetDate,
  eventName,
  countdownType = "default",
}: CountdownSectionProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const target = new Date(targetDate);
      const difference = target.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const { days, hours, minutes, seconds } = timeLeft;

  if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
    return null;
  }

  const styles = {
    christmas: "bg-gradient-to-br from-red-600 to-green-700 text-white",
    newyear: "bg-gradient-to-br from-purple-600 to-pink-600 text-white",
    tet: "bg-gradient-to-br from-yellow-500 to-red-600 text-white",
    "national-day": "bg-gradient-to-br from-red-600 to-yellow-500 text-white",
    default: "bg-gradient-to-br from-blue-600 to-indigo-700 text-white",
  };

  const titles = {
    christmas: "🎄 ĐẾM NGƯỢC ĐẾN GIÁNG SINH 🎄",
    newyear: "🎆 ĐẾM NGƯỢC ĐẾN TẾT DƯƠNG LỊCH 🎆",
    tet: "🧧 ĐẾM NGƯỢC ĐẾN TẾT NGUYÊN ĐÁN 🧧",
    "national-day": "⭐ ĐẾM NGƯỢC ĐẾN QUỐC KHÁNH 2/9 ⭐",
    default: `⏰ ĐẾM NGƯỢC ĐẾN ${eventName.toUpperCase()} ⏰`,
  };

  const currentStyle = styles[countdownType];
  const currentTitle = titles[countdownType];

  return (
    <section className={`py-16 ${currentStyle}`}>
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-6xl font-bold mb-8 animate-pulse">
          {currentTitle}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/20 backdrop-blur rounded-2xl p-6 shadow-xl">
            <div className="text-5xl md:text-7xl font-bold">{days}</div>
            <div className="text-lg md:text-xl mt-2">Ngày</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-2xl p-6 shadow-xl">
            <div className="text-5xl md:text-7xl font-bold">{hours}</div>
            <div className="text-lg md:text-xl mt-2">Giờ</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-2xl p-6 shadow-xl">
            <div className="text-5xl md:text-7xl font-bold">{minutes}</div>
            <div className="text-lg md:text-xl mt-2">Phút</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-2xl p-6 shadow-xl">
            <div className="text-5xl md:text-7xl font-bold">{seconds}</div>
            <div className="text-lg md:text-xl mt-2">Giây</div>
          </div>
        </div>

        <p className="text-xl md:text-2xl mt-10 opacity-90">
          Hãy sẵn sàng cho một mùa lễ hội thật vui vẻ cùng RetroTrade! 🎉
        </p>
      </div>
    </section>
  );
}
