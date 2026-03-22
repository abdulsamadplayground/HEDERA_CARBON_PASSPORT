"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

interface ER { id:string; reportingPeriod:string; totalTCO2e:number; scope1TCO2e:number; scope2TCO2e:number; scope3TCO2e:number; calculatedAt:string; breakdownJson?:string|null; standardsReference?:string|null; }
interface SBD { scope:number; totalTCO2e:number; categories:{category:string;tCO2e:number;methodology:string}[]; }
interface STD { ghgProtocolVersion:string; iso14067Clauses:string[]; iso14040LifecycleStages:string[]; calculationMethodology:string; }

function buildFB(r:ER):SBD[] {
  const s:SBD[]=[];
  if(r.scope1TCO2e>0) s.push({scope:1,totalTCO2e:r.scope1TCO2e,categories:[{category:"Direct Combustion",tCO2e:r.scope1TCO2e,methodology:"GHG Protocol Scope 1"}]});
  if(r.scope2TCO2e>0) s.push({scope:2,totalTCO2e:r.scope2TCO2e,categories:[{category:"Electricity location-based",tCO2e:r.scope2TCO2e*1.15,methodology:"GHG Protocol Scope 2 location-based"},{category:"Electricity market-based",tCO2e:r.scope2TCO2e,methodology:"GHG Protocol Scope 2 market-based"}]});
  if(r.scope3TCO2e>0) s.push({scope:3,totalTCO2e:r.scope3TCO2e,categories:[{category:"Value Chain",tCO2e:r.scope3TCO2e,methodology:"GHG Protocol Scope 3"}]});
  return s;
}
function buildFS(r:ER):STD {
  const c=["6.3.1"],st:string[]=[];
  if(r.scope1TCO2e>0){c.push("6.3.2");st.push("production");}
  if(r.scope2TCO2e>0){c.push("6.3.3");st.push("production","distribution");}
  if(r.scope3TCO2e>0){c.push("6.4.2");st.push("raw_material_acquisition","distribution","use","end_of_life");}
  return{ghgProtocolVersion:"GHG Protocol Corporate Standard v2",iso14067Clauses:c,iso14040LifecycleStages:[...new Set(st.length?st:["production"])],calculationMethodology:[r.scope1TCO2e>0&&"direct-measurement",r.scope2TCO2e>0&&"location-based, market-based",r.scope3TCO2e>0&&"activity-based"].filter(Boolean).join(", ")||"activity-based"};
}
const SC=["#10B981","#3B82F6","#8B5CF6"];
const SN=["Scope 1 - Direct","Scope 2 - Indirect (Energy)","Scope 3 - Value Chain"];

export default function EmissionsCalculator({ preselectedCompanyId, onSuccess }: { preselectedCompanyId?: string; onSuccess?: () => void }) {
  const { call, loading } = useApi();
  const { companies } = useCompanies();
  const [view, setView] = useState<"list"|"create">("list");
  const [cid, setCid] = useState(preselectedCompanyId || "");
  const [recs, setRecs] = useState<ER[]>([]);
  const [ld, setLd] = useState(false);
  const [exp, setExp] = useState<string|null>(null);
  const [rp, setRp] = useState(""); const [ft, setFt] = useState(""); const [qty, setQty] = useState("");
  const [eq, setEq] = useState(""); const [kwh, setKwh] = useState(""); const [gr, setGr] = useState("");
  const [ren, setRen] = useState(""); const [s3c, setS3c] = useState(""); const [ad, setAd] = useState("");
  const [am, setAm] = useState(""); const [sp, setSp] = useState("");
  const co: SelectOption[] = companies.map(c => ({ value: c.id, label: `${c.companyName} (${c.hederaAccountId})` }));
  const selCo = companies.find(c => c.id === cid);
  const fuelOpts = useMemo(() => selCo ? (FUEL[selCo.sector] || FUEL_DEF) : FUEL_DEF, [selCo]);
  const fetchR = useCallback(async (id: string) => { if (!id) { setRecs([]); return; } setLd(true); try { const r = await fetch(`/api/emissions/${id}`); const j = await r.json(); if (j.success && Array.isArray(j.data)) setRecs(j.data); else setRecs([]); } catch { setRecs([]); } finally { setLd(false); } }, []);
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
  return (
    <div style={card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.5rem" }}>
        <div><h3 style={hd}>Emissions Calculator</h3><p style={st2}>GHG Protocol Scope 1/2/3 calculation engine</p></div>
        {view === "list" ? <button onClick={() => setView("create")} style={cbB}>+ Calculate</button> : <button onClick={() => setView("list")} style={bbB}>Back</button>}
      </div>
      <FormField label="Company" value={cid} onChange={setCid} options={co} required />
      {view === "list" && cid && recs.length > 0 && (
        <div style={sRow}>
          <div style={{ ...sCard, borderLeft:"3px solid #1e293b" }}><span style={sLbl}>Total</span><span style={sV}>{tAll.toFixed(2)} tCO2e</span></div>
          <div style={{ ...sCard, borderLeft:"3px solid #10B981" }}><span style={sLbl}>Scope 1</span><span style={{...sV,color:"#10B981"}}>{tS1.toFixed(2)}</span></div>
          <div style={{ ...sCard, borderLeft:"3px solid #3B82F6" }}><span style={sLbl}>Scope 2</span><span style={{...sV,color:"#3B82F6"}}>{tS2.toFixed(2)}</span></div>
          <div style={{ ...sCard, borderLeft:"3px solid #8B5CF6" }}><span style={sLbl}>Scope 3</span><span style={{...sV,color:"#8B5CF6"}}>{tS3.toFixed(2)}</span></div>
        </div>
      )}
      {view === "list" && (<>
        {ld && <p style={lt}>Loading emissions records...</p>}
        {!ld && cid && recs.length === 0 && <p style={lt}>No emissions records found.</p>}
        {recs.map((r, i) => {
          const isOpen = exp === r.id;
          const fb = buildFB(r);
          const fs = buildFS(r);
          const total = r.totalTCO2e || 0;
          const parts = [r.scope1TCO2e, r.scope2TCO2e, r.scope3TCO2e];
          return (
            <div key={r.id} style={{...dc, cursor:"pointer", borderLeft: isOpen ? "3px solid #3B82F6" : "3px solid transparent"}} onClick={() => setExp(isOpen ? null : r.id)}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={ct2}>Period {r.reportingPeriod || "N/A"}</span>
                <span style={tb}>{total.toLocaleString(undefined,{maximumFractionDigits:2})} tCO2e</span>
              </div>
              <div style={cr2}>{parts.map((v,j) => v > 0 ? <span key={j} style={{color:SC[j]}}>{SN[j]}: {v.toLocaleString(undefined,{maximumFractionDigits:2})}</span> : null)}</div>
              <span style={cd2}>{new Date(r.calculatedAt).toLocaleDateString()}</span>
              {isOpen && total > 0 && (
                <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid #e2e8f0" }}>
                  <div style={{ display:"flex", height:6, borderRadius:3, overflow:"hidden", marginBottom:8, background:"#e2e8f0" }}>
                    {parts.map((v,j) => v > 0 ? <div key={j} style={{width:`${(v/total)*100}%`,background:SC[j]}} /> : null)}
                  </div>
                  {fb.map(sc => (
                    <div key={sc.scope} style={{marginBottom:8}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:SC[sc.scope-1],marginBottom:4}}>Scope {sc.scope} - {sc.totalTCO2e.toLocaleString()} tCO2e</div>
                      {sc.categories.map((c,ci) => (<div key={ci} style={{fontSize:"0.72rem",color:"#475569",paddingLeft:12,marginBottom:2}}>- {c.category}: {c.tCO2e.toLocaleString()} tCO2e <span style={{color:"#94a3b8"}}>({c.methodology})</span></div>))}
                    </div>
                  ))}
                  <div style={{fontSize:"0.7rem",color:"#64748b",marginTop:8,padding:"0.5rem",background:"#f8fafc",borderRadius:8}}>Standards: {fs.ghgProtocolVersion} | ISO 14067 {fs.iso14067Clauses.join(", ")} | {fs.calculationMethodology}</div>
                </div>
              )}
            </div>
          );
        })}
      </>)}
      {view === "create" && (<>
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
      </>)}
    </div>
  );
}

const card: React.CSSProperties = { background:"#fff", borderRadius:12, padding:"1.5rem", border:"1px solid #e2e8f0", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" };
const hd: React.CSSProperties = { fontSize:"1.05rem", fontWeight:700, color:"#1e293b", margin:0 };
const st2: React.CSSProperties = { fontSize:"0.82rem", color:"#64748b", margin:0 };
const sbB: React.CSSProperties = { width:"100%", padding:"0.65rem", borderRadius:10, background:"#3b82f6", color:"#fff", fontWeight:600, fontSize:"0.88rem", marginTop:"0.5rem", border:"none", cursor:"pointer" };
const cbB: React.CSSProperties = { padding:"0.4rem 0.85rem", borderRadius:8, fontSize:"0.8rem", fontWeight:600, background:"#3b82f6", color:"#fff", border:"none", cursor:"pointer" };
const bbB: React.CSSProperties = { padding:"0.4rem 0.85rem", borderRadius:8, fontSize:"0.8rem", fontWeight:600, background:"#f1f5f9", color:"#475569", border:"1px solid #e2e8f0", cursor:"pointer" };
const dc: React.CSSProperties = { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"0.75rem 1rem", marginBottom:"0.5rem", transition:"border-color 0.2s" };
const ct2: React.CSSProperties = { fontWeight:700, fontSize:"0.88rem", color:"#1e293b" };
const cr2: React.CSSProperties = { display:"flex", gap:"1rem", fontSize:"0.75rem", marginTop:"0.35rem" };
const cd2: React.CSSProperties = { fontSize:"0.7rem", color:"#94a3b8", marginTop:"0.25rem", display:"block" };
const tb: React.CSSProperties = { fontSize:"0.78rem", fontWeight:700, background:"#f0f9ff", color:"#0c4a6e", padding:"0.15rem 0.5rem", borderRadius:12 };
const sl: React.CSSProperties = { fontSize:"0.82rem", fontWeight:700, color:"#334155", marginTop:"0.75rem", marginBottom:"0.25rem", paddingBottom:"0.25rem", borderBottomWidth:1, borderBottomStyle:"solid", borderBottomColor:"#e2e8f0" };
const lt: React.CSSProperties = { fontSize:"0.82rem", color:"#94a3b8", textAlign:"center", padding:"1rem 0" };
const sRow: React.CSSProperties = { display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginBottom:"0.75rem" };
const sCard: React.CSSProperties = { background:"#f8fafc", borderRadius:8, padding:"0.6rem 0.75rem", border:"1px solid #e2e8f0" };
const sLbl: React.CSSProperties = { fontSize:"0.65rem", color:"#94a3b8", display:"block", textTransform:"uppercase", letterSpacing:"0.04em", fontWeight:600 };
const sV: React.CSSProperties = { fontSize:"0.95rem", fontWeight:700, color:"#1e293b", display:"block", marginTop:2 };