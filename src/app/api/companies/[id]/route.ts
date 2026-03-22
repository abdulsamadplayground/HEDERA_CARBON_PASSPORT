/**
 * GET  /api/companies/[id] — Get company profile with DID and score.
 * PUT  /api/companies/[id] — Update company profile (recalculates tier + score).
 *
 * Requirements: 1.7
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { getCompany, updateCompany } from "@/services/company.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const company = await getCompany(id);
    if (!company) {
      return errorResponse("Company not found", 404, { code: "NOT_FOUND" });
    }
    return successResponse(company);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const company = await updateCompany(id, body);
    return successResponse(company);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return errorResponse(error.message, 404, { code: "NOT_FOUND" });
    }
    return handleApiError(error);
  }
}
