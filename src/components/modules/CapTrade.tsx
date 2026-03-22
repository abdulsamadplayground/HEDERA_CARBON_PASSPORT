"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Plus, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import GlassCard from "@/components/ui/GlassCard";
import AccentButton from "@/components/ui/AccentButton";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";
import type { CSSProperties } from "react";

const PERIOD_OPTIONS: SelectOption[] = [
  { value: "2024", label: "2024" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
  { value: "2027", label: "2027" },
];

interface AllocationRecord {
  id: string;
  compliancePeriod: string;
  allocatedAmount: number;
  usedAmount: number;
  surplus: number;
  deficit: number;
  status: string;
  createdAt: string;
}

export default function CapTrade() {
  const { call, loading } = useApi();
  const { companies } = useCompanies();
  const [view, setView] = useState<"list" | "allocate">("list");
  const [companyId, setCompanyId] = useState("");
  const [compliancePeriod, setCompliancePeriod] = useState("");
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const companyOptions: SelectOption[] = companies.map((c) => ({
    value: c.id,
    label: `${c.companyName} (${c.emissionTier})`,
  }));

  const fetchAllocations = async (cId: string) => {
    if (!cId) { setAllocations([]); return; }
    setLoadingData(true);
    try {
      const res = await fetch(`/api/cap-trade/allocations/${cId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setAllocations(json.data);
      else setAllocations([]);
    } catch { setAllocations([]); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { if (companyId) fetchAllocations(companyId); }, [companyId]);

  const allocate = async () => {
    const res = await call("/api/cap-trade/allocate", {
      method: "POST", body: { companyId, compliancePeriod },
      txType: "CAL Allocation",
      txDescription: `Allocated CAL tokens for period ${compliancePeriod}`,
    });
    if (res.data) { setResult(res.data as Record<string, unknown>); fetchAllocations(companyId); }
  };

  const statusColor = (s: string) => {
    if (s === "COMPLIANT") return { bg: "rgba(16,185,129,0.1)", color: "#34D399", border: "rgba(16,185,129,0.25)" };
    if (s === "NON_COMPLIANT") return { bg: "rgba(239,68,68,0.1)", color: "#F87171", border: "rgba(239,68,68,0.25)" };
    return { bg: "rgba(14,165,233,0.1)", color: "#38BDF8", border: "rgba(14,165,233,0.25)" };
  };

  return (
    <GlassCard hover={false} glow>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={iconBox}><Scale size={18} color="#3B82F6" /></div>
          <div>
            <h3 style={heading}>Cap-and-Trade</h3>
            <p style={subtext}>Allocate CAL tokens by tier and track surplus/deficit</p>
          </div>
        </div>
        {view === "list" ? (
          <AccentButton size="sm" icon={<Plus size={14} />} onClick={() => { setView("allocate"); setResult(null); }}
            style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 4px 12px rgba(59,130,246,0.2)" }}>
            Allocate
          </AccentButton>
        ) : (
          <AccentButton variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => { setView("list"); setResult(null); }}>
            Back
          </AccentButton>
        )}
      </div>

      <FormField label="Company" value={companyId} onChange={setCompanyId} options={companyOptions} required />

      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            {loadingData && <p style={statusText}>Loading allocations...</p>}
            {!loadingData && companyId && allocations.length === 0 && <p style={statusText}>No allocations found for this company.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              {allocations.map((a, i) => {
                const sc = statusColor(a.status || "");
                return (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }} style={dataCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={cardTitle}>Period {a.compliancePeriod}</span>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, background: sc.bg, color: sc.color, padding: "0.15rem 0.5rem", borderRadius: 12, border: `1px solid ${sc.border}` }}>{a.status}</span>
                    </div>
                    <div style={cardRow}>
                      <span>Allocated: {(a.allocatedAmount ?? 0).toLocaleString()} CAL</span>
                      <span>Used: {(a.usedAmount ?? 0).toLocaleString()}</span>
                      {(a.surplus ?? 0) > 0 && <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 3 }}><TrendingUp size={12} />Surplus: {a.surplus}</span>}
                      {(a.deficit ?? 0) > 0 && <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 3 }}><TrendingDown size={12} />Deficit: {a.deficit}</span>}
                    </div>
                    <span style={cardDate}>{new Date(a.createdAt).toLocaleDateString()}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {view === "allocate" && (
          <motion.div key="allocate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <FormField label="Compliance Period" value={compliancePeriod} onChange={setCompliancePeriod} options={PERIOD_OPTIONS} required />
            <AccentButton fullWidth onClick={allocate} disabled={loading}
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 4px 12px rgba(59,130,246,0.2)", marginTop: "0.5rem" }}>
              {loading ? "Allocating..." : "Allocate CAL Tokens"}
            </AccentButton>
            {result && <pre style={resultBox}>{JSON.stringify(result, null, 2)}</pre>}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

const headerRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" };
const iconBox: CSSProperties = { width: 36, height: 36, borderRadius: 10, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const heading: CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "#0F172A", margin: 0, fontFamily: "'Space Grotesk', sans-serif" };
const subtext: CSSProperties = { fontSize: "0.78rem", color: "#64748B", margin: 0 };
const resultBox: CSSProperties = { marginTop: "1rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "0.75rem", fontSize: "0.75rem", color: "#475569", overflow: "auto", maxHeight: 200, fontFamily: "monospace" };
const dataCard: CSSProperties = { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "0.75rem 1rem" };
const cardTitle: CSSProperties = { fontWeight: 700, fontSize: "0.88rem", color: "#0F172A" };
const cardRow: CSSProperties = { display: "flex", gap: "1rem", fontSize: "0.75rem", color: "#64748B", marginTop: "0.35rem", flexWrap: "wrap" as const };
const cardDate: CSSProperties = { fontSize: "0.7rem", color: "#94A3B8", marginTop: "0.25rem", display: "block" };
const statusText: CSSProperties = { fontSize: "0.82rem", color: "#94A3B8", textAlign: "center", padding: "1rem 0" };
