import { NextRequest, NextResponse } from "next/server";
import { parseEther } from "viem";
import { verifyAdminAction } from "@/lib/agent-auth";
import { listStrategies, saveStrategy, storageConfigured } from "@/lib/agent-store";
import { signedAdminActionSchema } from "@/lib/agent-types";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Strategy request failed.";
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  if (!storageConfigured()) return NextResponse.json({ strategies: [], configured: false });
  try {
    return NextResponse.json({ strategies: await listStrategies(), configured: true });
  } catch (error) {
    return fail(error, 503);
  }
}

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`strategy-create:${request.headers.get("x-forwarded-for") ?? "unknown"}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) return fail(new Error("Too many strategy requests."), 429);
  try {
    const envelope = signedAdminActionSchema.parse(await request.json());
    const { payload, signer } = await verifyAdminAction(envelope.payload, envelope.signature);
    if (payload.action !== "create-strategy") throw new Error("Invalid admin action.");
    const amount = parseEther(payload.amountEth);
    if (amount <= BigInt(0)) throw new Error("Amount must be greater than zero.");
    const strategy = await saveStrategy({
      id: crypto.randomUUID(),
      name: payload.name,
      target: payload.target,
      amountEth: payload.amountEth,
      cadenceHours: payload.cadenceHours,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: signer,
      nextRunAt: new Date().toISOString(),
    });
    return NextResponse.json({ strategy }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
