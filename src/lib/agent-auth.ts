import "server-only";
import { getAddress, recoverMessageAddress, type Address, type Hex } from "viem";
import { adminActionSchema, buildAdminMessage, type AdminAction } from "@/lib/agent-types";
import { getAgentPublicClient } from "@/lib/agent-clients";
import { claimAdminNonce } from "@/lib/agent-store";
import { hasPinnedRuleWalletRuntime, ruleWalletAbi } from "@/lib/rulewallet-contract";

export async function verifyAdminAction(rawPayload: unknown, signature: string) {
  const payload = adminActionSchema.parse(rawPayload);
  if (payload.expiresAt < Date.now() || payload.expiresAt > Date.now() + 10 * 60_000) {
    throw new Error("Admin signature expired or has an invalid lifetime.");
  }
  const signer = await recoverMessageAddress({
    message: buildAdminMessage(payload, payload.policyAccount),
    signature: signature as Hex,
  });
  const client = getAgentPublicClient();
  const policyAccount = getAddress(payload.policyAccount);
  const bytecode = await client.getBytecode({ address: policyAccount });
  if (!hasPinnedRuleWalletRuntime(bytecode)) {
    throw new Error("The signed address is not a pinned RuleWallet testnet policy account.");
  }
  const adminRole = await client.readContract({
    address: policyAccount,
    abi: ruleWalletAbi,
    functionName: "DEFAULT_ADMIN_ROLE",
  });
  const isAdmin = await client.readContract({
    address: policyAccount,
    abi: ruleWalletAbi,
    functionName: "hasRole",
    args: [adminRole, signer],
  });
  if (!isAdmin) throw new Error("The signing wallet is not the RuleWallet admin.");
  if (!(await claimAdminNonce(payload.nonce))) {
    throw new Error("This admin signature has already been used.");
  }
  return {
    payload: payload as AdminAction,
    policyAccount,
    signer: getAddress(signer) as Address,
  };
}
