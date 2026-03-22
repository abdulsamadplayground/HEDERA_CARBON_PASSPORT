"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, Plus, ShoppingCart, ArrowLeft, Clock, Tag } from "lucide-react";
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
  const { companies } = useCompanies();
  const [view, setView] = useState<"browse" | "create" | "buy">("browse");
  const [sellerCompanyId, setSellerCompanyId] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [pricePerCCR, setPricePerCCR] = useState("25");
  const [marketType, setMarketType] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [buyerCompanyId, setBuyerCompanyId] = useState("");
  const [listingId, setListingId] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const companyOptions: SelectOption[] = companies.map((c) => ({
    value: c.id,
    label: `${c.companyName} (${c.sector})`,
  }));

  const activeListings = listings.filter((l) => (l.status || "") === "ACTIVE");
  const listingOptions: SelectOption[] = activeListings.map((l) => ({
    value: l.id,
    label: `${l.quantity} CCR @ ${l.pricePerCCR}/unit (${l.marketType})`,
  }));

  const fetchListings = async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/marketplace/listings");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setListings(json.data);
      else setListings([]);
    } catch { setListings([]); }
    finally { setLoadingData(false); }
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

  const purchaseCredits = async () => {
    const res = await call("/api/marketplace/buy", {
      method: "POST", body: { buyerCompanyId, listingId },
      txType: "Credit Purchase",
      txDescription: `Purchased credits from listing`,
    });
    if (res.data) { setResult(res.data as Record<string, unknown>); fetchListings(); fetchHistory(buyerCompanyId); }
  };

  return (
    <GlassCard hover={false} glow>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={iconBox}><Store size={18} color="#F59E0B" /></div>
          <div>
            <h3 style={heading}>Credit Marketplace</h3>
            <p style={subtext}>List, browse, and purchase carbon credits (CCR tokens)</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {view === "browse" ? (
            <>
              <AccentButton size="sm" icon={<Plus size={14} />} onClick={() => { setView("create"); setResult(null); }}
                style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 4px 12px rgba(245,158,11,0.2)" }}>
                Create Listing
              </AccentButton>
              <AccentButton size="sm" icon={<ShoppingCart size={14} />} onClick={() => { setView("buy"); setResult(null); }}
                style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 4px 12px rgba(59,130,246,0.2)" }}>
                Purchase
              </AccentButton>
            </>
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
            {loadingData && <p style={statusText}>Loading listings...</p>}
            {!loadingData && listings.length === 0 && <p style={statusText}>No marketplace listings found.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }}>
              {listings.map((l, i) => (
                <motion.div key={l.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }} style={dataCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={cardTitle}>{l.quantity} CCR</span>
                    <span style={priceBadge}><Tag size={12} style={{ marginRight: 4 }} />${l.pricePerCCR}/unit</span>
                  </div>
                  <div style={cardRow}>
                    <span>{l.marketType}</span>
                    <span style={{ color: (l.status || "") === "ACTIVE" ? "#10b981" : "#94A3B8" }}>{l.status}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} />Expires {new Date(l.expiresAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {view === "create" && (
          <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <div style={formGrid}>
              <FormField label="Seller Company" value={sellerCompanyId} onChange={setSellerCompanyId} options={companyOptions} required />
              <FormField label="Quantity (CCR)" value={quantity} onChange={setQuantity} type="number" required />
              <FormField label="Price per CCR ($)" value={pricePerCCR} onChange={setPricePerCCR} type="number" required />
              <FormField label="Market Type" value={marketType} onChange={setMarketType} options={MARKET_TYPE_OPTIONS} required />
              <FormField label="Expires At" value={expiresAt} onChange={setExpiresAt} type="datetime-local" />
            </div>
            <AccentButton fullWidth onClick={createListing} disabled={loading}
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 4px 12px rgba(245,158,11,0.2)", marginTop: "0.5rem" }}>
              {loading ? "Creating..." : "Create Listing"}
            </AccentButton>
            {result && <pre style={resultBox}>{JSON.stringify(result, null, 2)}</pre>}
          </motion.div>
        )}

        {view === "buy" && (
          <motion.div key="buy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <div style={formGrid}>
              <FormField label="Buyer Company" value={buyerCompanyId} onChange={setBuyerCompanyId} options={companyOptions} required />
              <FormField label="Listing" value={listingId} onChange={setListingId} options={listingOptions} required />
            </div>
            <AccentButton fullWidth onClick={purchaseCredits} disabled={loading}
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 4px 12px rgba(59,130,246,0.2)", marginTop: "0.5rem" }}>
              {loading ? "Purchasing..." : "Purchase Credits"}
            </AccentButton>
            {result && <pre style={resultBox}>{JSON.stringify(result, null, 2)}</pre>}
            {history.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <div style={sectionHeader}>Purchase History</div>
                {history.map((h, i) => (
                  <motion.div key={h.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} style={dataCard}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0F172A" }}>{h.quantity} CCR</span>
                      <span style={priceBadge}>${(h.totalPrice ?? 0).toLocaleString()}</span>
                    </div>
                    <span style={cardDate}>{new Date(h.createdAt).toLocaleDateString()}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

const headerRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" };
const iconBox: CSSProperties = { width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const heading: CSSProperties = { fontSize: "1.05rem", fontWeight: 700, color: "#0F172A", margin: 0, fontFamily: "'Space Grotesk', sans-serif" };
const subtext: CSSProperties = { fontSize: "0.78rem", color: "#64748B", margin: 0 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" };
const sectionHeader: CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "#F59E0B", marginBottom: "0.5rem", paddingBottom: "0.35rem", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const resultBox: CSSProperties = { marginTop: "1rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "0.75rem", fontSize: "0.75rem", color: "#475569", overflow: "auto", maxHeight: 200, fontFamily: "monospace" };
const dataCard: CSSProperties = { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.5rem" };
const cardTitle: CSSProperties = { fontWeight: 700, fontSize: "0.88rem", color: "#0F172A" };
const priceBadge: CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "#34D399", background: "rgba(16,185,129,0.12)", padding: "0.15rem 0.5rem", borderRadius: 12, display: "inline-flex", alignItems: "center" };
const cardRow: CSSProperties = { display: "flex", gap: "1rem", fontSize: "0.75rem", color: "#64748B", marginTop: "0.35rem" };
const cardDate: CSSProperties = { fontSize: "0.7rem", color: "#94A3B8", marginTop: "0.25rem", display: "block" };
const statusText: CSSProperties = { fontSize: "0.82rem", color: "#94A3B8", textAlign: "center", padding: "1rem 0" };
