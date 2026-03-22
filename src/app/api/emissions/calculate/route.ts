/**
 * POST /api/emissions/calculate — Submit emissions data, persist result,
 * submit HCS event, and trigger carbon score recalculation.
 *
 * Requirements: 2.6, 2.8
 */

import { NextRequest } from "next/server";
import { calculateEmissionsSchema } from "@/lib/api/validation";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import {
  calculateEmissions,
  EmissionsValidationError,
} from "@/services/emissions-engine.service";
import { recalculateCompanyScore } from "@/services/carbon-score.service";
import { checkAndDistributeRewards } from "@/services/reward.service";
import { evaluateAlignment } from "@/services/policy-framework.service";
import { loadTopicId, submitMessage } from "@/services/hcs.service";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = calculateEmissionsSchema.parse(body);

    // Look up company to get sector and DID
    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
    });

    if (!company) {
      return errorResponse("Company not found", 404, {
        code: "COMPANY_NOT_FOUND",
      });
    }

    // Calculate emissions (pure function — sector comes from company profile)
    const result = calculateEmissions({
      ...input,
      sector: company.sector as Parameters<typeof calculateEmissions>[0]["sector"],
    });

    // Persist to EmissionsRecord table
    const scope1 = result.scopes.find((s) => s.scope === 1);
    const scope2 = result.scopes.find((s) => s.scope === 2);
    const scope3 = result.scopes.find((s) => s.scope === 3);

    await prisma.emissionsRecord.create({
      data: {
        companyId: input.companyId,
        reportingPeriod: input.reportingPeriod,
        totalTCO2e: result.totalTCO2e,
        scope1TCO2e: scope1?.totalTCO2e ?? 0,
        scope2TCO2e: scope2?.totalTCO2e ?? 0,
        scope3TCO2e: scope3?.totalTCO2e ?? 0,
        breakdownJson: JSON.stringify(result.scopes),
        standardsReference: JSON.stringify(result.standardsReference),
      },
    });

    // Submit HCS event to EmissionsCalculation topic
    let hcsTransactionId: string | undefined;
    const topicId = loadTopicId("EmissionsCalculation");
    if (topicId) {
      const txId = await submitMessage(topicId, {
        timestamp: new Date().toISOString(),
        eventType: "EMISSIONS_CALCULATED",
        payload: {
          companyId: input.companyId,
          companyDid: company.did ?? "",
          reportingPeriod: input.reportingPeriod,
          totalTCO2e: result.totalTCO2e,
        },
      });
      hcsTransactionId = txId.toString();
    }

    // Trigger carbon score recalculation
    await recalculateCompanyScore(input.companyId);

    // Check and distribute milestone rewards (FIRST_REPORT, REPORTING_STREAK)
    await checkAndDistributeRewards(input.companyId);

    // Re-evaluate policy framework alignment
    await evaluateAlignment(input.companyId);

    return successResponse({ ...result, transactionId: hcsTransactionId }, 201);
  } catch (error: unknown) {
    if (error instanceof EmissionsValidationError) {
      return errorResponse(error.message, 400, {
        code: "VALIDATION_ERROR",
      });
    }
    return handleApiError(error);
  }
}
