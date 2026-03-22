"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";
import GlassCard from "@/components/ui/GlassCard";
import AccentButton from "@/components/ui/AccentButton";
import { TierBadge, GradeBadge } from "@/components/ui/StatusBadge";
import { Building2, Plus, ArrowLeft, Search } from "lucide-react";

const SECTOR_OPTIONS: SelectOption[] = [
  { value: "ENERGY", label: "Energy" }, { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "TRANSPORTATION", label: "Transportation" }, { value: "AGRICULTURE", label: "Agriculture" },
  { value: "SERVICES", label: "Services" },
];
const REVENUE_OPTIONS: SelectOption[] = [
  { value: "UNDER_10M", label: "Under $10M" }, { value: "10M_100M", label: "$10M - $100M" },
  { value: "100M_1B", label: "$100M - $1B" }, { value: "OVER_1B", label: "Over $1B" },
];
const QUARTER_OPTIONS: SelectOption[] = [
  { value: "2024-Q1", label: "2024 Q1" }, { value: "2024-Q2", label: "2024 Q2" },
  { value: "2024-Q3", label: "2024 Q3" }, { value: "2024-Q4", label: "2024 Q4" },
  { value: "2025-Q1", label: "2025 Q1" }, { value: "2025-Q2", label: "2025 Q2" },
  { value: "2025-Q3", label: "2025 Q3" }, { value: "2025-Q4", label: "2025 Q4" },
  { value: "2026-Q1", label: "2026 Q1" }, { value: "2026-Q2", label: "2026 Q2" },
];
const FRAMEWORK_OPTIONS: SelectOption[] = [
  { value: "PARIS_AGREEMENT", label: "Paris Agreement" }, { value: "EU_ETS", label: "EU ETS" },
  { value: "CBAM", label: "CBAM" }, { value: "CORSIA", label: "CORSIA" },
  { value: "VERRA", label: "Verra" }, { value: "GOLD_STANDARD", label: "Gold Standard" },
];

interface Props { onSuccess?: (companyId: string) => void; }

export default function CompanyRegistration({ onSuccess }: Props) {
  const { call, loading } = useApi();
  const { companies, refresh } = useCompanies();
  const [view, setView] = useState<"list" | "create">("list");
  const [filterAccountId, setFilterAccountId] = useState("");
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [sector, setSector] = useState("");
  const [revenue, setRevenue] = useState("");
  const [baseline, setBaseline] = useState("");
  const [quarter, setQuarter] = useState("");
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const toggleFramework = (fw: string) => setFrameworks(prev => prev.includes(fw) ? prev.filter(f => f !== fw) : [...prev, fw]);
  const filtered = filterAccountId ? companies.filter(c => (c.hederaAccountId || "").toLowerCase().includes(filterAccountId.toLowerCase())) : companies;

  const handleSubmit = async () => {
    setError(""); setResult(null);
    const res = await call("/api/companies", {
      method: "POST",
      body: { companyName: name, hederaAccountId: accountId, sector, revenueRange: revenue, baselineEmissions: Number(baseline), policyFrameworks: frameworks.length > 0 ? frameworks : undefined },
      txType: "COMPANY_REGISTRATION", txDescription: `Register company: ${name} (${quarter})`,
    });
    if (res.success && res.data) {
      const data = res.data as Record<string, unknown>;
      setResult(data); refresh();
      if (onSuccess && typeof data.id === "string") onSuccess(data.id);
    } else setError(res.error || "Registration failed");
  };

  const tierNum = (tier: string) => tier === "Tier_1" ? 1 : tier === "Tier_2" ? 2 : 3;

  return (
    <GlassCard glow hover={false}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h3 style={heading}><Building2 size={20} color="#14B8A6" /> Company Management</h3>
          <p style={subtext}>Register and manage companies on the Hedera network</p>
        </div>
        {view === "list" ? (
          <AccentButton onClick={() => { setView("create"); setResult(null); setError(""); }} icon={<Plus size={14} />}>Add New Company</AccentButton>
        ) : (
          <AccentButton variant="secondary" onClick={() => { setView("list"); setResult(null); setError(""); }} icon={<ArrowLeft size={14} />}>Back to List</AccentButton>
        )}
      </div>

      {view === "list" && (<>
        <div style={{ position: "relative", marginBottom: "0.75rem" }}>
          <Search size={14} color="#94A3B8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)} placeholder="Filter by Hedera Account ID (e.g. 0.0.12345)" style={{ ...searchInput, paddingLeft: "2.2rem" }} />
        </div>
        {filtered.length === 0 ? (
          <p style={emptyText}>{filterAccountId ? "No companies found for this Hedera ID." : "No companies registered yet."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filtered.map((c, i) => (
              <GlassCard key={c.id} delay={i * 0.05} padding="0.85rem 1rem" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0F172A" }}>{c.companyName}</span>
                    <span style={{ fontSize: "0.7rem", color: "#64748B", marginLeft: 8, fontFamily: "'Space Grotesk', monospace" }}>{c.hederaAccountId}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {c.emissionTier && <TierBadge tier={tierNum(c.emissionTier)} />}
                    {c.carbonScore && <GradeBadge grade={c.carbonScore} size="sm" />}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", fontSize: "0.7rem", color: "#64748B", marginTop: 4 }}>
                  <span>{(c.sector || "").replace(/_/g, " ")}</span>
                  {c.did && <span style={{ fontFamily: "'Space Grotesk', monospace", fontSize: "0.63rem" }}>{c.did.slice(0, 30)}...</span>}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </>)}

      {view === "create" && (<>
        <FormField label="Company Name" value={name} onChange={setName} placeholder="e.g. GreenTech Industries" required />
        <FormField label="Hedera Account ID" value={accountId} onChange={setAccountId} placeholder="e.g. 0.0.12345" required />
        <FormField label="Business Quarter" value={quarter} onChange={setQuarter} options={QUARTER_OPTIONS} required />
        <FormField label="Sector" value={sector} onChange={setSector} options={SECTOR_OPTIONS} required />
        <FormField label="Revenue Range" value={revenue} onChange={setRevenue} options={REVENUE_OPTIONS} required />
        <FormField label="Baseline Emissions (tCO2e)" value={baseline} onChange={setBaseline} type="number" placeholder="e.g. 25000" required />
        <div style={{ marginBottom: "0.85rem" }}>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, marginBottom: "0.4rem", color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
            Policy Frameworks (optional)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {FRAMEWORK_OPTIONS.map(fw => {
              const active = frameworks.includes(fw.value);
              return (
                <button key={fw.value} type="button" onClick={() => toggleFramework(fw.value)}
                  style={{ padding: "0.35rem 0.75rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 500,
                    border: `1px solid ${active ? "#A7F3D0" : "#E2E8F0"}`,
                    background: active ? "#D1FAE5" : "#F8FAFC",
                    color: active ? "#059669" : "#64748B", cursor: "pointer", transition: "all 0.2s" }}>
                  {active ? "OK " : ""}{fw.label}
                </button>
              );
            })}
          </div>
        </div>
        <AccentButton onClick={handleSubmit} fullWidth size="lg" disabled={loading || !name || !accountId || !sector || !revenue || !baseline || !quarter}>
          {loading ? "Registering..." : "Register Company"}
        </AccentButton>
        {error && <div style={errorBox}>{error}</div>}
        {result && (
          <div style={successBox}>
            <div style={{ fontWeight: 600, color: "#059669", marginBottom: 4 }}>Company Registered - Redirecting to Emissions...</div>
            <div style={{ color: "#475569", fontSize: "0.78rem" }}>ID: {result.id as string}</div>
            <div style={{ color: "#475569", fontSize: "0.78rem" }}>DID: {result.did as string}</div>
            <div style={{ color: "#475569", fontSize: "0.78rem" }}>Tier: {result.emissionTier as string}</div>
          </div>
        )}
      </>)}
    </GlassCard>
  );
}

const heading: React.CSSProperties = { fontSize: "1.15rem", fontWeight: 700, color: "#0F172A", margin: 0, fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: "0.5rem" };
const subtext: React.CSSProperties = { fontSize: "0.8rem", color: "#64748B", margin: "0.15rem 0 0" };
const searchInput: React.CSSProperties = { width: "100%", padding: "0.6rem 0.85rem", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: "0.85rem", color: "#0F172A", background: "#FFFFFF", outline: "none" };
const emptyText: React.CSSProperties = { fontSize: "0.82rem", color: "#64748B", textAlign: "center", padding: "2rem 0" };
const errorBox: React.CSSProperties = { marginTop: 12, padding: 12, background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, color: "#DC2626", fontSize: "0.8rem" };
const successBox: React.CSSProperties = { marginTop: 12, padding: 12, background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 10, fontSize: "0.8rem" };