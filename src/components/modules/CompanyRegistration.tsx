"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";
import GlassCard from "@/components/ui/GlassCard";
import AccentButton from "@/components/ui/AccentButton";
import { TierBadge, GradeBadge } from "@/components/ui/StatusBadge";
import { Building2, Plus, ArrowLeft, Search, Eye, ShieldCheck, ExternalLink } from "lucide-react";

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
const BADGE_CRITERIA = [
  { id: "PARIS_AGREEMENT", label: "Paris Agreement", icon: "🌍", tierReq: ["Tier_2", "Tier_3"] },
  { id: "EU_ETS", label: "EU ETS", icon: "🇪🇺", tierReq: ["Tier_2", "Tier_3"] },
  { id: "NET_ZERO", label: "Net Zero", icon: "🎯", tierReq: ["Tier_3"] },
  { id: "LOW_CARBON", label: "Low Carbon", icon: "🌱", tierReq: ["Tier_3"] },
  { id: "GOLD_STANDARD", label: "Gold Standard", icon: "⭐", tierReq: ["Tier_3"] },
];

interface EmRec { totalTCO2e: number; scope1TCO2e: number; scope2TCO2e: number; scope3TCO2e: number; reportingPeriod: string; }
interface Passport { id: string; cpassSerial: number; tokenId: string; passportType: string; createdAt: string; metadataJson?: string; }
interface Props { onSuccess?: (companyId: string) => void; }

export default function CompanyRegistration({ onSuccess }: Props) {
  const { call, loading } = useApi();
  const { companies, refresh } = useCompanies();
  const [view, setView] = useState<"list" | "create" | "detail" | "passport">("list");
  const [filterAccountId, setFilterAccountId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [sector, setSector] = useState("");
  const [revenue, setRevenue] = useState("");
  const [baseline, setBaseline] = useState("");
  const [quarter, setQuarter] = useState("");
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [emissions, setEmissions] = useState<EmRec | null>(null);
  const [passports, setPassports] = useState<Passport[]>([]);
  const [ldDetail, setLdDetail] = useState(false);

  const toggleFramework = (fw: string) => setFrameworks(prev => prev.includes(fw) ? prev.filter(f => f !== fw) : [...prev, fw]);
  const filtered = filterAccountId ? companies.filter(c => (c.hederaAccountId || "").toLowerCase().includes(filterAccountId.toLowerCase())) : companies;
  const selectedCompany = companies.find(c => c.id === selectedId);

  const fetchDetail = async (id: string) => {
    setLdDetail(true);
    try {
      const [eRes, pRes] = await Promise.all([fetch(`/api/emissions/${id}`), fetch(`/api/passports?companyId=${id}`)]);
      const [eJ, pJ] = await Promise.all([eRes.json(), pRes.json()]);
      setEmissions(eJ.success && Array.isArray(eJ.data) && eJ.data.length > 0 ? eJ.data[0] : null);
      setPassports(pJ.success && Array.isArray(pJ.data) ? pJ.data : []);
    } catch { setEmissions(null); setPassports([]); }
    finally { setLdDetail(false); }
  };

  const openDetail = (id: string) => { setSelectedId(id); setView("detail"); fetchDetail(id); };

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
  const parseMeta = (json?: string) => { try { return json ? JSON.parse(json) : null; } catch { return null; } };
  const earnedBadges = BADGE_CRITERIA.filter(b => b.tierReq.includes(selectedCompany?.emissionTier || ""));

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
          <input value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)} placeholder="Filter by Hedera Account ID" style={{ ...searchInput, paddingLeft: "2.2rem" }} />
        </div>
        {filtered.length === 0 ? (
          <p style={emptyText}>{filterAccountId ? "No companies found." : "No companies registered yet."}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
            {filtered.map((c) => (
              <div key={c.id} onClick={() => openDetail(c.id)} style={gridCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0F172A" }}>{c.companyName}</span>
                  <Eye size={14} color="#94A3B8" />
                </div>
                <span style={{ fontSize: "0.7rem", color: "#64748B", fontFamily: "'Space Grotesk', monospace", display: "block", marginBottom: 6 }}>{c.hederaAccountId}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  {c.emissionTier && <TierBadge tier={tierNum(c.emissionTier)} />}
                  {c.carbonScore && <GradeBadge grade={c.carbonScore} size="sm" />}
                </div>
                <span style={{ fontSize: "0.7rem", color: "#64748B" }}>{(c.sector || "").replace(/_/g, " ")}</span>
              </div>
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
            <div style={{ fontWeight: 600, color: "#059669", marginBottom: 4 }}>Company Registered Successfully</div>
            <div style={{ color: "#475569", fontSize: "0.78rem" }}>ID: {result.id as string}</div>
            <div style={{ color: "#475569", fontSize: "0.78rem" }}>DID: {result.did as string}</div>
            <div style={{ color: "#475569", fontSize: "0.78rem" }}>Tier: {result.emissionTier as string}</div>
          </div>
        )}
      </>)}

      {view === "detail" && selectedCompany && (<>
        {ldDetail ? <p style={emptyText}>Loading company details...</p> : (<>
          <GlassCard hover={false} padding="1rem" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0F172A", marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>{selectedCompany.companyName}</div>
            <div style={summaryGrid}>
              <div><span style={sLabel}>Hedera ID</span><span style={sVal}>{selectedCompany.hederaAccountId}</span></div>
              <div><span style={sLabel}>Sector</span><span style={sVal}>{(selectedCompany.sector || "").replace(/_/g, " ")}</span></div>
              <div><span style={sLabel}>Tier</span><span style={sVal}>{(selectedCompany.emissionTier || "").replace("_", " ")}</span></div>
              <div><span style={sLabel}>Carbon Score</span><span style={sVal}>{selectedCompany.carbonScore || "N/A"}</span></div>
              <div><span style={sLabel}>Revenue</span><span style={sVal}>{(selectedCompany.revenueRange || "N/A").replace(/_/g, " ")}</span></div>
              <div><span style={sLabel}>DID</span><span style={{ ...sVal, fontSize: "0.65rem" }}>{selectedCompany.did ? selectedCompany.did.slice(0, 35) + "..." : "N/A"}</span></div>
            </div>
          </GlassCard>
          {emissions && (
            <GlassCard hover={false} padding="1rem" style={{ background: "#F8FAFC", border: "1px solid #bfdbfe", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Latest Emissions ({emissions.reportingPeriod})</div>
              <div style={summaryGrid}>
                <div><span style={sLabel}>Total</span><span style={sVal}>{(emissions.totalTCO2e ?? 0).toLocaleString()} tCO2e</span></div>
                <div><span style={sLabel}>Scope 1</span><span style={sVal}>{(emissions.scope1TCO2e ?? 0).toLocaleString()}</span></div>
                <div><span style={sLabel}>Scope 2</span><span style={sVal}>{(emissions.scope2TCO2e ?? 0).toLocaleString()}</span></div>
                <div><span style={sLabel}>Scope 3</span><span style={sVal}>{(emissions.scope3TCO2e ?? 0).toLocaleString()}</span></div>
              </div>
            </GlassCard>
          )}
          {earnedBadges.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.75rem" }}>
              {earnedBadges.map(b => (
                <span key={b.id} style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: 8, background: "#ecfdf5", color: "#065f46", border: "1px solid #bbf7d0" }}>{b.icon} {b.label}</span>
              ))}
            </div>
          )}
          {passports.length > 0 && (
            <AccentButton onClick={() => setView("passport")} icon={<ShieldCheck size={14} />} style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", marginBottom: "0.5rem" }}>
              View Passport ({passports.length})
            </AccentButton>
          )}
        </>)}
      </>)}

      {view === "passport" && selectedCompany && (<>
        <AccentButton variant="secondary" size="sm" onClick={() => setView("detail")} icon={<ArrowLeft size={14} />} style={{ marginBottom: "0.75rem" }}>Back to Detail</AccentButton>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
          {passports.map(p => {
            const meta = parseMeta(p.metadataJson);
            const tier = meta?.emission_tier || "";
            const badges = BADGE_CRITERIA.filter(b => b.tierReq.includes(tier));
            return (
              <GlassCard key={p.id} hover={false} padding="1rem" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0F172A" }}>CPASS #{p.cpassSerial}</span>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#8B5CF6", background: "rgba(139,92,246,0.12)", padding: "2px 8px", borderRadius: 8 }}>{(p.passportType || "company").toUpperCase()}</span>
                </div>
                {meta && (<>
                  <div style={summaryGrid}>
                    <div><span style={sLabel}>Carbon Score</span><span style={sVal}>{meta.carbon_score || "N/A"}</span></div>
                    <div><span style={sLabel}>Emission Tier</span><span style={sVal}>{(meta.emission_tier || "").replace("_", " ")}</span></div>
                    <div><span style={sLabel}>Total Footprint</span><span style={sVal}>{(meta.carbon_footprint_total ?? 0).toLocaleString()} tCO2e</span></div>
                    <div><span style={sLabel}>Scope 1</span><span style={sVal}>{(meta.scope1_emissions ?? 0).toLocaleString()}</span></div>
                    <div><span style={sLabel}>Scope 2</span><span style={sVal}>{(meta.scope2_emissions ?? 0).toLocaleString()}</span></div>
                    <div><span style={sLabel}>Scope 3</span><span style={sVal}>{(meta.scope3_emissions ?? 0).toLocaleString()}</span></div>
                  </div>
                  {meta.policy_frameworks && Array.isArray(meta.policy_frameworks) && meta.policy_frameworks.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <span style={sLabel}>Policy Frameworks</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {meta.policy_frameworks.map((fw: string) => <span key={fw} style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: 6, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>{fw.replace(/_/g, " ")}</span>)}
                      </div>
                    </div>
                  )}
                </>)}
                {badges.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {badges.map(b => <span key={b.id} style={{ fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: "#ecfdf5", color: "#065f46", border: "1px solid #bbf7d0" }}>{b.icon} {b.label}</span>)}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                  {p.tokenId && <a href={`https://hashscan.io/testnet/token/${p.tokenId}/${p.cpassSerial}`} target="_blank" rel="noopener noreferrer" style={verifyBtn}><ExternalLink size={11} /> Verify NFT</a>}
                </div>
              </GlassCard>
            );
          })}
        </div>
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
const gridCard: React.CSSProperties = { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "0.85rem 1rem", cursor: "pointer", transition: "all 0.2s" };
const summaryGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem 1rem" };
const sLabel: React.CSSProperties = { fontSize: "0.68rem", color: "#64748B", display: "block", textTransform: "uppercase" as const, letterSpacing: "0.04em" };
const sVal: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, color: "#0F172A", display: "block" };
const verifyBtn: React.CSSProperties = { fontSize: "0.7rem", fontWeight: 600, color: "#0F172A", background: "linear-gradient(135deg, #14B8A6, #10B981)", padding: "0.2rem 0.55rem", borderRadius: 6, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" };
