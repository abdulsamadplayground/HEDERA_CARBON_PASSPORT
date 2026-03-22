/**
 * GET /api/guardian/status/[submissionId] — Check verification status.
 *
 * Requirements: 10.6
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { getVerificationStatus } from "@/services/guardian.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const result = await getVerificationStatus(submissionId);
    return successResponse(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return errorResponse(error.message, 404, { code: "NOT_FOUND" });
    }
    return handleApiError(error);
  }
}
