/**
 * GET /api/emissions/[companyId] — Get historical emissions calculations.
 *
 * Requirements: 2.8
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;

    const records = await prisma.emissionsRecord.findMany({
      where: { companyId },
      orderBy: { calculatedAt: "desc" },
    });

    return successResponse(records);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
