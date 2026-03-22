/**
 * POST /api/guardian/verify — Submit LCA data for Guardian MRV verification.
 *
 * Requirements: 10.6
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { guardianVerifySchema } from "@/lib/api/validation";
import { submitForVerification } from "@/services/guardian.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = guardianVerifySchema.parse(body);

    const result = await submitForVerification({
      companyId: validated.companyId,
      companyDid: validated.companyDid,
      productOrBatchId: validated.productOrBatchId,
      lifecycleStages: validated.lifecycleStages,
      emissionFactors: validated.emissionFactors,
      methodologyReference: validated.methodologyReference,
      calculationData: validated.calculationData,
    });

    const status = result.status === "REJECTED" ? 422 : 200;
    return successResponse(result, status);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
