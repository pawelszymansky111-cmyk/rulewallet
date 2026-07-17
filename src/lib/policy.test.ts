import { describe, expect, it } from "vitest";
import { demoPolicy, evaluatePolicy, type TransactionRequest } from "./policy";

const safeRequest: TransactionRequest = {
  amountUsd: 45,
  token: "USDC",
  target: "Uniswap Router",
  slippageBps: 30,
  oracleAgeSeconds: 12,
  spentTodayUsd: 310,
  marketOpen: true,
};

describe("evaluatePolicy", () => {
  it("allows a request that passes hard rules below the approval threshold", () => {
    const decision = evaluatePolicy(demoPolicy, safeRequest);

    expect(decision.status).toBe("allowed");
    expect(decision.rules.every((rule) => rule.passed)).toBe(true);
  });

  it("requires review above the human threshold", () => {
    const decision = evaluatePolicy(demoPolicy, { ...safeRequest, amountUsd: 150 });

    expect(decision.status).toBe("review");
    expect(decision.rules.every((rule) => rule.passed)).toBe(true);
  });

  it("blocks a hard-cap failure instead of offering human override", () => {
    const decision = evaluatePolicy(demoPolicy, { ...safeRequest, amountUsd: 400 });

    expect(decision.status).toBe("blocked");
    expect(decision.rules.find((rule) => rule.id === "transaction-cap")?.passed).toBe(false);
  });

  it.each([
    ["unknown token", { token: "USDT" }, "token"],
    ["unknown target", { target: "Unknown 0x7d…91c" }, "target"],
    ["stale price", { oracleAgeSeconds: 180 }, "oracle"],
    ["excessive slippage", { slippageBps: 250 }, "slippage"],
    ["daily exposure", { amountUsd: 100, spentTodayUsd: 950 }, "daily-cap"],
  ])("blocks %s", (_name, requestOverride, failedRule) => {
    const decision = evaluatePolicy(demoPolicy, { ...safeRequest, ...requestOverride });

    expect(decision.status).toBe("blocked");
    expect(decision.rules.find((rule) => rule.id === failedRule)?.passed).toBe(false);
  });

  it("fails closed when the policy is paused", () => {
    const decision = evaluatePolicy({ ...demoPolicy, active: false }, safeRequest);

    expect(decision.status).toBe("blocked");
    expect(decision.rules.find((rule) => rule.id === "active")?.passed).toBe(false);
  });

  it("enforces a configured market-hours window", () => {
    const decision = evaluatePolicy(
      { ...demoPolicy, marketHoursOnly: true },
      { ...safeRequest, marketOpen: false },
    );

    expect(decision.status).toBe("blocked");
    expect(decision.rules.find((rule) => rule.id === "market-hours")?.passed).toBe(false);
  });
});
