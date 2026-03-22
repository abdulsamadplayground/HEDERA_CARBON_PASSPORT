import { ContractId } from "@hashgraph/sdk";
import { NextResponse } from "next/server";
import { getValue } from "@/lib/local-store";
import { errorResponse } from "./response";

/**
 * Loads a contract ID from the local store and returns a parsed ContractId.
 * Returns an HTTP 503 NextResponse if the contract is not deployed or the ID is invalid.
 */
export function requireContractId(contractName: string): ContractId | NextResponse {
  const contractIdStr = getValue(`contracts.${contractName}.id`) as string;
  if (!contractIdStr) {
    return errorResponse(
      `${contractName} contract is not deployed. Run the deploy script first.`,
      503,
      { code: "CONTRACT_NOT_DEPLOYED" }
    );
  }
  try {
    return ContractId.fromString(contractIdStr);
  } catch {
    return errorResponse(
      `${contractName} contract ID is invalid: ${contractIdStr}`,
      503,
      { code: "CONTRACT_NOT_DEPLOYED" }
    );
  }
}
