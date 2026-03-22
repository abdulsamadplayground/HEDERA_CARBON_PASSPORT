/**
 * Audit Module for the Corporate Carbon Compliance Platform.
 *
 * Provides anomaly detection on emissions history, compliance report
 * generation in PDF/CSV/JSON formats, HFS storage, and HCS event
 * submission for audit trail.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

import { FileId } from "@hashgraph/sdk";
import prisma from "@/lib/prisma";
import { uploadFile, getFileContents } from "@/services/hfs.service";
import { loadTopicId, submitMessage } from "@/services/hcs.service";
import type { EmissionsRecord, AuditReport } from "@/lib/local-db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportFormat = "PDF" | "CSV" | "JSON";
export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH";
export type AnomalyType = "SPIKE" | "DATA_GAP" | "STATISTICAL_OUTLIER";

export interface Anomaly {
  type: AnomalyType;
  affectedPeriod: string;
  severity: AnomalySeverity;
  description: string;
}

export interface AuditReportData {
  companyId: string;
  companyDid: string;
  emissionsSummary: { scope: number; totalTCO2e: number }[];
  complianceStatus: string;
  carbonScore: string;
  cstampHistory: { id: string; milestoneDescription: string; certificationDate: string; expiryDate: string; credentialHash: string | null }[];
  calUsage: { allocated: number; used: number; surplus: number; deficit: number; status: string };
  ccrTransactions: { id: string; quantity: number; totalPrice: number; createdAt: string }[];
  verifiableClaims: { id: string; claimType: string; status: string; credentialHash: string | null }[];
  policyAlignment: { frameworkName: string; complianceScore: number; status: string }[];
  anomalies: Anomaly[];
  standardsReferences: string[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Anomaly Detection
// ---------------------------------------------------------------------------

/**
 * Parses a reporting period string (e.g. "2025-H1") into a sortable
 * numeric value for chronological ordering.
 */
function periodToSortKey(period: string): number {
  const match = period.match(/^(\d{4})-H([12])$/);
  if (!match) return 0;
  return parseInt(match[1]) * 10 + parseInt(match[2]);
}

/**
 * Detects anomalies in a company's emissions history.
 *
 * Flags:
 * - SPIKE: >20% month-over-month increase in totalTCO2e
 * - DATA_GAP: missing expected reporting periods
 * - STATISTICAL_OUTLIER: values >2 standard deviations from rolling mean
 *
 * Each anomaly includes type, affectedPeriod, severity, and description.
 *
 * Requirements: 8.3, 8.4
 */
export function detectAnomalies(emissionsHistory: EmissionsRecord[]): Anomaly[] {
  if (emissionsHistory.length === 0) return [];

  const anomalies: Anomaly[] = [];

  // Sort chronologically by reporting period
  const sorted = [...emissionsHistory].sort(
    (a, b) => periodToSortKey(a.reportingPeriod) - periodToSortKey(b.reportingPeriod)
  );

  // --- Spike detection: >20% MoM increase ---
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].totalTCO2e;
    const curr = sorted[i].totalTCO2e;
    if (prev > 0 && curr > prev * 1.2) {
      const pctIncrease = (((curr - prev) / prev) * 100).toFixed(1);
      anomalies.push({
        type: "SPIKE",
        affectedPeriod: sorted[i].reportingPeriod,
        severity: curr > prev * 1.5 ? "HIGH" : "MEDIUM",
        description: `Emissions increased ${pctIncrease}% from ${sorted[i - 1].reportingPeriod} (${prev.toFixed(2)} tCO2e) to ${sorted[i].reportingPeriod} (${curr.toFixed(2)} tCO2e)`,
      });
    }
  }

  // --- Data gap detection: missing half-year periods ---
  if (sorted.length >= 2) {
    const firstKey = periodToSortKey(sorted[0].reportingPeriod);
    const lastKey = periodToSortKey(sorted[sorted.length - 1].reportingPeriod);
    const existingPeriods = new Set(sorted.map((r) => r.reportingPeriod));

    let year = Math.floor(firstKey / 10);
    let half = firstKey % 10;

    while (year * 10 + half <= lastKey) {
      const period = `${year}-H${half}`;
      if (!existingPeriods.has(period)) {
        anomalies.push({
          type: "DATA_GAP",
          affectedPeriod: period,
          severity: "HIGH",
          description: `Missing emissions submission for reporting period ${period}`,
        });
      }
      if (half === 1) {
        half = 2;
      } else {
        half = 1;
        year++;
      }
    }
  }

  // --- Statistical outlier detection: >2σ from rolling mean ---
  if (sorted.length >= 3) {
    const values = sorted.map((r) => r.totalTCO2e);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 0) {
      for (const record of sorted) {
        const deviation = Math.abs(record.totalTCO2e - mean);
        if (deviation > 2 * stdDev) {
          anomalies.push({
            type: "STATISTICAL_OUTLIER",
            affectedPeriod: record.reportingPeriod,
            severity: deviation > 3 * stdDev ? "HIGH" : "LOW",
            description: `Emissions value ${record.totalTCO2e.toFixed(2)} tCO2e is ${(deviation / stdDev).toFixed(1)} standard deviations from the mean (${mean.toFixed(2)} tCO2e)`,
          });
        }
      }
    }
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// Report Formatting
// ---------------------------------------------------------------------------

/** Formats report data as a JSON string. */
function formatAsJson(data: AuditReportData): string {
  return JSON.stringify(data, null, 2);
}

/** Formats report data as CSV. */
function formatAsCsv(data: AuditReportData): string {
  const lines: string[] = [];

  lines.push("Section,Field,Value");
  lines.push(`Company,ID,${data.companyId}`);
  lines.push(`Company,DID,${data.companyDid}`);
  lines.push(`Company,Carbon Score,${data.carbonScore}`);
  lines.push(`Company,Compliance Status,${data.complianceStatus}`);

  for (const scope of data.emissionsSummary) {
    lines.push(`Emissions,Scope ${scope.scope},${scope.totalTCO2e}`);
  }

  lines.push(`CAL Usage,Allocated,${data.calUsage.allocated}`);
  lines.push(`CAL Usage,Used,${data.calUsage.used}`);
  lines.push(`CAL Usage,Surplus,${data.calUsage.surplus}`);
  lines.push(`CAL Usage,Deficit,${data.calUsage.deficit}`);
  lines.push(`CAL Usage,Status,${data.calUsage.status}`);

  for (const tx of data.ccrTransactions) {
    lines.push(`CCR Transaction,${tx.id},qty=${tx.quantity} price=${tx.totalPrice}`);
  }

  for (const stamp of data.cstampHistory) {
    lines.push(`Stamp,${stamp.id},${stamp.milestoneDescription}`);
  }

  for (const claim of data.verifiableClaims) {
    lines.push(`Claim,${claim.claimType},${claim.status}`);
  }

  for (const pa of data.policyAlignment) {
    lines.push(`Policy,${pa.frameworkName},score=${pa.complianceScore} status=${pa.status}`);
  }

  for (const anomaly of data.anomalies) {
    lines.push(`Anomaly,${anomaly.type},${anomaly.affectedPeriod} (${anomaly.severity}): ${anomaly.description}`);
  }

  return lines.join("\n");
}

/**
 * Formats report data as a simple text-based PDF representation.
 * In production this would use a PDF library; for testnet we produce
 * a structured text document with a PDF-like header.
 */
function formatAsPdf(data: AuditReportData): string {
  const lines: string[] = [];

  lines.push("=== CORPORATE CARBON COMPLIANCE AUDIT REPORT ===");
  lines.push("");
  lines.push(`Company ID: ${data.companyId}`);
  lines.push(`Company DID: ${data.companyDid}`);
  lines.push(`Carbon Score: ${data.carbonScore}`);
  lines.push(`Compliance Status: ${data.complianceStatus}`);
  lines.push(`Generated At: ${data.generatedAt}`);
  lines.push("");

  lines.push("--- EMISSIONS SUMMARY ---");
  for (const scope of data.emissionsSummary) {
    lines.push(`  Scope ${scope.scope}: ${scope.totalTCO2e.toFixed(2)} tCO2e`);
  }
  lines.push("");

  lines.push("--- CAL USAGE ---");
  lines.push(`  Allocated: ${data.calUsage.allocated}`);
  lines.push(`  Used: ${data.calUsage.used}`);
  lines.push(`  Surplus: ${data.calUsage.surplus}`);
  lines.push(`  Deficit: ${data.calUsage.deficit}`);
  lines.push(`  Status: ${data.calUsage.status}`);
  lines.push("");

  if (data.ccrTransactions.length > 0) {
    lines.push("--- CCR TRANSACTIONS ---");
    for (const tx of data.ccrTransactions) {
      lines.push(`  ${tx.id}: qty=${tx.quantity}, price=${tx.totalPrice}`);
    }
    lines.push("");
  }

  if (data.cstampHistory.length > 0) {
    lines.push("--- COMPLIANCE STAMPS ---");
    for (const stamp of data.cstampHistory) {
      lines.push(`  ${stamp.milestoneDescription} (${stamp.certificationDate})`);
    }
    lines.push("");
  }

  if (data.verifiableClaims.length > 0) {
    lines.push("--- VERIFIABLE CLAIMS ---");
    for (const claim of data.verifiableClaims) {
      lines.push(`  ${claim.claimType}: ${claim.status}`);
    }
    lines.push("");
  }

  if (data.policyAlignment.length > 0) {
    lines.push("--- POLICY ALIGNMENT ---");
    for (const pa of data.policyAlignment) {
      lines.push(`  ${pa.frameworkName}: score=${pa.complianceScore}, status=${pa.status}`);
    }
    lines.push("");
  }

  if (data.anomalies.length > 0) {
    lines.push("--- ANOMALIES ---");
    for (const anomaly of data.anomalies) {
      lines.push(`  [${anomaly.severity}] ${anomaly.type} — ${anomaly.affectedPeriod}: ${anomaly.description}`);
    }
    lines.push("");
  }

  if (data.standardsReferences.length > 0) {
    lines.push("--- STANDARDS REFERENCES ---");
    for (const ref of data.standardsReferences) {
      lines.push(`  ${ref}`);
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

/**
 * Generates a compliance audit report for a company:
 * 1. Fetch company profile (with DID, carbon score)
 * 2. Fetch emissions records, stamps, allocations, CCR transactions,
 *    verifiable claims, policy alignments
 * 3. Run anomaly detection on emissions history
 * 4. Build AuditReportData
 * 5. Format report in requested format (PDF/CSV/JSON)
 * 6. Store report file on HFS
 * 7. Persist AuditReport + HederaFile records in DB
 * 8. Submit HCS event to AuditReports topic
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export async function generateReport(
  companyId: string,
  format: ReportFormat
): Promise<{ reportId: string; hfsFileId: string }> {
  // 1. Fetch company
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw new Error(`[Audit] Company not found: ${companyId}`);
  }

  // 2. Fetch related data
  const [emissions, passports, allocations, claims, policyAlignments] =
    await Promise.all([
      prisma.emissionsRecord.findMany({
        where: { companyId },
      }),
      prisma.carbonPassport.findMany({
        where: { companyId },
      }),
      prisma.allocation.findMany({
        where: { companyId },
      }),
      prisma.verifiableClaim.findMany({
        where: { companyId },
      }),
      prisma.policyAlignment.findMany({
        where: { companyId },
      }),
    ]);

  // Manually join stamps for each passport
  const allStamps = await prisma.complianceStamp.findMany({});
  const passportStamps = allStamps.filter((s: { passportId: string }) =>
    passports.some((p: { id: string }) => p.id === s.passportId)
  );

  // Fetch marketplace transactions for this company (buyer or seller)
  const allTx = await prisma.marketplaceTransaction.findMany({});
  const ccrTransactions = allTx.filter(
    (t: { buyerCompanyId: string; sellerCompanyId: string }) =>
      t.buyerCompanyId === companyId || t.sellerCompanyId === companyId
  );

  // Flatten stamps from all passports
  const allStampsForReport = passportStamps;

  // 3. Run anomaly detection
  const anomalies = detectAnomalies(emissions);

  // Build emissions summary by scope
  const scopeTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const record of emissions) {
    scopeTotals[1] += record.scope1TCO2e;
    scopeTotals[2] += record.scope2TCO2e;
    scopeTotals[3] += record.scope3TCO2e;
  }

  // Build CAL usage from latest allocation
  const latestAllocation = allocations[0];
  const calUsage = latestAllocation
    ? {
        allocated: latestAllocation.allocatedAmount,
        used: latestAllocation.usedAmount,
        surplus: latestAllocation.surplus,
        deficit: latestAllocation.deficit,
        status: latestAllocation.status,
      }
    : { allocated: 0, used: 0, surplus: 0, deficit: 0, status: "PENDING" };

  // Collect standards references from emissions records
  const standardsRefs: string[] = [];
  for (const record of emissions) {
    if (record.standardsReference) {
      try {
        const ref = JSON.parse(record.standardsReference);
        if (ref.ghgProtocolVersion && !standardsRefs.includes(ref.ghgProtocolVersion)) {
          standardsRefs.push(ref.ghgProtocolVersion);
        }
      } catch {
        // skip malformed references
      }
    }
  }

  // Determine compliance status
  const complianceStatus =
    calUsage.deficit > 0
      ? "NON_COMPLIANT"
      : calUsage.allocated > 0
        ? "COMPLIANT"
        : "PENDING";

  // 4. Build AuditReportData
  const reportData: AuditReportData = {
    companyId: company.id,
    companyDid: company.did ?? "",
    emissionsSummary: [
      { scope: 1, totalTCO2e: scopeTotals[1] },
      { scope: 2, totalTCO2e: scopeTotals[2] },
      { scope: 3, totalTCO2e: scopeTotals[3] },
    ],
    complianceStatus,
    carbonScore: company.carbonScore ?? "N/A",
    cstampHistory: allStampsForReport.map((s: { id: string; milestoneDescription: string; certificationDate: Date | string; expiryDate: Date | string; credentialHash: string | null }) => ({
      id: s.id,
      milestoneDescription: s.milestoneDescription,
      certificationDate: typeof s.certificationDate === 'string' ? s.certificationDate : s.certificationDate.toISOString(),
      expiryDate: typeof s.expiryDate === 'string' ? s.expiryDate : s.expiryDate.toISOString(),
      credentialHash: s.credentialHash,
    })),
    calUsage,
    ccrTransactions: ccrTransactions.map((tx) => ({
      id: tx.id,
      quantity: tx.quantity,
      totalPrice: tx.totalPrice,
      createdAt: tx.createdAt.toISOString(),
    })),
    verifiableClaims: claims.map((c) => ({
      id: c.id,
      claimType: c.claimType,
      status: c.status,
      credentialHash: c.credentialHash,
    })),
    policyAlignment: policyAlignments.map((pa) => ({
      frameworkName: pa.frameworkName,
      complianceScore: pa.complianceScore,
      status: pa.status,
    })),
    anomalies,
    standardsReferences: standardsRefs,
    generatedAt: new Date().toISOString(),
  };

  // 5. Format report
  let reportContent: string;
  switch (format) {
    case "JSON":
      reportContent = formatAsJson(reportData);
      break;
    case "CSV":
      reportContent = formatAsCsv(reportData);
      break;
    case "PDF":
      reportContent = formatAsPdf(reportData);
      break;
  }

  // 6. Store report file on HFS
  const reportBuffer = Buffer.from(reportContent, "utf-8");
  const fileId = await uploadFile(
    reportBuffer,
    `Audit report: ${companyId} (${format})`
  );
  const hfsFileId = fileId.toString();

  // 7. Persist AuditReport + HederaFile in DB
  const auditReport = await prisma.auditReport.create({
    data: {
      companyId,
      reportType: "COMPLIANCE_REPORT",
      format,
      hfsFileId,
      anomalyCount: anomalies.length,
    },
  });

  await prisma.hederaFile.create({
    data: {
      fileId: hfsFileId,
      fileType: "AUDIT_REPORT",
      associatedEntity: auditReport.id,
    },
  });

  // 8. Submit HCS event
  const topicId = loadTopicId("AuditReports");
  if (topicId) {
    await submitMessage(topicId, {
      timestamp: new Date().toISOString(),
      eventType: "REPORT_GENERATED",
      payload: {
        reportId: auditReport.id,
        companyId,
        companyDid: company.did ?? "",
        reportType: "COMPLIANCE_REPORT",
        format,
        hfsFileId,
        anomalyCount: anomalies.length,
      },
    });
  }

  return { reportId: auditReport.id, hfsFileId };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Retrieves audit report metadata for a company.
 *
 * Requirements: 8.7
 */
export async function getReportMetadata(companyId: string): Promise<AuditReport[]> {
  return prisma.auditReport.findMany({
    where: { companyId },
    orderBy: { generatedAt: "desc" },
  });
}

/**
 * Downloads a report file from HFS by its file ID.
 *
 * Requirements: 8.7
 */
export async function downloadReport(fileId: string): Promise<Buffer> {
  const hederaFileId = FileId.fromString(fileId);
  return getFileContents(hederaFileId);
}
