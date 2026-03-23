"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, Calculator, ShieldCheck,
  ArrowLeftRight, Link2, FileBarChart, ScrollText, Menu, Shield,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

interface NavItem {
  id: string;
  icon: ReactNode;
  label: string;
}

const ICON_SIZE = 18;

const NAV_ITEMS: NavItem[] = [
  { id: "overview",    icon: <LayoutDashboard size={ICON_SIZE} />, label: "Overview" },
  { id: "corporate",   icon: <Building2 size={ICON_SIZE} />,      label: "Company" },
  { id: "emissions",   icon: <Calculator size={ICON_SIZE} />,     label: "Emissions" },
  { id: "compliance",  icon: <ShieldCheck size={ICON_SIZE} />,    label: "Compliance" },
  { id: "guardian",    icon: <Shield size={ICON_SIZE} />,         label: "Guardian" },
  { id: "trading",     icon: <ArrowLeftRight size={ICON_SIZE} />, label: "Trading" },
  { id: "supplychain", icon: <Link2 size={ICON_SIZE} />,          label: "Supply Chain" },
  { id: "reports",     icon: <FileBarChart size={ICON_SIZE} />,   label: "Reports" },
  { id: "activity",    icon: <ScrollText size={ICON_SIZE} />,     label: "Activity" },
];

interface EdgeNavProps {
  activeTab: string;
  onNavigate: (id: string) => void;
}

export default function EdgeNav({ activeTab, onNavigate }: EdgeNavProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Backdrop overlay when expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpanded(false)}
            style={backdrop}
          />
        )}
      </AnimatePresence>

      {/* Edge trigger + expanded disk */}
      <motion.div
        onHoverStart={() => setExpanded(true)}
        onHoverEnd={() => setExpanded(false)}
        animate={{
          width: expanded ? 220 : 20,
          borderRadius: expanded ? "0 24px 24px 0" : "0 12px 12px 0",
        }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={diskContainer}
      >
        {/* Idle hint bar */}
        {!expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={hintBar}
          >
            <Menu size={14} color="#10B981" />
          </motion.div>
        )}

        {/* Expanded nav items */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              style={navList}
            >
              {NAV_ITEMS.map((item, i) => {
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ x: 4, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onNavigate(item.id); setExpanded(false); }}
                    style={{
                      ...navItem,
                      background: isActive ? "rgba(16,185,129,0.1)" : "transparent",
                      color: isActive ? "#059669" : "#475569",
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", color: isActive ? "#10B981" : "#94A3B8" }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {isActive && <div style={activeDot} />}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.05)",
  zIndex: 998,
};

const diskContainer: CSSProperties = {
  position: "fixed",
  left: 0,
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 999,
  background: "rgba(255, 255, 255, 0.85)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid #E2E8F0",
  borderLeft: "none",
  boxShadow: "4px 0 20px rgba(0,0,0,0.06), 0 0 15px rgba(16,185,129,0.04)",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  minHeight: 380,
};

const hintBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  cursor: "pointer",
};

const navList: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "0.75rem 0.5rem",
  width: "100%",
};

const navItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "0.55rem 0.75rem",
  borderRadius: 10,
  fontSize: "0.82rem",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.15s ease",
  position: "relative",
};

const activeDot: CSSProperties = {
  position: "absolute",
  right: 8,
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#10B981",
};
