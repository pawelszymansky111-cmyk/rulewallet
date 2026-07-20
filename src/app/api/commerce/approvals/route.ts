import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { z } from "zod";
import { verifyCommerceApproval } from "@/lib/commerce-auth";
import {
  commerceStorageConfigured,
  getApproval,
  getOrder,
  listApprovals,
  saveApproval,
  saveOrder,
} from "@/lib/commerce-store";
import { approvalDecisionSchema } from "@/lib/commerce-types";
import { checkRateLimit } from "@/lib/rate-limit";
import { readCommerceSession } from "@/lib/commerce-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const decideSchema = z.object({
  approvalId: z.string().uuid(),
  chainId: z.literal(4663).or(z.literal(46630)),
  decision: approvalDecisionSchema,
});

export async function GET(request: NextRequest) {
  if (!commerceStorageConfigured()) {
    return NextResponse.json({ approvals: [], configured: false, capturedAt: new Date().toISOString() });
  }
  const owner = request.nextUrl.searchParams.get("owner");
  if (!owner || !isAddress(owner)) {
    return NextResponse.json({ error: "Enter a valid owner address." }, { status: 400 });
  }
  try {
    readCommerceSession(request, owner);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Commerce login required." }, { status: 401 });
  }
  const approvals = await listApprovals();
  return NextResponse.json({
    approvals: approvals.filter((approval) => approval.owner.toLowerCase() === owner.toLowerCase()),
    configured: true,
    capturedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(
    `commerce-approval:${request.headers.get("x-forwarded-for") ?? "unknown"}`,
    { limit: 20, windowMs: 60_000 },
  );
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many approval attempts. Try again shortly." }, { status: 429 });
  }
  if (!commerceStorageConfigured()) {
    return NextResponse.json({ error: "Durable storage is required for approvals." }, { status: 503 });
  }
  try {
    const input = decideSchema.parse(await request.json());
    const approval = await getApproval(input.approvalId);
    if (!approval) throw new Error("Approval request not found.");
    readCommerceSession(request, approval.owner);
    const signer = await verifyCommerceApproval({
      approval,
      decision: input.decision,
      chainId: input.chainId,
    });
    const now = new Date().toISOString();
    approval.status = input.decision.decision === "approve" ? "approved" : "rejected";
    approval.decisionAt = now;
    approval.decisionBy = signer;
    approval.signature = input.decision.signature;
    await saveApproval(approval);
    const order = await getOrder(approval.orderId);
    if (order) {
      order.status = approval.status;
      order.updatedAt = now;
      await saveOrder(order);
    }
    return NextResponse.json({
      approval,
      paymentBroadcast: false,
      nextStep:
        approval.status === "approved"
          ? "Approval recorded. The exact onchain transaction must still be simulated before execution."
          : "Request rejected; no payment can execute.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
