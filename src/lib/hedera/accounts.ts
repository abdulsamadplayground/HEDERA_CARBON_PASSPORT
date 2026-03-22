/**
 * Platform Account setup for the Carbon Passport Platform.
 *
 * Creates or verifies 4 platform accounts (operator, treasury, reward pool,
 * sustainability fund), persists their IDs and public keys to the local config
 * store, associates all 8 platform tokens with each account, and provides
 * user account creation with selective token associations.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import {
  AccountCreateTransaction,
  AccountId,
  Hbar,
  PrivateKey,
  TokenId,
} from "@hashgraph/sdk";
import { getClient, getOperatorId, getOperatorKey } from "@/lib/hedera/client";
import { setValue, getValue } from "@/lib/local-store";
import { associateTokens, loadTokenId } from "@/services/hts.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformAccount {
  accountId: AccountId;
  publicKey: string;
  privateKey?: PrivateKey;
}

export interface PlatformAccounts {
  operator: PlatformAccount;
  treasury: PlatformAccount;
  rewardPool: PlatformAccount;
  sustainabilityFund: PlatformAccount;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All 6 corporate platform token symbols. */
const ALL_TOKEN_SYMBOLS = [
  "CCR", "CAL", "CSTAMP", "CPASS", "GBT", "VCLAIM",
] as const;

/** Tokens associated with new company accounts. */
const USER_TOKEN_SYMBOLS = ["CCR", "CAL", "CPASS"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Loads all 6 platform token IDs from the local config store.
 * Throws if any token has not been created yet.
 */
function loadAllTokenIds(): TokenId[] {
  return ALL_TOKEN_SYMBOLS.map((symbol) => {
    const tokenId = loadTokenId(symbol);
    if (!tokenId) {
      throw new Error(
        `Token ${symbol} not found in local config. Run token initialization first.`
      );
    }
    return tokenId;
  });
}

/**
 * Loads the subset of token IDs needed for user account association.
 */
function loadUserTokenIds(): TokenId[] {
  return USER_TOKEN_SYMBOLS.map((symbol) => {
    const tokenId = loadTokenId(symbol);
    if (!tokenId) {
      throw new Error(
        `Token ${symbol} not found in local config. Run token initialization first.`
      );
    }
    return tokenId;
  });
}

/**
 * Persists a platform account's ID and public key to the local config store.
 */
function persistAccount(role: string, account: PlatformAccount): void {
  setValue(`accounts.${role}.id`, account.accountId.toString());
  setValue(`accounts.${role}.publicKey`, account.publicKey);
}

/**
 * Loads a previously-persisted platform account from the local config store.
 */
function loadPersistedAccount(role: string): PlatformAccount | null {
  const id = getValue(`accounts.${role}.id`);
  const publicKey = getValue(`accounts.${role}.publicKey`);
  if (typeof id === "string" && typeof publicKey === "string") {
    return { accountId: AccountId.fromString(id), publicKey };
  }
  return null;
}

/**
 * Creates a new Hedera account with an initial balance and returns its details.
 * Logs the Hedera response code on failure (Requirement 5.5).
 */
async function createHederaAccount(
  label: string
): Promise<{ accountId: AccountId; privateKey: PrivateKey }> {
  const client = await getClient();
  const newKey = PrivateKey.generateED25519();

  try {
    const tx = new AccountCreateTransaction()
      .setKey(newKey.publicKey)
      .setInitialBalance(new Hbar(0));

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);

    if (!receipt.accountId) {
      throw new Error(
        `Account creation for ${label} succeeded but no accountId returned. status=${receipt.status}`
      );
    }

    console.log(
      `[Accounts] Created ${label} account ${receipt.accountId} — txId=${response.transactionId}, status=${receipt.status}`
    );

    return { accountId: receipt.accountId, privateKey: newKey };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Accounts] Failed to create ${label} account — Error: ${msg}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Platform account resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the operator account from environment variables.
 * The operator always comes from HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY.
 */
function resolveOperatorAccount(): PlatformAccount {
  const operatorId = getOperatorId();
  const operatorKey = getOperatorKey();
  return {
    accountId: operatorId,
    publicKey: operatorKey.publicKey.toString(),
  };
}

/**
 * Resolves a non-operator platform account. If the corresponding env var
 * is set, uses that account ID. Otherwise creates a new account on Hedera.
 */
async function resolveOrCreateAccount(
  role: string,
  envVar: string
): Promise<PlatformAccount> {
  // 1. Check env var
  const envValue = process.env[envVar];
  if (envValue) {
    console.log(
      `[Accounts] Using existing ${role} account from ${envVar}: ${envValue}`
    );
    // We don't have the public key for env-provided accounts, store the account ID string
    return {
      accountId: AccountId.fromString(envValue),
      publicKey: "env-provided",
    };
  }

  // 2. Check local config for a previously-created account
  const persisted = loadPersistedAccount(role);
  if (persisted) {
    console.log(
      `[Accounts] Loaded ${role} account from local config: ${persisted.accountId}`
    );
    // Try to load the private key from local config for token association
    const pkDer = getValue(`accounts.${role}.privateKey`);
    if (typeof pkDer === "string") {
      try {
        persisted.privateKey = PrivateKey.fromStringDer(pkDer);
      } catch {
        // Key format may differ
        try { persisted.privateKey = PrivateKey.fromStringED25519(pkDer); } catch { /* ignore */ }
      }
    }
    return persisted;
  }

  // 3. Create a new account on Hedera
  const { accountId, privateKey } = await createHederaAccount(role);
  const account: PlatformAccount = {
    accountId,
    publicKey: privateKey.publicKey.toString(),
    privateKey,
  };

  // Also persist the private key so the account can be used later
  setValue(`accounts.${role}.privateKey`, privateKey.toStringDer());

  return account;
}

// ---------------------------------------------------------------------------
// Token association for platform accounts
// ---------------------------------------------------------------------------

/**
 * Associates all 8 platform tokens with a single account.
 * Skips the operator account since it is the treasury for all tokens
 * (tokens are auto-associated with their treasury).
 * For non-operator accounts, uses the account's own private key to sign.
 * Logs Hedera response code on failure (Requirement 5.5).
 */
async function associateAllTokensWithAccount(
  role: string,
  accountId: AccountId,
  signingKey?: PrivateKey
): Promise<void> {
  // The operator is the treasury account for all tokens, so tokens are
  // already associated — skip association to avoid TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT.
  const operatorId = getOperatorId();
  if (accountId.toString() === operatorId.toString()) {
    console.log(
      `[Accounts] Skipping token association for ${role} (operator/treasury account).`
    );
    return;
  }

  const tokenIds = loadAllTokenIds();

  try {
    await associateTokens(accountId, tokenIds, signingKey);
    console.log(
      `[Accounts] Associated all 8 tokens with ${role} account ${accountId}.`
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    // TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT is safe to ignore on re-runs
    if (msg.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
      console.log(
        `[Accounts] Tokens already associated with ${role} account ${accountId}. Skipping.`
      );
      return;
    }
    console.error(
      `[Accounts] Failed to associate tokens with ${role} account ${accountId} — Error: ${msg}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initializes all 4 platform accounts:
 * - Operator: from env vars (HEDERA_OPERATOR_ID)
 * - Treasury: from HEDERA_TREASURY_ID env var, or creates new
 * - Reward Pool: from HEDERA_REWARD_POOL_ID env var, or creates new
 * - Sustainability Fund: from HEDERA_SUSTAINABILITY_FUND_ID env var, or creates new
 *
 * Persists account IDs and public keys to the local config store.
 * Associates all 8 platform tokens with each account.
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export async function initializePlatformAccounts(): Promise<PlatformAccounts> {
  console.log("[Accounts] Initializing platform accounts...");

  // --- Resolve accounts ---
  const operator = resolveOperatorAccount();
  const treasury = await resolveOrCreateAccount(
    "treasury",
    "HEDERA_TREASURY_ID"
  );
  const rewardPool = await resolveOrCreateAccount(
    "rewardPool",
    "HEDERA_REWARD_POOL_ID"
  );
  const sustainabilityFund = await resolveOrCreateAccount(
    "sustainabilityFund",
    "HEDERA_SUSTAINABILITY_FUND_ID"
  );

  const accounts: PlatformAccounts = {
    operator,
    treasury,
    rewardPool,
    sustainabilityFund,
  };

  // --- Persist all accounts ---
  persistAccount("operator", operator);
  persistAccount("treasury", treasury);
  persistAccount("rewardPool", rewardPool);
  persistAccount("sustainabilityFund", sustainabilityFund);

  // --- Associate all 8 tokens with each account ---
  await associateAllTokensWithAccount("operator", operator.accountId);
  await associateAllTokensWithAccount("treasury", treasury.accountId, treasury.privateKey);
  await associateAllTokensWithAccount("rewardPool", rewardPool.accountId, rewardPool.privateKey);
  await associateAllTokensWithAccount(
    "sustainabilityFund",
    sustainabilityFund.accountId,
    sustainabilityFund.privateKey
  );

  console.log("[Accounts] All 4 platform accounts initialized successfully.");
  return accounts;
}

/**
 * Creates a new Hedera account for a company and associates the CCR, CAL,
 * and CPASS tokens with it.
 *
 * Requirements: 5.4, 5.5
 *
 * @returns The new user's account ID and public key.
 */
export async function createUserAccount(): Promise<{
  accountId: AccountId;
  publicKey: string;
  privateKey: string;
}> {
  const { accountId, privateKey } = await createHederaAccount("user");

  const userTokenIds = loadUserTokenIds();

  try {
    await associateTokens(accountId, userTokenIds, privateKey);
    console.log(
      `[Accounts] Associated company tokens (CCR, CAL, CPASS) with user account ${accountId}.`
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Accounts] Failed to associate tokens with user account ${accountId} — Error: ${msg}`
    );
    throw error;
  }

  return {
    accountId,
    publicKey: privateKey.publicKey.toString(),
    privateKey: privateKey.toStringDer(),
  };
}
