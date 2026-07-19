import { NextRequest, NextResponse } from "next/server";
import {
  reconcileLateMainnetConfirmations,
  runDueMainnetStrategies,
} from "@/lib/mainnet-agent-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const reconciled = await reconcileLateMainnetConfirmations();
    const executions = await runDueMainnetStrategies();
    return NextResponse.json({
      ok: true,
      reconciled: reconciled.length,
      attempted: executions.length,
      executions,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Mainnet scheduler failed." },
      { status: 503 },
    );
  }
}
