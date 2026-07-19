import { describe, expect, it } from "vitest";
import { adminActionSchema, buildAdminMessage, createStrategyActionSchema, strategySchema } from "./agent-types";

const payload = {
  action: "create-strategy" as const,
  policyAccount: "0xddfeae34fa9cdd665bd833ecd5c8c06a4279bd25" as const,
  name: "Daily canary",
  target: "0xEd7A64Ff77da059fcE68E7704D97276fcF853570" as const,
  amountEth: "0.0001",
  cadenceHours: 24 as const,
  nonce: "9f3d9e5c-2d5f-4d1e-a57b-2d54a1328bc9",
  expiresAt: 1_800_000_000_000,
};

describe("agent admin actions", () => {
  it("builds a deterministic, chain-bound signing message", () => {
    const message = buildAdminMessage(payload, "0xddfeae34fa9cdd665bd833ecd5c8c06a4279bd25");
    expect(message).toContain("Chain ID: 46630");
    expect(message).toContain("0xddfeae34fa9cdd665bd833ecd5c8c06a4279bd25");
    expect(message).toContain("This signature does not move funds.");
    expect(buildAdminMessage({ ...payload }, "0xddfeae34fa9cdd665bd833ecd5c8c06a4279bd25")).toBe(message);
  });

  it("rejects a non-allowable cadence", () => {
    expect(createStrategyActionSchema.safeParse({ ...payload, cadenceHours: 1 }).success).toBe(false);
  });

  it("rejects malformed target addresses", () => {
    expect(createStrategyActionSchema.safeParse({ ...payload, target: "0x123" }).success).toBe(false);
  });

  it("binds a stored strategy to its personal policy account", () => {
    const strategy = strategySchema.parse({
      id: "7d03a0c0-1186-4e95-a211-b659353b742f",
      policyAccount: payload.policyAccount,
      name: payload.name,
      target: payload.target,
      amountEth: payload.amountEth,
      cadenceHours: payload.cadenceHours,
      active: true,
      createdAt: "2026-07-19T12:00:00.000Z",
      createdBy: "0x6BB7A02C77DB94AC8c08F429ACE4df8d1F1614F5",
      nextRunAt: "2026-07-20T12:00:00.000Z",
    });
    expect(strategy.policyAccount).toBe(payload.policyAccount);
  });

  it("rejects a signing message for another policy account", () => {
    expect(() =>
      buildAdminMessage(payload, "0xEd7A64Ff77da059fcE68E7704D97276fcF853570"),
    ).toThrow("does not match");
  });

  it("rejects unknown mutation types", () => {
    expect(adminActionSchema.safeParse({ ...payload, action: "withdraw" }).success).toBe(false);
  });
});
