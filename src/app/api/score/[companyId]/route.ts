/**
 * GET /api/score/[companyId] — Get company carbon score with emissions and benchmark.
 *
 * Requirements: 16.6
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { getCompanyScore } from "@/services/carbon-score.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const score = await getCompanyScore(companyId);
    return successResponse(score);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
