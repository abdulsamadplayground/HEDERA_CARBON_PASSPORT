/**
 * GET /api/passports/[id] — Retrieve a Carbon Passport with stamps, claims, and score.
 *
 * Accepts the passport DB id (UUID string), not the serial number.
 *
 * Requirements: 4.6, 4.9
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { getPassportWithStampsAndClaims } from "@/services/passport.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const passport = await getPassportWithStampsAndClaims(id);
    return successResponse(passport);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return errorResponse(error.message, 404, { code: "NOT_FOUND" });
    }
    return handleApiError(error);
  }
}
