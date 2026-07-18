import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAction } from "@/lib/agent-auth";
import { executeStrategy } from "@/lib/agent-runner";
import { signedAdminActionSchema } from "@/lib/agent-types";

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
