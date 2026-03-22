/**
 * GET /api/standards — Get standards registry (GHG Protocol, ISO 14067, ISO 14040).
 *
 * Requirements: 13.6
 */

import { successResponse, handleApiError } from "@/lib/api";
import { getStandardsRegistry } from "@/services/standards-registry.service";

export async function GET() {
  try {
    const standards = await getStandardsRegistry();
    return successResponse(standards);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
