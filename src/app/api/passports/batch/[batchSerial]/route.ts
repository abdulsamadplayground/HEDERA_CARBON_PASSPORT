/**
 * GET /api/passports/batch/[batchSerial] — Get batch with associated items.
 *
 * Requirements: 18.6
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { getBatchWithItems } from "@/services/passport.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchSerial: string }> }
) {
  try {
    const { batchSerial } = await params;
    const serial = parseInt(batchSerial, 10);
    if (isNaN(serial)) {
      return errorResponse("Invalid batch serial", 400, { code: "VALIDATION_ERROR" });
    }
    const result = await getBatchWithItems(serial);
    return successResponse(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return errorResponse(error.message, 404, { code: "NOT_FOUND" });
    }
    return handleApiError(error);
  }
}
