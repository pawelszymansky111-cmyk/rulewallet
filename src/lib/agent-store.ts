import "server-only";
import { Redis } from "@upstash/redis";
import {
  executionSchema,
  strategySchema,
  type AgentExecution,
  type AgentStrategy,
} from "@/lib/agent-types";

const strategyIdsKey = "rulewallet:strategy-ids";
const executionKey = "rulewallet:executions";

let redis: Redis | undefined;

function redisEnvironment() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
  };
}

export function storageConfigured() {
  const environment = redisEnvironment();
  return Boolean(environment.url && environment.token);
}

function getRedis() {
  if (!storageConfigured()) {
    throw new Error("Strategy storage is not configured.");
  }
  const environment = redisEnvironment();
  redis ??= new Redis({ url: environment.url!, token: environment.token! });
  return redis;
}

function strategyKey(id: string) {
  return `rulewallet:strategy:${id}`;
}

export async function listStrategies(): Promise<AgentStrategy[]> {
  const client = getRedis();
  const ids = await client.smembers<string[]>(strategyIdsKey);
  if (ids.length === 0) return [];
  const values = await client.mget<unknown[]>(...ids.map(strategyKey));
  return values
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .map((value) => strategySchema.parse(value))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function getStrategy(id: string): Promise<AgentStrategy | undefined> {
  const value = await getRedis().get<unknown>(strategyKey(id));
  return value ? strategySchema.parse(value) : undefined;
}

export async function saveStrategy(strategy: AgentStrategy) {
  const parsed = strategySchema.parse(strategy);
  const client = getRedis();
  await Promise.all([
    client.set(strategyKey(parsed.id), parsed),
    client.sadd(strategyIdsKey, parsed.id),
  ]);
  return parsed;
}

export async function listExecutions(limit = 50): Promise<AgentExecution[]> {
  const values = await getRedis().lrange<unknown>(executionKey, 0, Math.max(0, limit - 1));
  return values.map((value) => executionSchema.parse(value));
}

export async function saveExecution(execution: AgentExecution) {
  const parsed = executionSchema.parse(execution);
  const client = getRedis();
  await client.lpush(executionKey, parsed);
  await client.ltrim(executionKey, 0, 199);
  return parsed;
}

export async function claimExecutionLock(strategyId: string) {
  const lockKey = `rulewallet:lock:${strategyId}`;
  const claimed = await getRedis().set(lockKey, crypto.randomUUID(), { nx: true, ex: 120 });
  return claimed === "OK" ? lockKey : undefined;
}

export async function releaseExecutionLock(lockKey: string) {
  await getRedis().del(lockKey);
}

export async function claimAdminNonce(nonce: string) {
  const result = await getRedis().set(`rulewallet:admin-nonce:${nonce}`, "used", {
    nx: true,
    ex: 600,
  });
  return result === "OK";
}
