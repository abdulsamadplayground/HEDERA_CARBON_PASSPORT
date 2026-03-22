/**
 * GET /api/did/entities/[entityType] — List DIDs by entity type.
 *
 * Requirements: 14.7, 14.8
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api";
import { listDIDsByEntityType, type EntityType } from "@/services/did.service";

const VALID_ENTITY_TYPES: EntityType[] = ["COMPANY", "REGULATOR", "VERIFIER"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
) {
  try {
    const { entityType } = await params;
    const upper = entityType.toUpperCase() as EntityType;

    if (!VALID_ENTITY_TYPES.includes(upper)) {
      return errorResponse(
        `Invalid entity type: ${entityType}. Valid: ${VALID_ENTITY_TYPES.join(", ")}`,
        400,
        { code: "VALIDATION_ERROR" }
      );
    }

    const dids = await listDIDsByEntityType(upper);
    return successResponse(dids);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
