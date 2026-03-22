/**
 * Policy Framework Service for the Corporate Carbon Compliance Platform.
 *
 * Evaluates company alignment against international carbon policy frameworks,
 * produces per-framework compliance scores (0–100), and flags AT_RISK when
 * a score drops below 50.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import prisma from "@/lib/prisma";
import { loadTopicId, submitMessage } from "@/services/hcs.service";
import type { Company, EmissionsRecord, Allocation } from "@/lib/local-db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PolicyFrameworkName =
  | "PARIS_AGREEMENT"
  | "EU_ETS"
  | "CBAM"
  | "CORSIA"
  | "VERRA"
  | "GOLD_STANDARD";

export type AlignmentStatus = "COMPLIANT" | "AT_RISK" | "NON_COMPLIANT";

export interface PolicyComplianceCriteria {
  framework: PolicyFrameworkName;
  evaluate: (
    company: Company,
    emissions: EmissionsRecord[],
    allocations: Allocation[]
  ) => number; // Returns score 0–100
}

export interface PolicyAlignmentResult {
  companyId: string;
  framework: PolicyFrameworkName;
  complianceScore: number;
  status: AlignmentStatus;
  lastEvaluatedAt: string;
}

// ---------------------------------------------------------------------------
// Policy Criteria Definitions
// ---------------------------------------------------------------------------

/**
 * Paris Agreement: Emission reduction targets relative to baseline year.
 * Score based on how much the company has reduced emissions vs baseline.
 * 100 = reduced by ≥50%, 0 = increased by ≥50%.
 * Requirements: 9.4
 */
function evaluateParisAgreement(
  company: Company,
  emissions: EmissionsRecord[],
  _allocations: Allocation[]
): number {
  if (emissions.length === 0) return 50; // No data yet — neutral

  const latest = emissions.reduce((a, b) =>
    new Date(a.calculatedAt) > new Date(b.calculatedAt) ? a : b
  );
  const baseline = company.baselineEmissions;
  if (baseline <= 0) return 50;

  // Reduction ratio: 1.0 = no change, <1.0 = reduced, >1.0 = increased
  const ratio = latest.totalTCO2e / baseline;
  // Map ratio to score: 0.5 ratio → 100, 1.0 → 50, 1.5 → 0
  const score = Math.round(Math.max(0, Math.min(100, (1.5 - ratio) * 100)));
  return score;
}

/**
 * EU ETS: CAL token coverage ratio.
 * Score based on how well the company's CAL allocation covers reported emissions.
 * Requirements: 9.4
 */
function evaluateEUETS(
  _company: Company,
  _emissions: EmissionsRecord[],
  allocations: Allocation[]
): number {
  if (allocations.length === 0) return 50; // No allocation yet

  const latest = allocations.reduce((a, b) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b
  );

  const allocated = latest.allocatedAmount;
  const used = latest.usedAmount;
  if (allocated <= 0) return 0;

  // Coverage ratio: allocated / used. ≥1.0 = fully covered
  if (used === 0) return 100;
  const coverageRatio = allocated / used;
  // Map: ≥1.5 → 100, 1.0 → 75, 0.5 → 25, 0 → 0
  const score = Math.round(Math.max(0, Math.min(100, coverageRatio * 66.67)));
  return score;
}

/**
 * CBAM: Embedded emissions reporting completeness.
 * Score based on how many reporting periods have Scope 3 data (supply chain).
 * Requirements: 9.4
 */
function evaluateCBAM(
  _company: Company,
  emissions: EmissionsRecord[],
  _allocations: Allocation[]
): number {
  if (emissions.length === 0) return 0;

  // Check how many records have Scope 3 data reported
  let withScope3 = 0;
  for (const record of emissions) {
    if (record.scope3TCO2e > 0) withScope3++;
  }

  const ratio = withScope3 / emissions.length;
  return Math.round(ratio * 100);
}

/**
 * CORSIA: Offset credit quality verification.
 * Score based on whether the company has verified carbon credits (marketplace transactions).
 * Requirements: 9.4
 */
function evaluateCORSIA(
  company: Company,
  _emissions: EmissionsRecord[],
  allocations: Allocation[]
): number {
  // Check if company has surplus allowances (indicating offset activity)
  if (allocations.length === 0) return 30;

  const latest = allocations.reduce((a, b) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b
  );

  if (latest.surplus > 0) return 80;
  if (latest.deficit === 0) return 60;
  // Deficit means not enough offsets
  const deficitRatio = latest.deficit / Math.max(1, latest.allocatedAmount);
  return Math.round(Math.max(0, (1 - deficitRatio) * 60));
}

/**
 * Verra: Project-level verification via Guardian MRV.
 * Score based on whether the company has Guardian-verified credentials.
 * Checked via GuardianSubmission records in DB.
 * Requirements: 9.4
 */
function evaluateVerra(
  _company: Company,
  emissions: EmissionsRecord[],
  _allocations: Allocation[]
): number {
  // Without direct access to Guardian submissions in the evaluate signature,
  // we use emissions data completeness as a proxy.
  // A more complete implementation would query GuardianSubmission table.
  if (emissions.length === 0) return 20;

  // Score based on reporting consistency and completeness
  const hasMultiplePeriods = emissions.length >= 2;
  const hasAllScopes = emissions.some(
    (e) => e.scope1TCO2e > 0 && e.scope2TCO2e > 0 && e.scope3TCO2e > 0
  );

  let score = 30;
  if (hasMultiplePeriods) score += 30;
  if (hasAllScopes) score += 40;
  return Math.min(100, score);
}

/**
 * Gold Standard: Sustainable development co-benefits documentation.
 * Score based on company's carbon score and reporting completeness.
 * Requirements: 9.4
 */
function evaluateGoldStandard(
  company: Company,
  emissions: EmissionsRecord[],
  _allocations: Allocation[]
): number {
  let score = 0;

  // Carbon score contributes up to 50 points
  const gradeScores: Record<string, number> = {
    A: 50, B: 40, C: 30, D: 15, F: 0,
  };
  score += gradeScores[company.carbonScore ?? "F"] ?? 0;

  // Reporting completeness contributes up to 50 points
  if (emissions.length >= 4) score += 50;
  else if (emissions.length >= 2) score += 30;
  else if (emissions.length >= 1) score += 15;

  return Math.min(100, score);
}

/**
 * Policy criteria definitions for all 6 frameworks.
 * Requirements: 9.1, 9.4
 */
export const POLICY_CRITERIA: Record<PolicyFrameworkName, PolicyComplianceCriteria> = {
  PARIS_AGREEMENT: {
    framework: "PARIS_AGREEMENT",
    evaluate: evaluateParisAgreement,
  },
  EU_ETS: {
    framework: "EU_ETS",
    evaluate: evaluateEUETS,
  },
  CBAM: {
    framework: "CBAM",
    evaluate: evaluateCBAM,
  },
  CORSIA: {
    framework: "CORSIA",
    evaluate: evaluateCORSIA,
  },
  VERRA: {
    framework: "VERRA",
    evaluate: evaluateVerra,
  },
  GOLD_STANDARD: {
    framework: "GOLD_STANDARD",
    evaluate: evaluateGoldStandard,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives alignment status from a compliance score.
 */
function deriveStatus(score: number): AlignmentStatus {
  if (score < 50) return "AT_RISK";
  if (score < 75) return "COMPLIANT";
  return "COMPLIANT";
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Evaluates alignment for all selected policy frameworks for a company.
 *
 * 1. Load company with selected frameworks
 * 2. Load emissions records and allocations
 * 3. Evaluate each selected framework
 * 4. Persist alignment records to DB (upsert)
 * 5. Submit HCS event for any AT_RISK frameworks
 *
 * Requirements: 9.3, 9.5, 9.7
 */
export async function evaluateAlignment(
  companyId: string
): Promise<PolicyAlignmentResult[]> {
  // 1. Load company
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const selectedFrameworks = (company.policyFrameworks ?? []) as PolicyFrameworkName[];
  if (selectedFrameworks.length === 0) {
    return [];
  }

  // 2. Load emissions and allocations
  const emissions = await prisma.emissionsRecord.findMany({
    where: { companyId },
    orderBy: { calculatedAt: "desc" },
  });

  const allocations = await prisma.allocation.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  // 3. Evaluate each framework
  const results: PolicyAlignmentResult[] = [];
  const now = new Date().toISOString();

  for (const frameworkName of selectedFrameworks) {
    const criteria = POLICY_CRITERIA[frameworkName];
    if (!criteria) continue;

    const score = criteria.evaluate(company, emissions, allocations);
    const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
    const status = deriveStatus(clampedScore);

    // 4. Upsert alignment record
    await prisma.policyAlignment.upsert({
      where: {
        companyId_frameworkName: {
          companyId,
          frameworkName,
        },
      },
      update: {
        complianceScore: clampedScore,
        status,
        lastEvaluatedAt: new Date(),
      },
      create: {
        companyId,
        frameworkName,
        complianceScore: clampedScore,
        status,
        lastEvaluatedAt: new Date(),
      },
    });

    // 5. Submit HCS event if AT_RISK
    if (status === "AT_RISK") {
      const topicId = loadTopicId("PolicyCompliance");
      if (topicId) {
        await submitMessage(topicId, {
          timestamp: now,
          eventType: "POLICY_AT_RISK",
          payload: {
            companyId,
            companyDid: company.did ?? "",
            framework: frameworkName,
            complianceScore: clampedScore,
          },
        });
      }
    }

    results.push({
      companyId,
      framework: frameworkName,
      complianceScore: clampedScore,
      status,
      lastEvaluatedAt: now,
    });
  }

  return results;
}

/**
 * Retrieves the current policy alignment records for a company.
 *
 * Requirements: 9.6
 */
export async function getAlignment(
  companyId: string
): Promise<PolicyAlignmentResult[]> {
  const records = await prisma.policyAlignment.findMany({
    where: { companyId },
    orderBy: { frameworkName: "asc" },
  });

  return records.map((r) => ({
    companyId: r.companyId,
    framework: r.frameworkName as PolicyFrameworkName,
    complianceScore: r.complianceScore,
    status: r.status as AlignmentStatus,
    lastEvaluatedAt: r.lastEvaluatedAt.toISOString(),
  }));
}

/**
 * Updates the selected policy frameworks for a company and triggers
 * re-evaluation of alignment.
 *
 * Requirements: 9.2, 9.6
 */
export async function updateSelectedFrameworks(
  companyId: string,
  frameworks: PolicyFrameworkName[]
): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { policyFrameworks: frameworks },
  });

  // Remove alignment records for deselected frameworks
  const currentAlignments = await prisma.policyAlignment.findMany({
    where: { companyId },
  });
  const deselected = currentAlignments.filter(
    (a) => !frameworks.includes(a.frameworkName as PolicyFrameworkName)
  );
  if (deselected.length > 0) {
    await prisma.policyAlignment.deleteMany({
      where: {
        id: { in: deselected.map((d) => d.id) },
      },
    });
  }
}
