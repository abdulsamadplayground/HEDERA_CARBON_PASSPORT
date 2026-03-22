/**
 * GET  /api/passports — List passports, optionally filtered by companyId.
 * POST /api/passports — Mint a new Carbon Passport (CPASS).
 *
 * Requirements: 4.1, 4.9
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, handleApiError } from "@/lib/api";
import { mintPassport } from "@/services/passport.service";
import prisma from "@/lib/prisma";

const mintPassportSchema = z.object({
  companyId: z.string().uuid(),
  emissionTier: z.enum(["Tier_1", "Tier_2", "Tier_3"]),
  baselineEmissions: z.number().nonnegative(),
  passportType: z.enum(["company", "batch", "item"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId");
    const where = companyId ? { companyId } : {};
    const passports = await prisma.carbonPassport.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return successResponse(passports);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = mintPassportSchema.parse(body);
    const result = await mintPassport(input);
    return successResponse(result, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
