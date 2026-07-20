import { NextRequest, NextResponse } from "next/server";
import { getAddress, hashTypedData, parseAbi, verifyTypedData, zeroAddress, type Hex } from "viem";
import { checkRateLimit, rateLimitFailure } from "@/lib/rate-limit";
import { getMainnetPublicClient } from "@/lib/mainnet-clients";
import {
  createMainnetStrategySchema,
  publicStrategy,
  strategyTypedData,
} from "@/lib/mainnet-agent-types";
import { claimMainnetStrategyDigest, listMainnetStrategies, saveMainnetStrategy } from "@/lib/mainnet-agent-store";
import {
  ROBINHOOD_MAINNET_USDG,
  ruleWalletPolicyRegistryV3Abi,
  ruleWalletV3Abi,
} from "@/lib/mainnet-registry";
import { mainnetFactoryV3Address, ruleWalletFactoryV3Abi, verifyFactoryV3 } from "@/lib/v3-factory";
import { getServerEnvironment } from "@/lib/server-env";
import { mainnetAutonomyReady } from "@/lib/mainnet-safety";
import { mainnetSignerStatus, verifyMainnetSignerIdentity } from "@/lib/secure-agent-signer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const erc20MetadataAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

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
  const limit = await checkRateLimit(`mainnet-strategy:${clientKey(request)}`, { limit: 10, windowMs: 60_000 });
  const failure = rateLimitFailure(limit, "Rate limit exceeded.");
  if (failure) return NextResponse.json({ error: failure.error }, { status: failure.status });

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
    const environment = getServerEnvironment();
    const signer = mainnetSignerStatus();
    if (!mainnetFactoryV3Address) {
      return NextResponse.json({ error: "Verified V3 factory is not configured." }, { status: 503 });
    }
    const [factoryVerification, signerIdentity, usdgSymbol, usdgDecimals] = await Promise.all([
      verifyFactoryV3(client, mainnetFactoryV3Address, {
        chainId: 4663,
        canonicalStablecoin: ROBINHOOD_MAINNET_USDG,
      }),
      signer.configured ? verifyMainnetSignerIdentity().catch(() => undefined) : Promise.resolve(undefined),
      client.readContract({ address: ROBINHOOD_MAINNET_USDG, abi: erc20MetadataAbi, functionName: "symbol" }).catch(() => undefined),
      client.readContract({ address: ROBINHOOD_MAINNET_USDG, abi: erc20MetadataAbi, functionName: "decimals" }).catch(() => undefined),
    ]);
    if (!factoryVerification.verified) {
      return NextResponse.json({ error: "Pinned security-beta factory bytecode is not deployed or verified." }, { status: 503 });
    }
    if (!mainnetAutonomyReady(environment, {
      factoryVerified: true,
      canonicalAssetVerified: usdgSymbol === "USDG" && usdgDecimals === 6,
      signerIdentityVerified: Boolean(signerIdentity),
    })) {
      return NextResponse.json({ error: "Mainnet autonomy is not fully configured; strategy storage is fail-closed." }, { status: 503 });
    }
    if (!signer.address) return NextResponse.json({ error: "Verified mainnet agent signer is unavailable." }, { status: 503 });

    const code = await client.getCode({ address: input.account });
    if (!code || code === "0x") return NextResponse.json({ error: "No V3 account code at that address." }, { status: 400 });
    const [ownerRole, agentRole, canonicalStablecoin, policyRegistry, expectedVersion, accountVersion, onchainDigest] = await Promise.all([
      client.readContract({ address: input.account, abi: ruleWalletV3Abi, functionName: "OWNER_ROLE" }),
      client.readContract({ address: input.account, abi: ruleWalletV3Abi, functionName: "AGENT_ROLE" }),
      client.readContract({ address: input.account, abi: ruleWalletV3Abi, functionName: "canonicalStablecoin" }),
      client.readContract({ address: input.account, abi: ruleWalletV3Abi, functionName: "policyRegistry" }),
      client.readContract({ address: mainnetFactoryV3Address, abi: ruleWalletFactoryV3Abi, functionName: "VERSION_HASH" }),
      client.readContract({ address: mainnetFactoryV3Address, abi: ruleWalletFactoryV3Abi, functionName: "accountVersion", args: [input.account] }),
      client.readContract({ address: input.account, abi: ruleWalletV3Abi, functionName: "strategyDigest", args: [typedData.message] }),
    ]);
    if (canonicalStablecoin !== ROBINHOOD_MAINNET_USDG) return NextResponse.json({ error: "Account canonical USDG does not match the official registry." }, { status: 400 });
    if (accountVersion !== expectedVersion) return NextResponse.json({ error: "Account was not deployed by the configured V3 factory/version." }, { status: 400 });
    const [registryController, registryStablecoin, merchantPolicy, assetPolicy, merchantAssetPolicy, categoryBudget, isOwner, signerHasAgentRole] = await Promise.all([
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "controller" }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "canonicalStablecoin" }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "merchantPolicies", args: [input.recipient] }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "assetPolicies", args: [input.asset] }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "merchantAssetPolicies", args: [input.recipient, input.asset] }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "categoryBudgets", args: [input.category, input.asset] }),
      client.readContract({ address: input.account, abi: ruleWalletV3Abi, functionName: "hasRole", args: [ownerRole, input.owner] }),
      client.readContract({ address: input.account, abi: ruleWalletV3Abi, functionName: "hasRole", args: [agentRole, signer.address] }),
    ]);
    if (getAddress(registryController) !== getAddress(input.account) || getAddress(registryStablecoin) !== ROBINHOOD_MAINNET_USDG) {
      return NextResponse.json({ error: "Account policy registry provenance is invalid." }, { status: 400 });
    }
    if (!isOwner) return NextResponse.json({ error: "Signer does not hold OWNER_ROLE on this account." }, { status: 403 });
    if (!signerHasAgentRole) return NextResponse.json({ error: "The verified secure signer does not hold AGENT_ROLE on this account." }, { status: 400 });
    if (!merchantPolicy[0]) return NextResponse.json({ error: "Merchant is not currently trusted onchain." }, { status: 400 });
    if (merchantPolicy[2] !== input.category) return NextResponse.json({ error: "Signed category does not match the merchant's onchain category." }, { status: 400 });
    if (!assetPolicy[0]) return NextResponse.json({ error: "The selected asset policy is disabled." }, { status: 400 });
    if (!merchantAssetPolicy[0]) return NextResponse.json({ error: "The selected asset is disabled for this merchant." }, { status: 400 });
    if (!categoryBudget[0]) return NextResponse.json({ error: "The selected category budget is disabled." }, { status: 400 });
    await client.readContract({
      address: policyRegistry,
      abi: ruleWalletPolicyRegistryV3Abi,
      functionName: "validatePayment",
      args: [input.recipient, input.asset, BigInt(input.amount), input.category],
    });

    const digest = hashTypedData(typedData);
    if (onchainDigest.toLowerCase() !== digest.toLowerCase()) {
      return NextResponse.json({ error: "Frontend and contract EIP-712 digests disagree." }, { status: 400 });
    }
    const ttlSeconds = Number(BigInt(input.expiry) - BigInt(Math.floor(Date.now() / 1000)));
    if (!await claimMainnetStrategyDigest(digest, ttlSeconds)) {
      return NextResponse.json({ error: "This exact EIP-712 strategy has already been stored." }, { status: 409 });
    }

    const createdAt = new Date();
    const saved = await saveMainnetStrategy({
      ...input,
      digest,
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
