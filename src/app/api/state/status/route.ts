/**
 * GET /api/state/status — Check reconstruction status and checkpoints.
 *
 * Requirements: 17.7
 */

import { successResponse, handleApiError } from "@/lib/api";
import {
  getReconstructionStatus,
  getCheckpoints,
} from "@/services/state-reconstruction.service";

export async function GET() {
  try {
    const [status, checkpoints] = await Promise.all([
      getReconstructionStatus(),
      getCheckpoints(),
    ]);
    return successResponse({ ...status, checkpoints });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
