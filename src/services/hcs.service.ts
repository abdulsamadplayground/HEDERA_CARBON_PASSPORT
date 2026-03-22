import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
  TransactionId,
} from "@hashgraph/sdk";
import type { Key } from "@hashgraph/sdk";
import { getClient, getOperatorKey } from "@/lib/hedera/client";
import { setValue, getValue } from "@/lib/local-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * HCS verifiable event message format.
 * All platform events are submitted as JSON with these three fields.
 * Requirements: 12.1, 15.6, 17.1
 */
export interface HCSMessage {
  timestamp: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * The 12 corporate compliance HCS topics forming the
 * Verifiable Supply Chain Event Stream.
 * Requirements: 12.1, 15.6, 17.1
 */
export type TopicName =
  | "CompanyRegistration"
  | "EmissionsCalculation"
  | "CompliancePassport"
  | "CapAndTrade"
  | "Marketplace"
  | "Projections"
  | "AuditReports"
  | "PolicyCompliance"
  | "Rewards"
  | "GuardianMRV"
  | "VerifiableClaims"
  | "SupplyChain";

export type TopicRegistry = Record<TopicName, TopicId>;

export const ALL_TOPIC_NAMES: TopicName[] = [
  "CompanyRegistration",
  "EmissionsCalculation",
  "CompliancePassport",
  "CapAndTrade",
  "Marketplace",
  "Projections",
  "AuditReports",
  "PolicyCompliance",
  "Rewards",
  "GuardianMRV",
  "VerifiableClaims",
  "SupplyChain",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Persists a topic ID to the local config file under `topics.<name>`.
 */
function persistTopicId(name: string, topicId: TopicId): void {
  setValue(`topics.${name}`, topicId.toString());
}

/**
 * Loads a previously-persisted topic ID from the local config file.
 */
export function loadTopicId(name: string): TopicId | null {
  const raw = getValue(`topics.${name}`);
  if (typeof raw === "string") {
    return TopicId.fromString(raw);
  }
  return null;
}


// ---------------------------------------------------------------------------
// Core topic creation
// ---------------------------------------------------------------------------

/**
 * Creates an HCS topic with the given name and submit key.
 * The topic memo is set to the name for identification.
 * Retries once on failure, logging the Hedera response code.
 *
 * Requirements: 3.1, 3.2
 */
export async function createTopic(
  name: string,
  submitKey: Key
): Promise<TopicId> {
  const client = await getClient();

  async function attempt(): Promise<TopicId> {
    const tx = new TopicCreateTransaction()
      .setTopicMemo(name)
      .setSubmitKey(submitKey);

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);

    console.log(
      `[HCS] Topic "${name}" created — txId=${response.transactionId}, status=${receipt.status}`
    );

    if (!receipt.topicId) {
      throw new Error(
        `Topic creation succeeded but no topicId returned. status=${receipt.status}`
      );
    }

    return receipt.topicId;
  }

  try {
    return await attempt();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[HCS] Topic "${name}" creation failed, retrying once… Error: ${msg}`
    );
    return await attempt();
  }
}

// ---------------------------------------------------------------------------
// Message submission
// ---------------------------------------------------------------------------

/**
 * Submits a JSON-formatted message to an HCS topic.
 * The message is serialized with timestamp, eventType, and payload fields.
 * Retries once on failure, logging the Hedera response code.
 *
 * Requirements: 3.4, 3.5
 */
export async function submitMessage(
  topicId: TopicId,
  message: HCSMessage
): Promise<TransactionId> {
  const client = await getClient();

  const jsonPayload = JSON.stringify({
    timestamp: message.timestamp,
    eventType: message.eventType,
    payload: message.payload,
  });

  async function attempt(): Promise<TransactionId> {
    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(jsonPayload);

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);

    console.log(
      `[HCS] Message submitted to topic ${topicId} — txId=${response.transactionId}, status=${receipt.status}, eventType=${message.eventType}`
    );

    return response.transactionId;
  }

  try {
    return await attempt();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[HCS] Message submission to topic ${topicId} failed, retrying once… Error: ${msg}`
    );
    return await attempt();
  }
}

// ---------------------------------------------------------------------------
// Initialize all platform topics
// ---------------------------------------------------------------------------

/**
 * Creates all platform HCS topics with the operator key as submit key,
 * persists each topic ID to the local config file, and returns a
 * complete TopicRegistry.
 *
 * Requirements: 3.1, 3.2, 3.3
 */
export async function initializeAllTopics(): Promise<TopicRegistry> {
  const operatorKey = getOperatorKey();

  const registry: Partial<TopicRegistry> = {};

  for (const name of ALL_TOPIC_NAMES) {
    const topicId = await createTopic(name, operatorKey);
    persistTopicId(name, topicId);
    registry[name] = topicId;
  }

  console.log("[HCS] All platform topics initialized successfully.");
  return registry as TopicRegistry;
}
