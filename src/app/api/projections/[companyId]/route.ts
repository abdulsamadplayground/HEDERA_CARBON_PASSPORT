/**
 * Projection API routes for the Corporate Carbon Compliance Platform.
 *
 * POST /api/projections/[companyId] — Generate a 6-month emissions projection
 * GET  /api/projections/[companyId] — Retrieve past projections
 *
 * Requirements: 7.7
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import {
  generateProjection,
  getProjections,
} from "@/services/projection-engine.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;

    const result = await generateProjection(companyId);

    return successResponse(result, 201);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Company not found")) {
        return errorResponse(error.message, 404, {
          code: "COMPANY_NOT_FOUND",
        });
      }
      if (error.message.includes("Insufficient historical data")) {
        return errorResponse(error.message, 400, {
          code: "INSUFFICIENT_DATA",
        });
      }
    }
    return handleApiError(error);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;

    const projections = await getProjections(companyId);

    return successResponse(projections);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
