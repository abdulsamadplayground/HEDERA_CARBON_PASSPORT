import { z } from "zod";

/**
 * Zod validation schemas for all corporate compliance API request payloads.
 */

// --- Company Registration ---

export const registerCompanySchema = z.object({
  companyName: z.string().min(1).max(255),
  hederaAccountId: z.string().regex(/^\d+\.\d+\.\d+$/),
  sector: z.enum(["ENERGY", "MANUFACTURING", "TRANSPORTATION", "AGRICULTURE", "SERVICES"]),
  revenueRange: z.enum(["UNDER_10M", "10M_100M", "100M_1B", "OVER_1B"]),
  baselineEmissions: z.number().nonnegative(),
  policyFrameworks: z.array(z.enum([
    "PARIS_AGREEMENT", "EU_ETS", "CBAM", "CORSIA", "VERRA", "GOLD_STANDARD",
  ])).optional(),
});

// --- Emissions Calculation ---

export const calculateEmissionsSchema = z.object({
  companyId: z.string().uuid(),
  reportingPeriod: z.string().regex(/^\d{4}-H[12]$/),
  scope1: z.array(z.object({
    fuelType: z.string().min(1),
    quantityConsumed: z.number().positive(),
    equipmentCategory: z.string().min(1),
  })),
  scope2: z.array(z.object({
    electricityKwh: z.number().nonnegative(),
    gridRegion: z.string().min(1),
    renewableCertificatesMwh: z.number().nonnegative().optional(),
  })),
  scope3: z.array(z.object({
    category: z.enum(["UPSTREAM_SUPPLIERS", "DOWNSTREAM_DISTRIBUTION",
      "BUSINESS_TRAVEL", "EMPLOYEE_COMMUTING"]),
    activityData: z.number().nonnegative(),
    allocationMethod: z.enum(["SPEND_BASED", "ACTIVITY_BASED"]),
    spendAmount: z.number().nonnegative().optional(),
  })),
});

// --- Marketplace Listing ---

export const createListingSchema = z.object({
  sellerCompanyId: z.string().uuid(),
  quantity: z.number().positive(),
  pricePerCCR: z.number().positive(),
  marketType: z.enum(["COMPLIANCE", "VOLUNTARY"]),
  expiresAt: z.string().datetime(),
});
export const purchaseCreditsSchema = z.object({
  buyerCompanyId: z.string().uuid(),
  listingId: z.string().uuid(),
});

// --- Report Generation ---

export const generateReportSchema = z.object({
  companyId: z.string().uuid(),
  format: z.enum(["PDF", "CSV", "JSON"]),
});

// --- Guardian MRV Verification ---

export const guardianVerifySchema = z.object({
  companyId: z.string().uuid(),
  companyDid: z.string().startsWith("did:hedera:testnet:"),
  productOrBatchId: z.string().min(1),
  lifecycleStages: z.array(z.enum([
    "RAW_MATERIAL_ACQUISITION", "PRODUCTION", "DISTRIBUTION", "USE", "END_OF_LIFE",
  ])).min(1),
  emissionFactors: z.array(z.object({
    factor: z.string().min(1),
    value: z.number().nonnegative(),
    unit: z.string().min(1),
  })).min(1),
  methodologyReference: z.string().min(1),
  calculationData: z.record(z.unknown()),
});

// --- Supply Chain Event ---

export const submitSupplyChainEventSchema = z.object({
  eventType: z.enum([
    "MANUFACTURING_EVENT", "SHIPMENT_EVENT", "WAREHOUSE_EVENT",
    "INSPECTION_EVENT", "CERTIFICATION_EVENT",
  ]),
  companyId: z.string().uuid(),
  passportSerial: z.number().int().positive().optional(),
  location: z.string().min(1),
  payload: z.record(z.unknown()),
});

// --- Verifiable Claims ---

export const submitClaimSchema = z.object({
  companyId: z.string().uuid(),
  claimType: z.enum([
    "LOW_CARBON", "CARBON_NEUTRAL", "NET_ZERO",
    "RENEWABLE_ENERGY", "CIRCULAR_ECONOMY", "FAIR_TRADE",
  ]),
  evidenceReferences: z.array(z.string()).min(1),
  requestedVerifierId: z.string().uuid().optional(),
});

export const attestClaimSchema = z.object({
  verifierId: z.string().uuid(),
  credentialHash: z.string().min(1),
  expiryDate: z.string().datetime(),
});

// --- Batch / Item Passports ---

export const mintBatchPassportSchema = z.object({
  companyId: z.string().uuid(),
  batchId: z.string().min(1),
  batchDescription: z.string().min(1),
  carbonFootprintTotal: z.number().nonnegative(),
});

export const mintItemPassportSchema = z.object({
  companyId: z.string().uuid(),
  itemId: z.string().min(1),
  itemDescription: z.string().min(1),
  proportionFactor: z.number().min(0).max(1),
});

// --- Compliance Stamp ---

export const issueStampSchema = z.object({
  companyId: z.string().uuid(),
  regulatorId: z.string().uuid(),
  regulatorDid: z.string().startsWith("did:hedera:testnet:"),
  milestoneDescription: z.string().min(1),
  certificationDate: z.string().datetime(),
  expiryDate: z.string().datetime(),
  credentialHash: z.string().min(1),
});

// --- Cap-and-Trade Allocation ---

export const allocateAllowancesSchema = z.object({
  companyId: z.string().uuid(),
  compliancePeriod: z.string().regex(/^\d{4}$/),
});
