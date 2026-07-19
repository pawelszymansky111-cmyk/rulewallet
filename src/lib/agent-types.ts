import { isAddress } from "viem";
import { z } from "zod";

export const cadenceHoursSchema = z.union([z.literal(24), z.literal(168)]);

export const strategySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(48),
  target: z.string().refine(isAddress, "Invalid EVM target address"),
  policyAccount: z.string().refine(isAddress, "Invalid RuleWallet policy-account address").optional(),
  amountEth: z.string().regex(/^0\.\d{1,18}$/, "Use a positive decimal ETH amount"),
  cadenceHours: cadenceHoursSchema,
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  createdBy: z.string().refine(isAddress),
  nextRunAt: z.iso.datetime(),
  lastRunAt: z.iso.datetime().optional(),
});

export type AgentStrategy = z.infer<typeof strategySchema>;

export const executionSchema = z.object({
  id: z.string().uuid(),
  strategyId: z.string().uuid(),
  strategyName: z.string(),
  target: z.string().refine(isAddress),
  policyAccount: z.string().refine(isAddress).optional(),
  amountEth: z.string(),
  trigger: z.enum(["schedule", "manual"]),
  status: z.enum(["confirmed", "blocked", "failed"]),
  reason: z.string().optional(),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  blockNumber: z.string().optional(),
  createdAt: z.iso.datetime(),
});

export type AgentExecution = z.infer<typeof executionSchema>;

const adminActionBase = z.object({
  policyAccount: z.string().refine(isAddress, "Invalid RuleWallet policy-account address"),
  nonce: z.string().uuid(),
  expiresAt: z.number().int().positive(),
});

export const createStrategyActionSchema = adminActionBase.extend({
  action: z.literal("create-strategy"),
  name: z.string().min(3).max(48),
  target: z.string().refine(isAddress, "Invalid EVM target address"),
  amountEth: z.string().regex(/^0\.\d{1,18}$/, "Use a positive decimal ETH amount"),
  cadenceHours: cadenceHoursSchema,
});

export const setStrategyActiveActionSchema = adminActionBase.extend({
  action: z.literal("set-strategy-active"),
  strategyId: z.string().uuid(),
  active: z.boolean(),
});

export const runStrategyActionSchema = adminActionBase.extend({
  action: z.literal("run-strategy"),
  strategyId: z.string().uuid(),
});

export const adminActionSchema = z.discriminatedUnion("action", [
  createStrategyActionSchema,
  setStrategyActiveActionSchema,
  runStrategyActionSchema,
]);

export type AdminAction = z.infer<typeof adminActionSchema>;

export const signedAdminActionSchema = z.object({
  payload: adminActionSchema,
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function buildAdminMessage(payload: AdminAction, contractAddress: string) {
  if (payload.policyAccount.toLowerCase() !== contractAddress.toLowerCase()) {
    throw new Error("Signed action policy account does not match the message contract.");
  }
  return [
    "RuleWallet testnet admin action",
    "Chain ID: 46630",
    `Contract: ${contractAddress.toLowerCase()}`,
    `Payload: ${JSON.stringify(stableValue(payload))}`,
    "This signature does not move funds.",
  ].join("\n");
}
