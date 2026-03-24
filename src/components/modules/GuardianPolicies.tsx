"use client";
import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import GlassCard from "@/components/ui/GlassCard";
import AccentButton from "@/components/ui/AccentButton";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";
import { Shield, Plus, ArrowLeft, ExternalLink, RefreshCw, CheckCircle, Clock, FileText, Award, Zap, Eye } from "lucide-react";
import type { CSSProperties } from "react";

interface PolicyInfo { id: string; name: string; status: string; topicId?: string; instanceTopicId?: string; messageId?: string; description?: string; version?: string; owner?: string; }
interface GStatus { connected: boolean; mode: "GUARDIAN"|"LOCAL"; url?: string; policyId?: string; policyName?: string; policyStatus?: string; policyTopicId?: string; }
interface RewardRes { milestoneId: string; transactionId?: string; amount: number; }
type View = "list"|"create"|"detail"|"reward";

const stC = (s: string) => {
  if (s === "PUBLISH" || s === "PUBLISHED") return { bg: "#D1FAE5", color: "#059669", border: "#A7F3D0" };
  if (s === "DRAFT") return { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" };
  if (s === "DRY-RUN") return { bg: "#DBEAFE", color: "#2563EB", border: "#BFDBFE" };
  return { bg: "#F1F5F9", color: "#64748B", border: "#E2E8F0" };
};
const hsTopicUrl = (t: string) => `https://hashscan.io/testnet/topic/${t}`;
const hsTxUrl = (t: string) => `https://hashscan.io/testnet/transaction/${t}`;

const ENFORCE_MODULES = [
  { module: "Emissions Calculator", icon: "📊" },
  { module: "MRV Verification", icon: "🔬" },
  { module: "Carbon Passports", icon: "📋" },
  { module: "Marketplace", icon: "🏪" },
  { module: "Cap & Trade", icon: "📈" },
  { module: "Supply Chain", icon: "🔗" },
  { module: "Claims", icon: "✅" },
  { module: "Rewards", icon: "🏆" },
];

export default function GuardianPolicies() {
  const { call, loading } = useApi();
  const { companies } = useCompanies();
  const [view, setView] = useState<View>("list");
  const [policies, setPolicies] = useState<PolicyInfo[]>([]);
  const [gs, setGs] = useState<GStatus|null>(null);
  const [ld, setLd] = useState(false);
  const [sel, setSel] = useState<PolicyInfo|null>(null);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pTag, setPTag] = useState("");
  const [rwCid, setRwCid] = useState("");
  const [rwReason, setRwReason] = useState("");
  const [rwRes, setRwRes] = useState<RewardRes|null>(null);
  const coOpts: SelectOption[] = companies.map(c => ({ value: c.id, label: `${c.companyName} (${c.hederaAccountId})` }));

  const fetchPolicies = useCallback(async () => {
    setLd(true);
    try { const r = await fetch("/api/guardian/policies"); const j = await r.json(); if (j.success && Array.isArray(j.data)) setPolicies(j.data); else setPolicies([]); }
    catch { setPolicies([]); } finally { setLd(false); }
  }, []);
  const fetchStatus = useCallback(async () => {
    try { const r = await fetch("/api/guardian/status"); const j = await r.json(); if (j.success) { setGs(j.data); return j.data as GStatus; } }
    catch { /* ignore */ }
    const fallback: GStatus = { connected: false, mode: "LOCAL" };
    setGs(fallback);
    return fallback;
  }, []);
  // On mount: fetch status, then policies if connected. Auto-retry every 15s when disconnected.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let mounted = true;
    const init = async () => {
      const s = await fetchStatus();
      if (s?.connected) { fetchPolicies(); if (timer) { clearInterval(timer); timer = null; } }
      else {
        // Auto-retry connection every 15s
        if (!timer) timer = setInterval(async () => {
          if (!mounted) return;
          const retry = await fetchStatus();
          if (retry?.connected) { fetchPolicies(); if (timer) { clearInterval(timer); timer = null; } }
        }, 15000);
      }
    };
    init();
    return () => { mounted = false; if (timer) clearInterval(timer); };
  }, [fetchPolicies, fetchStatus]);

  const createPolicy = async () => {
    const r = await call<PolicyInfo>("/api/guardian/policies", { method: "POST", body: { name: pName, description: pDesc, policyTag: pTag || undefined }, txType: "Guardian Policy Creation", txDescription: `Created Guardian policy: ${pName}` });
    if (r.success) { setPName(""); setPDesc(""); setPTag(""); setView("list"); fetchPolicies(); }
  };
  const publishPolicy = async (pid: string) => {
    const r = await call<PolicyInfo>(`/api/guardian/policies/${pid}/publish`, { method: "PUT", txType: "Guardian Policy Publish", txDescription: "Published Guardian policy to Hedera" });
    if (r.success) { fetchPolicies(); if (sel?.id === pid && r.data) setSel(r.data); }
  };
  const rewardCompany = async () => {
    if (!sel) return;
    const r = await call<RewardRes>("/api/guardian/rewards", { method: "POST", body: { companyId: rwCid, policyId: sel.id, reason: rwReason || `Compliance with ${sel.name}` }, txType: "CCR Policy Reward", txDescription: "Rewarded company with 500 CCR for policy compliance" });
    if (r.success && r.data) setRwRes(r.data);
  };

  return (
    <div>
      {/* Header */}
      <GlassCard glow hover={false} style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={pgT}><Shield size={22} color="#10B981" /> Guardian Policies</h2>
            <p style={pgS}>Manage Hedera Guardian policies, enforce compliance, and reward adherence</p>
            {gs && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", fontWeight: 600, marginTop: 6, color: gs.connected ? "#065f46" : "#92400e", background: gs.connected ? "#ecfdf5" : "#fffbeb", border: gs.connected ? "1px solid #a7f3d0" : "1px solid #fde68a", padding: "3px 10px", borderRadius: 14 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: gs.connected ? "#10b981" : "#f59e0b", display: "inline-block" }} />
                {gs.connected ? `Connected · ${gs.policyName || "Guardian"} (${gs.policyStatus || "active"})` : "Guardian Unavailable"}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {view === "list" ? (<>
              <AccentButton variant="secondary" size="sm" onClick={() => { fetchPolicies(); fetchStatus(); }} icon={<RefreshCw size={13} />}>Refresh</AccentButton>
              <AccentButton size="sm" onClick={() => setView("create")} icon={<Plus size={13} />}>Create Policy</AccentButton>
            </>) : (
              <AccentButton variant="secondary" size="sm" onClick={() => { setView("list"); setSel(null); setRwRes(null); }} icon={<ArrowLeft size={13} />}>Back</AccentButton>
            )}
          </div>
        </div>
      </GlassCard>

      {/* LIST VIEW */}
      {view === "list" && (<>
        {ld && <p style={ldT}>Loading Guardian policies...</p>}
        {!ld && policies.length === 0 && gs?.connected && (
          <GlassCard hover={false} style={{ textAlign: "center", padding: "2.5rem" }}>
            <FileText size={36} color="#94A3B8" style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ fontSize: "0.88rem", color: "#475569", fontWeight: 600, margin: "0 0 0.25rem" }}>No policies found</p>
            <p style={{ fontSize: "0.78rem", color: "#94A3B8", margin: "0 0 1rem" }}>Create your first Guardian policy to get started</p>
            <AccentButton size="sm" onClick={() => setView("create")} icon={<Plus size={13} />}>Create Policy</AccentButton>
          </GlassCard>
        )}
        {!ld && !gs?.connected && (
          <GlassCard hover={false} style={{ textAlign: "center", padding: "2.5rem" }}>
            <Shield size={36} color="#F59E0B" style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ fontSize: "0.88rem", color: "#475569", fontWeight: 600, margin: "0 0 0.25rem" }}>Guardian Not Connected</p>
            <p style={{ fontSize: "0.78rem", color: "#94A3B8", margin: "0 0 0.5rem" }}>Ensure Docker Desktop is running and Guardian containers are up.</p>
            <p style={{ fontSize: "0.72rem", color: "#94A3B8", margin: "0 0 1rem" }}>Auto-retrying connection every 15 seconds...</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "#D97706" }}><RefreshCw size={12} className="spin" /> Waiting for Guardian...</div>
          </GlassCard>
        )}
        {!ld && policies.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
            {policies.map((p, i) => {
              const sc = stC(p.status);
              const isAct = p.status === "PUBLISH" || p.status === "PUBLISHED";
              return (
                <GlassCard key={p.id} delay={i * 0.06} padding="1rem 1.15rem" style={{ background: isAct ? "#FFF" : "#FAFBFC", border: `1px solid ${sc.border}`, position: "relative" }}>
                  {isAct && <div style={actPulse} />}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <span style={polT}>{p.name}</span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 10, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>{p.status}</span>
                  </div>
                  {p.description && <p style={polD}>{p.description.length > 80 ? p.description.slice(0, 80) + "..." : p.description}</p>}
                  {p.topicId && <div style={mRow}><span style={mLbl}>Topic</span><a href={hsTopicUrl(p.topicId)} target="_blank" rel="noopener noreferrer" style={hsLnk}>{p.topicId} <ExternalLink size={10} /></a></div>}
                  {p.instanceTopicId && <div style={mRow}><span style={mLbl}>Instance</span><a href={hsTopicUrl(p.instanceTopicId)} target="_blank" rel="noopener noreferrer" style={hsLnk}>{p.instanceTopicId} <ExternalLink size={10} /></a></div>}
                  {p.version && <div style={mRow}><span style={mLbl}>Version</span><span style={mVal}>{p.version}</span></div>}
                  <div style={{ display: "flex", gap: 6, marginTop: "0.65rem" }}>
                    <button onClick={() => { setSel(p); setView("detail"); }} style={cBtn}><Eye size={12} /> Details</button>
                    {!isAct && <button onClick={() => publishPolicy(p.id)} disabled={loading} style={{ ...cBtn, background: "#D1FAE5", color: "#059669", borderColor: "#A7F3D0" }}><Zap size={12} /> Publish</button>}
                    {isAct && <button onClick={() => { setSel(p); setRwCid(""); setRwReason(""); setRwRes(null); setView("reward"); }} style={{ ...cBtn, background: "#FEF3C7", color: "#D97706", borderColor: "#FDE68A" }}><Award size={12} /> Reward</button>}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </>)}

      {/* CREATE VIEW */}
      {view === "create" && (
        <GlassCard hover={false}>
          <div style={secH}><Plus size={15} color="#10B981" /> Create New Guardian Policy</div>
          <p style={{ fontSize: "0.78rem", color: "#64748B", margin: "0 0 1rem" }}>Define a new compliance policy. Once created, publish it to enforce across the platform.</p>
          <FormField label="Policy Name" value={pName} onChange={setPName} placeholder="e.g. Carbon Passport Verification v3" required />
          <FormField label="Description" value={pDesc} onChange={setPDesc} placeholder="Describe the policy purpose and compliance requirements..." required />
          <FormField label="Policy Tag" value={pTag} onChange={setPTag} placeholder="e.g. carbon-passport-v3 (auto-generated if empty)" hint="Unique identifier. Leave empty to auto-generate." />
          <div style={{ marginTop: "0.5rem" }}>
            <AccentButton onClick={createPolicy} disabled={loading || !pName || !pDesc} fullWidth size="lg" icon={<Shield size={15} />}>{loading ? "Creating..." : "Create Policy on Guardian"}</AccentButton>
          </div>
        </GlassCard>
      )}

      {/* DETAIL VIEW */}
      {view === "detail" && sel && (
        <GlassCard hover={false}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <div style={secH}><FileText size={15} color="#3B82F6" /> {sel.name}</div>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, background: stC(sel.status).bg, color: stC(sel.status).color, border: `1px solid ${stC(sel.status).border}`, padding: "2px 10px", borderRadius: 10, display: "inline-block", marginTop: 4 }}>{sel.status}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {sel.status !== "PUBLISH" && sel.status !== "PUBLISHED" && <AccentButton size="sm" onClick={() => publishPolicy(sel.id)} disabled={loading} icon={<Zap size={13} />}>{loading ? "Publishing..." : "Publish"}</AccentButton>}
              <AccentButton size="sm" variant="secondary" onClick={() => { setRwCid(""); setRwReason(""); setRwRes(null); setView("reward"); }} icon={<Award size={13} />}>Reward Compliance</AccentButton>
            </div>
          </div>
          {sel.description && <div style={dBlk}><span style={dLbl}>Description</span><p style={dVal}>{sel.description}</p></div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
            <div style={dBlk}><span style={dLbl}>Policy ID</span><span style={{ ...dVal, fontFamily: "monospace", fontSize: "0.78rem" }}>{sel.id}</span></div>
            {sel.version && <div style={dBlk}><span style={dLbl}>Version</span><span style={dVal}>{sel.version}</span></div>}
            {sel.topicId && <div style={dBlk}><span style={dLbl}>Policy Topic</span><a href={hsTopicUrl(sel.topicId)} target="_blank" rel="noopener noreferrer" style={hsLnkL}>{sel.topicId} <ExternalLink size={12} /></a></div>}
            {sel.instanceTopicId && <div style={dBlk}><span style={dLbl}>Instance Topic</span><a href={hsTopicUrl(sel.instanceTopicId)} target="_blank" rel="noopener noreferrer" style={hsLnkL}>{sel.instanceTopicId} <ExternalLink size={12} /></a></div>}
            {sel.messageId && <div style={dBlk}><span style={dLbl}>Message ID</span><a href={hsTxUrl(sel.messageId)} target="_blank" rel="noopener noreferrer" style={hsLnkL}>{sel.messageId.length > 30 ? sel.messageId.slice(0, 30) + "..." : sel.messageId} <ExternalLink size={12} /></a></div>}
            {sel.owner && <div style={dBlk}><span style={dLbl}>Owner</span><span style={dVal}>{sel.owner}</span></div>}
          </div>
          <div style={{ marginTop: "1.25rem" }}>
            <div style={secH}><Shield size={14} color="#14B8A6" /> Platform Enforcement</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginTop: "0.5rem" }}>
              {ENFORCE_MODULES.map(m => {
                const pub = sel.status === "PUBLISH" || sel.status === "PUBLISHED";
                const on = pub || ["Emissions Calculator","MRV Verification","Carbon Passports","Supply Chain","Claims"].includes(m.module);
                return (
                  <div key={m.module} style={{ ...enfCard, borderColor: on ? "#A7F3D0" : "#E2E8F0", background: on ? "#F0FDF4" : "#FAFBFC" }}>
                    <span style={{ fontSize: "1.1rem" }}>{m.icon}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: on ? "#059669" : "#94A3B8" }}>{m.module}</span>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: on ? "#059669" : "#94A3B8", display: "flex", alignItems: "center", gap: 3 }}>{on ? <><CheckCircle size={10} /> Enforced</> : <><Clock size={10} /> Pending</>}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>
      )}

      {/* REWARD VIEW */}
      {view === "reward" && sel && (
        <GlassCard hover={false}>
          <div style={secH}><Award size={15} color="#D97706" /> Reward Policy Compliance</div>
          <p style={{ fontSize: "0.78rem", color: "#64748B", margin: "0 0 0.75rem" }}>Reward companies adhering to <span style={{ fontWeight: 700, color: "#0F172A" }}>{sel.name}</span> with 500 CCR tokens.</p>
          <GlassCard hover={false} padding="0.75rem 1rem" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", marginBottom: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              <div><span style={dLbl}>Policy</span><span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0F172A", display: "block" }}>{sel.name}</span></div>
              <div><span style={dLbl}>Status</span><span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#059669", display: "block" }}>{sel.status}</span></div>
              <div><span style={dLbl}>Reward</span><span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#D97706", display: "block" }}>500 CCR</span></div>
            </div>
          </GlassCard>
          <FormField label="Company" value={rwCid} onChange={setRwCid} options={coOpts} required />
          <FormField label="Reason" value={rwReason} onChange={setRwReason} placeholder="e.g. Achieved full compliance with emissions reporting" />
          <AccentButton onClick={rewardCompany} disabled={loading || !rwCid} fullWidth size="lg" icon={<Award size={15} />} style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>{loading ? "Processing..." : "Distribute 500 CCR Reward"}</AccentButton>
          {rwRes && (
            <div style={succBox}>
              <CheckCircle size={16} color="#059669" />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#059669" }}>Reward Distributed Successfully</div>
                <div style={{ fontSize: "0.75rem", color: "#065f46", marginTop: 2 }}>{rwRes.amount} CCR tokens awarded</div>
                {rwRes.transactionId && <a href={hsTxUrl(rwRes.transactionId)} target="_blank" rel="noopener noreferrer" style={{ ...hsLnkL, marginTop: 4, display: "inline-flex" }}>View on HashScan <ExternalLink size={11} /></a>}
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}

/* Styles */
const pgT: CSSProperties = { fontSize: "1.25rem", fontWeight: 700, color: "#0F172A", margin: 0, fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: "0.5rem" };
const pgS: CSSProperties = { fontSize: "0.82rem", color: "#64748B", margin: "0.2rem 0 0" };
const secH: CSSProperties = { fontSize: "0.88rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem", paddingBottom: "0.35rem", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "'Space Grotesk', sans-serif" };
const polT: CSSProperties = { fontWeight: 700, fontSize: "0.88rem", color: "#0F172A", fontFamily: "'Space Grotesk', sans-serif" };
const polD: CSSProperties = { fontSize: "0.75rem", color: "#64748B", margin: "0 0 0.5rem", lineHeight: 1.4 };
const mRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.3rem" };
const mLbl: CSSProperties = { fontSize: "0.68rem", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" };
const mVal: CSSProperties = { fontSize: "0.75rem", color: "#475569", fontWeight: 500 };
const hsLnk: CSSProperties = { fontSize: "0.72rem", fontWeight: 600, color: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 };
const hsLnkL: CSSProperties = { fontSize: "0.8rem", fontWeight: 600, color: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 };
const cBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, padding: "0.3rem 0.6rem", borderRadius: 8, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0", transition: "all 0.15s" };
const dBlk: CSSProperties = { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "0.65rem 0.85rem" };
const dLbl: CSSProperties = { fontSize: "0.68rem", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em", display: "block", marginBottom: 2 };
const dVal: CSSProperties = { fontSize: "0.82rem", color: "#0F172A", fontWeight: 500, display: "block" };
const enfCard: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "0.65rem", borderRadius: 10, border: "1px solid #E2E8F0", textAlign: "center" };
const ldT: CSSProperties = { fontSize: "0.82rem", color: "#94A3B8", textAlign: "center", padding: "2rem 0" };
const actPulse: CSSProperties = { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px rgba(16,185,129,0.5)" };
const succBox: CSSProperties = { display: "flex", alignItems: "flex-start", gap: "0.65rem", marginTop: "0.75rem", padding: "0.85rem", background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 12 };