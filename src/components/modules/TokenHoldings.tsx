"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, RefreshCw, TrendingUp, Award, Shield, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import GlassCard from "@/components/ui/GlassCard";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";
import type { CSSProperties } from "react";

interface MilestoneReward {
  id: string;
  milestoneType: string;
  ccrRewardAmount: number;
  awardedAt: string;
  transactionId?: string;
}

interface AllocationRecord {
  id: string;
  compliancePeriod: string;
  allocatedAmount: number;
  usedAmount: number;
  surplus: number;
  deficit: number;
  status: string;
}

interface TokenBalance {
  symbol: string;
  name: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const MILESTONE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  FIRST_REPORT: { label: "First Emissions Report", icon: <Zap size={14} /> },
  TIER_IMPROVEMENT: { label: "Tier Improvement", icon: <TrendingUp size={14} /> },
  SCORE_IMPROVEMENT: { label: "Score Improvement", icon: <Award size={14} /> },
  FIRST_STAMP: { label: "First Compliance Stamp", icon: <Shield size={14} /> },
  FIRST_CLAIM: { label: "First Verified Claim", icon: <Shield size={14} /> },
  REPORTING_STREAK: { label: "Reporting Streak (4+)", icon: <Zap size={14} /> },
};

export default function TokenHoldings() {
  const { companies } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [rewards, setRewards] = useState<MilestoneReward[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [loadingAllocations, setLoadingAllocations] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("tokens");

  const companyOptions: SelectOption[] = companies.map((c) => ({
    value: c.id,
    label: `${c.companyName} (${c.sector})`,
  }));

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const fetchRewards = useCallback(async (cId: string) => {
    if (!cId) { setRewards([]); return; }
    setLoadingRewards(true);
    try {
      const res = await fetch(`/api/rewards/${cId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setRewards(json.data);
      else setRewards([]);
    } catch { setRewards([]); }
    finally { setLoadingRewards(false); }
  }, []);

  const fetchAllocations = useCallback(async (cId: string) => {
    if (!cId) { setAllocations([]); return; }
    setLoadingAllocations(true);
    try {
      const res = await fetch(`/api/cap-trade/allocations/${cId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setAllocations(json.data);
      else setAllocations([]);
    } catch { setAllocations([]); }
    finally { setLoadingAllocations(false); }
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchRewards(selectedCompanyId);
      fetchAllocations(selectedCompanyId);
    }
  }, [selectedCompanyId, fetchRewards, fetchAllocations]);

  const totalCCR = rewards.reduce((sum, r) => sum + (r.ccrRewardAmount || 0), 0);
  const totalCAL = allocations.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0);
  const totalSurplus = allocations.reduce((sum, a) => sum + (a.surplus || 0), 0);
  const totalUsed = allocations.reduce((sum, a) => sum + (a.usedAmount || 0), 0);

  const tokenBalances: TokenBalance[] = [
    {
      symbol: "CCR",
      name: "Carbon Credit Tokens",
      amount: totalCCR,
      icon: <Coins size={20} />,
      color: "#F59E0B",
      bgColor: "rgba(245,158,11,0.1)",
      borderColor: "rgba(245,158,11,0.25)",
      description: "Earned from meeting emission reduction milestones. Spendable on the marketplace.",
    },
    {
      symbol: "CAL",
      name: "Carbon Allowance Tokens",
      amount: totalCAL,
      icon: <Shield size={20} />,
      color: "#3B82F6",
      bgColor: "rgba(59,130,246,0.1)",
      borderColor: "rgba(59,130,246,0.25)",
      description: "Allocated based on emission tier for cap-and-trade compliance.",
    },
    {
      symbol: "SURPLUS",
      name: "Tradeable Surplus",
      amount: totalSurplus,
      icon: <TrendingUp size={20} />,
      color: "#10B981",
      bgColor: "rgba(16,185,129,0.1)",
      borderColor: "rgba(16,185,129,0.25)",
      description: "Unused CAL allowances available for trading on the marketplace.",
    },
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const isLoading = loadingRewards || loadingAllocations;

  return (
    <GlassCard hover={false} glow>
      {/* Header */}
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={iconBox}><Coins size={18} color="#F59E0B" /></div>
          <div>
            <h3 style={heading}>Token Holdings</h3>
            <p style={subtext}>View company token balances, earned rewards, and tradeable surplus</p>
          </div>
        </div>
        {selectedCompanyId && (
          <button onClick={() => { fetchRewards(selectedCompanyId); fetchAllocations(selectedCompanyId); }} style={refreshBtn} aria-label="Refresh">
            <RefreshCw size={14} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
          </button>
        )}
      </div>

      <FormField label="Select Company" value={selectedCompanyId} onChange={setSelectedCompanyId} options={companyOptions} required />

      {!selectedCompanyId && (
        <p style={emptyText}>Select a company to view their token holdings and earned rewards.</p>
      )}

      {selectedCompanyId && (
        <AnimatePresence mode="wait">
          <motion.div key={selectedCompanyId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {/* Company Info Badge */}
            {selectedCompany && (
              <div style={companyBadge}>
                <span style={{ fontWeight: 700, color: "#0F172A", fontSize: "0.85rem" }}>{selectedCompany.companyName}</span>
                <span style={tierBadge(selectedCompany.emissionTier)}>{selectedCompany.emissionTier.replace("_", " ")}</span>
                <span style={scoreBadge(selectedCompany.carbonScore)}>Score: {selectedCompany.carbonScore}</span>
              </div>
            )}

            {/* Token Balance Cards */}
            <div style={tokenGrid}>
              {tokenBalances.map((token, i) => (
                <motion.div key={token.symbol} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, duration: 0.3 }} style={{ ...tokenCard, borderColor: token.borderColor }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ ...tokenIconBox, background: token.bgColor, color: token.color }}>{token.icon}</div>
                    <span style={{ ...tokenAmount, color: token.color }}>{token.amount.toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <span style={tokenSymbol}>{token.symbol}</span>
                    <span style={tokenName}>{token.name}</span>
                  </div>
                  <p style={tokenDesc}>{token.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Earned Rewards Section */}
            <div style={sectionWrapper}>
              <button onClick={() => toggleSection("rewards")} style={sectionToggle}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Award size={16} color="#F59E0B" />
                  <span style={sectionTitle}>Earned CCR Rewards</span>
                  <span style={countBadge}>{rewards.length}</span>
                </div>
                {expandedSection === "rewards" ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
              </button>
              <AnimatePresence>
                {expandedSection === "rewards" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
                    {loadingRewards && <p style={loadingText}>Loading rewards...</p>}
                    {!loadingRewards && rewards.length === 0 && (
                      <div style={emptyState}>
                        <Award size={32} color="#CBD5E1" />
                        <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#94A3B8" }}>No rewards earned yet. Meet emission milestones to earn CCR tokens.</p>
                        <div style={milestoneHints}>
                          {Object.entries(MILESTONE_LABELS).map(([key, val]) => (
                            <span key={key} style={hintChip}>{val.icon} {val.label}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem", padding: "0.5rem 0" }}>
                      {rewards.map((r, i) => {
                        const ml = MILESTONE_LABELS[r.milestoneType] || { label: r.milestoneType, icon: <Award size={14} /> };
                        return (
                          <motion.div key={r.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} style={rewardCard}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={rewardIcon}>{ml.icon}</div>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: "0.78rem", color: "#0F172A" }}>{ml.label}</span>
                                <span style={{ display: "block", fontSize: "0.68rem", color: "#94A3B8" }}>{new Date(r.awardedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <span style={rewardAmount}>+{r.ccrRewardAmount} CCR</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CAL Allocations Section */}
            <div style={sectionWrapper}>
              <button onClick={() => toggleSection("allocations")} style={sectionToggle}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shield size={16} color="#3B82F6" />
                  <span style={sectionTitle}>CAL Allocations by Period</span>
                  <span style={countBadge}>{allocations.length}</span>
                </div>
                {expandedSection === "allocations" ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
              </button>
              <AnimatePresence>
                {expandedSection === "allocations" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
                    {loadingAllocations && <p style={loadingText}>Loading allocations...</p>}
                    {!loadingAllocations && allocations.length === 0 && (
                      <div style={emptyState}>
                        <Shield size={32} color="#CBD5E1" />
                        <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#94A3B8" }}>No CAL allocations yet. Allocate allowances in the Cap-and-Trade module.</p>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem", padding: "0.5rem 0" }}>
                      {allocations.map((a, i) => (
                        <motion.div key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} style={allocationCard}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0F172A" }}>Period {a.compliancePeriod}</span>
                            <span style={statusChip(a.status)}>{a.status}</span>
                          </div>
                          {/* Mini bar chart */}
                          <div style={barContainer}>
                            <div style={{ ...barFill, width: `${Math.min(100, a.allocatedAmount > 0 ? (a.usedAmount / a.allocatedAmount) * 100 : 0)}%`, background: a.deficit > 0 ? "#EF4444" : "#10B981" }} />
                          </div>
                          <div style={allocationStats}>
                            <span>Allocated: <strong>{a.allocatedAmount.toLocaleString()}</strong> CAL</span>
                            <span>Used: <strong>{a.usedAmount.toLocaleString()}</strong></span>
                            {a.surplus > 0 && <span style={{ color: "#10B981" }}>Surplus: <strong>{a.surplus.toLocaleString()}</strong></span>}
                            {a.deficit > 0 && <span style={{ color: "#EF4444" }}>Deficit: <strong>{a.deficit.toLocaleString()}</strong></span>}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </GlassCard>
  );
}

/* ── Styles ── */
const headerRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" };
const iconBox: CSSProperties = { width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const heading: CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "#0F172A", margin: 0, fontFamily: "'Space Grotesk', sans-serif" };
const subtext: CSSProperties = { fontSize: "0.78rem", color: "#64748B", margin: 0 };
const refreshBtn: CSSProperties = { width: 32, height: 32, borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#F59E0B" };
const emptyText: CSSProperties = { fontSize: "0.82rem", color: "#94A3B8", textAlign: "center", padding: "2rem 0" };
const companyBadge: CSSProperties = { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, marginBottom: "0.75rem" };

const tierBadge = (tier: string): CSSProperties => {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    Tier_1: { bg: "rgba(239,68,68,0.1)", color: "#EF4444", border: "rgba(239,68,68,0.25)" },
    Tier_2: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "rgba(245,158,11,0.25)" },
    Tier_3: { bg: "rgba(16,185,129,0.1)", color: "#10B981", border: "rgba(16,185,129,0.25)" },
  };
  const c = colors[tier] || colors.Tier_2;
  return { fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 10, background: c.bg, color: c.color, border: `1px solid ${c.border}` };
};

const scoreBadge = (score: string): CSSProperties => {
  const colors: Record<string, string> = { A: "#10B981", B: "#3B82F6", C: "#F59E0B", D: "#F97316", F: "#EF4444" };
  const color = colors[score] || "#94A3B8";
  return { fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 10, background: `${color}18`, color, border: `1px solid ${color}40` };
};

const tokenGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "0.75rem" };
const tokenCard: CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "1rem", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const tokenIconBox: CSSProperties = { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" };
const tokenAmount: CSSProperties = { fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" };
const tokenSymbol: CSSProperties = { fontSize: "0.75rem", fontWeight: 700, color: "#64748B", letterSpacing: "0.05em" };
const tokenName: CSSProperties = { display: "block", fontSize: "0.72rem", color: "#94A3B8", marginTop: "0.1rem" };
const tokenDesc: CSSProperties = { fontSize: "0.68rem", color: "#94A3B8", marginTop: "0.4rem", lineHeight: 1.4 };

const sectionWrapper: CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: "0.5rem", overflow: "hidden" };
const sectionToggle: CSSProperties = { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "transparent", border: "none", cursor: "pointer" };
const sectionTitle: CSSProperties = { fontSize: "0.82rem", fontWeight: 700, color: "#0F172A" };
const countBadge: CSSProperties = { fontSize: "0.68rem", fontWeight: 700, color: "#64748B", background: "#F1F5F9", padding: "0.1rem 0.4rem", borderRadius: 8 };

const loadingText: CSSProperties = { fontSize: "0.82rem", color: "#94A3B8", textAlign: "center", padding: "1rem 0" };
const emptyState: CSSProperties = { textAlign: "center", padding: "1.5rem 1rem" };
const milestoneHints: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "0.35rem", justifyContent: "center", marginTop: "0.75rem" };
const hintChip: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "#64748B", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "0.2rem 0.5rem", borderRadius: 8 };

const rewardCard: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 1rem", background: "#FFFBEB", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8 };
const rewardIcon: CSSProperties = { width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F59E0B" };
const rewardAmount: CSSProperties = { fontWeight: 800, fontSize: "0.88rem", color: "#F59E0B", fontFamily: "'Space Grotesk', sans-serif" };

const allocationCard: CSSProperties = { padding: "0.6rem 1rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 };
const statusChip = (status: string): CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    COMPLIANT: { bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    NON_COMPLIANT: { bg: "rgba(239,68,68,0.1)", color: "#EF4444" },
    PENDING: { bg: "rgba(14,165,233,0.1)", color: "#38BDF8" },
  };
  const c = colors[status] || colors.PENDING;
  return { fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 10, background: c.bg, color: c.color };
};
const barContainer: CSSProperties = { width: "100%", height: 4, background: "#E2E8F0", borderRadius: 2, marginTop: "0.5rem", overflow: "hidden" };
const barFill: CSSProperties = { height: "100%", borderRadius: 2, transition: "width 0.5s ease" };
const allocationStats: CSSProperties = { display: "flex", gap: "1rem", fontSize: "0.72rem", color: "#64748B", marginTop: "0.35rem", flexWrap: "wrap" };
