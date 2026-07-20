import { NextRequest, NextResponse } from "next/server";
import { createProviderQuote } from "@/lib/commerce-providers";
import {
  commerceStorageConfigured,
  saveQuoteIdempotently,
} from "@/lib/commerce-store";
import { quoteRequestSchema } from "@/lib/commerce-types";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(
    `commerce-quote:${request.headers.get("x-forwarded-for") ?? "unknown"}`,
    { limit: 20, windowMs: 60_000 },
  );
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many quote requests. Try again shortly." }, { status: 429 });
  }
  try {
    const input = quoteRequestSchema.parse(await request.json());
    const quote = await createProviderQuote(input);
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
