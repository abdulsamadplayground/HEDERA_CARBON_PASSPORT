/**
 * Carbon Score Service for the Corporate Carbon Compliance Platform.
 *
 * Calculates and manages carbon score grades (A/B/C/D/F) based on
 * a company's total emissions relative to sector benchmarks.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 */

import { createHash } from "crypto";
import { ContractFunctionParameters, ContractId } from "@hashgraph/sdk";
import { uploadFile } from "@/services/hfs.service";
import { contractCall } from "@/services/hscs.service";
import { loadTopicId, submitMessage } from "@/services/hcs.service";
import { getValue } from "@/lib/local-store";
import { checkAndDistributeRewards } from "@/services/reward.service";
import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CarbonScoreGrade = "A" | "B" | "C" | "D" | "F";

export type SectorType =
  | "ENERGY"
  | "MANUFACTURING"
  | "TRANSPORTATION"
  | "AGRICULTURE"
  | "SERVICES";

export type EmissionTier = "Tier_1" | "Tier_2" | "Tier_3";

export interface SectorBenchmarkData {
  sector: SectorType;
  emissionTier: EmissionTier;
  benchmarkEmissions: number; // tCO2e
}

export interface CompanyScoreResult {
  score: CarbonScoreGrade;
  emissions: number;
  benchmark: number;
}

// ---------------------------------------------------------------------------
// Pure calculation
// ---------------------------------------------------------------------------

/**
 * Calculates a carbon score grade based on the ratio of total emissions
 * to the sector benchmark emissions.
 *
 * Pure function — no side effects.
 *
 * ratio = totalEmissions / benchmarkEmissions
 *   A: ratio < 0.6
 *   B: 0.6 <= ratio < 0.8
 *   C: 0.8 <= ratio < 1.0
 *   D: 1.0 <= ratio < 1.3
 *   F: ratio >= 1.3
 *
 * Requirements: 16.1
 */
export function calculateCarbonScore(
  totalEmissions: number,
  benchmarkEmissions: number
): CarbonScoreGrade {
  if (benchmarkEmissions <= 0) {
    return "F";
  }

  const ratio = totalEmissions / benchmarkEmissions;

  if (ratio < 0.6) return "A";
  if (ratio < 0.8) return "B";
  if (ratio < 1.0) return "C";
  if (ratio < 1.3) return "D";
  return "F";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Loads the CompliancePassportManager contract ID from the local config store.
 */
function loadPassportManagerContractId(): ContractId {
  const raw = getValue("contracts.CompliancePassportManager.id");
  if (typeof raw !== "string") {
    throw new Error(
      "[CarbonScore] CompliancePassportManager contract ID not found in config. Run deploy first."
    );
  }
  return ContractId.fromString(raw);
}

// ---------------------------------------------------------------------------
// Database queries
// ---------------------------------------------------------------------------

/**
 * Retrieves the sector benchmark for a given sector and emission tier.
 *
 * Requirements: 16.5
 */
export async function getSectorBenchmark(
  sector: SectorType,
  tier: EmissionTier
): Promise<SectorBenchmarkData> {
  const record = await prisma.sectorBenchmark.findUnique({
    where: {
      sector_emissionTier: {
        sector,
        emissionTier: tier,
      },
    },
  });

  if (!record) {
    throw new Error(
      `[CarbonScore] No benchmark found for sector="${sector}", tier="${tier}".`
    );
  }

  return {
    sector: record.sector as SectorType,
    emissionTier: record.emissionTier as EmissionTier,
    benchmarkEmissions: record.benchmarkEmissions,
  };
}

/**
 * Returns all sector benchmarks from the database.
 *
 * Requirements: 16.6
 */
export async function getSectorBenchmarks(): Promise<SectorBenchmarkData[]> {
  const records = await prisma.sectorBenchmark.findMany({
    orderBy: [{ sector: "asc" }, { emissionTier: "asc" }],
  });

  return records.map((r) => ({
    sector: r.sector as SectorType,
    emissionTier: r.emissionTier as EmissionTier,
    benchmarkEmissions: r.benchmarkEmissions,
  }));
}

/**
 * Returns the current carbon score for a company.
 *
 * Requirements: 16.6
 */
export async function getCompanyScore(
  companyId: string
): Promise<CompanyScoreResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error(`[CarbonScore] Company not found: ${companyId}`);
  }

  // Get the latest emissions record
  const latestEmissions = await prisma.emissionsRecord.findFirst({
    where: { companyId },
    orderBy: { calculatedAt: "desc" },
  });

  const totalEmissions = latestEmissions?.totalTCO2e ?? company.baselineEmissions;

  // Get the sector benchmark
  let benchmarkEmissions = 0;
  try {
    const benchmark = await getSectorBenchmark(
      company.sector as SectorType,
      company.emissionTier as EmissionTier
    );
    benchmarkEmissions = benchmark.benchmarkEmissions;
  } catch {
    // If no benchmark exists, return current score with zero benchmark
  }

  return {
    score: (company.carbonScore as CarbonScoreGrade) ?? "F",
    emissions: totalEmissions,
    benchmark: benchmarkEmissions,
  };
}

// ---------------------------------------------------------------------------
// Score recalculation
// ---------------------------------------------------------------------------

/**
 * Recalculates the carbon score for a company:
 * 1. Get the company's latest emissions total
 * 2. Get the sector benchmark for the company's sector and tier
 * 3. Calculate the new score
 * 4. If score changed, update the company profile in DB
 * 5. If score changed, update CPASS metadata (on-chain + HFS)
 * 6. If score changed, submit HCS event to CompanyRegistration topic
 *
 * Requirements: 16.2, 16.3, 16.4
 */
export async function recalculateCompanyScore(
  companyId: string
): Promise<CarbonScoreGrade> {
  // 1. Get company
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error(`[CarbonScore] Company not found: ${companyId}`);
  }

  // 2. Get latest emissions record
  const latestEmissions = await prisma.emissionsRecord.findFirst({
    where: { companyId },
    orderBy: { calculatedAt: "desc" },
  });

  const totalEmissions = latestEmissions?.totalTCO2e ?? company.baselineEmissions;

  // 3. Get sector benchmark
  const benchmark = await getSectorBenchmark(
    company.sector as SectorType,
    company.emissionTier as EmissionTier
  );

  // 4. Calculate new score
  const newScore = calculateCarbonScore(totalEmissions, benchmark.benchmarkEmissions);
  const previousScore = company.carbonScore as CarbonScoreGrade | null;
  const scoreChanged = previousScore !== newScore;

  if (!scoreChanged) {
    return newScore;
  }

  // 5. Update company profile in DB
  await prisma.company.update({
    where: { id: companyId },
    data: { carbonScore: newScore },
  });

  // 6. Update CPASS metadata if passport exists
  const passport = await prisma.carbonPassport.findFirst({
    where: { companyId, passportType: "company" },
    orderBy: { createdAt: "desc" },
  });

  if (passport) {
    try {
      // Parse existing metadata and update carbon_score
      const metadata = JSON.parse(passport.metadataJson);
      metadata.carbon_score = newScore;
      const updatedMetadataJson = JSON.stringify(metadata);

      // Upload updated metadata to HFS
      const metadataBuffer = Buffer.from(updatedMetadataJson, "utf-8");
      const fileId = await uploadFile(
        metadataBuffer,
        `CPASS metadata update: ${companyId}`
      );
      const newPassportUri = fileId.toString();

      // Compute new metadata hash
      const newMetadataHash = createHash("sha256")
        .update(updatedMetadataJson)
        .digest("hex");

      // Update passport on-chain via CompliancePassportManager contract
      const contractId = loadPassportManagerContractId();
      const tierNumber =
        company.emissionTier === "Tier_1" ? 1 :
        company.emissionTier === "Tier_2" ? 2 : 3;

      const params = new ContractFunctionParameters()
        .addUint256(passport.cpassSerial)
        .addUint256(tierNumber)
        .addBytes32(Buffer.from(newMetadataHash, "hex"))
        .addString(newScore);

      await contractCall(contractId, "updatePassport", params);

      // Update passport in DB
      await prisma.carbonPassport.update({
        where: { id: passport.id },
        data: {
          metadataJson: updatedMetadataJson,
          metadataHash: newMetadataHash,
          passportUri: newPassportUri,
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[CarbonScore] Failed to update CPASS metadata for company ${companyId}: ${msg}`
      );
    }
  }

  // 7. Submit HCS event if score changed
  const topicId = loadTopicId("CompanyRegistration");
  if (topicId) {
    await submitMessage(topicId, {
      topic: "CompanyRegistration",
      timestamp: new Date().toISOString(),
      eventType: "SCORE_UPDATED",
      payload: {
        companyId,
        companyDid: company.did ?? "",
        previousScore: previousScore ?? "N/A",
        newScore,
        totalEmissions,
        benchmarkEmissions: benchmark.benchmarkEmissions,
      },
    });
  }

  // 8. Check and distribute rewards if score improved (SCORE_IMPROVEMENT)
  const gradeOrder: CarbonScoreGrade[] = ["F", "D", "C", "B", "A"];
  const prevIdx = gradeOrder.indexOf(previousScore ?? "F");
  const newIdx = gradeOrder.indexOf(newScore);
  if (newIdx > prevIdx) {
    try {
      await checkAndDistributeRewards(companyId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[CarbonScore] Reward check failed for ${companyId}: ${msg}`);
    }
  }

  return newScore;
}
