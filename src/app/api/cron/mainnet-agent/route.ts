import { NextRequest, NextResponse } from "next/server";
import { MAINNET_AUTONOMY_RELEASE_ENABLED } from "@/lib/mainnet-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!MAINNET_AUTONOMY_RELEASE_ENABLED) return NextResponse.json({ ok: false, error: "Mainnet autonomy is compile-time disabled in this release." }, { status: 423 });
  return NextResponse.json({ ok: false, error: "No autonomous mainnet runner is enabled." }, { status: 423 });
}
