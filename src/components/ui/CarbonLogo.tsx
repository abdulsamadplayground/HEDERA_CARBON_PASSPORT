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
        d="M100 20 L170 55 L170 145 L100 180 L30 145 L30 55 Z"
        fill="url(#hexGrad2)"
        opacity="0.9"
      />

      {/* Inner hexagon - emerald */}
      <path
        d="M100 33 L158 63 L158 137 L100 167 L42 137 L42 63 Z"
        fill="url(#hexGrad)"
      />

      {/* Shine overlay */}
      <path
        d="M100 33 L158 63 L158 100 L42 100 L42 63 Z"
        fill="url(#shineGrad)"
        opacity="0.5"
      />

      {/* Leaf shape */}
      <g filter="url(#glow)">
        <path
          d="M100 55 C100 55 135 75 135 115 C135 140 115 150 100 155 C85 150 65 140 65 115 C65 75 100 55 100 55 Z"
          fill="white"
          opacity="0.95"
        />
        {/* Leaf vein - center */}
        <path
          d="M100 65 Q100 105 100 150"
          stroke="url(#leafGrad)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Leaf veins - left */}
        <path
          d="M100 85 Q85 90 75 105"
          stroke="url(#leafGrad)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M100 105 Q82 113 72 125"
          stroke="url(#leafGrad)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        {/* Leaf veins - right */}
        <path
          d="M100 85 Q115 90 125 105"
          stroke="url(#leafGrad)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M100 105 Q118 113 128 125"
          stroke="url(#leafGrad)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Sparkle highlights */}
      <circle cx="75" cy="60" r="2" fill="white" opacity="0.7" />
      <circle cx="140" cy="80" r="1.5" fill="white" opacity="0.5" />
    </svg>
  );
}
