import { NextResponse } from "next/server";
import { createPublicClient, fallback, http } from "viem";
import { robinhoodMainnet } from "@/lib/chains";
import {
  mainnetFactoryAddress,
  ROBINHOOD_MAINNET_USDG,
  RULEWALLET_V2_VERSION,
  ruleWalletFactoryAbi,
} from "@/lib/mainnet-registry";
import { mainnetSignerStatus } from "@/lib/secure-agent-signer";
import { mainnetAlertsConfigured } from "@/lib/mainnet-monitoring";
import { getServerEnvironment } from "@/lib/server-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const environment = getServerEnvironment();
  const rpcUrls = [
    environment.RH_MAINNET_RPC_URL,
    environment.RH_MAINNET_RPC_FALLBACK_URL,
    robinhoodMainnet.rpcUrls.default.http[0],
  ].filter((value): value is string => Boolean(value));
  const client = createPublicClient({
    chain: robinhoodMainnet,
    transport: fallback(rpcUrls.map((url) => http(url))),
  });
  const [blockNumber, factoryCode, factoryChainId, factoryUsdg, factoryVersion] = await Promise.all([
    client.getBlockNumber().catch(() => undefined),
    mainnetFactoryAddress
      ? client.getCode({ address: mainnetFactoryAddress }).catch(() => undefined)
      : Promise.resolve(undefined),
    mainnetFactoryAddress
      ? client.readContract({ address: mainnetFactoryAddress, abi: ruleWalletFactoryAbi, functionName: "deploymentChainId" }).catch(() => undefined)
      : Promise.resolve(undefined),
    mainnetFactoryAddress
      ? client.readContract({ address: mainnetFactoryAddress, abi: ruleWalletFactoryAbi, functionName: "canonicalStablecoin" }).catch(() => undefined)
      : Promise.resolve(undefined),
    mainnetFactoryAddress
      ? client.readContract({ address: mainnetFactoryAddress, abi: ruleWalletFactoryAbi, functionName: "VERSION" }).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);
  const signer = mainnetSignerStatus();
  const autonomyEnabled = environment.ENABLE_MAINNET_AUTONOMY === "true" && signer.configured;

  return NextResponse.json(
    {
      experimental: true,
      unaudited: true,
      chainId: robinhoodMainnet.id,
      latestBlock: blockNumber?.toString(),
      mainnetUiEnabled: environment.ENABLE_MAINNET === "true",
      factoryAddress: mainnetFactoryAddress,
      factoryVerifiedOnchain: Boolean(
        factoryCode && factoryCode !== "0x" && factoryChainId === BigInt(4663)
          && factoryUsdg === ROBINHOOD_MAINNET_USDG && factoryVersion === RULEWALLET_V2_VERSION,
      ),
      autonomyEnabled,
      alertsConfigured: mainnetAlertsConfigured(),
      signer: {
        configured: signer.configured,
        mode: signer.mode,
        address: signer.address,
        reason: signer.reason,
      },
      executionGuard: autonomyEnabled
        ? "Secure signer configured; policy simulation remains mandatory."
        : "Autonomous mainnet execution is disabled.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
