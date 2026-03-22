/**
 * Reward Service for the Corporate Carbon Compliance Platform.
 *
 * Manages milestone-based CCR token rewards for companies achieving
 * compliance targets. Prevents duplicate milestone awards.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import {
  TokenMintTransaction,
  TransferTransaction,
  ContractFunctionParameters,
  ContractId,
  TokenId,
  AccountId,
} from "@hashgraph/sdk";
import { getClient, getOperatorId, getOperatorKey } from "@/lib/hedera/client";
import { loadTokenId } from "@/services/hts.service";
import { loadTopicId, submitMessage } from "@/services/hcs.service";
import { contractCall } from "@/services/hscs.service";
import { getValue } from "@/lib/local-store";
import prisma from "@/lib/prisma";
import type { Milestone } from "@/lib/local-db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MilestoneType =
  | "FIRST_REPORT"
  | "TIER_IMPROVEMENT"
  | "SCORE_IMPROVEMENT"
  | "FIRST_STAMP"
  | "FIRST_CLAIM"
  | "REPORTING_STREAK";

export interface MilestoneProgress {
  milestoneType: MilestoneType;
  achieved: boolean;
  rewardAmount: number;
  awardedAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * CCR reward amounts per milestone type.
 * Requirements: 11.2
 */
export const MILESTONE_REWARDS: Record<MilestoneType, number> = {
  FIRST_REPORT: 100,
  TIER_IMPROVEMENT: 500,
  SCORE_IMPROVEMENT: 250,
  FIRST_STAMP: 200,
  FIRST_CLAIM: 150,
  REPORTING_STREAK: 1000,
};

const ALL_MILESTONE_TYPES: MilestoneType[] = [
  "FIRST_REPORT",
  "TIER_IMPROVEMENT",
  "SCORE_IMPROVEMENT",
  "FIRST_STAMP",
  "FIRST_CLAIM",
  "REPORTING_STREAK",
];

/**
 * Maps MilestoneType to the contract enum index.
 */
const MILESTONE_TYPE_INDEX: Record<MilestoneType, number> = {
  FIRST_REPORT: 0,
  TIER_IMPROVEMENT: 1,
  SCORE_IMPROVEMENT: 2,
  FIRST_STAMP: 3,
  FIRST_CLAIM: 4,
  REPORTING_STREAK: 5,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mintCCR(amount: number): Promise<string> {
  const ccrTokenId = loadTokenId("CCR");
  if (!ccrTokenId) {
    throw new Error("[Reward] CCR token ID not found in config. Run deploy first.");
  }

  const client = await getClient();
  const operatorKey = getOperatorKey();

  // CCR has 2 decimals, so multiply by 100
  const mintAmount = amount * 100;

  const tx = new TokenMintTransaction()
    .setTokenId(ccrTokenId)
    .setAmount(mintAmount);

  const frozen = await tx.freezeWith(client);
  const signed = await frozen.sign(operatorKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);

  return response.transactionId.toString();
}

async function transferCCR(
  recipientAccountId: AccountId,
  amount: number
): Promise<string> {
  const ccrTokenId = loadTokenId("CCR");
  if (!ccrTokenId) {
    throw new Error("[Reward] CCR token ID not found in config.");
  }

  const client = await getClient();
  const operatorId = getOperatorId();
  const operatorKey = getOperatorKey();

  const transferAmount = amount * 100; // 2 decimals

  const tx = new TransferTransaction()
    .addTokenTransfer(ccrTokenId, operatorId, -transferAmount)
    .addTokenTransfer(ccrTokenId, recipientAccountId, transferAmount);

  const frozen = await tx.freezeWith(client);
  const signed = await frozen.sign(operatorKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);

  return response.transactionId.toString();
}

// ---------------------------------------------------------------------------
// Milestone trigger checks
// ---------------------------------------------------------------------------

async function checkMilestoneTriggers(
  companyId: string
): Promise<MilestoneType[]> {
  const triggered: MilestoneType[] = [];

  // Check which milestones are already achieved
  const existing = await prisma.milestone.findMany({
    where: { companyId },
  });
  const achievedSet = new Set(existing.map((m) => m.milestoneType));

  // FIRST_REPORT: company has at least 1 emissions record
  if (!achievedSet.has("FIRST_REPORT")) {
    const count = await prisma.emissionsRecord.count({ where: { companyId } });
    if (count >= 1) triggered.push("FIRST_REPORT");
  }

  // TIER_IMPROVEMENT: company's current tier is better than initial
  // (Tier_3 < Tier_2 < Tier_1 in severity, so improvement = lower tier number)
  // This is checked externally when tier changes — we just check if the company
  // has had a tier change recorded. For simplicity, check if company has
  // emissions records and current tier differs from what baseline would give.
  if (!achievedSet.has("TIER_IMPROVEMENT")) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (company) {
      const latestEmissions = await prisma.emissionsRecord.findFirst({
        where: { companyId },
        orderBy: { calculatedAt: "desc" },
      });
      if (latestEmissions && latestEmissions.totalTCO2e < company.baselineEmissions) {
        // Emissions reduced — check if tier would improve
        const currentTier = company.emissionTier;
        const baselineTier = company.baselineEmissions >= 100_000 ? "Tier_1"
          : company.baselineEmissions >= 10_000 ? "Tier_2" : "Tier_3";
        if (currentTier !== baselineTier) triggered.push("TIER_IMPROVEMENT");
      }
    }
  }

  // SCORE_IMPROVEMENT: carbon score improved (checked externally)
  // We check if the company has a score better than "C" (default)
  if (!achievedSet.has("SCORE_IMPROVEMENT")) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (company && (company.carbonScore === "A" || company.carbonScore === "B")) {
      triggered.push("SCORE_IMPROVEMENT");
    }
  }

  // FIRST_STAMP: company has at least 1 compliance stamp
  if (!achievedSet.has("FIRST_STAMP")) {
    const passport = await prisma.carbonPassport.findFirst({
      where: { companyId, passportType: "company" },
    });
    if (passport) {
      const stampCount = await prisma.complianceStamp.count({
        where: { passportId: passport.id },
      });
      if (stampCount >= 1) triggered.push("FIRST_STAMP");
    }
  }

  // FIRST_CLAIM: company has at least 1 attested claim
  if (!achievedSet.has("FIRST_CLAIM")) {
    const claimCount = await prisma.verifiableClaim.count({
      where: { companyId, status: "ATTESTED" },
    });
    if (claimCount >= 1) triggered.push("FIRST_CLAIM");
  }

  // REPORTING_STREAK: company has 4+ consecutive reporting periods
  if (!achievedSet.has("REPORTING_STREAK")) {
    const records = await prisma.emissionsRecord.findMany({
      where: { companyId },
      orderBy: { calculatedAt: "asc" },
    });
    if (records.length >= 4) triggered.push("REPORTING_STREAK");
  }

  return triggered;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Checks all milestone triggers for a company and distributes CCR rewards
 * for any newly achieved milestones.
 *
 * 1. Check each milestone trigger
 * 2. For each triggered milestone not yet achieved:
 *    a. Mint CCR tokens
 *    b. Transfer to company account
 *    c. Record on RewardDistributor contract
 *    d. Submit HCS event
 *    e. Persist to DB
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.6
 */
export async function checkAndDistributeRewards(
  companyId: string
): Promise<Milestone[]> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const triggered = await checkMilestoneTriggers(companyId);
  const awarded: Milestone[] = [];

  for (const milestoneType of triggered) {
    const rewardAmount = MILESTONE_REWARDS[milestoneType];

    try {
      // Mint CCR tokens
      await mintCCR(rewardAmount);

      // Transfer to company account
      const companyAccountId = AccountId.fromString(company.hederaAccountId);
      const txId = await transferCCR(companyAccountId, rewardAmount);

      // Record on RewardDistributor contract (non-fatal if reverts)
      const contractIdRaw = getValue("contracts.RewardDistributor.id");
      if (typeof contractIdRaw === "string") {
        const contractId = ContractId.fromString(contractIdRaw);
        const companyEvmAddress =
          "0x" +
          BigInt(company.hederaAccountId.split(".")[2]).toString(16).padStart(40, "0");

        const params = new ContractFunctionParameters()
          .addAddress(companyEvmAddress)
          .addUint8(MILESTONE_TYPE_INDEX[milestoneType])
          .addUint256(rewardAmount);

        try {
          await contractCall(contractId, "recordMilestone", params);
        } catch (contractErr) {
          const contractMsg = contractErr instanceof Error ? contractErr.message : String(contractErr);
          console.warn(`[Reward] Contract recordMilestone reverted (non-fatal): ${contractMsg}`);
        }
      }

      // Persist to DB
      const milestone = await prisma.milestone.create({
        data: {
          companyId,
          milestoneType,
          ccrRewardAmount: rewardAmount,
          transactionId: txId,
        },
      });

      // Submit HCS event
      const topicId = loadTopicId("Rewards");
      if (topicId) {
        await submitMessage(topicId, {
          timestamp: new Date().toISOString(),
          eventType: "REWARD_DISTRIBUTED",
          payload: {
            companyId,
            companyDid: company.did ?? "",
            milestoneType,
            ccrRewardAmount: rewardAmount,
            transactionId: txId,
          },
        });
      }

      awarded.push(milestone);
      console.log(
        `[Reward] Awarded ${rewardAmount} CCR to ${companyId} for ${milestoneType}`
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(
        `[Reward] Failed to distribute ${milestoneType} reward for ${companyId}: ${msg}`
      );
    }
  }

  return awarded;
}

/**
 * Returns all earned rewards for a company.
 * Requirements: 11.5
 */
export async function getEarnedRewards(
  companyId: string
): Promise<Milestone[]> {
  return prisma.milestone.findMany({
    where: { companyId },
    orderBy: { awardedAt: "desc" },
  });
}

/**
 * Returns milestone progress for a company — which milestones are achieved
 * and which are still pending.
 * Requirements: 11.5
 */
export async function getMilestoneProgress(
  companyId: string
): Promise<MilestoneProgress[]> {
  const existing = await prisma.milestone.findMany({
    where: { companyId },
  });
  const achievedMap = new Map(
    existing.map((m) => [m.milestoneType, m])
  );

  return ALL_MILESTONE_TYPES.map((mt) => {
    const milestone = achievedMap.get(mt);
    return {
      milestoneType: mt,
      achieved: !!milestone,
      rewardAmount: MILESTONE_REWARDS[mt],
      awardedAt: milestone?.awardedAt.toISOString(),
    };
  });
}
