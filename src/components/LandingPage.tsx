"use client";

import { motion } from "framer-motion";
import {
  Leaf, Building2, Calculator, ShieldCheck, ArrowLeftRight,
  Link2, FileBarChart, Globe, ArrowRight, Wallet, ExternalLink,
  AlertCircle, Loader2, CheckCircle2, Shield,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import type { CSSProperties, ReactNode } from "react";

const METAMASK_DOWNLOAD = "https://metamask.io/download/";

const SERVICES: { icon: ReactNode; title: string; desc: string; color: string; bg: string }[] = [
  { icon: <Building2 size={22} />, title: "Company Registration", desc: "Register entities with DID and Hedera accounts", color: "#10B981", bg: "#D1FAE5" },
  { icon: <Calculator size={22} />, title: "Emissions Calculator", desc: "GHG Protocol Scope 1, 2, 3 calculations", color: "#3B82F6", bg: "#DBEAFE" },
  { icon: <ShieldCheck size={22} />, title: "Compliance Dashboard", desc: "Claims, Guardian MRV, and carbon passports", color: "#8B5CF6", bg: "#EDE9FE" },
  { icon: <ArrowLeftRight size={22} />, title: "Credit Marketplace", desc: "List and trade carbon credits (CCR tokens)", color: "#F59E0B", bg: "#FEF3C7" },
  { icon: <Globe size={22} />, title: "Cap-and-Trade", desc: "CAL token allocation and surplus tracking", color: "#06B6D4", bg: "#CFFAFE" },
  { icon: <Link2 size={22} />, title: "Supply Chain", desc: "Track events across the product lifecycle", color: "#14B8A6", bg: "#CCFBF1" },
  { icon: <FileBarChart size={22} />, title: "Audit Reports", desc: "Generate compliance reports in PDF, CSV, JSON", color: "#EC4899", bg: "#FCE7F3" },
];

const STATS = [
  { value: "6", label: "Smart Contracts" },
  { value: "3", label: "Emission Scopes" },
  { value: "NFT", label: "Carbon Passports" },
  { value: "DID", label: "Decentralized Identity" },
];

const fadeUp = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };

export default function LandingPage() {
  const { connect, connecting, error, hasMetaMask } = useWallet();

  return (
    <div style={shell}>
      {/* ── Hero ── */}
      <section style={hero}>
        <div style={heroInner}>
          <motion.div {...fadeUp} transition={{ duration: 0.7 }} style={{ maxWidth: 640 }}>
            <div style={logoBadge}>
              <Leaf size={18} color="#10B981" />
              <span>Carbon Passport Platform</span>
            </div>
            <h1 style={heroTitle}>
              Corporate Carbon Compliance on{" "}
              <span style={{ background: "linear-gradient(135deg, #10B981, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Hedera Hashgraph
              </span>
            </h1>
            <p style={heroSub}>
              End-to-end emissions tracking, verifiable carbon passports as NFTs,
              cap-and-trade management, and decentralized compliance — all on-chain.
            </p>

            {/* Connect / Install */}
            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 360 }}>
              {hasMetaMask ? (
                <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} onClick={connect} disabled={connecting} style={ctaBtn}>
                  {connecting ? (
                    <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Connecting...</>
                  ) : (
                    <><Wallet size={18} /> Connect MetaMask</>
                  )}
                </motion.button>
              ) : (
                <>
                  <div style={warningBox}><AlertCircle size={15} color="#D97706" /> MetaMask not detected</div>
                  <motion.a href={METAMASK_DOWNLOAD} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} style={installBtn}>
                    <Wallet size={18} /> Install MetaMask <ExternalLink size={13} style={{ opacity: 0.6 }} />
                  </motion.a>
                </>
              )}
              {error && <div style={errorBox}><AlertCircle size={13} /> {error}</div>}
              {connecting && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  {["Requesting wallet access...", "Switching to Hedera Testnet...", "Resolving account..."].map((s, i) => (
                    <motion.div key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 1.2 }} style={stepRow}>
                      <CheckCircle2 size={12} color="#10B981" /> <span>{s}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div style={networkTag}><Shield size={12} color="#059669" /> Hedera Testnet</div>
          </motion.div>

          {/* Hero visual */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.7 }} style={heroVisual}>
            <div style={heroCard}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#10B981", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12 }}>Live Platform</div>
              {["Emissions Tracking", "Carbon Passports", "Cap-and-Trade", "Supply Chain"].map((f, i) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.4rem 0", borderBottom: i < 3 ? "1px solid #F1F5F9" : "none" }}>
                  <CheckCircle2 size={14} color="#10B981" />
                  <span style={{ fontSize: "0.82rem", color: "#334155", fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Services Grid ── */}
      <section style={servicesSection}>
        <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.6 }} style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h2 style={sectionTitle}>Platform Services</h2>
          <p style={sectionSub}>Seven integrated modules for complete carbon lifecycle management</p>
        </motion.div>
        <div style={servicesGrid}>
          {SERVICES.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07, duration: 0.5 }} whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.08)" }} style={serviceCard}>
              <div style={{ ...serviceIcon, background: s.bg, color: s.color }}>{s.icon}</div>
              <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0F172A", margin: "0.6rem 0 0.25rem", fontFamily: "'Space Grotesk', sans-serif" }}>{s.title}</h4>
              <p style={{ fontSize: "0.78rem", color: "#64748B", margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={statsSection}>
        <div style={statsGrid}>
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }} style={statCard}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, background: "linear-gradient(135deg, #10B981, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={ctaSection}>
        <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.6 }} style={{ textAlign: "center" }}>
          <h2 style={{ ...sectionTitle, color: "#FFFFFF" }}>Ready to Track Your Carbon Footprint?</h2>
          <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", maxWidth: 500, margin: "0.5rem auto 1.5rem" }}>
            Connect your wallet and start managing emissions, minting carbon passports, and trading credits on Hedera.
          </p>
          {hasMetaMask && !connecting && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={connect} style={ctaBtnWhite}>
              <Wallet size={18} /> Get Started <ArrowRight size={16} />
            </motion.button>
          )}
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer style={footer}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Leaf size={16} color="#10B981" />
          <span style={{ fontWeight: 600, color: "#334155", fontFamily: "'Space Grotesk', sans-serif" }}>Carbon Passport Platform</span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Powered by Hedera Hashgraph · Built with Next.js</span>
      </footer>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Styles ── */
const shell: CSSProperties = { minHeight: "100vh", background: "#F9FAF7", fontFamily: "'Inter', -apple-system, sans-serif" };

const hero: CSSProperties = { padding: "4rem 2rem 3rem", background: "linear-gradient(135deg, #F9FAF7 0%, #ECFDF5 50%, #F0F9FF 100%)" };
const heroInner: CSSProperties = { maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: "3rem", flexWrap: "wrap" as const };
const logoBadge: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "0.35rem 0.85rem", borderRadius: 20, background: "#D1FAE5", fontSize: "0.78rem", fontWeight: 600, color: "#059669", marginBottom: "1rem" };
const heroTitle: CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontSize: "2.4rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.15, margin: 0, letterSpacing: "-0.02em" };
const heroSub: CSSProperties = { fontSize: "1rem", color: "#475569", lineHeight: 1.6, marginTop: "0.75rem", maxWidth: 520 };
const networkTag: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, marginTop: "1.25rem", padding: "0.3rem 0.75rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, color: "#059669", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" };
const heroVisual: CSSProperties = { flex: "1 1 320px", display: "flex", justifyContent: "center" };
const heroCard: CSSProperties = { background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", border: "1px solid #E2E8F0", borderRadius: 16, padding: "1.5rem", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", minWidth: 260 };

const ctaBtn: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0.75rem 1.5rem", borderRadius: 14, fontSize: "0.95rem", fontWeight: 700, color: "#FFF", background: "linear-gradient(135deg, #10B981, #3B82F6)", border: "none", boxShadow: "0 4px 16px rgba(16,185,129,0.25)", cursor: "pointer", fontFamily: "'Inter', sans-serif" };
const installBtn: CSSProperties = { ...ctaBtn, textDecoration: "none", background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "0 4px 16px rgba(59,130,246,0.25)" };
const warningBox: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "0.55rem 0.85rem", borderRadius: 10, fontSize: "0.82rem", fontWeight: 500, color: "#92400E", background: "#FEF3C7", border: "1px solid #FDE68A" };
const errorBox: CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "0.45rem 0.75rem", borderRadius: 8, fontSize: "0.78rem", color: "#DC2626", background: "#FEE2E2", border: "1px solid #FECACA" };
const stepRow: CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "#475569" };

const servicesSection: CSSProperties = { padding: "3rem 2rem", maxWidth: 1100, margin: "0 auto" };
const sectionTitle: CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.6rem", fontWeight: 800, color: "#0F172A", margin: 0 };
const sectionSub: CSSProperties = { fontSize: "0.9rem", color: "#64748B", marginTop: "0.4rem" };
const servicesGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" };
const serviceCard: CSSProperties = { background: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)", border: "1px solid #E2E8F0", borderRadius: 14, padding: "1.25rem", cursor: "default", transition: "all 0.3s ease" };
const serviceIcon: CSSProperties = { width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" };

const statsSection: CSSProperties = { padding: "2rem 2rem 3rem", background: "#F1F5F2" };
const statsGrid: CSSProperties = { maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" };
const statCard: CSSProperties = { textAlign: "center", padding: "1.25rem", background: "rgba(255,255,255,0.8)", borderRadius: 14, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };

const ctaSection: CSSProperties = { padding: "3rem 2rem", background: "linear-gradient(135deg, #059669, #2563EB)", borderRadius: 0 };
const ctaBtnWhite: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "0.75rem 1.75rem", borderRadius: 14, fontSize: "0.95rem", fontWeight: 700, color: "#059669", background: "#FFFFFF", border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", cursor: "pointer", fontFamily: "'Inter', sans-serif" };

const footer: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 2rem", borderTop: "1px solid #E2E8F0", background: "#FFFFFF" };
