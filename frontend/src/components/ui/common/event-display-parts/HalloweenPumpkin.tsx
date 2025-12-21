"use client";

import { motion } from "framer-motion";

export function HalloweenPumpkin() {
  return (
    <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="200" rx="80" ry="15" fill="#000000" opacity="0.3" />

      <defs>
        <linearGradient id="pumpkinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF8C00" />
          <stop offset="50%" stopColor="#FF7518" />
          <stop offset="100%" stopColor="#E65C00" />
        </linearGradient>

        <radialGradient id="highlight" cx="30%" cy="20%">
          <stop offset="0%" stopColor="#FFB84D" />
          <stop offset="100%" stopColor="#FF7518" opacity="0" />
        </radialGradient>

        <filter id="glow">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M100 20
           C50 20, 20 60, 20 110
           C20 160, 50 200, 100 200
           C150 200, 180 160, 180 110
           C180 60, 150 20, 100 20
           Z"
        fill="url(#pumpkinGradient)"
      />

      <ellipse
        cx="70"
        cy="80"
        rx="40"
        ry="80"
        fill="url(#highlight)"
        opacity="0.6"
      />

      <path
        d="M50 60 Q60 100 50 140"
        stroke="#E65C00"
        strokeWidth="4"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M80 50 Q85 100 80 150"
        stroke="#E65C00"
        strokeWidth="5"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M120 50 Q115 100 120 150"
        stroke="#E65C00"
        strokeWidth="5"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M150 60 Q140 100 150 140"
        stroke="#E65C00"
        strokeWidth="4"
        fill="none"
        opacity="0.5"
      />

      <path d="M60 90 L75 110 L50 120 Z" fill="#000" />
      <path d="M140 90 L125 110 L150 120 Z" fill="#000" />
      <path d="M100 110 L90 130 L110 130 Z" fill="#000" />

      <path
        d="M50 150
           Q70 170 80 160
           Q90 175 100 165
           Q110 175 120 160
           Q130 170 150 150"
        stroke="#000"
        strokeWidth="6"
        fill="none"
      />
      <rect x="70" y="150" width="8" height="15" fill="#000" />
      <rect x="92" y="150" width="8" height="18" fill="#000" />
      <rect x="122" y="150" width="8" height="15" fill="#000" />

      <g>
        <motion.path
          d="M60 90 L75 110 L50 120 Z"
          fill="#FFAA00"
          opacity={0.9}
          filter="url(#glow)"
          animate={{
            opacity: [0.7, 1, 0.7],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2 + Math.random() * 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.path
          d="M140 90 L125 110 L150 120 Z"
          fill="#FFAA00"
          opacity={0.9}
          filter="url(#glow)"
          animate={{
            opacity: [0.8, 1, 0.8],
            scale: [1, 1.06, 1],
          }}
          transition={{
            duration: 1.8 + Math.random() * 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.path
          d="M100 110 L90 130 L110 130 Z"
          fill="#FFAA00"
          opacity={0.9}
          filter="url(#glow)"
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.path
          d="M50 150
             Q70 170 80 160
             Q90 175 100 165
             Q110 175 120 160
             Q130 170 150 150
             L150 170 Q100 190 50 170 Z"
          fill="#FFAA00"
          opacity={0.9}
          filter="url(#glow)"
          animate={{
            opacity: [0.7, 1, 0.8, 1, 0.7],
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 1.5 + Math.random() * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </g>

      <rect x="90" y="10" width="20" height="40" fill="#8B4513" rx="8" />
      <ellipse cx="100" cy="50" rx="25" ry="10" fill="#6B8E23" />

      <path
        d="M100 30 Q120 10 140 30 Q160 50 140 70"
        stroke="#228B22"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
