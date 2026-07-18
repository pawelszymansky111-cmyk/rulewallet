import { NextResponse } from "next/server";
import { agentSignerConfigured } from "@/lib/agent-clients";
import { storageConfigured } from "@/lib/agent-store";
import { ruleWalletAddress } from "@/lib/rulewallet-contract";
import { getServerEnvironment } from "@/lib/server-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const environment = getServerEnvironment();
  return NextResponse.json(
    {
      status: "ok",
      service: "rulewallet-web",
      network: "robinhood-chain-testnet",
      chainId: 46_630,
      mainnetEnabled: false,
      policyContractConfigured: Boolean(ruleWalletAddress),
      agentSignerConfigured: agentSignerConfigured(),
      strategyStorageConfigured: storageConfigured(),
      schedulerConfigured: Boolean(process.env.CRON_SECRET),
      rpcMode: environment.RH_TESTNET_RPC_URL ? "managed" : "public-fallback",
      deployment: environment.VERCEL_ENV ?? "local",
      commit: environment.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
