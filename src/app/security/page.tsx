import type { Metadata } from "next";
import { AlertTriangle, Bug, KeyRound, LockKeyhole, Network, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Security model",
  description: "RuleWallet threat model, safety boundaries, and responsible disclosure process.",
};

const principles = [
  { icon: KeyRound, title: "Never request a seed phrase", text: "Owner, approver, and guardian actions stay in their wallets. Mainnet agents require a non-exportable KMS/MPC/HSM key." },
  { icon: LockKeyhole, title: "Deny by default", text: "Unknown assets, targets, expired requests, and excess exposure revert onchain." },
  { icon: Network, title: "Simulate before signing", text: "The exact chain, contract, target, value, nonce, and expiry are rendered before signing." },
  { icon: ShieldCheck, title: "Hard rules stay hard", text: "Approval thresholds cannot override an allowlist, pause, nonce, expiry, or exposure failure." },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-grid">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
            <Badge variant="outline" className="border-primary/25 text-primary">Security model · V3 commerce beta</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Assume the agent will fail.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">RuleWallet reduces blast radius when an agent is buggy, manipulated, or compromised. V3 narrows authority by asset, merchant, category, time, and period, but it is not independently audited and remains experimental high-risk software.</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
          <Alert className="border-amber-500/25 bg-amber-50 text-amber-900">
            <AlertTriangle />
            <AlertTitle>Experimental mainnet code is not a safety claim</AlertTitle>
            <AlertDescription className="text-amber-800">A legacy testnet demo is live. V3 contracts, UI, provider boundaries, and signer controls are implemented, but V3 mainnet is not deployed or independently audited by this release. Do not treat source verification or passing tests as proof of safety.</AlertDescription>
          </Alert>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {principles.map((principle) => { const Icon = principle.icon; return <Card key={principle.title}><CardHeader><Icon className="mb-3 size-5 text-primary" /><CardTitle>{principle.title}</CardTitle><CardDescription className="leading-6">{principle.text}</CardDescription></CardHeader></Card>; })}
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-2">
            <section>
              <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Threats in scope</p>
              <h2 className="mt-3 text-2xl font-semibold">Primary failure modes</h2>
              <div className="mt-6 divide-y divide-border border-y border-grid">
                {["Prompt injection causes an unintended transaction", "Agent or session key is stolen", "Malicious contract receives a proposed call", "Price feed is stale or deviates unexpectedly", "Agent repeats a valid action to exceed daily exposure", "Operator needs to revoke authority immediately"].map((item) => <p key={item} className="py-3 text-sm text-muted-foreground">{item}</p>)}
              </div>
            </section>
            <section>
              <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Open risks</p>
              <h2 className="mt-3 text-2xl font-semibold">Not solved by a policy UI</h2>
              <div className="mt-6 divide-y divide-border border-y border-grid">
                {["Smart-contract vulnerabilities in allowed targets", "Compromised approval devices or operator accounts", "Incorrect asset pricing or simulation infrastructure", "Cross-chain bridge and sequencer failure", "KMS signer implementation or configuration bugs", "Legal, tax, and compliance obligations"].map((item) => <p key={item} className="py-3 text-sm text-muted-foreground">{item}</p>)}
              </div>
            </section>
          </div>

          <Card className="mt-16 border-primary/15 bg-primary/[0.035]">
            <CardHeader>
              <Bug className="mb-3 size-5 text-primary" />
              <CardTitle>Responsible disclosure</CardTitle>
              <CardDescription className="max-w-2xl leading-6">Do not open a public issue for a vulnerability. Until a dedicated security inbox is configured, use GitHub&apos;s private vulnerability reporting on the repository. Include impact, reproduction steps, and a minimal proof of concept.</CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
