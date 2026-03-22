"use client";

import { useTransactions } from "@/context/TransactionContext";
import { ExternalLink, Trash2, ScrollText } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import AccentButton from "@/components/ui/AccentButton";

export default function ActivityLog() {
  const { transactions, clearTransactions } = useTransactions();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0F172A", margin: 0, fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ScrollText size={20} color="#14B8A6" /> Activity Log
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#64748B", margin: "0.15rem 0 0" }}>
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        {transactions.length > 0 && (
          <AccentButton variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={clearTransactions}>
            Clear All
          </AccentButton>
        )}
      </div>

      {transactions.length === 0 ? (
        <GlassCard hover={false}>
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem", opacity: 0.5 }}>📭</div>
            <p style={{ color: "#64748B", fontSize: "0.88rem" }}>No transactions yet. Perform an action to see it logged here.</p>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {transactions.map((tx, i) => (
            <GlassCard key={tx.id} delay={i * 0.04} padding="0.85rem 1rem" hover={false}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <span style={{ ...statusDot, background: tx.status === "success" ? "#10B981" : "#EF4444", boxShadow: tx.status === "success" ? "0 0 8px rgba(16,185,129,0.3)" : "0 0 8px rgba(239,68,68,0.3)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0F172A" }}>{tx.type}</span>
                <span style={{ fontSize: "0.7rem", color: "#94A3B8", marginLeft: "auto" }}>
                  {new Date(tx.timestamp).toLocaleString()}
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#475569", margin: "0 0 0.4rem" }}>{tx.description}</p>
              {tx.transactionId && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={txIdBadge}>{tx.transactionId}</span>
                  <a href={tx.hashscanUrl} target="_blank" rel="noopener noreferrer" style={verifyBtn}>
                    <ExternalLink size={11} /> Verify on HashScan
                  </a>
                </div>
              )}
              {tx.errorMessage && (
                <p style={{ fontSize: "0.73rem", color: "#DC2626", margin: "0.3rem 0 0", fontStyle: "italic" }}>
                  {tx.errorMessage}
                </p>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

const statusDot: React.CSSProperties = { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 };
const txIdBadge: React.CSSProperties = {
  fontSize: "0.66rem", fontFamily: "'Space Grotesk', monospace", color: "#475569",
  background: "#F1F5F9", padding: "0.15rem 0.5rem", borderRadius: 6,
  border: "1px solid #E2E8F0", overflow: "hidden", textOverflow: "ellipsis",
  whiteSpace: "nowrap", maxWidth: 280,
};
const verifyBtn: React.CSSProperties = {
  fontSize: "0.7rem", fontWeight: 600, color: "#FFFFFF",
  background: "linear-gradient(135deg, #14B8A6, #10B981)", padding: "0.2rem 0.55rem",
  borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap",
  display: "inline-flex", alignItems: "center", gap: "0.25rem",
};
