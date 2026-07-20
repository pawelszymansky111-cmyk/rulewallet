import type { Metadata } from "next";
import { CommandCenter } from "@/components/command-center";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Create policy-controlled purchase requests, manage wallets, review approvals, and inspect receipts.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CommandPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <CommandCenter
        embeddedWalletsConfigured={Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)}
        initialIntent={{
          providerId: first(query.provider),
          category: first(query.category),
          query: first(query.query),
          recipient: first(query.recipient),
          policyAccount: first(query.account),
          asset: first(query.asset),
          amount: first(query.amount),
        }}
      />
      <SiteFooter />
    </div>
  );
}
