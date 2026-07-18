import "server-only";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhoodTestnet } from "@/lib/chains";

const fallbackRpc = robinhoodTestnet.rpcUrls.default.http[0];

export function getAgentPublicClient() {
  return createPublicClient({
    chain: robinhoodTestnet,
    transport: http(process.env.RH_TESTNET_RPC_URL ?? fallbackRpc),
  });
}

export function agentSignerConfigured() {
  return /^0x[a-fA-F0-9]{64}$/.test(process.env.AGENT_PRIVATE_KEY ?? "");
}

export function getAgentAccount() {
  if (!agentSignerConfigured()) throw new Error("Agent signer is not configured.");
  return privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as Hex);
}

export function getAgentWalletClient() {
  return createWalletClient({
    account: getAgentAccount(),
    chain: robinhoodTestnet,
    transport: http(process.env.RH_TESTNET_RPC_URL ?? fallbackRpc),
  });
}
