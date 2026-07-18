import { NextResponse } from "next/server";
import { listMainnetExecutions } from "@/lib/mainnet-agent-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(
      { executions: await listMainnetExecutions(50) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution history unavailable." },
      { status: 503 },
    );
  }
}
