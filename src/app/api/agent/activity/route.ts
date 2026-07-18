import { NextResponse } from "next/server";
import { listExecutions, storageConfigured } from "@/lib/agent-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!storageConfigured()) return NextResponse.json({ executions: [], configured: false });
  try {
    return NextResponse.json({ executions: await listExecutions(), configured: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Activity unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
