import { describe, expect, it } from "vitest";
import { getAddress, type PublicClient } from "viem";
import type { CommerceQuote } from "./commerce-types";
import {
  evaluateVerifiedV3Payment,
  providerCheckoutDecision,
} from "./commerce-onchain-policy";

const factory = getAddress("0x00000000000000000000000000000000000000f1");
const stablecoin = getAddress("0x00000000000000000000000000000000000000f2");
const account = getAddress("0x00000000000000000000000000000000000000a1");
const owner = getAddress("0x00000000000000000000000000000000000000a2");
const registry = getAddress("0x00000000000000000000000000000000000000a3");
const merchant = getAddress("0x00000000000000000000000000000000000000a4");
const version = `0x${"11".repeat(32)}`;
const ownerRole = `0x${"22".repeat(32)}`;

const directQuote: CommerceQuote = {
  id: "778f33be-fc13-4473-b79e-8214713c33ee",
  providerId: "direct-onchain",
  providerMode: "sandbox",
  category: "direct",
  asset: "USDG",
  currency: "USD",
  amountMinor: "2500000",
  lines: [{ id: "pay", label: "Invoice", quantity: 1, unitAmountMinor: "2500000" }],
  merchantName: "Verified merchant",
  merchantRecipient: merchant,
  summary: "Pay invoice",
  createdAt: "2026-07-20T10:00:00.000Z",
  expiresAt: "2026-07-20T10:10:00.000Z",
  sourceReference: "sandbox:1",
  purchaseAvailable: false,
  disclosure: "No payment is sent while a policy is evaluated.",
};

function client(options: { owner?: boolean; approval?: boolean; reject?: boolean } = {}) {
  return {
    readContract: async (request: { address: string; functionName: string }) => {
      switch (request.functionName) {
        case "VERSION_HASH": return version;
        case "accountVersion": return version;
        case "OWNER_ROLE": return ownerRole;
        case "policyRegistry": return registry;
        case "canonicalStablecoin": return stablecoin;
        case "policyActive": return true;
        case "paused": return false;
        case "hasRole": return options.owner ?? true;
        case "controller": return account;
        case "validatePayment":
          if (options.reject) throw new Error("PolicyViolation(17)");
          return options.approval ?? false;
        default: throw new Error(`Unexpected read ${request.address}:${request.functionName}`);
      }
    },
  } as unknown as PublicClient;
}

const verifiedFactory = async () => ({ verified: true });

describe("verified V3 commerce policy", () => {
  it("never treats a provider quote without an onchain recipient as autonomous", () => {
    expect(providerCheckoutDecision({ ...directQuote, merchantRecipient: undefined })).toMatchObject({
      outcome: "approval-required",
      code: "PROVIDER_CHECKOUT_REQUIRED",
    });
  });

  it("allows only after the verified contract policy accepts the exact payment", async () => {
    await expect(evaluateVerifiedV3Payment({
      client: client(), chainId: 46630, factory, stablecoin, account, owner,
      quote: directQuote, verifyFactory: verifiedFactory,
    })).resolves.toMatchObject({ outcome: "allowed", code: "OK" });
  });

  it("preserves the onchain human-approval requirement", async () => {
    await expect(evaluateVerifiedV3Payment({
      client: client({ approval: true }), chainId: 46630, factory, stablecoin, account, owner,
      quote: directQuote, verifyFactory: verifiedFactory,
    })).resolves.toMatchObject({ outcome: "approval-required", code: "HUMAN_APPROVAL_THRESHOLD" });
  });

  it("rejects a connected wallet that is not the account owner", async () => {
    await expect(evaluateVerifiedV3Payment({
      client: client({ owner: false }), chainId: 46630, factory, stablecoin, account, owner,
      quote: directQuote, verifyFactory: verifiedFactory,
    })).resolves.toMatchObject({ outcome: "blocked", code: "OWNER_NOT_AUTHORIZED" });
  });

  it("turns a policy revert into a clear blocked decision", async () => {
    await expect(evaluateVerifiedV3Payment({
      client: client({ reject: true }), chainId: 46630, factory, stablecoin, account, owner,
      quote: directQuote, verifyFactory: verifiedFactory,
    })).resolves.toMatchObject({ outcome: "blocked", code: "ONCHAIN_POLICY_REJECTED" });
  });
});
