import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { errorResponse } from "./response";

/**
 * Centralized error handler for API routes.
 *
 * - ZodError → HTTP 400 with validation details
 * - ContractError (Hedera) → HTTP 500 with response code
 * - Unknown → HTTP 500 generic
 */

/**
 * Custom error class for smart contract / Hedera failures.
 */
export class ContractError extends Error {
  public readonly hederaResponseCode?: number;
  public readonly transactionId?: string;

  constructor(
    message: string,
    opts?: { hederaResponseCode?: number; transactionId?: string }
  ) {
    super(message);
    this.name = "ContractError";
    this.hederaResponseCode = opts?.hederaResponseCode;
    this.transactionId = opts?.transactionId;
  }
}

/**
 * Handle any thrown error and return the appropriate NextResponse.
 * All errors are logged to the console for debugging.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const messages = error.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    console.error("[API] Validation error:", messages.join("; "));
    return errorResponse(messages.join("; "), 400, { code: "VALIDATION_ERROR" });
  }

  if (error instanceof ContractError) {
    console.error(
      `[API] Contract error: ${error.message}`,
      error.hederaResponseCode ? `(Hedera code: ${error.hederaResponseCode})` : "",
      error.transactionId ? `txId: ${error.transactionId}` : ""
    );
    return errorResponse(error.message, 500, {
      code: "CONTRACT_ERROR",
      hederaResponseCode: error.hederaResponseCode,
    });
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  console.error("[API] Internal error:", error);
  return errorResponse(message, 500, { code: "INTERNAL_ERROR" });
}
