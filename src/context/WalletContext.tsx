"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

const HEDERA_TESTNET = {
  chainId: "0x128", // 296 in hex
  chainName: "Hedera Testnet",
  rpcUrls: ["https://testnet.hashio.io/api"],
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  blockExplorerUrls: ["https://hashscan.io/testnet"],
};

const FAUCET_URL = "https://faucet.hedera.com";
const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

interface WalletState {
  connected: boolean;
  connecting: boolean;
  evmAddress: string;
  hederaAccountId: string;
  balance: string;
  error: string;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  hasMetaMask: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

async function resolveHederaAccountId(evmAddress: string): Promise<string> {
  try {
    const res = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}`);
    if (res.ok) {
      const data = await res.json();
      if (data.account) return data.account;
    }
  } catch { /* not found yet */ }
  return "";
}

async function fundViaFaucet(evmAddress: string): Promise<boolean> {
  try {
    const res = await fetch(`${FAUCET_URL}/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: evmAddress, amount: 100 }),
    });
    return res.ok;
  } catch {
    // Faucet might have CORS restrictions — try alternate approach
    try {
      const res = await fetch(`${FAUCET_URL}/auth/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountAddress: evmAddress }),
      });
      return res.ok;
    } catch { return false; }
  }
}

async function getBalance(evmAddress: string): Promise<string> {
  try {
    const res = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}`);
    if (res.ok) {
      const data = await res.json();
      const tinybar = Number(data.balance?.balance || 0);
      return (tinybar / 1e8).toFixed(2);
    }
  } catch { /* silent */ }
  return "0.00";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    connecting: false,
    evmAddress: "",
    hederaAccountId: "",
    balance: "0.00",
    error: "",
  });
  const [hasMetaMask, setHasMetaMask] = useState(false);

  // Detect MetaMask
  useEffect(() => {
    const check = () => {
      const eth = (window as unknown as { ethereum?: { isMetaMask?: boolean } }).ethereum;
      setHasMetaMask(!!eth?.isMetaMask);
    };
    check();
    // MetaMask might inject late
    window.addEventListener("load", check);
    return () => window.removeEventListener("load", check);
  }, []);

  const connect = useCallback(async () => {
    const eth = (window as unknown as { ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
    } }).ethereum;

    if (!eth?.isMetaMask) {
      setState(s => ({ ...s, error: "MetaMask not detected. Please install MetaMask." }));
      return;
    }

    setState(s => ({ ...s, connecting: true, error: "" }));

    try {
      // 1. Request account access
      const accounts = await eth.request({ method: "eth_requestAccounts" }) as string[];
      if (!accounts.length) throw new Error("No accounts returned");
      const address = accounts[0];

      // 2. Switch to / add Hedera Testnet
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: HEDERA_TESTNET.chainId }],
        });
      } catch (switchErr: unknown) {
        const err = switchErr as { code?: number };
        // 4902 = chain not added yet
        if (err.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [HEDERA_TESTNET],
          });
        } else {
          throw switchErr;
        }
      }

      // 3. Check if account exists on Hedera testnet
      let accountId = await resolveHederaAccountId(address);

      // 4. If no account, fund via faucet to auto-create
      if (!accountId) {
        await fundViaFaucet(address);
        // Wait for account creation to propagate
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 3000));
          accountId = await resolveHederaAccountId(address);
          if (accountId) break;
        }
      }

      // 5. Get balance
      const bal = await getBalance(address);

      setState({
        connected: true,
        connecting: false,
        evmAddress: address,
        hederaAccountId: accountId || "Pending...",
        balance: bal,
        error: accountId ? "" : "Account created but ID not yet resolved. It may take a moment.",
      });

      // Listen for account changes
      eth.on?.("accountsChanged", () => {
        setState({ connected: false, connecting: false, evmAddress: "", hederaAccountId: "", balance: "0.00", error: "" });
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setState(s => ({ ...s, connecting: false, error: msg }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ connected: false, connecting: false, evmAddress: "", hederaAccountId: "", balance: "0.00", error: "" });
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, hasMetaMask }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
