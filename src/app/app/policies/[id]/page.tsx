import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Pause, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Policy detail" };

const rules = [
  ["Per-transaction cap", "$250"],
  ["Daily cap", "$1,000"],
  ["Approval threshold", ">$100"],
  ["Allowed tokens", "USDC, WETH, HOOD"],
  ["Allowed targets", "Uniswap Router, Robinhood Swap"],
  ["Maximum slippage", "1.00%"],
  ["Oracle freshness", "≤90 seconds"],
];

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-6 text-muted-foreground"><Link href="/app"><ArrowLeft /> Dashboard</Link></Button>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><div className="flex items-center gap-3"><h1 className="text-3xl font-semibold tracking-tight">RH testnet trading agent</h1><Badge className="bg-primary/10 text-primary">Active</Badge></div><p className="mt-2 font-mono text-xs text-muted-foreground">{id} · version 3</p></div>
        <Button variant="destructive" disabled title="Persistence is disabled in the prototype"><Pause /> Pause unavailable in demo</Button>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.55fr]">
        <Card>
          <CardHeader><CardTitle>Enforced rules</CardTitle><CardDescription>All hard rules must pass before approval logic runs.</CardDescription></CardHeader>
          <CardContent className="divide-y divide-border">
            {rules.map(([name, value]) => <div key={name} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="flex items-center gap-2"><Check className="size-4 text-primary" />{name}</span><span className="text-right font-mono text-xs text-muted-foreground">{value}</span></div>)}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Authority</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p className="text-muted-foreground">Bound agent</p><p className="font-medium">Market scout</p><p className="text-muted-foreground">Session key</p><code className="text-xs">0x83e4…4a21</code><p className="text-muted-foreground">Network</p><p>Robinhood Chain testnet <span className="font-mono text-xs text-muted-foreground">46630</span></p></CardContent></Card>
          <Card><CardHeader><CardTitle>Audit trail</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-muted-foreground"><p><span className="text-foreground">v3</span> · Approval threshold lowered · 32m ago</p><p><span className="text-foreground">v2</span> · HOOD added · 1d ago</p><p><span className="text-foreground">v1</span> · Policy created · 2d ago</p></CardContent></Card>
        </div>
      </div>
    </main>
  );
}
