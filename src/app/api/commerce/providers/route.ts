import { NextResponse } from "next/server";
import { applyCommerceRuntimeReadiness, listCommerceProviders } from "@/lib/commerce-providers";
import { commerceStorageConfigured } from "@/lib/commerce-store";
import { commerceSessionConfigured } from "@/lib/commerce-session";
import { commerceDataEncryptionConfigured } from "@/lib/commerce-data-encryption";
import { verifyMainnetRuntime } from "@/lib/mainnet-runtime-verification";
import { getServerEnvironment } from "@/lib/server-env";
import { mainnetAutonomyReady } from "@/lib/mainnet-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const runtime = await verifyMainnetRuntime();
  const directMainnetReady = mainnetAutonomyReady(
    getServerEnvironment(),
    runtime.runtimeVerification,
  );
  return NextResponse.json(
    {
      providers: applyCommerceRuntimeReadiness(listCommerceProviders(), { directMainnetReady }),
      storageConfigured: commerceStorageConfigured(),
      sessionConfigured: commerceSessionConfigured(),
      encryptionConfigured: commerceDataEncryptionConfigured(),
      livePurchasesEnabled: directMainnetReady,
      disclosure: directMainnetReady
        ? "Verified direct ETH/USDG payments are live. Provider-API and hosted-checkout adapters remain sandbox or provider-managed."
        : "Sandbox quotes never move funds. Live direct payments remain disabled until every published mainnet production gate passes.",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
