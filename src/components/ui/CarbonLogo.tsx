"use client";

import type { CSSProperties } from "react";

interface Props {
  size?: number;
  style?: CSSProperties;
  className?: string;
}

/**
 * Carbon Passport hexagonal shield + leaf logo.
 * Matches the reference design: emerald/blue gradient hexagon with leaf motif.
 */
export default function CarbonLogo({ size = 200, style, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={className}
    >
      <defs>
        <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="hexGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer hexagon - blue */}
      <path
        d="M100 15 L170 52 L170 128 L100 165 L30 128 L30 52 Z"
        fill="url(#hexGrad2)"
        opacity="0.9"
      />

      {/* Inner hexagon - emerald */}
      <path
        d="M100 28 L158 58 L158 122 L100 152 L42 122 L42 58 Z"
        fill="url(#hexGrad)"
      />

      {/* Shine overlay */}
      <path
        d="M100 28 L158 58 L158 90 L42 90 L42 58 Z"
        fill="url(#shineGrad)"
        opacity="0.5"
      />

      {/* Leaf shape */}
      <g filter="url(#glow)">
        <path
          d="M100 50 C100 50 135 70 135 110 C135 135 115 145 100 150 C85 145 65 135 65 110 C65 70 100 50 100 50 Z"
          fill="white"
          opacity="0.95"
        />
        {/* Leaf vein - center */}
        <path
          d="M100 60 Q100 100 100 145"
          stroke="url(#leafGrad)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Leaf veins - left */}
        <path
          d="M100 80 Q85 85 75 100"
          stroke="url(#leafGrad)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M100 100 Q82 108 72 120"
          stroke="url(#leafGrad)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        {/* Leaf veins - right */}
        <path
          d="M100 80 Q115 85 125 100"
          stroke="url(#leafGrad)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M100 100 Q118 108 128 120"
          stroke="url(#leafGrad)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Sparkle highlights */}
      <circle cx="75" cy="55" r="2" fill="white" opacity="0.7" />
      <circle cx="140" cy="75" r="1.5" fill="white" opacity="0.5" />
    </svg>
  );
}
