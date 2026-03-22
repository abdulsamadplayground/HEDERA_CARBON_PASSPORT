/**
 * GET /api/supply-chain/events/company/[companyId] — Query events by company.
 *
 * Requirements: 12.5
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { getEventsByCompany } from "@/services/supply-chain-event.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const events = await getEventsByCompany(companyId);
    return successResponse(events);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
