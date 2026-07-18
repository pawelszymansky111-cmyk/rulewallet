import type { Metadata } from "next";
import { Activity, Radio } from "lucide-react";
import { PublicAgentActivity } from "@/components/public-agent-activity";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Public agent activity",
  description: "Verifiable RuleWallet automation receipts on Robinhood Chain testnet.",
};

export default function ActivityPage() {
  return (
    <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-5xl px-5 py-14 lg:px-8"><div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Public proof</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight"><Activity className="size-7 text-primary" /> Agent activity</h1><p className="mt-3 max-w-2xl text-muted-foreground">Every autonomous attempt is recorded with its policy outcome and explorer receipt.</p></div><Badge variant="outline" className="border-primary/25 text-primary"><Radio /> Live testnet data</Badge></div><PublicAgentActivity /></main><SiteFooter /></div>
  );
}
