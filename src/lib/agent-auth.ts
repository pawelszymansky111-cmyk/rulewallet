import "server-only";
import { getAddress, recoverMessageAddress, type Address, type Hex } from "viem";
import { adminActionSchema, buildAdminMessage, type AdminAction } from "@/lib/agent-types";
import { getAgentPublicClient } from "@/lib/agent-clients";
import { claimAdminNonce } from "@/lib/agent-store";
import { ruleWalletAbi, ruleWalletAddress } from "@/lib/rulewallet-contract";

export async function verifyAdminAction(rawPayload: unknown, signature: string) {
  if (!ruleWalletAddress) throw new Error("Policy contract is not configured.");
  const payload = adminActionSchema.parse(rawPayload);
  if (payload.expiresAt < Date.now() || payload.expiresAt > Date.now() + 10 * 60_000) {
    throw new Error("Admin signature expired or has an invalid lifetime.");
  }
  const signer = await recoverMessageAddress({
    message: buildAdminMessage(payload, ruleWalletAddress),
    signature: signature as Hex,
  });
  const client = getAgentPublicClient();
  const adminRole = await client.readContract({
    address: ruleWalletAddress,
    abi: ruleWalletAbi,
    functionName: "DEFAULT_ADMIN_ROLE",
  });
  const isAdmin = await client.readContract({
    address: ruleWalletAddress,
    abi: ruleWalletAbi,
    functionName: "hasRole",
    args: [adminRole, signer],
  });
  if (!isAdmin) throw new Error("The signing wallet is not the RuleWallet admin.");
  if (!(await claimAdminNonce(payload.nonce))) {
    throw new Error("This admin signature has already been used.");
  }
  return { payload: payload as AdminAction, signer: getAddress(signer) as Address };
}
