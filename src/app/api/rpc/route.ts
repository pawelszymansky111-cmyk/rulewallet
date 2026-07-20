import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitFailure } from "@/lib/rate-limit";
import { getServerEnvironment } from "@/lib/server-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicFallbacks = {
  46630: "https://rpc.testnet.chain.robinhood.com",
  4663: "https://rpc.mainnet.chain.robinhood.com",
} as const;
const allowedMethods = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getStorageAt",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_maxPriorityFeePerGas",
]);

type RpcRequest = {
  id?: string | number | null;
  jsonrpc?: string;
  method?: string;
  params?: unknown[];
};

function clientKey(request: NextRequest) {
  return (
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    "anonymous"
  );
}
function validateRpcRequest(payload: unknown): payload is RpcRequest | RpcRequest[] {
  const requests = Array.isArray(payload) ? payload : [payload];
  return (
    requests.length > 0 &&
    requests.length <= 20 &&
    requests.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "method" in item &&
        typeof item.method === "string" &&
        allowedMethods.has(item.method),
    )
  );
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 64_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const limit = await checkRateLimit(`rpc:${clientKey(request)}`, {
    limit: 120,
    windowMs: 60_000,
  });
  const failure = rateLimitFailure(limit, "RPC rate limit exceeded");
  if (failure) {
    return NextResponse.json(
      { error: failure.error },
      {
        status: failure.status,
        headers: {
          "Retry-After": Math.ceil((limit.resetAt - Date.now()) / 1_000).toString(),
        },
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!validateRpcRequest(payload)) {
    return NextResponse.json(
      { error: "Unsupported or malformed read-only RPC method" },
      { status: 400 },
    );
  }

  const chainId = Number(request.nextUrl.searchParams.get("chainId") ?? "46630");
  if (chainId !== 46630 && chainId !== 4663) {
    return NextResponse.json({ error: "Unsupported chain ID" }, { status: 400 });
  }

  const environment = getServerEnvironment();
  const urls = chainId === 4663
    ? [environment.RH_MAINNET_RPC_URL, environment.RH_MAINNET_RPC_FALLBACK_URL, publicFallbacks[4663]]
    : [environment.RH_TESTNET_RPC_URL, environment.RH_TESTNET_RPC_FALLBACK_URL, publicFallbacks[46630]];

  let response: Response | undefined;
  let lastError = "RPC request failed";
  for (const url of [...new Set(urls.filter((item): item is string => Boolean(item)))]) {
    try {
      const candidate = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (candidate.ok || candidate.status < 500) {
        response = candidate;
        break;
      }
      lastError = `RPC returned ${candidate.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  if (!response) {
    return NextResponse.json({ error: lastError }, { status: 502 });
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-RateLimit-Remaining": limit.remaining.toString(),
      "X-RuleWallet-Chain-Id": chainId.toString(),
    },
  });
}
