"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";

const TIER_OPTIONS: SelectOption[] = [
  { value: "Tier_1", label: "Tier 1 (≥100k tCO2e)" },
  { value: "Tier_2", label: "Tier 2 (10k–100k tCO2e)" },
  { value: "Tier_3", label: "Tier 3 (<10k tCO2e)" },
];

const BADGE_CRITERIA = [
  { id: "PARIS_AGREEMENT", label: "🌍 Paris Agreement", desc: "Aligned with Paris Agreement targets", tierReq: ["Tier_2", "Tier_3"] },
  { id: "EU_ETS", label: "🇪🇺 EU ETS Compliant", desc: "Meets EU Emissions Trading System standards", tierReq: ["Tier_2", "Tier_3"] },
  { id: "NET_ZERO", label: "🎯 Net Zero Pathway", desc: "On track for net-zero emissions", tierReq: ["Tier_3"] },
  { id: "LOW_CARBON", label: "🌱 Low Carbon Leader", desc: "Below sector average emissions", tierReq: ["Tier_3"] },
  { id: "GOLD_STANDARD", label: "⭐ Gold Standard", desc: "Verified by Gold Standard", tierReq: ["Tier_3"] },
];

interface Passport {
  id: string; cpassSerial: number; tokenId: string; passportType: string;
  batchId?: string; itemId?: string; createdAt: string; metadataJson?: string;
}
interface EmRec { totalTCO2e: number; scope1TCO2e: number; scope2TCO2e: number; scope3TCO2e: number; reportingPeriod: string; }
interface Props { preselectedCompanyId?: string; }

export default function PassportMinting({ preselectedCompanyId }: Props) {
  const { call, loading } = useApi();
  const { companies } = useCompanies();
  const [view, setView] = useState<"list" | "mint">("list");
  const [companyId, setCompanyId] = useState(preselectedCompanyId || "");
  const [emissionTier, setEmissionTier] = useState("");
  const [baselineEmissions, setBaselineEmissions] = useState("");
  const [passports, setPassports] = useState<Passport[]>([]);
  const [emissions, setEmissions] = useState<EmRec | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => { if (preselectedCompanyId && !companyId) setCompanyId(preselectedCompanyId); }, [preselectedCompanyId]);

  const companyOptions: SelectOption[] = companies.map(c => ({ value: c.id, label: `${c.companyName} (${c.hederaAccountId})` }));
  const selectedCompany = companies.find(c => c.id === companyId);

  const fetchData = async (cId: string) => {
    if (!cId) { setPassports([]); setEmissions(null); return; }
    setLoadingData(true);
    try {
      const [pRes, eRes] = await Promise.all([
        fetch(`/api/passports?companyId=${cId}`),
        fetch(`/api/emissions/${cId}`),
      ]);
      const pJson = await pRes.json();
      const eJson = await eRes.json();
      if (pJson.success && Array.isArray(pJson.data)) setPassports(pJson.data); else setPassports([]);
      if (eJson.success && Array.isArray(eJson.data) && eJson.data.length > 0) setEmissions(eJson.data[0]); else setEmissions(null);
    } catch { setPassports([]); setEmissions(null); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { if (companyId) fetchData(companyId); }, [companyId]);

  // Determine earned badges based on tier and frameworks
  const earnedBadges = BADGE_CRITERIA.filter(b => {
    const tier = selectedCompany?.emissionTier || emissionTier;
    return b.tierReq.includes(tier);
  });

  const mintPassport = async () => {
    const tier = emissionTier || selectedCompany?.emissionTier || "Tier_1";
    const baseline = Number(baselineEmissions) || selectedCompany?.carbonScore ? Number(baselineEmissions) : 0;
    const res = await call("/api/passports", {
      method: "POST",
      body: { companyId, emissionTier: tier, baselineEmissions: baseline },
      txType: "Passport Mint (CPASS)",
      txDescription: `Minted carbon passport for ${selectedCompany?.companyName || "company"}`,
    });
    if (res.data) { setResult(res.data); fetchData(companyId); }
  };

  const parseMetadata = (json?: string) => {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div><h3 style={heading}>🛂 Carbon Passports</h3><p style={subtext}>Step 3: Mint CPASS NFTs with emissions data and compliance badges</p></div>
        {view === "list" ? <button onClick={() => { setView("mint"); setResult(null); }} style={createBtn}>+ Mint Passport</button>
          : <button onClick={() => { setView("list"); setResult(null); }} style={backBtn}>← Back</button>}
      </div>
      <FormField label="Company" value={companyId} onChange={setCompanyId} options={companyOptions} required />

      {/* LIST VIEW — existing passports */}
      {view === "list" && (<>
        {loadingData && <p style={loadingText}>Loading passports...</p>}
        {!loadingData && companyId && passports.length === 0 && <p style={emptyText}>No passports found. Mint your first one.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
        {passports.map((p, i) => {
          const meta = parseMetadata(p.metadataJson);
          const tier = meta?.emission_tier || "";
          const badges = BADGE_CRITERIA.filter(b => b.tierReq.includes(tier));
          return (
            <div key={p.id} style={{ ...dataCard, animationDelay: `${i * 0.08}s` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={cardTitle}>🏢 CPASS #{p.cpassSerial}</span>
                <span style={cardBadge}>{(p.passportType || "company").toUpperCase()}</span>
              </div>
              {meta && (
                <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.35rem" }}>
                  <div>Score: {meta.carbon_score || "N/A"} · Tier: {(meta.emission_tier || "").replace("_", " ")}</div>
                  <div>Footprint: {(meta.carbon_footprint_total ?? 0).toLocaleString()} tCO₂e</div>
                </div>
              )}
              {badges.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {badges.map(b => <span key={b.id} style={badgeChip}>{b.label}</span>)}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
                <span style={cardDate}>{new Date(p.createdAt).toLocaleDateString()}</span>
                {p.tokenId && (
                  <a href={`https://hashscan.io/testnet/token/${p.tokenId}/${p.cpassSerial}`} target="_blank" rel="noopener noreferrer" style={verifyBtn}>
                    🔍 Verify
                  </a>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </>)}

      {/* MINT VIEW — summary + form */}
      {view === "mint" && companyId && (<>
        {/* Company & Emissions Summary */}
        {selectedCompany && (
          <div style={summaryBox}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>📋 Company Summary</div>
            <div style={summaryGrid}>
              <div><span style={summaryLabel}>Name</span><span style={summaryVal}>{selectedCompany.companyName}</span></div>
              <div><span style={summaryLabel}>Hedera ID</span><span style={summaryVal}>{selectedCompany.hederaAccountId}</span></div>
              <div><span style={summaryLabel}>Sector</span><span style={summaryVal}>{(selectedCompany.sector || "").replace(/_/g, " ")}</span></div>
              <div><span style={summaryLabel}>Current Tier</span><span style={summaryVal}>{(selectedCompany.emissionTier || "").replace("_", " ")}</span></div>
              <div><span style={summaryLabel}>Carbon Score</span><span style={summaryVal}>{selectedCompany.carbonScore || "N/A"}</span></div>
              <div><span style={summaryLabel}>DID</span><span style={{ ...summaryVal, fontSize: "0.65rem" }}>{selectedCompany.did || "N/A"}</span></div>
            </div>
          </div>
        )}
        {emissions && (
          <div style={{ ...summaryBox, borderColor: "#bfdbfe" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>📊 Latest Emissions ({emissions.reportingPeriod})</div>
            <div style={summaryGrid}>
              <div><span style={summaryLabel}>Total</span><span style={summaryVal}>{(emissions.totalTCO2e ?? 0).toLocaleString()} tCO₂e</span></div>
              <div><span style={summaryLabel}>Scope 1</span><span style={summaryVal}>{(emissions.scope1TCO2e ?? 0).toLocaleString()}</span></div>
              <div><span style={summaryLabel}>Scope 2</span><span style={summaryVal}>{(emissions.scope2TCO2e ?? 0).toLocaleString()}</span></div>
              <div><span style={summaryLabel}>Scope 3</span><span style={summaryVal}>{(emissions.scope3TCO2e ?? 0).toLocaleString()}</span></div>
            </div>
          </div>
        )}
        {/* Earned Badges Preview */}
        {earnedBadges.length > 0 && (
          <div style={{ ...summaryBox, borderColor: "#bbf7d0" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>🏅 Badges to be Attached</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {earnedBadges.map(b => (
                <div key={b.id} style={badgeCard}>
                  <span style={{ fontSize: "0.82rem" }}>{b.label}</span>
                  <span style={{ fontSize: "0.68rem", color: "#64748b" }}>{b.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <FormField label="Emission Tier" value={emissionTier || selectedCompany?.emissionTier || ""} onChange={setEmissionTier} options={TIER_OPTIONS} required />
        <FormField label="Baseline Emissions (tCO2e)" value={baselineEmissions} onChange={setBaselineEmissions} type="number" placeholder="e.g. 50000" required />
        <button onClick={mintPassport} disabled={loading} style={submitBtn}>{loading ? "Minting..." : "Mint Carbon Passport NFT"}</button>
        {result && <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 10, fontSize: "0.82rem", color: "#059669", fontWeight: 600 }}>Passport minted successfully. Check the Activity Log for HashScan verification link.</div>}
      </>)}
      <style>{`@keyframes fadeSlideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: "1.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" };
const heading: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "#1e293b", margin: 0 };
const subtext: React.CSSProperties = { fontSize: "0.82rem", color: "#64748b", margin: 0 };
const submitBtn: React.CSSProperties = { width: "100%", padding: "0.65rem", borderRadius: 10, background: "#8b5cf6", color: "#fff", fontWeight: 600, fontSize: "0.88rem", marginTop: "0.5rem", border: "none", cursor: "pointer" };
const resultBox: React.CSSProperties = { marginTop: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", fontSize: "0.75rem", color: "#475569", overflow: "auto", maxHeight: 200, fontFamily: "monospace" };
const createBtn: React.CSSProperties = { padding: "0.4rem 0.85rem", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, background: "#8b5cf6", color: "#fff", border: "none", cursor: "pointer" };
const backBtn: React.CSSProperties = { padding: "0.4rem 0.85rem", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", cursor: "pointer" };
const dataCard: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.5rem", animation: "fadeSlideIn 0.35s ease both" };
const cardTitle: React.CSSProperties = { fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" };
const cardBadge: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 700, color: "#8b5cf6", background: "#f5f3ff", padding: "0.15rem 0.5rem", borderRadius: 12 };
const cardDate: React.CSSProperties = { fontSize: "0.7rem", color: "#94a3b8" };
const verifyBtn: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 600, color: "#fff", background: "#3b82f6", padding: "0.25rem 0.6rem", borderRadius: 8, textDecoration: "none", border: "none" };
const badgeChip: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 500, padding: "2px 8px", borderRadius: 8, background: "#ecfdf5", color: "#065f46", border: "1px solid #bbf7d0" };
const badgeCard: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 2, padding: "0.4rem 0.6rem", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 8 };
const summaryBox: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.75rem" };
const summaryGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem 1rem" };
const summaryLabel: React.CSSProperties = { fontSize: "0.7rem", color: "#94a3b8", display: "block" };
const summaryVal: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, color: "#1e293b", display: "block" };
const loadingText: React.CSSProperties = { fontSize: "0.82rem", color: "#94a3b8", textAlign: "center", padding: "1rem 0" };
const emptyText: React.CSSProperties = { fontSize: "0.82rem", color: "#94a3b8", textAlign: "center", padding: "1rem 0" };
