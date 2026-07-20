import "server-only";

import { getAddress, recoverMessageAddress, type Address, type Hex } from "viem";
import {
  buildMainnetAdminMessage,
  mainnetAdminActionSchema,
  type MainnetAdminAction,
} from "@/lib/mainnet-agent-types";
import {
  claimMainnetAdminNonce,
  getMainnetStrategy,
} from "@/lib/mainnet-agent-store";
import { getMainnetPublicClient } from "@/lib/mainnet-clients";
import { ruleWalletV3Abi } from "@/lib/mainnet-registry";

export async function verifyMainnetAdminAction(rawPayload: unknown, signature: string) {
  const payload = mainnetAdminActionSchema.parse(rawPayload);
  const now = Date.now();
  if (payload.expiresAt < now || payload.expiresAt > now + 10 * 60_000) {
    throw new Error("Owner signature expired or has an invalid lifetime.");
  }

  const strategy = await getMainnetStrategy(payload.strategyId);
  if (!strategy) throw new Error("Mainnet strategy not found.");
  if (getAddress(strategy.account) !== getAddress(payload.account)) {
    throw new Error("The signed account does not match the stored strategy.");
  }

  const signer = await recoverMessageAddress({
    message: buildMainnetAdminMessage(payload),
    signature: signature as Hex,
  });
  const client = getMainnetPublicClient();
  const ownerRole = await client.readContract({
    address: strategy.account,
    abi: ruleWalletV3Abi,
    functionName: "OWNER_ROLE",
  });
  const isOwner = await client.readContract({
    address: strategy.account,
    abi: ruleWalletV3Abi,
    functionName: "hasRole",
    args: [ownerRole, signer],
  });
  if (!isOwner) throw new Error("The signing wallet does not hold OWNER_ROLE on this account.");
  if (!(await claimMainnetAdminNonce(payload.nonce))) {
    throw new Error("This owner authorization has already been used.");
  }

  return {
    payload: payload as MainnetAdminAction,
    signer: getAddress(signer) as Address,
    strategy,
  };
}
