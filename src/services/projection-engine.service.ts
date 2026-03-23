/**
 * Projection Engine Service for the Corporate Carbon Compliance Platform.
 *
 * Generates 6-month forward emissions forecasts based on historical data,
 * reduction trajectory, and sector benchmarks. Produces chart-ready data,
 * trend classification, compliance status, and actionable recommendations.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */

import prisma from "@/lib/prisma";
import { loadTopicId, submitMessage } from "@/services/hcs.service";
import {
  getSectorBenchmark,
  type SectorType,
  type EmissionTier,
} from "@/services/carbon-score.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrendClassification = "INCREASING" | "STABLE" | "DECREASING";
export type ComplianceProjection = "ON_TRACK" | "AT_RISK" | "NON_COMPLIANT";

export interface ProjectionDataPoint {
  month: string; // "2025-07"
  projectedTCO2e: number;
  upperBound: number;
  lowerBound: number;
}

export interface ProjectionResult {
  companyId: string;
  projectionPeriod: string;
  dataPoints: ProjectionDataPoint[];
  totalProjectedTCO2e: number;
  trend: TrendClassification;
  complianceStatus: ComplianceProjection;
  recommendations: string[];
  chartData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  };
}

// ---------------------------------------------------------------------------
// Pure helper functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Computes a simple linear regression over a series of values.
 * Returns slope (change per step) and intercept.
 */
export function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
} {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Classifies the trend based on the first and last projected values.
 * Uses a 5% threshold relative to the first value for STABLE classification.
 */
export function classifyTrend(
  firstValue: number,
  lastValue: number
): TrendClassification {
  if (firstValue <= 0) {
    if (lastValue > firstValue) return "INCREASING";
    if (lastValue < firstValue) return "DECREASING";
    return "STABLE";
  }

  const changeRatio = (lastValue - firstValue) / firstValue;

  if (changeRatio > 0.05) return "INCREASING";
  if (changeRatio < -0.05) return "DECREASING";
  return "STABLE";
}

/**
 * Determines compliance status by comparing projected total against CAL allocation.
 * - ON_TRACK: projected <= allocation
 * - AT_RISK: projected > allocation but within 10% overshoot
 * - NON_COMPLIANT: projected > 110% of allocation
 */
export function determineComplianceStatus(
  totalProjected: number,
  calAllocation: number
): ComplianceProjection {
  if (calAllocation <= 0) {
    // No allocation data — default to AT_RISK
    return "AT_RISK";
  }

  if (totalProjected <= calAllocation) {
    return "ON_TRACK";
  }

  const overshootRatio = totalProjected / calAllocation;
  if (overshootRatio <= 1.1) {
    return "AT_RISK";
  }

  return "NON_COMPLIANT";
}

/**
 * Generates actionable recommendations based on compliance status and trend.
 */
export function generateRecommendations(
  complianceStatus: ComplianceProjection,
  trend: TrendClassification,
  totalProjected: number,
  calAllocation: number
): string[] {
  const recommendations: string[] = [];

  if (complianceStatus === "NON_COMPLIANT") {
    recommendations.push(
      "Projected emissions exceed CAL allocation. Immediate reduction measures are required."
    );
    recommendations.push(
      "Consider purchasing additional carbon credits on the marketplace to offset the deficit."
    );
    recommendations.push(
      "Review Scope 1 and Scope 2 emission sources for quick-win reduction opportunities."
    );
  }

  if (complianceStatus === "AT_RISK") {
    recommendations.push(
      "Projected emissions are approaching CAL allocation limits. Proactive reduction is advised."
    );
    recommendations.push(
      "Evaluate energy efficiency improvements and renewable energy procurement options."
    );
  }

  if (trend === "INCREASING") {
    recommendations.push(
      "Emissions trend is increasing. Investigate root causes and implement mitigation strategies."
    );
  }

  if (complianceStatus !== "ON_TRACK" && calAllocation > 0) {
    const deficit = totalProjected - calAllocation;
    recommendations.push(
      `Estimated shortfall: ${deficit.toFixed(1)} tCO2e above allocation. Target reductions in high-impact categories.`
    );
  }

  return recommendations;
}

/**
 * Computes the standard deviation of a numeric array.
 */
function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

/**
 * Formats a month offset from a base date as "YYYY-MM".
 */
function formatMonth(baseDate: Date, offsetMonths: number): string {
  const d = new Date(baseDate);
  d.setMonth(d.getMonth() + offsetMonths);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Generates a 6-month forward emissions projection for a company.
 *
 * 1. Fetch company from DB (including DID)
 * 2. Fetch historical emissions records
 * 3. Fetch sector benchmark for confidence interval calibration
 * 4. Compute linear regression on historical monthly emissions
 * 5. Project 6 months forward with confidence intervals
 * 6. Classify trend, determine compliance status, generate recommendations
 * 7. Build chart-ready data
 * 8. Submit HCS event to Projections topic
 * 9. Persist projection to DB
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8
 */
export async function generateProjection(
  companyId: string
): Promise<ProjectionResult> {
  // 1. Fetch company
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  // 2. Fetch historical emissions records, ordered chronologically
  const emissionsRecords = await prisma.emissionsRecord.findMany({
    where: { companyId },
    orderBy: { calculatedAt: "asc" },
  });

  if (emissionsRecords.length < 2) {
    throw new Error(
      `Insufficient historical data for projection. Need at least 2 emissions records, found ${emissionsRecords.length}.`
    );
  }

  // Extract monthly emission values
  const historicalValues = emissionsRecords.map((r) => r.totalTCO2e);

  // 3. Fetch sector benchmark for confidence interval calibration
  let sectorBenchmarkValue = 0;
  try {
    const benchmark = await getSectorBenchmark(
      company.sector as SectorType,
      company.emissionTier as EmissionTier
    );
    sectorBenchmarkValue = benchmark.benchmarkEmissions;
  } catch {
    // If no benchmark, use historical variance for confidence intervals
  }

  // 4. Compute linear regression on historical data
  const { slope, intercept } = linearRegression(historicalValues);

  // Calculate historical variance for confidence intervals
  const stdDev = standardDeviation(historicalValues);
  // Use historical stdDev as base; if benchmark available, blend with
  // benchmark-relative margin for more informed confidence intervals
  const benchmarkMargin =
    sectorBenchmarkValue > 0 ? sectorBenchmarkValue * 0.1 : 0;
  const confidenceMargin = Math.max(stdDev, benchmarkMargin);

  // 5. Project 6 months forward
  const n = historicalValues.length;
  const baseDate = new Date();
  const projectionPeriodLabel = `${baseDate.getFullYear()}-H${baseDate.getMonth() < 6 ? "2" : "1"}`;

  const dataPoints: ProjectionDataPoint[] = [];
  let totalProjectedTCO2e = 0;

  for (let i = 0; i < 6; i++) {
    const projectedValue = Math.max(0, intercept + slope * (n + i));
    const margin =
      confidenceMargin > 0
        ? confidenceMargin * (1 + i * 0.1) // Widen confidence interval further out
        : projectedValue * 0.2; // Default 20% if no historical variance

    const upperBound = projectedValue + margin;
    const lowerBound = Math.max(0, projectedValue - margin);

    dataPoints.push({
      month: formatMonth(baseDate, i + 1),
      projectedTCO2e: Math.round(projectedValue * 100) / 100,
      upperBound: Math.round(upperBound * 100) / 100,
      lowerBound: Math.round(lowerBound * 100) / 100,
    });

    totalProjectedTCO2e += projectedValue;
  }

  totalProjectedTCO2e = Math.round(totalProjectedTCO2e * 100) / 100;

  // 6. Classify trend
  const trend = classifyTrend(
    dataPoints[0].projectedTCO2e,
    dataPoints[dataPoints.length - 1].projectedTCO2e
  );

  // Determine compliance status against CAL allocation
  const latestAllocation = await prisma.allocation.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  const calAllocation = latestAllocation?.allocatedAmount ?? 0;
  const complianceStatus = determineComplianceStatus(
    totalProjectedTCO2e,
    calAllocation
  );

  // Generate recommendations
  const recommendations = generateRecommendations(
    complianceStatus,
    trend,
    totalProjectedTCO2e,
    calAllocation
  );

  // 7. Build chart-ready data
  const chartData = {
    labels: dataPoints.map((dp) => dp.month),
    datasets: [
      {
        label: "Projected Emissions (tCO2e)",
        data: dataPoints.map((dp) => dp.projectedTCO2e),
      },
      {
        label: "Upper Bound",
        data: dataPoints.map((dp) => dp.upperBound),
      },
      {
        label: "Lower Bound",
        data: dataPoints.map((dp) => dp.lowerBound),
      },
    ],
  };

  const result: ProjectionResult = {
    companyId,
    projectionPeriod: projectionPeriodLabel,
    dataPoints,
    totalProjectedTCO2e,
    trend,
    complianceStatus,
    recommendations,
    chartData,
  };

  // 8. Submit HCS event to Projections topic
  const topicId = loadTopicId("Projections");
  if (topicId) {
    await submitMessage(topicId, {
      topic: "Projections",
      timestamp: new Date().toISOString(),
      eventType: "PROJECTION_GENERATED",
      payload: {
        companyId,
        companyDid: company.did ?? "",
        projectionPeriod: result.projectionPeriod,
        totalProjectedTCO2e: result.totalProjectedTCO2e,
      },
    });
  }

  // 9. Persist projection to DB
  // Compute aggregate confidence bounds
  const confidenceUpper = dataPoints.reduce(
    (sum, dp) => sum + dp.upperBound,
    0
  );
  const confidenceLower = dataPoints.reduce(
    (sum, dp) => sum + dp.lowerBound,
    0
  );

  await prisma.projection.create({
    data: {
      companyId,
      projectionPeriod: result.projectionPeriod,
      projectedEmissions: result.totalProjectedTCO2e,
      confidenceUpper: Math.round(confidenceUpper * 100) / 100,
      confidenceLower: Math.round(confidenceLower * 100) / 100,
      complianceStatus: result.complianceStatus,
      resultJson: JSON.stringify(result),
    },
  });

  return result;
}

/**
 * Retrieves all projection records for a company, ordered by most recent first.
 * Parses the stored resultJson back into ProjectionResult objects.
 *
 * Requirements: 7.7, 7.8
 */
export async function getProjections(
  companyId: string
): Promise<ProjectionResult[]> {
  const records = await prisma.projection.findMany({
    where: { companyId },
    orderBy: { generatedAt: "desc" },
  });

  return records.map((r) => JSON.parse(r.resultJson) as ProjectionResult);
}
