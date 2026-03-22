import prisma from "../src/lib/local-db";

const standards = [
  { standardName: "GHG Protocol", version: "Corporate Standard v2", description: "GHG Protocol Corporate Accounting", applicableModules: ["emissions","passport","cap-trade"] },
  { standardName: "ISO 14067", version: "2018", description: "Carbon footprint of products", applicableModules: ["passport","emissions","guardian"] },
  { standardName: "ISO 14040", version: "2006", description: "Life cycle assessment", applicableModules: ["emissions","guardian","supply-chain"] },
];
const benchmarks = [
  { sector: "ENERGY", emissionTier: "Tier_1", benchmarkEmissions: 500000 },
  { sector: "ENERGY", emissionTier: "Tier_2", benchmarkEmissions: 50000 },
  { sector: "ENERGY", emissionTier: "Tier_3", benchmarkEmissions: 5000 },
  { sector: "MANUFACTURING", emissionTier: "Tier_1", benchmarkEmissions: 350000 },
  { sector: "MANUFACTURING", emissionTier: "Tier_2", benchmarkEmissions: 40000 },
  { sector: "MANUFACTURING", emissionTier: "Tier_3", benchmarkEmissions: 4000 },
  { sector: "TRANSPORTATION", emissionTier: "Tier_1", benchmarkEmissions: 250000 },
  { sector: "TRANSPORTATION", emissionTier: "Tier_2", benchmarkEmissions: 30000 },
  { sector: "TRANSPORTATION", emissionTier: "Tier_3", benchmarkEmissions: 3500 },
  { sector: "AGRICULTURE", emissionTier: "Tier_1", benchmarkEmissions: 200000 },
  { sector: "AGRICULTURE", emissionTier: "Tier_2", benchmarkEmissions: 25000 },
  { sector: "AGRICULTURE", emissionTier: "Tier_3", benchmarkEmissions: 3000 },
  { sector: "SERVICES", emissionTier: "Tier_1", benchmarkEmissions: 150000 },
  { sector: "SERVICES", emissionTier: "Tier_2", benchmarkEmissions: 15000 },
  { sector: "SERVICES", emissionTier: "Tier_3", benchmarkEmissions: 2000 },
];

for (const s of standards) prisma.standardsRegistry.create({ data: s });
for (const b of benchmarks) prisma.sectorBenchmark.create({ data: b });
console.log(`Seeded ${standards.length} standards and ${benchmarks.length} benchmarks`);
