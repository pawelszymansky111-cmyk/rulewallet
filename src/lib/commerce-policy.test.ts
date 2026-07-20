import { describe, expect, it } from "vitest";
import { evaluateCommercePolicy, isInsideUtcWindow } from "./commerce-policy";
import type { CommercePolicy, CommerceQuote, SpendWindow } from "./commerce-types";

const account = "0x0000000000000000000000000000000000000001";
const quote: CommerceQuote = {
  id: "778f33be-fc13-4473-b79e-8214713c33ee",
  providerId: "duffel-flights",
  providerMode: "sandbox",
  category: "travel",
  asset: "USDG",
  currency: "USD",
  amountMinor: "2500",
  lines: [{ id: "flight", label: "Flight", quantity: 1, unitAmountMinor: "2500" }],
  merchantName: "Duffel Flights",
  summary: "A flight",
  createdAt: "2026-07-20T10:00:00.000Z",
  expiresAt: "2026-07-20T10:10:00.000Z",
  sourceReference: "sandbox:1",
  purchaseAvailable: false,
  disclosure: "Sandbox quote only; no funds move.",
};

const policy: CommercePolicy = {
  chainId: 46630,
  account,
  asset: "USDG",
  perTransactionMinor: "10000",
  rolling24HoursMinor: "50000",
  dailyMinor: "25000",
  weeklyMinor: "100000",
  monthlyMinor: "300000",
  categoryDailyMinor: "15000",
  merchantDailyMinor: "10000",
  merchantMaxTransactionsPerDay: 3,
  approvalAboveMinor: "5000",
  trustedMerchant: true,
  autonomousMerchant: true,
  allowedWeekdaysBitmap: 127,
  utcStartMinute: 0,
  utcEndMinute: 0,
  expiresAt: "2027-07-20T10:00:00.000Z",
};

const spend: SpendWindow = {
  rolling24HoursMinor: "0",
  dailyMinor: "0",
  weeklyMinor: "0",
  monthlyMinor: "0",
  merchantDailyMinor: "0",
  categoryDailyMinor: "0",
  merchantTransactionsToday: 0,
};

describe("commerce policy evaluator", () => {
  it("allows a trusted quote inside every limit", () => {
    expect(
      evaluateCommercePolicy({ quote, policy, spend, at: new Date("2026-07-20T10:01:00Z"), expectedAccount: account }),
    ).toMatchObject({ outcome: "allowed", code: "OK" });
  });

  it("requires approval above the configured threshold", () => {
    expect(
      evaluateCommercePolicy({
        quote: { ...quote, amountMinor: "5001" },
        policy,
        spend,
        at: new Date("2026-07-20T10:01:00Z"),
      }),
    ).toMatchObject({ outcome: "approval-required", code: "HUMAN_APPROVAL_THRESHOLD" });
  });

  it.each([
    ["rolling24HoursMinor", "48000", "ROLLING_24H_LIMIT"],
    ["dailyMinor", "24000", "DAILY_LIMIT"],
    ["weeklyMinor", "99000", "WEEKLY_LIMIT"],
    ["monthlyMinor", "299000", "MONTHLY_LIMIT"],
    ["categoryDailyMinor", "14000", "CATEGORY_DAILY_LIMIT"],
    ["merchantDailyMinor", "9000", "MERCHANT_DAILY_LIMIT"],
  ] as const)("blocks the %s budget", (field, value, code) => {
    expect(
      evaluateCommercePolicy({
        quote,
        policy,
        spend: { ...spend, [field]: value },
        at: new Date("2026-07-20T10:01:00Z"),
      }),
    ).toMatchObject({ outcome: "blocked", code });
  });

  it("blocks an untrusted merchant before approval logic", () => {
    expect(
      evaluateCommercePolicy({ quote, policy: { ...policy, trustedMerchant: false }, spend }),
    ).toMatchObject({ outcome: "blocked", code: "UNTRUSTED_MERCHANT" });
  });

  it("supports UTC windows that cross midnight", () => {
    expect(isInsideUtcWindow(new Date("2026-07-20T23:30:00Z"), 127, 22 * 60, 6 * 60)).toBe(true);
    expect(isInsideUtcWindow(new Date("2026-07-20T12:00:00Z"), 127, 22 * 60, 6 * 60)).toBe(false);
  });
});
