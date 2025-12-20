"use client";

import { useState, useEffect } from "react";

interface ChristmasTreeProps {
  sizeMultiplier: number;
  animated: boolean;
}

export function ChristmasTree({
  animated,
}: ChristmasTreeProps) {
  const [lightsOn, setLightsOn] = useState(true);

  useEffect(() => {
    if (animated) {
      const interval = setInterval(() => setLightsOn((prev) => !prev), 600);
      return () => clearInterval(interval);
    }
  }, [animated]);

  return (
    <>
      {/* Star on top */}
      <g className={animated ? "animate-pulse" : ""}>
        <path
          d="M100 5 L105 25 L125 25 L110 38 L115 58 L100 45 L85 58 L90 38 L75 25 L95 25 Z"
          fill="#FFD700"
          stroke="#FFA500"
          strokeWidth="1"
        />
        <circle
          cx="100"
          cy="20"
          r="3"
          fill="#FFA500"
          className={animated ? "animate-ping" : ""}
        />
      </g>

      {/* Tree layers */}
      <path
        d="M100 30 L70 80 L130 80 Z"
        fill={lightsOn ? "#22c55e" : "#16a34a"}
        className="transition-colors duration-500"
      />
      <path
        d="M100 30 L75 75 L125 75 Z"
        fill={lightsOn ? "#4ade80" : "#22c55e"}
        className="transition-colors duration-500"
      />
      <path
        d="M100 60 L50 120 L150 120 Z"
        fill={lightsOn ? "#16a34a" : "#15803d"}
        className="transition-colors duration-500"
      />
      <path
        d="M100 60 L55 115 L145 115 Z"
        fill={lightsOn ? "#22c55e" : "#16a34a"}
        className="transition-colors duration-500"
      />
      <path
        d="M100 100 L30 180 L170 180 Z"
        fill={lightsOn ? "#15803d" : "#166534"}
        className="transition-colors duration-500"
      />
      <path
        d="M100 100 L35 175 L165 175 Z"
        fill={lightsOn ? "#16a34a" : "#15803d"}
        className="transition-colors duration-500"
      />

      {/* Trunk */}
      <rect x="90" y="180" width="20" height="40" fill="#8B4513" rx="2" />
      <rect x="92" y="180" width="16" height="40" fill="#A0522D" rx="1" />

      {/* Twinkling lights */}
      {animated && lightsOn && (
        <>
          <circle
            cx="85"
            cy="50"
            r="2"
            fill="#FFD700"
            className="animate-ping"
          />
          <circle
            cx="115"
            cy="55"
            r="2"
            fill="#FF6B6B"
            className="animate-ping"
            style={{ animationDelay: "0.2s" }}
          />
          <circle
            cx="75"
            cy="90"
            r="2"
            fill="#4ECDC4"
            className="animate-ping"
            style={{ animationDelay: "0.4s" }}
          />
          <circle
            cx="125"
            cy="95"
            r="2"
            fill="#FFD700"
            className="animate-ping"
            style={{ animationDelay: "0.6s" }}
          />
          <circle
            cx="100"
            cy="110"
            r="2"
            fill="#FF6B6B"
            className="animate-ping"
            style={{ animationDelay: "0.8s" }}
          />
          <circle
            cx="60"
            cy="140"
            r="2"
            fill="#FFD700"
            className="animate-ping"
            style={{ animationDelay: "1s" }}
          />
          <circle
            cx="140"
            cy="145"
            r="2"
            fill="#4ECDC4"
            className="animate-ping"
            style={{ animationDelay: "1.2s" }}
          />
          <circle
            cx="90"
            cy="150"
            r="2"
            fill="#FF6B6B"
            className="animate-ping"
            style={{ animationDelay: "1.4s" }}
          />
          <circle
            cx="110"
            cy="155"
            r="2"
            fill="#FFD700"
            className="animate-ping"
            style={{ animationDelay: "1.6s" }}
          />
        </>
      )}

      {/* Ornaments & Garland */}
      <>
        {/* Ornaments */}
        <circle
          cx="85"
          cy="50"
          r="4"
          fill="#DC2626"
          stroke="#991B1B"
          strokeWidth="1"
        />
        <circle cx="85" cy="50" r="2" fill="#FCA5A5" />
        <line
          x1="85"
          y1="46"
          x2="85"
          y2="42"
          stroke="#DC2626"
          strokeWidth="1"
        />

        <circle
          cx="115"
          cy="55"
          r="4"
          fill="#2563EB"
          stroke="#1E40AF"
          strokeWidth="1"
        />
        <circle cx="115" cy="55" r="2" fill="#93C5FD" />
        <line
          x1="115"
          y1="51"
          x2="115"
          y2="47"
          stroke="#2563EB"
          strokeWidth="1"
        />

        <circle
          cx="75"
          cy="90"
          r="4"
          fill="#F59E0B"
          stroke="#D97706"
          strokeWidth="1"
        />
        <circle cx="75" cy="90" r="2" fill="#FDE047" />
        <line
          x1="75"
          y1="86"
          x2="75"
          y2="82"
          stroke="#F59E0B"
          strokeWidth="1"
        />

        <circle
          cx="125"
          cy="95"
          r="4"
          fill="#9333EA"
          stroke="#7E22CE"
          strokeWidth="1"
        />
        <circle cx="125" cy="95" r="2" fill="#C084FC" />
        <line
          x1="125"
          y1="91"
          x2="125"
          y2="87"
          stroke="#9333EA"
          strokeWidth="1"
        />

        <circle
          cx="100"
          cy="110"
          r="4"
          fill="#EC4899"
          stroke="#BE185D"
          strokeWidth="1"
        />
        <circle cx="100" cy="110" r="2" fill="#F9A8D4" />
        <line
          x1="100"
          y1="106"
          x2="100"
          y2="102"
          stroke="#EC4899"
          strokeWidth="1"
        />

        <circle
          cx="60"
          cy="140"
          r="4"
          fill="#10B981"
          stroke="#059669"
          strokeWidth="1"
        />
        <circle cx="60" cy="140" r="2" fill="#6EE7B7" />
        <line
          x1="60"
          y1="136"
          x2="60"
          y2="132"
          stroke="#10B981"
          strokeWidth="1"
        />

        <circle
          cx="140"
          cy="145"
          r="4"
          fill="#F97316"
          stroke="#EA580C"
          strokeWidth="1"
        />
        <circle cx="140" cy="145" r="2" fill="#FDBA74" />
        <line
          x1="140"
          y1="141"
          x2="140"
          y2="137"
          stroke="#F97316"
          strokeWidth="1"
        />

        {/* Garland */}
        <path
          d="M70 80 Q100 70 130 80 Q100 90 70 80"
          fill="none"
          stroke="#FFD700"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <path
          d="M50 120 Q100 110 150 120 Q100 130 50 120"
          fill="none"
          stroke="#FFD700"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <path
          d="M30 180 Q100 170 170 180 Q100 190 30 180"
          fill="none"
          stroke="#FFD700"
          strokeWidth="1.5"
          opacity="0.6"
        />
      </>
    </>
  );
}
