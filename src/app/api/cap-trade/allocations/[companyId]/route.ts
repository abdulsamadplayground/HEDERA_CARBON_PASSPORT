/**
 * GET /api/cap-trade/allocations/[companyId] — View allocation records.
 *
 * Requirements: 5.7
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { getAllocations } from "@/services/cap-trade.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const allocations = await getAllocations(companyId);
    return successResponse(allocations);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
