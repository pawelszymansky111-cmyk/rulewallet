import { describe, expect, it } from "vitest";
import { demoPolicy, evaluatePolicy, type TransactionRequest } from "./policy";

const safeRequest: TransactionRequest = {
  amountEth: 0.0001,
  asset: "Testnet ETH",
  recipient: "Payroll wallet",
  spentRolling24HoursEth: 0.0012,
  accountBalanceEth: 0.01,
};

describe("evaluatePolicy", () => {
  it("allows a small direct transfer to a trusted recipient", () => {
    expect(evaluatePolicy(demoPolicy, safeRequest).status).toBe("allowed");
  });

  it("requires human review above the configured threshold", () => {
    expect(evaluatePolicy(demoPolicy, { ...safeRequest, amountEth: 0.0007 }).status).toBe("review");
  });

  it.each([
    ["per-transfer limit", { amountEth: 0.002 }, "transaction-cap"],
    ["rolling limit", { amountEth: 0.0005, spentRolling24HoursEth: 0.0047 }, "rolling-cap"],
    ["trusted recipient", { recipient: "Unknown 0x7d…91c" }, "recipient"],
    ["supported asset", { asset: "Unsupported token" }, "asset"],
    ["available balance", { accountBalanceEth: 0.00001 }, "balance"],
  ])("blocks when the %s fails", (_label, override, ruleId) => {
    const decision = evaluatePolicy(demoPolicy, { ...safeRequest, ...override });
    expect(decision.status).toBe("blocked");
    expect(decision.rules.find((rule) => rule.id === ruleId)?.passed).toBe(false);
  });

  it("blocks paused accounts", () => {
    expect(evaluatePolicy({ ...demoPolicy, active: false }, safeRequest).status).toBe("blocked");
  });

  it("blocks agents after role revocation", () => {
    expect(evaluatePolicy({ ...demoPolicy, agentRoleActive: false }, safeRequest).status).toBe("blocked");
  });
});
