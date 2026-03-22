"use client";

import { motion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: CSSProperties;
}

const VARIANTS = {
  primary: {
    background: "linear-gradient(135deg, #10B981 0%, #3B82F6 100%)",
    color: "#FFFFFF",
    border: "none",
    boxShadow: "0 4px 14px rgba(16,185,129,0.25)",
  },
  secondary: {
    background: "#FFFFFF",
    color: "#475569",
    border: "1px solid #E2E8F0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  ghost: {
    background: "transparent",
    color: "#475569",
    border: "1px solid transparent",
    boxShadow: "none",
  },
  danger: {
    background: "rgba(239,68,68,0.08)",
    color: "#DC2626",
    border: "1px solid rgba(239,68,68,0.2)",
    boxShadow: "none",
  },
};

const SIZES = {
  sm: { padding: "0.35rem 0.75rem", fontSize: "0.78rem" },
  md: { padding: "0.55rem 1.1rem", fontSize: "0.85rem" },
  lg: { padding: "0.7rem 1.5rem", fontSize: "0.95rem" },
};

export default function AccentButton({
  children, onClick, disabled, variant = "primary", size = "md", icon, fullWidth, style,
}: Props) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      style={{
        ...v, ...s,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
        borderRadius: "12px", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, width: fullWidth ? "100%" : undefined,
        fontFamily: "'Inter', sans-serif", letterSpacing: "0.01em",
        transition: "all 0.2s ease",
        ...style,
      }}
    >
      {icon}{children}
    </motion.button>
  );
}
