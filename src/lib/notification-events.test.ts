import { describe, expect, it } from "vitest";
import { approvalNotification, notificationFromExecution } from "./notification-events";
import type { AgentExecution } from "./agent-types";

const execution: AgentExecution = {
  id: "4bcb598b-8cbb-4f13-b3d1-9ae1956aa958",
  strategyId: "3d4be2e8-3b32-48d1-b96e-03854aacb6b8",
  strategyName: "Daily allowance",
  target: "0xEd7A64Ff77da059fcE68E7704D97276fcF853570",
  amountEth: "0.0001",
  trigger: "schedule",
  status: "confirmed",
  transactionHash:
    "0xf6688552c57255c2f577ff12c5b86fbda728c320af9258bc04fefc6f92f78fb1",
  blockNumber: "42",
  createdAt: "2026-07-19T12:00:00.000Z",
};

describe("notification events", () => {
  it("creates a confirmed execution notification without changing financial data", () => {
    const event = notificationFromExecution(execution);
    expect(event.topic).toBe("execution");
    expect(event.transactionHash).toBe(execution.transactionHash);
    expect(event.metadata.amountEth).toBe("0.0001");
  });

  it("raises unusual-spending severity for policy limit failures", () => {
    const event = notificationFromExecution({
      ...execution,
      status: "blocked",
      transactionHash: undefined,
      blockNumber: undefined,
      reason: "Amount exceeds the per-transaction limit.",
    });
    expect(event.topic).toBe("unusual-spending");
    expect(event.severity).toBe("critical");
  });

  it("creates an approval event for independent delivery adapters", () => {
    const event = approvalNotification({
      requestId: "17",
      strategyName: "Weekly payroll",
      amountEth: "0.001",
      occurredAt: "2026-07-19T12:00:00.000Z",
    });
    expect(event.topic).toBe("approval");
    expect(event.metadata.requestId).toBe("17");
  });
});
