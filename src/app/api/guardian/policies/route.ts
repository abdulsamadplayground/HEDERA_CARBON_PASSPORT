import { NextRequest, NextResponse } from "next/server";
import { listGuardianPolicies, createGuardianPolicy } from "@/services/guardian.service";

export async function GET() {
  try {
    const policies = await listGuardianPolicies();
    return NextResponse.json({ success: true, data: policies });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, topicDescription, policyTag } = body;
    if (!name || !description) {
      return NextResponse.json({ success: false, error: { message: "name and description are required" } }, { status: 400 });
    }
    const policy = await createGuardianPolicy({ name, description, topicDescription, policyTag });
    return NextResponse.json({ success: true, data: policy });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
