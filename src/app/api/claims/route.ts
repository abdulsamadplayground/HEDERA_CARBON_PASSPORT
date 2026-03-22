/**
 * POST /api/claims — Submit a sustainability claim.
 *
 * Requirements: 15.8
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { submitClaimSchema } from "@/lib/api/validation";
import { submitClaim } from "@/services/claims.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = submitClaimSchema.parse(body);

    const result = await submitClaim({
      companyId: validated.companyId,
      claimType: validated.claimType,
      evidenceReferences: validated.evidenceReferences,
      requestedVerifierId: validated.requestedVerifierId,
    });

    return successResponse(result, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
