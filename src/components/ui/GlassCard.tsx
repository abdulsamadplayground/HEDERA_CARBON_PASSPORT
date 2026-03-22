"use client";

import { motion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  hover?: boolean;
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  padding?: string;
}

export default function GlassCard({
  children,
  hover = true,
  glow = false,
  style,
  delay = 0,
  padding = "1.5rem",
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid #E2E8F0",
        borderRadius: "16px",
        padding,
        boxShadow: glow
          ? "0 10px 25px rgba(0,0,0,0.06), 0 0 20px rgba(16,185,129,0.06)"
          : "0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)",
        transition: "all 0.3s ease",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export function GlassCardStatic({
  children,
  style,
  padding = "1.5rem",
}: {
  children: ReactNode;
  style?: CSSProperties;
  padding?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid #E2E8F0",
        borderRadius: "16px",
        padding,
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
