import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import {
  buildCommerceApprovalTypedData,
  commerceApprovalPreviewHash,
  verifyCommerceApproval,
} from "./commerce-auth";
import type { ApprovalDecision, ApprovalRequest, CommerceQuote } from "./commerce-types";

const owner = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412ae3a1e7f0e5e69",
);

const quote: CommerceQuote = {
  id: "778f33be-fc13-4473-b79e-8214713c33ee",
  providerId: "duffel-flights",
  providerMode: "sandbox",
  category: "travel",
  asset: "USDG",
  currency: "USD",
  amountMinor: "2500",
  lines: [{ id: "flight", label: "Flight", quantity: 1, unitAmountMinor: "2500" }],
  merchantName: "Duffel Flights",
  summary: "A flight",
  createdAt: new Date(Date.now() - 1_000).toISOString(),
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  sourceReference: "sandbox:1",
  purchaseAvailable: false,
  disclosure: "Sandbox quote only; no funds move.",
};

function approval(): ApprovalRequest {
  return {
    id: "16c0808b-bf86-4a85-a653-bdd5d4e80ec1",
    orderId: "812ef200-b4f8-4580-ae74-0c5f5d7f20b2",
    account: "0x0000000000000000000000000000000000000001",
    chainId: 46630,
    owner: owner.address,
    quote,
    intentHash: "0x3b5a4b9df636d29c42f34673ab8ea542a7830b73ed74fa35348f869ffc6d4ce5",
    reason: "Above the approval threshold.",
    status: "pending",
    nonce: "4",
    createdAt: new Date(Date.now() - 1_000).toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
  };
}

async function signedDecision(request: ApprovalRequest): Promise<ApprovalDecision> {
  const unsigned = {
    decision: "approve" as const,
    approver: owner.address,
    nonce: request.nonce,
    expiresAt: Math.floor(Date.now() / 1000) + 300,
  };
  const signature = await owner.signTypedData(
    buildCommerceApprovalTypedData(request, unsigned, 46630),
  );
  return { ...unsigned, signature };
}

describe("commerce approval signatures", () => {
  it("verifies an exact, unexpired owner EIP-712 decision", async () => {
    const request = approval();
    const decision = await signedDecision(request);
    await expect(
      verifyCommerceApproval({ approval: request, decision, chainId: 46630 }),
    ).resolves.toBe(owner.address);
  });

  it("binds the signature to the chain", async () => {
    const request = approval();
    const decision = await signedDecision(request);
    await expect(
      verifyCommerceApproval({ approval: request, decision, chainId: 4663 }),
    ).rejects.toThrow("stored order chain");
  });

  it("rejects a replay against a decided request", async () => {
    const request = approval();
    const decision = await signedDecision(request);
    await expect(
      verifyCommerceApproval({
        approval: { ...request, status: "approved" },
        decision,
        chainId: 46630,
      }),
    ).rejects.toThrow("no longer pending");
  });

  it("invalidates approval when exact purchase fields change", async () => {
    const request = approval();
    const decision = await signedDecision(request);
    await expect(verifyCommerceApproval({
      approval: { ...request, quote: { ...request.quote, amountMinor: "2501" } },
      decision,
      chainId: 46630,
    })).rejects.toThrow("signature does not match");
  });

  it("produces a stable exact preview hash", () => {
    const request = approval();
    const decision = {
      decision: "approve" as const,
      expiresAt: 1_800_000_000,
    };
    expect(commerceApprovalPreviewHash(request, decision, 46630)).toMatch(/^0x[a-f0-9]{64}$/);
    expect(commerceApprovalPreviewHash(request, decision, 46630)).not.toBe(
      commerceApprovalPreviewHash({ ...request, chainId: 4663 }, decision, 4663),
    );
  });
});
