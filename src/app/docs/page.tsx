import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Braces, GitBranch, KeyRound, ShieldCheck } from "lucide-react";
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
  "agent": "market-scout",
  "limits": {
    "perTransactionUsd": 250,
    "dailyUsd": 1000
  },
  "approvalAboveUsd": 100,
  "allowedTokens": ["USDC", "WETH", "HOOD"],
  "maxSlippageBps": 100,
  "maxOracleAgeSeconds": 90
}`;

const requestExample = `const decision = evaluatePolicy(policy, {
  amountUsd: 45,
  token: "USDC",
  target: "Uniswap Router",
  slippageBps: 30,
  oracleAgeSeconds: 12,
  spentTodayUsd: 310,
  marketOpen: true
});

// { status: "allowed", rules: [...] }`;

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-grid">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
            <Badge variant="outline" className="border-primary/25 text-primary">v0.1 · Product specification</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">RuleWallet documentation</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">A narrow, inspectable permission layer between an AI agent and an onchain wallet. The current repository is a testnet simulator, not audited wallet infrastructure.</p>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[220px_1fr] lg:px-8 lg:py-20">
          <aside className="h-fit space-y-2 text-sm lg:sticky lg:top-24">
            {["Model", "Policy object", "Evaluation", "Architecture", "MVP boundary"].map((item) => <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">{item}</a>)}
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
                <Card><CardHeader><CardTitle className="text-amber-300">Needs approval</CardTitle><CardDescription>Hard rules pass, but a person must authorize the action.</CardDescription></CardHeader></Card>
                <Card><CardHeader><CardTitle className="text-red-300">Blocked</CardTitle><CardDescription>At least one hard rule fails; approval cannot override it.</CardDescription></CardHeader></Card>
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
                  ["03", "Policy engine", "Returns a deterministic decision and rule evidence."],
                  ["04", "Approval service", "Collects an authenticated human response when required."],
                  ["05", "Scoped executor", "Signs only requests bound to the active policy version."],
                  ["06", "Receipt store", "Persists request, evidence, approval, and transaction result."],
                ].map(([number, title, text]) => <div key={number} className="grid gap-2 px-5 py-4 sm:grid-cols-[50px_170px_1fr]"><span className="font-mono text-xs text-primary">{number}</span><span className="font-medium">{title}</span><span className="text-sm text-muted-foreground">{text}</span></div>)}
              </div>
            </section>

            <section id="mvp-boundary" className="scroll-mt-24">
              <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">05 / MVP boundary</p>
              <h2 className="mt-3 text-2xl font-semibold">What this build does—and does not do.</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Card><CardHeader><CardTitle>Included</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Interactive policy evaluation</p><p>Policy configuration and JSON export</p><p>Dashboard, request evidence, and audit concepts</p><p>Robinhood Chain testnet positioning</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Not yet included</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Production key custody or account abstraction</p><p>Live transaction signing or funds</p><p>Security audit or formal verification</p><p>A token, sale, or investment product</p></CardContent></Card>
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
