/**
 * GET /api/score/benchmarks — Get all sector benchmarks.
 *
 * Requirements: 16.6
 */

import { successResponse, handleApiError } from "@/lib/api";
import { getSectorBenchmarks } from "@/services/carbon-score.service";

export async function GET() {
  try {
    const benchmarks = await getSectorBenchmarks();
    return successResponse(benchmarks);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
