import { describe, expect, it, vi } from "vitest";
import type { MainnetAgentExecution } from "./mainnet-agent-types";
import type { PurchaseOrder } from "./commerce-types";

vi.mock("server-only", () => ({}));

import { applyExecutionToDirectOrder } from "./commerce-reconciliation";

const order: PurchaseOrder = {
  id: "812ef200-b4f8-4580-ae74-0c5f5d7f20b2",
  cart: {
    id: "712ef200-b4f8-4580-ae74-0c5f5d7f20b1",
    quote: {
      id: "612ef200-b4f8-4580-ae74-0c5f5d7f20b0",
      providerId: "direct-onchain",
      providerMode: "live",
      category: "direct",
      asset: "USDG",
      currency: "USD",
      amountMinor: "25000000",
      lines: [{ id: "invoice", label: "Invoice", quantity: 1, unitAmountMinor: "25000000" }],
      merchantName: "Trusted merchant",
      merchantRecipient: "0x0000000000000000000000000000000000000003",
      summary: "Pay invoice",
      createdAt: "2026-07-20T12:00:00.000Z",
      expiresAt: "2030-07-20T12:10:00.000Z",
      sourceReference: "direct:invoice",
      purchaseAvailable: true,
      disclosure: "Exact direct onchain payment.",
    },
    chainId: 4663,
    account: "0x0000000000000000000000000000000000000002",
    owner: "0x0000000000000000000000000000000000000001",
    createdAt: "2026-07-20T12:00:00.000Z",
    expiresAt: "2030-07-20T12:10:00.000Z",
    intentHash: `0x${"1".repeat(64)}`,
  },
  status: "approved",
  policyDecision: { outcome: "allowed", code: "OK", explanation: "Every policy passed." },
  paymentRail: "direct-onchain",
  createdAt: "2026-07-20T12:00:00.000Z",
  updatedAt: "2026-07-20T12:00:00.000Z",
};

function execution(status: MainnetAgentExecution["status"]): MainnetAgentExecution {
  return {
    id: crypto.randomUUID(),
    strategyId: crypto.randomUUID(),
    strategyName: "One exact invoice",
    account: order.cart.account,
    asset: "0x0000000000000000000000000000000000000000",
    recipient: order.cart.quote.merchantRecipient!,
    amount: order.cart.quote.amountMinor,
    trigger: "manual",
    status,
    reason: `${status} outcome`,
    transactionHash: status === "blocked" ? undefined : `0x${"2".repeat(64)}`,
    createdAt: "2026-07-20T12:01:00.000Z",
  };
}

describe("direct commerce reconciliation", () => {
  it("keeps an ambiguous timeout pending so a blind retry cannot duplicate payment", () => {
    expect(applyExecutionToDirectOrder(order, execution("timed_out"))).toMatchObject({
      status: "payment-pending",
      transactionHash: `0x${"2".repeat(64)}`,
    });
  });

  it("marks exact confirmed and late-confirmed receipts reconciled", () => {
    for (const status of ["confirmed", "replaced", "late_confirmed"] as const) {
      expect(applyExecutionToDirectOrder(order, execution(status))).toMatchObject({
        status: "reconciled",
        receiptUrl: `https://robinhoodchain.blockscout.com/tx/0x${"2".repeat(64)}`,
      });
    }
  });

  it("records blocked and failed attempts without inventing a payment receipt", () => {
    expect(applyExecutionToDirectOrder(order, execution("blocked"))).toMatchObject({
      status: "policy-blocked",
      failureCode: "AUTONOMY_BLOCKED",
      transactionHash: undefined,
    });
    expect(applyExecutionToDirectOrder(order, execution("failed"))).toMatchObject({
      status: "failed",
      failureCode: "AUTONOMY_FAILED",
    });
  });

  it("never changes hosted provider checkout orders", () => {
    const hosted = { ...order, paymentRail: "hosted-checkout" as const };
    expect(applyExecutionToDirectOrder(hosted, execution("confirmed"))).toBe(hosted);
  });
});
