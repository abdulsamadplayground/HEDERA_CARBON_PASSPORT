import { NextRequest, NextResponse } from "next/server";
import { publishGuardianPolicy } from "@/services/guardian.service";

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await params;
    const result = await publishGuardianPolicy(policyId);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
