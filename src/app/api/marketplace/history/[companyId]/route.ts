/**
 * GET /api/marketplace/history/[companyId] — Transaction history for a company.
 *
 * Requirements: 6.7
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { getTransactionHistory } from "@/services/marketplace.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const history = await getTransactionHistory(companyId);
    return successResponse(history);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
