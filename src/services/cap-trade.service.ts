/**
 * Cap-and-Trade Service for the Corporate Carbon Compliance Platform.
 *
 * Manages annual CAL token allocations, surplus/deficit tracking,
 * and allowance management for companies based on emission tiers.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
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
import type { EmissionTier } from "@/services/carbon-score.service";
import type { Allocation } from "@/lib/local-db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AllocationInput {
  companyId: string;
  compliancePeriod: string; // "2025"
}

export interface AllocationResult {
  companyId: string;
  compliancePeriod: string;
  allocatedAmount: number;
  emissionTier: EmissionTier;
  transactionId: string;
}

export interface BalanceResult {
  companyId: string;
  compliancePeriod: string;
  allocated: number;
  used: number;
  surplus: number;
  deficit: number;
  status: "COMPLIANT" | "NON_COMPLIANT" | "PENDING";
}

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Returns the CAL token allocation amount for a given emission tier.
 *
 * Pure function — no side effects.
 *
 * - Tier_1: 80,000 CAL
 * - Tier_2: 15,000 CAL
 * - Tier_3: 5,000 CAL
 *
 * Requirements: 5.1
 */
export function getAllocationAmount(tier: EmissionTier): number {
  switch (tier) {
    case "Tier_1":
      return 80_000;
    case "Tier_2":
      return 15_000;
    case "Tier_3":
      return 5_000;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mints fungible CAL tokens using SDK TokenMintTransaction.
 * The operator key is used as the supply key signer.
 */
async function mintFungibleCAL(
  tokenId: TokenId,
  amount: number
): Promise<string> {
  const client = await getClient();
  const operatorKey = getOperatorKey();

  const tx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setAmount(amount);

  const frozen = await tx.freezeWith(client);
  const signedTx = await frozen.sign(operatorKey);
  const response = await signedTx.execute(client);
  const receipt = await response.getReceipt(client);

  console.log(
    `[CapTrade] Minted ${amount} CAL tokens — txId=${response.transactionId}, status=${receipt.status}`
  );

  return response.transactionId.toString();
}

/**
 * Transfers fungible CAL tokens from operator to a company account.
 */
async function transferCAL(
  tokenId: TokenId,
  recipientAccountId: AccountId,
  amount: number
): Promise<string> {
  const client = await getClient();
  const operatorId = getOperatorId();
  const operatorKey = getOperatorKey();

  const tx = new TransferTransaction()
    .addTokenTransfer(tokenId, operatorId, -amount)
    .addTokenTransfer(tokenId, recipientAccountId, amount);

  const frozen = await tx.freezeWith(client);
  const signedTx = await frozen.sign(operatorKey);
  const response = await signedTx.execute(client);
  const receipt = await response.getReceipt(client);

  console.log(
    `[CapTrade] Transferred ${amount} CAL to ${recipientAccountId} — txId=${response.transactionId}, status=${receipt.status}`
  );

  return response.transactionId.toString();
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Allocates CAL tokens to a company for a compliance period:
 * 1. Look up company from DB to get hederaAccountId and DID
 * 2. Calculate allocation amount based on emission tier
 * 3. Mint CAL tokens via SDK TokenMintTransaction
 * 4. Transfer CAL tokens to company account
 * 5. Record allocation on CapTradeManager contract
 * 6. Persist to DB
 * 7. Submit HCS event to CapAndTrade topic
 *
 * Requirements: 5.1, 5.2, 5.6, 5.8
 */
export async function allocateAllowances(
  input: AllocationInput
): Promise<AllocationResult> {
  // 1. Look up company
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
  });

  if (!company) {
    throw new Error(`Company not found: ${input.companyId}`);
  }

  // 2. Calculate allocation amount
  const tier = company.emissionTier as EmissionTier;
  const amount = getAllocationAmount(tier);

  // 3. Mint CAL tokens
  const calTokenId = loadTokenId("CAL");
  if (!calTokenId) {
    throw new Error("[CapTrade] CAL token ID not found in config. Run deploy first.");
  }

  await mintFungibleCAL(calTokenId, amount);

  // 4. Transfer CAL tokens to company account
  const companyAccountId = AccountId.fromString(company.hederaAccountId);
  const transferTxId = await transferCAL(calTokenId, companyAccountId, amount);

  // 5. Record allocation on CapTradeManager contract
  const contractIdRaw = getValue("contracts.CapTradeManager.id");
  if (typeof contractIdRaw === "string") {
    const contractId = ContractId.fromString(contractIdRaw);
    const companyEvmAddress =
      "0x" +
      BigInt(company.hederaAccountId.split(".")[2]).toString(16).padStart(40, "0");

    const params = new ContractFunctionParameters()
      .addAddress(companyEvmAddress)
      .addUint256(parseInt(input.compliancePeriod, 10))
      .addUint256(amount);

    try {
      await contractCall(contractId, "recordAllocation", params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[CapTrade] Contract recordAllocation reverted (non-fatal): ${msg}`);
    }
  }

  // 6. Persist to DB
  await prisma.allocation.create({
    data: {
      companyId: input.companyId,
      compliancePeriod: input.compliancePeriod,
      allocatedAmount: amount,
      usedAmount: 0,
      surplus: amount,
      deficit: 0,
      status: "COMPLIANT",
      transactionId: transferTxId,
    },
  });

  // 7. Submit HCS event to CapAndTrade topic
  const topicId = loadTopicId("CapAndTrade");
  if (topicId) {
    await submitMessage(topicId, {
      timestamp: new Date().toISOString(),
      eventType: "CAL_ALLOCATED",
      payload: {
        companyId: input.companyId,
        companyDid: company.did ?? "",
        amount,
        compliancePeriod: input.compliancePeriod,
        emissionTier: tier,
      },
    });
  }

  return {
    companyId: input.companyId,
    compliancePeriod: input.compliancePeriod,
    allocatedAmount: amount,
    emissionTier: tier,
    transactionId: transferTxId,
  };
}

/**
 * Gets the balance (surplus/deficit) for a company in a compliance period.
 *
 * Requirements: 5.3, 5.4, 5.5
 */
export async function getBalance(
  companyId: string,
  period: string
): Promise<BalanceResult> {
  const allocation = await prisma.allocation.findUnique({
    where: {
      companyId_compliancePeriod: {
        companyId,
        compliancePeriod: period,
      },
    },
  });

  if (!allocation) {
    return {
      companyId,
      compliancePeriod: period,
      allocated: 0,
      used: 0,
      surplus: 0,
      deficit: 0,
      status: "PENDING",
    };
  }

  const allocated = allocation.allocatedAmount;
  const used = allocation.usedAmount;
  const surplus = Math.max(0, allocated - used);
  const deficit = Math.max(0, used - allocated);

  let status: BalanceResult["status"];
  if (deficit > 0) {
    status = "NON_COMPLIANT";
  } else if (allocated > 0) {
    status = "COMPLIANT";
  } else {
    status = "PENDING";
  }

  return {
    companyId,
    compliancePeriod: period,
    allocated,
    used,
    surplus,
    deficit,
    status,
  };
}

/**
 * Gets all allocation records for a company, ordered by most recent first.
 *
 * Requirements: 5.7
 */
export async function getAllocations(
  companyId: string
): Promise<Allocation[]> {
  return prisma.allocation.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}
