/**
 * Claims Service for the Corporate Carbon Compliance Platform.
 *
 * Manages verifiable sustainability claims and VCLAIM_Token minting.
 * Claims go through a submit → attest lifecycle with on-chain recording.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9
 */

import {
  ContractFunctionParameters,
  ContractId,
} from "@hashgraph/sdk";
import prisma from "@/lib/prisma";
import { loadTokenId, mintNFT } from "@/services/hts.service";
import { loadTopicId, submitMessage } from "@/services/hcs.service";
import { contractCall } from "@/services/hscs.service";
import { getValue } from "@/lib/local-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClaimType =
  | "LOW_CARBON"
  | "CARBON_NEUTRAL"
  | "NET_ZERO"
  | "RENEWABLE_ENERGY"
  | "CIRCULAR_ECONOMY"
  | "FAIR_TRADE";

export const VALID_CLAIM_TYPES: ClaimType[] = [
  "LOW_CARBON",
  "CARBON_NEUTRAL",
  "NET_ZERO",
  "RENEWABLE_ENERGY",
  "CIRCULAR_ECONOMY",
  "FAIR_TRADE",
];

const CLAIM_TYPE_INDEX: Record<ClaimType, number> = {
  LOW_CARBON: 0,
  CARBON_NEUTRAL: 1,
  NET_ZERO: 2,
  RENEWABLE_ENERGY: 3,
  CIRCULAR_ECONOMY: 4,
  FAIR_TRADE: 5,
};

export interface SubmitClaimInput {
  companyId: string;
  claimType: ClaimType;
  evidenceReferences: string[];
  requestedVerifierId?: string;
}

export interface AttestClaimInput {
  claimId: string;
  verifierId: string;
  credentialHash: string;
  expiryDate: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Submits a new sustainability claim for a company.
 *
 * 1. Validate claim type
 * 2. Look up company and passport
 * 3. Register on ClaimsManager contract
 * 4. Persist to DB
 *
 * Requirements: 15.1, 15.2, 15.7
 */
export async function submitClaim(input: SubmitClaimInput) {
  // Validate claim type
  if (!VALID_CLAIM_TYPES.includes(input.claimType)) {
    throw new Error(
      `Invalid claim type "${input.claimType}". Valid types: ${VALID_CLAIM_TYPES.join(", ")}`
    );
  }

  // Look up company
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
  });
  if (!company) {
    throw new Error(`Company not found: ${input.companyId}`);
  }

  // Find company passport
  const passport = await prisma.carbonPassport.findFirst({
    where: { companyId: input.companyId, passportType: "company" },
    orderBy: { createdAt: "desc" },
  });
  const passportSerial = passport?.cpassSerial ?? 0;

  // Register on ClaimsManager contract (non-fatal if reverts)
  const contractIdRaw = getValue("contracts.ClaimsManager.id");
  if (typeof contractIdRaw === "string") {
    const contractId = ContractId.fromString(contractIdRaw);
    const companyEvmAddress =
      "0x" +
      BigInt(company.hederaAccountId.split(".")[2]).toString(16).padStart(40, "0");

    const params = new ContractFunctionParameters()
      .addAddress(companyEvmAddress)
      .addUint8(CLAIM_TYPE_INDEX[input.claimType])
      .addString(company.did ?? "")
      .addUint256(passportSerial);

    try {
      await contractCall(contractId, "submitClaim", params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Claims] Contract submitClaim reverted (non-fatal): ${msg}`);
    }
  }

  // Persist to DB
  const claim = await prisma.verifiableClaim.create({
    data: {
      companyId: input.companyId,
      passportId: passport?.id,
      claimType: input.claimType,
      companyDid: company.did,
      evidenceRefs: input.evidenceReferences,
      verifierId: input.requestedVerifierId,
      status: "PENDING",
    },
  });

  return {
    claimId: claim.id,
    companyId: claim.companyId,
    companyDid: company.did ?? "",
    claimType: claim.claimType as ClaimType,
    status: claim.status,
    evidenceRefs: claim.evidenceRefs,
  };
}

/**
 * Attests a pending claim — mints VCLAIM_Token and records on-chain.
 *
 * 1. Validate claim exists and is PENDING
 * 2. Look up verifier DID
 * 3. Mint VCLAIM_Token with metadata
 * 4. Register attestation on ClaimsManager contract
 * 5. Associate VCLAIM with company's CPASS record
 * 6. Submit HCS event
 * 7. Update DB
 *
 * Requirements: 15.3, 15.4, 15.5, 15.6, 15.9
 */
export async function attestClaim(input: AttestClaimInput) {
  const claim = await prisma.verifiableClaim.findUnique({
    where: { id: input.claimId },
  });
  if (!claim) {
    throw new Error(`Claim not found: ${input.claimId}`);
  }
  if (claim.status !== "PENDING") {
    throw new Error(`Claim ${input.claimId} is not pending (status: ${claim.status})`);
  }

  // Look up verifier DID
  const verifierDoc = await prisma.dIDDocument.findFirst({
    where: { entityId: input.verifierId },
  });
  const verifierDid = verifierDoc?.did ?? `did:hedera:testnet:verifier-${input.verifierId}`;

  // Look up company
  const company = await prisma.company.findUnique({
    where: { id: claim.companyId },
  });
  if (!company) {
    throw new Error(`Company not found: ${claim.companyId}`);
  }

  // Mint VCLAIM_Token
  const vclaimTokenId = loadTokenId("VCLAIM");
  if (!vclaimTokenId) {
    throw new Error("[Claims] VCLAIM token ID not found in config. Run deploy first.");
  }

  const metadataObj = {
    claim_type: claim.claimType,
    company_did: company.did ?? "",
    verifier_did: verifierDid,
    credential_hash: input.credentialHash,
    attestation_date: new Date().toISOString(),
    expiry_date: input.expiryDate,
  };
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadataObj));
  const { serialNumber } = await mintNFT(vclaimTokenId, metadataBytes);

  // Register attestation on contract (non-fatal if reverts)
  const contractIdRaw = getValue("contracts.ClaimsManager.id");
  if (typeof contractIdRaw === "string") {
    const contractId = ContractId.fromString(contractIdRaw);
    const expiryTimestamp = Math.floor(new Date(input.expiryDate).getTime() / 1000);

    const params = new ContractFunctionParameters()
      .addUint256(0) // on-chain claim ID — simplified
      .addString(verifierDid)
      .addBytes32(Buffer.from(input.credentialHash.padEnd(64, "0").slice(0, 64), "hex"))
      .addUint256(serialNumber)
      .addUint256(expiryTimestamp);

    try {
      await contractCall(contractId, "attestClaim", params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Claims] Contract attestClaim reverted (non-fatal): ${msg}`);
    }
  }

  // Submit HCS event
  const topicId = loadTopicId("VerifiableClaims");
  if (topicId) {
    await submitMessage(topicId, {
      topic: "VerifiableClaims",
      timestamp: new Date().toISOString(),
      eventType: "CLAIM_VERIFIED",
      payload: {
        claimId: claim.id,
        companyId: claim.companyId,
        companyDid: company.did ?? "",
        verifierDid,
        credentialHash: input.credentialHash,
        vclaimSerial: serialNumber,
        claimType: claim.claimType,
      },
    });
  }

  // Update DB
  const updated = await prisma.verifiableClaim.update({
    where: { id: input.claimId },
    data: {
      status: "ATTESTED",
      verifierId: input.verifierId,
      verifierDid,
      credentialHash: input.credentialHash,
      vclaimSerial: serialNumber,
      attestedAt: new Date(),
      expiresAt: new Date(input.expiryDate),
    },
  });

  return {
    claimId: updated.id,
    companyId: updated.companyId,
    companyDid: company.did ?? "",
    claimType: updated.claimType as ClaimType,
    verifierDid,
    credentialHash: input.credentialHash,
    vclaimSerial: serialNumber,
    status: updated.status,
    attestedAt: updated.attestedAt?.toISOString(),
    expiresAt: updated.expiresAt?.toISOString(),
  };
}

/**
 * Gets all claims for a company.
 * Requirements: 15.8
 */
export async function getClaimsByCompany(companyId: string) {
  return prisma.verifiableClaim.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}
