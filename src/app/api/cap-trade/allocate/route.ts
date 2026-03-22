/**
 * POST /api/cap-trade/allocate — Trigger CAL token allocation for a company.
 *
 * Requirements: 5.7
 */

import { NextRequest } from "next/server";
import { allocateAllowancesSchema } from "@/lib/api/validation";
import { successResponse, handleApiError } from "@/lib/api";
import { allocateAllowances } from "@/services/cap-trade.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = allocateAllowancesSchema.parse(body);
    const result = await allocateAllowances(input);
    return successResponse(result, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
