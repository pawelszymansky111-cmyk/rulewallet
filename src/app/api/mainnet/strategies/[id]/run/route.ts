import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyMainnetAdminAction } from "@/lib/mainnet-agent-auth";
import { signedMainnetAdminActionSchema } from "@/lib/mainnet-agent-types";
import { executeMainnetStrategy } from "@/lib/mainnet-agent-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 240;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = checkRateLimit(
    `mainnet-strategy-run:${request.headers.get("x-forwarded-for") ?? "unknown"}`,
    { limit: 5, windowMs: 60_000 },
  );
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  try {
    const { id } = await context.params;
    const envelope = signedMainnetAdminActionSchema.parse(await request.json());
    const { payload } = await verifyMainnetAdminAction(envelope.payload, envelope.signature);
    if (payload.action !== "run-strategy" || payload.strategyId !== id) {
      throw new Error("Invalid owner scheduler action.");
    }
    const execution = await executeMainnetStrategy(id, "manual");
    return NextResponse.json({ execution });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Strategy execution failed." },
      { status: 400 },
    );
  }
}
