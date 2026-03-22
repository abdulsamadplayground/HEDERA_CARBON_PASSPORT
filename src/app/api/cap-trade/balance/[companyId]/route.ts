/**
 * GET /api/cap-trade/balance/[companyId] — Check surplus/deficit for a compliance period.
 *
 * Requirements: 5.7
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { getBalance } from "@/services/cap-trade.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const period = request.nextUrl.searchParams.get("period");

    if (!period) {
      return errorResponse("Missing required query parameter: period", 400, {
        code: "MISSING_PARAMETER",
      });
    }

    const balance = await getBalance(companyId, period);
    return successResponse(balance);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
