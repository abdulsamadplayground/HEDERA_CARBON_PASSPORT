import {
  Client,
  AccountId,
  PrivateKey,
  AccountBalanceQuery,
} from "@hashgraph/sdk";

type HederaNetwork = "testnet" | "previewnet" | "mainnet";

const VALID_NETWORKS: HederaNetwork[] = ["testnet", "previewnet", "mainnet"];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

let clientInstance: Client | null = null;
let operatorId: AccountId | null = null;
let operatorKey: PrivateKey | null = null;

function validateEnvVars(): {
  accountId: string;
  privateKey: string;
  network: HederaNetwork;
} {
  const accountId = (process.env.HEDERA_OPERATOR_ID || "").trim();
  if (!accountId) {
    throw new Error(
      "Missing required environment variable HEDERA_OPERATOR_ID. " +
      "The platform operator account is needed to sign Hedera transactions on behalf of connected wallets."
    );
  }

  const privateKey = (process.env.HEDERA_OPERATOR_KEY || "").trim();
  if (!privateKey) {
    throw new Error(
      "Missing required environment variable HEDERA_OPERATOR_KEY. " +
      "The platform operator key is needed to sign Hedera transactions on behalf of connected wallets."
    );
  }

  const network = (process.env.HEDERA_NETWORK || "testnet").trim() as string;
  if (!VALID_NETWORKS.includes(network as HederaNetwork)) {
    throw new Error(
      `Invalid HEDERA_NETWORK "${network}". Must be one of: ${VALID_NETWORKS.join(", ")}`
    );
  }

  return { accountId, privateKey, network: network as HederaNetwork };
}

function createClientForNetwork(network: HederaNetwork): Client {
  switch (network) {
    case "mainnet":
      return Client.forMainnet();
    case "previewnet":
      return Client.forPreviewnet();
    case "testnet":
    default:
      return Client.forTestnet();
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function validateConnectivity(client: Client): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await new AccountBalanceQuery()
        .setAccountId(client.operatorAccountId!)
        .execute(client);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `Hedera connectivity check failed (attempt ${attempt}/${MAX_RETRIES}). ` +
          `Retrying in ${delayMs}ms... Error: ${lastError.message}`
      );

      if (attempt < MAX_RETRIES) {
        await sleep(delayMs);
      }
    }
  }

  console.error(
    `Failed to connect to Hedera network after ${MAX_RETRIES} attempts. ` +
      `Last error: ${lastError?.message}`
  );
  throw new Error(
    `Failed to connect to Hedera network after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

async function initializeClient(): Promise<Client> {
  if (clientInstance) {
    return clientInstance;
  }

  const { accountId, privateKey, network } = validateEnvVars();

  operatorId = AccountId.fromString(accountId);

  // Support multiple key formats: DER-encoded, hex-encoded raw, or ED25519/ECDSA string
  try {
    operatorKey = PrivateKey.fromStringDer(privateKey);
  } catch {
    try {
      operatorKey = PrivateKey.fromStringECDSA(privateKey);
    } catch {
      operatorKey = PrivateKey.fromStringED25519(privateKey);
    }
  }

  const client = createClientForNetwork(network);
  client.setOperator(operatorId, operatorKey);

  console.log(
    `Initializing Hedera client on ${network} with operator ${accountId}...`
  );

  await validateConnectivity(client);

  console.log(`Hedera client connected successfully on ${network}.`);
  clientInstance = client;
  return client;
}

/**
 * Returns the initialized Hedera Client singleton.
 * On first call, reads env vars, creates the client, and validates connectivity.
 * Terminates the process if env vars are missing or connectivity fails after retries.
 */
export async function getClient(): Promise<Client> {
  return initializeClient();
}

/**
 * Returns the operator AccountId.
 * Must be called after getClient() has been awaited at least once.
 * @throws Error if client has not been initialized
 */
export function getOperatorId(): AccountId {
  if (!operatorId) {
    throw new Error(
      "Hedera client not initialized. Call getClient() first."
    );
  }
  return operatorId;
}

/**
 * Returns the operator PrivateKey.
 * Must be called after getClient() has been awaited at least once.
 * @throws Error if client has not been initialized
 */
export function getOperatorKey(): PrivateKey {
  if (!operatorKey) {
    throw new Error(
      "Hedera client not initialized. Call getClient() first."
    );
  }
  return operatorKey;
}

// Exported for testing purposes
export { validateEnvVars, validateConnectivity, createClientForNetwork };
export type { HederaNetwork };
