import type { Metadata } from "next";
import Link from "next/link";
import {
  BellRing,
  BookUser,
  Bot,
  CirclePlay,
  Plus,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { SimpleConsoleOverview } from "@/components/simple-console-overview";
import { TestnetCommandCenter } from "@/components/testnet-command-center";
import { TestnetSafetyDashboard } from "@/components/testnet-safety-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Testnet console",
  description: "Manage a policy account, trusted recipients, bounded schedules, alerts, and public receipts on Robinhood Chain testnet.",
};

const actions = [
  { href: "/app/services", label: "Trusted addresses", icon: BookUser },
  { href: "/app/agent", label: "Agent automation", icon: Bot },
  { href: "/app/notifications", label: "Notifications", icon: BellRing },
  { href: "/app/deploy", label: "Deploy account", icon: WalletCards },
] as const;

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      <div className="launch-shell overflow-hidden rounded-[1.75rem] border border-primary/20 bg-card/80 p-6 shadow-[0_24px_80px_oklch(0.35_0.08_145/0.12)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">Live testnet workspace</Badge>
              <Badge variant="secondary">Faucet ETH has no value</Badge>
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Your agent can act. Your rules stay in charge.</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">Deploy a policy account, verify recipients, set narrow limits, schedule a transfer, and inspect every outcome from one console.</p>
          </div>
          <Button asChild size="lg"><Link href="/demo"><CirclePlay /> Run the 2-minute demo</Link></Button>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="outline" className="h-auto justify-start gap-3 bg-background/65 px-4 py-3">
              <Link href={href}><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>{label}</Link>
            </Button>
          ))}
        </div>
      </div>

      <SimpleConsoleOverview />
      <TestnetSafetyDashboard />

      <section className="mt-10" aria-labelledby="command-center-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Wallet-signed actions</p>
            <h2 id="command-center-title" className="mt-2 text-2xl font-semibold tracking-tight">Testnet command center</h2>
          </div>
          <Badge variant="outline" className="border-primary/25 text-primary"><ShieldCheck /> Simulate before signing</Badge>
        </div>
        <TestnetCommandCenter />
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card className="launch-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="size-5 text-primary" /> Build a policy</CardTitle>
            <CardDescription>Create a portable policy preview, then use the deployment and service flows for onchain controls.</CardDescription>
            <Button asChild variant="outline" className="mt-3 w-fit"><Link href="/app/policies/new">Open policy builder</Link></Button>
          </CardHeader>
        </Card>
        <Card className="launch-card border-primary/20 bg-primary/[0.04]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Safe order of operations</CardTitle>
            <CardDescription>Demo first. Configure roles and limits second. Add a trusted recipient third. Fund a tiny testnet canary last.</CardDescription>
            <Button asChild variant="outline" className="mt-3 w-fit"><Link href="/start">Open guided setup</Link></Button>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
