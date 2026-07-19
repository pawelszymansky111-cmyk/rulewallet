import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BellRing,
  BookUser,
  Bot,
  CalendarClock,
  Check,
  CircleDollarSign,
  Code2,
  ExternalLink,
  Fingerprint,
  Gauge,
  LockKeyhole,
  Pause,
  Route,
  ShieldCheck,
  WalletCards,
  Workflow,
} from "lucide-react";
import { LiveMetricsStrip } from "@/components/live-metrics-strip";
import { PolicyPlayground } from "@/components/policy-playground";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const githubUrl =
  process.env.NEXT_PUBLIC_GITHUB_URL ??
  "https://github.com/pawelszymansky111-cmyk/rulewallet";

const useCases = [
  { icon: CalendarClock, title: "Recurring payments", text: "Schedule payroll, subscriptions, contractor payments, or agent allowances to verified recipients." },
  { icon: Gauge, title: "Bounded agent budgets", text: "Set the maximum for one transfer, a rolling 24-hour window, and the point where a human must approve." },
  { icon: BellRing, title: "Operational alerts", text: "Route execution, approval, failure, and unusual-spending events to your existing notification system." },
] as const;

const controls = [
  { icon: BookUser, title: "Trusted recipients", text: "The agent can pay only addresses the owner explicitly enables." },
  { icon: CircleDollarSign, title: "Hard spending limits", text: "Per-transfer and rolling limits are enforced by the policy account." },
  { icon: Fingerprint, title: "Separated roles", text: "Owner, guardian, agent, and approver authority stay intentionally distinct." },
  { icon: Pause, title: "Emergency control", text: "Pause automation or revoke the agent without surrendering owner recovery." },
] as const;

const architecture = [
  { icon: Bot, label: "Agent intent", detail: "An exact scheduled transfer" },
  { icon: Workflow, label: "Policy checks", detail: "Role, recipient, limits, expiry" },
  { icon: Route, label: "RPC simulation", detail: "Current onchain state" },
  { icon: Activity, label: "Public receipt", detail: "Confirmed or stopped" },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-grid">
          <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
            <div className="launch-shell overflow-hidden rounded-[2rem] border border-primary/20 px-6 py-10 sm:px-10 lg:grid lg:grid-cols-[0.98fr_1.02fr] lg:items-center lg:gap-12 lg:px-14 lg:py-16">
              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/25 bg-white/70 text-primary">Public testnet beta</Badge>
                  <Badge variant="secondary">Open source</Badge>
                  <Badge variant="secondary">No token</Badge>
                </div>
                <h1 className="mt-7 max-w-3xl text-balance text-5xl leading-[0.98] font-semibold tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                  Give agents a budget. <span className="text-primary">Keep the keys.</span>
                </h1>
                <p className="mt-6 max-w-2xl text-balance text-lg leading-8 text-muted-foreground">
                  RuleWallet is a programmable spending firewall for autonomous onchain agents: trusted recipients, hard limits, human approvals, emergency controls, and receipts anyone can verify.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg"><Link href="/demo">Try the 2-minute demo <ArrowRight /></Link></Button>
                  <Button asChild size="lg" variant="outline"><Link href="/start"><WalletCards /> Set up RuleWallet</Link></Button>
                  <Button asChild size="lg" variant="ghost"><a href="/app" target="_blank" rel="noreferrer">Open console <ExternalLink /></a></Button>
                </div>
                <div className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  {["No seed phrase", "Testnet ETH has no value", "Mainnet fails closed"].map((item) => (
                    <span key={item} className="inline-flex items-center gap-2"><Check className="size-4 text-primary" />{item}</span>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-10 lg:mt-0">
                <div className="mb-3 flex items-center justify-between rounded-xl border border-primary/15 bg-white/75 px-4 py-3 text-xs shadow-sm">
                  <span className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4 text-primary" /> Live policy simulator</span>
                  <span className="font-mono text-muted-foreground">NO WALLET REQUIRED</span>
                </div>
                <PolicyPlayground compact />
              </div>
            </div>
          </div>
        </section>

        <LiveMetricsStrip />

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="eyebrow">Built for useful autonomy</p>
              <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Payments an agent can make without owning your wallet.</h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">Start with one recipient, one small amount, and one schedule. RuleWallet checks every execution against current contract state before the agent can sign.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {useCases.map(({ icon: Icon, title, text }, index) => (
              <Card key={title} className="launch-card overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon className="size-5" /></span><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span></div>
                  <CardTitle className="mt-4 text-xl">{title}</CardTitle>
                  <CardDescription className="text-sm leading-6">{text}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-grid bg-card/55">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
            <div className="max-w-3xl">
              <p className="eyebrow">The product</p>
              <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.04em]">One console from setup to proof.</h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">Simple and Pro modes expose the same controls. Only the language changes.</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {controls.map(({ icon: Icon, title, text }) => (
                <Card key={title} className="launch-card">
                  <CardHeader><Icon className="mb-3 size-5 text-primary" /><CardTitle>{title}</CardTitle><CardDescription className="leading-6">{text}</CardDescription></CardHeader>
                </Card>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild><Link href="/start">See complete onboarding <ArrowRight /></Link></Button>
              <Button asChild variant="outline"><a href="/app" target="_blank" rel="noreferrer">Open separate console <ExternalLink /></a></Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow">Architecture</p>
              <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.04em]">The contract decides. The interface explains.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">Frontend previews are useful, but they never grant authority. The policy account remains the financial security boundary.</p>
              <Button asChild variant="outline" className="mt-6"><Link href="/security"><LockKeyhole /> Read the threat model</Link></Button>
            </div>
            <div className="grid gap-3">
              {architecture.map(({ icon: Icon, label, detail }, index) => (
                <div key={label} className="launch-card grid gap-4 rounded-2xl border p-5 sm:grid-cols-[48px_1fr_auto] sm:items-center">
                  <span className="grid size-11 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon className="size-5" /></span>
                  <div><p className="font-medium">{label}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div>
                  <span className="font-mono text-xs text-primary">STEP 0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-grid bg-primary/[0.045]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1fr_0.75fr] lg:items-center lg:px-8 lg:py-20">
            <div>
              <p className="eyebrow">Honest release status</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Working testnet beta. Experimental mainnet implementation.</h2>
              <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Testnet automation and public receipts are live. Mainnet autonomy remains disabled until the pinned factory, non-exportable signer, dual RPC, durable scheduler, fee ceilings, and monitoring gates all verify. RuleWallet is not independently audited or affiliated with Robinhood.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button asChild variant="outline"><Link href="/mainnet">Inspect mainnet gates</Link></Button>
              <Button asChild variant="outline"><Link href="/hackathon">Hackathon package</Link></Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-20 text-center lg:py-28">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><ShieldCheck className="size-7" /></span>
          <p className="mt-6 eyebrow">Build in public</p>
          <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Agents act. Rules hold.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Try a live policy, inspect a real testnet receipt, and tell us the narrowest payment permission your agent actually needs.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link href="/demo">Start the demo <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><a href={githubUrl} target="_blank" rel="noreferrer"><Code2 /> View source</a></Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
