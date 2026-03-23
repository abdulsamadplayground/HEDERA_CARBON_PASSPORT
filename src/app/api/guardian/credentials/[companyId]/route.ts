/**
 * GET /api/guardian/credentials/[companyId] — Retrieve all Guardian submissions for a company.
 *
 * Requirements: 10.6
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
    const submissions = await prisma.guardianSubmission.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    // Normalize dates for JSON serialization (local-db stores as strings)
    const normalized = submissions.map((s) => ({
      ...s,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
      updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
      issuedAt: s.issuedAt instanceof Date ? s.issuedAt.toISOString() : s.issuedAt ? String(s.issuedAt) : null,
    }));
    return successResponse(normalized);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
