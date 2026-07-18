import { NextResponse } from "next/server";
import { parseAbi } from "viem";
import { robinhoodMainnet } from "@/lib/chains";
import {
  mainnetFactoryAddress,
  ROBINHOOD_MAINNET_USDG,
} from "@/lib/mainnet-registry";
import { getMainnetPublicClient } from "@/lib/mainnet-clients";
import { verifyPinnedMainnetFactory } from "@/lib/mainnet-verification";
import { mainnetSignerStatus } from "@/lib/secure-agent-signer";
import { mainnetAlertsConfigured } from "@/lib/mainnet-monitoring";
import { getServerEnvironment } from "@/lib/server-env";
import { MAINNET_AUTONOMY_RELEASE_ENABLED, mainnetProductionGates } from "@/lib/mainnet-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const erc20MetadataAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

export async function GET() {
  const environment = getServerEnvironment();
  const client = getMainnetPublicClient();
  const [blockNumber, factoryVerification, usdgSymbol, usdgDecimals] = await Promise.all([
    client.getBlockNumber().catch(() => undefined),
    mainnetFactoryAddress
      ? verifyPinnedMainnetFactory(client, mainnetFactoryAddress).catch(() => undefined)
      : Promise.resolve(undefined),
    client.readContract({ address: ROBINHOOD_MAINNET_USDG, abi: erc20MetadataAbi, functionName: "symbol" }).catch(() => undefined),
    client.readContract({ address: ROBINHOOD_MAINNET_USDG, abi: erc20MetadataAbi, functionName: "decimals" }).catch(() => undefined),
  ]);
  const signer = mainnetSignerStatus();
  const autonomyEnabled = MAINNET_AUTONOMY_RELEASE_ENABLED && environment.ENABLE_MAINNET_AUTONOMY === "true" && signer.configured;

  return NextResponse.json(
    {
      experimental: true,
      unaudited: true,
      chainId: robinhoodMainnet.id,
      latestBlock: blockNumber?.toString(),
      mainnetUiEnabled: environment.ENABLE_MAINNET === "true",
      factoryAddress: mainnetFactoryAddress,
      factoryVerifiedOnchain: factoryVerification?.verified ?? false,
      factoryRuntimeCodeHash: factoryVerification?.runtimeCodeHash,
      canonicalUsdgVerified: usdgSymbol === "USDG" && usdgDecimals === 6,
      canonicalUsdgDecimals: usdgDecimals,
      autonomyEnabled,
      alertsConfigured: mainnetAlertsConfigured(),
      productionGates: mainnetProductionGates(),
      signer: {
        configured: signer.configured,
        mode: signer.mode,
        address: signer.address,
        reason: signer.reason,
      },
      executionGuard: "Autonomous mainnet execution is compile-time disabled for the security beta.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
