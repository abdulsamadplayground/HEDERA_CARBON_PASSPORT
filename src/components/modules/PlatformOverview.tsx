"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Building2, Calculator, ShieldCheck, ArrowLeftRight,
  Link2, ScrollText, ArrowRight, Zap, Eye, Lock,
  FileCheck, ChevronRight, Sparkles, TrendingUp,
  Globe, BarChart3,
} from "lucide-react";
import CarbonLogo from "@/components/ui/CarbonLogo";
import type { CSSProperties, ReactNode } from "react";

/* ─── Scroll-reveal wrapper with stagger support ─── */
function Reveal({ children, delay = 0, direction = "up" }: { children: ReactNode; delay?: number; direction?: "up" | "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const initial = direction === "left" ? { opacity: 0, x: -60 } : direction === "right" ? { opacity: 0, x: 60 } : { opacity: 0, y: 50 };
  const animate = inView ? { opacity: 1, x: 0, y: 0 } : {};
  return (
    <motion.div ref={ref} initial={initial} animate={animate} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   1. HERO — Full-width, big text, hub illustration
   ═══════════════════════════════════════════════ */
function HeroSection({ onNavigate }: { onNavigate?: (id: string) => void }) {
  return (
    <section style={heroShell}>
      {/* Background ambient blurs */}
      <div style={{ position: "absolute", top: -80, right: -60, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -100, left: -40, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />

      <div style={heroInner}>
        <div style={heroLeft}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <span style={heroBadge}><Sparkles size={13} /> Powered by Hedera Hashgraph</span>
          </motion.div>

          <motion.h1
            style={heroHeadline}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
          >
            Reimagining{" "}
            <span style={gradientText}>Carbon Compliance</span>
            {" "}with Blockchain Transparency
          </motion.h1>

          <motion.p
            style={heroSub}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
          >
            Companies struggle with fragmented compliance systems, lack of transparency
            and trust, and manual, inefficient reporting.{" "}
            <span style={{ color: "#0F172A", fontWeight: 600 }}>We bring it all together on-chain.</span>
          </motion.p>

          <motion.div
            style={{ display: "flex", gap: 14, marginTop: 12 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <button style={ctaPrimary} onClick={() => onNavigate?.("corporate")}>
              Get Started <ArrowRight size={16} />
            </button>
            <button style={ctaSecondary} onClick={() => {
              document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" });
            }}>
              Explore Platform
            </button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            style={trustRow}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <span style={trustItem}>✓ On-chain verification</span>
            <span style={trustDivider}>·</span>
            <span style={trustItem}>✓ NFT Passports</span>
            <span style={trustDivider}>·</span>
            <span style={trustItem}>✓ Smart contract enforcement</span>
          </motion.div>
        </div>

        <div style={heroRight}>
          <HubIllustration />
        </div>
      </div>
    </section>
  );
}

/* ─── Hub-and-spoke radial illustration ─── */
function HubIllustration() {
  const spokes = [
    { angle: 0, label: "Register", icon: <Building2 size={16} color="#fff" />, color: "#10B981" },
    { angle: 60, label: "Calculate", icon: <Calculator size={16} color="#fff" />, color: "#3B82F6" },
    { angle: 120, label: "Verify", icon: <ShieldCheck size={16} color="#fff" />, color: "#8B5CF6" },
    { angle: 180, label: "Mint NFT", icon: <FileCheck size={16} color="#fff" />, color: "#F59E0B" },
    { angle: 240, label: "Trade", icon: <ArrowLeftRight size={16} color="#fff" />, color: "#EC4899" },
    { angle: 300, label: "Comply", icon: <Globe size={16} color="#fff" />, color: "#06B6D4" },
  ];

  const R = 140; // radius from center
  const CX = 200;
  const CY = 200;

  return (
    <motion.div
      style={illustrationShell}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Outer ring glow */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 400 400">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="spokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Orbit ring */}
        <motion.circle
          cx={CX} cy={CY} r={R}
          fill="none" stroke="url(#ringGrad)" strokeWidth="1.5" strokeDasharray="6 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, delay: 0.6, ease: "easeOut" }}
        />

        {/* Spoke lines to center */}
        {spokes.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const x = CX + R * Math.cos(rad);
          const y = CY + R * Math.sin(rad);
          return (
            <motion.line
              key={i}
              x1={CX} y1={CY} x2={x} y2={y}
              stroke="url(#spokeGrad)" strokeWidth="1" strokeDasharray="3 3"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 1, delay: 0.8 + i * 0.12 }}
            />
          );
        })}

        {/* Animated data particles traveling along spokes */}
        {spokes.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const x1 = CX;
          const y1 = CY;
          const x2 = CX + R * Math.cos(rad);
          const y2 = CY + R * Math.sin(rad);
          return (
            <motion.circle
              key={`particle-${i}`}
              r="3" fill={s.color} opacity="0.7"
              initial={{ cx: x1, cy: y1 }}
              animate={{ cx: [x1, x2, x1], cy: [y1, y2, y1] }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: 1.5 + i * 0.3, ease: "easeInOut" }}
            />
          );
        })}
      </svg>

      {/* Center hub — logo */}
      <motion.div
        style={hubCenter}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <CarbonLogo size={64} />
      </motion.div>

      {/* Spoke nodes */}
      {spokes.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const x = CX + R * Math.cos(rad);
        const y = CY + R * Math.sin(rad);
        return (
          <motion.div
            key={s.label}
            style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 + i * 0.12, type: "spring", stiffness: 200 }}
          >
            <motion.div
              style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${s.color}40` }}
              whileHover={{ scale: 1.15 }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
            >
              {s.icon}
            </motion.div>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{s.label}</span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}


/* ═══════════════════════════════════════════════
   2. PROBLEM — Alternating layout, bold statements
   ═══════════════════════════════════════════════ */
function ProblemSection() {
  const problems = [
    { icon: <Zap size={26} color="#F59E0B" />, title: "Fragmented Systems", bold: "No single source of truth.", desc: "Compliance data scattered across spreadsheets, emails, and siloed databases.", bg: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A33 100%)", accent: "#F59E0B" },
    { icon: <Eye size={26} color="#EF4444" />, title: "Zero Transparency", bold: "Nobody can verify anything.", desc: "Stakeholders, regulators, and auditors have no way to independently validate reported emissions.", bg: "linear-gradient(135deg, #FEE2E2 0%, #FECACA33 100%)", accent: "#EF4444" },
    { icon: <Lock size={26} color="#8B5CF6" />, title: "Trust Deficit", bold: "Manual processes breed doubt.", desc: "Error-prone reporting and lack of immutability erode confidence in sustainability claims.", bg: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE33 100%)", accent: "#8B5CF6" },
  ];

  return (
    <section style={fullSection}>
      <div style={sectionInner}>
        <Reveal>
          <h2 style={sectionTitleLg}>
            Why does this <span style={gradientText}>platform</span> exist?
          </h2>
          <p style={sectionSubLg}>
            Carbon compliance today is broken. Businesses face mounting regulatory pressure
            with tools that <span style={{ fontWeight: 700, color: "#0F172A" }}>weren&apos;t built for the challenge.</span>
          </p>
        </Reveal>
        <div style={problemGrid}>
          {problems.map((p, i) => (
            <Reveal key={p.title} delay={0.15 + i * 0.18}>
              <motion.div
                style={{ ...problemCard, background: p.bg, borderColor: `${p.accent}25` }}
                whileHover={{ y: -6, boxShadow: `0 16px 40px ${p.accent}15` }}
                transition={{ duration: 0.25 }}
              >
                <div style={{ ...problemIconBox, background: `${p.accent}15`, borderColor: `${p.accent}30` }}>{p.icon}</div>
                <h3 style={problemTitle}>{p.title}</h3>
                <p style={problemBold}>{p.bold}</p>
                <p style={problemDesc}>{p.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   3. VISION — Full-width gradient band
   ═══════════════════════════════════════════════ */
function VisionSection() {
  const pillars = [
    { label: "Transparency", desc: "Every emission record is anchored on-chain via Hedera Consensus Service.", num: "01", color: "#10B981" },
    { label: "Immutability", desc: "Once verified, compliance data cannot be altered or tampered with.", num: "02", color: "#3B82F6" },
    { label: "Trust", desc: "Smart contracts enforce rules automatically — no intermediaries needed.", num: "03", color: "#8B5CF6" },
  ];

  return (
    <section style={visionBand}>
      <div style={sectionInner}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-block", marginBottom: 16 }}
            >
              <CarbonLogo size={60} />
            </motion.div>
            <h2 style={sectionTitleLg}>
              Built on <span style={gradientTextBlue}>blockchain</span>. Designed for <span style={gradientText}>trust</span>.
            </h2>
            <p style={sectionSubLg}>
              A unified carbon compliance ecosystem where sustainability is tokenized,
              verification is real-time, and trust is built into the protocol.
            </p>
          </div>
        </Reveal>
        <div style={pillarGrid}>
          {pillars.map((p, i) => (
            <Reveal key={p.label} delay={0.1 + i * 0.15}>
              <motion.div
                style={pillarCard}
                whileHover={{ y: -4, borderColor: `${p.color}40` }}
                transition={{ duration: 0.2 }}
              >
                <span style={{ ...pillarNumber, color: `${p.color}30` }}>{p.num}</span>
                <h4 style={{ ...pillarLabel, background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{p.label}</h4>
                <p style={pillarDesc}>{p.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   4. SOLUTION FLOW — Animated pipeline
   ═══════════════════════════════════════════════ */
function SolutionFlow() {
  const steps = [
    { icon: <Building2 size={22} color="#fff" />, label: "Register", desc: "Company onboards with DID", color: "#10B981" },
    { icon: <Calculator size={22} color="#fff" />, label: "Calculate", desc: "Emissions computed & scored", color: "#3B82F6" },
    { icon: <ShieldCheck size={22} color="#fff" />, label: "Verify", desc: "HCS anchors + smart contracts", color: "#8B5CF6" },
    { icon: <FileCheck size={22} color="#fff" />, label: "Mint", desc: "Carbon Passport NFT issued", color: "#F59E0B" },
    { icon: <ArrowLeftRight size={22} color="#fff" />, label: "Trade", desc: "Credits listed & exchanged", color: "#EC4899" },
  ];

  return (
    <section style={fullSection}>
      <div style={sectionInner}>
        <Reveal>
          <h2 style={sectionTitleLg}>
            How <span style={gradientText}>everything</span> connects
          </h2>
          <p style={sectionSubLg}>The complete compliance lifecycle — from registration to trading.</p>
        </Reveal>
        <div style={flowRow}>
          {steps.map((s, i) => (
            <Reveal key={s.label} delay={0.2 + i * 0.15}>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <motion.div
                  style={flowStep}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    style={{ ...flowIconCircle, background: `linear-gradient(135deg, ${s.color}, ${s.color}bb)`, boxShadow: `0 6px 20px ${s.color}35` }}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                  >
                    {s.icon}
                  </motion.div>
                  <span style={flowLabel}>{s.label}</span>
                  <span style={flowDesc}>{s.desc}</span>
                </motion.div>
                {i < steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.15 }}
                  >
                    <ChevronRight size={20} color="#CBD5E1" style={{ flexShrink: 0, margin: "0 4px" }} />
                  </motion.div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   5. SERVICES GRID — Vibrant cards
   ═══════════════════════════════════════════════ */
const MODULES = [
  { id: "corporate", icon: <Building2 size={24} />, title: "Company Management", desc: "Register organizations, assign DIDs, and manage Hedera accounts.", color: "#10B981", bg: "linear-gradient(135deg, #D1FAE5 0%, #A7F3D033 100%)" },
  { id: "emissions", icon: <Calculator size={24} />, title: "Emissions Calculator", desc: "Compute carbon footprints with tier-based scoring and ratings.", color: "#3B82F6", bg: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE33 100%)" },
  { id: "compliance", icon: <ShieldCheck size={24} />, title: "Compliance Dashboard", desc: "Monitor passport status, badges, and regulatory alignment.", color: "#8B5CF6", bg: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE33 100%)" },
  { id: "trading", icon: <ArrowLeftRight size={24} />, title: "Marketplace & Cap Trade", desc: "List, buy, and sell carbon credits in a transparent market.", color: "#F59E0B", bg: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A33 100%)" },
  { id: "supplychain", icon: <Link2 size={24} />, title: "Supply Chain", desc: "Track product journeys and custody events across the value chain.", color: "#06B6D4", bg: "linear-gradient(135deg, #CFFAFE 0%, #A5F3FC33 100%)" },
  { id: "activity", icon: <ScrollText size={24} />, title: "Activity Log", desc: "Full audit trail of every platform action and transaction.", color: "#64748B", bg: "linear-gradient(135deg, #F1F5F9 0%, #E2E8F033 100%)" },
];

function ServicesGrid({ onNavigate }: { onNavigate?: (id: string) => void }) {
  return (
    <section id="services-section" style={fullSection}>
      <div style={sectionInner}>
        <Reveal>
          <h2 style={sectionTitleLg}>
            Platform <span style={gradientTextBlue}>Services</span>
          </h2>
          <p style={sectionSubLg}>Each module is a dedicated workspace designed for a specific compliance function.</p>
        </Reveal>
        <div style={servicesGridStyle}>
          {MODULES.map((m, i) => (
            <Reveal key={m.id} delay={0.1 + i * 0.1}>
              <motion.div
                style={{ ...serviceCard, background: m.bg, borderColor: `${m.color}20` }}
                whileHover={{ y: -6, boxShadow: `0 16px 40px ${m.color}18`, borderColor: `${m.color}40` }}
                transition={{ duration: 0.25 }}
              >
                <div style={{ ...serviceIconBox, background: `${m.color}18`, borderColor: `${m.color}30`, color: m.color }}>{m.icon}</div>
                <h4 style={serviceTitle}>{m.title}</h4>
                <p style={serviceDesc}>{m.desc}</p>
                <button style={{ ...serviceBtn, color: m.color }} onClick={() => onNavigate?.(m.id)}>
                  Open Module <ArrowRight size={14} />
                </button>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}


/* ═══════════════════════════════════════════════
   6. WALKTHROUGH — Staggered timeline cards
   ═══════════════════════════════════════════════ */
function WalkthroughSteps() {
  const steps = [
    { num: "01", title: "Onboard", desc: "Register your company and connect your Hedera account via MetaMask.", icon: <Building2 size={22} color="#10B981" />, color: "#10B981" },
    { num: "02", title: "Calculate", desc: "Input your emissions data and receive a carbon score and tier rating.", icon: <Calculator size={22} color="#3B82F6" />, color: "#3B82F6" },
    { num: "03", title: "Verify & Mint", desc: "Smart contracts validate your data. A Carbon Passport NFT is minted on Hedera.", icon: <ShieldCheck size={22} color="#8B5CF6" />, color: "#8B5CF6" },
    { num: "04", title: "Trade & Comply", desc: "Buy or sell carbon credits on the marketplace and track your compliance status.", icon: <ArrowLeftRight size={22} color="#F59E0B" />, color: "#F59E0B" },
  ];

  return (
    <section style={walkthroughBand}>
      <div style={sectionInner}>
        <Reveal>
          <h2 style={sectionTitleLg}>
            Your <span style={gradientText}>Compliance</span> Journey
          </h2>
          <p style={sectionSubLg}>Four steps from onboarding to full carbon compliance.</p>
        </Reveal>
        <div style={walkthroughGrid}>
          {steps.map((s, i) => (
            <Reveal key={s.num} delay={0.2 + i * 0.18}>
              <motion.div
                style={walkthroughCard}
                whileHover={{ y: -4, borderColor: `${s.color}35` }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ ...walkthroughIconBox, background: `${s.color}12`, borderColor: `${s.color}25` }}>{s.icon}</div>
                  <span style={{ ...walkthroughNum, color: `${s.color}25` }}>{s.num}</span>
                </div>
                <h4 style={walkthroughTitle}>{s.title}</h4>
                <p style={walkthroughDesc}>{s.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   7. IMPACT — Bold value props with gradient accents
   ═══════════════════════════════════════════════ */
function ImpactSection() {
  const values = [
    { icon: <TrendingUp size={22} color="#10B981" />, label: "Transparent Compliance", desc: "Every data point is verifiable on-chain by any stakeholder.", color: "#10B981" },
    { icon: <ShieldCheck size={22} color="#3B82F6" />, label: "Reduced Fraud", desc: "Immutable records and smart contract enforcement eliminate manipulation.", color: "#3B82F6" },
    { icon: <BarChart3 size={22} color="#8B5CF6" />, label: "Automated Reporting", desc: "Real-time calculations replace manual spreadsheet workflows.", color: "#8B5CF6" },
    { icon: <Sparkles size={22} color="#F59E0B" />, label: "Real-time Verification", desc: "Auditors and regulators can verify claims instantly via Hedera.", color: "#F59E0B" },
  ];

  return (
    <section style={fullSection}>
      <div style={sectionInner}>
        <Reveal>
          <h2 style={sectionTitleLg}>
            Why it <span style={gradientTextBlue}>matters</span>
          </h2>
        </Reveal>
        <div style={impactGrid}>
          {values.map((v, i) => (
            <Reveal key={v.label} delay={0.15 + i * 0.12}>
              <motion.div
                style={impactItem}
                whileHover={{ y: -3, boxShadow: `0 12px 30px ${v.color}12` }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ ...impactIconBox, background: `${v.color}12`, borderColor: `${v.color}25` }}>{v.icon}</div>
                <div>
                  <span style={impactLabel}>{v.label}</span>
                  <p style={impactDesc}>{v.desc}</p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   8. FINAL CTA — Gradient band
   ═══════════════════════════════════════════════ */
function CTASection({ onNavigate }: { onNavigate?: (id: string) => void }) {
  return (
    <section style={ctaBand}>
      <Reveal>
        <div style={{ textAlign: "center" }}>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: "inline-block", marginBottom: 20 }}
          >
            <CarbonLogo size={56} />
          </motion.div>
          <h2 style={{ ...sectionTitleLg, color: "#0F172A", marginBottom: 10 }}>
            Start your <span style={gradientText}>compliance journey</span>
          </h2>
          <p style={{ ...sectionSubLg, marginBottom: 28 }}>
            Register your company, calculate emissions, and mint your first Carbon Passport today.
          </p>
          <button style={ctaPrimaryLg} onClick={() => onNavigate?.("corporate")}>
            Get Started <ArrowRight size={18} />
          </button>
        </div>
      </Reveal>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════ */
interface Props {
  onNavigate?: (tabId: string) => void;
}

export default function PlatformOverview({ onNavigate }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <HeroSection onNavigate={onNavigate} />
      <ProblemSection />
      <VisionSection />
      <SolutionFlow />
      <ServicesGrid onNavigate={onNavigate} />
      <WalkthroughSteps />
      <ImpactSection />
      <CTASection onNavigate={onNavigate} />
    </div>
  );
}


/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */

/* ── Gradient text helpers ── */
const gradientText: CSSProperties = {
  background: "linear-gradient(135deg, #10B981, #059669)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const gradientTextBlue: CSSProperties = {
  background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

/* ── Layout helpers ── */
const fullSection: CSSProperties = {
  padding: "4rem 0",
};

const sectionInner: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "0 3rem",
};

/* ── Hero ── */
const heroShell: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  padding: "4rem 0 3rem",
  background: "linear-gradient(170deg, #F9FAF7 0%, #ECFDF5 30%, #F0F9FF 60%, #F9FAF7 100%)",
};

const heroInner: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "0 3rem",
  display: "flex",
  alignItems: "center",
  gap: "2rem",
};

const heroLeft: CSSProperties = {
  flex: 1.2,
  minWidth: 0,
};

const heroRight: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const heroBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#059669",
  background: "linear-gradient(135deg, #D1FAE5, #A7F3D0)",
  padding: "6px 14px",
  borderRadius: 20,
  marginBottom: 20,
  border: "1px solid #6EE7B740",
};

const heroHeadline: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "3rem",
  fontWeight: 800,
  lineHeight: 1.1,
  color: "#0F172A",
  margin: "0 0 1.2rem",
  letterSpacing: "-0.02em",
};

const heroSub: CSSProperties = {
  fontSize: "1.12rem",
  lineHeight: 1.7,
  color: "#64748B",
  margin: "0 0 1.5rem",
  maxWidth: 520,
};

const trustRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 24,
  flexWrap: "wrap",
};

const trustItem: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#059669",
};

const trustDivider: CSSProperties = {
  color: "#CBD5E1",
  fontSize: "0.8rem",
};

const ctaPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "0.85rem 1.75rem",
  borderRadius: 14,
  fontSize: "1rem",
  fontWeight: 700,
  color: "#FFF",
  background: "linear-gradient(135deg, #10B981 0%, #059669 50%, #3B82F6 100%)",
  border: "none",
  boxShadow: "0 8px 24px rgba(16,185,129,0.3), 0 2px 8px rgba(59,130,246,0.15)",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  transition: "all 0.2s",
};

const ctaPrimaryLg: CSSProperties = {
  ...ctaPrimary,
  padding: "1rem 2.5rem",
  fontSize: "1.1rem",
  borderRadius: 16,
};

const ctaSecondary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "0.85rem 1.75rem",
  borderRadius: 14,
  fontSize: "1rem",
  fontWeight: 600,
  color: "#475569",
  background: "rgba(255,255,255,0.8)",
  border: "1px solid #E2E8F0",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  backdropFilter: "blur(8px)",
};

/* ── Illustration ── */
const illustrationShell: CSSProperties = {
  position: "relative",
  width: 400,
  height: 400,
};

const hubCenter: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%,-50%)",
  zIndex: 2,
  width: 80,
  height: 80,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 30px rgba(16,185,129,0.15), 0 0 0 1px rgba(16,185,129,0.1)",
};

/* ── Section titles (larger) ── */
const sectionTitleLg: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "2.2rem",
  fontWeight: 800,
  color: "#0F172A",
  margin: "0 0 0.6rem",
  textAlign: "center",
  letterSpacing: "-0.01em",
};

const sectionSubLg: CSSProperties = {
  fontSize: "1.05rem",
  color: "#64748B",
  lineHeight: 1.65,
  textAlign: "center",
  maxWidth: 600,
  margin: "0 auto 2.5rem",
};

/* ── Problem ── */
const problemGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "1.5rem",
};

const problemCard: CSSProperties = {
  border: "1px solid",
  borderRadius: 20,
  padding: "2rem 1.5rem",
  textAlign: "center",
  transition: "all 0.25s",
};

const problemIconBox: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 16,
  border: "1px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 14px",
};

const problemTitle: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "1.15rem",
  fontWeight: 700,
  color: "#0F172A",
  margin: "0 0 6px",
};

const problemBold: CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 800,
  color: "#0F172A",
  margin: "0 0 8px",
  fontStyle: "italic",
};

const problemDesc: CSSProperties = {
  fontSize: "0.88rem",
  color: "#64748B",
  lineHeight: 1.6,
  margin: 0,
};

/* ── Vision ── */
const visionBand: CSSProperties = {
  padding: "4rem 0",
  background: "linear-gradient(160deg, #ECFDF5 0%, #F0F9FF 40%, #EDE9FE20 80%, #F9FAF7 100%)",
};

const pillarGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "1.5rem",
};

const pillarCard: CSSProperties = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(16,185,129,0.12)",
  borderRadius: 20,
  padding: "2rem 1.5rem",
  transition: "all 0.25s",
};

const pillarNumber: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "2.5rem",
  fontWeight: 800,
  lineHeight: 1,
  marginBottom: 8,
  display: "block",
};

const pillarLabel: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "1.2rem",
  fontWeight: 800,
  margin: "0 0 8px",
};

const pillarDesc: CSSProperties = {
  fontSize: "0.9rem",
  color: "#64748B",
  lineHeight: 1.6,
  margin: 0,
};

/* ── Solution Flow ── */
const flowRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: 6,
  flexWrap: "wrap",
};

const flowStep: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  width: 130,
  textAlign: "center",
  cursor: "default",
};

const flowIconCircle: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const flowLabel: CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 700,
  color: "#0F172A",
};

const flowDesc: CSSProperties = {
  fontSize: "0.78rem",
  color: "#94A3B8",
  lineHeight: 1.4,
};

/* ── Services Grid ── */
const servicesGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "1.5rem",
};

const serviceCard: CSSProperties = {
  border: "1px solid",
  borderRadius: 20,
  padding: "1.75rem",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  transition: "all 0.25s",
};

const serviceIconBox: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 14,
  border: "1px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const serviceTitle: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "#0F172A",
  margin: 0,
};

const serviceDesc: CSSProperties = {
  fontSize: "0.85rem",
  color: "#64748B",
  lineHeight: 1.55,
  margin: 0,
  flex: 1,
};

const serviceBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: "0.85rem",
  fontWeight: 700,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  marginTop: 6,
};

/* ── Walkthrough ── */
const walkthroughBand: CSSProperties = {
  padding: "4rem 0",
  background: "linear-gradient(160deg, #F0F9FF 0%, #ECFDF5 40%, #EDE9FE10 80%, #F9FAF7 100%)",
};

const walkthroughGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "1.5rem",
};

const walkthroughCard: CSSProperties = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(16,185,129,0.1)",
  borderRadius: 20,
  padding: "1.5rem",
  transition: "all 0.25s",
};

const walkthroughIconBox: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: "1px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const walkthroughNum: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "1.8rem",
  fontWeight: 800,
};

const walkthroughTitle: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "#0F172A",
  margin: "0 0 6px",
};

const walkthroughDesc: CSSProperties = {
  fontSize: "0.85rem",
  color: "#64748B",
  lineHeight: 1.55,
  margin: 0,
};

/* ── Impact ── */
const impactGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "1.25rem",
  maxWidth: 800,
  margin: "0 auto",
};

const impactItem: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  padding: "1.25rem",
  background: "rgba(255,255,255,0.6)",
  border: "1px solid #E2E8F0",
  borderRadius: 16,
  transition: "all 0.25s",
};

const impactIconBox: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: "1px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const impactLabel: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "#0F172A",
  display: "block",
};

const impactDesc: CSSProperties = {
  fontSize: "0.85rem",
  color: "#64748B",
  lineHeight: 1.55,
  margin: "4px 0 0",
};

/* ── CTA ── */
const ctaBand: CSSProperties = {
  padding: "4rem 3rem",
  background: "linear-gradient(160deg, #ECFDF5 0%, #F0F9FF 50%, #F9FAF7 100%)",
  borderRadius: 0,
};
