import "server-only";
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitStore = {
  consume: (key: string, windowMs: number) => Promise<Bucket>;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  durable: boolean;
  reason?: string;
};

export function rateLimitFailure(result: RateLimitResult, exceededMessage: string) {
  if (result.allowed) return undefined;
  return {
    error: result.reason ?? exceededMessage,
    status: result.reason ? 503 : 429,
  } as const;
}

let redis: Redis | undefined;

function redisEnvironment() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
  };
}

function durableKey(key: string) {
  return `rulewallet:rate-limit:${createHash("sha256").update(key).digest("hex")}`;
}

function getRedis() {
  const environment = redisEnvironment();
  if (!environment.url || !environment.token) return undefined;
  redis ??= new Redis({ url: environment.url, token: environment.token });
  return redis;
}

export function createMemoryRateLimitStore(now: () => number = Date.now): RateLimitStore {
  const buckets = new Map<string, Bucket>();
  return {
    async consume(key, windowMs) {
      const currentTime = now();
      const current = buckets.get(key);
      if (!current || current.resetAt <= currentTime) {
        const bucket = { count: 1, resetAt: currentTime + windowMs };
        buckets.set(key, bucket);
        return bucket;
      }
      current.count += 1;
      return { ...current };
    },
  };
}

const memoryStore = createMemoryRateLimitStore();

function redisStore(client: Redis): RateLimitStore {
  return {
    async consume(key, windowMs) {
      const [count, ttl] = await client.eval<
        [number],
        [number, number]
      >(
        "local current=redis.call('INCR',KEYS[1]); if current==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {current,redis.call('PTTL',KEYS[1])}",
        [durableKey(key)],
        [windowMs],
      );
      const safeTtl = Math.max(0, Number(ttl));
      return { count: Number(count), resetAt: Date.now() + safeTtl };
    },
  };
}

export async function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
  store?: RateLimitStore,
): Promise<RateLimitResult> {
  const client = getRedis();
  const selectedStore = store ?? (client ? redisStore(client) : memoryStore);
  const durable = Boolean(store || client);

  if (!store && !client && process.env.VERCEL_ENV === "production") {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + options.windowMs,
      durable: false,
      reason: "Durable rate limiting is unavailable.",
    };
  }

  let bucket: Bucket;
  try {
    bucket = await selectedStore.consume(key, options.windowMs);
  } catch {
    if (store) throw new Error("Rate-limit store failed.");
    if (process.env.VERCEL_ENV === "production" || client) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + options.windowMs,
        durable: false,
        reason: "Durable rate limiting is unavailable.",
      };
    }
    bucket = await memoryStore.consume(key, options.windowMs);
  }
  return {
    allowed: bucket.count <= options.limit,
    remaining: Math.max(0, options.limit - bucket.count),
    resetAt: bucket.resetAt,
    durable,
  };
}
