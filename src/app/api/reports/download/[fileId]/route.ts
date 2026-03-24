/**
 * GET /api/reports/download/[fileId] — Download an audit report file from HFS.
 *
 * Requirements: 8.7
 */

import { NextRequest, NextResponse } from "next/server";
import { errorResponse, handleApiError } from "@/lib/api";
import { downloadReport } from "@/services/audit.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return errorResponse("File ID is required", 400, { code: "MISSING_FILE_ID" });
    }

    const content = await downloadReport(fileId);

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="report-${fileId}"`,
        "Content-Length": content.length.toString(),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("INVALID_FILE_ID")) {
      return errorResponse("File not found", 404, { code: "FILE_NOT_FOUND" });
    }
    return handleApiError(error);
  }
}
