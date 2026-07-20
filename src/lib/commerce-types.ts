import { isAddress } from "viem";
import { z } from "zod";

export const commerceCategorySchema = z.enum([
  "travel",
  "food",
  "tickets",
  "shopping",
  "subscriptions",
  "payroll",
  "direct",
]);
export type CommerceCategory = z.infer<typeof commerceCategorySchema>;

export const commerceAssetSchema = z.enum(["ETH", "USDG"]);
export type CommerceAsset = z.infer<typeof commerceAssetSchema>;

export const providerModeSchema = z.enum([
  "live",
  "sandbox",
  "credentials-required",
  "planned",
]);
export type ProviderMode = z.infer<typeof providerModeSchema>;

export const paymentRailSchema = z.enum([
  "direct-onchain",
  "provider-api",
  "virtual-card",
  "hosted-checkout",
]);
export type PaymentRail = z.infer<typeof paymentRailSchema>;

export const commerceProviderSchema = z.object({
  id: z.string().min(2).max(48),
  name: z.string().min(2).max(64),
  category: commerceCategorySchema,
  mode: providerModeSchema,
  rail: paymentRailSchema,
  description: z.string().min(8).max(240),
  officialDomain: z.string().min(3).max(120),
  paymentAssets: z.array(commerceAssetSchema).min(1).max(2),
  settlement: z.string().min(3).max(180),
  verificationSource: z.url(),
  verifiedAt: z.iso.datetime(),
  refunds: z.enum(["provider-managed", "adapter-supported", "not-integrated", "not-applicable"]),
  cancellations: z.enum(["provider-managed", "adapter-supported", "not-integrated", "not-applicable"]),
  credential: z.string().optional(),
  documentationUrl: z.url().optional(),
  canQuote: z.boolean(),
  canPurchase: z.boolean(),
  automaticPaymentSupported: z.boolean(),
  handlesRealFunds: z.boolean(),
  disclosure: z.string().min(8).max(260),
});
export type CommerceProvider = z.infer<typeof commerceProviderSchema>;

const evmAddressSchema = z.string().refine(isAddress, "Enter a valid EVM address.");
const minorAmountSchema = z.string().regex(/^\d+$/, "Use an integer amount in minor units.");

export const quoteRequestSchema = z.object({
  providerId: z.string().min(2).max(48),
  category: commerceCategorySchema,
  query: z.string().trim().min(3).max(500),
  asset: commerceAssetSchema.default("USDG"),
  account: evmAddressSchema.optional(),
  recipient: evmAddressSchema.optional(),
  exactAmountMinor: minorAmountSchema.refine((value) => BigInt(value) > BigInt(0), "Amount must be positive.").optional(),
  travel: z.object({
    origin: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    destination: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    departureDate: z.iso.date(),
    passengers: z.number().int().min(1).max(9),
    cabinClass: z.enum(["economy", "premium_economy", "business", "first"]),
  }).optional(),
  idempotencyKey: z.string().uuid(),
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const quoteLineSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  quantity: z.number().int().positive().max(100),
  unitAmountMinor: minorAmountSchema,
});

export const commerceQuoteSchema = z.object({
  id: z.string().uuid(),
  providerId: z.string(),
  providerMode: providerModeSchema,
  category: commerceCategorySchema,
  asset: commerceAssetSchema,
  currency: z.enum(["ETH", "USD"]),
  amountMinor: minorAmountSchema,
  lines: z.array(quoteLineSchema).min(1).max(100),
  merchantName: z.string().min(2).max(120),
  merchantRecipient: evmAddressSchema.optional(),
  summary: z.string().min(3).max(500),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  sourceReference: z.string().min(1).max(200),
  checkoutUrl: z.url().optional(),
  purchaseAvailable: z.boolean(),
  disclosure: z.string().min(8).max(300),
});
export type CommerceQuote = z.infer<typeof commerceQuoteSchema>;

export const cartSchema = z.object({
  id: z.string().uuid(),
  quote: commerceQuoteSchema,
  chainId: z.literal(4663).or(z.literal(46630)),
  account: evmAddressSchema,
  owner: evmAddressSchema,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  intentHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});
export type CommerceCart = z.infer<typeof cartSchema>;

export const spendWindowSchema = z.object({
  rolling24HoursMinor: minorAmountSchema.default("0"),
  dailyMinor: minorAmountSchema.default("0"),
  weeklyMinor: minorAmountSchema.default("0"),
  monthlyMinor: minorAmountSchema.default("0"),
  merchantDailyMinor: minorAmountSchema.default("0"),
  categoryDailyMinor: minorAmountSchema.default("0"),
  merchantTransactionsToday: z.number().int().nonnegative().default(0),
});
export type SpendWindow = z.infer<typeof spendWindowSchema>;

export const commercePolicySchema = z.object({
  chainId: z.literal(4663).or(z.literal(46630)),
  account: evmAddressSchema,
  asset: commerceAssetSchema,
  perTransactionMinor: minorAmountSchema,
  rolling24HoursMinor: minorAmountSchema,
  dailyMinor: minorAmountSchema,
  weeklyMinor: minorAmountSchema,
  monthlyMinor: minorAmountSchema,
  categoryDailyMinor: minorAmountSchema,
  merchantDailyMinor: minorAmountSchema,
  merchantMaxTransactionsPerDay: z.number().int().positive(),
  approvalAboveMinor: minorAmountSchema,
  trustedMerchant: z.boolean(),
  autonomousMerchant: z.boolean(),
  allowedWeekdaysBitmap: z.number().int().min(0).max(127),
  utcStartMinute: z.number().int().min(0).max(1439),
  utcEndMinute: z.number().int().min(0).max(1439),
  expiresAt: z.iso.datetime(),
});
export type CommercePolicy = z.infer<typeof commercePolicySchema>;

export const policyDecisionSchema = z.object({
  outcome: z.enum(["allowed", "approval-required", "blocked"]),
  code: z.enum([
    "OK",
    "ACCOUNT_MISMATCH",
    "POLICY_EXPIRED",
    "UNTRUSTED_MERCHANT",
    "OUTSIDE_TIME_WINDOW",
    "PER_TRANSACTION_LIMIT",
    "ROLLING_24H_LIMIT",
    "DAILY_LIMIT",
    "WEEKLY_LIMIT",
    "MONTHLY_LIMIT",
    "CATEGORY_DAILY_LIMIT",
    "MERCHANT_DAILY_LIMIT",
    "MERCHANT_COUNT_LIMIT",
    "HUMAN_APPROVAL_THRESHOLD",
    "MERCHANT_REQUIRES_APPROVAL",
    "PROVIDER_CHECKOUT_REQUIRED",
    "ACCOUNT_NOT_VERIFIED",
    "OWNER_NOT_AUTHORIZED",
    "POLICY_INACTIVE",
    "ACCOUNT_PAUSED",
    "ONCHAIN_POLICY_REJECTED",
  ]),
  explanation: z.string(),
});
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;

export const purchaseStatusSchema = z.enum([
  "quoted",
  "policy-blocked",
  "awaiting-approval",
  "approved",
  "payment-pending",
  "paid",
  "confirmed",
  "failed",
  "reconciled",
  "expired",
  "rejected",
  "cancelled",
]);
export type PurchaseStatus = z.infer<typeof purchaseStatusSchema>;

export const approvalStatusSchema = z.enum(["pending", "approved", "rejected", "expired"]);

export const approvalRequestSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  account: evmAddressSchema,
  chainId: z.literal(4663).or(z.literal(46630)),
  owner: evmAddressSchema,
  quote: commerceQuoteSchema,
  intentHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  reason: z.string().min(3).max(300),
  status: approvalStatusSchema,
  nonce: z.string().regex(/^\d+$/),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  decisionAt: z.iso.datetime().optional(),
  decisionBy: evmAddressSchema.optional(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(),
});
export type ApprovalRequest = z.infer<typeof approvalRequestSchema>;

export const purchaseOrderSchema = z.object({
  id: z.string().uuid(),
  cart: cartSchema,
  status: purchaseStatusSchema,
  policyDecision: policyDecisionSchema,
  approvalId: z.string().uuid().optional(),
  paymentRail: paymentRailSchema,
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  providerOrderId: z.string().max(200).optional(),
  receiptUrl: z.url().optional(),
  failureCode: z.string().max(80).optional(),
  failureMessage: z.string().max(500).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

export const approvalDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  approver: evmAddressSchema,
  nonce: z.string().regex(/^\d+$/),
  expiresAt: z.number().int().positive(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
