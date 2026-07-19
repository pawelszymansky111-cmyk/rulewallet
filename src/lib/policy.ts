export type Policy = {
  id: string;
  name: string;
  active: boolean;
  agentRoleActive: boolean;
  maxPerTransactionEth: number;
  maxRolling24HoursEth: number;
  approvalAboveEth: number;
  allowedAssets: string[];
  trustedRecipients: string[];
};

export type TransactionRequest = {
  amountEth: number;
  asset: string;
  recipient: string;
  spentRolling24HoursEth: number;
  accountBalanceEth: number;
};

export type RuleResult = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type PolicyDecision = {
  status: "allowed" | "review" | "blocked";
  summary: string;
  rules: RuleResult[];
};

export const demoPolicy: Policy = {
  id: "pol_testnet_payments_01",
  name: "Testnet payment agent",
  active: true,
  agentRoleActive: true,
  maxPerTransactionEth: 0.001,
  maxRolling24HoursEth: 0.005,
  approvalAboveEth: 0.0005,
  allowedAssets: ["Testnet ETH"],
  trustedRecipients: ["Payroll wallet", "Contractor wallet"],
};

function formatEth(value: number) {
  return `${value.toFixed(4)} testnet ETH`;
}

export function evaluatePolicy(
  policy: Policy,
  request: TransactionRequest,
): PolicyDecision {
  const projectedSpend = request.spentRolling24HoursEth + request.amountEth;
  const rules: RuleResult[] = [
    {
      id: "active",
      label: "Account is not paused",
      passed: policy.active,
      detail: policy.active ? "Emergency pause is off" : "The policy account is paused",
    },
    {
      id: "agent-role",
      label: "Agent role is active",
      passed: policy.agentRoleActive,
      detail: policy.agentRoleActive ? "The scoped agent still has authority" : "The agent role was revoked",
    },
    {
      id: "asset",
      label: "Asset is supported",
      passed: policy.allowedAssets.includes(request.asset),
      detail: `${request.asset} ${policy.allowedAssets.includes(request.asset) ? "is" : "is not"} enabled for this policy`,
    },
    {
      id: "recipient",
      label: "Recipient is trusted",
      passed: policy.trustedRecipients.includes(request.recipient),
      detail: `${request.recipient} ${policy.trustedRecipients.includes(request.recipient) ? "is" : "is not"} on the trusted list`,
    },
    {
      id: "transaction-cap",
      label: "Per-transfer limit",
      passed: request.amountEth <= policy.maxPerTransactionEth,
      detail: `${formatEth(request.amountEth)} of ${formatEth(policy.maxPerTransactionEth)} allowed`,
    },
    {
      id: "rolling-cap",
      label: "Rolling 24-hour limit",
      passed: projectedSpend <= policy.maxRolling24HoursEth,
      detail: `${formatEth(projectedSpend)} projected across the last 24 hours`,
    },
    {
      id: "balance",
      label: "Account has enough balance",
      passed: request.amountEth <= request.accountBalanceEth,
      detail: `${formatEth(request.accountBalanceEth)} available before gas`,
    },
  ];

  const failed = rules.filter((rule) => !rule.passed);

  if (failed.length > 0) {
    return {
      status: "blocked",
      summary: `${failed.length} hard ${failed.length === 1 ? "rule" : "rules"} failed. The agent cannot execute.`,
      rules,
    };
  }

  if (request.amountEth > policy.approvalAboveEth) {
    return {
      status: "review",
      summary: `Hard rules passed, but transfers above ${formatEth(policy.approvalAboveEth)} require human approval.`,
      rules,
    };
  }

  return {
    status: "allowed",
    summary: "Every rule passed. The scoped agent may execute this exact direct transfer.",
    rules,
  };
}
