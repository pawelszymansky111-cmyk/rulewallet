import "server-only";
import { createPublicClient, fallback, http } from "viem";
import { robinhoodMainnet } from "@/lib/chains";
import { getServerEnvironment } from "@/lib/server-env";

export function getMainnetPublicClient() {
  const environment = getServerEnvironment();
  const urls = [
    environment.RH_MAINNET_RPC_URL,
    environment.RH_MAINNET_RPC_FALLBACK_URL,
    robinhoodMainnet.rpcUrls.default.http[0],
  ].filter((value): value is string => Boolean(value));
  return createPublicClient({
    chain: robinhoodMainnet,
    transport: fallback(urls.map((url) => http(url, { timeout: 12_000, retryCount: 1 }))),
  });
}

export function getIndependentMainnetPublicClients() {
  const environment = getServerEnvironment();
  const urls = [environment.RH_MAINNET_RPC_URL, environment.RH_MAINNET_RPC_FALLBACK_URL];
  if (!urls[0] || !urls[1] || urls[0] === urls[1]) {
    throw new Error("Two distinct managed mainnet RPC endpoints are required for autonomous signing.");
  }
  return urls.map((url) => createPublicClient({
    chain: robinhoodMainnet,
    transport: http(url, { timeout: 12_000, retryCount: 1 }),
  }));
}
