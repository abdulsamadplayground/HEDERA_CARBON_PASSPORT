/**
 * Company Service for the Corporate Carbon Compliance Platform.
 *
 * Handles company registration, profile management, emission tier
 * classification, DID generation, and carbon score initialization.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

import prisma from "@/lib/prisma";
import { registerDID } from "@/services/did.service";
import {
  calculateCarbonScore,
  getSectorBenchmark,
  recalculateCompanyScore,
} from "@/services/carbon-score.service";
import { checkAndDistributeRewards } from "@/services/reward.service";
import type { CarbonScoreGrade, SectorType, EmissionTier } from "@/services/carbon-score.service";
import { loadTopicId, submitMessage } from "@/services/hcs.service";
import { getClient, getOperatorKey } from "@/lib/hedera/client";
import type { Company } from "@/lib/local-db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RevenueRange = "UNDER_10M" | "10M_100M" | "100M_1B" | "OVER_1B";
export type PolicyFrameworkName =
  | "PARIS_AGREEMENT"
  | "EU_ETS"
  | "CBAM"
  | "CORSIA"
  | "VERRA"
  | "GOLD_STANDARD";

export interface CompanyRegistrationInput {
  companyName: string;
  hederaAccountId: string;
  sector: SectorType;
  revenueRange: RevenueRange;
  baselineEmissions: number; // tCO2e
  policyFrameworks?: PolicyFrameworkName[];
  callerEvmAddress?: string; // EVM address of the connected wallet (from request headers)
}

export type { EmissionTier, SectorType, CarbonScoreGrade };

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Classifies a company into an emission tier based on baseline emissions.
 *
 * Pure function — no side effects.
 *
 * - Tier_1: >= 100,000 tCO2e
 * - Tier_2: >= 10,000 tCO2e and < 100,000 tCO2e
 * - Tier_3: < 10,000 tCO2e
 *
 * Requirements: 1.2, 1.3
 */
export function calculateEmissionTier(baselineEmissions: number): EmissionTier {
  if (baselineEmissions >= 100_000) return "Tier_1";
  if (baselineEmissions >= 10_000) return "Tier_2";
  return "Tier_3";
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Registers a new company on the platform:
 * 1. Check for duplicate hederaAccountId
 * 2. Calculate emission tier
 * 3. Generate DID via DID service
 * 4. Calculate initial carbon score via Carbon Score service
 * 5. Persist to DB
 * 6. Submit HCS event to CompanyRegistration topic with company_did
 * 7. Return company record
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.8
 */
export async function registerCompany(
  input: CompanyRegistrationInput
): Promise<Company & { transactionId?: string }> {
  // 1. Check for duplicate hederaAccountId
  const existing = await prisma.company.findUnique({
    where: { hederaAccountId: input.hederaAccountId },
  });
  if (existing) {
    throw new Error(
      `A company with Hedera account ${input.hederaAccountId} is already registered.`
    );
  }

  // 2. Calculate emission tier
  const emissionTier = calculateEmissionTier(input.baselineEmissions);

  // 3. Generate DID via DID service
  // Use the connected wallet's EVM address as the public key identifier when available,
  // otherwise fall back to the platform operator's public key
  const client = await getClient();
  let publicKey: string;
  if (input.callerEvmAddress) {
    publicKey = input.callerEvmAddress;
  } else {
    const operatorKey = getOperatorKey();
    publicKey = operatorKey.publicKey.toString();
  }
  const didResult = await registerDID(
    input.hederaAccountId,
    "COMPANY",
    publicKey
  );

  // 4. Calculate initial carbon score
  let carbonScore: CarbonScoreGrade = "C"; // default if no benchmark
  try {
    const benchmark = await getSectorBenchmark(input.sector, emissionTier);
    carbonScore = calculateCarbonScore(
      input.baselineEmissions,
      benchmark.benchmarkEmissions
    );
  } catch {
    // No benchmark seeded yet — use default score
    console.warn(
      `[Company] No benchmark for sector=${input.sector}, tier=${emissionTier}. Using default score "C".`
    );
  }

  // 5. Persist to DB
  const company = await prisma.company.create({
    data: {
      companyName: input.companyName,
      hederaAccountId: input.hederaAccountId,
      did: didResult.did,
      sector: input.sector,
      revenueRange: input.revenueRange,
      baselineEmissions: input.baselineEmissions,
      emissionTier,
      carbonScore,
      policyFrameworks: input.policyFrameworks ?? [],
    },
  });

  // 6. Submit HCS event to CompanyRegistration topic
  const topicId = loadTopicId("CompanyRegistration");
  if (topicId) {
    await submitMessage(topicId, {
      timestamp: new Date().toISOString(),
      eventType: "COMPANY_REGISTERED",
      payload: {
        companyId: company.id,
        companyDid: didResult.did,
        sector: input.sector,
        tier: emissionTier,
        carbonScore,
      },
    });
  }

  // Update the DID document entity reference to the company ID
  await prisma.dIDDocument.update({
    where: { did: didResult.did },
    data: { entityId: company.id },
  });

  return { ...company, transactionId: didResult.transactionId };
}

/**
 * Retrieves a company by ID.
 *
 * Requirements: 1.7
 */
export async function getCompany(id: string): Promise<Company | null> {
  return prisma.company.findUnique({ where: { id } });
}

/**
 * Retrieves a company by Hedera Account ID (e.g. "0.0.12345").
 */
export async function getCompanyByHederaId(hederaAccountId: string): Promise<Company | null> {
  return prisma.company.findUnique({ where: { hederaAccountId } });
}

/**
 * Updates a company profile and recalculates tier + carbon score if needed.
 *
 * Requirements: 1.3, 1.7
 */
export async function updateCompany(
  id: string,
  updates: Partial<CompanyRegistrationInput>
): Promise<Company> {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Company not found: ${id}`);
  }

  const data: Record<string, unknown> = {};

  if (updates.companyName !== undefined) data.companyName = updates.companyName;
  if (updates.sector !== undefined) data.sector = updates.sector;
  if (updates.revenueRange !== undefined) data.revenueRange = updates.revenueRange;
  if (updates.policyFrameworks !== undefined) data.policyFrameworks = updates.policyFrameworks;

  // Recalculate tier if baseline emissions changed
  if (updates.baselineEmissions !== undefined) {
    data.baselineEmissions = updates.baselineEmissions;
    const newTier = calculateEmissionTier(updates.baselineEmissions);
    data.emissionTier = newTier;

    // Check for tier improvement reward
    if (newTier !== existing.emissionTier) {
      try {
        await checkAndDistributeRewards(id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Company] Reward check failed for tier change ${id}: ${msg}`);
      }
    }
  }

  const company = await prisma.company.update({
    where: { id },
    data,
  });

  // Recalculate carbon score if sector, baseline, or tier changed
  if (
    updates.baselineEmissions !== undefined ||
    updates.sector !== undefined
  ) {
    try {
      await recalculateCompanyScore(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Company] Score recalculation failed for ${id}: ${msg}`);
    }
  }

  // Return the freshest record
  return (await prisma.company.findUnique({ where: { id } }))!;
}
