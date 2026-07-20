import { NextRequest, NextResponse } from "next/server";
import { applyDirectQuoteReadiness, createProviderQuote } from "@/lib/commerce-providers";
import {
  commerceStorageConfigured,
  saveQuoteIdempotently,
} from "@/lib/commerce-store";
import { quoteRequestSchema } from "@/lib/commerce-types";
import { checkRateLimit, rateLimitFailure } from "@/lib/rate-limit";
import { verifyMainnetRuntime } from "@/lib/mainnet-runtime-verification";
import { mainnetAutonomyReady } from "@/lib/mainnet-safety";
import { getServerEnvironment } from "@/lib/server-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit(
    `commerce-quote:${request.headers.get("x-forwarded-for") ?? "unknown"}`,
    { limit: 20, windowMs: 60_000 },
  );
  const failure = rateLimitFailure(rateLimit, "Too many quote requests. Try again shortly.");
  if (failure) return NextResponse.json({ error: failure.error }, { status: failure.status });
  try {
    const input = quoteRequestSchema.parse(await request.json());
    const baseQuote = await createProviderQuote(input);
    const directMainnet = input.chainId === 4663
      && (input.providerId === "direct-onchain" || input.providerId === "recurring-payments");
    const runtime = directMainnet ? await verifyMainnetRuntime() : undefined;
    const quote = applyDirectQuoteReadiness(baseQuote, {
      chainId: input.chainId,
      directMainnetReady: Boolean(runtime && mainnetAutonomyReady(
        getServerEnvironment(),
        runtime.runtimeVerification,
      )),
    });
    if (!commerceStorageConfigured()) {
      return NextResponse.json({
        quote,
        persisted: false,
        disclosure: "Preview only: durable commerce storage is not configured.",
      });
    }
    const saved = await saveQuoteIdempotently(quote, input.idempotencyKey);
    return NextResponse.json({ quote: saved, persisted: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quote creation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
