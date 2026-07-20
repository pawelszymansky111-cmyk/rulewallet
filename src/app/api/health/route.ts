import { NextResponse } from "next/server";
import { agentSignerConfigured } from "@/lib/agent-clients";
import { storageConfigured } from "@/lib/agent-store";
import { ruleWalletAddress } from "@/lib/rulewallet-contract";
import { getServerEnvironment } from "@/lib/server-env";
import { mainnetSignerStatus } from "@/lib/secure-agent-signer";
import { mainnetAutonomyReady, mainnetProductionGates } from "@/lib/mainnet-safety";
import { verifyMainnetRuntime } from "@/lib/mainnet-runtime-verification";
import { commerceStorageConfigured } from "@/lib/commerce-store";
import { commerceSessionConfigured } from "@/lib/commerce-session";
import { commerceDataEncryptionConfigured } from "@/lib/commerce-data-encryption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const environment = getServerEnvironment();
  const mainnetSigner = mainnetSignerStatus();
  const mainnetRuntime = await verifyMainnetRuntime();
  const productionGates = mainnetProductionGates(environment, mainnetRuntime.runtimeVerification);
  return NextResponse.json(
    {
      status: "ok",
      service: "rulewallet-web",
      network: "robinhood-chain-testnet",
      chainId: 46_630,
      mainnetEnabled: environment.ENABLE_MAINNET === "true",
      mainnetAutonomyEnabled: mainnetAutonomyReady(environment, mainnetRuntime.runtimeVerification),
      mainnetProductionGates: productionGates,
      mainnetProductionStatusEndpoint: "/api/mainnet/status",
      mainnetSignerMode: mainnetSigner.mode,
      policyContractConfigured: Boolean(ruleWalletAddress),
      agentSignerConfigured: agentSignerConfigured(),
      strategyStorageConfigured: storageConfigured(),
      commerce: {
        storageConfigured: commerceStorageConfigured(),
        sessionConfigured: commerceSessionConfigured(),
        encryptionConfigured: commerceDataEncryptionConfigured(),
      },
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
