/**
 * GET /api/claims/[companyId] — Get claims by company.
 *
 * Requirements: 15.8
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { getClaimsByCompany } from "@/services/claims.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const claims = await getClaimsByCompany(companyId);
    return successResponse(claims);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
