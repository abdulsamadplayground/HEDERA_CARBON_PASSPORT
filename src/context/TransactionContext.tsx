"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface TransactionEntry {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  status: "success" | "error";
  transactionId?: string;
  hashscanUrl?: string;
  responseData?: unknown;
  errorMessage?: string;
}

export interface ToastEntry {
  id: string;
  message: string;
  status: "success" | "error";
  hashscanUrl?: string;
  createdAt: number;
}

interface TransactionContextType {
  transactions: TransactionEntry[];
  toasts: ToastEntry[];
  addTransaction: (entry: TransactionEntry) => void;
  removeToast: (id: string) => void;
  clearTransactions: () => void;
}

const TransactionContext = createContext<TransactionContextType | null>(null);

const STORAGE_KEY = "carbon_platform_transactions";
const HASHSCAN_BASE = "https://hashscan.io/testnet/transaction";

export function buildHashscanUrl(transactionId: string): string {
  const [accountPart, timestampPart] = transactionId.split("@");
  if (!timestampPart) return `${HASHSCAN_BASE}/${transactionId}`;
  const formatted = `${accountPart}-${timestampPart.replace(".", "-")}`;
  return `${HASHSCAN_BASE}/${formatted}`;
}

export function extractTransactionId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;
  if (typeof obj.transactionId === "string") return obj.transactionId;
  if (typeof obj.hcsTransactionId === "string") return obj.hcsTransactionId;
  if (typeof obj.mintTransactionId === "string") return obj.mintTransactionId;
  if (obj.data && typeof obj.data === "object") return extractTransactionId(obj.data);
  return undefined;
}

function loadFromStorage(): TransactionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveToStorage(entries: TransactionEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 200)));
  } catch { /* ignore */ }
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setTransactions(loadFromStorage());
    setHydrated(true);
  }, []);

  // Persist whenever transactions change (after hydration)
  useEffect(() => {
    if (hydrated) saveToStorage(transactions);
  }, [transactions, hydrated]);

  const addTransaction = useCallback((entry: TransactionEntry) => {
    setTransactions((prev) => [entry, ...prev]);
    const toast: ToastEntry = {
      id: entry.id,
      message: entry.status === "success" ? `✅ ${entry.type}: ${entry.description}` : `❌ ${entry.type}: ${entry.errorMessage || "Failed"}`,
      status: entry.status,
      hashscanUrl: entry.hashscanUrl,
      createdAt: Date.now(),
    };
    setToasts((prev) => [...prev, toast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
    saveToStorage([]);
  }, []);

  return (
    <TransactionContext.Provider value={{ transactions, toasts, addTransaction, removeToast, clearTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error("useTransactions must be used within TransactionProvider");
  return ctx;
}
