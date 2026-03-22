"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileBarChart, Download } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import GlassCard from "@/components/ui/GlassCard";
import AccentButton from "@/components/ui/AccentButton";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";
import type { CSSProperties } from "react";

const FORMAT_OPTIONS: SelectOption[] = [
  { value: "PDF", label: "PDF" },
  { value: "CSV", label: "CSV" },
  { value: "JSON", label: "JSON" },
];

export default function ReportGenerator() {
  const { call, loading } = useApi();
  const { companies } = useCompanies();
  const [companyId, setCompanyId] = useState("");
  const [format, setFormat] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const companyOptions: SelectOption[] = companies.map((c) => ({
    value: c.id,
    label: `${c.companyName} (${c.sector})`,
  }));

  const generate = async () => {
    const res = await call("/api/reports/generate", {
      method: "POST", body: { companyId, format },
      txType: "Report Generation",
      txDescription: `Generated ${format} compliance report`,
    });
    if (res.data) setResult(res.data as Record<string, unknown>);
  };

  return (
    <GlassCard hover={false} glow>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
        <div style={iconBox}><FileBarChart size={18} color="#8B5CF6" /></div>
        <div>
          <h3 style={heading}>Audit Reports</h3>
          <p style={subtext}>Generate compliance audit reports in PDF, CSV, or JSON format</p>
        </div>
      </div>
      <div style={formGrid}>
        <FormField label="Company" value={companyId} onChange={setCompanyId} options={companyOptions} required />
        <FormField label="Format" value={format} onChange={setFormat} options={FORMAT_OPTIONS} required />
      </div>
      <AccentButton fullWidth onClick={generate} disabled={loading} icon={<Download size={15} />}
        style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 4px 12px rgba(139,92,246,0.2)", marginTop: "0.5rem" }}>
        {loading ? "Generating..." : "Generate Report"}
      </AccentButton>
      {result && (
        <motion.pre initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={resultBox}>
          {JSON.stringify(result, null, 2)}
        </motion.pre>
      )}
    </GlassCard>
  );
}

const iconBox: CSSProperties = { width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const heading: CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "#0F172A", margin: "0 0 0.1rem", fontFamily: "'Space Grotesk', sans-serif" };
const subtext: CSSProperties = { fontSize: "0.78rem", color: "#64748B", margin: 0 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" };
const resultBox: CSSProperties = { marginTop: "1rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "0.75rem", fontSize: "0.75rem", color: "#475569", overflow: "auto", maxHeight: 200, fontFamily: "monospace" };
