import { NextResponse } from "next/server";
import { mainnetAlertsConfigured } from "@/lib/mainnet-monitoring";
import { verifyMainnetRuntime } from "@/lib/mainnet-runtime-verification";
import { getServerEnvironment } from "@/lib/server-env";
import { mainnetAutonomyReady, mainnetProductionGates } from "@/lib/mainnet-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const environment = getServerEnvironment();
  const runtime = await verifyMainnetRuntime();
  const { runtimeVerification } = runtime;
  const productionGates = mainnetProductionGates(environment, runtimeVerification);
  const autonomyEnabled = mainnetAutonomyReady(environment, runtimeVerification);

  return NextResponse.json(
    {
      experimental: true,
      unaudited: true,
      chainId: runtime.chainId,
      latestBlock: runtime.blockNumber?.toString(),
      mainnetUiEnabled: environment.ENABLE_MAINNET === "true",
      factoryVersion: "3.1.0-commerce-beta",
      factoryAddress: runtime.factoryAddress,
      factoryVerifiedOnchain: runtime.factoryVerification?.verified ?? false,
      factoryRuntimeCodeHash: runtime.factoryVerification?.factoryRuntimeHash,
      accountDeployerRuntimeCodeHash: runtime.factoryVerification?.accountDeployerRuntimeHash,
      registryDeployerRuntimeCodeHash: runtime.factoryVerification?.registryDeployerRuntimeHash,
      canonicalUsdgVerified: runtime.canonicalUsdgVerified,
      canonicalUsdgDecimals: runtime.canonicalUsdgDecimals,
      autonomyEnabled,
      alertsConfigured: mainnetAlertsConfigured(),
      productionGates,
      signer: {
        configured: runtime.signer.configured,
        mode: runtime.signer.mode,
        address: runtime.signer.address,
        identityVerified: Boolean(runtime.signerIdentity),
        reason: runtime.signer.reason ?? (runtime.signer.configured && !runtime.signerIdentity ? "Remote signer identity attestation failed." : undefined),
      },
      executionGuard: autonomyEnabled
        ? "Autonomous execution is enabled and all production gates are currently passing."
        : "Autonomous execution remains disabled until every production gate passes.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
