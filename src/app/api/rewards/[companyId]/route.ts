/**
 * GET /api/rewards/[companyId] — View earned rewards.
 *
 * Requirements: 11.5
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { getEarnedRewards } from "@/services/reward.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const rewards = await getEarnedRewards(companyId);
    return successResponse(rewards);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
