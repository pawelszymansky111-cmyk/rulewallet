import { NextRequest, NextResponse } from "next/server";
import { runDueMainnetStrategies } from "@/lib/mainnet-agent-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const executions = await runDueMainnetStrategies();
    return NextResponse.json({ ok: true, executions: executions.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mainnet scheduler failed." }, { status: 503 });
  }
}
