/**
 * GET /api/rewards/milestones/[companyId] — Check milestone progress.
 *
 * Requirements: 11.5
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { getMilestoneProgress } from "@/services/reward.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const progress = await getMilestoneProgress(companyId);
    return successResponse(progress);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
