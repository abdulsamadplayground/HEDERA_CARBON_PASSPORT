/**
 * Extracts connected wallet credentials from request headers.
 * The frontend sends these via x-hedera-account-id and x-hedera-evm-address headers.
 */

import { NextRequest } from "next/server";

export interface WalletCredentials {
  hederaAccountId: string | null;
  evmAddress: string | null;
}

export function extractWalletCredentials(request: NextRequest): WalletCredentials {
  return {
    hederaAccountId: request.headers.get("x-hedera-account-id"),
    evmAddress: request.headers.get("x-hedera-evm-address"),
  };
}

/**
 * Returns the connected wallet's Hedera account ID, or falls back to the
 * platform operator ID from env vars.
 */
export function getCallerAccountId(request: NextRequest): string {
  const walletId = request.headers.get("x-hedera-account-id");
  if (walletId) return walletId;
  return process.env.HEDERA_OPERATOR_ID?.trim() || "";
}
