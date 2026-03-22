/**
 * Standards Registry Service for the Corporate Carbon Compliance Platform.
 *
 * Manages the standards registry for GHG Protocol, ISO 14067, and ISO 14040.
 * The registry is pre-populated via the deploy script (task 6.1) and this
 * service provides read-only access to the entries.
 *
 * Requirements: 13.1, 13.5, 13.6
 */

import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StandardsRegistryEntry {
  standardId: string;
  standardName: string;
  version: string;
  description: string;
  applicableModules: string[]; // e.g., ["emissions", "passport", "guardian"]
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Returns all entries from the standards registry.
 *
 * The registry is pre-populated with GHG Protocol, ISO 14067, and ISO 14040
 * entries via the deploy script.
 *
 * Requirements: 13.1, 13.5, 13.6
 */
export async function getStandardsRegistry(): Promise<StandardsRegistryEntry[]> {
  const records = await prisma.standardsRegistry.findMany({
    orderBy: { standardName: "asc" },
  });

  return records.map((r) => ({
    standardId: r.id,
    standardName: r.standardName,
    version: r.version,
    description: r.description,
    applicableModules: r.applicableModules,
  }));
}

/**
 * Retrieves a single standard by its ID.
 *
 * Returns null if the standard is not found.
 *
 * Requirements: 13.5
 */
export async function getStandard(
  standardId: string
): Promise<StandardsRegistryEntry | null> {
  const record = await prisma.standardsRegistry.findUnique({
    where: { id: standardId },
  });

  if (!record) {
    return null;
  }

  return {
    standardId: record.id,
    standardName: record.standardName,
    version: record.version,
    description: record.description,
    applicableModules: record.applicableModules,
  };
}
