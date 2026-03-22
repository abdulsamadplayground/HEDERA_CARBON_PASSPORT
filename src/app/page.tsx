"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, LogOut, Copy, Check } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import LoginPage from "@/components/LoginPage";
import EdgeNav from "@/components/ui/EdgeNav";
import CompanyRegistration from "@/components/modules/CompanyRegistration";
import EmissionsCalculator from "@/components/modules/EmissionsCalculator";
import ComplianceDashboard from "@/components/modules/ComplianceDashboard";
import Marketplace from "@/components/modules/Marketplace";
import CapTrade from "@/components/modules/CapTrade";
import SupplyChain from "@/components/modules/SupplyChain";
import ReportGenerator from "@/components/modules/ReportGenerator";
import PlatformOverview from "@/components/modules/PlatformOverview";
import ActivityLog from "@/components/ActivityLog";
import type { CSSProperties } from "react";

function truncateAddress(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Home() {
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState("overview");
  const [lastCompanyId, setLastCompanyId] = useState("");
  const [copied, setCopied] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const smoothNav = useCallback((tabId: string) => {
    setActiveTab(tabId);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const onRegSuccess = useCallback((cid: string) => {
    setLastCompanyId(cid);
    setTimeout(() => smoothNav("emissions"), 1200);
  }, [smoothNav]);

  const onEmSuccess = useCallback(() => {
    setTimeout(() => smoothNav("compliance"), 1200);
  }, [smoothNav]);

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(wallet.evmAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [wallet.evmAddress]);

  if (!wallet.connected) return <LoginPage />;

  const renderContent = () => {
    switch (activeTab) {
      case "overview":    return <PlatformOverview onNavigate={smoothNav} />;
      case "corporate":   return <CompanyRegistration onSuccess={onRegSuccess} />;
      case "emissions":   return <EmissionsCalculator preselectedCompanyId={lastCompanyId} onSuccess={onEmSuccess} />;
      case "compliance":  return <ComplianceDashboard preselectedCompanyId={lastCompanyId} />;
      case "trading":     return <><Marketplace /><div style={{ marginTop: "1.5rem" }}><CapTrade /></div></>;
      case "supplychain": return <SupplyChain />;
      case "reports":     return <ReportGenerator />;
      case "activity":    return <ActivityLog />;
      default:            return <PlatformOverview onNavigate={smoothNav} />;
    }
  };

  return (
    <div style={shell}>
      {/* ── Top Navbar ── */}
      <nav style={topNav}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={logoIcon}><Leaf size={18} color="#10B981" /></div>
          <span style={logoText}>Carbon Passport</span>
          <span style={testnetBadge}>TESTNET</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={walletChip}>
            <div style={walletDot} />
            <span style={{ fontSize: "0.75rem", color: "#334155", fontWeight: 500 }}>
              {wallet.hederaAccountId && wallet.hederaAccountId !== "Pending..." ? wallet.hederaAccountId : truncateAddress(wallet.evmAddress)}
            </span>
            <button onClick={copyAddress} style={copyBtn} aria-label="Copy address">
              {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#94A3B8" />}
            </button>
            <span style={{ fontSize: "0.72rem", color: "#64748B" }}>{wallet.balance} HBAR</span>
          </div>
          <button onClick={wallet.disconnect} style={disconnectBtn}>
            <LogOut size={14} /> Disconnect
          </button>
        </div>
      </nav>

      {/* ── Edge Nav ── */}
      <EdgeNav activeTab={activeTab} onNavigate={smoothNav} />

      {/* ── Main Content ── */}
      <main ref={mainRef} style={activeTab === "overview" ? mainOverview : main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={activeTab === "overview" ? { width: "100%" } : { maxWidth: 1000, margin: "0 auto" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ── Styles ── */
const shell: CSSProperties = {
  minHeight: "100vh",
  background: "#F9FAF7",
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const topNav: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.6rem 1.5rem",
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderBottom: "1px solid #E2E8F0",
  position: "sticky",
  top: 0,
  zIndex: 100,
};

const logoIcon: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: "#D1FAE5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const logoText: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: "0.95rem",
  color: "#0F172A",
};

const testnetBadge: CSSProperties = {
  fontSize: "0.6rem",
  fontWeight: 700,
  color: "#059669",
  background: "#D1FAE5",
  padding: "2px 8px",
  borderRadius: 10,
  letterSpacing: "0.06em",
};

const walletChip: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0.35rem 0.75rem",
  borderRadius: 12,
  background: "rgba(255,255,255,0.7)",
  border: "1px solid #E2E8F0",
};

const walletDot: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#10B981",
  boxShadow: "0 0 6px rgba(16,185,129,0.4)",
};

const copyBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: 4,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
};

const disconnectBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  padding: "0.35rem 0.75rem",
  borderRadius: 10,
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#DC2626",
  background: "#FEE2E2",
  border: "1px solid #FECACA",
  cursor: "pointer",
  transition: "all 0.2s",
};

const main: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "2rem 2.5rem",
  minHeight: "calc(100vh - 52px)",
};

const mainOverview: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 0,
  minHeight: "calc(100vh - 52px)",
};
