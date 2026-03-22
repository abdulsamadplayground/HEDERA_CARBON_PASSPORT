"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Plus, ArrowLeft, MapPin, Package, Hash } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import GlassCard from "@/components/ui/GlassCard";
import AccentButton from "@/components/ui/AccentButton";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";
import type { CSSProperties } from "react";

const EVENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "MANUFACTURING_EVENT", label: "Manufacturing Event" },
  { value: "SHIPMENT_EVENT", label: "Shipment Event" },
  { value: "WAREHOUSE_EVENT", label: "Warehouse Event" },
  { value: "INSPECTION_EVENT", label: "Inspection Event" },
  { value: "CERTIFICATION_EVENT", label: "Certification Event" },
];

interface SCEvent {
  id: string;
  eventType: string;
  location: string;
  passportSerial?: number;
  createdAt: string;
  payload?: string;
}

export default function SupplyChain() {
  const { call, loading } = useApi();
  const { companies } = useCompanies();
  const [view, setView] = useState<"list" | "create">("list");
  const [companyId, setCompanyId] = useState("");
  const [form, setForm] = useState({ eventType: "MANUFACTURING_EVENT", passportSerial: "", location: "", notes: "" });
  const [events, setEvents] = useState<SCEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const companyOptions: SelectOption[] = companies.map((c) => ({
    value: c.id,
    label: `${c.companyName} (${c.sector})`,
  }));

  const fetchEvents = async (cId: string) => {
    if (!cId) { setEvents([]); return; }
    setLoadingEvents(true);
    try {
      const res = await fetch(`/api/supply-chain/events?companyId=${cId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setEvents(json.data);
      else setEvents([]);
    } catch { setEvents([]); }
    finally { setLoadingEvents(false); }
  };

  useEffect(() => { if (companyId) fetchEvents(companyId); }, [companyId]);

  const submitEvent = async () => {
    const res = await call("/api/supply-chain/events", {
      method: "POST",
      body: {
        eventType: form.eventType, companyId,
        ...(form.passportSerial ? { passportSerial: Number(form.passportSerial) } : {}),
        location: form.location,
        payload: { notes: form.notes },
      },
      txType: "Supply Chain Event",
      txDescription: `Submitted ${(form.eventType || "").replace(/_/g, " ").toLowerCase()}`,
    });
    if (res.data) { setResult(res.data as Record<string, unknown>); fetchEvents(companyId); }
  };

  const eventIcon = (type: string) => {
    if (type.includes("SHIPMENT")) return "🚚";
    if (type.includes("WAREHOUSE")) return "🏭";
    if (type.includes("INSPECTION")) return "🔍";
    if (type.includes("CERTIFICATION")) return "📜";
    return "⚙️";
  };

  return (
    <GlassCard hover={false} glow>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={iconBox}><Link2 size={18} color="#14B8A6" /></div>
          <div>
            <h3 style={heading}>Supply Chain Events</h3>
            <p style={subtext}>Track manufacturing, shipment, warehouse, inspection, and certification events</p>
          </div>
        </div>
        {view === "list" ? (
          <AccentButton size="sm" icon={<Plus size={14} />} onClick={() => { setView("create"); setResult(null); }}
            style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)", border: "1px solid rgba(20,184,166,0.3)", boxShadow: "0 4px 12px rgba(20,184,166,0.2)" }}>
            New Event
          </AccentButton>
        ) : (
          <AccentButton variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => { setView("list"); setResult(null); }}>
            Back
          </AccentButton>
        )}
      </div>

      <FormField label="Company" value={companyId} onChange={setCompanyId} options={companyOptions} required />

      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            {loadingEvents && <p style={statusText}>Loading events...</p>}
            {!loadingEvents && companyId && events.length === 0 && <p style={statusText}>No supply chain events found.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              {events.map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }} style={dataCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={cardTitle}>{eventIcon(e.eventType || "")} {(e.eventType || "").replace(/_/g, " ")}</span>
                    {e.passportSerial && (
                      <span style={serialBadge}><Hash size={11} style={{ marginRight: 2 }} />Serial {e.passportSerial}</span>
                    )}
                  </div>
                  <div style={cardRow}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{e.location || "N/A"}</span>
                  </div>
                  <span style={cardDate}>{new Date(e.createdAt).toLocaleDateString()}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {view === "create" && (
          <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <div style={formGrid}>
              <FormField label="Event Type" value={form.eventType} onChange={(v) => setForm({ ...form, eventType: v })} options={EVENT_TYPE_OPTIONS} required />
              <FormField label="Passport Serial" hint="Optional" value={form.passportSerial} onChange={(v) => setForm({ ...form, passportSerial: v })} placeholder="1" />
              <FormField label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="Frankfurt, Germany" required />
            </div>
            <FormField label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Additional event details..." />
            <AccentButton fullWidth onClick={submitEvent} disabled={loading}
              style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)", border: "1px solid rgba(20,184,166,0.3)", boxShadow: "0 4px 12px rgba(20,184,166,0.2)", marginTop: "0.5rem" }}>
              {loading ? "Submitting..." : "Submit Event"}
            </AccentButton>
            {result && <pre style={resultBox}>{JSON.stringify(result, null, 2)}</pre>}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

const headerRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" };
const iconBox: CSSProperties = { width: 36, height: 36, borderRadius: 10, background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const heading: CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "#0F172A", margin: 0, fontFamily: "'Space Grotesk', sans-serif" };
const subtext: CSSProperties = { fontSize: "0.78rem", color: "#64748B", margin: 0 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" };
const resultBox: CSSProperties = { marginTop: "1rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "0.75rem", fontSize: "0.75rem", color: "#475569", overflow: "auto", maxHeight: 200, fontFamily: "monospace" };
const dataCard: CSSProperties = { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "0.75rem 1rem" };
const cardTitle: CSSProperties = { fontWeight: 700, fontSize: "0.88rem", color: "#0F172A" };
const serialBadge: CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "#06b6d4", background: "rgba(6,182,212,0.12)", padding: "0.15rem 0.5rem", borderRadius: 12, display: "inline-flex", alignItems: "center", border: "1px solid rgba(6,182,212,0.25)" };
const cardRow: CSSProperties = { display: "flex", gap: "1rem", fontSize: "0.75rem", color: "#64748B", marginTop: "0.35rem" };
const cardDate: CSSProperties = { fontSize: "0.7rem", color: "#94A3B8", marginTop: "0.25rem", display: "block" };
const statusText: CSSProperties = { fontSize: "0.82rem", color: "#94A3B8", textAlign: "center", padding: "1rem 0" };
