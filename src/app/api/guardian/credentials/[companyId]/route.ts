/**
 * GET /api/guardian/credentials/[companyId] — Retrieve issued credentials.
 *
 * Requirements: 10.6
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { getCredentials } from "@/services/guardian.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const credentials = await getCredentials(companyId);
    return successResponse(credentials);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
