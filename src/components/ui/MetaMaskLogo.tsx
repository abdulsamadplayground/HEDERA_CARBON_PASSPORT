"use client";

import type { CSSProperties } from "react";

interface Props {
  size?: number;
  style?: CSSProperties;
}

/**
 * Official MetaMask fox logo as inline SVG.
 */
export default function MetaMaskLogo({ size = 24, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 318.6 318.6"
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round" d="m274.1 35.5-99.5 73.9L193 65.8z" />
      <path fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" d="m44.4 35.5 98.7 74.6-17.5-44.3zm187.9 174.2-26.5 40.6 56.7 15.6 16.3-55.3zm-204.4.9L44.1 266l56.7-15.6-26.5-40.6z" />
      <path fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" d="m98.6 126.5-15.8 23.9 56.3 2.5-2-60.5zm121.2 0-39.9-35.2-1.3 61.6 56.2-2.5zM100.8 265l33.8-16.5-29.2-22.8zm83.1-16.5 33.9 16.5-4.7-39.3z" />
      <path fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" d="m217.8 265-33.9-16.5 2.7 22.1-.3 9.3zm-117 0 31.5 14.9-.2-9.3 2.5-22.1z" />
      <path fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" d="m132.3 197.9-28.2-8.3 19.9-9.1zm54 0 8.3-17.4 20 9.1z" />
      <path fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" d="m100.8 265 4.8-40.6-31.3.9zM213 224.4l4.8 40.6 26.5-39.7zm23.8-73.7-56.2 2.5 5.2 28.9 8.3-17.4 20 9.1zm-132.8 23.1 20-9.1 8.2 17.4 5.3-28.9-56.3-2.5z" />
      <path fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" d="m82.8 150.4 23.7 46.2-0.8-23zm152.8 23.2-.9 23 23.7-46.2zM139.1 152.9l-5.3 28.9 6.6 34.1 1.5-44.9zm40.5 0-2.7 18 1.2 45 6.7-34.1z" />
      <path fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" d="m186.3 197.9-6.7 34.1 4.8 3.3 29.2-22.8.9-23zm-82.3-8.3.8 23 29.2 22.8 4.8-3.3-6.6-34.1z" />
      <path fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round" d="m187.8 279.9.3-9.3-2.5-2.2h-37.7l-2.3 2.2.2 9.3-31.5-14.9 11 9 22.3 15.5h38.3l22.4-15.5 11-9z" />
      <path fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round" d="m183.9 248.5-4.8-3.3h-27.6l-4.8 3.3-2.5 22.1 2.3-2.2h37.7l2.5 2.2z" />
      <path fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round" d="m278.3 114.2 8.5-40.8-12.7-37.9-90.2 66.8 34.7 29.2 49 14.3 10.8-12.6-4.7-3.4 7.5-6.8-5.8-4.5 7.5-5.7zm-238 0 8.5 40.8-5.4 4 7.5 5.7-5.7 4.5 7.5 6.8-4.7 3.4 10.8 12.6 49-14.3 34.7-29.2-90.2-66.8z" />
      <path fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" d="m267.6 145.8-49-14.3 15.8 23.9-23.7 46.2 30.8-.4h46.4zm-168.6-14.3-49 14.3-16.3 55.3h46.3l30.8.4-23.7-46.2zm71.1 26.4 3.1-54.4 14.3-38.7H130l14.2 38.7 3.2 54.4 1.2 18.1.1 44.8h27.6l.2-44.8z" />
    </svg>
  );
}
