"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, Plus, ArrowLeft, Clock, Tag, Sparkles, ShoppingCart, Coins } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanies } from "@/hooks/useCompanies";
import GlassCard from "@/components/ui/GlassCard";
import AccentButton from "@/components/ui/AccentButton";
import FormField from "@/components/ui/FormField";
import type { SelectOption } from "@/components/ui/FormField";
import type { CSSProperties } from "react";

const MARKET_TYPE_OPTIONS: SelectOption[] = [
  { value: "COMPLIANCE", label: "Compliance" },
  { value: "VOLUNTARY", label: "Voluntary" },
];

interface Listing {
  id: string;
  quantity: number;
  pricePerCCR: number;
  marketType: string;
  status: string;
  sellerCompanyId: string;
  expiresAt: string;
  createdAt: string;
  sellerCompanyName?: string;
}

interface Transaction {
  id: string;
  quantity: number;
  totalPrice: number;
  listingId: string;
  createdAt: string;
}

export default function Marketplace() {
  const { call, loading } = useApi();
  const { companies, refresh: refreshCompanies } = useCompanies();
  const [view, setView] = useState<"browse" | "create">("browse");
  const [sellerCompanyId, setSellerCompanyId] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [pricePerCCR, setPricePerCCR] = useState("25");
  const [marketType, setMarketType] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [buyerCompanyId, setBuyerCompanyId] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const companyOptions: SelectOption[] = companies.map((c) => ({
    value: c.id,
    label: `${c.companyName} (${c.sector})`,
  }));

  const activeListings = listings.filter((l) => (l.status || "") === "ACTIVE");

  const fetchListings = async () => {
    setLoadingData(true);
    try {
      const [listingsRes, companiesRes] = await Promise.all([
        fetch("/api/marketplace/listings"),
        fetch("/api/companies"),
      ]);
      const listingsJson = await listingsRes.json();
      const companiesJson = await companiesRes.json();
      const allCompanies = companiesJson.success && Array.isArray(companiesJson.data) ? companiesJson.data : [];

      if (listingsJson.success && Array.isArray(listingsJson.data)) {
        const enriched = listingsJson.data.map((l: Listing) => {
          const seller = allCompanies.find((c: { id: string; companyName: string }) => c.id === l.sellerCompanyId);
          return { ...l, sellerCompanyName: seller?.companyName || "External Seller" };
        });
        setListings(enriched);
      } else setListings([]);
    } catch { setListings([]); }
    finally { setLoadingData(false); }
  };

  const seedDemoListings = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/marketplace/demo-listings", { method: "POST" });
      const json = await res.json();
      if (json.success) { await refreshCompanies(); await fetchListings(); }
    } catch { /* silent */ }
    finally { setSeeding(false); }
  };

  const fetchHistory = async (cId: string) => {
    if (!cId) { setHistory([]); return; }
    try {
      const res = await fetch(`/api/marketplace/history/${cId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setHistory(json.data);
      else setHistory([]);
    } catch { setHistory([]); }
  };

  useEffect(() => { fetchListings(); }, []);
  useEffect(() => { if (buyerCompanyId) fetchHistory(buyerCompanyId); }, [buyerCompanyId]);

  const createListing = async () => {
    const res = await call("/api/marketplace/listings", {
      method: "POST",
      body: {
        sellerCompanyId, quantity: Number(quantity), pricePerCCR: Number(pricePerCCR), marketType,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      txType: "Marketplace Listing",
      txDescription: `Listed ${quantity} CCR at ${pricePerCCR}/unit`,
    });
    if (res.data) { setResult(res.data as Record<string, unknown>); fetchListings(); }
  };

  const buyListing = async (listing: Listing) => {
    if (!buyerCompanyId) return;
    setBuyingId(listing.id);
    const res = await call("/api/marketplace/buy", {
      method: "POST",
      body: { buyerCompanyId, listingId: listing.id },
      txType: "Credit Purchase",
      txDescription: `Purchased ${listing.quantity} credits from ${listing.sellerCompanyName} for ${(listing.quantity * listing.pricePerCCR).toLocaleString()} CCR`,
    });
    if (res.data) { setResult(res.data as Record<string, unknown>); fetchListings(); fetchHistory(buyerCompanyId); }
    setBuyingId(null);
  };

  return (
    <GlassCard hover={false} glow>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={iconBox}><Store size={18} color="#F59E0B" /></div>
          <div>
            <h3 style={heading}>Credit Marketplace</h3>
            <p style={subtext}>Browse and purchase carbon credit surplus using CCR tokens</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {view === "browse" ? (
            <AccentButton size="sm" icon={<Plus size={14} />} onClick={() => { setView("create"); setResult(null); }}
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 4px 12px rgba(245,158,11,0.2)" }}>
              Create Listing
            </AccentButton>
          ) : (
            <AccentButton variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => { setView("browse"); setResult(null); }}>
              Back
            </AccentButton>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            {/* Buyer selector + summary */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <FormField label="Your Company (Buyer)" value={buyerCompanyId} onChange={setBuyerCompanyId} options={companyOptions} hint="Select your company to enable purchasing" />
              </div>
              <button onClick={seedDemoListings} disabled={seeding} style={seedBtnSmall}>
                <Sparkles size={12} /> {seeding ? "Seeding..." : "Seed Listings"}
              </button>
            </div>

            {loadingData && <p style={statusText}>Loading listings...</p>}

            {!loadingData && listings.length === 0 && (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <Store size={40} color="#CBD5E1" />
                <p style={{ ...statusText, marginTop: "0.5rem" }}>No marketplace listings yet.</p>
                <button onClick={seedDemoListings} disabled={seeding} style={seedBtn}>
                  <Sparkles size={14} /> {seeding ? "Seeding..." : "Seed Demo Listings"}
                </button>
              </div>
            )}

            {/* Summary bar */}
            {listings.length > 0 && (
              <div style={summaryBar}>
                <div style={summaryItem}>
                  <span style={summaryLabel}>Active</span>
                  <span style={summaryValue}>{activeListings.length}</span>
                </div>
                <div style={summaryItem}>
                  <span style={summaryLabel}>Total CCR</span>
                  <span style={{ ...summaryValue, color: "#F59E0B" }}>{activeListings.reduce((s, l) => s + l.quantity, 0).toLocaleString()}</span>
                </div>
                <div style={summaryItem}>
                  <span style={summaryLabel}>Avg Rate</span>
                  <span style={{ ...summaryValue, color: "#10B981" }}>{activeListings.length > 0 ? (activeListings.reduce((s, l) => s + l.pricePerCCR, 0) / activeListings.length).toFixed(0) : 0} CCR</span>
                </div>
              </div>
            )}

            {/* Card Grid — 4 per row */}
            <div style={cardGrid}>
              {listings.map((l, i) => {
                const isOwn = buyerCompanyId && l.sellerCompanyId === buyerCompanyId;
                const isSold = l.status !== "ACTIVE";
                const canBuy = buyerCompanyId && !isOwn && !isSold;
                const totalCost = l.quantity * l.pricePerCCR;

                return (
                  <motion.div key={l.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04, duration: 0.25 }}
                    style={{ ...gridCard, opacity: isSold ? 0.5 : 1, borderColor: isOwn ? "rgba(245,158,11,0.3)" : "#E2E8F0" }}>
                    {/* Market type badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={mktBadge(l.marketType)}>{l.marketType}</span>
                      <span style={{ fontSize: "0.65rem", color: isSold ? "#EF4444" : "#10B981", fontWeight: 700 }}>{l.status}</span>
                    </div>

                    {/* Quantity */}
                    <div style={{ textAlign: "center", margin: "0.5rem 0" }}>
                      <span style={qtyText}>{l.quantity.toLocaleString()}</span>
                      <span style={qtyLabel}>CCR Credits</span>
                    </div>

                    {/* Rate */}
                    <div style={rateRow}>
                      <Tag size={12} color="#F59E0B" />
                      <span style={rateText}>{l.pricePerCCR} CCR/unit</span>
                    </div>

                    {/* Total cost */}
                    <div style={totalRow}>
                      <Coins size={12} color="#64748B" />
                      <span style={{ fontSize: "0.72rem", color: "#64748B" }}>Total: </span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#F59E0B" }}>{totalCost.toLocaleString()} CCR</span>
                    </div>

                    {/* Seller */}
                    <div style={sellerRow}>
                      <span style={{ fontSize: "0.72rem", color: "#334155", fontWeight: 600 }}>{l.sellerCompanyName}</span>
                    </div>

                    {/* Expiry */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", color: "#94A3B8", marginTop: "0.25rem" }}>
                      <Clock size={10} /> {new Date(l.expiresAt).toLocaleDateString()}
                    </div>

                    {/* Buy button */}
                    <button
                      onClick={() => canBuy && buyListing(l)}
                      disabled={!canBuy || buyingId === l.id}
                      style={{
                        ...buyBtn,
                        opacity: canBuy ? 1 : 0.4,
                        cursor: canBuy ? "pointer" : "not-allowed",
                        background: isOwn ? "#F1F5F9" : "linear-gradient(135deg, #3B82F6, #2563EB)",
                        color: isOwn ? "#94A3B8" : "#FFFFFF",
                      }}
                    >
                      <ShoppingCart size={13} />
                      {buyingId === l.id ? "Buying..." : isOwn ? "Your Listing" : isSold ? "Sold" : !buyerCompanyId ? "Select Buyer" : `Buy for ${totalCost.toLocaleString()} CCR`}
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Purchase history */}
            {history.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <div style={sectionHeader}>Your Purchase History</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" }}>
                  {history.map((h, i) => (
                    <motion.div key={h.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} style={historyCard}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "#0F172A" }}>{h.quantity} CCR</span>
                        <span style={costBadge}>{(h.totalPrice ?? 0).toLocaleString()} CCR</span>
                      </div>
                      <span style={{ fontSize: "0.68rem", color: "#94A3B8" }}>{new Date(h.createdAt).toLocaleDateString()}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {view === "create" && (
          <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <div style={formGrid}>
              <FormField label="Seller Company" value={sellerCompanyId} onChange={setSellerCompanyId} options={companyOptions} required />
              <FormField label="Quantity (CCR)" value={quantity} onChange={setQuantity} type="number" required />
              <FormField label="Price per unit (CCR)" value={pricePerCCR} onChange={setPricePerCCR} type="number" required />
              <FormField label="Market Type" value={marketType} onChange={setMarketType} options={MARKET_TYPE_OPTIONS} required />
              <FormField label="Expires At" value={expiresAt} onChange={setExpiresAt} type="datetime-local" />
            </div>
            <AccentButton fullWidth onClick={createListing} disabled={loading}
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 4px 12px rgba(245,158,11,0.2)", marginTop: "0.5rem" }}>
              {loading ? "Creating..." : "Create Listing"}
            </AccentButton>
            {result && (
              <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 10, fontSize: "0.82rem", color: "#059669", fontWeight: 600 }}>
                Listing created successfully. Check the Activity Log for details.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

/* ── Styles ── */
const headerRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" };
const iconBox: CSSProperties = { width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const heading: CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "#0F172A", margin: 0, fontFamily: "'Space Grotesk', sans-serif" };
const subtext: CSSProperties = { fontSize: "0.78rem", color: "#64748B", margin: 0 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" };
const statusText: CSSProperties = { fontSize: "0.82rem", color: "#94A3B8", textAlign: "center", padding: "0.5rem 0" };

const seedBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.25rem", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, color: "#FFFFFF", background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", border: "1px solid rgba(139,92,246,0.3)", cursor: "pointer", boxShadow: "0 4px 12px rgba(139,92,246,0.25)", marginTop: "0.75rem" };
const seedBtnSmall: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.45rem 0.75rem", borderRadius: 8, fontSize: "0.72rem", fontWeight: 600, color: "#8B5CF6", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, marginBottom: "0.35rem" };

const summaryBar: CSSProperties = { display: "flex", alignItems: "center", gap: "2rem", padding: "0.6rem 1rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, marginBottom: "0.75rem" };
const summaryItem: CSSProperties = { display: "flex", flexDirection: "column" };
const summaryLabel: CSSProperties = { fontSize: "0.62rem", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.04em" };
const summaryValue: CSSProperties = { fontSize: "1rem", fontWeight: 800, color: "#0F172A", fontFamily: "'Space Grotesk', sans-serif" };

const cardGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" };

const gridCard: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: "0.85rem",
  display: "flex",
  flexDirection: "column",
  transition: "all 0.2s",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const mktBadge = (type: string): CSSProperties => ({
  fontSize: "0.6rem", fontWeight: 700, padding: "0.12rem 0.4rem", borderRadius: 6, letterSpacing: "0.03em",
  background: type === "COMPLIANCE" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)",
  color: type === "COMPLIANCE" ? "#3B82F6" : "#10B981",
  border: `1px solid ${type === "COMPLIANCE" ? "rgba(59,130,246,0.2)" : "rgba(16,185,129,0.2)"}`,
});

const qtyText: CSSProperties = { display: "block", fontSize: "1.6rem", fontWeight: 800, color: "#0F172A", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 };
const qtyLabel: CSSProperties = { display: "block", fontSize: "0.65rem", fontWeight: 600, color: "#94A3B8", marginTop: "0.15rem", letterSpacing: "0.03em" };

const rateRow: CSSProperties = { display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.3rem 0.5rem", background: "rgba(245,158,11,0.06)", borderRadius: 8, marginTop: "0.35rem" };
const rateText: CSSProperties = { fontSize: "0.75rem", fontWeight: 700, color: "#F59E0B" };

const totalRow: CSSProperties = { display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.3rem" };
const sellerRow: CSSProperties = { marginTop: "0.35rem", paddingTop: "0.35rem", borderTop: "1px solid #F1F5F9" };

const buyBtn: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.35rem",
  padding: "0.45rem",
  borderRadius: 8,
  fontSize: "0.72rem",
  fontWeight: 700,
  border: "none",
  marginTop: "0.5rem",
  transition: "all 0.2s",
};

const sectionHeader: CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "#F59E0B", marginBottom: "0.5rem", paddingBottom: "0.35rem", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const historyCard: CSSProperties = { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "0.6rem 0.85rem" };
const costBadge: CSSProperties = { fontSize: "0.75rem", fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.1)", padding: "0.1rem 0.45rem", borderRadius: 10 };
