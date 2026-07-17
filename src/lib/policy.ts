export type Policy = {
  id: string;
  name: string;
  active: boolean;
  maxPerTransactionUsd: number;
  maxPerDayUsd: number;
  approvalAboveUsd: number;
  maxSlippageBps: number;
  maxOracleAgeSeconds: number;
  allowedTokens: string[];
  allowedTargets: string[];
  marketHoursOnly: boolean;
};

export type TransactionRequest = {
  amountUsd: number;
  token: string;
  target: string;
  slippageBps: number;
  oracleAgeSeconds: number;
  spentTodayUsd: number;
  marketOpen: boolean;
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
  id: "pol_rh_trade_01",
  name: "RH testnet trading agent",
  active: true,
  maxPerTransactionUsd: 250,
  maxPerDayUsd: 1_000,
  approvalAboveUsd: 100,
  maxSlippageBps: 100,
  maxOracleAgeSeconds: 90,
  allowedTokens: ["USDC", "WETH", "HOOD"],
  allowedTargets: ["Uniswap Router", "Robinhood Swap"],
  marketHoursOnly: false,
};

export function evaluatePolicy(
  policy: Policy,
  request: TransactionRequest,
): PolicyDecision {
  const rules: RuleResult[] = [
    {
      id: "active",
      label: "Policy is active",
      passed: policy.active,
      detail: policy.active ? "Emergency pause is off" : "Policy has been paused",
    },
    {
      id: "token",
      label: "Token is allowed",
      passed: policy.allowedTokens.includes(request.token),
      detail: `${request.token} ${policy.allowedTokens.includes(request.token) ? "is" : "is not"} on the allowlist`,
    },
    {
      id: "target",
      label: "Contract is allowed",
      passed: policy.allowedTargets.includes(request.target),
      detail: `${request.target} ${policy.allowedTargets.includes(request.target) ? "is" : "is not"} approved`,
    },
    {
      id: "transaction-cap",
      label: "Per-transaction cap",
      passed: request.amountUsd <= policy.maxPerTransactionUsd,
      detail: `$${request.amountUsd} of $${policy.maxPerTransactionUsd} allowed`,
    },
    {
      id: "daily-cap",
      label: "Daily cap",
      passed: request.spentTodayUsd + request.amountUsd <= policy.maxPerDayUsd,
      detail: `$${request.spentTodayUsd + request.amountUsd} projected today`,
    },
    {
      id: "slippage",
      label: "Slippage protection",
      passed: request.slippageBps <= policy.maxSlippageBps,
      detail: `${(request.slippageBps / 100).toFixed(2)}% of ${(policy.maxSlippageBps / 100).toFixed(2)}% maximum`,
    },
    {
      id: "oracle",
      label: "Price feed freshness",
      passed: request.oracleAgeSeconds <= policy.maxOracleAgeSeconds,
      detail: `${request.oracleAgeSeconds}s old; ${policy.maxOracleAgeSeconds}s maximum`,
    },
    {
      id: "market-hours",
      label: "Trading window",
      passed: !policy.marketHoursOnly || request.marketOpen,
      detail: policy.marketHoursOnly
        ? request.marketOpen
          ? "Market window is open"
          : "Outside the permitted market window"
        : "No market-hours restriction",
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

  if (request.amountUsd > policy.approvalAboveUsd) {
    return {
      status: "review",
      summary: `Rules passed, but amounts above $${policy.approvalAboveUsd} require human approval.`,
      rules,
    };
  }

  return {
    status: "allowed",
    summary: "Every rule passed. This request can be signed by the scoped agent key.",
    rules,
  };
}
