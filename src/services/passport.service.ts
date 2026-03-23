/**
 * Passport Service for the Corporate Carbon Compliance Platform.
 *
 * Manages CPASS (Carbon Passport) and CSTAMP (Compliance Stamp) lifecycle:
 * minting, metadata storage on HFS, on-chain registration, stamp issuance,
 * metadata updates, and retrieval with associated stamps/claims.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */

import { createHash } from "crypto";
import { ContractFunctionParameters, ContractId } from "@hashgraph/sdk";
import prisma from "@/lib/prisma";
import { uploadFile } from "@/services/hfs.service";
import { mintNFT, loadTokenId } from "@/services/hts.service";
import { contractCall } from "@/services/hscs.service";
import { loadTopicId, submitMessage } from "@/services/hcs.service";
import { getValue } from "@/lib/local-store";
import { buildStandardsReference } from "@/services/emissions-engine.service";
import type { StandardsReference } from "@/services/emissions-engine.service";
import type { EmissionTier, SectorType } from "@/services/carbon-score.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PassportType = "company" | "batch" | "item";

export interface MintPassportInput {
  companyId: string;
  emissionTier: EmissionTier;
  baselineEmissions: number;
  passportType?: PassportType; // defaults to "company"
}

export interface IssueStampInput {
  companyId: string;
  regulatorId: string;
  regulatorDid: string;
  milestoneDescription: string;
  certificationDate: string;
  expiryDate: string;
  credentialHash: string;
}

export interface PassportMetadata {
  company_id: string;
  company_did: string;
  passport_type: PassportType;
  carbon_footprint_total: number;
  carbon_score: string;
  certification_hashes: string[];
  compliance_score: number;
  lifecycle_stage: string;
  standards_reference: StandardsReference;
  emission_tier: EmissionTier;
  baseline_emissions: number;
  passport_uri: string;
  batch_id?: string;
  item_id?: string;
  parent_batch_serial?: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Loads the CompliancePassportManager contract ID from config store. */
function loadPassportManagerContractId(): ContractId {
  const raw = getValue("contracts.CompliancePassportManager.id");
  if (typeof raw !== "string") {
    throw new Error(
      "[Passport] CompliancePassportManager contract ID not found in config. Run deploy first."
    );
  }
  return ContractId.fromString(raw);
}

/** Maps PassportType to the Solidity enum uint8 value. */
function passportTypeToUint8(type: PassportType): number {
  const map: Record<PassportType, number> = { company: 0, batch: 1, item: 2 };
  return map[type];
}

/** Maps EmissionTier to uint256 for contract calls. */
function tierToUint256(tier: EmissionTier): number {
  const map: Record<EmissionTier, number> = { Tier_1: 1, Tier_2: 2, Tier_3: 3 };
  return map[tier];
}

/** Computes SHA-256 hash of a string and returns hex. */
function computeHash(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Builds a default StandardsReference for initial passport minting. */
function buildDefaultStandardsReference(sector: SectorType): StandardsReference {
  return buildStandardsReference(sector, [
    { scope: 1, totalTCO2e: 0, categories: [{ category: "baseline", tCO2e: 0, methodology: "GHG Protocol Scope 1" }] },
  ]);
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Mints a new CPASS (Carbon Passport) NFT:
 * 1. Fetch company from DB to get DID, carbon score, sector
 * 2. Build PassportMetadata with company_did, carbon_score, standards_reference
 * 3. Store full metadata on HFS → get passportUri
 * 4. Compute metadata hash
 * 5. Mint CPASS_Token via SDK TokenMintTransaction with metadata hash on-chain
 * 6. Register on CompliancePassportManager contract
 * 7. Persist to DB (CarbonPassport + HederaFile)
 * 8. Submit HCS event to CompliancePassport topic with eventType "PASSPORT_MINTED"
 *
 * Requirements: 4.1, 4.2, 4.5, 4.6, 4.7
 */
export async function mintPassport(
  input: MintPassportInput
): Promise<{ serial: number; tokenId: string; metadataHash: string; passportUri: string; transactionId: string }> {
  const passportType = input.passportType ?? "company";

  // 1. Fetch company from DB
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
  });
  if (!company) {
    throw new Error(`[Passport] Company not found: ${input.companyId}`);
  }

  // 2. Build PassportMetadata
  const standardsReference = buildDefaultStandardsReference(company.sector as SectorType);
  const now = new Date().toISOString();

  const metadata: PassportMetadata = {
    company_id: company.id,
    company_did: company.did ?? "",
    passport_type: passportType,
    carbon_footprint_total: company.baselineEmissions,
    carbon_score: company.carbonScore ?? "C",
    certification_hashes: [],
    compliance_score: 0,
    lifecycle_stage: "production",
    standards_reference: standardsReference,
    emission_tier: input.emissionTier,
    baseline_emissions: input.baselineEmissions,
    passport_uri: "", // will be set after HFS upload
    created_at: now,
  };

  const metadataJson = JSON.stringify(metadata);

  // 3. Store full metadata on HFS
  const metadataBuffer = Buffer.from(metadataJson, "utf-8");
  const fileId = await uploadFile(metadataBuffer, `CPASS metadata: ${company.id}`);
  const passportUri = fileId.toString();

  // Update metadata with the passport_uri
  metadata.passport_uri = passportUri;
  const finalMetadataJson = JSON.stringify(metadata);

  // 4. Compute metadata hash
  const metadataHash = computeHash(finalMetadataJson);

  // 5. Mint CPASS_Token via SDK
  const cpassTokenId = loadTokenId("CPASS");
  if (!cpassTokenId) {
    throw new Error("[Passport] CPASS token ID not found in config. Run deploy first.");
  }

  const nftMetadataBytes = new TextEncoder().encode(metadataHash);
  const mintResult = await mintNFT(cpassTokenId, nftMetadataBytes);

  // 6. Register on CompliancePassportManager contract
  const contractId = loadPassportManagerContractId();
  const registerParams = new ContractFunctionParameters()
    .addUint256(mintResult.serialNumber)
    .addAddress(company.hederaAccountId.split(".").length === 3
      ? "0x" + BigInt(company.hederaAccountId.split(".")[2]).toString(16).padStart(40, "0")
      : company.hederaAccountId)
    .addUint8(passportTypeToUint8(passportType))
    .addUint256(tierToUint256(input.emissionTier))
    .addUint256(input.baselineEmissions)
    .addBytes32(Buffer.from(metadataHash, "hex"))
    .addString(company.did ?? "")
    .addString(company.carbonScore ?? "C")
    .addUint256(0); // parentBatchSerial — 0 for company passports

  try {
    await contractCall(contractId, "registerPassport", registerParams);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Passport] Contract registerPassport reverted (non-fatal): ${msg}`);
  }

  // 7. Persist to DB
  const passport = await prisma.carbonPassport.create({
    data: {
      companyId: company.id,
      cpassSerial: mintResult.serialNumber,
      tokenId: cpassTokenId.toString(),
      passportType,
      metadataHash,
      passportUri,
      metadataJson: finalMetadataJson,
    },
  });

  // Persist HederaFile record for the metadata file
  await prisma.hederaFile.create({
    data: {
      fileId: passportUri,
      fileType: "PASSPORT_METADATA",
      associatedEntity: passport.id,
    },
  });

  // 8. Submit HCS event
  const topicId = loadTopicId("CompliancePassport");
  if (topicId) {
    await submitMessage(topicId, {
      topic: "CompliancePassport",
      timestamp: now,
      eventType: "PASSPORT_MINTED",
      payload: {
        passportId: passport.id,
        cpassSerial: mintResult.serialNumber,
        companyId: company.id,
        companyDid: company.did ?? "",
        passportType,
        metadataHash,
        carbonScore: company.carbonScore ?? "C",
        baselineEmissions: input.baselineEmissions,
        emissionTier: input.emissionTier,
        standardsReference,
      },
    });
  }

  return {
    serial: mintResult.serialNumber,
    tokenId: cpassTokenId.toString(),
    metadataHash,
    passportUri,
    transactionId: mintResult.transactionId,
  };}


/**
 * Issues a CSTAMP (Compliance Stamp) NFT for a passport:
 * 1. Validate passport exists
 * 2. Mint CSTAMP_Token with metadata containing regulator_did, credential_hash
 * 3. Associate stamp with passport on CompliancePassportManager contract
 * 4. Persist to DB (ComplianceStamp)
 * 5. Submit HCS event with eventType "STAMP_ISSUED"
 *
 * Requirements: 4.4, 4.5, 4.8
 */
export async function issueStamp(
  passportId: string,
  input: IssueStampInput
): Promise<{ serial: number }> {
  // 1. Validate passport exists
  const passport = await prisma.carbonPassport.findUnique({
    where: { id: passportId },
  });
  if (!passport) {
    throw new Error(`[Passport] Passport not found: ${passportId}`);
  }

  // 2. Mint CSTAMP_Token
  const cstampTokenId = loadTokenId("CSTAMP");
  if (!cstampTokenId) {
    throw new Error("[Passport] CSTAMP token ID not found in config. Run deploy first.");
  }

  const stampMetadata = JSON.stringify({
    regulator_did: input.regulatorDid,
    credential_hash: input.credentialHash,
    passport_serial: passport.cpassSerial,
    company_id: input.companyId,
    milestone_description: input.milestoneDescription,
    certification_date: input.certificationDate,
    expiry_date: input.expiryDate,
  });

  const nftMetadataBytes = new TextEncoder().encode(
    computeHash(stampMetadata)
  );
  const mintResult = await mintNFT(cstampTokenId, nftMetadataBytes);

  // 3. Associate stamp with passport on contract
  const contractId = loadPassportManagerContractId();
  const associateParams = new ContractFunctionParameters()
    .addUint256(passport.cpassSerial)
    .addUint256(mintResult.serialNumber);

  try {
    await contractCall(contractId, "associateStamp", associateParams);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Passport] Contract associateStamp reverted (non-fatal): ${msg}`);
  }

  // 4. Persist to DB
  const stamp = await prisma.complianceStamp.create({
    data: {
      passportId: passport.id,
      cstampSerial: mintResult.serialNumber,
      regulatorId: input.regulatorId,
      regulatorDid: input.regulatorDid,
      milestoneDescription: input.milestoneDescription,
      certificationDate: new Date(input.certificationDate),
      expiryDate: new Date(input.expiryDate),
      credentialHash: input.credentialHash,
    },
  });

  // 5. Submit HCS event
  const topicId = loadTopicId("CompliancePassport");
  if (topicId) {
    await submitMessage(topicId, {
      topic: "CompliancePassport",
      timestamp: new Date().toISOString(),
      eventType: "STAMP_ISSUED",
      payload: {
        stampId: stamp.id,
        cstampSerial: mintResult.serialNumber,
        passportId: passport.id,
        passportSerial: passport.cpassSerial,
        companyId: input.companyId,
        companyDid: passport.metadataJson
          ? (JSON.parse(passport.metadataJson) as PassportMetadata).company_did
          : "",
        regulatorId: input.regulatorId,
        regulatorDid: input.regulatorDid,
        credentialHash: input.credentialHash,
      },
    });
  }

  return { serial: mintResult.serialNumber };
}

/**
 * Updates passport metadata:
 * 1. Fetch existing passport from DB
 * 2. Merge new metadata with existing
 * 3. Upload updated metadata to HFS
 * 4. Compute new metadata hash
 * 5. Update metadata hash on-chain via CompliancePassportManager.updatePassport
 * 6. Update DB record
 * 7. Submit HCS event with eventType "PASSPORT_UPDATED"
 *
 * Requirements: 4.3, 4.7
 */
export async function updatePassportMetadata(
  passportId: string,
  metadata: Partial<PassportMetadata>
): Promise<void> {
  // 1. Fetch existing passport
  const passport = await prisma.carbonPassport.findUnique({
    where: { id: passportId },
  });
  if (!passport) {
    throw new Error(`[Passport] Passport not found: ${passportId}`);
  }

  // 2. Merge metadata
  const existingMetadata: PassportMetadata = JSON.parse(passport.metadataJson);
  const updatedMetadata: PassportMetadata = { ...existingMetadata, ...metadata };
  const updatedMetadataJson = JSON.stringify(updatedMetadata);

  // 3. Upload updated metadata to HFS
  const metadataBuffer = Buffer.from(updatedMetadataJson, "utf-8");
  const fileId = await uploadFile(
    metadataBuffer,
    `CPASS metadata update: ${passport.companyId}`
  );
  const newPassportUri = fileId.toString();

  // 4. Compute new metadata hash
  const newMetadataHash = computeHash(updatedMetadataJson);

  // 5. Update on-chain via contract
  const contractId = loadPassportManagerContractId();
  const tierNumber = tierToUint256(updatedMetadata.emission_tier);

  const updateParams = new ContractFunctionParameters()
    .addUint256(passport.cpassSerial)
    .addUint256(tierNumber)
    .addBytes32(Buffer.from(newMetadataHash, "hex"))
    .addString(updatedMetadata.carbon_score);

  await contractCall(contractId, "updatePassport", updateParams).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Passport] Contract updatePassport reverted (non-fatal): ${msg}`);
  });

  // 6. Update DB record
  await prisma.carbonPassport.update({
    where: { id: passportId },
    data: {
      metadataJson: updatedMetadataJson,
      metadataHash: newMetadataHash,
      passportUri: newPassportUri,
    },
  });

  // Update HederaFile record
  await prisma.hederaFile.create({
    data: {
      fileId: newPassportUri,
      fileType: "PASSPORT_METADATA",
      associatedEntity: passportId,
    },
  });

  // 7. Submit HCS event
  const topicId = loadTopicId("CompliancePassport");
  if (topicId) {
    await submitMessage(topicId, {
      topic: "CompliancePassport",
      timestamp: new Date().toISOString(),
      eventType: "PASSPORT_UPDATED",
      payload: {
        passportId: passport.id,
        cpassSerial: passport.cpassSerial,
        companyId: passport.companyId,
        companyDid: updatedMetadata.company_did,
        metadataHash: newMetadataHash,
        carbonScore: updatedMetadata.carbon_score,
        standardsReference: updatedMetadata.standards_reference,
      },
    });
  }
}

/**
 * Retrieves a passport with its associated stamps, claims, and carbon score.
 *
 * Requirements: 4.6, 4.9
 */
export async function getPassportWithStampsAndClaims(passportId: string) {
  const passport = await prisma.carbonPassport.findUnique({
    where: { id: passportId },
  });

  if (!passport) {
    throw new Error(`[Passport] Passport not found: ${passportId}`);
  }

  // Manual joins for stamps, claims, and company
  const stamps = await prisma.complianceStamp.findMany({
    where: { passportId },
  });
  const claims = await prisma.verifiableClaim.findMany({
    where: { passportId },
  });
  const company = await prisma.company.findUnique({
    where: { id: passport.companyId },
  });

  return {
    ...passport,
    stamps,
    claims,
    company: company ? {
      id: company.id,
      companyName: company.companyName,
      did: company.did,
      carbonScore: company.carbonScore,
      emissionTier: company.emissionTier,
      sector: company.sector,
    } : null,
  };
}

// ---------------------------------------------------------------------------
// Batch / Item Passport Types
// ---------------------------------------------------------------------------

export interface MintBatchPassportInput {
  companyId: string;
  batchId: string;
  batchDescription: string;
  carbonFootprintTotal: number;
}

export interface MintItemPassportInput {
  companyId: string;
  batchSerial: number;
  itemId: string;
  itemDescription: string;
  proportionFactor: number; // 0-1
}

// ---------------------------------------------------------------------------
// Batch / Item Passport Functions
// ---------------------------------------------------------------------------

/**
 * Mints a batch-level CPASS_Token.
 *
 * Requirements: 18.1, 18.3, 18.5
 */
export async function mintBatchPassport(
  input: MintBatchPassportInput
): Promise<{ serial: number; tokenId: string }> {
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
  });
  if (!company) {
    throw new Error(`[Passport] Company not found: ${input.companyId}`);
  }

  const standardsReference = buildDefaultStandardsReference(company.sector as SectorType);
  const now = new Date().toISOString();

  const metadata: PassportMetadata = {
    company_id: company.id,
    company_did: company.did ?? "",
    passport_type: "batch",
    carbon_footprint_total: input.carbonFootprintTotal,
    carbon_score: company.carbonScore ?? "C",
    certification_hashes: [],
    compliance_score: 0,
    lifecycle_stage: "production",
    standards_reference: standardsReference,
    emission_tier: company.emissionTier as EmissionTier,
    baseline_emissions: company.baselineEmissions,
    passport_uri: "",
    batch_id: input.batchId,
    created_at: now,
  };

  const metadataJson = JSON.stringify(metadata);
  const metadataBuffer = Buffer.from(metadataJson, "utf-8");
  const fileId = await uploadFile(metadataBuffer, `CPASS batch metadata: ${input.batchId}`);
  const passportUri = fileId.toString();

  metadata.passport_uri = passportUri;
  const finalMetadataJson = JSON.stringify(metadata);
  const metadataHash = computeHash(finalMetadataJson);

  const cpassTokenId = loadTokenId("CPASS");
  if (!cpassTokenId) {
    throw new Error("[Passport] CPASS token ID not found in config.");
  }

  const nftMetadataBytes = new TextEncoder().encode(metadataHash);
  const mintResult = await mintNFT(cpassTokenId, nftMetadataBytes);

  // Register on contract
  const contractId = loadPassportManagerContractId();
  const companyEvmAddress =
    "0x" + BigInt(company.hederaAccountId.split(".")[2]).toString(16).padStart(40, "0");

  const registerParams = new ContractFunctionParameters()
    .addUint256(mintResult.serialNumber)
    .addAddress(companyEvmAddress)
    .addUint8(passportTypeToUint8("batch"))
    .addUint256(tierToUint256(company.emissionTier as EmissionTier))
    .addUint256(input.carbonFootprintTotal)
    .addBytes32(Buffer.from(metadataHash, "hex"))
    .addString(company.did ?? "")
    .addString(company.carbonScore ?? "C")
    .addUint256(0);

  try {
    await contractCall(contractId, "registerPassport", registerParams);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Passport] Contract registerPassport reverted (non-fatal): ${msg}`);
  }

  // Persist to DB
  await prisma.carbonPassport.create({
    data: {
      companyId: company.id,
      cpassSerial: mintResult.serialNumber,
      tokenId: cpassTokenId.toString(),
      passportType: "batch",
      batchId: input.batchId,
      metadataHash,
      passportUri,
      metadataJson: finalMetadataJson,
    },
  });

  // HCS event
  const topicId = loadTopicId("CompliancePassport");
  if (topicId) {
    await submitMessage(topicId, {
      topic: "CompliancePassport",
      timestamp: now,
      eventType: "BATCH_PASSPORT_MINTED",
      payload: {
        cpassSerial: mintResult.serialNumber,
        companyId: company.id,
        companyDid: company.did ?? "",
        batchId: input.batchId,
        carbonFootprintTotal: input.carbonFootprintTotal,
      },
    });
  }

  return { serial: mintResult.serialNumber, tokenId: cpassTokenId.toString() };
}

/**
 * Mints an item-level CPASS_Token within a batch.
 *
 * Requirements: 18.2, 18.4, 18.5
 */
export async function mintItemPassport(
  input: MintItemPassportInput
): Promise<{ serial: number; tokenId: string }> {
  // Validate batch exists
  const batchPassport = await prisma.carbonPassport.findUnique({
    where: { cpassSerial: input.batchSerial },
  });
  if (!batchPassport || batchPassport.passportType !== "batch") {
    throw new Error(`[Passport] Batch passport with serial ${input.batchSerial} not found`);
  }

  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
  });
  if (!company) {
    throw new Error(`[Passport] Company not found: ${input.companyId}`);
  }

  // Calculate proportional emissions
  const batchMetadata: PassportMetadata = JSON.parse(batchPassport.metadataJson);
  const itemFootprint = batchMetadata.carbon_footprint_total * input.proportionFactor;

  const standardsReference = buildDefaultStandardsReference(company.sector as SectorType);
  const now = new Date().toISOString();

  const metadata: PassportMetadata = {
    company_id: company.id,
    company_did: company.did ?? "",
    passport_type: "item",
    carbon_footprint_total: itemFootprint,
    carbon_score: company.carbonScore ?? "C",
    certification_hashes: [],
    compliance_score: 0,
    lifecycle_stage: "production",
    standards_reference: standardsReference,
    emission_tier: company.emissionTier as EmissionTier,
    baseline_emissions: company.baselineEmissions,
    passport_uri: "",
    item_id: input.itemId,
    parent_batch_serial: input.batchSerial,
    created_at: now,
  };

  const metadataJson = JSON.stringify(metadata);
  const metadataBuffer = Buffer.from(metadataJson, "utf-8");
  const fileId = await uploadFile(metadataBuffer, `CPASS item metadata: ${input.itemId}`);
  const passportUri = fileId.toString();

  metadata.passport_uri = passportUri;
  const finalMetadataJson = JSON.stringify(metadata);
  const metadataHash = computeHash(finalMetadataJson);

  const cpassTokenId = loadTokenId("CPASS");
  if (!cpassTokenId) {
    throw new Error("[Passport] CPASS token ID not found in config.");
  }

  const nftMetadataBytes = new TextEncoder().encode(metadataHash);
  const mintResult = await mintNFT(cpassTokenId, nftMetadataBytes);

  // Register on contract
  const contractId = loadPassportManagerContractId();
  const companyEvmAddress =
    "0x" + BigInt(company.hederaAccountId.split(".")[2]).toString(16).padStart(40, "0");

  const registerParams = new ContractFunctionParameters()
    .addUint256(mintResult.serialNumber)
    .addAddress(companyEvmAddress)
    .addUint8(passportTypeToUint8("item"))
    .addUint256(tierToUint256(company.emissionTier as EmissionTier))
    .addUint256(Math.round(itemFootprint))
    .addBytes32(Buffer.from(metadataHash, "hex"))
    .addString(company.did ?? "")
    .addString(company.carbonScore ?? "C")
    .addUint256(input.batchSerial);

  try {
    await contractCall(contractId, "registerPassport", registerParams);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Passport] Contract registerPassport reverted (non-fatal): ${msg}`);
  }

  // Persist to DB
  const itemPassport = await prisma.carbonPassport.create({
    data: {
      companyId: company.id,
      cpassSerial: mintResult.serialNumber,
      tokenId: cpassTokenId.toString(),
      passportType: "item",
      itemId: input.itemId,
      parentBatchSerial: input.batchSerial,
      metadataHash,
      passportUri,
      metadataJson: finalMetadataJson,
    },
  });

  // Create BatchItemRelation
  await prisma.batchItemRelation.create({
    data: {
      batchPassportSerial: input.batchSerial,
      itemPassportSerial: mintResult.serialNumber,
      companyId: company.id,
      proportionFactor: input.proportionFactor,
    },
  });

  // HCS event
  const topicId = loadTopicId("CompliancePassport");
  if (topicId) {
    await submitMessage(topicId, {
      topic: "CompliancePassport",
      timestamp: now,
      eventType: "ITEM_PASSPORT_MINTED",
      payload: {
        cpassSerial: mintResult.serialNumber,
        companyId: company.id,
        companyDid: company.did ?? "",
        itemId: input.itemId,
        parentBatchSerial: input.batchSerial,
        carbonFootprint: itemFootprint,
        proportionFactor: input.proportionFactor,
      },
    });
  }

  return { serial: mintResult.serialNumber, tokenId: cpassTokenId.toString() };
}

/**
 * Gets a batch passport with all associated item passports.
 *
 * Requirements: 18.6
 */
export async function getBatchWithItems(batchSerial: number) {
  const batch = await prisma.carbonPassport.findUnique({
    where: { cpassSerial: batchSerial },
  });
  if (!batch || batch.passportType !== "batch") {
    throw new Error(`[Passport] Batch passport with serial ${batchSerial} not found`);
  }

  const relations = await prisma.batchItemRelation.findMany({
    where: { batchPassportSerial: batchSerial },
  });

  // Manual join: look up each item passport by serial
  const items = [];
  for (const r of relations) {
    const itemPassport = await prisma.carbonPassport.findFirst({
      where: { cpassSerial: r.itemPassportSerial },
    });
    if (itemPassport) {
      items.push({ ...itemPassport, proportionFactor: r.proportionFactor });
    }
  }

  return {
    batch,
    items,
  };
}

/**
 * Recalculates proportional emissions for all items in a batch
 * when the batch total changes.
 *
 * Requirements: 18.4, 18.7
 */
export async function recalculateItemEmissions(
  batchSerial: number,
  newBatchTotal: number
): Promise<void> {
  const relations = await prisma.batchItemRelation.findMany({
    where: { batchPassportSerial: batchSerial },
  });

  for (const relation of relations) {
    const itemPassport = await prisma.carbonPassport.findFirst({
      where: { cpassSerial: relation.itemPassportSerial },
    });
    if (!itemPassport) continue;

    const newItemFootprint = newBatchTotal * relation.proportionFactor;
    const itemMetadata: PassportMetadata = JSON.parse(itemPassport.metadataJson);
    itemMetadata.carbon_footprint_total = newItemFootprint;

    await updatePassportMetadata(itemPassport.id, {
      carbon_footprint_total: newItemFootprint,
    });
  }
}
