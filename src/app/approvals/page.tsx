import type { Metadata } from "next";
import { ApprovalInbox } from "@/components/approval-inbox";
import { V3OnchainApprovalDesk } from "@/components/v3-onchain-approval-desk";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Approval Inbox",
  description: "Review and sign exact, expiring RuleWallet purchase approvals.",
};

export default function ApprovalsPage() {
  return <div className="min-h-screen"><SiteHeader /><ApprovalInbox /><div className="mx-auto max-w-6xl px-5 pb-16 lg:px-8"><V3OnchainApprovalDesk /></div><SiteFooter /></div>;
}
