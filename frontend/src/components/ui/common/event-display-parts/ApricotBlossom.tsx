"use client";

interface ApricotBlossomProps {
  animated: boolean;
}

export function ApricotBlossom({ animated }: ApricotBlossomProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        {/* Nền vàng đỏ gradient Tết miền Nam */}
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="60%" fx="50%" fy="40%">
          <stop offset="0%" stopColor="#ffecb3" />
          <stop offset="60%" stopColor="#ffd54f" />
          <stop offset="100%" stopColor="#ffb300" />
        </radialGradient>

        {/* Gradient cánh hoa mai vàng rực */}
        <radialGradient id="petalGrad" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#ffff8d" />
          <stop offset="40%" stopColor="#ffeb3b" />
          <stop offset="80%" stopColor="#ffc107" />
          <stop offset="100%" stopColor="#ff8f00" />
        </radialGradient>

        {/* Nhụy đỏ tươi */}
        <radialGradient id="stamenGrad">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="70%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>

        {/* Gradient lá xanh bóng */}
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>

        {/* Shadow mềm mại */}
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" in="SourceAlpha" />
          <feOffset dx="3" dy="6" result="offset" />
          <feFlood floodColor="#000000" floodOpacity="0.25" />
          <feComposite in2="offset" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Glow vàng cho hoa khi animated */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Nền vàng ấm áp */}
      <circle cx="200" cy="200" r="190" fill="url(#bgGrad)" opacity="0.98" />

      {/* Thân cây mai - uốn lượn bonsai cổ thụ */}
      <path
        d="M200 380 Q140 300 170 200 Q230 120 200 60"
        fill="none"
        stroke="#3C2F2F"
        strokeWidth="34"
        strokeLinecap="round"
        filter="url(#softShadow)"
      />

      {/* Cành phụ lan tỏa đẹp mắt */}
      <g stroke="#3C2F2F" strokeLinecap="round" filter="url(#softShadow)">
        <path d="M170 220 Q120 170 90 130" strokeWidth="22" />
        <path d="M230 220 Q280 170 310 130" strokeWidth="22" />
        <path d="M200 140 Q140 90 100 60" strokeWidth="18" />
        <path d="M200 140 Q260 90 300 60" strokeWidth="18" />
        <path d="M150 280 Q100 230 80 190" strokeWidth="20" />
        <path d="M250 280 Q300 230 320 190" strokeWidth="20" />
        <path d="M170 100 Q130 50 90 20" strokeWidth="14" />
        <path d="M230 100 Q270 50 310 20" strokeWidth="14" />
      </g>

      {/* Hoa mai vàng - 5 cánh chuẩn, nhiều tầng, glow khi animated */}
      <g
        filter={animated ? "url(#glow)" : ""}
        className={animated ? "animate-pulse" : ""}
      >
        {[
          { cx: 200, cy: 70, size: 24 },
          { cx: 110, cy: 130, size: 26 },
          { cx: 290, cy: 130, size: 26 },
          { cx: 90, cy: 50, size: 22 },
          { cx: 310, cy: 50, size: 22 },
          { cx: 80, cy: 190, size: 24 },
          { cx: 320, cy: 190, size: 24 },
          { cx: 130, cy: 80, size: 20 },
          { cx: 270, cy: 80, size: 20 },
          { cx: 150, cy: 110, size: 22 },
          { cx: 250, cy: 110, size: 22 },
          { cx: 170, cy: 170, size: 23 },
          { cx: 230, cy: 170, size: 23 },
          { cx: 140, cy: 230, size: 21 },
          { cx: 260, cy: 230, size: 21 },
          { cx: 190, cy: 250, size: 20 },
          { cx: 210, cy: 250, size: 20 },
        ].map((flower, i) => (
          <g
            key={i}
            className={
              animated
                ? "origin-center animate-[sway_10s_ease-in-out_infinite]"
                : ""
            }
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            {/* Cánh ngoài */}
            {[...Array(5)].map((_, j) => (
              <ellipse
                key={`outer-${j}`}
                cx={flower.cx}
                cy={flower.cy}
                rx={flower.size + 5}
                ry={(flower.size + 5) * 0.6}
                fill="url(#petalGrad)"
                opacity="0.9"
                transform={`rotate(${j * 72} ${flower.cx} ${flower.cy})`}
              />
            ))}
            {/* Cánh trong sáng hơn */}
            {[...Array(5)].map((_, j) => (
              <ellipse
                key={`inner-${j}`}
                cx={flower.cx}
                cy={flower.cy}
                rx={flower.size}
                ry={flower.size * 0.6}
                fill="#ffff00"
                opacity="0.7"
                transform={`rotate(${j * 72 + 36} ${flower.cx} ${flower.cy})`}
              />
            ))}
            {/* Nhụy đỏ tươi + điểm sáng */}
            <circle
              cx={flower.cx}
              cy={flower.cy}
              r={flower.size / 2.8}
              fill="url(#stamenGrad)"
              filter="url(#softShadow)"
            />
            <circle
              cx={flower.cx}
              cy={flower.cy}
              r={flower.size / 6}
              fill="#ffffff"
              opacity="0.8"
            />
          </g>
        ))}
      </g>

      {/* Nụ mai vàng nhỏ */}
      <g>
        <circle cx="120" cy="90" r="10" fill="#ffc107" />
        <circle cx="280" cy="90" r="10" fill="#ffc107" />
        <circle cx="150" cy="190" r="9" fill="#ffeb3b" />
        <circle cx="250" cy="190" r="9" fill="#ffeb3b" />
        <circle cx="100" cy="150" r="8" fill="#ffd54f" />
        <circle cx="300" cy="150" r="8" fill="#ffd54f" />
      </g>

      {/* Lá xanh ít, bóng bẩy */}
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
        ].map((leaf, i) => (
          <path
            key={i}
            d={`M${leaf.x} ${leaf.y} Q${leaf.x + 14} ${leaf.y - 22} ${
              leaf.x + 28
            } ${leaf.y} Q${leaf.x + 14} ${leaf.y + 22} ${leaf.x} ${leaf.y}`}
            fill="url(#leafGrad)"
            opacity="0.95"
            transform={`rotate(${i * 45 - 70} ${leaf.x + 14} ${leaf.y})`}
          />
        ))}
      </g>

      {/* Bao lì xì treo trên cành - vàng đỏ Tết */}
      <g className={animated ? "animate-[swing_6s_ease-in-out_infinite]" : ""}>
        <g transform="translate(120,220)">
          <rect
            x="-20"
            y="0"
            width="40"
            height="55"
            rx="7"
            fill="#dc2626"
            filter="url(#softShadow)"
          />
          <rect x="-20" y="0" width="40" height="14" rx="7" fill="#ffd700" />
          <text
            x="0"
            y="35"
            fontSize="15"
            fill="#ffd700"
            textAnchor="middle"
            fontWeight="bold"
          >
            Lì Xì
          </text>
          <path d="M0 -12 L0 0" stroke="#3C2F2F" strokeWidth="3" />
        </g>

        <g transform="translate(280,220)">
          <rect
            x="-20"
            y="0"
            width="40"
            height="55"
            rx="7"
            fill="#dc2626"
            filter="url(#softShadow)"
          />
          <rect x="-20" y="0" width="40" height="14" rx="7" fill="#ffd700" />
          <text
            x="0"
            y="35"
            fontSize="15"
            fill="#ffd700"
            textAnchor="middle"
            fontWeight="bold"
          >
            Phát Tài
          </text>
          <path d="M0 -12 L0 0" stroke="#3C2F2F" strokeWidth="3" />
        </g>

        <g transform="translate(200,130)">
          <rect
            x="-16"
            y="0"
            width="32"
            height="45"
            rx="6"
            fill="#b91c1c"
            filter="url(#softShadow)"
          />
          <rect x="-16" y="0" width="32" height="11" rx="6" fill="#ffeb3b" />
          <text
            x="0"
            y="28"
            fontSize="13"
            fill="#ffeb3b"
            textAnchor="middle"
            fontWeight="bold"
          >
            2026
          </text>
          <path d="M0 -10 L0 0" stroke="#3C2F2F" strokeWidth="2.5" />
        </g>
      </g>

      {/* Cánh hoa mai rơi - vàng rực */}
      {animated && (
        <g>
          {[...Array(18)].map((_, i) => (
            <ellipse
              key={i}
              cx={200 + Math.sin(i * 20) * 130}
              cy="-40"
              rx={10}
              ry={16}
              fill="url(#petalGrad)"
              opacity="0.9"
              className="animate-[fall_15s_linear_infinite]"
              style={{
                animationDelay: `${i * 0.8}s`,
                transform: `rotate(${i * 40}deg)`,
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
            transform: rotate(10deg);
          }
        }
        @keyframes swing {
          0%,
          100% {
            transform: rotate(-12deg);
          }
          50% {
            transform: rotate(12deg);
          }
        }
        @keyframes fall {
          0% {
            transform: translateY(-140px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.95;
          }
          90% {
            opacity: 0.95;
          }
          100% {
            transform: translateY(540px) rotate(1080deg);
            opacity: 0;
          }
        }
      `}</style>
    </svg>
  );
}
