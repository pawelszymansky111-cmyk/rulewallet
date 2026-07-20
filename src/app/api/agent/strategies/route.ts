import { NextRequest, NextResponse } from "next/server";
import { parseEther } from "viem";
import { verifyAdminAction } from "@/lib/agent-auth";
import { listStrategies, saveStrategy, storageConfigured } from "@/lib/agent-store";
import { signedAdminActionSchema } from "@/lib/agent-types";
import { checkRateLimit, rateLimitFailure } from "@/lib/rate-limit";
import { ruleWalletAddress } from "@/lib/rulewallet-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Strategy request failed.";
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  if (!storageConfigured()) return NextResponse.json({ strategies: [], configured: false });
  try {
    const policyAccount = request.nextUrl.searchParams.get("policyAccount")?.toLowerCase();
    const strategies = await listStrategies();
    return NextResponse.json({
      strategies: policyAccount
        ? strategies.filter(
            (strategy) =>
              (strategy.policyAccount ?? ruleWalletAddress)?.toLowerCase() === policyAccount,
          )
        : strategies,
      configured: true,
    });
  } catch (error) {
    return fail(error, 503);
  }
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(`strategy-create:${request.headers.get("x-forwarded-for") ?? "unknown"}`, {
    limit: 10,
    windowMs: 60_000,
  });
  const failure = rateLimitFailure(limit, "Too many strategy requests.");
  if (failure) return fail(new Error(failure.error), failure.status);
  try {
    const envelope = signedAdminActionSchema.parse(await request.json());
    const { payload, signer } = await verifyAdminAction(envelope.payload, envelope.signature);
    if (payload.action !== "create-strategy") throw new Error("Invalid admin action.");
    const amount = parseEther(payload.amountEth);
    if (amount <= BigInt(0)) throw new Error("Amount must be greater than zero.");
    const strategy = await saveStrategy({
      id: crypto.randomUUID(),
      name: payload.name,
      policyAccount: payload.policyAccount,
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
