import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Check,
  Eye,
  ExternalLink,
  Fingerprint,
  GitPullRequestArrow,
  LockKeyhole,
  Pause,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { PolicyPlayground } from "@/components/policy-playground";
import { LiveMetricsStrip } from "@/components/live-metrics-strip";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/pawelszymansky111-cmyk/rulewallet";

const controls = [
  { icon: LockKeyhole, title: "Hard spending caps", text: "Limit each transaction and total daily exposure." },
  { icon: Fingerprint, title: "Contract allowlists", text: "Agents can only call approved targets and functions." },
  { icon: Eye, title: "Human approvals", text: "Route high-value or unusual requests to a person." },
  { icon: Pause, title: "Instant revoke", text: "Pause one policy without moving the underlying wallet." },
];

const steps = [
  { number: "01", title: "Define authority", text: "Choose assets, contracts, limits, time windows, and approval thresholds." },
  { number: "02", title: "Inspect the request", text: "RuleWallet simulates the call and explains every policy check before signing." },
  { number: "03", title: "Approve or enforce", text: "Safe actions continue. Risky ones wait for a human or stop automatically." },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-grid">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:py-28">
            <div>
              <Badge variant="outline" className="mb-6 border-primary/25 bg-primary/5 text-primary">
                Hackathon build · Robinhood Chain testnet · Open source
              </Badge>
              <h1 className="max-w-3xl text-balance text-5xl leading-[0.98] font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                Give agents authority, <span className="text-primary">not your wallet.</span>
              </h1>
              <p className="mt-6 max-w-xl text-balance text-lg leading-8 text-muted-foreground">
                RuleWallet is a testnet policy account and approval layer for onchain AI agents. Simulate exact calls, enforce limits onchain, and keep every signature in your wallet.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/85">
                  <Link href="/demo">Start guided demo <ArrowRight /></Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/start"><Braces /> Learn and set up</Link>
                </Button>
                <Button asChild size="lg" variant="ghost"><a href="/app" target="_blank" rel="noreferrer">Open console <ExternalLink /></a></Button>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["No seed phrase", "Public demo first", "Mainnet clearly gated"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2"><Check className="size-4 text-primary" />{item}</span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-6 -right-6 hidden size-24 border-t border-r border-primary/30 lg:block" />
              <PolicyPlayground compact />
            </div>
          </div>
        </section>

        <LiveMetricsStrip />

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="mb-3 font-mono text-xs tracking-[0.18em] text-primary uppercase">Control surface</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Bounded autonomy by default.</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">A leaked agent key should expose one narrow permission—not everything the wallet owns.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {controls.map((control) => {
              const Icon = control.icon;
              return (
                <Card key={control.title} className="bg-card/70">
                  <CardHeader>
                    <span className="mb-4 grid size-10 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary"><Icon className="size-5" /></span>
                    <CardTitle>{control.title}</CardTitle>
                    <CardDescription className="leading-6">{control.text}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-y border-grid bg-card/25">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[0.75fr_1.25fr]">
            <div className="border-b border-grid px-5 py-16 lg:border-r lg:border-b-0 lg:px-8 lg:py-24">
              <Badge variant="outline" className="border-primary/25 text-primary">How it works</Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">A firewall between intent and execution.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">The agent proposes. The policy engine decides. Your wallet remains the final source of authority.</p>
            </div>
            <div className="divide-y divide-border">
              {steps.map((step) => (
                <div key={step.number} className="grid gap-4 px-5 py-8 sm:grid-cols-[72px_1fr] lg:px-10">
                  <span className="font-mono text-sm text-primary">{step.number}</span>
                  <div>
                    <h3 className="font-medium">{step.title}</h3>
                    <p className="mt-2 leading-6 text-muted-foreground">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ScrollText className="size-4 text-primary" /> Receipts, not promises</CardTitle>
                <CardDescription>Every decision includes the proposed call, policy version, evaluated rules, approval identity, and resulting transaction hash.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-grid bg-background/55 font-mono text-xs">
                  {[
                    ["request", "req_7f31"],
                    ["decision", "ALLOW"],
                    ["policy", "pol_rh_trade_01@v3"],
                    ["evidence", "8/8 rules passed"],
                    ["network", "Robinhood Chain testnet"],
                  ].map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[110px_1fr] border-b border-grid px-4 py-3 last:border-0">
                      <span className="text-muted-foreground">{key}</span><span className={key === "decision" ? "text-primary" : "text-foreground"}>{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/15 bg-primary/[0.04]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Security posture</CardTitle>
                <CardDescription>Transparent by design, conservative by default.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p className="flex gap-2"><GitPullRequestArrow className="mt-0.5 size-4 shrink-0 text-primary" /> Open-source policy engine and public threat model.</p>
                <p className="flex gap-2"><Fingerprint className="mt-0.5 size-4 shrink-0 text-primary" /> Scoped session authority, never a master seed phrase.</p>
                <Button asChild variant="outline" className="mt-2 w-full"><Link href="/security">Read security model</Link></Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t border-grid">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center lg:py-28">
            <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">Build in public</p>
            <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Agents act. Rules hold.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Follow a live autonomous testnet execution from policy state to public receipt, then try to break the guardrails yourself.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground"><Link href="/demo">Take the guided tour <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/hackathon">Hackathon submission</Link></Button>
              <Button asChild size="lg" variant="ghost"><a href={githubUrl}>Star on GitHub</a></Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
