import { NextRequest, NextResponse } from "next/server";
import { listExecutions, storageConfigured } from "@/lib/agent-store";
import { ruleWalletAddress } from "@/lib/rulewallet-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!storageConfigured()) return NextResponse.json({ executions: [], configured: false });
  try {
    const policyAccount = request.nextUrl.searchParams.get("policyAccount")?.toLowerCase();
    const executions = await listExecutions();
    return NextResponse.json({
      executions: policyAccount
        ? executions.filter(
            (execution) =>
              (execution.policyAccount ?? ruleWalletAddress)?.toLowerCase() === policyAccount,
          )
        : executions,
      configured: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Activity unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
