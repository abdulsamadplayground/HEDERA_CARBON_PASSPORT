"use client";

import { useEffect, useState } from "react";
import { useTransactions, ToastEntry } from "@/context/TransactionContext";
import { ExternalLink, X, CheckCircle2, XCircle } from "lucide-react";

const TOAST_DURATION = 5000;

function Toast({ toast, onRemove }: { toast: ToastEntry; onRemove: () => void }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = toast.createdAt;
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(remaining);
      if (remaining <= 0) { onRemove(); return; }
      requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [toast.createdAt, onRemove]);

  const isSuc = toast.status === "success";
  const barColor = isSuc
    ? `rgba(16, 185, 129, ${0.4 + 0.6 * (progress / 100)})`
    : `rgba(239, 68, 68, ${0.4 + 0.6 * (progress / 100)})`;

  return (
    <div style={toastCard}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "14px 0 0 14px", background: isSuc ? "#10B981" : "#EF4444" }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
        <span style={{ flexShrink: 0, marginTop: 2 }}>
          {isSuc ? <CheckCircle2 size={16} color="#059669" /> : <XCircle size={16} color="#DC2626" />}
        </span>
        <span style={{ fontSize: "0.78rem", color: "#0F172A", fontWeight: 500, flex: 1, lineHeight: 1.4 }}>
          {toast.message.replace(/^[✅❌]\s*/, "")}
        </span>
        {toast.hashscanUrl && (
          <a href={toast.hashscanUrl} target="_blank" rel="noopener noreferrer" style={hsLink} onClick={(e) => e.stopPropagation()}>
            <ExternalLink size={12} /> HashScan
          </a>
        )}
        <button onClick={onRemove} style={closeBtn} aria-label="Dismiss notification">
          <X size={14} />
        </button>
      </div>
      <div style={barTrack}>
        <div style={{ ...barFill, width: `${progress}%`, background: barColor }} />
      </div>
    </div>
  );
}

export default function ToastNotifications() {
  const { toasts, removeToast } = useTransactions();
  if (toasts.length === 0) return null;

  return (
    <div style={container}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
      <style>{`@keyframes toastSlideIn{from{opacity:0;transform:translateX(100%) scale(0.95)}to{opacity:1;transform:translateX(0) scale(1)}}`}</style>
    </div>
  );
}

const container: React.CSSProperties = {
  position: "fixed", top: 16, right: 16, zIndex: 9999,
  display: "flex", flexDirection: "column", gap: "0.5rem",
  maxWidth: 400, width: "100%", pointerEvents: "none",
};
const toastCard: React.CSSProperties = {
  position: "relative",
  background: "rgba(255, 255, 255, 0.92)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: 14,
  padding: "0.75rem 0.85rem 0.75rem 1rem",
  border: "1px solid #E2E8F0",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
  animation: "toastSlideIn 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",
  pointerEvents: "auto",
  overflow: "hidden",
};
const barTrack: React.CSSProperties = {
  height: 2, background: "#F1F5F9", borderRadius: 2, marginTop: "0.6rem", overflow: "hidden",
};
const barFill: React.CSSProperties = {
  height: "100%", borderRadius: 2, transition: "background 0.5s",
};
const closeBtn: React.CSSProperties = {
  background: "none", border: "none", color: "#94A3B8",
  cursor: "pointer", padding: 2, lineHeight: 1, flexShrink: 0,
  display: "flex", alignItems: "center",
};
const hsLink: React.CSSProperties = {
  fontSize: "0.68rem", fontWeight: 600, color: "#059669", textDecoration: "none",
  whiteSpace: "nowrap", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.25rem",
};
