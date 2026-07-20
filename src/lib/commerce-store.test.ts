import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApprovalRequest, PurchaseOrder } from "./commerce-types";

const fakeRedisState = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  sets: new Map<string, Set<string>>(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@upstash/redis", () => {
  class FakeRedis {
    async set(key: string, value: unknown, options?: { nx?: boolean }) {
      if (options?.nx && fakeRedisState.values.has(key)) return null;
      fakeRedisState.values.set(key, structuredClone(value));
      return "OK";
    }

    async get<T>(key: string): Promise<T | null> {
      return (fakeRedisState.values.has(key) ? structuredClone(fakeRedisState.values.get(key)) : null) as T | null;
    }

    async sadd(key: string, value: string) {
      const members = fakeRedisState.sets.get(key) ?? new Set<string>();
      members.add(value);
      fakeRedisState.sets.set(key, members);
      return 1;
    }

    async smembers<T>(key: string): Promise<T> {
      return [...(fakeRedisState.sets.get(key) ?? [])] as T;
    }

    async mget<T>(...keys: string[]): Promise<T> {
      return keys.map((key) => fakeRedisState.values.has(key) ? structuredClone(fakeRedisState.values.get(key)) : null) as T;
    }

    multi() {
      const operations: Array<() => Promise<unknown>> = [];
      const transaction = {
        set: (key: string, value: unknown) => { operations.push(() => this.set(key, value)); return transaction; },
        sadd: (key: string, value: string) => { operations.push(() => this.sadd(key, value)); return transaction; },
        exec: async () => Promise.all(operations.map((operation) => operation())),
      };
      return transaction;
    }

    async eval(_script: string, keys: string[], args: string[]) {
      if (fakeRedisState.values.get(keys[0]) === args[0]) {
        fakeRedisState.values.delete(keys[0]);
        return 1;
      }
      return 0;
    }
  }
  return { Redis: FakeRedis };
});

import { listOrders, saveOrderIdempotently } from "./commerce-store";

const owner = "0x0000000000000000000000000000000000000001";
const account = "0x0000000000000000000000000000000000000002";
const quoteId = "778f33be-fc13-4473-b79e-8214713c33ee";
const now = "2026-07-20T12:00:00.000Z";
const expiry = "2030-07-20T12:10:00.000Z";

function order(id: string, approvalId?: string): PurchaseOrder {
  return {
    id,
    cart: {
      id: crypto.randomUUID(),
      quote: {
        id: quoteId,
        providerId: "direct-onchain",
        providerMode: "sandbox",
        category: "direct",
        asset: "USDG",
        currency: "USD",
        amountMinor: "25000000",
        lines: [{ id: "invoice", label: "Invoice", quantity: 1, unitAmountMinor: "25000000" }],
        merchantName: "Verified recipient",
        merchantRecipient: "0x0000000000000000000000000000000000000003",
        summary: "Pay invoice",
        createdAt: now,
        expiresAt: expiry,
        sourceReference: "sandbox:order-idempotency",
        purchaseAvailable: false,
        disclosure: "Sandbox quote only; no real funds move.",
      },
      chainId: 46630,
      account,
      owner,
      createdAt: now,
      expiresAt: expiry,
      intentHash: `0x${"1".repeat(64)}`,
    },
    status: approvalId ? "awaiting-approval" : "approved",
    policyDecision: {
      outcome: approvalId ? "approval-required" : "allowed",
      code: approvalId ? "HUMAN_APPROVAL_THRESHOLD" : "OK",
      explanation: approvalId ? "Human approval is required." : "Every policy passed.",
    },
    approvalId,
    paymentRail: "direct-onchain",
    createdAt: now,
    updatedAt: now,
  };
}

function approval(id: string, orderId: string): ApprovalRequest {
  const source = order(orderId, id);
  return {
    id,
    orderId,
    account,
    chainId: 46630,
    owner,
    quote: source.cart.quote,
    intentHash: source.cart.intentHash,
    reason: "Human approval is required.",
    status: "pending",
    nonce: "0",
    createdAt: now,
    expiresAt: expiry,
  };
}

describe("durable commerce order idempotency", () => {
  beforeEach(() => {
    fakeRedisState.values.clear();
    fakeRedisState.sets.clear();
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    process.env.COMMERCE_DATA_ENCRYPTION_KEY = "11".repeat(32);
  });

  it("returns the original order when the same owner/account/quote is submitted again", async () => {
    const first = order("812ef200-b4f8-4580-ae74-0c5f5d7f20b2");
    const duplicate = order("912ef200-b4f8-4580-ae74-0c5f5d7f20b3");
    await expect(saveOrderIdempotently(first)).resolves.toMatchObject({ created: true, order: { id: first.id } });
    await expect(saveOrderIdempotently(duplicate)).resolves.toMatchObject({ created: false, order: { id: first.id } });
    await expect(listOrders()).resolves.toHaveLength(1);
  });

  it("allows only one winner when duplicate order requests race", async () => {
    const first = order("a12ef200-b4f8-4580-ae74-0c5f5d7f20b4");
    const second = order("b12ef200-b4f8-4580-ae74-0c5f5d7f20b5");
    const results = await Promise.allSettled([
      saveOrderIdempotently(first),
      saveOrderIdempotently(second),
    ]);
    expect(results.some((result) => result.status === "fulfilled" && result.value.created)).toBe(true);
    await expect(listOrders()).resolves.toHaveLength(1);
  });

  it("writes a linked approval and order in one transaction and rejects mismatched linkage", async () => {
    const orderId = "c12ef200-b4f8-4580-ae74-0c5f5d7f20b6";
    const approvalId = "d12ef200-b4f8-4580-ae74-0c5f5d7f20b7";
    const pending = order(orderId, approvalId);
    await expect(saveOrderIdempotently(pending, approval(approvalId, orderId))).resolves.toMatchObject({ created: true });
    await expect(saveOrderIdempotently(
      order("e12ef200-b4f8-4580-ae74-0c5f5d7f20b8", "f12ef200-b4f8-4580-ae74-0c5f5d7f20b9"),
      approval("011ef200-b4f8-4580-ae74-0c5f5d7f20ba", "e12ef200-b4f8-4580-ae74-0c5f5d7f20b8"),
    )).rejects.toThrow("linkage");
  });
});
