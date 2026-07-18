import { describe, expect, it } from "vitest";
import type { AgentExecution } from "./agent-types";
import { remainingRollingLimit, summarizeExecutionStatuses } from "./public-metrics";

const execution = (status: AgentExecution["status"]): AgentExecution => ({
  id: crypto.randomUUID(),
  strategyId: crypto.randomUUID(),
  strategyName: "Daily testnet DCA",
  target: "0xEd7A64Ff77da059fcE68E7704D97276fcF853570",
  amountEth: "0.0001",
  trigger: "manual",
  status,
  createdAt: "2026-07-18T01:12:04.294Z",
});

describe("public metrics", () => {
  it("never reports a negative remaining rolling limit", () => {
    expect(remainingRollingLimit(BigInt(10), BigInt(4))).toBe(BigInt(6));
    expect(remainingRollingLimit(BigInt(10), BigInt(12))).toBe(BigInt(0));
  });

  it("summarizes public receipt outcomes", () => {
    expect(summarizeExecutionStatuses([
      execution("confirmed"),
      execution("confirmed"),
      execution("blocked"),
      execution("failed"),
    ])).toEqual({ confirmed: 2, blocked: 1, failed: 1 });
  });
});
