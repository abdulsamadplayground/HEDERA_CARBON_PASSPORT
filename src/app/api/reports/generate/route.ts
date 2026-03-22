/**
 * POST /api/reports/generate — Generate a compliance audit report.
 *
 * Requirements: 8.7
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { generateReportSchema } from "@/lib/api/validation";
import { generateReport } from "@/services/audit.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateReportSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        `Validation error: ${parsed.error.errors.map((e) => e.message).join(", ")}`,
        400,
        { code: "VALIDATION_ERROR" }
      );
    }

    const { companyId, format } = parsed.data;
    const result = await generateReport(companyId, format);

    return successResponse(result, 201);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Company not found")) {
        return errorResponse(error.message, 404, { code: "COMPANY_NOT_FOUND" });
      }
    }
    return handleApiError(error);
  }
}
