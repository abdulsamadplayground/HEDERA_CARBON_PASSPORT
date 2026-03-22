/**
 * POST /api/passports/batch — Create a batch passport.
 *
 * Requirements: 18.6
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { mintBatchPassportSchema } from "@/lib/api/validation";
import { mintBatchPassport } from "@/services/passport.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = mintBatchPassportSchema.parse(body);

    const result = await mintBatchPassport({
      companyId: validated.companyId,
      batchId: validated.batchId,
      batchDescription: validated.batchDescription,
      carbonFootprintTotal: validated.carbonFootprintTotal,
    });

    return successResponse(result, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
