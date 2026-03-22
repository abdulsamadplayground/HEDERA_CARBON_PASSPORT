/**
 * POST /api/state/reconstruct — Trigger manual state reconstruction.
 *
 * Requirements: 17.7
 */

import { successResponse, handleApiError } from "@/lib/api";
import { reconstructState } from "@/services/state-reconstruction.service";

export async function POST() {
  try {
    const result = await reconstructState();
    return successResponse(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
