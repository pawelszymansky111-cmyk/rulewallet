import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { z } from "zod";
import {
  clearCommerceSessionCookie,
  commerceSessionConfigured,
  commerceSessionCookie,
  createCommerceChallenge,
  createCommerceSessionToken,
  setCommerceSessionCookie,
  verifyCommerceChallenge,
  verifyCommerceSessionToken,
} from "@/lib/commerce-session";
import { commerceStorageConfigured } from "@/lib/commerce-store";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  address: z.string().refine(isAddress),
  message: z.string().min(40).max(2_000),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
});

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Enter a valid owner address." }, { status: 400 });
  }
  const existing = verifyCommerceSessionToken(request.cookies.get(commerceSessionCookie)?.value);
  if (existing?.address.toLowerCase() === address.toLowerCase()) {
    return NextResponse.json({ authenticated: true, address: existing.address, expiresAt: existing.expiresAt });
  }
  if (!commerceStorageConfigured()) {
    return NextResponse.json({ error: "Durable storage is required for replay-safe commerce login." }, { status: 503 });
  }
  if (!commerceSessionConfigured()) {
    return NextResponse.json({ error: "The server-only commerce session secret is not configured." }, { status: 503 });
  }
  const limit = checkRateLimit(`commerce-session:${request.headers.get("x-forwarded-for") ?? "unknown"}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) return NextResponse.json({ error: "Too many login attempts. Try again shortly." }, { status: 429 });
  try {
    const challenge = await createCommerceChallenge(address, request.nextUrl.origin);
    return NextResponse.json({ authenticated: false, ...challenge });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create login challenge." }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await request.json());
    const address = await verifyCommerceChallenge({ ...input, signature: input.signature as `0x${string}` });
    const response = NextResponse.json({ authenticated: true, address });
    setCommerceSessionCookie(response, createCommerceSessionToken(address));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Commerce login failed." }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  clearCommerceSessionCookie(response);
  return response;
}
