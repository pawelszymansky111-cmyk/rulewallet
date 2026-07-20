import type {
  CommercePolicy,
  CommerceQuote,
  PolicyDecision,
  SpendWindow,
} from "./commerce-types";

function exceeds(spent: string, amount: string, limit: string) {
  return BigInt(spent) + BigInt(amount) > BigInt(limit);
}

function blocked(code: PolicyDecision["code"], explanation: string): PolicyDecision {
  return { outcome: "blocked", code, explanation };
}

export function isInsideUtcWindow(
  at: Date,
  allowedWeekdaysBitmap: number,
  startMinute: number,
  endMinute: number,
) {
  const weekdayBit = 1 << at.getUTCDay();
  if ((allowedWeekdaysBitmap & weekdayBit) === 0) return false;
  const minute = at.getUTCHours() * 60 + at.getUTCMinutes();
  if (startMinute === endMinute) return true;
  if (startMinute < endMinute) return minute >= startMinute && minute < endMinute;
  return minute >= startMinute || minute < endMinute;
}

export function evaluateCommercePolicy(input: {
  quote: CommerceQuote;
  policy: CommercePolicy;
  spend: SpendWindow;
  at?: Date;
  expectedAccount?: string;
}): PolicyDecision {
  const at = input.at ?? new Date();
  const { quote, policy, spend } = input;
  if (
    input.expectedAccount &&
    policy.account.toLowerCase() !== input.expectedAccount.toLowerCase()
  ) {
    return blocked("ACCOUNT_MISMATCH", "The quote is not bound to this policy account.");
  }
  if (Date.parse(policy.expiresAt) <= at.getTime()) {
    return blocked("POLICY_EXPIRED", "This spending policy has expired.");
  }
  if (!policy.trustedMerchant) {
    return blocked("UNTRUSTED_MERCHANT", "The merchant is not enabled for this account.");
  }
  if (
    !isInsideUtcWindow(
      at,
      policy.allowedWeekdaysBitmap,
      policy.utcStartMinute,
      policy.utcEndMinute,
    )
  ) {
    return blocked("OUTSIDE_TIME_WINDOW", "The purchase is outside the allowed UTC schedule.");
  }

  const checks: Array<[boolean, PolicyDecision["code"], string]> = [
    [
      BigInt(quote.amountMinor) > BigInt(policy.perTransactionMinor),
      "PER_TRANSACTION_LIMIT",
      "The quote is above the per-transaction limit.",
    ],
    [
      exceeds(spend.rolling24HoursMinor, quote.amountMinor, policy.rolling24HoursMinor),
      "ROLLING_24H_LIMIT",
      "The quote would exceed the rolling 24-hour limit.",
    ],
    [
      exceeds(spend.dailyMinor, quote.amountMinor, policy.dailyMinor),
      "DAILY_LIMIT",
      "The quote would exceed today's limit.",
    ],
    [
      exceeds(spend.weeklyMinor, quote.amountMinor, policy.weeklyMinor),
      "WEEKLY_LIMIT",
      "The quote would exceed this week's limit.",
    ],
    [
      exceeds(spend.monthlyMinor, quote.amountMinor, policy.monthlyMinor),
      "MONTHLY_LIMIT",
      "The quote would exceed this month's limit.",
    ],
    [
      exceeds(spend.categoryDailyMinor, quote.amountMinor, policy.categoryDailyMinor),
      "CATEGORY_DAILY_LIMIT",
      "The quote would exceed this category's daily budget.",
    ],
    [
      exceeds(spend.merchantDailyMinor, quote.amountMinor, policy.merchantDailyMinor),
      "MERCHANT_DAILY_LIMIT",
      "The quote would exceed this merchant's daily budget.",
    ],
    [
      spend.merchantTransactionsToday + 1 > policy.merchantMaxTransactionsPerDay,
      "MERCHANT_COUNT_LIMIT",
      "The merchant transaction-count limit has been reached.",
    ],
  ];
  const failed = checks.find(([condition]) => condition);
  if (failed) return blocked(failed[1], failed[2]);

  if (!policy.autonomousMerchant) {
    return {
      outcome: "approval-required",
      code: "MERCHANT_REQUIRES_APPROVAL",
      explanation: "This merchant is enabled, but every purchase requires approval.",
    };
  }
  if (BigInt(quote.amountMinor) > BigInt(policy.approvalAboveMinor)) {
    return {
      outcome: "approval-required",
      code: "HUMAN_APPROVAL_THRESHOLD",
      explanation: "The quote is safe but above your approval threshold.",
    };
  }
  return {
    outcome: "allowed",
    code: "OK",
    explanation: "Every account, merchant, category, time, and amount rule passes.",
  };
}
