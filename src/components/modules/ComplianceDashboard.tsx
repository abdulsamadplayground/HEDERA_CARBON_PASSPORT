"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";
import GlassCard from "@/components/ui/GlassCard";
import AccentButton from "@/components/ui/AccentButton";
import { ComplianceBadge } from "@/components/ui/StatusBadge";
import { ShieldCheck, ArrowLeft, FileCheck, Microscope, Stamp, ExternalLink } from "lucide-react";

const CLAIM_TYPES: SelectOption[] = [
  { value: "LOW_CARBON", label: "Low Carbon" }, { value: "CARBON_NEUTRAL", label: "Carbon Neutral" },
  { value: "NET_ZERO", label: "Net Zero" }, { value: "RENEWABLE_ENERGY", label: "Renewable Energy" },
];
const TIER_OPTIONS: SelectOption[] = [
  { value: "Tier_1", label: "Tier 1 (>=100k tCO2e)" }, { value: "Tier_2", label: "Tier 2 (10k-100k tCO2e)" }, { value: "Tier_3", label: "Tier 3 (<10k tCO2e)" },
];
const METHODOLOGY_OPTIONS: SelectOption[] = [
  { value: "ISO 14067:2018", label: "ISO 14067:2018" }, { value: "GHG Protocol", label: "GHG Protocol" }, { value: "PAS 2050", label: "PAS 2050" },
];
const BADGE_CRITERIA = [
  { id: "PARIS_AGREEMENT", label: "Paris Agreement", icon: "🌍", tierReq: ["Tier_2", "Tier_3"] },
  { id: "EU_ETS", label: "EU ETS", icon: "🇪🇺", tierReq: ["Tier_2", "Tier_3"] },
  { id: "NET_ZERO", label: "Net Zero", icon: "🎯", tierReq: ["Tier_3"] },
  { id: "LOW_CARBON", label: "Low Carbon", icon: "🌱", tierReq: ["Tier_3"] },
  { id: "GOLD_STANDARD", label: "Gold Standard", icon: "⭐", tierReq: ["Tier_3"] },
];

interface Claim { id: string; claimType: string; status: string; createdAt: string; attestedAt?: string; }
interface Passport { id: string; cpassSerial: number; tokenId: string; passportType: string; createdAt: string; metadataJson?: string; }
interface EmRec { totalTCO2e: number; scope1TCO2e: number; scope2TCO2e: number; scope3TCO2e: number; reportingPeriod: string; }
interface GuardianSub { id: string; productOrBatchId: string; status: string; methodologyRef: string; createdAt: string; verifiedEmissions?: number; verificationMode?: string; credentialHash?: string; }
interface GuardianStatusInfo { connected: boolean; mode: "GUARDIAN" | "LOCAL"; url?: string; policyId?: string; policyName?: string; policyStatus?: string; policyTopicId?: string; blockTags?: string[]; error?: string; }
interface Props { preselectedCompanyId?: string; }
type Section = "overview" | "claim" | "guardian" | "mint";

export default function ComplianceDashboard({ preselectedCompanyId }: Props) {
  const { call, loading } = useApi();
  const { companies } = useCompanies();
  const [cid, setCid] = useState(preselectedCompanyId || "");
  const [section, setSection] = useState<Section>("overview");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [passports, setPassports] = useState<Passport[]>([]);
  const [emissions, setEmissions] = useState<EmRec | null>(null);
  const [guardianSubs, setGuardianSubs] = useState<GuardianSub[]>([]);
  const [ld, setLd] = useState(false);
  const [claimType, setClaimType] = useState(""); const [evidenceRefs, setEvidenceRefs] = useState("");
  const [productId, setProductId] = useState(""); const [methodology, setMethodology] = useState("");
  const [emissionTier, setEmissionTier] = useState(""); const [baselineEm, setBaselineEm] = useState("");
  const [mintResult, setMintResult] = useState<unknown>(null);
  const [guardianStatus, setGuardianStatus] = useState<GuardianStatusInfo | null>(null);

  const co: SelectOption[] = companies.map(c => ({ value: c.id, label: `${c.companyName} (${c.hederaAccountId})` }));
  const selectedCompany = companies.find(c => c.id === cid);

  useEffect(() => { if (preselectedCompanyId && !cid) setCid(preselectedCompanyId); }, [preselectedCompanyId]);

  useEffect(() => {
    fetch("/api/guardian/status")
      .then((r) => r.json())
      .then((j) => { if (j.success) setGuardianStatus(j.data); })
      .catch(() => setGuardianStatus({ connected: false, mode: "LOCAL" }));
  }, []);

  const fetchAll = async (id: string) => {
    if (!id) { setClaims([]); setPassports([]); setEmissions(null); setGuardianSubs([]); return; }
    setLd(true);
    try {
      const [clRes, pRes, eRes, gRes] = await Promise.all([
        fetch(`/api/claims/company/${id}`), fetch(`/api/passports?companyId=${id}`),
        fetch(`/api/emissions/${id}`), fetch(`/api/guardian/credentials/${id}`),
      ]);
      const [clJ, pJ, eJ, gJ] = await Promise.all([clRes.json(), pRes.json(), eRes.json(), gRes.json()]);
      setClaims(clJ.success && Array.isArray(clJ.data) ? clJ.data : []);
      setPassports(pJ.success && Array.isArray(pJ.data) ? pJ.data : []);
      setEmissions(eJ.success && Array.isArray(eJ.data) && eJ.data.length > 0 ? eJ.data[0] : null);
      setGuardianSubs(gJ.success && Array.isArray(gJ.data) ? gJ.data : []);
    } catch { setClaims([]); setPassports([]); setEmissions(null); setGuardianSubs([]); }
    finally { setLd(false); }
  };
  useEffect(() => { if (cid) fetchAll(cid); }, [cid]);

  const earnedBadges = BADGE_CRITERIA.filter(b => b.tierReq.includes(selectedCompany?.emissionTier || emissionTier));
  const parseMeta = (json?: string) => { try { return json ? JSON.parse(json) : null; } catch { return null; } };

  const submitClaim = async () => {
    const r = await call("/api/claims", { method: "POST", body: { companyId: cid, claimType, evidenceReferences: evidenceRefs.split(",").map(s => s.trim()).filter(Boolean) }, txType: "Claim Submission", txDescription: `Submitted ${claimType.replace(/_/g, " ")} claim` });
    if (r.data) { setSection("overview"); fetchAll(cid); }
  };
  const submitGuardian = async () => {
    const comp = companies.find(c => c.id === cid);
    const r = await call("/api/guardian/verify", { method: "POST", body: { companyId: cid, companyDid: comp?.did || "", productOrBatchId: productId, lifecycleStages: ["PRODUCTION"], emissionFactors: [{ factor: "CO2_EMISSION", value: 2.5, unit: "kgCO2e/unit" }], methodologyReference: methodology, calculationData: { method: "LCA", version: "1.0" } }, txType: "Guardian MRV Verification", txDescription: `Submitted LCA verification for ${productId}` });
    if (r.data) { setSection("overview"); fetchAll(cid); }
  };
  const mintPassport = async () => {
    const tier = emissionTier || selectedCompany?.emissionTier || "Tier_1";
    const r = await call("/api/passports", { method: "POST", body: { companyId: cid, emissionTier: tier, baselineEmissions: Number(baselineEm) || 0 }, txType: "Passport Mint (CPASS)", txDescription: `Minted carbon passport for ${selectedCompany?.companyName || "company"}` });
    if (r.data) { setMintResult(r.data); fetchAll(cid); }
  };

  const statusStyle = (s: string) => {
    if (s === "ATTESTED" || s === "VERIFIED") return { background: "rgba(16,185,129,0.12)", color: "#34D399", border: "1px solid rgba(16,185,129,0.2)" };
    if (s === "REJECTED") return { background: "rgba(239,68,68,0.12)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" };
    return { background: "rgba(59,130,246,0.12)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.2)" };
  };

  return (
    <GlassCard glow hover={false}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h3 style={hd}><ShieldCheck size={20} color="#14B8A6" /> Compliance Dashboard</h3>
          <p style={st}>Claims, Guardian MRV, and Carbon Passports</p>
          {guardianStatus && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.68rem", fontWeight: 600, marginTop: 4,
              color: guardianStatus.connected ? "#065f46" : "#92400e",
              background: guardianStatus.connected ? "#ecfdf5" : "#fffbeb",
              border: guardianStatus.connected ? "1px solid #a7f3d0" : "1px solid #fde68a",
              padding: "2px 8px", borderRadius: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: guardianStatus.connected ? "#10b981" : "#f59e0b" }} />
              {guardianStatus.connected ? "Guardian Connected" : "Local Engine"}
            </div>
          )}
        </div>
        {section === "overview" ? (
          <div style={{ display: "flex", gap: 6 }}>
            <AccentButton size="sm" onClick={() => setSection("claim")} icon={<FileCheck size={13} />}>Claim</AccentButton>
            <AccentButton size="sm" onClick={() => setSection("guardian")} icon={<Microscope size={13} />} style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}>MRV</AccentButton>
            <AccentButton size="sm" onClick={() => { setSection("mint"); setMintResult(null); }} icon={<Stamp size={13} />}>Mint Passport</AccentButton>
          </div>
        ) : (
          <AccentButton variant="secondary" size="sm" onClick={() => setSection("overview")} icon={<ArrowLeft size={13} />}>Back</AccentButton>
        )}
      </div>
      <FormField label="Company" value={cid} onChange={setCid} options={co} required />

      {section === "overview" && (<>
        {ld && <p style={lt}>Loading compliance data...</p>}
        {!ld && claims.length > 0 && (<>
          <div style={secHead}><FileCheck size={14} color="#34D399" /> Verifiable Claims ({claims.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
          {claims.map((c, i) => { const sc = statusStyle(c.status || ""); return (
            <GlassCard key={c.id} delay={i * 0.04} padding="0.75rem 1rem" hover={false} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={ct}>{(c.claimType || "").replace(/_/g, " ")}</span>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 8, ...sc }}>{c.status}</span>
              </div>
              <span style={cd}>{new Date(c.createdAt).toLocaleDateString()}{c.attestedAt ? ` · Attested ${new Date(c.attestedAt).toLocaleDateString()}` : ""}</span>
            </GlassCard>
          ); })}
          </div>
        </>)}
        {!ld && guardianSubs.length > 0 && (<>
          <div style={secHead}><Microscope size={14} color="#A78BFA" /> Guardian MRV ({guardianSubs.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
          {guardianSubs.map((g, i) => { const sc = statusStyle(g.status || ""); return (
            <GlassCard key={g.id} delay={i * 0.04} padding="0.75rem 1rem" hover={false} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={ct}>{g.productOrBatchId || "N/A"}</span>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 8, ...sc }}>{g.status}</span>
              </div>
              <span style={cd}>{g.methodologyRef || "N/A"} · {new Date(g.createdAt).toLocaleDateString()}</span>
            </GlassCard>
          ); })}
          </div>
        </>)}
        {!ld && passports.length > 0 && (<>
          <div style={secHead}><Stamp size={14} color="#14B8A6" /> Carbon Passports ({passports.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
          {passports.map((p, i) => { const meta = parseMeta(p.metadataJson); const tier = meta?.emission_tier || ""; const badges = BADGE_CRITERIA.filter(b => b.tierReq.includes(tier)); return (
            <GlassCard key={p.id} delay={i * 0.04} padding="0.85rem 1rem" hover={false} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={ct}>CPASS #{p.cpassSerial}</span>
                <span style={{ fontSize: "0.66rem", fontWeight: 600, color: "#A78BFA", background: "rgba(139,92,246,0.12)", padding: "2px 8px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.2)" }}>{(p.passportType || "company").toUpperCase()}</span>
              </div>
              {meta && <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: 4 }}>Score: {meta.carbon_score || "N/A"} · Tier: {(meta.emission_tier || "").replace("_", " ")}</div>}
              {meta && <div style={{ fontSize: "0.72rem", color: "#475569" }}>Footprint: {(meta.carbon_footprint_total ?? 0).toLocaleString()} tCO₂e</div>}
              {badges.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>{badges.map(b => <ComplianceBadge key={b.id} label={b.label} icon={b.icon} />)}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={cd}>{new Date(p.createdAt).toLocaleDateString()}</span>
                {p.tokenId && <a href={`https://hashscan.io/testnet/token/${p.tokenId}/${p.cpassSerial}`} target="_blank" rel="noopener noreferrer" style={verifyBtn}><ExternalLink size={11} /> Verify NFT</a>}
              </div>
            </GlassCard>
          ); })}
          </div>
        </>)}
        {!ld && cid && claims.length === 0 && passports.length === 0 && guardianSubs.length === 0 && <p style={lt}>No compliance data found. Submit a claim or mint a passport to get started.</p>}
      </>)}

      {section === "claim" && (<>
        <div style={secHead}><FileCheck size={14} color="#34D399" /> Submit Verifiable Claim</div>
        <FormField label="Claim Type" value={claimType} onChange={setClaimType} options={CLAIM_TYPES} required />
        <FormField label="Evidence References" value={evidenceRefs} onChange={setEvidenceRefs} placeholder="Comma-separated URLs or hashes" />
        <AccentButton onClick={submitClaim} disabled={loading || !claimType} fullWidth size="lg">{loading ? "Submitting..." : "Submit Claim"}</AccentButton>
      </>)}

      {section === "guardian" && (<>
        <div style={secHead}><Microscope size={14} color="#A78BFA" /> Submit Guardian MRV Verification</div>
        <FormField label="Product/Batch ID" value={productId} onChange={setProductId} placeholder="BATCH-001" required />
        <FormField label="Methodology" value={methodology} onChange={setMethodology} options={METHODOLOGY_OPTIONS} required />
        <AccentButton onClick={submitGuardian} disabled={loading || !productId || !methodology} fullWidth size="lg" style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}>{loading ? "Verifying..." : "Submit for Verification"}</AccentButton>
      </>)}

      {section === "mint" && cid && (<>
        <div style={secHead}><Stamp size={14} color="#14B8A6" /> Mint Carbon Passport NFT</div>
        {selectedCompany && (
          <GlassCard hover={false} padding="0.85rem 1rem" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0F172A", marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>Company Summary</div>
            <div style={summaryGrid}>
              <div><span style={sLabel}>Name</span><span style={sVal}>{selectedCompany.companyName}</span></div>
              <div><span style={sLabel}>Hedera ID</span><span style={sVal}>{selectedCompany.hederaAccountId}</span></div>
              <div><span style={sLabel}>Sector</span><span style={sVal}>{(selectedCompany.sector || "").replace(/_/g, " ")}</span></div>
              <div><span style={sLabel}>Tier</span><span style={sVal}>{(selectedCompany.emissionTier || "").replace("_", " ")}</span></div>
            </div>
          </GlassCard>
        )}
        {emissions && (
          <GlassCard hover={false} padding="0.85rem 1rem" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0F172A", marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>Emissions ({emissions.reportingPeriod})</div>
            <div style={summaryGrid}>
              <div><span style={sLabel}>Total</span><span style={sVal}>{(emissions.totalTCO2e ?? 0).toLocaleString()} tCO₂e</span></div>
              <div><span style={sLabel}>Scope 1</span><span style={sVal}>{(emissions.scope1TCO2e ?? 0).toLocaleString()}</span></div>
              <div><span style={sLabel}>Scope 2</span><span style={sVal}>{(emissions.scope2TCO2e ?? 0).toLocaleString()}</span></div>
              <div><span style={sLabel}>Scope 3</span><span style={sVal}>{(emissions.scope3TCO2e ?? 0).toLocaleString()}</span></div>
            </div>
          </GlassCard>
        )}
        {earnedBadges.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.75rem" }}>
            {earnedBadges.map(b => <ComplianceBadge key={b.id} label={b.label} icon={b.icon} />)}
          </div>
        )}
        <FormField label="Emission Tier" value={emissionTier || selectedCompany?.emissionTier || ""} onChange={setEmissionTier} options={TIER_OPTIONS} required />
        <FormField label="Baseline Emissions (tCO2e)" value={baselineEm} onChange={setBaselineEm} type="number" placeholder="e.g. 50000" required />
        <AccentButton onClick={mintPassport} disabled={loading} fullWidth size="lg" style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}>{loading ? "Minting..." : "Mint Carbon Passport NFT"}</AccentButton>
        {mintResult && (
          <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 10, fontSize: "0.82rem", color: "#059669", fontWeight: 600 }}>
            Carbon Passport minted successfully. Check the Activity Log for HashScan verification link.
          </div>
        )}
      </>)}
    </GlassCard>
  );
}

const hd: React.CSSProperties = { fontSize: "1.15rem", fontWeight: 700, color: "#0F172A", margin: 0, fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: "0.5rem" };
const st: React.CSSProperties = { fontSize: "0.8rem", color: "#64748B", margin: "0.15rem 0 0" };
const secHead: React.CSSProperties = { fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginTop: "1rem", marginBottom: "0.5rem", paddingBottom: "0.35rem", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "'Space Grotesk', sans-serif" };
const ct: React.CSSProperties = { fontWeight: 700, fontSize: "0.85rem", color: "#0F172A" };
const cd: React.CSSProperties = { fontSize: "0.68rem", color: "#64748B", marginTop: "0.25rem", display: "block" };
const lt: React.CSSProperties = { fontSize: "0.82rem", color: "#64748B", textAlign: "center", padding: "2rem 0" };
const verifyBtn: React.CSSProperties = { fontSize: "0.7rem", fontWeight: 600, color: "#0F172A", background: "linear-gradient(135deg, #14B8A6, #10B981)", padding: "0.2rem 0.55rem", borderRadius: 6, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" };
const summaryGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem 1rem" };
const sLabel: React.CSSProperties = { fontSize: "0.68rem", color: "#64748B", display: "block", textTransform: "uppercase" as const, letterSpacing: "0.04em" };
const sVal: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, color: "#0F172A", display: "block" };
