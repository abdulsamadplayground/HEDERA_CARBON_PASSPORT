/**
 * POST /api/passports/batch/[batchSerial]/items — Create item passport within batch.
 *
 * Requirements: 18.6
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { mintItemPassportSchema } from "@/lib/api/validation";
import { mintItemPassport } from "@/services/passport.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchSerial: string }> }
) {
  try {
    const { batchSerial } = await params;
    const serial = parseInt(batchSerial, 10);
    if (isNaN(serial)) {
      return errorResponse("Invalid batch serial", 400, { code: "VALIDATION_ERROR" });
    }

    const body = await request.json();
    const validated = mintItemPassportSchema.parse(body);

    const result = await mintItemPassport({
      companyId: validated.companyId,
      batchSerial: serial,
      itemId: validated.itemId,
      itemDescription: validated.itemDescription,
      proportionFactor: validated.proportionFactor,
    });

    return successResponse(result, 201);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return errorResponse(error.message, 404, { code: "NOT_FOUND" });
    }
    return handleApiError(error);
  }
}
