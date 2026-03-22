import {
  TokenCreateTransaction,
  TokenAssociateTransaction,
  TokenType,
  TokenId,
  AccountId,
  CustomRoyaltyFee,
  CustomFractionalFee,
  CustomFixedFee,
  Hbar,
} from "@hashgraph/sdk";
import type { Key, CustomFee, PrivateKey } from "@hashgraph/sdk";
import { getClient, getOperatorId, getOperatorKey } from "@/lib/hedera/client";
import { setValue, getValue } from "@/lib/local-store";
import {
  ALL_TOKENS,
  type CustomFeeConfig,
} from "@/config/tokens.config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NFTTokenConfig {
  name: string;
  symbol: string;
  adminKey?: Key;
  supplyKey: Key;
  metadataKey?: Key;
  customFees?: CustomFee[];
}

export interface FungibleTokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  supplyKey: Key;
  customFees?: CustomFee[];
}

export interface TokenRegistry {
  CCR: TokenId;
  CAL: TokenId;
  CSTAMP: TokenId;
  CPASS: TokenId;
  GBT: TokenId;
  VCLAIM: TokenId;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Persists a token ID to the local config file under the given key.
 */
function persistTokenId(symbol: string, tokenId: TokenId): void {
  setValue(`tokens.${symbol}`, tokenId.toString());
}

/**
 * Loads a previously-persisted token ID from the local config file.
 */
export function loadTokenId(symbol: string): TokenId | null {
  const raw = getValue(`tokens.${symbol}`);
  if (typeof raw === "string") {
    return TokenId.fromString(raw);
  }
  return null;
}


// ---------------------------------------------------------------------------
// Core token creation functions
// ---------------------------------------------------------------------------

/**
 * Creates a non-fungible token on HTS.
 * Retries once on failure, logging the Hedera response code and transaction ID.
 */
export async function createNFT(config: NFTTokenConfig): Promise<TokenId> {
  const client = await getClient();
  const operatorId = getOperatorId();

  async function attempt(): Promise<TokenId> {
    const tx = new TokenCreateTransaction()
      .setTokenName(config.name)
      .setTokenSymbol(config.symbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setTreasuryAccountId(operatorId)
      .setSupplyKey(config.supplyKey)
      .setInitialSupply(0);

    if (config.adminKey) {
      tx.setAdminKey(config.adminKey);
    }
    if (config.metadataKey) {
      tx.setMetadataKey(config.metadataKey);
    }
    if (config.customFees && config.customFees.length > 0) {
      tx.setCustomFees(config.customFees);
    }

    const signedTx = await tx.freezeWith(client).sign(getOperatorKey());
    const response = await signedTx.execute(client);
    const receipt = await response.getReceipt(client);

    console.log(
      `[HTS] NFT "${config.symbol}" created — txId=${response.transactionId}, status=${receipt.status}`
    );

    if (!receipt.tokenId) {
      throw new Error(
        `Token creation succeeded but no tokenId returned. status=${receipt.status}`
      );
    }

    return receipt.tokenId;
  }

  try {
    return await attempt();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[HTS] NFT "${config.symbol}" creation failed, retrying once… Error: ${msg}`
    );
    return await attempt();
  }
}

/**
 * Creates a fungible token on HTS.
 * Retries once on failure, logging the Hedera response code and transaction ID.
 */
export async function createFungibleToken(config: FungibleTokenConfig): Promise<TokenId> {
  const client = await getClient();
  const operatorId = getOperatorId();

  async function attempt(): Promise<TokenId> {
    const tx = new TokenCreateTransaction()
      .setTokenName(config.name)
      .setTokenSymbol(config.symbol)
      .setTokenType(TokenType.FungibleCommon)
      .setTreasuryAccountId(operatorId)
      .setDecimals(config.decimals)
      .setInitialSupply(config.initialSupply)
      .setSupplyKey(config.supplyKey);

    if (config.customFees && config.customFees.length > 0) {
      tx.setCustomFees(config.customFees);
    }

    const signedTx = await tx.freezeWith(client).sign(getOperatorKey());
    const response = await signedTx.execute(client);
    const receipt = await response.getReceipt(client);

    console.log(
      `[HTS] Fungible "${config.symbol}" created — txId=${response.transactionId}, status=${receipt.status}`
    );

    if (!receipt.tokenId) {
      throw new Error(
        `Token creation succeeded but no tokenId returned. status=${receipt.status}`
      );
    }

    return receipt.tokenId;
  }

  try {
    return await attempt();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[HTS] Fungible "${config.symbol}" creation failed, retrying once… Error: ${msg}`
    );
    return await attempt();
  }
}


// ---------------------------------------------------------------------------
// NFT minting (SDK-based, uses operator supply key)
// ---------------------------------------------------------------------------

/**
 * Mints a new NFT serial on an existing HTS non-fungible token.
 * The operator key is used as the supply key signer.
 * Returns the serial number and transaction ID.
 */
export async function mintNFT(
  tokenId: TokenId,
  metadata: Uint8Array
): Promise<{ serialNumber: number; transactionId: string }> {
  const { TokenMintTransaction } = await import("@hashgraph/sdk");
  const client = await getClient();
  const operatorKey = getOperatorKey();

  const tx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .addMetadata(Buffer.from(metadata));

  const frozen = await tx.freezeWith(client);
  const signedTx = await frozen.sign(operatorKey);
  const response = await signedTx.execute(client);
  const receipt = await response.getReceipt(client);

  const serial = receipt.serials[0]?.toNumber() ?? 0;
  console.log(
    `[HTS] Minted NFT ${tokenId} serial #${serial} — txId=${response.transactionId}, status=${receipt.status}`
  );

  return {
    serialNumber: serial,
    transactionId: response.transactionId.toString(),
  };
}

// ---------------------------------------------------------------------------
// Token association
// ---------------------------------------------------------------------------

/**
 * Associates one or more tokens with an account so it can hold them.
 * If a signingKey is provided, the transaction is signed with that key
 * (required for non-operator accounts). Otherwise signs with operator key.
 */
export async function associateTokens(
  accountId: AccountId,
  tokenIds: TokenId[],
  signingKey?: PrivateKey
): Promise<void> {
  const client = await getClient();

  const tx = new TokenAssociateTransaction()
    .setAccountId(accountId)
    .setTokenIds(tokenIds);

  const frozen = await tx.freezeWith(client);
  const key = signingKey || getOperatorKey();
  const signedTx = await frozen.sign(key);
  const response = await signedTx.execute(client);
  const receipt = await response.getReceipt(client);

  console.log(
    `[HTS] Associated ${tokenIds.length} token(s) with ${accountId} — txId=${response.transactionId}, status=${receipt.status}`
  );
}


// ---------------------------------------------------------------------------
// Initialize all 8 platform tokens
// ---------------------------------------------------------------------------

/**
 * Resolves an array of CustomFeeConfig descriptors into SDK CustomFee objects.
 */
function buildCustomFees(
  feeConfigs: CustomFeeConfig[],
  operatorId: AccountId
): CustomFee[] {
  return feeConfigs.map((fc) => {
    const collectorId = fc.feeCollectorEnvVar && process.env[fc.feeCollectorEnvVar]
      ? AccountId.fromString(process.env[fc.feeCollectorEnvVar]!)
      : operatorId;

    if (fc.type === "royalty") {
      return new CustomRoyaltyFee()
        .setNumerator(fc.numerator)
        .setDenominator(fc.denominator)
        .setFeeCollectorAccountId(collectorId)
        .setFallbackFee(
          new CustomFixedFee().setHbarAmount(new Hbar(fc.fallbackHbar))
        );
    }

    // fractional
    return new CustomFractionalFee()
      .setNumerator(fc.numerator)
      .setDenominator(fc.denominator)
      .setFeeCollectorAccountId(collectorId);
  });
}

/**
 * Creates all 8 platform tokens per the design spec and persists their IDs
 * to the local config file. Returns a complete TokenRegistry.
 *
 * Token configurations are imported from `@/config/tokens.config`.
 */
export async function initializeAllTokens(): Promise<TokenRegistry> {
  const operatorKey = getOperatorKey();
  const operatorId = getOperatorId();

  const registry: Partial<TokenRegistry> = {};

  for (const [symbol, def] of Object.entries(ALL_TOKENS)) {
    const fees = def.customFees
      ? buildCustomFees(def.customFees, operatorId)
      : undefined;

    let tokenId: TokenId;

    if (def.kind === "NFT") {
      tokenId = await createNFT({
        name: def.name,
        symbol: def.symbol,
        adminKey: def.keys.admin ? operatorKey : undefined,
        supplyKey: operatorKey,
        metadataKey: def.keys.metadata ? operatorKey : undefined,
        customFees: fees,
      });
    } else {
      tokenId = await createFungibleToken({
        name: def.name,
        symbol: def.symbol,
        decimals: def.decimals ?? 0,
        initialSupply: def.initialSupply ?? 0,
        supplyKey: operatorKey,
        customFees: fees,
      });
    }

    persistTokenId(symbol, tokenId);
    (registry as Record<string, TokenId>)[symbol] = tokenId;
  }

  console.log("[HTS] All 6 platform tokens initialized successfully.");
  return registry as TokenRegistry;
}


