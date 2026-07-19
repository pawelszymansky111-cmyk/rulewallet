import { getAddress, isAddress, isHash, zeroAddress, type Address } from "viem";
import { z } from "zod";
import { ROBINHOOD_MAINNET_CHAIN_ID, ROBINHOOD_MAINNET_USDG } from "./mainnet-registry";

const uintString = z.string().regex(/^\d+$/);
const addressSchema = z.string().refine(isAddress).transform((value) => getAddress(value));

export const mainnetStrategySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(64),
  owner: addressSchema,
  chainId: z.literal(ROBINHOOD_MAINNET_CHAIN_ID),
  account: addressSchema,
  asset: addressSchema,
  recipient: addressSchema,
  amount: uintString,
  nonce: uintString,
  expiry: uintString,
  intervalSeconds: z.number().int().min(300).max(31_536_000),
  maxExecutions: z.number().int().min(1).max(10_000),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
  digest: z.string().refine(isHash).optional(),
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  nextRunAt: z.iso.datetime(),
  lastRunAt: z.iso.datetime().optional(),
});

export type MainnetAgentStrategy = z.infer<typeof mainnetStrategySchema>;
export type PublicMainnetAgentStrategy = Omit<MainnetAgentStrategy, "signature">;

export const mainnetExecutionSchema = z.object({
  id: z.string().uuid(),
  strategyId: z.string().uuid(),
  strategyName: z.string(),
  account: addressSchema,
  asset: addressSchema,
  recipient: addressSchema,
  amount: uintString,
  trigger: z.enum(["schedule", "manual"]),
  status: z.enum(["pending", "confirmed", "replaced", "timed_out", "late_confirmed", "blocked", "failed"]),
  reason: z.string().max(400).optional(),
  transactionHash: z.string().refine(isHash).optional(),
  blockNumber: uintString.optional(),
  confirmations: z.number().int().nonnegative().optional(),
  createdAt: z.iso.datetime(),
});

export type MainnetAgentExecution = z.infer<typeof mainnetExecutionSchema>;

export const createMainnetStrategySchema = z.object({
  name: z.string().min(3).max(64),
  owner: addressSchema,
  account: addressSchema,
  asset: addressSchema,
  recipient: addressSchema,
  amount: uintString,
  nonce: uintString,
  expiry: uintString,
  intervalSeconds: z.number().int().min(300).max(31_536_000),
  maxExecutions: z.number().int().min(1).max(10_000),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
});

export type CreateMainnetStrategy = z.infer<typeof createMainnetStrategySchema>;

export const mainnetAdminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set-strategy-active"),
    strategyId: z.string().uuid(),
    account: addressSchema,
    active: z.boolean(),
    nonce: z.string().uuid(),
    expiresAt: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("run-strategy"),
    strategyId: z.string().uuid(),
    account: addressSchema,
    nonce: z.string().uuid(),
    expiresAt: z.number().int().positive(),
  }),
]);

export type MainnetAdminAction = z.infer<typeof mainnetAdminActionSchema>;

export const signedMainnetAdminActionSchema = z.object({
  payload: mainnetAdminActionSchema,
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
});

export function buildMainnetAdminMessage(action: MainnetAdminAction) {
  return [
    "RuleWallet mainnet scheduler authorization",
    "Chain ID: 4663",
    `Policy account: ${action.account}`,
    `Action: ${action.action}`,
    `Strategy ID: ${action.strategyId}`,
    ...(action.action === "set-strategy-active" ? [`Active: ${String(action.active)}`] : []),
    `Nonce: ${action.nonce}`,
    `Expires at: ${action.expiresAt}`,
    "This signature cannot move funds or change onchain policy.",
  ].join("\n");
}

export const strategyTypes = {
  Strategy: [
    { name: "chainId", type: "uint256" },
    { name: "account", type: "address" },
    { name: "asset", type: "address" },
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint128" },
    { name: "nonce", type: "uint64" },
    { name: "expiry", type: "uint64" },
    { name: "intervalSeconds", type: "uint32" },
    { name: "maxExecutions", type: "uint32" },
  ],
} as const;

export function strategyTypedData(strategy: CreateMainnetStrategy) {
  if (strategy.asset !== zeroAddress && strategy.asset !== ROBINHOOD_MAINNET_USDG) {
    throw new Error("Only native ETH and canonical Robinhood Chain USDG are supported.");
  }
  return {
    domain: {
      name: "RuleWallet",
      version: "2",
      chainId: ROBINHOOD_MAINNET_CHAIN_ID,
      verifyingContract: strategy.account as Address,
    },
    types: strategyTypes,
    primaryType: "Strategy" as const,
    message: {
      chainId: BigInt(ROBINHOOD_MAINNET_CHAIN_ID),
      account: strategy.account as Address,
      asset: strategy.asset as Address,
      recipient: strategy.recipient as Address,
      amount: BigInt(strategy.amount),
      nonce: BigInt(strategy.nonce),
      expiry: BigInt(strategy.expiry),
      intervalSeconds: strategy.intervalSeconds,
      maxExecutions: strategy.maxExecutions,
    },
  };
}

export function publicStrategy(strategy: MainnetAgentStrategy): PublicMainnetAgentStrategy {
  const { signature, ...publicFields } = strategy;
  void signature;
  return publicFields;
}
