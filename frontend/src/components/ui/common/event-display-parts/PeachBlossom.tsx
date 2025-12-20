"use client";

interface PeachBlossomProps {
  animated: boolean;
}

export function PeachBlossom({ animated }: PeachBlossomProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        {/* Nền mặt trời đỏ gradient chuyên nghiệp hơn */}
        <radialGradient
          id="sunGrad"
          cx="50%"
          cy="50%"
          r="60%"
          fx="50%"
          fy="40%"
        >
          <stop offset="0%" stopColor="#ff1744" />
          <stop offset="60%" stopColor="#d50000" />
          <stop offset="100%" stopColor="#b71c1c" />
        </radialGradient>

        {/* Gradient cánh hoa hồng phấn tinh tế */}
        <radialGradient id="petalGrad" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#ffeef8" />
          <stop offset="80%" stopColor="#ff99cc" />
          <stop offset="100%" stopColor="#ff4081" />
        </radialGradient>

        {/* Gradient lá xanh bóng */}
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#69f0ae" />
          <stop offset="50%" stopColor="#00e676" />
          <stop offset="100%" stopColor="#00c853" />
        </linearGradient>

        {/* Nhụy hoa vàng kim */}
        <radialGradient id="stamenGrad">
          <stop offset="0%" stopColor="#ffeb3b" />
          <stop offset="60%" stopColor="#ffc107" />
          <stop offset="100%" stopColor="#ff8f00" />
        </radialGradient>

        {/* Gradient đỏ vàng cho bao lì xì */}
        <linearGradient id="envelopeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff1744" />
          <stop offset="50%" stopColor="#f50057" />
          <stop offset="100%" stopColor="#d50000" />
        </linearGradient>

        {/* Viền vàng cho bao lì xì */}
        <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#ffb300" />
        </linearGradient>

        {/* Shadow tổng thể */}
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" in="SourceAlpha" />
          <feOffset dx="3" dy="6" result="offset" />
          <feFlood floodColor="#000000" floodOpacity="0.3" />
          <feComposite in2="offset" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Glow nhẹ cho hoa khi animated */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Nền mặt trời đỏ */}
      <circle cx="200" cy="200" r="190" fill="url(#sunGrad)" opacity="0.95" />

      {/* Thân cây chính - dày, uốn lượn bonsai chuyên nghiệp */}
      <path
        d="M200 380 Q140 300 170 200 Q230 120 200 60"
        fill="none"
        stroke="#212121"
        strokeWidth="32"
        strokeLinecap="round"
        filter="url(#softShadow)"
      />

      {/* Cành phụ lan tỏa */}
      <g stroke="#212121" strokeLinecap="round" filter="url(#softShadow)">
        <path d="M170 220 Q120 170 90 130" strokeWidth="20" />
        <path d="M230 220 Q280 170 310 130" strokeWidth="20" />
        <path d="M200 140 Q140 90 100 60" strokeWidth="16" />
        <path d="M200 140 Q260 90 300 60" strokeWidth="16" />
        <path d="M150 280 Q100 230 80 190" strokeWidth="18" />
        <path d="M250 280 Q300 230 320 190" strokeWidth="18" />
        <path d="M170 100 Q130 50 90 20" strokeWidth="12" />
        <path d="M230 100 Q270 50 310 20" strokeWidth="12" />
      </g>

      {/* Hoa đào - nhiều lớp, glow khi animated */}
      <g
        className={animated ? "animate-pulse" : ""}
        filter={animated ? "url(#glow)" : ""}
      >
        {[
          { cx: 200, cy: 70, size: 22 },
          { cx: 110, cy: 130, size: 24 },
          { cx: 290, cy: 130, size: 24 },
          { cx: 90, cy: 50, size: 20 },
          { cx: 310, cy: 50, size: 20 },
          { cx: 80, cy: 190, size: 22 },
          { cx: 320, cy: 190, size: 22 },
          { cx: 130, cy: 70, size: 18 },
          { cx: 270, cy: 70, size: 18 },
          { cx: 150, cy: 110, size: 20 },
          { cx: 250, cy: 110, size: 20 },
          { cx: 170, cy: 170, size: 21 },
          { cx: 230, cy: 170, size: 21 },
          { cx: 140, cy: 230, size: 19 },
          { cx: 260, cy: 230, size: 19 },
          { cx: 190, cy: 250, size: 18 },
          { cx: 210, cy: 250, size: 18 },
        ].map((flower, i) => (
          <g
            key={i}
            className={
              animated
                ? "origin-center animate-[sway_9s_ease-in-out_infinite]"
                : ""
            }
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            {[...Array(5)].map((_, j) => (
              <ellipse
                key={j}
                cx={flower.cx}
                cy={flower.cy}
                rx={flower.size + 4}
                ry={(flower.size + 4) * 0.65}
                fill="url(#petalGrad)"
                opacity="0.92"
                transform={`rotate(${j * 72} ${flower.cx} ${flower.cy})`}
              />
            ))}
            <circle
              cx={flower.cx}
              cy={flower.cy}
              r={flower.size / 2.5}
              fill="url(#stamenGrad)"
              filter="url(#softShadow)"
            />
            <circle
              cx={flower.cx}
              cy={flower.cy}
              r={flower.size / 5}
              fill="#ffffff"
              opacity="0.6"
            />
          </g>
        ))}
      </g>

      {/* Nụ hoa */}
      <g>
        <ellipse
          cx="120"
          cy="90"
          rx="9"
          ry="16"
          fill="#e91e63"
          transform="rotate(50 120 90)"
        />
        <ellipse
          cx="280"
          cy="90"
          rx="9"
          ry="16"
          fill="#e91e63"
          transform="rotate(-50 280 90)"
        />
        <ellipse cx="150" cy="190" rx="8" ry="14" fill="#e91e63" />
        <ellipse cx="250" cy="190" rx="8" ry="14" fill="#e91e63" />
      </g>

      {/* Lá xanh bóng */}
      <g filter="url(#softShadow)">
        {[
          { x: 160, y: 100 },
          { x: 240, y: 100 },
          { x: 120, y: 160 },
          { x: 280, y: 160 },
          { x: 90, y: 210 },
          { x: 310, y: 210 },
          { x: 180, y: 140 },
          { x: 220, y: 140 },
          { x: 140, y: 260 },
          { x: 260, y: 260 },
        ].map((leaf, i) => (
          <path
            key={i}
            d={`M${leaf.x} ${leaf.y} Q${leaf.x + 12} ${leaf.y - 20} ${
              leaf.x + 25
            } ${leaf.y} Q${leaf.x + 12} ${leaf.y + 20} ${leaf.x} ${leaf.y}`}
            fill="url(#leafGrad)"
            opacity="0.95"
            transform={`rotate(${i * 40 - 60} ${leaf.x + 12} ${leaf.y})`}
          />
        ))}
      </g>

      {/* Bao lì xì treo trên cành - đỏ vàng, dây buộc, rung nhẹ khi animated */}
      <g className={animated ? "animate-[swing_5s_ease-in-out_infinite]" : ""}>
        {/* Bao 1 */}
        <g transform="translate(120,220)">
          <rect
            x="-18"
            y="0"
            width="36"
            height="50"
            rx="6"
            fill="url(#envelopeGrad)"
            filter="url(#softShadow)"
          />
          <rect
            x="-18"
            y="0"
            width="36"
            height="12"
            rx="6"
            fill="url(#goldBorder)"
          />
          <text
            x="0"
            y="30"
            fontSize="14"
            fill="#ffd700"
            textAnchor="middle"
            fontWeight="bold"
          >
            Lì Xì
          </text>
          <path d="M0 -10 L0 0" stroke="#212121" strokeWidth="3" />
        </g>

        {/* Bao 2 */}
        <g transform="translate(280,220)">
          <rect
            x="-18"
            y="0"
            width="36"
            height="50"
            rx="6"
            fill="url(#envelopeGrad)"
            filter="url(#softShadow)"
          />
          <rect
            x="-18"
            y="0"
            width="36"
            height="12"
            rx="6"
            fill="url(#goldBorder)"
          />
          <text
            x="0"
            y="30"
            fontSize="14"
            fill="#ffd700"
            textAnchor="middle"
            fontWeight="bold"
          >
            Phát Tài
          </text>
          <path d="M0 -10 L0 0" stroke="#212121" strokeWidth="3" />
        </g>

        {/* Bao 3 */}
        <g transform="translate(100,140)">
          <rect
            x="-15"
            y="0"
            width="30"
            height="42"
            rx="5"
            fill="url(#envelopeGrad)"
            filter="url(#softShadow)"
          />
          <rect
            x="-15"
            y="0"
            width="30"
            height="10"
            rx="5"
            fill="url(#goldBorder)"
          />
          <text x="0" y="25" fontSize="12" fill="#ffd700" textAnchor="middle">
            Năm mới
          </text>
          <path d="M0 -8 L0 0" stroke="#212121" strokeWidth="2" />
        </g>

        {/* Bao 4 */}
        <g transform="translate(300,140)">
          <rect
            x="-15"
            y="0"
            width="30"
            height="42"
            rx="5"
            fill="url(#envelopeGrad)"
            filter="url(#softShadow)"
          />
          <rect
            x="-15"
            y="0"
            width="30"
            height="10"
            rx="5"
            fill="url(#goldBorder)"
          />
          <text x="0" y="25" fontSize="12" fill="#ffd700" textAnchor="middle">
            An Khang
          </text>
          <path d="M0 -8 L0 0" stroke="#212121" strokeWidth="2" />
        </g>

        {/* Bao 5 nhỏ ở trên */}
        <g transform="translate(200,120)">
          <rect
            x="-12"
            y="0"
            width="24"
            height="35"
            rx="4"
            fill="url(#envelopeGrad)"
            filter="url(#softShadow)"
          />
          <rect
            x="-12"
            y="0"
            width="24"
            height="8"
            rx="4"
            fill="url(#goldBorder)"
          />
          <text x="0" y="20" fontSize="10" fill="#ffd700" textAnchor="middle">
            Tài Lộc
          </text>
          <path d="M0 -6 L0 0" stroke="#212121" strokeWidth="2" />
        </g>
      </g>

      {/* Cánh hoa rơi - nhiều hơn, mượt mà */}
      {animated && (
        <g>
          {[...Array(16)].map((_, i) => (
            <ellipse
              key={i}
              cx={200 + Math.sin(i * 22) * 120}
              cy="-30"
              rx={9}
              ry={15}
              fill="url(#petalGrad)"
              opacity="0.85"
              className="animate-[fall_14s_linear_infinite]"
              style={{
                animationDelay: `${i * 0.9}s`,
                transform: `rotate(${i * 35}deg)`,
              }}
            />
          ))}
        </g>
      )}

      <style jsx>{`
        @keyframes sway {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(8deg);
          }
        }
        @keyframes swing {
          0%,
          100% {
            transform: rotate(-10deg);
          }
          50% {
            transform: rotate(10deg);
          }
        }
        @keyframes fall {
          0% {
            transform: translateY(-120px) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: 0.9;
          }
          88% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(520px) rotate(1080deg);
            opacity: 0;
          }
        }
      `}</style>
    </svg>
  );
}
