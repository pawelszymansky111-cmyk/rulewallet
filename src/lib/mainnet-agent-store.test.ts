import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeRedisState = vi.hoisted(() => ({ values: new Map<string, unknown>() }));

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

    async eval(script: string, keys: string[], args: string[]) {
      const current = fakeRedisState.values.get(keys[0]);
      const matches = script.includes("string.find")
        ? JSON.stringify(current).includes(args[0])
        : current === args[0];
      if (!matches) return 0;
      fakeRedisState.values.delete(keys[0]);
      return 1;
    }
  }
  return { Redis: FakeRedis };
});

import {
  claimMainnetAdminNonce,
  claimMainnetExecutionLock,
  claimMainnetSignerLock,
  claimMainnetStrategyDigest,
  clearMainnetPendingSignerTransaction,
  getMainnetPendingSignerTransaction,
  releaseMainnetExecutionLock,
  saveMainnetPendingSignerTransaction,
} from "./mainnet-agent-store";

const signer = "0x0000000000000000000000000000000000000001";
const transactionHash = `0x${"1".repeat(64)}` as const;

describe("durable mainnet concurrency state", () => {
  beforeEach(() => {
    fakeRedisState.values.clear();
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  it("allows one strategy worker and releases only with the exact lock token", async () => {
    const first = await claimMainnetExecutionLock("strategy-1");
    expect(first).toBeDefined();
    await expect(claimMainnetExecutionLock("strategy-1")).resolves.toBeUndefined();
    await releaseMainnetExecutionLock({ key: first!.key, token: "wrong-token" });
    await expect(claimMainnetExecutionLock("strategy-1")).resolves.toBeUndefined();
    await releaseMainnetExecutionLock(first!);
    await expect(claimMainnetExecutionLock("strategy-1")).resolves.toBeDefined();
  });

  it("serializes every strategy behind one signer-global nonce lock", async () => {
    const first = await claimMainnetSignerLock(signer);
    expect(first).toBeDefined();
    await expect(claimMainnetSignerLock(signer.toUpperCase())).resolves.toBeUndefined();
    await releaseMainnetExecutionLock(first!);
    await expect(claimMainnetSignerLock(signer)).resolves.toBeDefined();
  });

  it("keeps an unresolved nonce reserved until the exact transaction hash clears it", async () => {
    await saveMainnetPendingSignerTransaction(signer, {
      transactionHash,
      nonce: 9,
      strategyId: "strategy-1",
      submittedAt: "2026-07-20T12:00:00.000Z",
      signerAddress: signer,
      to: "0x0000000000000000000000000000000000000002",
      data: "0x12345678",
      value: "0",
    });
    await clearMainnetPendingSignerTransaction(signer, `0x${"2".repeat(64)}`);
    await expect(getMainnetPendingSignerTransaction(signer)).resolves.toMatchObject({ nonce: 9 });
    await clearMainnetPendingSignerTransaction(signer, transactionHash);
    await expect(getMainnetPendingSignerTransaction(signer)).resolves.toBeNull();
  });

  it("atomically rejects replayed strategy digests and admin nonces", async () => {
    await expect(claimMainnetStrategyDigest(`0x${"3".repeat(64)}`, 600)).resolves.toBe(true);
    await expect(claimMainnetStrategyDigest(`0x${"3".repeat(64)}`, 600)).resolves.toBe(false);
    await expect(claimMainnetAdminNonce("admin-nonce", 600)).resolves.toBe(true);
    await expect(claimMainnetAdminNonce("admin-nonce", 600)).resolves.toBe(false);
  });
});
