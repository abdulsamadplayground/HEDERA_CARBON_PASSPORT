/**
 * GET /api/platform-ids — Returns all deployed platform IDs (tokens, topics, contracts).
 *
 * Reads from the local config store and returns structured data
 * for building HashScan verification links on the frontend.
 */

import { successResponse, handleApiError } from "@/lib/api";
import { readStore } from "@/lib/local-store";

const TOKEN_SYMBOLS = ["CCR", "CAL", "CSTAMP", "CPASS", "GBT", "VCLAIM"];
const TOPIC_NAMES = [
  "CompanyRegistration", "EmissionsCalculation", "CompliancePassport",
  "CapAndTrade", "Marketplace", "Projections", "AuditReports",
  "PolicyCompliance", "Rewards", "GuardianMRV", "VerifiableClaims", "SupplyChain",
];
const CONTRACT_NAMES = [
  "CompliancePassportManager", "CapTradeManager", "CreditMarketplace",
  "RewardDistributor", "DIDRegistry", "ClaimsManager",
];

export async function GET() {
  try {
    const store = readStore();

    const tokens: Record<string, string | null> = {};
    for (const sym of TOKEN_SYMBOLS) {
      tokens[sym] = (store[`tokens.${sym}`] as string) ?? null;
    }

    const topics: Record<string, string | null> = {};
    for (const name of TOPIC_NAMES) {
      topics[name] = (store[`topics.${name}`] as string) ?? null;
    }

    const contracts: Record<string, string | null> = {};
    for (const name of CONTRACT_NAMES) {
      const entry = store[`contracts.${name}.id`] as string | undefined;
      contracts[name] = entry ?? null;
    }

    return successResponse({
      network: (process.env.HEDERA_NETWORK || "testnet").trim(),
      operatorId: process.env.HEDERA_OPERATOR_ID?.trim() || null,
      tokens,
      topics,
      contracts,
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
