import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  Eye,
  Fingerprint,
  Gauge,
  LockKeyhole,
  Network,
  Radio,
  Route,
  ShieldCheck,
  Sparkles,
  Timer,
  Wallet,
} from "lucide-react";
import { LiveMetricsStrip } from "@/components/live-metrics-strip";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Hackathon submission",
  description: "RuleWallet hackathon submission: bounded onchain authority for autonomous agents on Robinhood Chain testnet.",
};

const innovations = [
  { icon: Fingerprint, title: "Authority without custody", text: "The owner keeps the admin wallet. A separate agent key receives only the narrow onchain role it needs." },
  { icon: Gauge, title: "Limits enforced onchain", text: "Per-call caps, rolling spend, allowlists, nonces, expiry, and approvals remain effective if the UI or agent fails." },
  { icon: Route, title: "Simulation before signature", text: "Every user mutation and autonomous execution is checked against current contract state before broadcast." },
  { icon: Eye, title: "Public proof", text: "Live metrics and explorer-backed receipts turn automation claims into independently verifiable evidence." },
] as const;

const demoSteps = [
  { time: "0:00–0:30", title: "Inspect live guardrails", text: "See policy state, rolling allowance, agent role, contract balance, and the observed testnet block." },
  { time: "0:30–1:05", title: "Verify autonomous execution", text: "Open the latest public receipt and compare its transaction hash with the Robinhood Chain testnet explorer." },
  { time: "1:05–2:00", title: "Try to break the rules", text: "Cross a limit or select an untrusted recipient in the simulator, then inspect the operator pause and revoke controls." },
] as const;

export default function HackathonPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-grid">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8 lg:py-24">
            <div>
              <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary"><Sparkles /> Hackathon submission · Working testnet MVP</Badge>
              <h1 className="mt-6 max-w-4xl text-balance text-5xl leading-[0.98] font-semibold tracking-[-0.05em] sm:text-6xl">Autonomous agents can act. <span className="text-primary">Rules still hold.</span></h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">RuleWallet is an open-source policy account for AI agents on Robinhood Chain testnet. It replaces unlimited wallet access with narrow roles, hard spending limits, human approval thresholds, emergency controls, and public receipts.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg"><Link href="/demo"><Timer /> Run the 2-minute demo</Link></Button>
                <Button asChild size="lg" variant="outline"><Link href="/start"><Wallet /> Build your testnet wallet</Link></Button>
              </div>
            </div>
            <Card className="border-primary/20 bg-primary/[0.035]">
              <CardHeader><CardTitle>Submission snapshot</CardTitle><CardDescription>What judges can verify without trusting our claims.</CardDescription></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {["Deployed policy contract", "Dedicated scoped agent signer", "Scheduled recurring strategy", "Onchain simulation and enforcement", "Public explorer-backed receipts", "Open tests and threat model"].map((item) => <p key={item} className="flex items-center gap-2"><Check className="size-4 shrink-0 text-primary" />{item}</p>)}
                <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><strong className="text-amber-900">Safety boundary:</strong> testnet ETH has no value. The contracts are unaudited. Mainnet is a separate experimental release whose autonomy fails closed until every production gate passes.</div>
              </CardContent>
            </Card>
          </div>
        </section>

        <LiveMetricsStrip />

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-5 lg:grid-cols-3">
            <Card><CardHeader><p className="font-mono text-xs text-primary">01 / PROBLEM</p><CardTitle>Agent keys are too powerful.</CardTitle><CardDescription className="leading-6">A useful autonomous agent needs permission to transact, but a normal wallet key can expose every asset and every contract interaction.</CardDescription></CardHeader></Card>
            <Card className="border-primary/20 bg-primary/[0.03]"><CardHeader><p className="font-mono text-xs text-primary">02 / SOLUTION</p><CardTitle>Programmable authority.</CardTitle><CardDescription className="leading-6">The owner defines exactly what the agent can do. The contract enforces those rules independently of prompts, models, and backend code.</CardDescription></CardHeader></Card>
            <Card><CardHeader><p className="font-mono text-xs text-primary">03 / WHY ROBINHOOD CHAIN</p><CardTitle>Financial agents need financial rails.</CardTitle><CardDescription className="leading-6">An EVM-compatible chain for onchain financial infrastructure lets RuleWallet combine familiar tooling with testable automation and transparent receipts.</CardDescription></CardHeader></Card>
          </div>
        </section>

        <section className="border-y border-grid bg-card/25">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
            <div className="max-w-2xl"><p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Architecture</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Four boundaries, one verifiable flow.</h2></div>
            <div className="mt-10 grid gap-3 lg:grid-cols-4">
              {[
                { icon: Bot, number: "01", title: "Agent intent", text: "A scheduled strategy proposes a narrow action." },
                { icon: ShieldCheck, number: "02", title: "Policy checks", text: "Role, target, caps, rolling spend, nonce, expiry, and pause are verified." },
                { icon: Network, number: "03", title: "Onchain execution", text: "The exact call is simulated, signed by the scoped agent, and enforced by the contract." },
                { icon: Radio, number: "04", title: "Public receipt", text: "The result is published with block and explorer evidence." },
              ].map((item) => { const Icon = item.icon; return <Card key={item.number}><CardHeader><div className="flex items-center justify-between"><Icon className="size-5 text-primary" /><span className="font-mono text-xs text-muted-foreground">{item.number}</span></div><CardTitle className="mt-5">{item.title}</CardTitle><CardDescription className="leading-6">{item.text}</CardDescription></CardHeader></Card>; })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
            <div><p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Innovation</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Security is the product behavior.</h2><p className="mt-4 leading-7 text-muted-foreground">The frontend explains decisions, but it cannot grant authority. The contract and role model are the source of truth.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">{innovations.map((item) => { const Icon = item.icon; return <Card key={item.title}><CardHeader><Icon className="mb-3 size-5 text-primary" /><CardTitle>{item.title}</CardTitle><CardDescription className="leading-6">{item.text}</CardDescription></CardHeader></Card>; })}</div>
          </div>
        </section>

        <section className="border-y border-grid bg-card/25">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Judge flow</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A complete proof in two minutes.</h2></div><Button asChild><Link href="/demo">Start now <ArrowRight /></Link></Button></div>
            <div className="mt-10 divide-y divide-border rounded-xl border border-grid bg-background/60">{demoSteps.map((step, index) => <div key={step.time} className="grid gap-3 px-5 py-6 sm:grid-cols-[110px_36px_1fr] sm:items-start"><span className="font-mono text-xs text-primary">{step.time}</span><span className="grid size-7 place-items-center rounded-full border border-primary/30 font-mono text-xs text-primary">{index + 1}</span><div><h3 className="font-medium">{step.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{step.text}</p></div></div>)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="max-w-2xl"><p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Roadmap</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From testnet proof to production infrastructure.</h2></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Card className="border-primary/20"><CardHeader><Badge className="w-fit bg-primary/10 text-primary">Now</Badge><CardTitle>Hackathon MVP</CardTitle><CardDescription className="leading-6">Personal policy accounts, trusted addresses, scheduled transfers, live metrics, receipts, approvals, pause, and revoke.</CardDescription></CardHeader></Card>
            <Card><CardHeader><Badge variant="outline" className="w-fit">Next</Badge><CardTitle>Production hardening</CardTitle><CardDescription className="leading-6">Independent audits, stronger signer custody, monitored canary deployments, and notification delivery integrations.</CardDescription></CardHeader></Card>
            <Card><CardHeader><Badge variant="outline" className="w-fit">Later</Badge><CardTitle>Mainnet gates</CardTitle><CardDescription className="leading-6">Independent audits, multisig administration, monitored RPC failover, canary limits, incident drills, and explicit deployment approval.</CardDescription></CardHeader></Card>
          </div>
        </section>

        <section className="border-t border-grid">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center">
            <LockKeyhole className="mx-auto size-7 text-primary" />
            <h2 className="mt-5 text-balance text-4xl font-semibold tracking-tight">Inspect it. Break it. Verify it.</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">No pitch deck is required to prove the core flow. The contract, automation, receipts, tests, and failure boundaries are public.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3"><Button asChild size="lg"><Link href="/demo"><Timer /> 2-minute demo</Link></Button></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
