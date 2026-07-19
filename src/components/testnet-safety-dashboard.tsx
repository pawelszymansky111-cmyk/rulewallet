"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BellRing,
  Bot,
  CalendarClock,
  CircleCheck,
  Gauge,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
import { useExperienceMode } from "@/components/experience-mode-provider";
import { usePolicyAccount } from "@/components/policy-account-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicMetrics } from "@/lib/public-metrics";

async function getMetrics(policyAccount: string) {
  const response = await fetch(`/api/agent/dashboard?policyAccount=${policyAccount}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Live safety data is unavailable.");
  return data as PublicMetrics;
}

function compactAmount(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function TestnetSafetyDashboard() {
  const { mode } = useExperienceMode();
  const pro = mode === "pro";
  const policyAccount = usePolicyAccount();
  const metricsQuery = useQuery({
    queryKey: ["policy-metrics", "safety-dashboard", policyAccount.address],
    queryFn: () => getMetrics(policyAccount.address!),
    enabled: Boolean(policyAccount.address),
    refetchInterval: 15_000,
  });

  if (policyAccount.hydrated && !policyAccount.address) {
    return (
      <Alert className="mt-8 border-amber-500/25 bg-amber-50">
        <ShieldAlert />
        <AlertTitle>No policy account selected</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Deploy a personal testnet account before reading balances, limits, and automation state.</span>
          <Button asChild variant="outline" size="sm"><Link href="/app/deploy">Deploy account</Link></Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (metricsQuery.error) {
    return (
      <Alert variant="destructive" className="mt-8">
        <ShieldAlert />
        <AlertTitle>Live safety dashboard unavailable</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>{metricsQuery.error.message}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => metricsQuery.refetch()}>
            <RefreshCw /> Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!metricsQuery.data) {
    return (
      <Card className="mt-8 overflow-hidden" aria-live="polite">
        <CardContent className="flex min-h-44 items-center justify-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin text-primary" /> Reading live policy, balance, and automation state…
        </CardContent>
      </Card>
    );
  }

  const metrics = metricsQuery.data;
  const policyHealthy = metrics.contract.policyActive && !metrics.contract.paused;
  const nextRun = metrics.automation.nextScheduledRun
    ? new Date(metrics.automation.nextScheduledRun).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      })
    : "No active schedule";

  const cards = [
    {
      label: "Policy balance",
      value: `${compactAmount(metrics.contract.balanceEth)} ETH`,
      detail: "Valueless testnet ETH",
      icon: WalletCards,
      help: "Funds held by the configured public testnet policy account.",
    },
    {
      label: "24h remaining",
      value: `${compactAmount(metrics.nativePolicy.remainingRollingEth)} ETH`,
      detail: `${compactAmount(metrics.nativePolicy.rollingSpentEth)} ETH used`,
      icon: Gauge,
      help: "The rolling amount still available to the agent under the current native-asset policy.",
    },
    {
      label: "Next transfer",
      value: nextRun,
      detail: `${metrics.automation.activeStrategies} active schedule${metrics.automation.activeStrategies === 1 ? "" : "s"}`,
      icon: CalendarClock,
      help: "The earliest next run reported by durable testnet strategy storage.",
    },
    {
      label: "Safety state",
      value: policyHealthy && metrics.agent.roleGranted ? "Enforcing" : "Attention needed",
      detail: metrics.contract.paused ? "Account paused" : `Observed block ${Number(metrics.blockNumber).toLocaleString("en-US")}`,
      icon: ShieldCheck,
      help: "Healthy means the policy is active, unpaused, and the dedicated agent role is currently granted.",
    },
  ] as const;

  return (
    <section className="mt-8 space-y-5" aria-labelledby="safety-dashboard-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Live safety dashboard</p>
            <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">Chain 46630</Badge>
            <Badge variant="secondary">{policyAccount.source === "personal" ? "Personal account" : "Public demo"}</Badge>
          </div>
          <h2 id="safety-dashboard-title" className="mt-2 text-2xl font-semibold tracking-tight">{pro ? "Inspect live policy and automation state." : "Know what can move before it moves."}</h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => metricsQuery.refetch()} disabled={metricsQuery.isFetching}>
          <RefreshCw className={metricsQuery.isFetching ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon, help }) => (
          <Card key={label} className="launch-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 text-muted-foreground">
                <Icon className="size-4 text-primary" />
                <InfoTooltip label={`Explain ${label}`} text={help} />
              </div>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="break-words text-xl">{value}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{detail}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="launch-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> {pro ? "Enforcement coverage" : "Safety checks"}</CardTitle>
            <CardDescription>{pro ? "Current contract and scheduler evidence—not client-side configuration claims." : "What the account checks before the agent can make a payment."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ["Policy", policyHealthy ? "Active and unpaused" : "Needs attention"],
              ["Agent role", metrics.agent.roleGranted ? "Granted" : "Not granted"],
              ["Per transfer", `${compactAmount(metrics.nativePolicy.maxPerTransactionEth)} ETH maximum`],
              ["Human review", `Above ${compactAmount(metrics.nativePolicy.approvalAboveEth)} ETH`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="launch-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="size-5 text-primary" /> Latest automation</CardTitle>
            <CardDescription>Public receipt state from durable execution history.</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.automation.lastExecution ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={metrics.automation.lastExecution.status === "confirmed" ? "border-primary/25 text-primary" : "border-amber-500/25 text-amber-800"}>{metrics.automation.lastExecution.status}</Badge>
                  <span className="font-medium">{metrics.automation.lastExecution.strategyName}</span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{metrics.automation.lastExecution.reason ?? `${metrics.automation.lastExecution.amountEth} testnet ETH passed every policy check.`}</p>
                <Button asChild variant="outline" size="sm"><Link href="/activity">Open public receipt <ArrowRight /></Link></Button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-grid p-6 text-center">
                <Bot className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No execution receipt yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Create a tiny testnet schedule, then return here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href="/app/agent"><Bot /> Manage schedules</Link></Button>
        <Button asChild variant="outline"><Link href="/app/services"><ShieldCheck /> Trusted recipients</Link></Button>
        <Button asChild variant="outline"><Link href="/app/notifications"><BellRing /> Alert delivery</Link></Button>
      </div>
    </section>
  );
}
