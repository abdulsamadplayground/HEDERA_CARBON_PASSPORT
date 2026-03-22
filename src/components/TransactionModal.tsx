"use client";

import { useTransactions } from "@/context/TransactionContext";

export default function TransactionModal() {
  const { modal, hideModal } = useTransactions();

  if (!modal || !modal.visible) return null;

  const { entry } = modal;

  return (
    <div style={overlay} onClick={hideModal}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={iconRow}>
          <span style={checkIcon}>✓</span>
        </div>
        <h3 style={title}>Transaction Successful</h3>
        <p style={desc}>{entry.description}</p>
        <div style={details}>
          <div style={detailRow}>
            <span style={detailLabel}>Type</span>
            <span style={detailValue}>{entry.type}</span>
          </div>
          <div style={detailRow}>
            <span style={detailLabel}>Time</span>
            <span style={detailValue}>{new Date(entry.timestamp).toLocaleString()}</span>
          </div>
          {entry.transactionId && (
            <div style={detailRow}>
              <span style={detailLabel}>Transaction ID</span>
              <span style={{ ...detailValue, fontSize: "0.72rem", fontFamily: "monospace" }}>
                {entry.transactionId}
              </span>
            </div>
          )}
        </div>
        {entry.hashscanUrl && (
          <a
            href={entry.hashscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={hashscanBtn}
          >
            🔍 Verify on HashScan
          </a>
        )}
        <button style={closeBtn} onClick={hideModal}>Close</button>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)",
};
const card: React.CSSProperties = {
  background: "#fff", borderRadius: 16, padding: "2rem", maxWidth: 440, width: "90%",
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)", textAlign: "center",
};
const iconRow: React.CSSProperties = { marginBottom: "0.75rem" };
const checkIcon: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 48, height: 48, borderRadius: "50%", background: "#d1fae5", color: "#059669",
  fontSize: "1.5rem", fontWeight: 700,
};
const title: React.CSSProperties = { fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.25rem" };
const desc: React.CSSProperties = { fontSize: "0.85rem", color: "#64748b", margin: "0 0 1rem" };
const details: React.CSSProperties = {
  background: "#f8fafc", borderRadius: 10, padding: "0.75rem", marginBottom: "1rem",
  textAlign: "left",
};
const detailRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "0.35rem 0", borderBottom: "1px solid #f1f5f9",
};
const detailLabel: React.CSSProperties = { fontSize: "0.78rem", color: "#94a3b8", fontWeight: 500 };
const detailValue: React.CSSProperties = { fontSize: "0.82rem", color: "#1e293b", fontWeight: 600 };
const hashscanBtn: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.65rem", borderRadius: 10,
  background: "#3b82f6", color: "#fff", fontWeight: 600, fontSize: "0.88rem",
  textDecoration: "none", marginBottom: "0.5rem", textAlign: "center",
};
const closeBtn: React.CSSProperties = {
  width: "100%", padding: "0.55rem", borderRadius: 10, background: "#f1f5f9",
  color: "#64748b", fontWeight: 600, fontSize: "0.85rem", border: "none", cursor: "pointer",
};
