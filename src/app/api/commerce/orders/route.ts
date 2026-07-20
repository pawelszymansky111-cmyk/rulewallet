import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress, keccak256, stringToHex, type PublicClient } from "viem";
import { z } from "zod";
import { getAgentPublicClient } from "@/lib/agent-clients";
import {
  evaluateVerifiedV3Payment,
  providerCheckoutDecision,
} from "@/lib/commerce-onchain-policy";
import {
  commerceStorageConfigured,
  getQuote,
  listOrders,
  saveApproval,
  saveOrder,
} from "@/lib/commerce-store";
import { type PurchaseOrder } from "@/lib/commerce-types";
import { readCommerceSession } from "@/lib/commerce-session";
import { getMainnetPublicClient } from "@/lib/mainnet-clients";
import { ROBINHOOD_MAINNET_USDG } from "@/lib/mainnet-registry";
import { checkRateLimit, rateLimitFailure } from "@/lib/rate-limit";
import {
  mainnetFactoryV3Address,
  testnetFactoryV3Address,
  testnetV3StablecoinAddress,
} from "@/lib/v3-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createOrderSchema = z.object({
  quoteId: z.string().uuid(),
  account: z.string().refine(isAddress),
  owner: z.string().refine(isAddress),
  chainId: z.literal(4663).or(z.literal(46630)),
});

function chainContext(chainId: 4663 | 46630) {
  if (chainId === 4663) {
    return {
      client: getMainnetPublicClient() as PublicClient,
      factory: mainnetFactoryV3Address,
      stablecoin: ROBINHOOD_MAINNET_USDG,
    };
  }
  return {
    client: getAgentPublicClient() as PublicClient,
    factory: testnetFactoryV3Address,
    stablecoin: testnetV3StablecoinAddress,
  };
}

export async function GET(request: NextRequest) {
  if (!commerceStorageConfigured()) return NextResponse.json({ orders: [], configured: false });
  const account = request.nextUrl.searchParams.get("account")?.toLowerCase();
  const owner = request.nextUrl.searchParams.get("owner")?.toLowerCase();
  if (!owner || !isAddress(owner)) {
    return NextResponse.json({ error: "An authenticated owner address is required." }, { status: 400 });
  }
  try {
    readCommerceSession(request, owner);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Commerce login required." }, { status: 401 });
  }
  const orders = await listOrders();
  return NextResponse.json({
    orders: orders.filter(
      (order) =>
        (!account || order.cart.account.toLowerCase() === account) &&
        (!owner || order.cart.owner.toLowerCase() === owner),
    ),
    configured: true,
  });
}

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit(
    `commerce-order:${request.headers.get("x-forwarded-for") ?? "unknown"}`,
    { limit: 10, windowMs: 60_000 },
  );
  const failure = rateLimitFailure(rateLimit, "Too many order requests. Try again shortly.");
  if (failure) return NextResponse.json({ error: failure.error }, { status: failure.status });
  if (!commerceStorageConfigured()) {
    return NextResponse.json({ error: "Durable storage is required before creating orders." }, { status: 503 });
  }
  try {
    const input = createOrderSchema.parse(await request.json());
    readCommerceSession(request, input.owner);
    const quote = await getQuote(input.quoteId);
    if (!quote) throw new Error("The quote is missing or expired. Request a new quote.");
    if (Date.parse(quote.expiresAt) <= Date.now()) throw new Error("The quote has expired.");
    const context = chainContext(input.chainId);
    const policyDecision = quote.merchantRecipient
      ? context.factory && context.stablecoin
        ? await evaluateVerifiedV3Payment({
            client: context.client,
            chainId: input.chainId,
            factory: context.factory,
            stablecoin: context.stablecoin,
            account: getAddress(input.account),
            owner: getAddress(input.owner),
            quote,
          })
        : {
            outcome: "blocked" as const,
            code: "ACCOUNT_NOT_VERIFIED" as const,
            explanation: `A verified V3 factory and canonical test asset are not configured for chain ${input.chainId}.`,
          }
      : providerCheckoutDecision(quote);
    const now = new Date().toISOString();
    const cart = {
      id: crypto.randomUUID(),
      quote,
      chainId: input.chainId,
      account: input.account,
      owner: input.owner,
      createdAt: now,
      expiresAt: quote.expiresAt,
      intentHash: keccak256(
        stringToHex(`${input.account.toLowerCase()}:${quote.id}:${quote.amountMinor}:${quote.merchantRecipient ?? "provider"}`),
      ),
    } as const;
    const order: PurchaseOrder = {
      id: crypto.randomUUID(),
      cart,
      status:
        policyDecision.outcome === "blocked"
          ? "policy-blocked"
          : policyDecision.outcome === "approval-required"
            ? "awaiting-approval"
            : "approved",
      policyDecision,
      paymentRail: quote.merchantRecipient
        ? "direct-onchain"
        : quote.checkoutUrl
          ? "hosted-checkout"
          : "provider-api",
      createdAt: now,
      updatedAt: now,
    };
    if (policyDecision.outcome === "approval-required") {
      const approval = await saveApproval({
        id: crypto.randomUUID(),
        orderId: order.id,
        account: input.account,
        chainId: input.chainId,
        owner: input.owner,
        quote,
        intentHash: cart.intentHash,
        reason: policyDecision.explanation,
        status: "pending",
        nonce: "0",
        createdAt: now,
        expiresAt: quote.expiresAt,
      });
      order.approvalId = approval.id;
    }
    await saveOrder(order);
    return NextResponse.json({
      order,
      paymentBroadcast: false,
      nextStep:
        order.status === "approved"
          ? "Prepare an exact transaction simulation; no payment was sent."
          : order.status === "awaiting-approval"
            ? "Approve or reject the expiring request in the Approval Inbox."
            : "Adjust the policy or cart; blocked orders cannot be paid.",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order creation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
