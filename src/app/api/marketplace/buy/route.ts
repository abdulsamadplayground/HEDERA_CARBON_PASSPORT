/**
 * POST /api/marketplace/buy — Execute a CCR credit purchase.
 *
 * Requirements: 6.7
 */

import { NextRequest } from "next/server";
import { purchaseCreditsSchema } from "@/lib/api/validation";
import { successResponse, handleApiError } from "@/lib/api";
import { purchaseCredits } from "@/services/marketplace.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = purchaseCreditsSchema.parse(body);
    const transaction = await purchaseCredits(input);
    return successResponse(transaction, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
