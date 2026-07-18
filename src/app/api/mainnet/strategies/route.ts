import { NextRequest, NextResponse } from "next/server";
import { verifyTypedData, zeroAddress, type Hex } from "viem";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMainnetPublicClient } from "@/lib/mainnet-clients";
import {
  createMainnetStrategySchema,
  publicStrategy,
  strategyTypedData,
} from "@/lib/mainnet-agent-types";
import { listMainnetStrategies, saveMainnetStrategy } from "@/lib/mainnet-agent-store";
import {
  mainnetFactoryAddress,
  ROBINHOOD_MAINNET_USDG,
  ruleWalletFactoryAbi,
  ruleWalletV2Abi,
} from "@/lib/mainnet-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientKey(request: NextRequest) {
  return request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
}

export async function GET() {
  try {
    const strategies = await listMainnetStrategies();
    return NextResponse.json({ strategies: strategies.map(publicStrategy) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Strategy storage unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`mainnet-strategy:${clientKey(request)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  try {
    const input = createMainnetStrategySchema.parse(await request.json());
    if (input.asset !== zeroAddress && input.asset !== ROBINHOOD_MAINNET_USDG) {
      return NextResponse.json({ error: "Only native ETH and canonical USDG are supported." }, { status: 400 });
    }
    if (BigInt(input.expiry) <= BigInt(Math.floor(Date.now() / 1000))) {
      return NextResponse.json({ error: "Strategy has already expired." }, { status: 400 });
    }

    const typedData = strategyTypedData(input);
    const signatureValid = await verifyTypedData({
      address: input.owner,
      ...typedData,
      signature: input.signature as Hex,
    });
    if (!signatureValid) return NextResponse.json({ error: "Invalid EIP-712 owner signature." }, { status: 401 });

    const client = getMainnetPublicClient();
    if (!mainnetFactoryAddress) {
      return NextResponse.json({ error: "Verified V2 factory is not configured." }, { status: 503 });
    }
    const [code, ownerRole, canonicalStablecoin, expectedVersion, accountVersion] = await Promise.all([
      client.getCode({ address: input.account }),
      client.readContract({ address: input.account, abi: ruleWalletV2Abi, functionName: "OWNER_ROLE" }),
      client.readContract({ address: input.account, abi: ruleWalletV2Abi, functionName: "canonicalStablecoin" }),
      client.readContract({ address: mainnetFactoryAddress, abi: ruleWalletFactoryAbi, functionName: "VERSION_HASH" }),
      client.readContract({ address: mainnetFactoryAddress, abi: ruleWalletFactoryAbi, functionName: "accountVersion", args: [input.account] }),
    ]);
    if (!code || code === "0x") return NextResponse.json({ error: "No V2 account code at that address." }, { status: 400 });
    if (canonicalStablecoin !== ROBINHOOD_MAINNET_USDG) return NextResponse.json({ error: "Account canonical USDG does not match the official registry." }, { status: 400 });
    if (accountVersion !== expectedVersion) return NextResponse.json({ error: "Account was not deployed by the configured V2 factory/version." }, { status: 400 });
    const isOwner = await client.readContract({ address: input.account, abi: ruleWalletV2Abi, functionName: "hasRole", args: [ownerRole, input.owner] });
    if (!isOwner) return NextResponse.json({ error: "Signer does not hold OWNER_ROLE on this account." }, { status: 403 });

    const createdAt = new Date();
    const saved = await saveMainnetStrategy({
      ...input,
      id: crypto.randomUUID(),
      chainId: 4663,
      active: true,
      createdAt: createdAt.toISOString(),
      nextRunAt: createdAt.toISOString(),
    });
    return NextResponse.json({ strategy: publicStrategy(saved) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid strategy." }, { status: 400 });
  }
}
