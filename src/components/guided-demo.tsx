"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ExternalLink, LoaderCircle, Radio, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicMetrics } from "@/lib/public-metrics";
import { robinhoodTestnet } from "@/lib/chains";

const steps = [
  { title: "Verify the guardrails", description: "Read the active contract state directly from Robinhood Chain testnet." },
  { title: "Inspect an execution", description: "Open the latest autonomous receipt and verify its transaction independently." },
  { title: "Break a rule, then inspect control", description: "Test a hard failure and see how an admin pauses or revokes automation." },
] as const;

export function GuidedDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const metricsQuery = useQuery({
    queryKey: ["public-metrics", "guided-demo"],
    queryFn: async () => {
      const response = await fetch("/api/public/metrics", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Live metrics unavailable.");
      return data as PublicMetrics;
    },
  });
  const metrics = metricsQuery.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.68fr_1.32fr]">
      <Card className="h-fit bg-card/70">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-primary/25 text-primary"><Radio /> Guided tour</Badge>
          <CardTitle className="text-2xl">Two minutes. No funds required.</CardTitle>
          <CardDescription>This walkthrough is public and read-only. Connecting a wallet is optional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {steps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${activeStep === index ? "border-primary/35 bg-primary/[0.06]" : "border-transparent hover:border-grid hover:bg-muted/30"}`}
            >
              <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs ${activeStep === index ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{index + 1}</span>
              <span><span className="block text-sm font-medium">{step.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{step.description}</span></span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="min-h-[420px] border-primary/15 bg-background/80">
        <CardHeader>
          <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Step {activeStep + 1} / {steps.length}</p>
          <CardTitle className="text-2xl">{steps[activeStep].title}</CardTitle>
          <CardDescription>{steps[activeStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {!metrics && !metricsQuery.error && <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading live proof…</div>}
          {metricsQuery.error && <p className="text-sm text-destructive">{metricsQuery.error.message}</p>}

          {metrics && activeStep === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Policy status", metrics.contract.policyActive && !metrics.contract.paused ? "Active · enforcing" : "Paused"],
                ["Contract balance", `${metrics.contract.balanceEth} testnet ETH`],
                ["24h remaining", `${metrics.nativePolicy.remainingRollingEth} testnet ETH`],
                ["Observed block", Number(metrics.blockNumber).toLocaleString("en-US")],
                ["Agent role", metrics.agent.roleGranted ? "Granted" : "Not granted"],
                ["Mainnet", "Hard-disabled"],
              ].map(([label, value]) => <div key={label} className="rounded-xl border border-grid bg-card/40 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-mono text-sm text-primary">{value}</p></div>)}
            </div>
          )}

          {metrics && activeStep === 1 && (
            <div className="rounded-xl border border-grid bg-card/40 p-5">
              {metrics.automation.lastExecution ? <>
                <div className="flex flex-wrap items-center gap-2"><ShieldCheck className="size-5 text-primary" /><p className="font-medium">{metrics.automation.lastExecution.strategyName}</p><Badge variant="outline" className="text-primary">{metrics.automation.lastExecution.status}</Badge></div>
                <dl className="mt-5 grid gap-3 font-mono text-xs sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">Amount</dt><dd className="mt-1">{metrics.automation.lastExecution.amountEth} testnet ETH</dd></div>
                  <div><dt className="text-muted-foreground">Block</dt><dd className="mt-1">{metrics.automation.lastExecution.blockNumber ?? "—"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-muted-foreground">Transaction</dt><dd className="mt-1 break-all">{metrics.automation.lastExecution.transactionHash ?? "No transaction hash"}</dd></div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-2"><Button asChild><Link href="/activity">Open full receipt</Link></Button>{metrics.automation.lastExecution.transactionHash && <Button asChild variant="outline"><a href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${metrics.automation.lastExecution.transactionHash}`} target="_blank" rel="noreferrer">Verify on explorer <ExternalLink /></a></Button>}</div>
              </> : <p className="text-muted-foreground">No execution receipt is available yet.</p>}
            </div>
          )}

          {metrics && activeStep === 2 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-grid bg-card/40 p-5"><p className="font-medium">Suggested failure test</p><ol className="mt-3 space-y-2 text-sm text-muted-foreground"><li>1. Start with the safe 45 USDC request.</li><li>2. Raise it above the approval threshold.</li><li>3. Select an unknown target and watch it fail closed.</li></ol></div>
              <div className="grid gap-3 sm:grid-cols-2"><Button asChild><Link href="/playground">Open simulator <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/app/agent">Inspect pause and revoke <ArrowRight /></Link></Button></div>
              <p className="text-xs text-muted-foreground">Browsing is public. Wallet signatures are required only for admin mutations.</p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-grid pt-5">
            <Button variant="ghost" disabled={activeStep === 0} onClick={() => setActiveStep((step) => Math.max(0, step - 1))}><ArrowLeft /> Back</Button>
            <Button variant="outline" disabled={activeStep === steps.length - 1} onClick={() => setActiveStep((step) => Math.min(steps.length - 1, step + 1))}>Next <ArrowRight /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
