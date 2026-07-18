"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, LoaderCircle, Radio, RefreshCw, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentExecution } from "@/lib/agent-types";
import { robinhoodTestnet } from "@/lib/chains";

function shortValue(value: string, start = 8, end = 6) {
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

export function PublicAgentActivity() {
  const [copiedId, setCopiedId] = useState<string>();
  const activityQuery = useQuery({
    queryKey: ["public-agent-activity"],
    queryFn: async () => {
      const response = await fetch("/api/agent/activity", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Activity unavailable.");
      return data.executions as AgentExecution[];
    },
    refetchInterval: 15_000,
  });
  const executions = activityQuery.data;

  async function copyReceipt(execution: AgentExecution) {
    const url = `${window.location.origin}/activity#${execution.id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(execution.id);
    window.setTimeout(() => setCopiedId(undefined), 1800);
  }

  if (activityQuery.error) return <Alert variant="destructive"><ShieldAlert /><AlertTitle>Receipts unavailable</AlertTitle><AlertDescription>{activityQuery.error.message}</AlertDescription></Alert>;
  if (!executions) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading onchain receipts…</div>;

  const confirmed = executions.filter((execution) => execution.status === "confirmed").length;
  const stopped = executions.filter((execution) => execution.status !== "confirmed").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Receipts", executions.length], ["Confirmed", confirmed], ["Stopped", stopped], ["Network", "46630"]].map(([label, value]) => <div key={label} className="rounded-xl border border-grid bg-card/50 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-mono text-lg text-primary">{value}</p></div>)}
      </div>
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><CardTitle className="flex items-center gap-2"><Radio className="size-4 text-primary" /> Automation receipts</CardTitle><CardDescription className="mt-2">Public evidence for every autonomous attempt. Confirmed links resolve on Robinhood Chain testnet.</CardDescription></div>
          <Button variant="outline" size="sm" className="w-fit" onClick={() => activityQuery.refetch()} disabled={activityQuery.isFetching}><RefreshCw className={activityQuery.isFetching ? "animate-spin" : ""} /> Refresh</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {executions.length === 0 ? <p className="rounded-xl border border-dashed border-grid p-8 text-center text-muted-foreground">No automation receipts yet.</p> : executions.map((execution) => (
            <article id={execution.id} key={execution.id} className="scroll-mt-24 rounded-xl border border-grid bg-background/55 p-5 target:border-primary/50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{execution.strategyName}</p><Badge variant="outline" className={execution.status === "confirmed" ? "border-primary/25 bg-primary/5 text-primary" : "border-amber-500/25 text-amber-200"}>{execution.status === "confirmed" && <Check />}{execution.status}</Badge><Badge variant="secondary">{execution.trigger}</Badge></div><p className="mt-2 text-xs text-muted-foreground">Receipt <span className="font-mono">{execution.id}</span></p></div>
                <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => copyReceipt(execution)}>{copiedId === execution.id ? <Check /> : <Copy />}{copiedId === execution.id ? "Copied" : "Share"}</Button>{execution.transactionHash && <Button asChild variant="outline" size="sm"><a href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${execution.transactionHash}`} target="_blank" rel="noreferrer">Explorer <ExternalLink /></a></Button>}</div>
              </div>
              <dl className="mt-5 grid gap-4 border-t border-grid pt-5 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-muted-foreground">Value</dt><dd className="mt-1 font-mono">{execution.amountEth} testnet ETH</dd></div>
                <div><dt className="text-muted-foreground">Target</dt><dd className="mt-1 font-mono" title={execution.target}>{shortValue(execution.target)}</dd></div>
                <div><dt className="text-muted-foreground">Block</dt><dd className="mt-1 font-mono">{execution.blockNumber ?? "Not included"}</dd></div>
                <div><dt className="text-muted-foreground">Recorded</dt><dd className="mt-1 font-mono">{new Date(execution.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</dd></div>
              </dl>
              {execution.transactionHash && <div className="mt-4 rounded-lg border border-primary/10 bg-primary/[0.035] px-4 py-3"><p className="text-xs text-muted-foreground">Transaction hash</p><p className="mt-1 break-all font-mono text-xs text-primary">{execution.transactionHash}</p></div>}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {execution.status === "confirmed" ? <><span className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Agent role verified</span><span className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Policy limits checked</span><span className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Exact call simulated</span></> : <span className="flex items-center gap-1.5"><ShieldAlert className="size-3.5 text-amber-200" /> No successful transfer recorded</span>}
                {execution.reason && <span className="text-amber-200">{execution.reason}</span>}
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
      <p className="text-xs leading-5 text-muted-foreground">Receipts are application records backed by onchain transaction hashes where execution occurred. Always verify finality and call details on the testnet explorer. Mainnet and real funds remain disabled.</p>
    </div>
  );
}
