import { NextRequest, NextResponse } from "next/server";
import { rewardPolicyCompliance } from "@/services/guardian.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, policyId, reason } = body;
    if (!companyId || !policyId) {
      return NextResponse.json({ success: false, error: { message: "companyId and policyId are required" } }, { status: 400 });
    }
    const result = await rewardPolicyCompliance(companyId, policyId, reason || "Policy compliance reward");
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
