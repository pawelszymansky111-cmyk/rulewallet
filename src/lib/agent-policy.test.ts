import { describe, expect, it } from "vitest";
import { getAgentBlockReason, type AgentPolicyInput } from "./agent-policy";

const valid: AgentPolicyInput = {
  policyActive: true,
  paused: false,
  hasAgentRole: true,
  allowedTarget: true,
  nativePolicyAllowed: true,
  amount: BigInt(100),
  maxPerTransaction: BigInt(500),
  approvalAbove: BigInt(200),
  contractBalance: BigInt(1_000),
};

describe("getAgentBlockReason", () => {
  it("allows a fully policy-compliant autonomous transfer", () => {
    expect(getAgentBlockReason(valid)).toBeUndefined();
  });

  it.each([
    ["inactive policy", { policyActive: false }, "Policy is inactive."],
    ["paused contract", { paused: true }, "Policy contract is paused."],
    ["missing role", { hasAgentRole: false }, "Dedicated signer does not have AGENT_ROLE."],
    ["unknown target", { allowedTarget: false }, "Strategy target is not allowlisted."],
    ["disabled asset", { nativePolicyAllowed: false }, "Native ETH policy is disabled."],
    ["transaction cap", { amount: BigInt(501) }, "Amount exceeds the per-transaction limit."],
    ["approval boundary", { amount: BigInt(201) }, "Autonomous strategies cannot cross the human approval threshold."],
    ["insufficient balance", { contractBalance: BigInt(99) }, "Policy account balance is insufficient."],
  ])("fails closed for %s", (_name, override, reason) => {
    expect(getAgentBlockReason({ ...valid, ...override })).toBe(reason);
  });
});
