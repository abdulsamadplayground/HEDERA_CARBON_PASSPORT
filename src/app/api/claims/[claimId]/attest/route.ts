/**
 * POST /api/claims/[claimId]/attest — Verifier attestation of a claim.
 *
 * Requirements: 15.8
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { attestClaimSchema } from "@/lib/api/validation";
import { attestClaim } from "@/services/claims.service";
import { checkAndDistributeRewards } from "@/services/reward.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const { claimId } = await params;
    const body = await request.json();
    const validated = attestClaimSchema.parse(body);

    const result = await attestClaim({
      claimId,
      verifierId: validated.verifierId,
      credentialHash: validated.credentialHash,
      expiryDate: validated.expiryDate,
    });

    // Check and distribute milestone rewards (FIRST_CLAIM)
    if (result.companyId) {
      await checkAndDistributeRewards(result.companyId);
    }

    return successResponse(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return errorResponse(error.message, 404, { code: "NOT_FOUND" });
    }
    if (error instanceof Error && error.message.includes("not pending")) {
      return errorResponse(error.message, 409, { code: "CONFLICT" });
    }
    return handleApiError(error);
  }
}
