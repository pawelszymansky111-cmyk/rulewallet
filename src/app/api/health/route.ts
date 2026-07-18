import { NextResponse } from "next/server";
import { agentSignerConfigured } from "@/lib/agent-clients";
import { storageConfigured } from "@/lib/agent-store";
import { ruleWalletAddress } from "@/lib/rulewallet-contract";
import { getServerEnvironment } from "@/lib/server-env";
import { mainnetSignerStatus } from "@/lib/secure-agent-signer";
import { MAINNET_AUTONOMY_RELEASE_ENABLED, mainnetProductionGates } from "@/lib/mainnet-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const environment = getServerEnvironment();
  const mainnetSigner = mainnetSignerStatus();
  return NextResponse.json(
    {
      status: "ok",
      service: "rulewallet-web",
      network: "robinhood-chain-testnet",
      chainId: 46_630,
      mainnetEnabled: environment.ENABLE_MAINNET === "true",
      mainnetAutonomyEnabled:
        MAINNET_AUTONOMY_RELEASE_ENABLED && environment.ENABLE_MAINNET_AUTONOMY === "true" && mainnetSigner.configured,
      mainnetProductionGates: mainnetProductionGates(),
      mainnetSignerMode: mainnetSigner.mode,
      policyContractConfigured: Boolean(ruleWalletAddress),
      agentSignerConfigured: agentSignerConfigured(),
      strategyStorageConfigured: storageConfigured(),
      schedulerConfigured: Boolean(process.env.CRON_SECRET),
      rpcMode: {
        testnet: environment.RH_TESTNET_RPC_URL ? "managed-failover" : "public-fallback",
        mainnet: environment.RH_MAINNET_RPC_URL ? "managed-failover" : "public-fallback",
      },
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
