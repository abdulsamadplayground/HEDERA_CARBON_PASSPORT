/**
 * Mirror Node Client for the Carbon Passport Platform.
 *
 * Read-only client for the Hedera Mirror Node REST API. All read operations
 * in the API layer go through this client rather than querying the ledger
 * directly.
 *
 * Uses native `fetch` for HTTP requests with a single retry on failure
 * (1-second delay).
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 3.6, 4.6, 16.5
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NFTInfo {
  tokenId: string;
  serial: number;
  owner: string;
  metadata: string;
  creationTimestamp: string;
}

export interface TokenBalances {
  accountId: string;
  balances: {
    tokenId: string;
    balance: number;
  }[];
  gctBalance: number;
  cctBalance: number;
  gstBalance: number;
}

export interface TopicMessage {
  sequenceNumber: number;
  consensusTimestamp: string;
  message: string;
  runningHash: string;
  topicId: string;
}

export interface TopicMessages {
  messages: TopicMessage[];
  links?: {
    next?: string;
  };
}

export interface PaginationOptions {
  limit?: number;
  sequenceNumber?: number;
  timestampFrom?: string;
  timestampTo?: string;
}

export interface TransactionTransfer {
  account: string;
  amount: number;
  isApproval: boolean;
}

export interface TransactionDetails {
  transactionId: string;
  status: string;
  consensusTimestamp: string;
  transfers: TransactionTransfer[];
  memo: string;
}

export interface ContractResult {
  transactionId: string;
  result: string;
  gasUsed: number;
  contractId: string;
  callResult: string;
  errorMessage: string | null;
}

export interface GuardianCredentials {
  policyId: string;
  status: string;
  credentials: Record<string, unknown>[];
}

export interface MirrorNodeError {
  success: false;
  statusCode: number;
  message: string;
  endpoint: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";
const RETRY_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the configured Mirror Node base URL, stripping any trailing slash.
 */
function getBaseUrl(): string {
  const url = process.env.HEDERA_MIRROR_NODE_URL || DEFAULT_MIRROR_NODE_URL;
  return url.replace(/\/+$/, "");
}

/**
 * Delays execution for the specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Makes an HTTP GET request to the Mirror Node REST API.
 * Retries once after a 1-second delay on HTTP error.
 * Returns a structured error object if the retry also fails.
 *
 * Requirements: 13.6
 */
async function mirrorGet<T>(endpoint: string): Promise<T | MirrorNodeError> {
  const url = `${getBaseUrl()}${endpoint}`;

  async function attempt(): Promise<Response> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new MirrorNodeHttpError(response.status, response.statusText, endpoint);
    }
    return response;
  }

  try {
    const response = await attempt();
    return (await response.json()) as T;
  } catch (firstError: unknown) {
    const msg = firstError instanceof Error ? firstError.message : String(firstError);
    console.warn(
      `[MirrorNode] Request to ${endpoint} failed, retrying in ${RETRY_DELAY_MS}ms… Error: ${msg}`
    );

    await delay(RETRY_DELAY_MS);

    try {
      const response = await attempt();
      return (await response.json()) as T;
    } catch (retryError: unknown) {
      const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
      console.error(
        `[MirrorNode] Retry failed for ${endpoint} — Error: ${retryMsg}`
      );

      const statusCode =
        retryError instanceof MirrorNodeHttpError ? retryError.statusCode : 500;

      return {
        success: false,
        statusCode,
        message: retryMsg,
        endpoint,
      };
    }
  }
}

/**
 * Custom error class for Mirror Node HTTP errors, carrying the status code.
 */
class MirrorNodeHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    statusText: string,
    endpoint: string
  ) {
    super(`HTTP ${statusCode} ${statusText} for ${endpoint}`);
    this.name = "MirrorNodeHttpError";
  }
}

/**
 * Type guard to check if a response is a MirrorNodeError.
 */
export function isMirrorNodeError(value: unknown): value is MirrorNodeError {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as MirrorNodeError).success === false
  );
}

// ---------------------------------------------------------------------------
// Core Mirror Node query functions
// ---------------------------------------------------------------------------

/**
 * Queries NFT details by token ID and serial number.
 * Returns the owner account, metadata, and creation timestamp.
 *
 * Requirements: 13.1
 */
export async function getNFTInfo(
  tokenId: string,
  serial: number
): Promise<NFTInfo | MirrorNodeError> {
  const endpoint = `/api/v1/tokens/${tokenId}/nfts/${serial}`;

  const raw = await mirrorGet<Record<string, unknown>>(endpoint);
  if (isMirrorNodeError(raw)) return raw;

  return {
    tokenId: String(raw.token_id ?? tokenId),
    serial: Number(raw.serial_number ?? serial),
    owner: String(raw.account_id ?? ""),
    metadata: raw.metadata ? Buffer.from(String(raw.metadata), "base64").toString("utf-8") : "",
    creationTimestamp: String(raw.created_timestamp ?? ""),
  };
}

/**
 * Queries fungible token balances for a given account ID.
 * Returns the balance for each of the platform's fungible tokens (GCT, CCT, GST).
 *
 * Requirements: 13.2
 */
export async function getTokenBalances(
  accountId: string
): Promise<TokenBalances | MirrorNodeError> {
  const endpoint = `/api/v1/balances?account.id=${accountId}`;

  const raw = await mirrorGet<{ balances?: Array<{ account: string; tokens?: Array<{ token_id: string; balance: number }> }> }>(endpoint);
  if (isMirrorNodeError(raw)) return raw;

  const accountEntry = raw.balances?.find((b) => b.account === accountId);
  const tokens = accountEntry?.tokens ?? [];

  const balances = tokens.map((t) => ({
    tokenId: t.token_id,
    balance: t.balance,
  }));

  // Look up known fungible token balances by symbol
  // The caller can match token IDs from the platform config
  let gctBalance = 0;
  let cctBalance = 0;
  let gstBalance = 0;

  for (const t of tokens) {
    const id = t.token_id;
    // We store balances generically; consumers match by token ID
    // For convenience, we attempt to identify GCT/CCT/GST by position
    // but the primary data is in the balances array
    if (balances.length >= 1 && balances[0].tokenId === id) gctBalance = t.balance;
    if (balances.length >= 2 && balances[1].tokenId === id) cctBalance = t.balance;
    if (balances.length >= 3 && balances[2].tokenId === id) gstBalance = t.balance;
  }

  return {
    accountId,
    balances,
    gctBalance,
    cctBalance,
    gstBalance,
  };
}

/**
 * Queries HCS topic messages by topic ID with pagination support.
 * Supports filtering by sequence number and timestamp range.
 *
 * Requirements: 13.3, 3.6
 */
export async function getTopicMessages(
  topicId: string,
  options?: PaginationOptions
): Promise<TopicMessages | MirrorNodeError> {
  const params = new URLSearchParams();

  if (options?.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options?.sequenceNumber !== undefined) {
    params.set("sequencenumber", `gt:${options.sequenceNumber}`);
  }
  if (options?.timestampFrom) {
    params.set("timestamp", `gte:${options.timestampFrom}`);
  }
  if (options?.timestampTo) {
    // Mirror Node supports multiple timestamp params for range filtering
    params.append("timestamp", `lte:${options.timestampTo}`);
  }

  const query = params.toString();
  const endpoint = `/api/v1/topics/${topicId}/messages${query ? `?${query}` : ""}`;

  const raw = await mirrorGet<{
    messages?: Array<{
      sequence_number: number;
      consensus_timestamp: string;
      message: string;
      running_hash: string;
      topic_id: string;
    }>;
    links?: { next?: string };
  }>(endpoint);
  if (isMirrorNodeError(raw)) return raw;

  const messages: TopicMessage[] = (raw.messages ?? []).map((m) => ({
    sequenceNumber: m.sequence_number,
    consensusTimestamp: m.consensus_timestamp,
    message: m.message ? Buffer.from(m.message, "base64").toString("utf-8") : "",
    runningHash: m.running_hash ?? "",
    topicId: m.topic_id ?? topicId,
  }));

  return {
    messages,
    links: raw.links,
  };
}

/**
 * Queries transaction details by transaction ID.
 * Returns the status, consensus timestamp, and transfers.
 *
 * Requirements: 13.4
 */
export async function getTransactionDetails(
  transactionId: string
): Promise<TransactionDetails | MirrorNodeError> {
  const endpoint = `/api/v1/transactions/${transactionId}`;

  const raw = await mirrorGet<{
    transactions?: Array<{
      transaction_id: string;
      result: string;
      consensus_timestamp: string;
      transfers?: Array<{ account: string; amount: number; is_approval: boolean }>;
      memo_base64?: string;
    }>;
  }>(endpoint);
  if (isMirrorNodeError(raw)) return raw;

  const tx = raw.transactions?.[0];
  if (!tx) {
    return {
      success: false,
      statusCode: 404,
      message: `Transaction ${transactionId} not found`,
      endpoint,
    };
  }

  return {
    transactionId: tx.transaction_id ?? transactionId,
    status: tx.result ?? "UNKNOWN",
    consensusTimestamp: tx.consensus_timestamp ?? "",
    transfers: (tx.transfers ?? []).map((t) => ({
      account: t.account,
      amount: t.amount,
      isApproval: t.is_approval ?? false,
    })),
    memo: tx.memo_base64
      ? Buffer.from(tx.memo_base64, "base64").toString("utf-8")
      : "",
  };
}

/**
 * Queries smart contract call results by transaction ID.
 * Returns the decoded function output.
 *
 * Requirements: 13.5
 */
export async function getContractCallResult(
  transactionId: string
): Promise<ContractResult | MirrorNodeError> {
  const endpoint = `/api/v1/contracts/results/${transactionId}`;

  const raw = await mirrorGet<{
    transaction_id?: string;
    result?: string;
    gas_used?: number;
    contract_id?: string;
    call_result?: string;
    error_message?: string | null;
  }>(endpoint);
  if (isMirrorNodeError(raw)) return raw;

  return {
    transactionId: raw.transaction_id ?? transactionId,
    result: raw.result ?? "",
    gasUsed: raw.gas_used ?? 0,
    contractId: raw.contract_id ?? "",
    callResult: raw.call_result ?? "",
    errorMessage: raw.error_message ?? null,
  };
}

/**
 * Queries Guardian verification credentials by policy ID.
 * Uses the Mirror Node to look up Guardian MRV verification data.
 *
 * Requirements: 16.5
 */
export async function getGuardianCredentials(
  policyId: string
): Promise<GuardianCredentials | MirrorNodeError> {
  // Guardian credentials are stored as topic messages associated with the policy.
  // We query the Guardian policy topic for verification credential messages.
  const endpoint = `/api/v1/topics/${policyId}/messages?limit=100`;

  const raw = await mirrorGet<{
    messages?: Array<{
      sequence_number: number;
      consensus_timestamp: string;
      message: string;
    }>;
  }>(endpoint);
  if (isMirrorNodeError(raw)) return raw;

  const credentials: Record<string, unknown>[] = [];
  let status = "unknown";

  for (const msg of raw.messages ?? []) {
    try {
      const decoded = JSON.parse(
        Buffer.from(msg.message, "base64").toString("utf-8")
      );
      credentials.push(decoded);
      if (decoded.status) {
        status = String(decoded.status);
      }
    } catch {
      // Skip non-JSON messages
    }
  }

  return {
    policyId,
    status,
    credentials,
  };
}

/**
 * Queries the total supply of a fungible token by token ID.
 * Returns the total_supply field from the Mirror Node token info endpoint.
 *
 * Requirements: 5.2, 5.3
 */
export async function getTokenTotalSupply(
  tokenId: string
): Promise<number | MirrorNodeError> {
  const endpoint = `/api/v1/tokens/${tokenId}`;

  const raw = await mirrorGet<{ total_supply?: string }>(endpoint);
  if (isMirrorNodeError(raw)) return raw;

  return Number(raw.total_supply ?? 0);
}

/**
 * Queries the total number of contract call results (transactions) for a contract.
 * Paginates through all results to produce an accurate count.
 *
 * Requirements: 5.4
 */
export async function getContractTransactionCount(
  contractId: string
): Promise<number | MirrorNodeError> {
  let count = 0;
  let endpoint: string | null = `/api/v1/contracts/${contractId}/results?limit=100`;

  interface ContractResultsPage {
    results?: Array<Record<string, unknown>>;
    links?: { next?: string | null };
  }

  while (endpoint) {
    const raw: ContractResultsPage | MirrorNodeError = await mirrorGet<ContractResultsPage>(endpoint);
    if (isMirrorNodeError(raw)) return raw;

    count += (raw.results ?? []).length;

    // The Mirror Node returns a full URL in links.next; extract the path portion
    const next: string | null = raw.links?.next ?? null;
    if (next) {
      endpoint = next.startsWith("http") ? new URL(next).pathname + new URL(next).search : next;
    } else {
      endpoint = null;
    }
  }

  return count;
}

/**
 * Queries the balance of a specific token for a given account.
 * Uses the balances endpoint filtered by account ID, then finds the
 * matching token entry.
 *
 * Requirements: 3.5
 */
export async function getAccountTokenBalance(
  accountId: string,
  tokenId: string
): Promise<number | MirrorNodeError> {
  const endpoint = `/api/v1/balances?account.id=${accountId}`;

  const raw = await mirrorGet<{
    balances?: Array<{
      account: string;
      tokens?: Array<{ token_id: string; balance: number }>;
    }>;
  }>(endpoint);
  if (isMirrorNodeError(raw)) return raw;

  const accountEntry = raw.balances?.find((b) => b.account === accountId);
  const token = accountEntry?.tokens?.find((t) => t.token_id === tokenId);

  return token?.balance ?? 0;
}


