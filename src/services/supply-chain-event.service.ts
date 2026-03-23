/**
 * Supply Chain Event Service for the Corporate Carbon Compliance Platform.
 *
 * Records supply chain events to HCS and persists them in the database.
 * Events are linked to company DIDs and optionally to batch/item passports.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

import prisma from "@/lib/prisma";
import { loadTopicId, submitMessage } from "@/services/hcs.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SupplyChainEventType =
  | "MANUFACTURING_EVENT"
  | "SHIPMENT_EVENT"
  | "WAREHOUSE_EVENT"
  | "INSPECTION_EVENT"
  | "CERTIFICATION_EVENT";

export const VALID_EVENT_TYPES: SupplyChainEventType[] = [
  "MANUFACTURING_EVENT",
  "SHIPMENT_EVENT",
  "WAREHOUSE_EVENT",
  "INSPECTION_EVENT",
  "CERTIFICATION_EVENT",
];

export interface SubmitEventInput {
  eventType: SupplyChainEventType;
  companyId: string;
  passportSerial?: number;
  location: string;
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Submits a supply chain event.
 *
 * 1. Validate passport serial exists (if provided)
 * 2. Look up company DID
 * 3. Submit HCS event to SupplyChain topic
 * 4. Persist to DB
 *
 * Requirements: 12.2, 12.3, 12.4
 */
export async function submitEvent(input: SubmitEventInput) {
  // Look up company
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
  });
  if (!company) {
    throw new Error(`Company not found: ${input.companyId}`);
  }

  // Validate passport serial if provided
  if (input.passportSerial !== undefined) {
    const passport = await prisma.carbonPassport.findUnique({
      where: { cpassSerial: input.passportSerial },
    });
    if (!passport) {
      throw new Error(`Passport with serial ${input.passportSerial} not found`);
    }
  }

  const companyDid = company.did ?? "";
  const now = new Date().toISOString();

  // Submit HCS event
  let hcsSequenceNumber: number | undefined;
  const topicId = loadTopicId("SupplyChain");
  if (topicId) {
    await submitMessage(topicId, {
      topic: "SupplyChain",
      timestamp: now,
      eventType: input.eventType,
      payload: {
        companyId: input.companyId,
        companyDid,
        passportSerial: input.passportSerial ?? null,
        location: input.location,
        ...input.payload,
      },
    });
  }

  // Persist to DB
  const event = await prisma.supplyChainEvent.create({
    data: {
      eventType: input.eventType,
      companyId: input.companyId,
      companyDid,
      passportSerial: input.passportSerial,
      location: input.location,
      payload: JSON.stringify(input.payload),
      hcsSequenceNumber,
      consensusTimestamp: now,
    },
  });

  return event;
}

/**
 * Gets supply chain events by passport serial.
 * Requirements: 12.5
 */
export async function getEventsByPassport(passportSerial: number) {
  return prisma.supplyChainEvent.findMany({
    where: { passportSerial },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Gets supply chain events by company.
 * Requirements: 12.5
 */
export async function getEventsByCompany(companyId: string) {
  return prisma.supplyChainEvent.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}
