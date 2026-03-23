"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";

const PO: SelectOption[] = [{value:"2024-H1",label:"2024 H1"},{value:"2024-H2",label:"2024 H2"},{value:"2025-H1",label:"2025 H1"},{value:"2025-H2",label:"2025 H2"},{value:"2026-H1",label:"2026 H1"},{value:"2026-H2",label:"2026 H2"}];
const FUEL: Record<string,SelectOption[]> = {
  ENERGY:[{value:"natural_gas",label:"Natural Gas"},{value:"diesel",label:"Diesel"},{value:"coal",label:"Coal"},{value:"fuel_oil",label:"Fuel Oil"}],
  MANUFACTURING:[{value:"natural_gas",label:"Natural Gas"},{value:"diesel",label:"Diesel"},{value:"lpg",label:"LPG"},{value:"process_emissions",label:"Process Emissions"}],
  TRANSPORTATION:[{value:"diesel",label:"Diesel"},{value:"gasoline",label:"Gasoline"},{value:"jet_fuel",label:"Jet Fuel"},{value:"marine_fuel",label:"Marine Fuel"}],
  AGRICULTURE:[{value:"diesel",label:"Diesel"},{value:"fertilizer",label:"Fertilizer"},{value:"methane_livestock",label:"Methane (Livestock)"},{value:"natural_gas",label:"Natural Gas"}],
  SERVICES:[{value:"natural_gas",label:"Natural Gas"},{value:"diesel",label:"Diesel"},{value:"electricity_backup",label:"Electricity Backup"}],
};
const FUEL_DEF: SelectOption[] = [{value:"natural_gas",label:"Natural Gas"},{value:"diesel",label:"Diesel"}];
const EO: SelectOption[] = [{value:"BOILER",label:"Boiler"},{value:"FURNACE",label:"Furnace"},{value:"VEHICLE_FLEET",label:"Vehicle Fleet"},{value:"GENERATOR",label:"Generator"}];
const GO: SelectOption[] = [{value:"US_EAST",label:"US East"},{value:"US_WEST",label:"US West"},{value:"EU_WEST",label:"EU West"},{value:"ASIA_PACIFIC",label:"Asia Pacific"}];
const S3: SelectOption[] = [{value:"UPSTREAM_SUPPLIERS",label:"Upstream Suppliers"},{value:"DOWNSTREAM_DISTRIBUTION",label:"Downstream Distribution"},{value:"BUSINESS_TRAVEL",label:"Business Travel"},{value:"EMPLOYEE_COMMUTING",label:"Employee Commuting"}];
const AO: SelectOption[] = [{value:"SPEND_BASED",label:"Spend-Based"},{value:"ACTIVITY_BASED",label:"Activity-Based"}];

interface ER { id:string; reportingPeriod:string; totalTCO2e:number; scope1TCO2e:number; scope2TCO2e:number; scope3TCO2e:number; calculatedAt:string; }
interface ProjPoint { month: string; projectedTCO2e: number; upperBound: number; lowerBound: number; }
interface ProjResult { dataPoints: ProjPoint[]; trend?: string; complianceStatus?: string; recommendations?: string[]; totalProjectedTCO2e?: number; }
const SC=["#10B981","#3B82F6","#8B5CF6"];
const SN=["Scope 1","Scope 2","Scope 3"];

/* ── Animated wrapper ── */
function AnimatedCard({ delay, children, style }: { delay: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{ ...cCard, ...style, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
      {children}
    </div>
  );
}

/* ── Donut Chart ── */
function DonutChart({ parts, total }: { parts: number[]; total: number }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => { setProgress(0); const t = setTimeout(() => setProgress(1), 100); return () => clearTimeout(t); }, [parts, total]);
  const r = 44, cx = 55, cy = 55, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 110 110" width="100%" style={{ maxWidth: 180 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth="14" />
      {parts.map((v, i) => {
        if (v <= 0) return null;
        const pct = v / total;
        const dash = circ * pct * progress;
        const gap = circ - dash;
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={SC[i]} strokeWidth="14" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset * progress} transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "all 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }} />;
        offset += circ * pct;
        return el;
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0F172A">{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="6" fill="#94A3B8">tCO2e total</text>
    </svg>
  );
}

/* ── Bar Chart ── */
function BarChart({ records }: { records: ER[] }) {
  const [grow, setGrow] = useState(false);
  useEffect(() => { setGrow(false); const t = setTimeout(() => setGrow(true), 200); return () => clearTimeout(t); }, [records]);
  const sorted = [...records].sort((a, b) => a.reportingPeriod.localeCompare(b.reportingPeriod));
  const maxVal = Math.max(...sorted.map(r => r.totalTCO2e), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140, padding: "0 0.5rem" }}>
      {sorted.map((r, idx) => {
        const h = grow ? (r.totalTCO2e / maxVal) * 110 : 0;
        const s1h = r.totalTCO2e > 0 ? (r.scope1TCO2e / r.totalTCO2e) * h : 0;
        const s2h = r.totalTCO2e > 0 ? (r.scope2TCO2e / r.totalTCO2e) * h : 0;
        const s3h = Math.max(0, h - s1h - s2h);
        return (
          <div key={r.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "0.62rem", color: "#64748B", fontWeight: 600, marginBottom: 4 }}>{r.totalTCO2e.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div style={{ width: "100%", maxWidth: 40, display: "flex", flexDirection: "column", borderRadius: "5px 5px 0 0", overflow: "hidden" }}>
              {s3h > 0 && <div style={{ height: s3h, background: SC[2], transition: `height 0.8s ease ${idx * 0.1}s` }} />}
              {s2h > 0 && <div style={{ height: s2h, background: SC[1], transition: `height 0.8s ease ${idx * 0.1}s` }} />}
              {s1h > 0 && <div style={{ height: s1h, background: SC[0], transition: `height 0.8s ease ${idx * 0.1}s` }} />}
            </div>
            <span style={{ fontSize: "0.62rem", color: "#94A3B8", marginTop: 6, textAlign: "center", fontWeight: 500 }}>{r.reportingPeriod}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Projection Line Chart ── */
function ProjectionChart({ projections, trend, status }: { projections: ProjPoint[]; trend?: string; status?: string }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { setDrawn(false); const t = setTimeout(() => setDrawn(true), 300); return () => clearTimeout(t); }, [projections]);
  if (projections.length === 0) return <p style={{ fontSize: "0.85rem", color: "#94A3B8", textAlign: "center", padding: "1.5rem 0" }}>No projection data yet. Calculate emissions first.</p>;
  const allVals = projections.flatMap(p => [p.projectedTCO2e, p.lowerBound, p.upperBound]);
  const minV = Math.min(...allVals) * 0.85;
  const maxV = Math.max(...allVals) * 1.1;
  const range = maxV - minV || 1;
  const w = 600, h = 180, pad = { l: 55, r: 20, t: 15, b: 30 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const xStep = projections.length > 1 ? cw / (projections.length - 1) : cw;
  const toY = (v: number) => pad.t + ch - ((v - minV) / range) * ch;
  const toX = (i: number) => pad.l + i * xStep;
  const linePts = projections.map((p, i) => `${toX(i)},${toY(p.projectedTCO2e)}`).join(" ");
  const bandPts = projections.map((p, i) => `${toX(i)},${toY(p.upperBound)}`).join(" ") + " " + [...projections].reverse().map((p, i) => `${toX(projections.length - 1 - i)},${toY(p.lowerBound)}`).join(" ");
  const totalLen = projections.length * xStep * 1.5;
  const trendColor = trend === "DECREASING" ? "#10B981" : trend === "INCREASING" ? "#EF4444" : "#3B82F6";
  const statusColor = status === "ON_TRACK" ? "#10B981" : status === "NON_COMPLIANT" ? "#EF4444" : "#F59E0B";
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="xMidYMid meet">
        <polygon points={bandPts} fill="rgba(59,130,246,0.08)" stroke="none" style={{ opacity: drawn ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }} />
        <polyline points={linePts} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray={totalLen} strokeDashoffset={drawn ? 0 : totalLen} style={{ transition: "stroke-dashoffset 1.5s ease" }} />
        {projections.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.projectedTCO2e)} r="4" fill="#3B82F6" stroke="#fff" strokeWidth="2"
            style={{ opacity: drawn ? 1 : 0, transition: `opacity 0.4s ease ${0.3 + i * 0.15}s` }} />
        ))}
        {projections.map((p, i) => (
          <text key={`l${i}`} x={toX(i)} y={h - 6} textAnchor="middle" fontSize="7" fill="#64748B" fontWeight="500">{p.month.slice(5)}</text>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const v = minV + range * f;
          const y = toY(v);
          return <g key={f}><line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#E2E8F0" strokeWidth="0.5" /><text x={pad.l - 8} y={y + 3} textAnchor="end" fontSize="6.5" fill="#94A3B8">{v.toFixed(0)}</text></g>;
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 18, height: 3, background: "#3B82F6", borderRadius: 2 }} />
          <span style={{ fontSize: "0.7rem", color: "#64748B" }}>Predicted</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 18, height: 10, background: "rgba(59,130,246,0.08)", borderRadius: 3 }} />
          <span style={{ fontSize: "0.7rem", color: "#64748B" }}>Confidence Band</span>
        </div>
        {trend && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: trendColor }} />
            <span style={{ fontSize: "0.7rem", color: trendColor, fontWeight: 600 }}>{trend}</span>
          </div>
        )}
        {status && (
          <span style={{ fontSize: "0.66rem", fontWeight: 700, padding: "2px 10px", borderRadius: 8, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>{(status || "").replace(/_/g, " ")}</span>
        )}
      </div>
    </div>
  );
}

export default function EmissionsCalculator({ preselectedCompanyId, onSuccess }: { preselectedCompanyId?: string; onSuccess?: () => void }) {
  const { call, loading } = useApi();
  const { companies } = useCompanies();
  const [view, setView] = useState<"list"|"create">("list");
  const [cid, setCid] = useState(preselectedCompanyId || "");
  const [recs, setRecs] = useState<ER[]>([]);
  const [projResult, setProjResult] = useState<ProjResult | null>(null);
  const [ld, setLd] = useState(false);
  const [exp, setExp] = useState<string|null>(null);
  const [rp, setRp] = useState(""); const [ft, setFt] = useState(""); const [qty, setQty] = useState("");
  const [eq, setEq] = useState(""); const [kwh, setKwh] = useState(""); const [gr, setGr] = useState("");
  const [ren, setRen] = useState(""); const [s3c, setS3c] = useState(""); const [ad, setAd] = useState("");
  const [am, setAm] = useState(""); const [sp, setSp] = useState("");
  const co: SelectOption[] = companies.map(c => ({ value: c.id, label: `${c.companyName} (${c.hederaAccountId})` }));
  const selCo = companies.find(c => c.id === cid);
  const fuelOpts = useMemo(() => selCo ? (FUEL[selCo.sector] || FUEL_DEF) : FUEL_DEF, [selCo]);

  const fetchR = useCallback(async (id: string) => {
    if (!id) { setRecs([]); setProjResult(null); return; }
    setLd(true);
    try {
      const [eRes, pRes] = await Promise.all([
        fetch(`/api/emissions/${id}`),
        fetch(`/api/projections/${id}`).catch(() => null),
      ]);
      const eJ = await eRes.json();
      if (eJ.success && Array.isArray(eJ.data)) setRecs(eJ.data); else setRecs([]);
      if (pRes && pRes.ok) {
        const pJ = await pRes.json();
        if (pJ.success && Array.isArray(pJ.data) && pJ.data.length > 0) {
          setProjResult(pJ.data[0] as ProjResult);
        } else setProjResult(null);
      } else setProjResult(null);
    } catch { setRecs([]); setProjResult(null); }
    finally { setLd(false); }
  }, []);

  useEffect(() => { if (cid) fetchR(cid); }, [cid, fetchR]);
  useEffect(() => { if (preselectedCompanyId) setCid(preselectedCompanyId); }, [preselectedCompanyId]);
  useEffect(() => { setFt(""); }, [cid]);

  const submit = async () => {
    const body = { companyId: cid, reportingPeriod: rp, scope1: ft ? [{ fuelType: ft, quantityConsumed: Number(qty) || 0, equipmentCategory: eq }] : [], scope2: gr ? [{ electricityKwh: Number(kwh) || 0, gridRegion: gr, renewableCertificatesMwh: Number(ren) || 0 }] : [], scope3: s3c ? [{ category: s3c, activityData: Number(ad) || 0, allocationMethod: am, spendAmount: Number(sp) || 0 }] : [] };
    const r = await call("/api/emissions/calculate", { method: "POST", body, txType: "Emissions Calculation", txDescription: `Calculated emissions for ${rp}` });
    if (r.data) { fetchR(cid); onSuccess?.(); }
  };

  const tAll = recs.reduce((s, r) => s + (r.totalTCO2e ?? 0), 0);
  const tS1 = recs.reduce((s, r) => s + (r.scope1TCO2e ?? 0), 0);
  const tS2 = recs.reduce((s, r) => s + (r.scope2TCO2e ?? 0), 0);
  const tS3 = recs.reduce((s, r) => s + (r.scope3TCO2e ?? 0), 0);
  const hasData = !!(cid && recs.length > 0);
  const parts = [tS1, tS2, tS3];
  const projPoints = projResult?.dataPoints || [];
  const hasMultiple = recs.length > 1;

  return (
    <div style={{ width: "100%" }}>
      {/* ── Row 1: Header card ── */}
      <div style={topCard}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
          <div><h3 style={hd}>Emissions Calculator</h3><p style={st2}>GHG Protocol Scope 1/2/3 calculation engine</p></div>
          {view === "list" ? <button onClick={() => setView("create")} style={cbB}>+ Calculate</button> : <button onClick={() => setView("list")} style={bbB}>Back</button>}
        </div>
        <FormField label="Company" value={cid} onChange={setCid} options={co} required />
      </div>

      {/* ── Row 2: Stats ── */}
      {view === "list" && hasData && (
        <div style={sRow}>
          <div style={{ ...sCard, borderLeft:"3px solid #1e293b" }}><span style={sLbl}>Total</span><span style={sV}>{tAll.toFixed(2)} tCO2e</span></div>
          <div style={{ ...sCard, borderLeft:"3px solid #10B981" }}><span style={sLbl}>Scope 1</span><span style={{...sV,color:"#10B981"}}>{tS1.toFixed(2)}</span></div>
          <div style={{ ...sCard, borderLeft:"3px solid #3B82F6" }}><span style={sLbl}>Scope 2</span><span style={{...sV,color:"#3B82F6"}}>{tS2.toFixed(2)}</span></div>
          <div style={{ ...sCard, borderLeft:"3px solid #8B5CF6" }}><span style={sLbl}>Scope 3</span><span style={{...sV,color:"#8B5CF6"}}>{tS3.toFixed(2)}</span></div>
        </div>
      )}

      {/* ── Create form ── */}
      {view === "create" && (
        <div style={formCard}>
          <FormField label="Reporting Period" value={rp} onChange={setRp} options={PO} required />
          <div style={sl}>Scope 1 - Direct Emissions</div>
          <FormField label="Fuel Type" value={ft} onChange={setFt} options={fuelOpts} />
          <FormField label="Quantity Consumed" value={qty} onChange={setQty} type="number" placeholder="0" />
          <FormField label="Equipment Category" value={eq} onChange={setEq} options={EO} />
          <div style={sl}>Scope 2 - Indirect (Electricity)</div>
          <FormField label="Electricity (kWh)" value={kwh} onChange={setKwh} type="number" placeholder="0" />
          <FormField label="Grid Region" value={gr} onChange={setGr} options={GO} />
          <FormField label="Renewable Certificates (MWh)" value={ren} onChange={setRen} type="number" placeholder="0" />
          <div style={sl}>Scope 3 - Value Chain</div>
          <FormField label="Category" value={s3c} onChange={setS3c} options={S3} />
          <FormField label="Activity Data" value={ad} onChange={setAd} type="number" placeholder="0" />
          <FormField label="Allocation Method" value={am} onChange={setAm} options={AO} />
          <FormField label="Spend Amount" value={sp} onChange={setSp} type="number" placeholder="0" />
          <button onClick={submit} disabled={loading} style={sbB}>{loading ? "Calculating..." : "Calculate Emissions"}</button>
        </div>
      )}

      {/* ── Row 3: Charts grid — donut + bar/records side by side ── */}
      {view === "list" && hasData && (
        <div style={chartsRow}>
          {/* Donut breakdown */}
          <AnimatedCard delay={100} style={{ flex: hasMultiple ? "1 1 0" : "1 1 50%" }}>
            <div style={cTitle}>Scope Breakdown</div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ width: 170, flexShrink: 0 }}>
                <DonutChart parts={parts} total={tAll} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {parts.map((v, i) => v > 0 ? (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: SC[i], flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: SC[i] }}>{SN[i]}</span>
                      <span style={{ fontSize: "0.72rem", color: "#64748B", display: "block" }}>{v.toLocaleString(undefined, { maximumFractionDigits: 2 })} tCO2e ({((v / tAll) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                ) : null)}
              </div>
            </div>
          </AnimatedCard>

          {/* Bar chart (if multiple records) OR records list */}
          {hasMultiple ? (
            <AnimatedCard delay={300} style={{ flex: "1 1 0" }}>
              <div style={cTitle}>Historical Emissions by Period</div>
              <BarChart records={recs} />
              <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10 }}>
                {SN.map((n, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: SC[i] }} />
                    <span style={{ fontSize: "0.68rem", color: "#64748B" }}>{n}</span>
                  </div>
                ))}
              </div>
            </AnimatedCard>
          ) : (
            <AnimatedCard delay={300} style={{ flex: "1 1 50%" }}>
              <div style={cTitle}>Emissions Records</div>
              {recs.map((r) => {
                const total = r.totalTCO2e || 0;
                const rParts = [r.scope1TCO2e, r.scope2TCO2e, r.scope3TCO2e];
                return (
                  <div key={r.id} style={dc}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={ct2}>Period {r.reportingPeriod || "N/A"}</span>
                      <span style={tb}>{total.toLocaleString(undefined,{maximumFractionDigits:2})} tCO2e</span>
                    </div>
                    <div style={cr2}>{rParts.map((v,j) => v > 0 ? <span key={j} style={{color:SC[j]}}>{SN[j]}: {v.toLocaleString(undefined,{maximumFractionDigits:2})}</span> : null)}</div>
                    <span style={cd2}>{new Date(r.calculatedAt).toLocaleDateString()}</span>
                  </div>
                );
              })}
            </AnimatedCard>
          )}
        </div>
      )}

      {/* ── Row 4: Forecast (full width) ── */}
      {view === "list" && hasData && (
        <AnimatedCard delay={600} style={{ marginTop: "1rem" }}>
          <div style={cTitle}>6-Month Emissions Forecast</div>
          <ProjectionChart projections={projPoints} trend={projResult?.trend} status={projResult?.complianceStatus} />
          {projResult?.recommendations && projResult.recommendations.length > 0 && (
            <div style={{ marginTop: 12, padding: "0.7rem 1rem", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#92400E", marginBottom: 5 }}>Recommendations</div>
              {projResult.recommendations.map((r, i) => (
                <div key={i} style={{ fontSize: "0.7rem", color: "#78350F", marginBottom: 2 }}>• {r}</div>
              ))}
            </div>
          )}
        </AnimatedCard>
      )}

      {/* ── Row 5: Records list (when multiple — shown below charts) ── */}
      {view === "list" && hasData && hasMultiple && (
        <AnimatedCard delay={800} style={{ marginTop: "1rem" }}>
          <div style={cTitle}>Emissions Records</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {recs.map((r) => {
              const isOpen = exp === r.id;
              const total = r.totalTCO2e || 0;
              const rParts = [r.scope1TCO2e, r.scope2TCO2e, r.scope3TCO2e];
              return (
                <div key={r.id} style={{...dc, cursor:"pointer", borderLeft: isOpen ? "3px solid #3B82F6" : "3px solid transparent"}} onClick={() => setExp(isOpen ? null : r.id)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={ct2}>Period {r.reportingPeriod || "N/A"}</span>
                    <span style={tb}>{total.toLocaleString(undefined,{maximumFractionDigits:2})} tCO2e</span>
                  </div>
                  <div style={cr2}>{rParts.map((v,j) => v > 0 ? <span key={j} style={{color:SC[j]}}>{SN[j]}: {v.toLocaleString(undefined,{maximumFractionDigits:2})}</span> : null)}</div>
                  <span style={cd2}>{new Date(r.calculatedAt).toLocaleDateString()}</span>
                  {isOpen && total > 0 && (
                    <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid #e2e8f0" }}>
                      <div style={{ display:"flex", height:7, borderRadius:4, overflow:"hidden", background:"#e2e8f0" }}>
                        {rParts.map((v,j) => v > 0 ? <div key={j} style={{width:`${(v/total)*100}%`,background:SC[j]}} /> : null)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AnimatedCard>
      )}

      {/* Empty state */}
      {view === "list" && !hasData && (
        <>
          {ld && <p style={lt}>Loading emissions records...</p>}
          {!ld && cid && <p style={lt}>No emissions records found. Click &quot;+ Calculate&quot; to create your first record.</p>}
          {!ld && !cid && <p style={lt}>Select a company above to view emissions data.</p>}
        </>
      )}
    </div>
  );
}

/* ── Styles ── */
const topCard: React.CSSProperties = { background:"#fff", borderRadius:14, padding:"1.5rem 2rem", border:"1px solid #e2e8f0", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", marginBottom:"1rem", width:"100%" };
const formCard: React.CSSProperties = { background:"#fff", borderRadius:14, padding:"1.5rem 2rem", border:"1px solid #e2e8f0", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", width:"100%" };
const chartsRow: React.CSSProperties = { display: "flex", gap: "1rem", width: "100%", alignItems: "stretch" };
const cCard: React.CSSProperties = { background:"#fff", borderRadius:14, padding:"1.5rem 2rem", border:"1px solid #e2e8f0", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" };
const cTitle: React.CSSProperties = { fontSize:"0.92rem", fontWeight:700, color:"#334155", marginBottom:"1rem", fontFamily:"'Space Grotesk', sans-serif" };
const hd: React.CSSProperties = { fontSize:"1.15rem", fontWeight:700, color:"#1e293b", margin:0 };
const st2: React.CSSProperties = { fontSize:"0.82rem", color:"#64748b", margin:0 };
const sbB: React.CSSProperties = { width:"100%", padding:"0.75rem", borderRadius:10, background:"#3b82f6", color:"#fff", fontWeight:600, fontSize:"0.9rem", marginTop:"0.75rem", border:"none", cursor:"pointer" };
const cbB: React.CSSProperties = { padding:"0.5rem 1rem", borderRadius:8, fontSize:"0.85rem", fontWeight:600, background:"#3b82f6", color:"#fff", border:"none", cursor:"pointer" };
const bbB: React.CSSProperties = { padding:"0.5rem 1rem", borderRadius:8, fontSize:"0.85rem", fontWeight:600, background:"#f1f5f9", color:"#475569", border:"1px solid #e2e8f0", cursor:"pointer" };
const dc: React.CSSProperties = { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"0.85rem 1.1rem", marginBottom:"0.5rem", transition:"border-color 0.2s" };
const ct2: React.CSSProperties = { fontWeight:700, fontSize:"0.88rem", color:"#1e293b" };
const cr2: React.CSSProperties = { display:"flex", gap:"1rem", fontSize:"0.78rem", marginTop:"0.35rem" };
const cd2: React.CSSProperties = { fontSize:"0.72rem", color:"#94a3b8", marginTop:"0.25rem", display:"block" };
const tb: React.CSSProperties = { fontSize:"0.8rem", fontWeight:700, background:"#f0f9ff", color:"#0c4a6e", padding:"0.2rem 0.55rem", borderRadius:12 };
const sl: React.CSSProperties = { fontSize:"0.85rem", fontWeight:700, color:"#334155", marginTop:"0.75rem", marginBottom:"0.25rem", paddingBottom:"0.25rem", borderBottomWidth:1, borderBottomStyle:"solid", borderBottomColor:"#e2e8f0" };
const lt: React.CSSProperties = { fontSize:"0.85rem", color:"#94a3b8", textAlign:"center", padding:"1.5rem 0" };
const sRow: React.CSSProperties = { display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:"1rem", width:"100%" };
const sCard: React.CSSProperties = { background:"#fff", borderRadius:10, padding:"0.85rem 1rem", border:"1px solid #e2e8f0", boxShadow:"0 1px 4px rgba(0,0,0,0.03)" };
const sLbl: React.CSSProperties = { fontSize:"0.72rem", color:"#94a3b8", display:"block", textTransform:"uppercase", letterSpacing:"0.04em", fontWeight:600 };
const sV: React.CSSProperties = { fontSize:"1.1rem", fontWeight:700, color:"#1e293b", display:"block", marginTop:4 };
