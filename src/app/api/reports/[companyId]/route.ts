/**
 * GET /api/reports/[companyId] — Retrieve audit report metadata.
 *
 * Requirements: 8.7
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { getReportMetadata } from "@/services/audit.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const reports = await getReportMetadata(companyId);
    return successResponse(reports);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
