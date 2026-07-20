import "server-only";
import { Redis } from "@upstash/redis";
import {
  approvalRequestSchema,
  commerceQuoteSchema,
  purchaseOrderSchema,
  type ApprovalRequest,
  type CommerceQuote,
  type PurchaseOrder,
} from "./commerce-types";

const quoteIdsKey = "rulewallet:commerce:quote-ids";
const orderIdsKey = "rulewallet:commerce:order-ids";
const approvalIdsKey = "rulewallet:commerce:approval-ids";
const challengePrefix = "rulewallet:commerce:challenge";

let redis: Redis | undefined;

function redisEnvironment() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
  };
}

export function commerceStorageConfigured() {
  const environment = redisEnvironment();
  return Boolean(environment.url && environment.token);
}

function getRedis() {
  const environment = redisEnvironment();
  if (!environment.url || !environment.token) {
    throw new Error("Commerce storage is not configured. Add an Upstash Redis integration first.");
  }
  redis ??= new Redis({ url: environment.url, token: environment.token });
  return redis;
}

function quoteKey(id: string) {
  return `rulewallet:commerce:quote:${id}`;
}

function quoteIdempotencyKey(idempotencyKey: string) {
  return `rulewallet:commerce:quote-idempotency:${idempotencyKey}`;
}

function orderKey(id: string) {
  return `rulewallet:commerce:order:${id}`;
}

function approvalKey(id: string) {
  return `rulewallet:commerce:approval:${id}`;
}

function challengeKey(address: string) {
  return `${challengePrefix}:${address.toLowerCase()}`;
}

export async function saveCommerceChallenge(address: string, message: string, ttlSeconds = 300) {
  await getRedis().set(challengeKey(address), message, { ex: ttlSeconds });
}

export async function claimCommerceChallenge(address: string, message: string) {
  const result = await getRedis().eval<[string], number>(
    "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
    [challengeKey(address)],
    [message],
  );
  return result === 1;
}

export async function saveQuoteIdempotently(quote: CommerceQuote, idempotencyKey: string) {
  const parsed = commerceQuoteSchema.parse(quote);
  const client = getRedis();
  const existingId = await client.get<string>(quoteIdempotencyKey(idempotencyKey));
  if (existingId) {
    const existing = await getQuote(existingId);
    if (existing) return existing;
  }
  await client.set(quoteKey(parsed.id), parsed, { ex: 15 * 60 });
  const claimed = await client.set(quoteIdempotencyKey(idempotencyKey), parsed.id, {
    nx: true,
    ex: 15 * 60,
  });
  if (claimed !== "OK") {
    const winnerId = await client.get<string>(quoteIdempotencyKey(idempotencyKey));
    const winner = winnerId ? await getQuote(winnerId) : undefined;
    if (winner) return winner;
  }
  await client.sadd(quoteIdsKey, parsed.id);
  return parsed;
}

export async function getQuote(id: string): Promise<CommerceQuote | undefined> {
  const value = await getRedis().get<unknown>(quoteKey(id));
  return value ? commerceQuoteSchema.parse(value) : undefined;
}

export async function saveOrder(order: PurchaseOrder) {
  const parsed = purchaseOrderSchema.parse(order);
  const client = getRedis();
  await Promise.all([
    client.set(orderKey(parsed.id), parsed),
    client.sadd(orderIdsKey, parsed.id),
  ]);
  return parsed;
}

export async function getOrder(id: string): Promise<PurchaseOrder | undefined> {
  const value = await getRedis().get<unknown>(orderKey(id));
  if (!value) return undefined;
  const parsed = purchaseOrderSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export async function listOrders(limit = 100): Promise<PurchaseOrder[]> {
  const client = getRedis();
  const ids = await client.smembers<string[]>(orderIdsKey);
  if (ids.length === 0) return [];
  const values = await client.mget<unknown[]>(...ids.slice(0, limit).map(orderKey));
  return values
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .flatMap((value) => {
      const parsed = purchaseOrderSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function saveApproval(approval: ApprovalRequest) {
  const parsed = approvalRequestSchema.parse(approval);
  const client = getRedis();
  await Promise.all([
    client.set(approvalKey(parsed.id), parsed),
    client.sadd(approvalIdsKey, parsed.id),
  ]);
  return parsed;
}

export async function getApproval(id: string): Promise<ApprovalRequest | undefined> {
  const value = await getRedis().get<unknown>(approvalKey(id));
  if (!value) return undefined;
  const parsed = approvalRequestSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export async function listApprovals(limit = 100): Promise<ApprovalRequest[]> {
  const client = getRedis();
  const ids = await client.smembers<string[]>(approvalIdsKey);
  if (ids.length === 0) return [];
  const values = await client.mget<unknown[]>(...ids.slice(0, limit).map(approvalKey));
  return values
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .flatMap((value) => {
      const parsed = approvalRequestSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
