/**
 * POST /api/supply-chain/events — Submit a supply chain event.
 *
 * Requirements: 12.5
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import { submitSupplyChainEventSchema } from "@/lib/api/validation";
import { submitEvent } from "@/services/supply-chain-event.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = submitSupplyChainEventSchema.parse(body);

    const result = await submitEvent({
      eventType: validated.eventType,
      companyId: validated.companyId,
      passportSerial: validated.passportSerial,
      location: validated.location,
      payload: validated.payload,
    });

    return successResponse(result, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
