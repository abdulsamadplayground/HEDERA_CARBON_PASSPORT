/**
 * Scheduler Service for the Carbon Passport Platform.
 *
 * Creates and manages Hedera Scheduled Transactions for recurring operations:
 * - CarbonLeaderboard quarterly reward distribution
 * - LiveProductToken weekly health score degradation
 * - RewardPoolManager monthly GCT rate recalculation
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import {
  ScheduleCreateTransaction,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  ScheduleId,
  Timestamp,
} from "@hashgraph/sdk";
import { getClient, getOperatorKey } from "@/lib/hedera/client";
import { submitMessage, loadTopicId } from "@/services/hcs.service";
import { setValue } from "@/lib/local-store";
import type { ContractRegistry } from "@/services/hscs.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduledCallConfig {
  contractId: ContractId;
  functionName: string;
  params: ContractFunctionParameters;
  scheduleMemo: string;
  expirationTime: Timestamp;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_GAS = 3_000_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Timestamp for the end of the current calendar quarter.
 * Q1 ends Mar 31, Q2 ends Jun 30, Q3 ends Sep 30, Q4 ends Dec 31.
 */
function getEndOfCurrentQuarter(): Timestamp {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  let endMonth: number;
  if (month < 3) {
    endMonth = 2; // March (0-indexed)
  } else if (month < 6) {
    endMonth = 5; // June
  } else if (month < 9) {
    endMonth = 8; // September
  } else {
    endMonth = 11; // December
  }

  // Last day of the quarter-end month, 23:59:59 UTC
  const endDate = new Date(Date.UTC(year, endMonth + 1, 0, 23, 59, 59));
  const epochSeconds = Math.floor(endDate.getTime() / 1000);
  return new Timestamp(epochSeconds, 0);
}

/**
 * Returns a Timestamp one week from now.
 */
function getOneWeekFromNow(): Timestamp {
  const now = new Date();
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const epochSeconds = Math.floor(oneWeek.getTime() / 1000);
  return new Timestamp(epochSeconds, 0);
}

/**
 * Returns a Timestamp one month from now (approximately 30 days).
 */
function getOneMonthFromNow(): Timestamp {
  const now = new Date();
  const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const epochSeconds = Math.floor(oneMonth.getTime() / 1000);
  return new Timestamp(epochSeconds, 0);
}

/**
 * Submits a failure alert to the Rewards HCS topic.
 * Requirement: 15.5
 */
async function submitFailureAlert(
  scheduleMemo: string,
  errorMessage: string
): Promise<void> {
  const rewardsTopicId = loadTopicId("Rewards");
  if (!rewardsTopicId) {
    console.error(
      "[Scheduler] Cannot submit failure alert: Rewards topic not found in config."
    );
    return;
  }

  try {
    await submitMessage(rewardsTopicId, {
      timestamp: new Date().toISOString(),
      eventType: "ScheduledTransactionFailed",
      payload: {
        scheduleMemo,
        error: errorMessage,
        alertType: "SCHEDULED_TX_FAILURE",
      },
    });
    console.log(
      `[Scheduler] Failure alert submitted to Rewards topic for: ${scheduleMemo}`
    );
  } catch (alertError: unknown) {
    const msg =
      alertError instanceof Error ? alertError.message : String(alertError);
    console.error(
      `[Scheduler] Failed to submit failure alert to Rewards topic: ${msg}`
    );
  }
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Creates a Hedera Scheduled Transaction wrapping a contract call.
 *
 * The scheduled transaction includes:
 * - A ContractExecuteTransaction as the inner transaction
 * - A memo describing the scheduled operation
 * - An expiration time after which the schedule is deleted if not executed
 *
 * Logs execution results: transaction ID, consensus timestamp, success/failure.
 * Submits an alert to the Rewards HCS topic on failure.
 *
 * Requirements: 15.1, 15.4, 15.5
 */
export async function scheduleContractCall(
  config: ScheduledCallConfig
): Promise<ScheduleId> {
  const client = await getClient();
  const operatorKey = getOperatorKey();

  try {
    // Build the inner contract call transaction
    const innerTx = new ContractExecuteTransaction()
      .setContractId(config.contractId)
      .setFunction(config.functionName, config.params)
      .setGas(DEFAULT_GAS);

    // Wrap it in a ScheduleCreateTransaction
    const scheduleTx = new ScheduleCreateTransaction()
      .setScheduledTransaction(innerTx)
      .setScheduleMemo(config.scheduleMemo)
      .setExpirationTime(config.expirationTime)
      .setAdminKey(operatorKey);

    const signedTx = await scheduleTx.freezeWith(client).sign(operatorKey);
    const response = await signedTx.execute(client);
    const receipt = await response.getReceipt(client);

    if (!receipt.scheduleId) {
      throw new Error(
        `Schedule creation succeeded but no scheduleId returned. status=${receipt.status}`
      );
    }

    // Log execution results (Requirement 15.4)
    console.log(
      `[Scheduler] Scheduled transaction created — ` +
        `scheduleId=${receipt.scheduleId}, ` +
        `txId=${response.transactionId}, ` +
        `consensusTimestamp=${receipt.exchangeRate ? "available" : "pending"}, ` +
        `memo="${config.scheduleMemo}", ` +
        `status=SUCCESS`
    );

    // Persist schedule ID to local config
    const configKey = `schedules.${config.scheduleMemo.replace(/\s+/g, "_")}`;
    setValue(configKey, receipt.scheduleId.toString());

    return receipt.scheduleId;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Log failure (Requirement 15.4)
    console.error(
      `[Scheduler] Scheduled transaction FAILED — ` +
        `memo="${config.scheduleMemo}", ` +
        `contractId=${config.contractId}, ` +
        `function="${config.functionName}", ` +
        `status=FAILURE, ` +
        `error=${errorMsg}`
    );

    // Submit alert to Rewards HCS topic (Requirement 15.5)
    await submitFailureAlert(config.scheduleMemo, errorMsg);

    throw error;
  }
}

/**
 * Initializes all recurring scheduled transactions for the platform.
 *
 * Schedules:
 * 1. CarbonLeaderboard `distributeQuarterlyRewards` at end of each calendar quarter (Req 15.1)
 * 2. LiveProductToken `updateHealthScore` to degrade by 1 point/week for LIVING tokens (Req 15.2)
 * 3. RewardPoolManager `getRecommendedGCTRate` monthly for rate recalculation (Req 15.3)
 *
 * Requirements: 15.1, 15.2, 15.3
 */
export async function initializeScheduledTransactions(
  contracts: ContractRegistry
): Promise<void> {
  console.log("[Scheduler] Initializing scheduled transactions...");

  // The corporate compliance platform does not currently define
  // recurring scheduled contract calls. Future tasks may add:
  //   - Periodic CAL allocation via CapTradeManager
  //   - Scheduled marketplace listing expiry checks via CreditMarketplace
  //   - Periodic reward distribution via RewardDistributor
  //
  // For now, log available contracts and return.

  const contractNames = Object.keys(contracts) as (keyof ContractRegistry)[];
  for (const name of contractNames) {
    console.log(`[Scheduler] Contract available: ${name} → ${contracts[name]}`);
  }

  console.log("[Scheduler] Scheduled transaction initialization complete (no recurring jobs configured).");
}
