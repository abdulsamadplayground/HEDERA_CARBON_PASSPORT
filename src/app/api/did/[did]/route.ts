/**
 * GET /api/did/[did] — Resolve DID to DID document.
 *
 * Requirements: 14.7, 14.8
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { resolveDID } from "@/services/did.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ did: string }> }
) {
  try {
    const { did } = await params;
    const decodedDid = decodeURIComponent(did);
    const document = await resolveDID(decodedDid);

    if (!document) {
      return errorResponse(
        `DID not found: ${decodedDid}`,
        404,
        { code: "DID_NOT_FOUND" }
      );
    }

    return successResponse(document);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
