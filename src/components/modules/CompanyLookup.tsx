"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import FormField from "@/components/ui/FormField";

interface CompanyData {
  id: string;
  companyName: string;
  hederaAccountId: string;
  did: string;
  sector: string;
  revenueRange: string;
  baselineEmissions: number;
  emissionTier: string;
  carbonScore: string;
  policyFrameworks: string[];
  createdAt: string;
}

interface ScoreData {
  companyId: string;
  carbonScore: string;
  totalEmissions: number;
  benchmarkEmissions: number;
  reductionPercentage: number;
}

interface RewardEntry {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
}

export default function CompanyLookup() {
  const { call, loading } = useApi();
  const [hederaId, setHederaId] = useState("");
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [rewards, setRewards] = useState<RewardEntry[]>([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const lookup = async () => {
    setError(""); setCompany(null); setScore(null); setRewards([]); setSearched(true);
    const companyRes = await call("/api/companies/hedera/" + encodeURIComponent(hederaId), {
      method: "GET", txType: "Company Lookup", txDescription: "Looked up company by Hedera ID " + hederaId,
    });
    if (!companyRes.success || !companyRes.data) {
      setError("No company found for Hedera Account ID: " + hederaId);
      return;
    }
    const c = companyRes.data as CompanyData;
    // Ensure policyFrameworks is an array (Prisma JSON fields may serialize as string)
    if (typeof c.policyFrameworks === "string") {
      try { c.policyFrameworks = JSON.parse(c.policyFrameworks); } catch { c.policyFrameworks = []; }
    }
    if (!Array.isArray(c.policyFrameworks)) c.policyFrameworks = [];
    setCompany(c);
    // Fetch score and rewards in parallel
    const [scoreRes, rewardsRes] = await Promise.all([
      call("/api/score/" + c.id, { method: "GET", txType: "Score Lookup", txDescription: "Fetched carbon score" }),
      call("/api/rewards/" + c.id, { method: "GET", txType: "Rewards Lookup", txDescription: "Fetched rewards" }),
    ]);
    if (scoreRes.success && scoreRes.data) setScore(scoreRes.data as ScoreData);
    if (rewardsRes.success && Array.isArray(rewardsRes.data)) setRewards(rewardsRes.data as RewardEntry[]);
  };

  const tierColor = (tier: string) => {
    if (tier === "Tier_1") return { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" };
    if (tier === "Tier_2") return { bg: "#fffbeb", border: "#fde68a", text: "#d97706" };
    return { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" };
  };

  const scoreColor = (grade: string) => {
    if (grade <= "B") return "#16a34a";
    if (grade <= "C") return "#d97706";
    return "#dc2626";
  };

  return (
    <div style={card}>
      <h3 style={heading}>Company Lookup</h3>
      <p style={subtext}>Search by Hedera Account ID to view company details</p>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <FormField label="Hedera Account ID" value={hederaId} onChange={setHederaId} placeholder="e.g. 0.0.12345" required />
        </div>
        <button onClick={lookup} disabled={loading || !hederaId} style={searchBtn}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && searched && <div style={errorBox}>{error}</div>}

      {company && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Company Profile Card */}
          <div style={infoCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>{company.companyName}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{company.hederaAccountId}</div>
              </div>
              <div style={{
                ...badgeStyle,
                ...tierColor(company.emissionTier),
                background: tierColor(company.emissionTier).bg,
                borderColor: tierColor(company.emissionTier).border,
                color: tierColor(company.emissionTier).text,
              }}>
                {(company.emissionTier || "").replace("_", " ")}
              </div>
            </div>
            <div style={gridRow}>
              <InfoItem label="Sector" value={(company.sector || "").replace(/_/g, " ")} />
              <InfoItem label="Revenue Range" value={(company.revenueRange || "").replace(/_/g, " ")} />
              <InfoItem label="Baseline Emissions" value={(company.baselineEmissions ?? 0).toLocaleString() + " tCO2e"} />
              <InfoItem label="Carbon Score" value={company.carbonScore || "N/A"} valueColor={scoreColor(company.carbonScore || "D")} />
            </div>
          </div>

          {/* DID Card */}
          <div style={infoCard}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Decentralized Identity</div>
            <div style={{ fontSize: "0.78rem", color: "#3b82f6", wordBreak: "break-all", fontFamily: "monospace", background: "#f8fafc", padding: "0.5rem", borderRadius: 6 }}>
              {company.did}
            </div>
          </div>

          {/* Policy Frameworks Card */}
          {Array.isArray(company.policyFrameworks) && company.policyFrameworks.length > 0 && (
            <div style={infoCard}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginBottom: 8 }}>Policy Frameworks</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {company.policyFrameworks.filter(Boolean).map((fw) => (
                  <span key={fw} style={fwBadge}>{(fw || "").replace(/_/g, " ")}</span>
                ))}
              </div>
            </div>
          )}

          {/* Carbon Score Card */}
          {score && (
            <div style={infoCard}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginBottom: 8 }}>Carbon Score Details</div>
              <div style={gridRow}>
                <InfoItem label="Grade" value={score.carbonScore} valueColor={scoreColor(score.carbonScore)} />
                <InfoItem label="Total Emissions" value={(score.totalEmissions ?? 0).toLocaleString() + " tCO2e"} />
                <InfoItem label="Benchmark" value={(score.benchmarkEmissions ?? 0).toLocaleString() + " tCO2e"} />
                <InfoItem label="Reduction" value={(score.reductionPercentage ?? 0).toFixed(1) + "%"} valueColor={(score.reductionPercentage ?? 0) > 0 ? "#16a34a" : "#dc2626"} />
              </div>
            </div>
          )}

          {/* Rewards Card */}
          {rewards.length > 0 && (
            <div style={infoCard}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginBottom: 8 }}>Rewards Earned</div>
              {rewards.slice(0, 5).map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.78rem" }}>
                  <span style={{ color: "#475569" }}>{(r.type || "").replace(/_/g, " ")}</span>
                  <span style={{ fontWeight: 600, color: "#059669" }}>+{r.amount} GCT</span>
                </div>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", textAlign: "right" }}>
            {"ID: " + company.id + " · Registered: " + new Date(company.createdAt).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: valueColor || "#1e293b", marginTop: 1 }}>{value}</div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: "1.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" };
const heading: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.25rem" };
const subtext: React.CSSProperties = { fontSize: "0.82rem", color: "#64748b", margin: "0 0 1rem" };
const searchBtn: React.CSSProperties = { padding: "0.55rem 1.25rem", borderRadius: 8, background: "#3b82f6", color: "#fff", fontWeight: 600, fontSize: "0.85rem", border: "none", cursor: "pointer", marginBottom: "0.75rem", whiteSpace: "nowrap" };
const errorBox: React.CSSProperties = { marginTop: 12, padding: 12, background: "#fef2f2", borderRadius: 8, color: "#dc2626", fontSize: 13 };
const infoCard: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem" };
const gridRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem", marginTop: 10 };
const badgeStyle: React.CSSProperties = { padding: "4px 10px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 700, border: "1px solid" };
const fwBadge: React.CSSProperties = { padding: "3px 10px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 500, background: "#ede9fe", color: "#7c3aed", border: "1px solid #ddd6fe" };
