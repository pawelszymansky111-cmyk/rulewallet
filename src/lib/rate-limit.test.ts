import { describe, expect, it, vi } from "vitest";
import { checkRateLimit, createMemoryRateLimitStore, rateLimitFailure, type RateLimitStore } from "./rate-limit";

vi.mock("server-only", () => ({}));

describe("rate limiting", () => {
  it("enforces the exact limit and exposes the reset time", async () => {
    const store = createMemoryRateLimitStore(() => 1_000);
    await expect(checkRateLimit("one", { limit: 2, windowMs: 5_000 }, store)).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
      resetAt: 6_000,
    });
    await expect(checkRateLimit("one", { limit: 2, windowMs: 5_000 }, store)).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(checkRateLimit("one", { limit: 2, windowMs: 5_000 }, store)).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("uses one atomic store operation per request", async () => {
    let count = 0;
    const store: RateLimitStore = {
      async consume() {
        count += 1;
        return { count, resetAt: 10_000 };
      },
    };
    const results = await Promise.all(
      Array.from({ length: 4 }, () => checkRateLimit("shared", { limit: 3, windowMs: 1_000 }, store)),
    );
    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
  });

  it("distinguishes an unavailable production guard from a normal limit", () => {
    expect(rateLimitFailure({ allowed: false, remaining: 0, resetAt: 0, durable: true }, "Too many requests.")).toEqual({
      error: "Too many requests.",
      status: 429,
    });
    expect(rateLimitFailure({
      allowed: false,
      remaining: 0,
      resetAt: 0,
      durable: false,
      reason: "Durable rate limiting is unavailable.",
    }, "Too many requests.")).toEqual({
      error: "Durable rate limiting is unavailable.",
      status: 503,
    });
  });

  it("fails closed in production when durable Redis is not configured", async () => {
    const previous = {
      vercel: process.env.VERCEL_ENV,
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      kvUrl: process.env.KV_REST_API_URL,
      kvToken: process.env.KV_REST_API_TOKEN,
    };
    process.env.VERCEL_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    try {
      await expect(checkRateLimit("production", { limit: 1, windowMs: 1_000 })).resolves.toMatchObject({
        allowed: false,
        durable: false,
        reason: "Durable rate limiting is unavailable.",
      });
    } finally {
      for (const [key, value] of Object.entries({
        VERCEL_ENV: previous.vercel,
        UPSTASH_REDIS_REST_URL: previous.url,
        UPSTASH_REDIS_REST_TOKEN: previous.token,
        KV_REST_API_URL: previous.kvUrl,
        KV_REST_API_TOKEN: previous.kvToken,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
