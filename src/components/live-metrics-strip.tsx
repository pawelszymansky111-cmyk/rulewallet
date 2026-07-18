"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Blocks, Bot, CircleCheck, LoaderCircle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { PublicMetrics } from "@/lib/public-metrics";

const metricConfig = [
  { key: "status", label: "Policy", icon: CircleCheck },
  { key: "block", label: "Live block", icon: Blocks },
  { key: "nonce", label: "Agent executions", icon: Bot },
  { key: "receipts", label: "Confirmed receipts", icon: Activity },
] as const;

export function LiveMetricsStrip() {
  const metricsQuery = useQuery({
    queryKey: ["public-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/public/metrics", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Live metrics unavailable.");
      return data as PublicMetrics;
    },
    refetchInterval: 15_000,
  });

  if (metricsQuery.error) {
    return (
      <Alert variant="destructive" className="rounded-none border-x-0">
        <ShieldAlert />
        <AlertTitle>Live proof temporarily unavailable</AlertTitle>
        <AlertDescription>{metricsQuery.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!metricsQuery.data) {
    return <div className="flex h-24 items-center justify-center gap-2 border-y border-grid text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Reading Robinhood Chain testnet…</div>;
  }

  const metrics = metricsQuery.data;
  const values = {
    status: metrics.contract.policyActive && !metrics.contract.paused ? "Enforcing" : "Paused",
    block: Number(metrics.blockNumber).toLocaleString("en-US"),
    nonce: metrics.agent.nonce,
    receipts: metrics.automation.confirmedExecutions.toString(),
  };

  return (
    <section className="border-b border-grid bg-card/30" aria-label="Live onchain metrics">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-border border-x border-grid md:grid-cols-4 md:divide-y-0">
        {metricConfig.map(({ key, label, icon: Icon }) => (
          <div key={key} className="px-5 py-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5 text-primary" />{label}</div>
            <p className="mt-2 font-mono text-lg font-semibold text-primary">{values[key]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
