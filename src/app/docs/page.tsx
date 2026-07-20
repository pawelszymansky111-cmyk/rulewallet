import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellRing, Braces, GitBranch, KeyRound, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/pawelszymansky111-cmyk/rulewallet";

export const metadata: Metadata = {
  title: "Documentation",
  description: "RuleWallet product model, policy format, and integration plan.",
};

const policyExample = `{
  "network": "robinhood-chain-testnet",
  "account": "travel budget",
  "agent": "booking assistant",
  "asset": "USDG",
  "limits": {
    "perTransaction": "75.00",
    "rolling24Hours": "150.00",
    "monthly": "600.00"
  },
  "merchant": "0x...",
  "category": "travel",
  "allowedUtcHours": "07:00-22:00",
  "approvalAbove": "50.00",
  "pauseAvailable": true
}`;

const requestExample = `const decision = evaluateTransfer(policy, {
  asset: "native-eth",
  amountEth: "0.0001",
  recipient: "0x...",
  spentRolling24HoursEth: "0.0012",
  agentRoleActive: true,
  policyPaused: false
});

// { status: "allowed", rules: [...] }`;

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-grid">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
            <Badge variant="outline" className="border-primary/25 text-primary">Legacy testnet demo · V3 commerce beta</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">RuleWallet documentation</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">A narrow, inspectable permission layer between an AI agent and an onchain policy account. V3 adds named accounts, ETH/USDG budgets, merchant/category/time controls, single-use approvals, EIP-712 schedules, secure-signer gates, and exact transaction previews. The public legacy demo remains available while V3 deployment and production credentials stay explicit release gates.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Button asChild className="bg-primary text-primary-foreground"><Link href="/demo">Start guided demo <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/hackathon">Hackathon submission</Link></Button><Button asChild variant="ghost"><Link href="/activity">View live receipts</Link></Button></div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[220px_1fr] lg:px-8 lg:py-20">
          <aside className="h-fit space-y-2 text-sm lg:sticky lg:top-24">
            {["Model", "Policy object", "Evaluation", "Architecture", "Notifications", "MVP boundary"].map((item) => <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">{item}</a>)}
          </aside>
          <div className="min-w-0 space-y-16">
            <section id="model" className="scroll-mt-24">
              <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">01 / Model</p>
              <h2 className="mt-3 text-2xl font-semibold">Separate intent, authority, and execution.</h2>
              <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">The agent produces a structured request. A versioned policy evaluates it. A scoped signer can act only when the decision permits it. High-risk but otherwise valid requests enter a human approval queue.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { icon: Braces, title: "Intent", text: "Structured call proposed by the agent." },
                  { icon: ShieldCheck, title: "Policy", text: "Deterministic constraints and evidence." },
                  { icon: KeyRound, title: "Authority", text: "Scoped key—not the owner's master secret." },
                ].map((item) => { const Icon = item.icon; return <Card key={item.title}><CardHeader><Icon className="mb-3 size-5 text-primary" /><CardTitle>{item.title}</CardTitle><CardDescription>{item.text}</CardDescription></CardHeader></Card>; })}
              </div>
            </section>

            <section id="policy-object" className="scroll-mt-24">
              <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">02 / Policy object</p>
              <h2 className="mt-3 text-2xl font-semibold">Portable, readable rules.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">The initial format stays deliberately small enough to inspect in one screen.</p>
              <pre className="mt-6 overflow-x-auto rounded-xl border border-grid bg-card p-5 font-mono text-xs leading-6 text-muted-foreground"><code>{policyExample}</code></pre>
            </section>

            <section id="evaluation" className="scroll-mt-24">
              <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">03 / Evaluation</p>
              <h2 className="mt-3 text-2xl font-semibold">One of three explicit outcomes.</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Card><CardHeader><CardTitle className="text-primary">Allowed</CardTitle><CardDescription>Every hard rule passes and the request stays below the human threshold.</CardDescription></CardHeader></Card>
                <Card><CardHeader><CardTitle className="text-amber-800">Needs approval</CardTitle><CardDescription>Hard rules pass, but a person must authorize the action.</CardDescription></CardHeader></Card>
                <Card><CardHeader><CardTitle className="text-red-700">Blocked</CardTitle><CardDescription>At least one hard rule fails; approval cannot override it.</CardDescription></CardHeader></Card>
              </div>
              <pre className="mt-6 overflow-x-auto rounded-xl border border-grid bg-card p-5 font-mono text-xs leading-6 text-muted-foreground"><code>{requestExample}</code></pre>
            </section>

            <section id="architecture" className="scroll-mt-24">
              <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">04 / Architecture</p>
              <h2 className="mt-3 text-2xl font-semibold">Testable layers with narrow responsibilities.</h2>
              <div className="mt-6 divide-y divide-border rounded-xl border border-grid bg-card">
                {[
                  ["01", "Agent adapter", "Normalizes MCP, SDK, or API intent into a request."],
                  ["02", "Simulator", "Decodes calls, estimates effects, and enriches market data."],
                  ["03", "Policy account", "Enforces allowlists, per-asset limits, nonces, expiry, and pause onchain."],
                  ["04", "Approval roles", "Collect independent wallet approvals for high-value requests."],
                  ["05", "Wallet signer", "Shows and signs the exact simulated transaction without backend custody."],
                  ["06", "Event receipts", "Publish requests, approvals, and execution results as explorer-verifiable events."],
                ].map(([number, title, text]) => <div key={number} className="grid gap-2 px-5 py-4 sm:grid-cols-[50px_170px_1fr]"><span className="font-mono text-xs text-primary">{number}</span><span className="font-medium">{title}</span><span className="text-sm text-muted-foreground">{text}</span></div>)}
              </div>
            </section>

            <section id="notifications" className="scroll-mt-24">
              <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">05 / Notifications</p>
              <h2 className="mt-3 text-2xl font-semibold">Alerts observe execution. They never authorize it.</h2>
              <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">After an execution record is durably stored, RuleWallet can deliver a versioned event through an authenticated HTTPS webhook. The event covers confirmed executions, approval requirements, failures, and unusual requests stopped by policy.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Card><CardHeader><BellRing className="mb-3 size-5 text-primary" /><CardTitle>Provider-neutral delivery</CardTitle><CardDescription>Route one server-side webhook to email, Telegram, Slack, or an incident platform without exposing credentials to the browser.</CardDescription></CardHeader></Card>
                <Card><CardHeader><ShieldCheck className="mb-3 size-5 text-primary" /><CardTitle>Fail-safe boundary</CardTitle><CardDescription>A notification outage cannot change policy, create an approval, or convert a blocked request into a transfer.</CardDescription></CardHeader></Card>
              </div>
              <pre className="mt-6 overflow-x-auto rounded-xl border border-grid bg-card p-5 font-mono text-xs leading-6 text-muted-foreground"><code>{`TESTNET_NOTIFICATION_WEBHOOK_URL=https://alerts.example.com/rulewallet\nTESTNET_NOTIFICATION_WEBHOOK_TOKEN=<server-only bearer token>`}</code></pre>
              <Button asChild variant="outline" className="mt-5"><Link href="/app/notifications">Inspect notification readiness <ArrowRight /></Link></Button>
            </section>

            <section id="mvp-boundary" className="scroll-mt-24">
              <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">06 / MVP boundary</p>
              <h2 className="mt-3 text-2xl font-semibold">What this build does—and does not do.</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Card><CardHeader><CardTitle>Included</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Wallet-created named spending accounts and a legacy public testnet demo</p><p>Versioned non-upgradeable V3 factory, account, and policy registry</p><p>ETH/USDG asset, merchant, category, period, and approval controls</p><p>EIP-712 schedules and approvals, secure-signer interface, receipts, pause, and owner recovery</p><p>Unit, fork, 512-run fuzz, reentrancy, and V1/V2/V3 invariant tests</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Still gated</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>V3 factory/account deployment and every required wallet signature</p><p>Independent audit and formal verification</p><p>Configured non-exportable signer, dual managed RPC, alert delivery, and monitored canary</p><p>Provider purchase execution without a verified, credentialed adapter</p><p>Routers, token approvals, swaps, bridges, or tokenized-stock trading</p></CardContent></Card>
              </div>
              <div className="mt-8 flex flex-wrap gap-3"><Button asChild className="bg-primary text-primary-foreground"><Link href="/playground">Open playground <ArrowRight /></Link></Button><Button asChild variant="outline"><a href={githubUrl}><GitBranch /> Inspect source</a></Button></div>
            </section>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
