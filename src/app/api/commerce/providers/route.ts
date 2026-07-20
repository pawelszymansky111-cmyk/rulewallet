import { NextResponse } from "next/server";
import { listCommerceProviders } from "@/lib/commerce-providers";
import { commerceStorageConfigured } from "@/lib/commerce-store";
import { commerceSessionConfigured } from "@/lib/commerce-session";
import { commerceDataEncryptionConfigured } from "@/lib/commerce-data-encryption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      providers: listCommerceProviders(),
      storageConfigured: commerceStorageConfigured(),
      sessionConfigured: commerceSessionConfigured(),
      encryptionConfigured: commerceDataEncryptionConfigured(),
      livePurchasesEnabled: false,
      disclosure: "Sandbox quotes never move funds. Live provider purchases are not enabled.",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
