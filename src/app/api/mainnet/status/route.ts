import { NextResponse } from "next/server";
import { parseAbi } from "viem";
import { robinhoodMainnet } from "@/lib/chains";
import {
  mainnetFactoryAddress,
  ROBINHOOD_MAINNET_USDG,
} from "@/lib/mainnet-registry";
import { getMainnetPublicClient } from "@/lib/mainnet-clients";
import { verifyPinnedMainnetFactory } from "@/lib/mainnet-verification";
import { mainnetSignerStatus, verifyMainnetSignerIdentity } from "@/lib/secure-agent-signer";
import { mainnetAlertsConfigured } from "@/lib/mainnet-monitoring";
import { getServerEnvironment } from "@/lib/server-env";
import { mainnetAutonomyReady, mainnetProductionGates } from "@/lib/mainnet-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const erc20MetadataAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

export async function GET() {
  const environment = getServerEnvironment();
  const client = getMainnetPublicClient();
  const signer = mainnetSignerStatus();
  const [blockNumber, factoryVerification, usdgSymbol, usdgDecimals, signerIdentity] = await Promise.all([
    client.getBlockNumber().catch(() => undefined),
    mainnetFactoryAddress
      ? verifyPinnedMainnetFactory(client, mainnetFactoryAddress).catch(() => undefined)
      : Promise.resolve(undefined),
    client.readContract({ address: ROBINHOOD_MAINNET_USDG, abi: erc20MetadataAbi, functionName: "symbol" }).catch(() => undefined),
    client.readContract({ address: ROBINHOOD_MAINNET_USDG, abi: erc20MetadataAbi, functionName: "decimals" }).catch(() => undefined),
    signer.configured ? verifyMainnetSignerIdentity().catch(() => undefined) : Promise.resolve(undefined),
  ]);
  const canonicalUsdgVerified = usdgSymbol === "USDG" && usdgDecimals === 6;
  const runtimeVerification = {
    factoryVerified: factoryVerification?.verified ?? false,
    canonicalAssetVerified: canonicalUsdgVerified,
    signerIdentityVerified: Boolean(signerIdentity),
  };
  const productionGates = mainnetProductionGates(environment, runtimeVerification);
  const autonomyEnabled = mainnetAutonomyReady(environment, runtimeVerification);

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
      canonicalUsdgVerified,
      canonicalUsdgDecimals: usdgDecimals,
      autonomyEnabled,
      alertsConfigured: mainnetAlertsConfigured(),
      productionGates,
      signer: {
        configured: signer.configured,
        mode: signer.mode,
        address: signer.address,
        identityVerified: Boolean(signerIdentity),
        reason: signer.reason ?? (signer.configured && !signerIdentity ? "Remote signer identity attestation failed." : undefined),
      },
      executionGuard: autonomyEnabled
        ? "Autonomous execution is enabled and all production gates are currently passing."
        : "Autonomous execution remains disabled until every production gate passes.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
