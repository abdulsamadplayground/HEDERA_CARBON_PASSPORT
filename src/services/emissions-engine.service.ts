/**
 * Emissions Engine — Pure Calculation Module
 *
 * Computes Scope 1, Scope 2, and Scope 3 carbon emissions using
 * GHG Protocol methodologies with ISO 14067/14040 references.
 *
 * No side effects — persistence and HCS messaging are handled by the API layer.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.9, 2.10, 2.11
 */

import type { SectorType } from "@/services/carbon-score.service";

// ---------------------------------------------------------------------------
// Emission Factor Tables
// ---------------------------------------------------------------------------

export interface EmissionFactor {
  fuelType: string;
  kgCO2ePerUnit: number;
  unit: string; // "liter", "kg", "m3", etc.
}

/**
 * Sector-specific Scope 1 emission factors for fuel combustion,
 * process emissions, and fugitive emissions.
 * Keyed by SectorType, each containing an array of EmissionFactor entries.
 */
export const SCOPE1_FACTORS: Record<string, EmissionFactor[]> = {
  ENERGY: [
    { fuelType: "natural_gas", kgCO2ePerUnit: 2.0, unit: "m3" },
    { fuelType: "diesel", kgCO2ePerUnit: 2.68, unit: "liter" },
    { fuelType: "coal", kgCO2ePerUnit: 2.86, unit: "kg" },
    { fuelType: "fuel_oil", kgCO2ePerUnit: 3.15, unit: "liter" },
  ],
  MANUFACTURING: [
    { fuelType: "natural_gas", kgCO2ePerUnit: 2.0, unit: "m3" },
    { fuelType: "diesel", kgCO2ePerUnit: 2.68, unit: "liter" },
    { fuelType: "lpg", kgCO2ePerUnit: 1.51, unit: "liter" },
    { fuelType: "process_emissions", kgCO2ePerUnit: 1.2, unit: "kg" },
  ],
  TRANSPORTATION: [
    { fuelType: "diesel", kgCO2ePerUnit: 2.68, unit: "liter" },
    { fuelType: "gasoline", kgCO2ePerUnit: 2.31, unit: "liter" },
    { fuelType: "jet_fuel", kgCO2ePerUnit: 2.52, unit: "liter" },
    { fuelType: "marine_fuel", kgCO2ePerUnit: 3.11, unit: "liter" },
  ],
  AGRICULTURE: [
    { fuelType: "diesel", kgCO2ePerUnit: 2.68, unit: "liter" },
    { fuelType: "fertilizer", kgCO2ePerUnit: 4.5, unit: "kg" },
    { fuelType: "methane_livestock", kgCO2ePerUnit: 6.27, unit: "kg" },
    { fuelType: "natural_gas", kgCO2ePerUnit: 2.0, unit: "m3" },
  ],
  SERVICES: [
    { fuelType: "natural_gas", kgCO2ePerUnit: 2.0, unit: "m3" },
    { fuelType: "diesel", kgCO2ePerUnit: 2.68, unit: "liter" },
    { fuelType: "electricity_backup", kgCO2ePerUnit: 0.5, unit: "kWh" },
  ],
};

/**
 * Grid region emission factors: kgCO2e per kWh (location-based).
 */
export const SCOPE2_GRID_FACTORS: Record<string, number> = {
  US_EAST: 0.386,
  US_WEST: 0.283,
  US_MIDWEST: 0.442,
  US_SOUTH: 0.401,
  EU_WEST: 0.231,
  EU_EAST: 0.356,
  EU_NORTH: 0.045,
  UK: 0.207,
  CHINA: 0.581,
  INDIA: 0.708,
  JAPAN: 0.457,
  BRAZIL: 0.074,
  AUSTRALIA: 0.656,
  CANADA: 0.120,
  GLOBAL_AVERAGE: 0.436,
};

/**
 * Scope 3 emission intensity factors per category (kgCO2e per unit of activity).
 */
const SCOPE3_INTENSITY_FACTORS: Record<string, { spendFactor: number; activityFactor: number }> = {
  UPSTREAM_SUPPLIERS: { spendFactor: 0.4, activityFactor: 0.6 },
  DOWNSTREAM_DISTRIBUTION: { spendFactor: 0.3, activityFactor: 0.5 },
  BUSINESS_TRAVEL: { spendFactor: 0.25, activityFactor: 0.18 },
  EMPLOYEE_COMMUTING: { spendFactor: 0.15, activityFactor: 0.12 },
};

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

export interface Scope1Input {
  fuelType: string;
  quantityConsumed: number;
  equipmentCategory: string;
}

export interface Scope2Input {
  electricityKwh: number;
  gridRegion: string;
  renewableCertificatesMwh?: number;
}

export interface Scope3Input {
  category: Scope3Category;
  activityData: number;
  allocationMethod: "SPEND_BASED" | "ACTIVITY_BASED";
  spendAmount?: number;
}

export type Scope3Category =
  | "UPSTREAM_SUPPLIERS"
  | "DOWNSTREAM_DISTRIBUTION"
  | "BUSINESS_TRAVEL"
  | "EMPLOYEE_COMMUTING";

export interface EmissionsInput {
  companyId: string;
  reportingPeriod: string; // "2025-H1", "2025-H2"
  sector: SectorType;
  scope1: Scope1Input[];
  scope2: Scope2Input[];
  scope3: Scope3Input[];
}

// ---------------------------------------------------------------------------
// Output Types
// ---------------------------------------------------------------------------

export interface ScopeBreakdown {
  scope: 1 | 2 | 3;
  totalTCO2e: number;
  categories: { category: string; tCO2e: number; methodology: string }[];
}

export interface StandardsReference {
  ghgProtocolVersion: string;
  iso14067Clauses: string[];
  iso14040LifecycleStages: string[];
  calculationMethodology: string;
}

export interface EmissionsResult {
  companyId: string;
  reportingPeriod: string;
  totalTCO2e: number;
  scopes: ScopeBreakdown[];
  standardsReference: StandardsReference;
  calculatedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Validation Error
// ---------------------------------------------------------------------------

export class EmissionsValidationError extends Error {
  public readonly fields: string[];

  constructor(fields: string[]) {
    super(`Validation error: invalid fields — ${fields.join(", ")}`);
    this.name = "EmissionsValidationError";
    this.fields = fields;
  }
}

// ---------------------------------------------------------------------------
// Pure Calculation Functions
// ---------------------------------------------------------------------------

/**
 * Scope 1 — Direct emissions from owned/controlled sources.
 * Formula: tCO2e = quantityConsumed × kgCO2ePerUnit / 1000
 *
 * Requirements: 2.1, 2.4
 */
export function calculateScope1(inputs: Scope1Input[], sector: SectorType): ScopeBreakdown {
  const sectorFactors = SCOPE1_FACTORS[sector];
  if (!sectorFactors) {
    throw new EmissionsValidationError([`sector: unknown sector "${sector}"`]);
  }

  const factorMap = new Map(sectorFactors.map((f) => [f.fuelType.toLowerCase(), f]));
  const categories: ScopeBreakdown["categories"] = [];

  for (const input of inputs) {
    const normalizedFuelType = input.fuelType.toLowerCase();
    const factor = factorMap.get(normalizedFuelType);
    if (!factor) {
      throw new EmissionsValidationError([
        `scope1.fuelType: "${input.fuelType}" not found for sector "${sector}"`,
      ]);
    }
    if (input.quantityConsumed < 0 || !Number.isFinite(input.quantityConsumed)) {
      throw new EmissionsValidationError([
        `scope1.quantityConsumed: must be a non-negative finite number`,
      ]);
    }

    const tCO2e = (input.quantityConsumed * factor.kgCO2ePerUnit) / 1000;
    categories.push({
      category: `${input.fuelType} (${input.equipmentCategory})`,
      tCO2e,
      methodology: "GHG Protocol Scope 1 — direct combustion",
    });
  }

  const totalTCO2e = categories.reduce((sum, c) => sum + c.tCO2e, 0);

  return { scope: 1, totalTCO2e, categories };
}

/**
 * Scope 2 — Indirect energy emissions (location-based and market-based).
 * Location-based: tCO2e = electricityKwh × gridFactor / 1000
 * Market-based: subtract renewable offset (renewableCertificatesMwh × 1000 × gridFactor / 1000)
 *
 * Requirements: 2.2
 */
export function calculateScope2(inputs: Scope2Input[]): ScopeBreakdown {
  const categories: ScopeBreakdown["categories"] = [];

  for (const input of inputs) {
    const gridFactor = SCOPE2_GRID_FACTORS[input.gridRegion];
    if (gridFactor === undefined) {
      throw new EmissionsValidationError([
        `scope2.gridRegion: "${input.gridRegion}" not found in grid factor table`,
      ]);
    }
    if (input.electricityKwh < 0 || !Number.isFinite(input.electricityKwh)) {
      throw new EmissionsValidationError([
        `scope2.electricityKwh: must be a non-negative finite number`,
      ]);
    }

    // Location-based
    const locationBased = (input.electricityKwh * gridFactor) / 1000;

    // Market-based: subtract renewable offset
    const renewableKwh = (input.renewableCertificatesMwh ?? 0) * 1000;
    const renewableOffset = (renewableKwh * gridFactor) / 1000;
    const marketBased = Math.max(0, locationBased - renewableOffset);

    categories.push({
      category: `electricity_location_based (${input.gridRegion})`,
      tCO2e: locationBased,
      methodology: "GHG Protocol Scope 2 — location-based",
    });

    categories.push({
      category: `electricity_market_based (${input.gridRegion})`,
      tCO2e: marketBased,
      methodology: "GHG Protocol Scope 2 — market-based",
    });
  }

  // Total uses market-based figures (more conservative accounting)
  const marketBasedCategories = categories.filter((c) =>
    c.category.startsWith("electricity_market_based")
  );
  const totalTCO2e = marketBasedCategories.reduce((sum, c) => sum + c.tCO2e, 0);

  return { scope: 2, totalTCO2e, categories };
}

/**
 * Scope 3 — Value chain emissions using spend-based or activity-based allocation.
 *
 * Requirements: 2.3
 */
export function calculateScope3(inputs: Scope3Input[]): ScopeBreakdown {
  const categories: ScopeBreakdown["categories"] = [];

  for (const input of inputs) {
    const factors = SCOPE3_INTENSITY_FACTORS[input.category];
    if (!factors) {
      throw new EmissionsValidationError([
        `scope3.category: "${input.category}" is not a valid Scope 3 category`,
      ]);
    }
    if (input.activityData < 0 || !Number.isFinite(input.activityData)) {
      throw new EmissionsValidationError([
        `scope3.activityData: must be a non-negative finite number`,
      ]);
    }

    let tCO2e: number;
    let methodology: string;

    if (input.allocationMethod === "SPEND_BASED") {
      const spend = input.spendAmount ?? input.activityData;
      tCO2e = (spend * factors.spendFactor) / 1000;
      methodology = "GHG Protocol Scope 3 — spend-based allocation";
    } else {
      tCO2e = (input.activityData * factors.activityFactor) / 1000;
      methodology = "GHG Protocol Scope 3 — activity-based allocation";
    }

    categories.push({
      category: input.category,
      tCO2e,
      methodology,
    });
  }

  const totalTCO2e = categories.reduce((sum, c) => sum + c.tCO2e, 0);

  return { scope: 3, totalTCO2e, categories };
}

/**
 * Build a StandardsReference based on sector and scope breakdown.
 *
 * Requirements: 2.10, 2.11
 */
export function buildStandardsReference(
  sector: SectorType,
  scopes: ScopeBreakdown[]
): StandardsReference {
  const hasScope1 = scopes.some((s) => s.scope === 1 && s.categories.length > 0);
  const hasScope2 = scopes.some((s) => s.scope === 2 && s.categories.length > 0);
  const hasScope3 = scopes.some((s) => s.scope === 3 && s.categories.length > 0);

  // ISO 14067 clauses relevant to the calculation
  const iso14067Clauses: string[] = ["6.3.1"]; // General carbon footprint quantification
  if (hasScope1) iso14067Clauses.push("6.3.2"); // Direct emissions
  if (hasScope2) iso14067Clauses.push("6.3.3"); // Energy indirect emissions
  if (hasScope3) iso14067Clauses.push("6.4.2"); // Other indirect emissions

  // ISO 14040 lifecycle stages
  const iso14040LifecycleStages: string[] = [];
  if (hasScope1) {
    iso14040LifecycleStages.push("production");
  }
  if (hasScope2) {
    iso14040LifecycleStages.push("production", "distribution");
  }
  if (hasScope3) {
    iso14040LifecycleStages.push("raw_material_acquisition", "distribution", "use", "end_of_life");
  }
  // Deduplicate
  const uniqueStages = Array.from(new Set(iso14040LifecycleStages));
  // Ensure at least one stage
  if (uniqueStages.length === 0) {
    uniqueStages.push("production");
  }

  // Determine methodology based on scopes present
  const methodologies: string[] = [];
  if (hasScope1) methodologies.push("direct-measurement");
  if (hasScope2) methodologies.push("location-based", "market-based");
  if (hasScope3) methodologies.push("activity-based");
  const calculationMethodology = methodologies.length > 0
    ? methodologies.join(", ")
    : "activity-based";

  return {
    ghgProtocolVersion: "GHG Protocol Corporate Standard v2",
    iso14067Clauses,
    iso14040LifecycleStages: uniqueStages,
    calculationMethodology,
  };
}

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

function validateEmissionsInput(input: EmissionsInput): string[] {
  const errors: string[] = [];

  if (!input.companyId || typeof input.companyId !== "string") {
    errors.push("companyId: required non-empty string");
  }
  if (!input.reportingPeriod || typeof input.reportingPeriod !== "string") {
    errors.push("reportingPeriod: required non-empty string");
  }
  const validSectors: SectorType[] = [
    "ENERGY", "MANUFACTURING", "TRANSPORTATION", "AGRICULTURE", "SERVICES",
  ];
  if (!validSectors.includes(input.sector)) {
    errors.push(`sector: must be one of ${validSectors.join(", ")}`);
  }
  if (!Array.isArray(input.scope1)) {
    errors.push("scope1: must be an array");
  }
  if (!Array.isArray(input.scope2)) {
    errors.push("scope2: must be an array");
  }
  if (!Array.isArray(input.scope3)) {
    errors.push("scope3: must be an array");
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Calculate emissions across all scopes, validate input, and return
 * a complete EmissionsResult with standards references.
 *
 * Requirements: 2.1–2.5, 2.7, 2.9, 2.10, 2.11
 */
export function calculateEmissions(input: EmissionsInput): EmissionsResult {
  // Validate input
  const validationErrors = validateEmissionsInput(input);
  if (validationErrors.length > 0) {
    throw new EmissionsValidationError(validationErrors);
  }

  // Calculate each scope
  const scope1 = calculateScope1(input.scope1, input.sector);
  const scope2 = calculateScope2(input.scope2);
  const scope3 = calculateScope3(input.scope3);

  const scopes: ScopeBreakdown[] = [scope1, scope2, scope3];
  const totalTCO2e = scope1.totalTCO2e + scope2.totalTCO2e + scope3.totalTCO2e;

  // Build standards reference
  const standardsReference = buildStandardsReference(input.sector, scopes);

  return {
    companyId: input.companyId,
    reportingPeriod: input.reportingPeriod,
    totalTCO2e,
    scopes,
    standardsReference,
    calculatedAt: new Date().toISOString(),
  };
}
