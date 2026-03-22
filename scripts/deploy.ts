/**
 * Full deployment script for the Corporate Carbon Compliance Platform.
 *
 * Orchestrates the complete deployment pipeline:
 *   1. Initialize Hedera client
 *   2. Create all 6 platform tokens (HTS)
 *   3. Create all 12 platform topics (HCS)
 *   4. Setup platform accounts (operator, treasury, reward pool, sustainability fund)
 *   5. Compile smart contracts (Hardhat)
 *   6. Deploy all 6 smart contracts (HSCS) with empty constructor params
 *   7. Seed standards registry (3 entries)
 *   8. Seed sector benchmarks (15 entries)
 *   9. Log deployment summary
 *
 * NOTE: This script uses path aliases (@/) defined in tsconfig.json.
 * Run with tsx which resolves paths automatically:
 *
 *   npx tsx scripts/deploy.ts
 *
 * Requirements: 3.7, 3.9, 12.1, 13.5, 16.5, 17.3
 */

import * as fs from "fs";
import * as path from "path";
import { TokenId, ContractFunctionParameters } from "@hashgraph/sdk";
import { getClient } from "@/lib/hedera/client";
import { initializeAllTokens, loadTokenId } from "@/services/hts.service";
import type { TokenRegistry } from "@/services/hts.service";
import { initializeAllTopics, loadTopicId, ALL_TOPIC_NAMES } from "@/services/hcs.service";
import type { TopicRegistry } from "@/services/hcs.service";
import { initializePlatformAccounts } from "@/lib/hedera/accounts";
import { deployContract } from "@/services/hscs.service";
import { getValue, setValue } from "@/lib/local-store";
import prisma from "@/lib/prisma";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_TOKEN_SYMBOLS = ["CCR", "CAL", "CSTAMP", "CPASS", "GBT", "VCLAIM"] as const;

const ARTIFACTS_DIR = path.resolve(process.cwd(), "artifacts", "contracts");

/**
 * The 6 new corporate compliance smart contracts.
 * Each entry maps a logical name to its Solidity file and contract name
 * inside the Hardhat artifacts directory.
 */
const CONTRACT_DEFINITIONS = [
  { name: "CompliancePassportManager", solFile: "CompliancePassportManager.sol", contractName: "CompliancePassportManager" },
  { name: "CapTradeManager",           solFile: "CapTradeManager.sol",           contractName: "CapTradeManager" },
  { name: "CreditMarketplace",         solFile: "CreditMarketplace.sol",         contractName: "CreditMarketplace" },
  { name: "RewardDistributor",         solFile: "RewardDistributor.sol",         contractName: "RewardDistributor" },
  { name: "DIDRegistry",               solFile: "DIDRegistry.sol",               contractName: "DIDRegistry" },
  { name: "ClaimsManager",             solFile: "ClaimsManager.sol",             contractName: "ClaimsManager" },
] as const;

const DEFAULT_GAS = 5_000_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads compiled bytecode from the Hardhat artifacts directory.
 * Expects the standard Hardhat artifact JSON format with a `bytecode` field.
 */
function readBytecode(solFile: string, contractName: string): string {
  const artifactPath = path.join(ARTIFACTS_DIR, solFile, `${contractName}.json`);

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `[Deploy] Artifact not found for ${contractName} at ${artifactPath}. ` +
        `Run 'npx hardhat compile' first.`
    );
  }

  const raw = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  if (!raw.bytecode || typeof raw.bytecode !== "string") {
    throw new Error(`[Deploy] No bytecode found in artifact for ${contractName}.`);
  }

  return raw.bytecode.startsWith("0x") ? raw.bytecode : `0x${raw.bytecode}`;
}

/**
 * Attempts to load a full TokenRegistry from persisted config.
 * Returns null if any token is missing.
 */
function loadExistingTokens(): TokenRegistry | null {
  const registry: Partial<TokenRegistry> = {};
  for (const sym of ALL_TOKEN_SYMBOLS) {
    const tid = loadTokenId(sym);
    if (!tid) return null;
    (registry as Record<string, TokenId>)[sym] = tid;
  }
  return registry as TokenRegistry;
}

/**
 * Attempts to load a full TopicRegistry from persisted config.
 * Returns null if any topic is missing.
 */
function loadExistingTopics(): TopicRegistry | null {
  const registry: Partial<TopicRegistry> = {};
  for (const name of ALL_TOPIC_NAMES) {
    const tid = loadTopicId(name);
    if (!tid) return null;
    registry[name] = tid;
  }
  return registry as TopicRegistry;
}

/**
 * Checks if a specific contract has already been deployed.
 */
function isContractDeployed(name: string): boolean {
  return typeof getValue(`contracts.${name}.id`) === "string";
}

// ---------------------------------------------------------------------------
// Seeding helpers
// ---------------------------------------------------------------------------

/**
 * Seeds the StandardsRegistry table with GHG Protocol, ISO 14067, ISO 14040.
 */
async function seedStandardsRegistry(): Promise<void> {
  const standards = [
    {
      standardName: "GHG Protocol",
      version: "Corporate Standard v2",
      description: "The Greenhouse Gas Protocol Corporate Accounting and Reporting Standard for Scope 1-3 emissions",
      applicableModules: ["emissions", "passport", "cap-trade"],
    },
    {
      standardName: "ISO 14067",
      version: "2018",
      description: "Carbon footprint of products — Requirements and guidelines for quantification",
      applicableModules: ["passport", "emissions", "guardian"],
    },
    {
      standardName: "ISO 14040",
      version: "2006",
      description: "Environmental management — Life cycle assessment — Principles and framework",
      applicableModules: ["emissions", "guardian", "supply-chain"],
    },
  ];

  for (const std of standards) {
    await prisma.standardsRegistry.upsert({
      where: { standardName: std.standardName },
      update: {
        version: std.version,
        description: std.description,
        applicableModules: std.applicableModules,
      },
      create: std,
    });
    console.log(`  [Seed] StandardsRegistry: ${std.standardName} (${std.version})`);
  }
}

/**
 * Seeds the SectorBenchmark table with 15 entries (5 sectors × 3 tiers).
 * Benchmark values are in tCO2e, representing typical annual emissions.
 */
async function seedSectorBenchmarks(): Promise<void> {
  const benchmarks: { sector: string; emissionTier: string; benchmarkEmissions: number }[] = [
    // ENERGY — high-emission sector
    { sector: "ENERGY",          emissionTier: "Tier_1", benchmarkEmissions: 500_000 },
    { sector: "ENERGY",          emissionTier: "Tier_2", benchmarkEmissions: 50_000 },
    { sector: "ENERGY",          emissionTier: "Tier_3", benchmarkEmissions: 5_000 },
    // MANUFACTURING
    { sector: "MANUFACTURING",   emissionTier: "Tier_1", benchmarkEmissions: 350_000 },
    { sector: "MANUFACTURING",   emissionTier: "Tier_2", benchmarkEmissions: 40_000 },
    { sector: "MANUFACTURING",   emissionTier: "Tier_3", benchmarkEmissions: 4_000 },
    // TRANSPORTATION
    { sector: "TRANSPORTATION",  emissionTier: "Tier_1", benchmarkEmissions: 250_000 },
    { sector: "TRANSPORTATION",  emissionTier: "Tier_2", benchmarkEmissions: 30_000 },
    { sector: "TRANSPORTATION",  emissionTier: "Tier_3", benchmarkEmissions: 3_500 },
    // AGRICULTURE
    { sector: "AGRICULTURE",     emissionTier: "Tier_1", benchmarkEmissions: 200_000 },
    { sector: "AGRICULTURE",     emissionTier: "Tier_2", benchmarkEmissions: 25_000 },
    { sector: "AGRICULTURE",     emissionTier: "Tier_3", benchmarkEmissions: 3_000 },
    // SERVICES — lowest-emission sector
    { sector: "SERVICES",        emissionTier: "Tier_1", benchmarkEmissions: 150_000 },
    { sector: "SERVICES",        emissionTier: "Tier_2", benchmarkEmissions: 15_000 },
    { sector: "SERVICES",        emissionTier: "Tier_3", benchmarkEmissions: 2_000 },
  ];

  for (const bm of benchmarks) {
    await prisma.sectorBenchmark.upsert({
      where: {
        sector_emissionTier: { sector: bm.sector, emissionTier: bm.emissionTier },
      },
      update: { benchmarkEmissions: bm.benchmarkEmissions },
      create: bm,
    });
    console.log(`  [Seed] SectorBenchmark: ${bm.sector} / ${bm.emissionTier} → ${bm.benchmarkEmissions.toLocaleString()} tCO2e`);
  }
}

// ---------------------------------------------------------------------------
// Main deployment pipeline
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startTime = Date.now();

  console.log("=".repeat(60));
  console.log("  Corporate Carbon Compliance Platform — Full Deployment");
  console.log("=".repeat(60));
  console.log();

  // -----------------------------------------------------------------------
  // Step 1: Initialize Hedera client
  // -----------------------------------------------------------------------
  console.log("[1/9] Initializing Hedera client...");
  await getClient();
  console.log("[1/9] Hedera client ready.\n");

  // -----------------------------------------------------------------------
  // Step 2: Create all 6 platform tokens (or load existing)
  // -----------------------------------------------------------------------
  console.log("[2/9] Creating platform tokens (HTS)...");
  let tokenRegistry = loadExistingTokens();
  if (tokenRegistry) {
    console.log("[2/9] All 6 tokens already exist in config. Skipping creation.\n");
  } else {
    tokenRegistry = await initializeAllTokens();
    console.log("[2/9] All 6 tokens created.\n");
  }

  // -----------------------------------------------------------------------
  // Step 3: Create all 12 platform topics (or load existing)
  // -----------------------------------------------------------------------
  console.log("[3/9] Creating platform topics (HCS)...");
  let topicRegistry = loadExistingTopics();
  if (topicRegistry) {
    console.log("[3/9] All 12 topics already exist in config. Skipping creation.\n");
  } else {
    topicRegistry = await initializeAllTopics();
    console.log("[3/9] All 12 topics created.\n");
  }

  // -----------------------------------------------------------------------
  // Step 4: Setup platform accounts
  // -----------------------------------------------------------------------
  console.log("[4/9] Setting up platform accounts...");
  const accounts = await initializePlatformAccounts();
  console.log("[4/9] All 4 platform accounts configured.\n");

  // -----------------------------------------------------------------------
  // Step 5: Compile smart contracts
  // -----------------------------------------------------------------------
  console.log("[5/9] Compiling smart contracts (Hardhat)...");
  try {
    execSync("npx hardhat compile", { stdio: "inherit" });
  } catch {
    console.error("[5/9] FATAL: Hardhat compilation failed. Aborting deployment.");
    process.exit(1);
  }
  console.log("[5/9] Smart contracts compiled.\n");

  // -----------------------------------------------------------------------
  // Step 6: Deploy all 6 new smart contracts (or skip if already deployed)
  // -----------------------------------------------------------------------
  console.log("[6/9] Deploying smart contracts (HSCS)...");
  const contractRegistry: Record<string, { id: string; evmAddress: string }> = {};

  for (const def of CONTRACT_DEFINITIONS) {
    if (isContractDeployed(def.name)) {
      const existingId = getValue(`contracts.${def.name}.id`) as string;
      const existingEvm = (getValue(`contracts.${def.name}.evmAddress`) as string) || "";
      contractRegistry[def.name] = { id: existingId, evmAddress: existingEvm };
      console.log(`  [HSCS] ${def.name} already deployed (${existingId}). Skipping.`);
      continue;
    }

    const bytecode = readBytecode(def.solFile, def.contractName);
    const result = await deployContract({
      name: def.name,
      bytecode,
      constructorParams: new ContractFunctionParameters(),
      gas: DEFAULT_GAS,
    });

    setValue(`contracts.${def.name}.id`, result.contractId.toString());
    setValue(`contracts.${def.name}.evmAddress`, result.evmAddress);
    contractRegistry[def.name] = {
      id: result.contractId.toString(),
      evmAddress: result.evmAddress,
    };
  }
  console.log("[6/9] All 6 contracts deployed.\n");

  // -----------------------------------------------------------------------
  // Step 7: Seed standards registry
  // -----------------------------------------------------------------------
  console.log("[7/9] Seeding standards registry...");
  await seedStandardsRegistry();
  console.log("[7/9] Standards registry seeded.\n");

  // -----------------------------------------------------------------------
  // Step 8: Seed sector benchmarks
  // -----------------------------------------------------------------------
  console.log("[8/9] Seeding sector benchmarks...");
  await seedSectorBenchmarks();
  console.log("[8/9] Sector benchmarks seeded.\n");

  // -----------------------------------------------------------------------
  // Step 9: Deployment summary
  // -----------------------------------------------------------------------
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("=".repeat(60));
  console.log("  Deployment Complete!");
  console.log("=".repeat(60));
  console.log();
  console.log("  Tokens:");
  for (const [symbol, tokenId] of Object.entries(tokenRegistry)) {
    console.log(`    ${symbol.padEnd(10)} → ${tokenId}`);
  }
  console.log();
  console.log("  Topics:");
  for (const [name, topicId] of Object.entries(topicRegistry)) {
    console.log(`    ${name.padEnd(22)} → ${topicId}`);
  }
  console.log();
  console.log("  Accounts:");
  console.log(`    Operator             → ${accounts.operator.accountId}`);
  console.log(`    Treasury             → ${accounts.treasury.accountId}`);
  console.log(`    Reward Pool          → ${accounts.rewardPool.accountId}`);
  console.log(`    Sustainability Fund  → ${accounts.sustainabilityFund.accountId}`);
  console.log();
  console.log("  Contracts:");
  for (const [name, info] of Object.entries(contractRegistry)) {
    console.log(`    ${name.padEnd(30)} → ${info.id} (${info.evmAddress})`);
  }
  console.log();
  console.log(`  Total time: ${elapsed}s`);
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});
