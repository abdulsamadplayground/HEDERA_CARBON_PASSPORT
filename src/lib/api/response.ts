import { NextResponse } from "next/server";

/**
 * Standardized API response helpers for the Carbon Passport Platform.
 * All API routes use these to return consistent JSON shapes.
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    hederaResponseCode?: number;
  };
}

/**
 * Return a successful JSON response.
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Return an error JSON response with optional Hedera response code.
 */
export function errorResponse(
  message: string,
  status = 500,
  opts?: { code?: string; hederaResponseCode?: number }
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        ...(opts?.code && { code: opts.code }),
        ...(opts?.hederaResponseCode !== undefined && {
          hederaResponseCode: opts.hederaResponseCode,
        }),
      },
    },
    { status }
  );
}
