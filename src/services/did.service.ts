/**
 * Decentralized Identity (DID) Service for the Corporate Carbon Compliance Platform.
 *
 * Manages Hedera DID method identifiers: generation, document building,
 * on-chain registration via DIDRegistry contract, HFS storage, and resolution.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { createHash } from "crypto";
import { ContractFunctionParameters, ContractId, FileId } from "@hashgraph/sdk";
import { uploadFile, getFileContents } from "@/services/hfs.service";
import { contractCall } from "@/services/hscs.service";
import { loadTopicId, submitMessage } from "@/services/hcs.service";
import { getValue } from "@/lib/local-store";
import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EntityType = "COMPANY" | "REGULATOR" | "VERIFIER";

export interface DIDDocumentData {
  id: string; // did:hedera:testnet:...
  publicKey: string;
  authentication: string;
  serviceEndpoints: { type: string; endpoint: string }[];
}

export interface DIDRegistrationResult {
  did: string;
  hfsFileId: string;
  entityType: EntityType;
  transactionId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Loads the DIDRegistry contract ID from the local config store.
 */
function loadDIDRegistryContractId(): ContractId {
  const raw = getValue("contracts.DIDRegistry.id");
  if (typeof raw !== "string") {
    throw new Error(
      "[DID] DIDRegistry contract ID not found in config. Run deploy first."
    );
  }
  return ContractId.fromString(raw);
}

/**
 * Maps EntityType string to the Solidity enum uint8 value.
 * DIDRegistry.sol: COMPANY=0, REGULATOR=1, VERIFIER=2
 */
function entityTypeToUint8(entityType: EntityType): number {
  const map: Record<EntityType, number> = {
    COMPANY: 0,
    REGULATOR: 1,
    VERIFIER: 2,
  };
  return map[entityType];
}

// ---------------------------------------------------------------------------
// Core DID functions
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic DID string from a Hedera account ID.
 * Format: did:hedera:testnet:{sha256-of-accountId}
 *
 * Requirements: 14.1, 14.2
 */
export function generateDID(hederaAccountId: string): string {
  const hash = createHash("sha256")
    .update(hederaAccountId)
    .digest("hex");
  return `did:hedera:testnet:${hash}`;
}

/**
 * Builds a W3C-style DID document for the given DID and public key.
 *
 * Requirements: 14.2
 */
export function buildDIDDocument(
  did: string,
  publicKey: string
): DIDDocumentData {
  return {
    id: did,
    publicKey,
    authentication: `${did}#key-1`,
    serviceEndpoints: [
      {
        type: "CarbonCompliancePlatform",
        endpoint: `https://compliance.example.com/did/${encodeURIComponent(did)}`,
      },
    ],
  };
}

/**
 * Registers a new DID on the platform:
 * 1. Generate DID string from Hedera account ID
 * 2. Build DID document
 * 3. Store DID document on HFS
 * 4. Register on DIDRegistry smart contract
 * 5. Persist DID reference in PostgreSQL
 * 6. Submit HCS event
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */
export async function registerDID(
  hederaAccountId: string,
  entityType: EntityType,
  publicKey: string,
  entityId?: string
): Promise<DIDRegistrationResult> {
  // 1. Generate DID
  const did = generateDID(hederaAccountId);

  // 2. Build DID document
  const didDocument = buildDIDDocument(did, publicKey);

  // 3. Store DID document on HFS
  const documentBuffer = Buffer.from(JSON.stringify(didDocument), "utf-8");
  const fileId = await uploadFile(documentBuffer, `DID Document: ${did}`);
  const hfsFileId = fileId.toString();

  // 4. Register on DIDRegistry contract (skip if already registered)
  const contractId = loadDIDRegistryContractId();
  const params = new ContractFunctionParameters()
    .addString(did)
    .addString(hfsFileId)
    .addUint8(entityTypeToUint8(entityType));

  let contractCallResult: { transactionId: string } = { transactionId: "" };
  try {
    contractCallResult = await contractCall(contractId, "registerDID", params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("CONTRACT_REVERT_EXECUTED")) {
      console.warn(`[DID] DID already registered on contract, skipping: ${did}`);
      contractCallResult = { transactionId: `already-registered:${did}` };
    } else {
      throw err;
    }
  }

  // 5. Persist DID reference in DB
  await prisma.dIDDocument.create({
    data: {
      did,
      entityType,
      entityId: entityId ?? hederaAccountId,
      hfsFileId,
      publicKey,
    },
  });

  // Also persist the HFS file reference
  await prisma.hederaFile.create({
    data: {
      fileId: hfsFileId,
      fileType: "DID_DOCUMENT",
      associatedEntity: did,
    },
  });

  // 6. Submit HCS event to CompanyRegistration topic
  const topicId = loadTopicId("CompanyRegistration");
  if (topicId) {
    await submitMessage(topicId, {
      topic: "CompanyRegistration",
      timestamp: new Date().toISOString(),
      eventType: "DID_REGISTERED",
      payload: {
        did,
        entityType,
        hfsFileId,
        hederaAccountId,
      },
    });
  }

  return { did, hfsFileId, entityType, transactionId: contractCallResult.transactionId };
}

/**
 * Resolves a DID by fetching its document from HFS via the stored file ID.
 *
 * Requirements: 14.3, 14.4
 */
export async function resolveDID(
  did: string
): Promise<DIDDocumentData | null> {
  // Look up the HFS file ID from the database
  const record = await prisma.dIDDocument.findUnique({
    where: { did },
  });

  if (!record) {
    return null;
  }

  // Fetch the DID document from HFS
  const contents = await getFileContents(FileId.fromString(record.hfsFileId));
  const document: DIDDocumentData = JSON.parse(contents.toString("utf-8"));

  return document;
}

/**
 * Lists all DIDs registered for a given entity type.
 *
 * Requirements: 14.5
 */
export async function listDIDsByEntityType(
  entityType: EntityType
): Promise<DIDRegistrationResult[]> {
  const records = await prisma.dIDDocument.findMany({
    where: { entityType },
    orderBy: { createdAt: "desc" },
  });

  return records.map((r) => ({
    did: r.did,
    hfsFileId: r.hfsFileId,
    entityType: r.entityType as EntityType,
    transactionId: "",
  }));
}
