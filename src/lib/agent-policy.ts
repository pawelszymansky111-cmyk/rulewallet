export type AgentPolicyInput = {
  policyActive: boolean;
  paused: boolean;
  hasAgentRole: boolean;
  allowedTarget: boolean;
  nativePolicyAllowed: boolean;
  amount: bigint;
  maxPerTransaction: bigint;
  approvalAbove: bigint;
  contractBalance: bigint;
};

export function getAgentBlockReason(input: AgentPolicyInput) {
  if (!input.policyActive) return "Policy is inactive.";
  if (input.paused) return "Policy contract is paused.";
  if (!input.hasAgentRole) return "Dedicated signer does not have AGENT_ROLE.";
  if (!input.allowedTarget) return "Strategy target is not allowlisted.";
  if (!input.nativePolicyAllowed) return "Native ETH policy is disabled.";
  if (input.amount > input.maxPerTransaction) return "Amount exceeds the per-transaction limit.";
  if (input.amount > input.approvalAbove) {
    return "Autonomous strategies cannot cross the human approval threshold.";
  }
  if (input.amount > input.contractBalance) return "Policy account balance is insufficient.";
  return undefined;
}
