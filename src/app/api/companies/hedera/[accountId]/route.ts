/**
 * GET /api/companies/hedera/[accountId] — Look up company by Hedera Account ID.
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { getCompanyByHederaId } from "@/services/company.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const company = await getCompanyByHederaId(accountId);
    if (!company) {
      return errorResponse("No company found for Hedera Account ID: " + accountId, 404, { code: "NOT_FOUND" });
    }
    return successResponse(company);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
