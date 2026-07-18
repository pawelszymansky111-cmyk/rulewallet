"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentExecution } from "@/lib/agent-types";
import { robinhoodTestnet } from "@/lib/chains";

export function PublicAgentActivity() {
  const activityQuery = useQuery({
    queryKey: ["public-agent-activity"],
    queryFn: async () => {
      const response = await fetch("/api/agent/activity", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Activity unavailable.");
      return data.executions as AgentExecution[];
    },
  });
  const executions = activityQuery.data;

  if (activityQuery.error) return <Alert variant="destructive"><ShieldAlert /><AlertTitle>Receipts unavailable</AlertTitle><AlertDescription>{activityQuery.error.message}</AlertDescription></Alert>;
  if (!executions) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading onchain receipts…</div>;

  return <Card><CardHeader><CardTitle>Automation receipts</CardTitle><CardDescription>Public evidence for every autonomous attempt. Transaction links resolve on Robinhood Chain testnet.</CardDescription></CardHeader><CardContent className="space-y-3">{executions.length === 0 ? <p className="rounded-xl border border-dashed border-grid p-8 text-center text-muted-foreground">No automation receipts yet.</p> : executions.map((execution) => <div key={execution.id} className="grid gap-3 border-b border-grid py-4 first:pt-0 last:border-0 sm:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{execution.strategyName}</p><Badge variant="outline" className={execution.status === "confirmed" ? "text-primary" : "text-amber-200"}>{execution.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{execution.amountEth} testnet ETH to <span className="font-mono text-xs">{execution.target}</span></p><p className="mt-1 text-xs text-muted-foreground">{new Date(execution.createdAt).toLocaleString()} · {execution.trigger}{execution.reason ? ` · ${execution.reason}` : ""}</p></div>{execution.transactionHash && <Button asChild variant="outline" size="sm"><a href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${execution.transactionHash}`} target="_blank" rel="noreferrer">Explorer <ExternalLink /></a></Button>}</div>)}</CardContent></Card>;
}
