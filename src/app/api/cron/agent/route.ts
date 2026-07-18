import { NextRequest, NextResponse } from "next/server";
import { runDueStrategies } from "@/lib/agent-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const executions = await runDueStrategies();
    return NextResponse.json({ ok: true, processed: executions.length, executions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scheduled run failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
