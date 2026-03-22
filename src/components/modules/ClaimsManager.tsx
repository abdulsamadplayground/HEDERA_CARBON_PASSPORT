"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";

const CLAIM_TYPE_OPTIONS: SelectOption[] = [
  { value: "LOW_CARBON", label: "Low Carbon" },
  { value: "CARBON_NEUTRAL", label: "Carbon Neutral" },
  { value: "NET_ZERO", label: "Net Zero" },
  { value: "RENEWABLE_ENERGY", label: "Renewable Energy" },
  { value: "CIRCULAR_ECONOMY", label: "Circular Economy" },
  { value: "FAIR_TRADE", label: "Fair Trade" },
];

interface Claim {
  id: string;
  claimType: string;
  status: string;
  createdAt: string;
  attestedAt?: string;
  verifierId?: string;
}

export default function ClaimsManager() {
  const { call, loading } = useApi();
  const { companies } = useCompanies();
  const [view, setView] = useState<"list" | "submit" | "attest">("list");
  const [companyId, setCompanyId] = useState("");
  const [form, setForm] = useState({ claimType: "", evidenceRefs: "" });
  const [attestForm, setAttestForm] = useState({ claimId: "", verifierId: "", credentialHash: "", expiryDate: "" });
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const companyOptions: SelectOption[] = companies.map((c) => ({
    value: c.id,
    label: `${c.companyName} (${c.sector})`,
  }));

  const claimOptions: SelectOption[] = claims.map((c) => ({
    value: c.id,
    label: `${(c.claimType || "").replace(/_/g, " ")} — ${c.status}`,
  }));

  const fetchClaims = async (cId: string) => {
    if (!cId) { setClaims([]); return; }
    setLoadingClaims(true);
    try {
      const res = await fetch(`/api/claims/company/${cId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setClaims(json.data);
      else setClaims([]);
    } catch { setClaims([]); }
    finally { setLoadingClaims(false); }
  };

  useEffect(() => { if (companyId) fetchClaims(companyId); }, [companyId]);

  const submitClaim = async () => {
    const res = await call("/api/claims", {
      method: "POST",
      body: {
        companyId, claimType: form.claimType,
        evidenceReferences: form.evidenceRefs.split(",").map((s) => s.trim()).filter(Boolean),
      },
      txType: "Claim Submission",
      txDescription: `Submitted ${(form.claimType || "").replace(/_/g, " ")} claim`,
    });
    if (res.data) { setResult(res.data); fetchClaims(companyId); }
  };

  const attestClaim = async () => {
    const res = await call(`/api/claims/${attestForm.claimId}/attest`, {
      method: "POST",
      body: { verifierId: attestForm.verifierId, credentialHash: attestForm.credentialHash, expiryDate: attestForm.expiryDate },
      txType: "Claim Attestation (VCLAIM)",
      txDescription: `Attested claim`,
    });
    if (res.data) { setResult(res.data); fetchClaims(companyId); }
  };

  const statusColor = (s: string) => {
    if (s === "ATTESTED") return { bg: "#ecfdf5", color: "#065f46" };
    if (s === "REJECTED") return { bg: "#fef2f2", color: "#991b1b" };
    if (s === "EXPIRED") return { bg: "#fefce8", color: "#854d0e" };
    return { bg: "#f0f9ff", color: "#0c4a6e" };
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div>
          <h3 style={heading}>✅ Verifiable Claims</h3>
          <p style={subtext}>Submit sustainability claims and attest with VCLAIM NFTs</p>
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {view === "list" ? (
            <>
              <button onClick={() => { setView("submit"); setResult(null); }} style={createBtn}>+ Submit Claim</button>
              <button onClick={() => { setView("attest"); setResult(null); }} style={{ ...createBtn, background: "#8b5cf6" }}>🔏 Attest</button>
            </>
          ) : (
            <button onClick={() => { setView("list"); setResult(null); }} style={backBtn}>← Back</button>
          )}
        </div>
      </div>

      <FormField label="Company" value={companyId} onChange={setCompanyId} options={companyOptions} required />

      {view === "list" && (
        <>
          {loadingClaims && <p style={loadingText}>Loading claims...</p>}
          {!loadingClaims && companyId && claims.length === 0 && <p style={emptyText}>No claims found for this company.</p>}
          {claims.map((c, i) => {
            const sc = statusColor(c.status || "");
            return (
              <div key={c.id} style={{ ...dataCard, animationDelay: `${i * 0.08}s` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={cardTitle}>{(c.claimType || "").replace(/_/g, " ")}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, background: sc.bg, color: sc.color, padding: "0.15rem 0.5rem", borderRadius: 12 }}>{c.status}</span>
                </div>
                <span style={cardDate}>{new Date(c.createdAt).toLocaleDateString()}{c.attestedAt ? ` · Attested ${new Date(c.attestedAt).toLocaleDateString()}` : ""}</span>
              </div>
            );
          })}
        </>
      )}

      {view === "submit" && (
        <>
          <div style={formGrid}>
            <FormField label="Claim Type" value={form.claimType} onChange={(v) => setForm({ ...form, claimType: v })} options={CLAIM_TYPE_OPTIONS} required />
          </div>
          <FormField label="Evidence References" value={form.evidenceRefs} onChange={(v) => setForm({ ...form, evidenceRefs: v })} placeholder="Comma-separated URLs or hashes" hint="e.g. https://evidence.example.com/report1" />
          <button onClick={submitClaim} disabled={loading} style={submitBtn}>{loading ? "Submitting..." : "Submit Claim"}</button>
          {result && <pre style={resultBox}>{JSON.stringify(result, null, 2)}</pre>}
        </>
      )}

      {view === "attest" && (
        <>
          <div style={formGrid}>
            <FormField label="Claim" value={attestForm.claimId} onChange={(v) => setAttestForm({ ...attestForm, claimId: v })} options={claimOptions} required />
            <FormField label="Verifier Company" value={attestForm.verifierId} onChange={(v) => setAttestForm({ ...attestForm, verifierId: v })} options={companyOptions} required />
            <FormField label="Credential Hash" value={attestForm.credentialHash} onChange={(v) => setAttestForm({ ...attestForm, credentialHash: v })} placeholder="0x..." required />
            <FormField label="Expiry Date" value={attestForm.expiryDate} onChange={(v) => setAttestForm({ ...attestForm, expiryDate: v })} type="datetime-local" />
          </div>
          <button onClick={attestClaim} disabled={loading} style={submitBtn}>{loading ? "Attesting..." : "Attest Claim"}</button>
          {result && <pre style={resultBox}>{JSON.stringify(result, null, 2)}</pre>}
        </>
      )}

      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: "1.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" };
const heading: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "#1e293b", margin: 0 };
const subtext: React.CSSProperties = { fontSize: "0.82rem", color: "#64748b", margin: 0 };
const formGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" };
const submitBtn: React.CSSProperties = { width: "100%", padding: "0.65rem", borderRadius: 10, background: "#10b981", color: "#fff", fontWeight: 600, fontSize: "0.88rem", marginTop: "0.5rem", border: "none", cursor: "pointer" };
const resultBox: React.CSSProperties = { marginTop: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", fontSize: "0.75rem", color: "#475569", overflow: "auto", maxHeight: 200, fontFamily: "monospace" };
const createBtn: React.CSSProperties = { padding: "0.4rem 0.85rem", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, background: "#10b981", color: "#fff", border: "none", cursor: "pointer" };
const backBtn: React.CSSProperties = { padding: "0.4rem 0.85rem", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", cursor: "pointer" };
const dataCard: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.5rem", animation: "fadeSlideIn 0.35s ease both" };
const cardTitle: React.CSSProperties = { fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" };
const cardDate: React.CSSProperties = { fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.25rem", display: "block" };
const loadingText: React.CSSProperties = { fontSize: "0.82rem", color: "#94a3b8", textAlign: "center", padding: "1rem 0" };
const emptyText: React.CSSProperties = { fontSize: "0.82rem", color: "#94a3b8", textAlign: "center", padding: "1rem 0" };
