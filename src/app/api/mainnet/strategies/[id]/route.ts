import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitFailure } from "@/lib/rate-limit";
import { verifyMainnetAdminAction } from "@/lib/mainnet-agent-auth";
import { publicStrategy, signedMainnetAdminActionSchema } from "@/lib/mainnet-agent-types";
import { setMainnetStrategyActive } from "@/lib/mainnet-agent-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = await checkRateLimit(
    `mainnet-strategy-update:${request.headers.get("x-forwarded-for") ?? "unknown"}`,
    { limit: 20, windowMs: 60_000 },
  );
  const failure = rateLimitFailure(limit, "Rate limit exceeded.");
  if (failure) return NextResponse.json({ error: failure.error }, { status: failure.status });

  try {
    const { id } = await context.params;
    const envelope = signedMainnetAdminActionSchema.parse(await request.json());
    const { payload } = await verifyMainnetAdminAction(envelope.payload, envelope.signature);
    if (payload.action !== "set-strategy-active" || payload.strategyId !== id) {
      throw new Error("Invalid owner scheduler action.");
    }
    const strategy = await setMainnetStrategyActive(id, payload.active);
    return NextResponse.json({ strategy: publicStrategy(strategy) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Strategy update failed." },
      { status: 400 },
    );
  }
}
