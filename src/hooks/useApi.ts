"use client";

import { useState, useCallback } from "react";
import { useTransactions, buildHashscanUrl, extractTransactionId, TransactionEntry } from "@/context/TransactionContext";
import { useWallet } from "@/context/WalletContext";

interface ApiCallOptions {
  method?: string;
  body?: unknown;
  txType: string;
  txDescription: string;
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const { addTransaction } = useTransactions();
  const wallet = useWallet();

  const call = useCallback(async <T = unknown>(path: string, opts: ApiCallOptions): Promise<{ success: boolean; data?: T; error?: string }> => {
    setLoading(true);
    const start = Date.now();
    try {
      // Inject connected wallet credentials into request headers
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (wallet.connected && wallet.hederaAccountId && wallet.hederaAccountId !== "Pending...") {
        headers["x-hedera-account-id"] = wallet.hederaAccountId;
      }
      if (wallet.connected && wallet.evmAddress) {
        headers["x-hedera-evm-address"] = wallet.evmAddress;
      }

      const res = await fetch(path, {
        method: opts.method || "POST",
        headers,
        ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
      });
      const json = await res.json();

      const txId = extractTransactionId(json?.data) || extractTransactionId(json);
      const entry: TransactionEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: opts.txType,
        description: opts.txDescription,
        status: json.success ? "success" : "error",
        transactionId: txId,
        hashscanUrl: txId ? buildHashscanUrl(txId) : undefined,
        responseData: json.data,
        errorMessage: json.success ? undefined : json.error?.message,
      };

      addTransaction(entry);

      if (json.success) {
        return { success: true, data: json.data as T };
      } else {
        return { success: false, error: json.error?.message || `Error (${res.status})` };
      }
    } catch (err) {
      const entry: TransactionEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: opts.txType,
        description: opts.txDescription,
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Network error",
      };
      addTransaction(entry);
      return { success: false, error: entry.errorMessage };
    } finally {
      setLoading(false);
    }
  }, [addTransaction, wallet.connected, wallet.hederaAccountId, wallet.evmAddress]);

  return { call, loading };
}
