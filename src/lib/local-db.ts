/**
 * Local JSON-file-backed database that replaces PostgreSQL/Prisma.
 * 
 * Transactions are logged on Hedera (HCS/HTS/HSCS) as the authoritative
 * source of truth. This local store is just a convenience cache for
 * business state that can be reconstructed from Hedera at any time.
 * 
 * Persists to data/local-db.json on every write.
 */

import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "local-db.json");

// ---------------------------------------------------------------------------
// Types matching Prisma schema
// ---------------------------------------------------------------------------

export interface Company {
  id: string;
  companyName: string;
  hederaAccountId: string;
  did: string | null;
  sector: string;
  revenueRange: string;
  baselineEmissions: number;
  emissionTier: string;
  carbonScore: string | null;
  policyFrameworks: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmissionsRecord {
  id: string;
  companyId: string;
  reportingPeriod: string;
  totalTCO2e: number;
  scope1TCO2e: number;
  scope2TCO2e: number;
  scope3TCO2e: number;
  breakdownJson: string;
  standardsReference: string | null;
  calculatedAt: Date;
}

export interface Allocation {
  id: string;
  companyId: string;
  compliancePeriod: string;
  allocatedAmount: number;
  usedAmount: number;
  surplus: number;
  deficit: number;
  status: string;
  transactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceListing {
  id: string;
  sellerCompanyId: string;
  quantity: number;
  pricePerCCR: number;
  marketType: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceTransaction {
  id: string;
  listingId: string;
  buyerCompanyId: string;
  sellerCompanyId: string;
  quantity: number;
  totalPrice: number;
  transactionId: string | null;
  createdAt: Date;
}

export interface Projection {
  id: string;
  companyId: string;
  projectionPeriod: string;
  projectedEmissions: number;
  confidenceUpper: number;
  confidenceLower: number;
  complianceStatus: string;
  resultJson: string;
  generatedAt: Date;
}

export interface AuditReport {
  id: string;
  companyId: string;
  reportType: string;
  format: string;
  hfsFileId: string;
  anomalyCount: number;
  generatedAt: Date;
}

export interface PolicyAlignment {
  id: string;
  companyId: string;
  frameworkName: string;
  complianceScore: number;
  status: string;
  lastEvaluatedAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  companyId: string;
  milestoneType: string;
  ccrRewardAmount: number;
  transactionId: string | null;
  awardedAt: Date;
}

export interface CarbonPassport {
  id: string;
  companyId: string;
  cpassSerial: number;
  tokenId: string;
  passportType: string;
  batchId: string | null;
  itemId: string | null;
  parentBatchSerial: number | null;
  metadataHash: string | null;
  passportUri: string | null;
  metadataJson: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceStamp {
  id: string;
  passportId: string;
  cstampSerial: number;
  regulatorId: string;
  regulatorDid: string | null;
  milestoneDescription: string;
  certificationDate: Date;
  expiryDate: Date;
  credentialHash: string | null;
  createdAt: Date;
}

export interface BatchItemRelation {
  id: string;
  batchPassportSerial: number;
  itemPassportSerial: number;
  companyId: string;
  proportionFactor: number;
}

export interface VerifiableClaim {
  id: string;
  companyId: string;
  passportId: string | null;
  claimType: string;
  verifierId: string | null;
  verifierDid: string | null;
  companyDid: string | null;
  credentialHash: string | null;
  vclaimSerial: number | null;
  status: string;
  evidenceRefs: string[];
  attestedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplyChainEvent {
  id: string;
  eventType: string;
  companyId: string;
  companyDid: string | null;
  passportSerial: number | null;
  location: string;
  payload: string;
  hcsSequenceNumber: number | null;
  consensusTimestamp: string | null;
  createdAt: Date;
}

export interface SectorBenchmark {
  id: string;
  sector: string;
  emissionTier: string;
  benchmarkEmissions: number;
  updatedAt: Date;
}

export interface StandardsRegistry {
  id: string;
  standardName: string;
  version: string;
  description: string;
  applicableModules: string[];
  createdAt: Date;
}

export interface StateCheckpoint {
  id: string;
  topicId: string;
  topicName: string;
  lastSequenceNumber: number;
  lastConsensusTimestamp: string;
  reconstructedAt: Date;
}

export interface DIDDocument {
  id: string;
  did: string;
  entityType: string;
  entityId: string;
  hfsFileId: string;
  publicKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuardianSubmission {
  id: string;
  companyId: string;
  companyDid: string;
  productOrBatchId: string;
  status: string;
  credentialHash: string | null;
  verifierDid: string | null;
  verifiedEmissions: number | null;
  policyId: string | null;
  verificationMode: string;
  methodologyRef: string;
  lifecycleStages: string[];
  rejectionErrors: string | null;
  issuedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HederaFile {
  id: string;
  fileId: string;
  fileType: string;
  associatedEntity: string;
  createdAt: Date;
}

export interface PlatformConfig {
  key: string;
  value: string;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Database shape
// ---------------------------------------------------------------------------

interface DatabaseSchema {
  companies: Company[];
  emissionsRecords: EmissionsRecord[];
  allocations: Allocation[];
  marketplaceListings: MarketplaceListing[];
  marketplaceTransactions: MarketplaceTransaction[];
  projections: Projection[];
  auditReports: AuditReport[];
  policyAlignments: PolicyAlignment[];
  milestones: Milestone[];
  carbonPassports: CarbonPassport[];
  complianceStamps: ComplianceStamp[];
  batchItemRelations: BatchItemRelation[];
  verifiableClaims: VerifiableClaim[];
  supplyChainEvents: SupplyChainEvent[];
  sectorBenchmarks: SectorBenchmark[];
  standardsRegistry: StandardsRegistry[];
  stateCheckpoints: StateCheckpoint[];
  didDocuments: DIDDocument[];
  guardianSubmissions: GuardianSubmission[];
  hederaFiles: HederaFile[];
  platformConfig: PlatformConfig[];
}

const EMPTY_DB: DatabaseSchema = {
  companies: [],
  emissionsRecords: [],
  allocations: [],
  marketplaceListings: [],
  marketplaceTransactions: [],
  projections: [],
  auditReports: [],
  policyAlignments: [],
  milestones: [],
  carbonPassports: [],
  complianceStamps: [],
  batchItemRelations: [],
  verifiableClaims: [],
  supplyChainEvents: [],
  sectorBenchmarks: [],
  standardsRegistry: [],
  stateCheckpoints: [],
  didDocuments: [],
  guardianSubmissions: [],
  hederaFiles: [],
  platformConfig: [],
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

let db: DatabaseSchema | null = null;

function ensureDir(): void {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
}

function load(): DatabaseSchema {
  if (db) return db;
  ensureDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      db = { ...EMPTY_DB, ...JSON.parse(raw) };
    } catch {
      db = { ...EMPTY_DB };
    }
  } else {
    db = { ...EMPTY_DB };
  }
  return db!;
}

function save(): void {
  if (!db) return;
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Generic collection helper — mimics Prisma's API surface
// ---------------------------------------------------------------------------

type WhereClause = Record<string, unknown>;

function matchesWhere(record: Record<string, unknown>, where: WhereClause): boolean {
  for (const [key, value] of Object.entries(where)) {
    // Handle compound unique keys like { sector_emissionTier: { sector: "X", emissionTier: "Y" } }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const compound = value as Record<string, unknown>;
      for (const [subKey, subVal] of Object.entries(compound)) {
        if (record[subKey] !== subVal) return false;
      }
      continue;
    }
    if (record[key] !== value) return false;
  }
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderByClause = Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[];

function applyOrderBy<T>(arr: T[], orderBy?: OrderByClause): T[] {
  if (!orderBy || (Array.isArray(orderBy) && orderBy.length === 0)) return arr;
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...arr].sort((a, b) => {
    for (const clause of clauses) {
      for (const [key, dir] of Object.entries(clause)) {
        const aVal = (a as Record<string, unknown>)[key];
        const bVal = (b as Record<string, unknown>)[key];
        if (aVal === bVal) continue;
        if (aVal == null) return dir === "asc" ? -1 : 1;
        if (bVal == null) return dir === "asc" ? 1 : -1;
        const cmp = aVal < bVal ? -1 : 1;
        return dir === "asc" ? cmp : -cmp;
      }
    }
    return 0;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCollectionProxy<T = any>(collectionKey: keyof DatabaseSchema) {
  return {
    findUnique(args: { where: WhereClause; include?: unknown }): T | null {
      const data = load();
      const arr = data[collectionKey] as unknown as T[];
      return arr.find((r) => matchesWhere(r as Record<string, unknown>, args.where)) ?? null;
    },

    findFirst(args?: { where?: WhereClause; orderBy?: OrderByClause; include?: unknown }): T | null {
      const data = load();
      let arr = data[collectionKey] as unknown as T[];
      if (args?.where) {
        arr = arr.filter((r) => matchesWhere(r as Record<string, unknown>, args.where!));
      }
      arr = applyOrderBy(arr, args?.orderBy);
      return arr[0] ?? null;
    },

    findMany(args?: { where?: WhereClause; orderBy?: OrderByClause; take?: number; include?: unknown }): T[] {
      const data = load();
      let arr = data[collectionKey] as unknown as T[];
      if (args?.where) {
        arr = arr.filter((r) => matchesWhere(r as Record<string, unknown>, args.where!));
      }
      arr = applyOrderBy(arr, args?.orderBy);
      if (args?.take) arr = arr.slice(0, args.take);
      return arr;
    },

    create(args: { data: Partial<T> }): T {
      const data = load();
      const now = new Date();
      const record = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...args.data,
      } as unknown as T;
      (data[collectionKey] as unknown as T[]).push(record);
      save();
      return record;
    },

    update(args: { where: WhereClause; data: Partial<T> }): T {
      const data = load();
      const arr = data[collectionKey] as unknown as T[];
      const idx = arr.findIndex((r) => matchesWhere(r as Record<string, unknown>, args.where));
      if (idx === -1) throw new Error(`Record not found in ${String(collectionKey)}`);
      arr[idx] = { ...arr[idx], ...args.data, updatedAt: new Date() } as unknown as T;
      save();
      return arr[idx];
    },

    upsert(args: { where: WhereClause; create: Partial<T>; update: Partial<T> }): T {
      const data = load();
      const arr = data[collectionKey] as unknown as T[];
      const idx = arr.findIndex((r) => matchesWhere(r as Record<string, unknown>, args.where));
      if (idx === -1) {
        const now = new Date();
        const record = { id: randomUUID(), createdAt: now, updatedAt: now, ...args.create } as unknown as T;
        arr.push(record);
        save();
        return record;
      }
      arr[idx] = { ...arr[idx], ...args.update, updatedAt: new Date() } as unknown as T;
      save();
      return arr[idx];
    },

    delete(args: { where: WhereClause }): T {
      const data = load();
      const arr = data[collectionKey] as unknown as T[];
      const idx = arr.findIndex((r) => matchesWhere(r as Record<string, unknown>, args.where));
      if (idx === -1) throw new Error(`Record not found in ${String(collectionKey)}`);
      const [removed] = arr.splice(idx, 1);
      save();
      return removed;
    },

    updateMany(args: { where?: WhereClause; data: Partial<T> }): { count: number } {
      const data = load();
      const arr = data[collectionKey] as unknown as T[];
      let count = 0;
      for (let i = 0; i < arr.length; i++) {
        if (!args.where || matchesWhere(arr[i] as Record<string, unknown>, args.where)) {
          arr[i] = { ...arr[i], ...args.data, updatedAt: new Date() } as unknown as T;
          count++;
        }
      }
      if (count > 0) save();
      return { count };
    },

    deleteMany(args?: { where?: WhereClause }): { count: number } {
      const data = load();
      const arr = data[collectionKey] as unknown as T[];
      if (!args?.where) {
        const count = arr.length;
        (data[collectionKey] as unknown as T[]).length = 0;
        save();
        return { count };
      }
      const before = arr.length;
      const remaining = arr.filter((r) => !matchesWhere(r as Record<string, unknown>, args.where!));
      (data[collectionKey] as unknown[]).length = 0;
      remaining.forEach((r) => (data[collectionKey] as unknown as T[]).push(r));
      save();
      return { count: before - remaining.length };
    },

    count(args?: { where?: WhereClause }): number {
      const data = load();
      const arr = data[collectionKey] as unknown as T[];
      if (!args?.where) return arr.length;
      return arr.filter((r) => matchesWhere(r as Record<string, unknown>, args.where!)).length;
    },
  };
}

// ---------------------------------------------------------------------------
// Exported "prisma" compatible object
// ---------------------------------------------------------------------------

export const localDb = {
  company: createCollectionProxy<Company>("companies"),
  emissionsRecord: createCollectionProxy<EmissionsRecord>("emissionsRecords"),
  allocation: createCollectionProxy<Allocation>("allocations"),
  marketplaceListing: createCollectionProxy<MarketplaceListing>("marketplaceListings"),
  marketplaceTransaction: createCollectionProxy<MarketplaceTransaction>("marketplaceTransactions"),
  projection: createCollectionProxy<Projection>("projections"),
  auditReport: createCollectionProxy<AuditReport>("auditReports"),
  policyAlignment: createCollectionProxy<PolicyAlignment>("policyAlignments"),
  milestone: createCollectionProxy<Milestone>("milestones"),
  carbonPassport: createCollectionProxy<CarbonPassport>("carbonPassports"),
  complianceStamp: createCollectionProxy<ComplianceStamp>("complianceStamps"),
  batchItemRelation: createCollectionProxy<BatchItemRelation>("batchItemRelations"),
  verifiableClaim: createCollectionProxy<VerifiableClaim>("verifiableClaims"),
  supplyChainEvent: createCollectionProxy<SupplyChainEvent>("supplyChainEvents"),
  sectorBenchmark: createCollectionProxy<SectorBenchmark>("sectorBenchmarks"),
  standardsRegistry: createCollectionProxy<StandardsRegistry>("standardsRegistry"),
  stateCheckpoint: createCollectionProxy<StateCheckpoint>("stateCheckpoints"),
  dIDDocument: createCollectionProxy<DIDDocument>("didDocuments"),
  guardianSubmission: createCollectionProxy<GuardianSubmission>("guardianSubmissions"),
  hederaFile: createCollectionProxy<HederaFile>("hederaFiles"),
  platformConfig: createCollectionProxy<PlatformConfig>("platformConfig"),
};

export default localDb;
