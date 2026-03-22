/**
 * GET /api/supply-chain/events/[passportSerial] — Query events by passport.
 *
 * Requirements: 12.5
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { getEventsByPassport } from "@/services/supply-chain-event.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ passportSerial: string }> }
) {
  try {
    const { passportSerial } = await params;
    const serial = parseInt(passportSerial, 10);
    if (isNaN(serial)) {
      const { errorResponse } = await import("@/lib/api");
      return errorResponse("Invalid passport serial", 400, { code: "VALIDATION_ERROR" });
    }
    const events = await getEventsByPassport(serial);
    return successResponse(events);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
