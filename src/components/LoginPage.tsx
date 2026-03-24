"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink, AlertCircle, Loader2,
  CheckCircle2,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import CarbonLogo from "@/components/ui/CarbonLogo";
import MetaMaskLogo from "@/components/ui/MetaMaskLogo";
import type { CSSProperties } from "react";

const METAMASK_DOWNLOAD = "https://metamask.io/download/";

/* ─────────────────────────────────────────────
   Loader Screen (centered logo + progress bar)
   ───────────────────────────────────────────── */
function LoaderScreen({ progress }: { progress: number }) {
  return (
    <motion.div
      style={loaderShell}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <CarbonLogo size={140} />
      </motion.div>

      <motion.div
        style={{ marginTop: 12, fontSize: "1.1rem", fontWeight: 700, color: "#0F172A", fontFamily: "'Space Grotesk', sans-serif" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Carbon Passport
      </motion.div>

      {/* Progress bar */}
      <div style={progressTrack}>
        <motion.div
          style={progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      </div>

      <motion.p
        style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Initializing platform...
      </motion.p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Left Side — Luxury Logo Showcase
   ───────────────────────────────────────────── */
function LogoShowcase() {
  return (
    <div style={showcaseShell}>
      {/* Ambient glow — emerald center */}
      <div style={glowCenter} />
      {/* Ambient light — bottom left emerald */}
      <div style={lightBL} />
      {/* Ambient light — top right blue */}
      <div style={lightTR} />

      {/* Centered logo container — all elements positioned relative to this */}
      <div style={logoAnchor}>
        {/* Orbiting ring */}
        <motion.div
          style={orbitRing}
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          <div style={{ ...orbitDot, top: -4, left: "50%", marginLeft: -4 }} />
          <div style={{ ...orbitDot, bottom: -4, left: "50%", marginLeft: -4, opacity: 0.4 }} />
          <div style={{ ...orbitDot, left: -4, top: "50%", marginTop: -4, opacity: 0.6 }} />
        </motion.div>

        {/* Floating logo with gentle bob */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={logoCenter}
        >
          <CarbonLogo size={220} />
        </motion.div>

        {/* Floor shadow — directly below logo */}
        <motion.div
          animate={{ scale: [1, 0.92, 1], opacity: [0.12, 0.08, 0.12] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={floorShadow}
        />
      </div>

      {/* Sparkle particles — symmetric around center */}
      {[
        { x: -120, y: -100 },
        { x: 110, y: -80 },
        { x: -100, y: 80 },
        { x: 120, y: 60 },
        { x: 0, y: -130 },
      ].map((pos, i) => (
        <motion.div
          key={i}
          style={{
            ...sparkle,
            left: "50%",
            top: "50%",
            marginLeft: pos.x,
            marginTop: pos.y,
          }}
          animate={{
            opacity: [0, 0.7, 0],
            scale: [0.4, 1.1, 0.4],
          }}
          transition={{
            duration: 3 + i * 0.4,
            repeat: Infinity,
            delay: i * 0.7,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Right Side — MetaMask Connect Form
   ───────────────────────────────────────────── */
function ConnectForm() {
  const { connect, connecting, error, hasMetaMask } = useWallet();

  return (
    <motion.div
      style={formWrapper}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <h1 style={formTitle}>Welcome Back</h1>
      <p style={formSubtitle}>
        Login to your account
      </p>

      {hasMetaMask ? (
        <>
          <motion.button
            whileHover={{ scale: 1.015, y: -1 }}
            whileTap={{ scale: 0.985 }}
            onClick={connect}
            disabled={connecting}
            style={connectBtn}
          >
            {connecting ? (
              <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Connecting...</>
            ) : (
              <><MetaMaskLogo size={20} /> Connect MetaMask</>
            )}
          </motion.button>

          {error && (
            <div style={errorBox}><AlertCircle size={13} /> {error}</div>
          )}

          {connecting && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              {["Requesting wallet access...", "Switching to Hedera Testnet...", "Resolving account ID..."].map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 1.2 }}
                  style={stepRow}
                >
                  <CheckCircle2 size={13} color="#10B981" /> <span>{s}</span>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={warningBox}>
            <AlertCircle size={15} color="#D97706" /> MetaMask extension not detected in your browser.
          </div>
          <motion.a
            href={METAMASK_DOWNLOAD}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            style={installBtn}
          >
            <MetaMaskLogo size={20} /> Install MetaMask <ExternalLink size={13} style={{ opacity: 0.6 }} />
          </motion.a>
        </>
      )}

      <div style={securityNote}>
        No private keys are stored. MetaMask handles all signing.
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main LoginPage — Loader → Split Layout
   ───────────────────────────────────────────── */
export default function LoginPage() {
  const [showLoader, setShowLoader] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(old => {
        if (old >= 100) {
          clearInterval(interval);
          setTimeout(() => setShowLoader(false), 400);
          return 100;
        }
        return old + 5;
      });
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {showLoader ? (
        <LoaderScreen progress={progress} key="loader" />
      ) : (
        <motion.div
          key="login"
          style={splitShell}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* LEFT — Logo Showcase */}
          <div style={leftPanel} className="login-left-panel">
            <LogoShowcase />
          </div>

          {/* RIGHT — Connect Form */}
          <div style={rightPanel} className="login-right-panel">
            <ConnectForm />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════ */

// ── Loader ──
const loaderShell: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#F9FAF7",
  fontFamily: "'Inter', -apple-system, sans-serif",
  gap: 4,
};

const progressTrack: CSSProperties = {
  width: 240,
  height: 6,
  background: "#E2E8F0",
  borderRadius: 100,
  overflow: "hidden",
  marginTop: 20,
};

const progressFill: CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #10B981, #3B82F6)",
  borderRadius: 100,
};

// ── Split Layout ──
const splitShell: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  background: "#F9FAF7",
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const leftPanel: CSSProperties = {
  width: "50%",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  background: "linear-gradient(160deg, #F9FAF7 0%, #ECFDF5 40%, #F0F9FF 100%)",
};

const rightPanel: CSSProperties = {
  width: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "3rem",
};

// ── Logo Showcase ──
const showcaseShell: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

const glowCenter: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 300,
  height: 300,
  background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
  borderRadius: "50%",
  filter: "blur(40px)",
  pointerEvents: "none",
};

const lightBL: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  width: 320,
  height: 320,
  background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
  borderRadius: "50%",
  filter: "blur(60px)",
  pointerEvents: "none",
};

const lightTR: CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  width: 320,
  height: 320,
  background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
  borderRadius: "50%",
  filter: "blur(60px)",
  pointerEvents: "none",
};

const logoAnchor: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 280,
  height: 280,
};

const logoCenter: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  filter: "drop-shadow(0 16px 32px rgba(16,185,129,0.2))",
};

const orbitRing: CSSProperties = {
  position: "absolute",
  inset: -20,
  borderRadius: "50%",
  border: "1px solid rgba(16,185,129,0.12)",
};

const orbitDot: CSSProperties = {
  position: "absolute" as const,
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "rgba(16,185,129,0.5)",
  boxShadow: "0 0 10px rgba(16,185,129,0.3)",
};

const floorShadow: CSSProperties = {
  position: "absolute",
  bottom: -10,
  left: "50%",
  transform: "translateX(-50%)",
  width: 140,
  height: 16,
  background: "rgba(0,0,0,0.08)",
  borderRadius: "50%",
  filter: "blur(12px)",
};

const sparkle: CSSProperties = {
  position: "absolute",
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.9)",
  boxShadow: "0 0 8px rgba(16,185,129,0.4)",
  pointerEvents: "none",
};

// ── Connect Form ──
const formWrapper: CSSProperties = {
  width: "100%",
  maxWidth: 420,
};

const formTitle: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "2.2rem",
  fontWeight: 800,
  color: "#0F172A",
  margin: "0 0 0.4rem",
  fontStyle: "italic",
};

const formSubtitle: CSSProperties = {
  fontSize: "0.9rem",
  color: "#64748B",
  lineHeight: 1.6,
  margin: "0 0 1.5rem",
};

const connectBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  padding: "0.9rem",
  borderRadius: 14,
  fontSize: "1rem",
  fontWeight: 700,
  color: "#FFF",
  background: "linear-gradient(135deg, #10B981, #3B82F6)",
  border: "none",
  boxShadow: "0 6px 20px rgba(16,185,129,0.25)",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  transition: "all 0.2s",
};

const installBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  padding: "0.9rem",
  borderRadius: 14,
  fontSize: "1rem",
  fontWeight: 700,
  color: "#FFF",
  background: "linear-gradient(135deg, #3B82F6, #2563EB)",
  border: "none",
  boxShadow: "0 6px 20px rgba(59,130,246,0.25)",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  textDecoration: "none",
};

const warningBox: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0.6rem 1rem",
  borderRadius: 12,
  fontSize: "0.85rem",
  fontWeight: 500,
  color: "#92400E",
  background: "#FEF3C7",
  border: "1px solid #FDE68A",
  marginBottom: "0.75rem",
};

const errorBox: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0.5rem 0.85rem",
  borderRadius: 10,
  fontSize: "0.82rem",
  color: "#DC2626",
  background: "#FEE2E2",
  border: "1px solid #FECACA",
  marginTop: "0.85rem",
};

const stepRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: "0.8rem",
  color: "#475569",
};

const securityNote: CSSProperties = {
  textAlign: "center",
  marginTop: "1rem",
  fontSize: "0.72rem",
  color: "#94A3B8",
  paddingTop: "0.75rem",
  borderTop: "1px solid #F1F5F9",
};
