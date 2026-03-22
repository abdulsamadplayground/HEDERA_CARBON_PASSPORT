"use client";

import type { CSSProperties } from "react";

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" },
  B: { bg: "#DBEAFE", text: "#2563EB", border: "#BFDBFE" },
  C: { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  D: { bg: "#FFEDD5", text: "#EA580C", border: "#FED7AA" },
  F: { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
};

export function GradeBadge({ grade, size = "md" }: { grade: string; size?: "sm" | "md" | "lg" }) {
  const c = GRADE_COLORS[grade?.toUpperCase()] || GRADE_COLORS.C;
  const sizes = { sm: { font: "0.75rem", pad: "0.2rem 0.5rem" }, md: { font: "0.9rem", pad: "0.3rem 0.7rem" }, lg: { font: "1.4rem", pad: "0.5rem 1rem" } };
  const s = sizes[size];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: c.bg, color: c.text, fontWeight: 800, fontSize: s.font,
      padding: s.pad, borderRadius: "8px", border: `1px solid ${c.border}`,
      fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.05em",
    }}>
      {grade?.toUpperCase()}
    </span>
  );
}

export function TierBadge({ tier }: { tier: number | string }) {
  const t = Number(tier);
  const colors = t === 3 ? GRADE_COLORS.A : t === 2 ? GRADE_COLORS.C : GRADE_COLORS.F;
  const labels = { 1: "High Emitter", 2: "Medium", 3: "Low Emitter" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.3rem",
      background: colors.bg, color: colors.text, fontWeight: 600, fontSize: "0.75rem",
      padding: "0.2rem 0.6rem", borderRadius: "6px", border: `1px solid ${colors.border}`,
    }}>
      Tier {t} <span style={{ opacity: 0.7, fontSize: "0.7rem" }}>{labels[t as 1|2|3] || ""}</span>
    </span>
  );
}

export function ComplianceBadge({ label, icon, active = true }: { label: string; icon: string; active?: boolean }) {
  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "0.35rem",
    padding: "0.3rem 0.65rem", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 600,
    transition: "all 0.2s",
  };
  if (active) {
    return (
      <span style={{ ...base, background: "#D1FAE5", color: "#059669", border: "1px solid #A7F3D0" }}>
        {icon} {label}
      </span>
    );
  }
  return (
    <span style={{ ...base, background: "#F1F5F9", color: "#94A3B8", border: "1px solid #E2E8F0" }}>
      {icon} {label}
    </span>
  );
}
