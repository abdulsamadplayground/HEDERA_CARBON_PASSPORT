/**
 * GET  /api/policy/[companyId] — Get framework alignment status.
 * PUT  /api/policy/[companyId] — Update selected frameworks and re-evaluate.
 *
 * Requirements: 9.6
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, handleApiError } from "@/lib/api";
import {
  evaluateAlignment,
  getAlignment,
  updateSelectedFrameworks,
} from "@/services/policy-framework.service";

const updateFrameworksSchema = z.object({
  frameworks: z.array(
    z.enum([
      "PARIS_AGREEMENT",
      "EU_ETS",
      "CBAM",
      "CORSIA",
      "VERRA",
      "GOLD_STANDARD",
    ])
  ),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const alignments = await getAlignment(companyId);
    return successResponse(alignments);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const body = await request.json();
    const validated = updateFrameworksSchema.parse(body);

    await updateSelectedFrameworks(companyId, validated.frameworks);
    const alignments = await evaluateAlignment(companyId);
    return successResponse(alignments);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      const { errorResponse } = await import("@/lib/api");
      return errorResponse(error.message, 404, { code: "NOT_FOUND" });
    }
    return handleApiError(error);
  }
}
