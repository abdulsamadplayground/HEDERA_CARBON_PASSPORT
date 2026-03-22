/**
 * Token configuration definitions for all 6 corporate compliance platform tokens.
 *
 * Replaces the previous 8 consumer-focused tokens (CPASS, LIVE, SCONT, GCHAMP,
 * GVOUCHER, GCT, CCT, GST) with 6 new corporate tokens: CCR, CAL, CSTAMP,
 * CPASS, GBT, VCLAIM.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TokenKind = "NFT" | "FUNGIBLE";

export interface KeyRequirements {
  admin: boolean;
  supply: boolean;
  metadata: boolean;
}

export interface RoyaltyFeeConfig {
  type: "royalty";
  numerator: number;
  denominator: number;
  feeCollectorEnvVar: string;
  fallbackHbar: number;
}

export interface FractionalFeeConfig {
  type: "fractional";
  numerator: number;
  denominator: number;
  feeCollectorEnvVar: string;
}

export type CustomFeeConfig = RoyaltyFeeConfig | FractionalFeeConfig;

export interface TokenDefinition {
  name: string;
  symbol: string;
  kind: TokenKind;
  decimals?: number;
  initialSupply?: number;
  keys: KeyRequirements;
  customFees?: CustomFeeConfig[];
}

// ---------------------------------------------------------------------------
// Token definitions
// ---------------------------------------------------------------------------

/**
 * CCR — Carbon Credit Token (fungible).
 * Requirement 3.1: Fungible, 2 decimals, supply key, 1% fractional fee to treasury.
 */
export const CCR_CONFIG: TokenDefinition = {
  name: "Carbon Credit Token",
  symbol: "CCR",
  kind: "FUNGIBLE",
  decimals: 2,
  initialSupply: 0,
  keys: { admin: false, supply: true, metadata: false },
  customFees: [
    {
      type: "fractional",
      numerator: 1,
      denominator: 100,
      feeCollectorEnvVar: "HEDERA_TREASURY_ID",
    },
  ],
};

/**
 * CAL — Carbon Allowance Token (fungible).
 * Requirement 3.2: Fungible, 0 decimals, supply key.
 */
export const CAL_CONFIG: TokenDefinition = {
  name: "Carbon Allowance Token",
  symbol: "CAL",
  kind: "FUNGIBLE",
  decimals: 0,
  initialSupply: 0,
  keys: { admin: false, supply: true, metadata: false },
};

/**
 * CSTAMP — Compliance Stamp NFT.
 * Requirement 3.3: NFT with supply and metadata keys.
 */
export const CSTAMP_CONFIG: TokenDefinition = {
  name: "Compliance Stamp",
  symbol: "CSTAMP",
  kind: "NFT",
  keys: { admin: false, supply: true, metadata: true },
};

/**
 * CPASS — Dynamic Carbon Passport NFT.
 * Requirement 3.4: NFT with admin, supply, and metadata keys.
 */
export const CPASS_CONFIG: TokenDefinition = {
  name: "Dynamic Carbon Passport",
  symbol: "CPASS",
  kind: "NFT",
  keys: { admin: true, supply: true, metadata: true },
};

/**
 * GBT — Green Bond Token (fungible).
 * Requirement 3.5: Fungible, 2 decimals, supply key, 0.5% fractional fee to treasury.
 */
export const GBT_CONFIG: TokenDefinition = {
  name: "Green Bond Token",
  symbol: "GBT",
  kind: "FUNGIBLE",
  decimals: 2,
  initialSupply: 0,
  keys: { admin: false, supply: true, metadata: false },
  customFees: [
    {
      type: "fractional",
      numerator: 5,
      denominator: 1000,
      feeCollectorEnvVar: "HEDERA_TREASURY_ID",
    },
  ],
};

/**
 * VCLAIM — Verifiable Claim NFT.
 * Requirement 3.6: NFT with supply and metadata keys.
 */
export const VCLAIM_CONFIG: TokenDefinition = {
  name: "Verifiable Claim",
  symbol: "VCLAIM",
  kind: "NFT",
  keys: { admin: false, supply: true, metadata: true },
};

// ---------------------------------------------------------------------------
// Aggregate exports
// ---------------------------------------------------------------------------

/** All 6 corporate platform token definitions keyed by symbol. */
export const ALL_TOKENS: Record<string, TokenDefinition> = {
  CCR: CCR_CONFIG,
  CAL: CAL_CONFIG,
  CSTAMP: CSTAMP_CONFIG,
  CPASS: CPASS_CONFIG,
  GBT: GBT_CONFIG,
  VCLAIM: VCLAIM_CONFIG,
};
