import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getServerEnvironment } from "@/lib/server-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicFallback = "https://rpc.testnet.chain.robinhood.com";
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

  const limit = checkRateLimit(`rpc:${clientKey(request)}`, {
    limit: 120,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "RPC rate limit exceeded" },
      {
        status: 429,
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

  const environment = getServerEnvironment();
  const response = await fetch(environment.RH_TESTNET_RPC_URL ?? publicFallback, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-RateLimit-Remaining": limit.remaining.toString(),
    },
  });
}
