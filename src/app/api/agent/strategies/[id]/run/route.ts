import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAction } from "@/lib/agent-auth";
import { executeStrategy } from "@/lib/agent-runner";
import { getStrategy } from "@/lib/agent-store";
import { signedAdminActionSchema } from "@/lib/agent-types";
import { ruleWalletAddress } from "@/lib/rulewallet-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const envelope = signedAdminActionSchema.parse(await request.json());
    const strategy = await getStrategy(id);
    if (!strategy) return NextResponse.json({ error: "Strategy not found." }, { status: 404 });
    const strategyAccount = strategy.policyAccount ?? ruleWalletAddress;
    if (!strategyAccount || envelope.payload.policyAccount.toLowerCase() !== strategyAccount.toLowerCase()) {
      throw new Error("Signed policy account does not match this strategy.");
    }
    const { payload } = await verifyAdminAction(envelope.payload, envelope.signature);
    if (payload.action !== "run-strategy" || payload.strategyId !== id) {
      throw new Error("Signed run action does not match this route.");
    }
    const execution = await executeStrategy(id, "manual");
    return NextResponse.json({ execution });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent execution failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
