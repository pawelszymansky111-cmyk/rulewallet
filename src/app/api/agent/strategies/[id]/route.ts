import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAction } from "@/lib/agent-auth";
import { getStrategy, saveStrategy } from "@/lib/agent-store";
import { signedAdminActionSchema } from "@/lib/agent-types";
import { ruleWalletAddress } from "@/lib/rulewallet-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
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
    if (payload.action !== "set-strategy-active" || payload.strategyId !== id) {
      throw new Error("Signed strategy action does not match this route.");
    }
    const updated = await saveStrategy({
      ...strategy,
      active: payload.active,
      nextRunAt: payload.active ? new Date().toISOString() : strategy.nextRunAt,
    });
    return NextResponse.json({ strategy: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Strategy update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
