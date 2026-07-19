import { z } from "zod";
import type { AgentExecution } from "@/lib/agent-types";

export const notificationTopicSchema = z.enum([
  "execution",
  "approval",
  "failure",
  "unusual-spending",
]);

export const notificationEventSchema = z.object({
  id: z.string().uuid(),
  topic: notificationTopicSchema,
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string().min(3).max(96),
  message: z.string().min(3).max(320),
  network: z.literal("Robinhood Chain Testnet"),
  chainId: z.literal(46630),
  occurredAt: z.iso.datetime(),
  strategyId: z.string().uuid().optional(),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  metadata: z.record(z.string(), z.string()).default({}),
});

export type NotificationTopic = z.infer<typeof notificationTopicSchema>;
export type NotificationEvent = z.infer<typeof notificationEventSchema>;

const unusualReasonPattern =
  /limit|threshold|balance|allowlist|trusted|role|paused|inactive/i;

export function notificationFromExecution(
  execution: AgentExecution,
): NotificationEvent {
  const unusual =
    execution.status !== "confirmed" &&
    unusualReasonPattern.test(execution.reason ?? "");
  const topic: NotificationTopic =
    execution.status === "confirmed"
      ? "execution"
      : unusual
        ? "unusual-spending"
        : "failure";

  const title =
    topic === "execution"
      ? "Scheduled transfer confirmed"
      : topic === "unusual-spending"
        ? "Policy stopped an unusual request"
        : "Scheduled transfer failed";

  return notificationEventSchema.parse({
    id: crypto.randomUUID(),
    topic,
    severity:
      topic === "execution" ? "info" : topic === "failure" ? "warning" : "critical",
    title,
    message:
      execution.status === "confirmed"
        ? `${execution.strategyName} sent ${execution.amountEth} testnet ETH within policy.`
        : `${execution.strategyName} did not execute: ${execution.reason ?? "No reason supplied."}`,
    network: "Robinhood Chain Testnet",
    chainId: 46630,
    occurredAt: execution.createdAt,
    strategyId: execution.strategyId,
    transactionHash: execution.transactionHash,
    metadata: {
      executionId: execution.id,
      status: execution.status,
      trigger: execution.trigger,
      target: execution.target,
      amountEth: execution.amountEth,
      ...(execution.policyAccount ? { policyAccount: execution.policyAccount } : {}),
    },
  });
}

export function approvalNotification(input: {
  requestId: string;
  strategyName: string;
  amountEth: string;
  occurredAt?: string;
}): NotificationEvent {
  return notificationEventSchema.parse({
    id: crypto.randomUUID(),
    topic: "approval",
    severity: "warning",
    title: "Human approval required",
    message: `${input.strategyName} requested ${input.amountEth} testnet ETH and is waiting for an approver.`,
    network: "Robinhood Chain Testnet",
    chainId: 46630,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    metadata: { requestId: input.requestId },
  });
}
