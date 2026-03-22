/**
 * POST /api/marketplace/listings — Create a CCR listing.
 * GET  /api/marketplace/listings — Browse listings with optional filters.
 *
 * Requirements: 6.7
 */

import { NextRequest } from "next/server";
import { createListingSchema } from "@/lib/api/validation";
import { successResponse, handleApiError } from "@/lib/api";
import { createListing, getListings } from "@/services/marketplace.service";
import type { MarketType, ListingStatus } from "@/services/marketplace.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createListingSchema.parse(body);
    const listing = await createListing(input);
    return successResponse(listing, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const marketType = request.nextUrl.searchParams.get("marketType") as MarketType | null;
    const status = request.nextUrl.searchParams.get("status") as ListingStatus | null;

    const filters: { marketType?: MarketType; status?: ListingStatus } = {};
    if (marketType) filters.marketType = marketType;
    if (status) filters.status = status;

    const listings = await getListings(Object.keys(filters).length > 0 ? filters : undefined);
    return successResponse(listings);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
