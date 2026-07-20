import {
  getAddress,
  hashMessage,
  hashTypedData,
  keccak256,
  recoverTypedDataAddress,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import type { ApprovalDecision, ApprovalRequest } from "./commerce-types";

export const commerceApprovalTypes = {
  CommerceApproval: [
    { name: "orderId", type: "bytes32" },
    { name: "quoteId", type: "bytes32" },
    { name: "account", type: "address" },
    { name: "providerHash", type: "bytes32" },
    { name: "merchantHash", type: "bytes32" },
    { name: "asset", type: "uint8" },
    { name: "amount", type: "uint256" },
    { name: "categoryHash", type: "bytes32" },
    { name: "intentHash", type: "bytes32" },
    { name: "approve", type: "bool" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint64" },
  ],
} as const;

export function commerceOrderIdHash(orderId: string) {
  return keccak256(stringToHex(orderId));
}

export function buildCommerceApprovalTypedData(
  approval: Pick<ApprovalRequest, "orderId" | "account" | "chainId" | "nonce" | "quote" | "intentHash">,
  decision: Pick<ApprovalDecision, "decision" | "expiresAt">,
  chainId: 4663 | 46630,
) {
  if (chainId !== approval.chainId) throw new Error("Approval chain does not match the stored order chain.");
  return {
    domain: {
      name: "RuleWallet Commerce",
      version: "1",
      chainId,
      verifyingContract: getAddress(approval.account),
    },
    types: commerceApprovalTypes,
    primaryType: "CommerceApproval" as const,
    message: {
      orderId: commerceOrderIdHash(approval.orderId),
      quoteId: commerceOrderIdHash(approval.quote.id),
      account: getAddress(approval.account),
      providerHash: keccak256(stringToHex(approval.quote.providerId)),
      merchantHash: keccak256(stringToHex(`${approval.quote.merchantName}:${approval.quote.merchantRecipient ?? ""}`)),
      asset: approval.quote.asset === "ETH" ? 0 : 1,
      amount: BigInt(approval.quote.amountMinor),
      categoryHash: keccak256(stringToHex(approval.quote.category)),
      intentHash: approval.intentHash as Hex,
      approve: decision.decision === "approve",
      nonce: BigInt(approval.nonce),
      expiry: BigInt(decision.expiresAt),
    },
  };
}

export async function verifyCommerceApproval(input: {
  approval: ApprovalRequest;
  decision: ApprovalDecision;
  chainId: 4663 | 46630;
}) {
  if (input.approval.status !== "pending") throw new Error("This approval is no longer pending.");
  if (input.decision.nonce !== input.approval.nonce) throw new Error("Approval nonce mismatch.");
  const now = Math.floor(Date.now() / 1000);
  if (input.decision.expiresAt <= now) throw new Error("The approval signature has expired.");
  if (Date.parse(input.approval.expiresAt) <= Date.now()) throw new Error("The purchase approval has expired.");
  const typedData = buildCommerceApprovalTypedData(input.approval, input.decision, input.chainId);
  const recovered = await recoverTypedDataAddress({
    ...typedData,
    signature: input.decision.signature as Hex,
  });
  if (recovered.toLowerCase() !== input.decision.approver.toLowerCase()) {
    throw new Error("The signature does not match the selected approver.");
  }
  if (recovered.toLowerCase() !== input.approval.owner.toLowerCase()) {
    throw new Error("Only the account owner can decide this approval in the current beta.");
  }
  return getAddress(recovered) as Address;
}

// Kept exportable for clients that need a stable preview identifier without signing.
export function commerceApprovalPreviewHash(
  approval: Pick<ApprovalRequest, "orderId" | "account" | "chainId" | "nonce" | "quote" | "intentHash">,
  decision: Pick<ApprovalDecision, "decision" | "expiresAt">,
  chainId: 4663 | 46630,
) {
  return hashTypedData(buildCommerceApprovalTypedData(approval, decision, chainId));
}

export function commerceApprovalFallbackLabel(orderId: string) {
  return hashMessage(`RuleWallet commerce order ${orderId}`);
}
