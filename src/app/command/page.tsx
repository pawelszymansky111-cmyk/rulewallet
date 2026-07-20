import type { Metadata } from "next";
import { CommandCenter } from "@/components/command-center";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Create policy-controlled purchase requests, manage wallets, review approvals, and inspect receipts.",
};

export default function CommandPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <CommandCenter embeddedWalletsConfigured={Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)} />
      <SiteFooter />
    </div>
  );
}
