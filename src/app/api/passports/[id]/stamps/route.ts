/**
 * POST /api/passports/[id]/stamps — Issue a CSTAMP (Compliance Stamp) for a passport.
 *
 * Requirements: 4.4, 4.9
 */

import { NextRequest } from "next/server";
import { issueStampSchema } from "@/lib/api/validation";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { issueStamp } from "@/services/passport.service";
import { checkAndDistributeRewards } from "@/services/reward.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = issueStampSchema.parse(body);
    const result = await issueStamp(id, input);

    // Check and distribute milestone rewards (FIRST_STAMP)
    if (result.companyId) {
      await checkAndDistributeRewards(result.companyId);
    }

    return successResponse(result, 201);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return errorResponse(error.message, 404, { code: "NOT_FOUND" });
    }
    return handleApiError(error);
  }
}
