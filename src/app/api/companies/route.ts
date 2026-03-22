/**
 * GET  /api/companies — List all companies.
 * POST /api/companies — Register a new company.
 *
 * Requirements: 1.1, 1.7
 */

import { NextRequest } from "next/server";
import { registerCompanySchema } from "@/lib/api/validation";
import { successResponse, handleApiError } from "@/lib/api";
import { registerCompany } from "@/services/company.service";
import { extractWalletCredentials } from "@/lib/api/wallet-headers";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
    });
    return successResponse(companies);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = registerCompanySchema.parse(body);
    const wallet = extractWalletCredentials(request);
    const company = await registerCompany({
      ...input,
      callerEvmAddress: wallet.evmAddress || undefined,
    });
    return successResponse(company, 201);
  } catch (error: unknown) {
    // Duplicate account → 409
    if (
      error instanceof Error &&
      error.message.includes("is already registered")
    ) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
