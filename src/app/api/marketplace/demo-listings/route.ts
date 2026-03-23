/**
 * POST /api/marketplace/demo-listings — Seed demo marketplace listings.
 * 
 * Creates external demo companies (not owned by the user) with surplus
 * carbon emissions, then lists their surplus CCR on the marketplace.
 * This allows the user's own companies to purchase credits without
 * hitting the "cannot buy own listing" error.
 */

import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api";
import prisma from "@/lib/prisma";

const DEMO_COMPANIES = [
  {
    companyName: "GreenTech Solutions Ltd",
    sector: "Manufacturing",
    revenueRange: "100M_1B",
    baselineEmissions: 45000,
    emissionTier: "Tier_2",
    carbonScore: "B",
    policyFrameworks: ["PARIS_AGREEMENT", "EU_ETS"],
    surplusCAL: 6200,
    ccrEarned: 850,
  },
  {
    companyName: "Nordic Wind Energy AS",
    sector: "Energy",
    revenueRange: "10M_100M",
    baselineEmissions: 3200,
    emissionTier: "Tier_3",
    carbonScore: "A",
    policyFrameworks: ["PARIS_AGREEMENT", "EU_ETS", "GOLD_STANDARD"],
    surplusCAL: 4100,
    ccrEarned: 2200,
  },
  {
    companyName: "Pacific Freight Corp",
    sector: "Transportation",
    revenueRange: "OVER_1B",
    baselineEmissions: 180000,
    emissionTier: "Tier_1",
    carbonScore: "C",
    policyFrameworks: ["PARIS_AGREEMENT", "CORSIA"],
    surplusCAL: 18000,
    ccrEarned: 500,
  },
  {
    companyName: "BioHarvest Agriculture",
    sector: "Agriculture",
    revenueRange: "10M_100M",
    baselineEmissions: 8500,
    emissionTier: "Tier_3",
    carbonScore: "A",
    policyFrameworks: ["PARIS_AGREEMENT", "VERRA"],
    surplusCAL: 3800,
    ccrEarned: 1600,
  },
  {
    companyName: "CleanAir Services GmbH",
    sector: "Services",
    revenueRange: "UNDER_10M",
    baselineEmissions: 1200,
    emissionTier: "Tier_3",
    carbonScore: "A",
    policyFrameworks: ["PARIS_AGREEMENT", "EU_ETS", "GOLD_STANDARD"],
    surplusCAL: 4500,
    ccrEarned: 3100,
  },
  {
    companyName: "SteelWorks International",
    sector: "Manufacturing",
    revenueRange: "OVER_1B",
    baselineEmissions: 250000,
    emissionTier: "Tier_1",
    carbonScore: "D",
    policyFrameworks: ["PARIS_AGREEMENT", "EU_ETS", "CBAM"],
    surplusCAL: 12000,
    ccrEarned: 100,
  },
];

export async function POST(_request: NextRequest) {
  try {
    const createdCompanies = [];
    const createdListings = [];
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < DEMO_COMPANIES.length; i++) {
      const demo = DEMO_COMPANIES[i];
      // Use a deterministic fake Hedera account ID for each demo company
      const fakeHederaId = `0.0.99${(i + 1).toString().padStart(4, "0")}`;

      // Check if this demo company already exists (by Hedera ID)
      let company = await prisma.company.findUnique({
        where: { hederaAccountId: fakeHederaId },
      });

      if (!company) {
        // Create the demo company directly in DB (no Hedera calls)
        company = await prisma.company.create({
          data: {
            companyName: demo.companyName,
            hederaAccountId: fakeHederaId,
            did: `did:hedera:testnet:demo-${fakeHederaId.replace(/\./g, "-")}`,
            sector: demo.sector,
            revenueRange: demo.revenueRange,
            baselineEmissions: demo.baselineEmissions,
            emissionTier: demo.emissionTier,
            carbonScore: demo.carbonScore,
            policyFrameworks: demo.policyFrameworks,
          },
        });
      }

      createdCompanies.push({
        id: company.id,
        companyName: company.companyName,
        sector: company.sector,
        emissionTier: company.emissionTier,
        carbonScore: company.carbonScore,
        hederaAccountId: company.hederaAccountId,
      });

      // Create CAL allocation for current period
      const currentPeriod = now.getFullYear().toString();
      const existingAllocation = await prisma.allocation.findUnique({
        where: { companyId_compliancePeriod: { companyId: company.id, compliancePeriod: currentPeriod } },
      });

      if (!existingAllocation) {
        const tierAllocation: Record<string, number> = { Tier_1: 80000, Tier_2: 15000, Tier_3: 5000 };
        const allocated = tierAllocation[company.emissionTier] || 15000;
        const used = allocated - demo.surplusCAL;

        await prisma.allocation.create({
          data: {
            companyId: company.id,
            compliancePeriod: currentPeriod,
            allocatedAmount: allocated,
            usedAmount: used,
            surplus: demo.surplusCAL,
            deficit: 0,
            status: "COMPLIANT",
            transactionId: `demo-alloc-${company.id}-${currentPeriod}`,
          },
        });
      }

      // Create marketplace listings for this demo company
      // Primary listing — compliance market (larger portion of surplus)
      const complianceQty = Math.floor(demo.surplusCAL * 0.5);
      const pricePerCCR = demo.emissionTier === "Tier_3" ? 32 : demo.emissionTier === "Tier_2" ? 22 : 15;

      const listing1 = await prisma.marketplaceListing.create({
        data: {
          sellerCompanyId: company.id,
          quantity: complianceQty,
          pricePerCCR,
          marketType: "COMPLIANCE",
          status: "ACTIVE",
          expiresAt: new Date(now.getTime() + thirtyDays),
        },
      });

      createdListings.push({
        id: listing1.id,
        seller: demo.companyName,
        quantity: complianceQty,
        pricePerCCR,
        marketType: "COMPLIANCE",
        totalValue: complianceQty * pricePerCCR,
      });

      // Secondary listing — voluntary market (smaller portion)
      const voluntaryQty = Math.floor(demo.surplusCAL * 0.25);
      const volPrice = pricePerCCR + 8;

      const listing2 = await prisma.marketplaceListing.create({
        data: {
          sellerCompanyId: company.id,
          quantity: voluntaryQty,
          pricePerCCR: volPrice,
          marketType: "VOLUNTARY",
          status: "ACTIVE",
          expiresAt: new Date(now.getTime() + thirtyDays),
        },
      });

      createdListings.push({
        id: listing2.id,
        seller: demo.companyName,
        quantity: voluntaryQty,
        pricePerCCR: volPrice,
        marketType: "VOLUNTARY",
        totalValue: voluntaryQty * volPrice,
      });
    }

    return successResponse({
      message: `Created ${DEMO_COMPANIES.length} external demo companies with ${createdListings.length} marketplace listings`,
      companies: createdCompanies,
      listings: createdListings,
    }, 201);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
