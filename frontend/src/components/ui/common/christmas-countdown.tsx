"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function ChristmasCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isChristmas, setIsChristmas] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const christmas = new Date(currentYear, 11, 25, 0, 0, 0); // 25/12

      // Nếu đã qua Giáng sinh năm nay, tính cho năm sau
      if (now > christmas) {
        christmas.setFullYear(currentYear + 1);
      }

      const difference = christmas.getTime() - now.getTime();

      if (difference <= 0) {
        setIsChristmas(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      setIsChristmas(false);
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (isChristmas) {
    return (
      <div className="bg-gradient-to-r from-red-600 to-green-600 text-white rounded-xl p-6 shadow-lg text-center">
        <div className="text-4xl mb-2">🎄🎉</div>
        <h3 className="text-2xl font-bold">Chúc Mừng Giáng Sinh!</h3>
        <p className="text-lg mt-2">Hôm nay là ngày đặc biệt! 🎁</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-green-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-red-600" />
        <h3 className="text-xl font-bold text-gray-800">Đếm ngược đến Giáng Sinh</h3>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <TimeBox label="Ngày" value={timeLeft.days} emoji="📅" />
        <TimeBox label="Giờ" value={timeLeft.hours} emoji="⏰" />
        <TimeBox label="Phút" value={timeLeft.minutes} emoji="⏱️" />
        <TimeBox label="Giây" value={timeLeft.seconds} emoji="⏳" />
      </div>
    </div>
  );
}

function TimeBox({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="bg-white rounded-lg p-3 text-center shadow-md border-2 border-red-100">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-3xl font-bold text-red-600 mb-1">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-xs text-gray-600 font-medium">{label}</div>
    </div>
  );
}

