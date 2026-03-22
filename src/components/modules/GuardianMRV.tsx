"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";

const LIFECYCLE_STAGES = ["RAW_MATERIAL_ACQUISITION", "PRODUCTION", "DISTRIBUTION", "USE", "END_OF_LIFE"];

const METHODOLOGY_OPTIONS: SelectOption[] = [
  { value: "ISO 14067:2018", label: "ISO 14067:2018 (Carbon Footprint)" },
  { value: "ISO 14040:2006", label: "ISO 14040:2006 (LCA Principles)" },
  { value: "ISO 14044:2006", label: "ISO 14044:2006 (LCA Requirements)" },
  { value: "GHG Protocol", label: "GHG Protocol" },
  { value: "PAS 2050", label: "PAS 2050" },
];

const FACTOR_OPTIONS: SelectOption[] = [
  { value: "CO2_EMISSION", label: "CO₂ Emission" },
  { value: "CH4_EMISSION", label: "CH₄ Emission" },
  { value: "N2O_EMISSION", label: "N₂O Emission" },
  { value: "HFC_EMISSION", label: "HFC Emission" },
  { value: "ENERGY_CONSUMPTION", label: "Energy Consumption" },
  { value: "WATER_USAGE", label: "Water Usage" },
];

const UNIT_OPTIONS: SelectOption[] = [
  { value: "kgCO2e/unit", label: "kgCO₂e/unit" },
  { value: "kgCO2e/kg", label: "kgCO₂e/kg" },
  { value: "kgCO2e/kWh", label: "kgCO₂e/kWh" },
  { value: "kgCO2e/L", label: "kgCO₂e/L" },
  { value: "MJ/unit", label: "MJ/unit" },
  { value: "L/unit", label: "L/unit" },
];

interface Submission {
  id: string;
  productOrBatchId: string;
  status: string;
  methodologyRef: string;
  lifecycleStages: string[];
  createdAt: string;
}

export default function GuardianMRV() {
  const { call, loading } = useApi();
  const { companies } = useCompanies();
  const [view, setView] = useState<"list" | "create">("list");
  const [companyId, setCompanyId] = useState("");
  const [companyDid, setCompanyDid] = useState("");
  const [productOrBatchId, setProductOrBatchId] = useState("");
  const [methodology, setMethodology] = useState("");
  const [selectedStages, setSelectedStages] = useState<string[]>(["PRODUCTION"]);
  const [factors, setFactors] = useState([{ factor: "CO2_EMISSION", value: "2.5", unit: "kgCO2e/unit" }]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const companyOptions: SelectOption[] = companies.map((c) => ({
    value: c.id,
    label: `${c.companyName} (${c.sector})`,
  }));

  const handleCompanyChange = (id: string) => {
    setCompanyId(id);
    const match = companies.find((c) => c.id === id);
    if (match?.did) setCompanyDid(match.did);
  };

  const fetchSubmissions = async (cId: string) => {
    if (!cId) { setSubmissions([]); return; }
    setLoadingData(true);
    try {
      const res = await fetch(`/api/guardian/credentials/${cId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setSubmissions(json.data);
      else setSubmissions([]);
    } catch { setSubmissions([]); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { if (companyId) fetchSubmissions(companyId); }, [companyId]);

  const toggleStage = (s: string) => {
    setSelectedStages((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const submit = async () => {
    const res = await call("/api/guardian/verify", {
      method: "POST",
      body: {
        companyId, companyDid, productOrBatchId,
        lifecycleStages: selectedStages,
        emissionFactors: factors.map((f) => ({ ...f, value: Number(f.value) })),
        methodologyReference: methodology,
        calculationData: { method: "LCA", version: "1.0" },
      },
      txType: "Guardian MRV Verification",
      txDescription: `Submitted LCA verification for ${productOrBatchId}`,
    });
    if (res.data) { setResult(res.data); fetchSubmissions(companyId); }
  };

  const statusColor = (s: string) => {
    if (s === "VERIFIED") return { bg: "#ecfdf5", color: "#065f46" };
    if (s === "REJECTED") return { bg: "#fef2f2", color: "#991b1b" };
    return { bg: "#f5f3ff", color: "#6d28d9" };
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div>
          <h3 style={heading}>🔬 Guardian MRV</h3>
          <p style={subtext}>Submit LCA data for ISO 14067/14040 verification</p>
        </div>
        {view === "list" ? (
          <button onClick={() => { setView("create"); setResult(null); }} style={createBtn}>+ New Submission</button>
        ) : (
          <button onClick={() => { setView("list"); setResult(null); }} style={backBtn}>← Back</button>
        )}
      </div>

      <FormField label="Company" value={companyId} onChange={handleCompanyChange} options={companyOptions} required />

      {view === "list" && (
        <>
          {loadingData && <p style={loadingText}>Loading submissions...</p>}
          {!loadingData && companyId && submissions.length === 0 && <p style={emptyText}>No Guardian submissions found.</p>}
          {submissions.map((s, i) => {
            const sc = statusColor(s.status || "");
            return (
              <div key={s.id} style={{ ...dataCard, animationDelay: `${i * 0.08}s` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={cardTitle}>{s.productOrBatchId || "N/A"}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, background: sc.bg, color: sc.color, padding: "0.15rem 0.5rem", borderRadius: 12 }}>{s.status}</span>
                </div>
                <div style={cardRow}>
                  <span>{s.methodologyRef || "N/A"}</span>
                  <span>{Array.isArray(s.lifecycleStages) ? s.lifecycleStages.length : 0} stages</span>
                </div>
                <span style={cardDate}>{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            );
          })}
        </>
      )}

      {view === "create" && (
        <>
          <div style={formGrid}>
            <FormField label="Company DID" value={companyDid} onChange={setCompanyDid} placeholder="did:hedera:testnet:..." hint="Auto-filled from company" />
            <FormField label="Product/Batch ID" value={productOrBatchId} onChange={setProductOrBatchId} placeholder="BATCH-001" required />
            <FormField label="Methodology" value={methodology} onChange={setMethodology} options={METHODOLOGY_OPTIONS} required />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem", display: "block" }}>
              Lifecycle Stages
            </label>
            <div style={chipRow}>
              {LIFECYCLE_STAGES.map((s) => (
                <button key={s} onClick={() => toggleStage(s)}
                  style={{ ...chipStyle, ...(selectedStages.includes(s) ? chipActiveStyle : {}) }}>
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div style={sectionHeader}>Emission Factors</div>
          {factors.map((f, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0 0.75rem", alignItems: "end" }}>
              <FormField label="Factor" value={f.factor} onChange={(v) => { const n = [...factors]; n[i] = { ...f, factor: v }; setFactors(n); }} options={FACTOR_OPTIONS} />
              <FormField label="Value" value={f.value} onChange={(v) => { const n = [...factors]; n[i] = { ...f, value: v }; setFactors(n); }} type="number" />
              <FormField label="Unit" value={f.unit} onChange={(v) => { const n = [...factors]; n[i] = { ...f, unit: v }; setFactors(n); }} options={UNIT_OPTIONS} />
              {factors.length > 1 && (
                <button onClick={() => setFactors(factors.filter((_, j) => j !== i))}
                  style={{ padding: "6px 10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontSize: 12, marginBottom: "0.75rem" }}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setFactors([...factors, { factor: "CO2_EMISSION", value: "0", unit: "kgCO2e/unit" }])}
            style={{ fontSize: "0.78rem", color: "#8b5cf6", background: "none", border: "none", cursor: "pointer", fontWeight: 600, marginBottom: "0.5rem" }}>
            + Add Factor
          </button>

          <button onClick={submit} disabled={loading} style={submitBtn}>{loading ? "Verifying..." : "Submit for Verification"}</button>
          {result !== null && <pre style={resultBox}>{JSON.stringify(result, null, 2)}</pre>}
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
const chipRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "0.35rem" };
const chipStyle: React.CSSProperties = { padding: "0.3rem 0.65rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: "#f1f5f9", color: "#475569", borderWidth: 1, borderStyle: "solid", borderColor: "#e2e8f0", cursor: "pointer" };
const chipActiveStyle: React.CSSProperties = { background: "#ede9fe", color: "#6d28d9", borderColor: "#c4b5fd" };
const sectionHeader: React.CSSProperties = { fontSize: "0.82rem", fontWeight: 700, color: "#8b5cf6", margin: "0.75rem 0 0.5rem", padding: "0.35rem 0", borderBottomWidth: 1, borderBottomStyle: "solid" as const, borderBottomColor: "#e2e8f0" };
const submitBtn: React.CSSProperties = { width: "100%", padding: "0.65rem", borderRadius: 10, background: "#8b5cf6", color: "#fff", fontWeight: 600, fontSize: "0.88rem", marginTop: "0.5rem", border: "none", cursor: "pointer" };
const resultBox: React.CSSProperties = { marginTop: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", fontSize: "0.75rem", color: "#475569", overflow: "auto", maxHeight: 200, fontFamily: "monospace" };
const createBtn: React.CSSProperties = { padding: "0.4rem 0.85rem", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, background: "#8b5cf6", color: "#fff", border: "none", cursor: "pointer" };
const backBtn: React.CSSProperties = { padding: "0.4rem 0.85rem", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", cursor: "pointer" };
const dataCard: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.5rem", animation: "fadeSlideIn 0.35s ease both" };
const cardTitle: React.CSSProperties = { fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" };
const cardRow: React.CSSProperties = { display: "flex", gap: "1rem", fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem" };
const cardDate: React.CSSProperties = { fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.25rem", display: "block" };
const loadingText: React.CSSProperties = { fontSize: "0.82rem", color: "#94a3b8", textAlign: "center", padding: "1rem 0" };
const emptyText: React.CSSProperties = { fontSize: "0.82rem", color: "#94a3b8", textAlign: "center", padding: "1rem 0" };
