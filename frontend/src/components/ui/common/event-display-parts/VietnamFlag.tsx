"use client";

interface VietnamFlagProps {
  size?: "small" | "medium" | "large";
  animated?: boolean;
}

export function VietnamFlag({
  size = "medium",
  animated = true,
}: VietnamFlagProps) {
  const sizes = {
    small: { viewBox: "0 0 60 40", className: "w-8 h-5.5" }, 
    medium: { viewBox: "0 0 200 120", className: "w-full max-w-md" },
    large: { viewBox: "0 0 300 180", className: "w-full" },
  };

  const { viewBox, className } = sizes[size];

  return (
    <svg
      viewBox={viewBox}
      className={`${className} drop-shadow-2xl ${
        animated ? "animate-float" : ""
      }`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Nền đỏ */}
      <rect
        width={viewBox.split(" ")[2]}
        height={viewBox.split(" ")[3]}
        fill="#DA251D"
      />

      {/* Ngôi sao vàng chuẩn tỷ lệ */}
      <g
        transform={`translate(${parseInt(viewBox.split(" ")[2]) / 2},${
          parseInt(viewBox.split(" ")[3]) / 2
        })`}
      >
        <path
          d="M0,-32 L9.2,-13.1 L29.4,-9.8 L14.7,6.5 L18.5,26.5 L0,16.2 L-18.5,26.5 L-14.7,6.5 L-29.4,-9.8 L-9.2,-13.1 Z"
          fill="#FFFF00"
          className={animated ? "animate-pulse" : ""}
        />
      </g>

      {/* Hiệu ứng bay nhẹ */}
      {animated && (
        <g opacity="0.25">
          <defs>
            <linearGradient id="flagWave" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#DA251D" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#DA251D" stopOpacity="1" />
              <stop offset="100%" stopColor="#DA251D" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          <path
            d={`M0,${parseInt(viewBox.split(" ")[3]) * 0.33} Q50,${
              parseInt(viewBox.split(" ")[3]) * 0.25
            } 100,${parseInt(viewBox.split(" ")[3]) * 0.33} T${parseInt(
              viewBox.split(" ")[2]
            )},${parseInt(viewBox.split(" ")[3]) * 0.33} L${parseInt(
              viewBox.split(" ")[2]
            )},${parseInt(viewBox.split(" ")[3])} L0,${parseInt(
              viewBox.split(" ")[3]
            )} Z`}
            fill="url(#flagWave)"
            className="animate-wave-1"
          />
          <path
            d={`M0,${parseInt(viewBox.split(" ")[3]) * 0.5} Q50,${
              parseInt(viewBox.split(" ")[3]) * 0.58
            } 100,${parseInt(viewBox.split(" ")[3]) * 0.5} T${parseInt(
              viewBox.split(" ")[2]
            )},${parseInt(viewBox.split(" ")[3]) * 0.5} L${parseInt(
              viewBox.split(" ")[2]
            )},${parseInt(viewBox.split(" ")[3])} L0,${parseInt(
              viewBox.split(" ")[3]
            )} Z`}
            fill="#DA251D"
            opacity="0.3"
            className="animate-wave-2"
          />
        </g>
      )}

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-6px) rotate(1deg);
          }
        }
        @keyframes wave-1 {
          0% {
            transform: translateX(-25px);
          }
          100% {
            transform: translateX(25px);
          }
        }
        @keyframes wave-2 {
          0% {
            transform: translateX(25px);
          }
          100% {
            transform: translateX(-25px);
          }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        .animate-wave-1 {
          animation: wave-1 12s linear infinite;
        }
        .animate-wave-2 {
          animation: wave-2 16s linear infinite;
        }
      `}</style>
    </svg>
  );
}
