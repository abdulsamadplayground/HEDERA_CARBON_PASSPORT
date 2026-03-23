/**
 * GET /api/guardian/status — Check Guardian connectivity and policy status.
 */

import { successResponse, handleApiError } from "@/lib/api";
import { getGuardianStatus } from "@/services/guardian.service";

export async function GET() {
  try {
    const status = await getGuardianStatus();
    return successResponse(status);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
