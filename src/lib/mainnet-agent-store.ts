import "server-only";
import { Redis } from "@upstash/redis";
import {
  mainnetExecutionSchema,
  mainnetStrategySchema,
  type MainnetAgentExecution,
  type MainnetAgentStrategy,
} from "@/lib/mainnet-agent-types";

const prefix = "rulewallet:mainnet:4663";
const strategyIdsKey = `${prefix}:strategy-ids`;
const executionKey = `${prefix}:executions`;
let redis: Redis | undefined;

function environment() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
  };
}

function client() {
  const value = environment();
  if (!value.url || !value.token) throw new Error("Durable mainnet strategy storage is not configured.");
  redis ??= new Redis({ url: value.url, token: value.token });
  return redis;
}

function strategyKey(id: string) {
  return `${prefix}:strategy:${id}`;
}

export async function listMainnetStrategies() {
  const ids = await client().smembers<string[]>(strategyIdsKey);
  if (ids.length === 0) return [];
  const values = await client().mget<unknown[]>(...ids.map(strategyKey));
  return values
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .map((value) => mainnetStrategySchema.parse(value))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getMainnetStrategy(id: string) {
  const value = await client().get<unknown>(strategyKey(id));
  return value ? mainnetStrategySchema.parse(value) : undefined;
}

export async function saveMainnetStrategy(strategy: MainnetAgentStrategy) {
  const parsed = mainnetStrategySchema.parse(strategy);
  await Promise.all([
    client().set(strategyKey(parsed.id), parsed),
    client().sadd(strategyIdsKey, parsed.id),
  ]);
  return parsed;
}

export async function listMainnetExecutions(limit = 50) {
  const values = await client().lrange<unknown>(executionKey, 0, Math.max(0, limit - 1));
  return values.map((value) => mainnetExecutionSchema.parse(value));
}

export async function saveMainnetExecution(execution: MainnetAgentExecution) {
  const parsed = mainnetExecutionSchema.parse(execution);
  await client().lpush(executionKey, parsed);
  await client().ltrim(executionKey, 0, 499);
  return parsed;
}

export async function claimMainnetExecutionLock(strategyId: string) {
  const key = `${prefix}:lock:${strategyId}`;
  const token = crypto.randomUUID();
  const result = await client().set(key, token, { nx: true, ex: 300 });
  return result === "OK" ? { key, token } : undefined;
}

export async function releaseMainnetExecutionLock(lock: { key: string; token: string }) {
  await client().eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    [lock.key],
    [lock.token],
  );
}
