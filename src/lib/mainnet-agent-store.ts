import "server-only";
import { Redis } from "@upstash/redis";
import {
  mainnetExecutionSchema,
  mainnetStrategySchema,
  type MainnetAgentExecution,
  type MainnetAgentStrategy,
} from "@/lib/mainnet-agent-types";
import type { Address, Hash, Hex } from "viem";

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

export async function claimMainnetStrategyDigest(digest: string, ttlSeconds: number) {
  const key = `${prefix}:strategy-digest:${digest.toLowerCase()}`;
  const result = await client().set(key, "claimed", { nx: true, ex: Math.max(300, ttlSeconds) });
  return result === "OK";
}

export async function claimMainnetAdminNonce(nonce: string, ttlSeconds = 600) {
  const key = `${prefix}:admin-nonce:${nonce}`;
  const result = await client().set(key, "claimed", { nx: true, ex: ttlSeconds });
  return result === "OK";
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

export async function setMainnetStrategyActive(id: string, active: boolean) {
  const strategy = await getMainnetStrategy(id);
  if (!strategy) throw new Error("Mainnet strategy not found.");
  return saveMainnetStrategy({
    ...strategy,
    active,
    nextRunAt: active ? new Date().toISOString() : strategy.nextRunAt,
  });
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

// Serializes every transaction emitted by one signer across all strategies.
// This closes the gap where two per-strategy locks could allocate the same
// pending account nonce concurrently.
export async function claimMainnetSignerLock(signerAddress: string) {
  const key = `${prefix}:lock:signer:${signerAddress.toLowerCase()}`;
  const token = crypto.randomUUID();
  const result = await client().set(key, token, { nx: true, ex: 300 });
  return result === "OK" ? { key, token } : undefined;
}

function pendingSignerKey(signerAddress: string) {
  return `${prefix}:pending:signer:${signerAddress.toLowerCase()}`;
}

export type PendingMainnetSignerTransaction = {
  transactionHash: Hash;
  nonce: number;
  strategyId: string;
  submittedAt: string;
  signerAddress: Address;
  to: Address;
  data: Hex;
  value: "0";
};

export async function getMainnetPendingSignerTransaction(signerAddress: string) {
  return client().get<PendingMainnetSignerTransaction>(pendingSignerKey(signerAddress));
}

export async function saveMainnetPendingSignerTransaction(signerAddress: string, value: PendingMainnetSignerTransaction) {
  await client().set(pendingSignerKey(signerAddress), value);
}

export async function clearMainnetPendingSignerTransaction(signerAddress: string, transactionHash: string) {
  const key = pendingSignerKey(signerAddress);
  await client().eval(
    "local v=redis.call('get',KEYS[1]); if v and string.find(v,ARGV[1],1,true) then return redis.call('del',KEYS[1]) else return 0 end",
    [key],
    [transactionHash],
  );
}

export async function releaseMainnetExecutionLock(lock: { key: string; token: string }) {
  await client().eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    [lock.key],
    [lock.token],
  );
}
