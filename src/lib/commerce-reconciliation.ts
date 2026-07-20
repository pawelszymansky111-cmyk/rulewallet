import "server-only";
import type { MainnetAgentExecution, MainnetAgentStrategy } from "./mainnet-agent-types";
import { commerceStorageConfigured, listOrders, saveOrder } from "./commerce-store";
import type { PurchaseOrder } from "./commerce-types";

export function applyExecutionToDirectOrder(
  order: PurchaseOrder,
  execution: MainnetAgentExecution,
): PurchaseOrder {
  if (order.paymentRail !== "direct-onchain") return order;
  const status = execution.status === "pending" || execution.status === "timed_out"
    ? "payment-pending" as const
    : execution.status === "confirmed" || execution.status === "replaced" || execution.status === "late_confirmed"
      ? "reconciled" as const
      : execution.status === "blocked"
        ? "policy-blocked" as const
        : "failed" as const;
  return {
    ...order,
    status,
    transactionHash: execution.transactionHash ?? order.transactionHash,
    receiptUrl: execution.transactionHash
      ? `https://robinhoodchain.blockscout.com/tx/${execution.transactionHash}`
      : order.receiptUrl,
    failureCode: status === "failed" || status === "policy-blocked" ? `AUTONOMY_${execution.status.toUpperCase()}` : undefined,
    failureMessage: status === "failed" || status === "policy-blocked" ? execution.reason : undefined,
    updatedAt: execution.createdAt,
  };
}

export async function reconcileDirectCommerceOrder(
  strategy: Pick<MainnetAgentStrategy, "account" | "intentHash">,
  execution: MainnetAgentExecution,
) {
  if (!commerceStorageConfigured()) return undefined;
  const orders = await listOrders(500);
  const order = orders.find((candidate) =>
    candidate.paymentRail === "direct-onchain"
      && candidate.cart.chainId === 4663
      && candidate.cart.account.toLowerCase() === strategy.account.toLowerCase()
      && candidate.cart.intentHash.toLowerCase() === strategy.intentHash.toLowerCase(),
  );
  if (!order) return undefined;
  return saveOrder(applyExecutionToDirectOrder(order, execution));
}
