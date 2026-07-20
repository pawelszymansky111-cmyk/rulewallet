import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, CircleX, ExternalLink } from "lucide-react";
import { DecisionBadge } from "@/components/decision-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { demoPolicy, evaluatePolicy, type TransactionRequest } from "@/lib/policy";

export const metadata: Metadata = { title: "Request receipt" };

const requestFixtures: Record<string, { agent: string; action: string; request: TransactionRequest }> = {
  req_7f31: {
    agent: "Payroll agent",
    action: "Send scheduled payroll transfer",
    request: { amountEth: 0.0001, asset: "Testnet ETH", recipient: "Payroll wallet", spentRolling24HoursEth: 0.0012, accountBalanceEth: 0.01 },
  },
  req_5ab8: {
    agent: "Contractor agent",
    action: "Send contractor payment",
    request: { amountEth: 0.0007, asset: "Testnet ETH", recipient: "Contractor wallet", spentRolling24HoursEth: 0.0012, accountBalanceEth: 0.01 },
  },
  req_19c2: {
    agent: "Payroll agent",
    action: "Send to untrusted recipient",
    request: { amountEth: 0.0002, asset: "Testnet ETH", recipient: "Unknown 0x7d…91c", spentRolling24HoursEth: 0.0012, accountBalanceEth: 0.01 },
  },
};

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fixture = requestFixtures[id] ?? requestFixtures.req_7f31;
  const decision = evaluatePolicy(demoPolicy, fixture.request);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-6 text-muted-foreground"><Link href="/app"><ArrowLeft /> Dashboard</Link></Button>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-muted-foreground">{id}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Decision receipt</h1></div><DecisionBadge status={decision.status} /></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <Card><CardHeader><CardTitle>Proposed action</CardTitle><CardDescription>Simulated direct-transfer request</CardDescription></CardHeader><CardContent><dl className="space-y-4 text-sm">{[["Agent", fixture.agent], ["Action", fixture.action], ["Amount", `${fixture.request.amountEth.toFixed(4)} testnet ETH`], ["Asset", fixture.request.asset], ["Recipient", fixture.request.recipient], ["Network", "Robinhood Chain testnet"]].map(([term, value]) => <div key={term} className="flex justify-between gap-4"><dt className="text-muted-foreground">{term}</dt><dd className="text-right">{value}</dd></div>)}</dl></CardContent></Card>
        <Card><CardHeader><CardTitle>Decision evidence</CardTitle><CardDescription>{decision.summary}</CardDescription></CardHeader><CardContent className="divide-y divide-border">{decision.rules.map((rule) => <div key={rule.id} className="flex items-start gap-3 py-3"><span className={`mt-0.5 grid size-5 place-items-center rounded-full ${rule.passed ? "bg-primary/10 text-primary" : "bg-red-50 text-red-700"}`}>{rule.passed ? <Check className="size-3.5" /> : <CircleX className="size-3.5" />}</span><div className="flex-1"><div className="flex justify-between gap-3 text-sm"><span>{rule.label}</span><span className={`font-mono text-[11px] ${rule.passed ? "text-muted-foreground" : "text-red-700"}`}>{rule.passed ? "PASS" : "FAIL"}</span></div><p className="mt-1 text-xs text-muted-foreground">{rule.detail}</p></div></div>)}</CardContent></Card>
      </div>
      <Card className="mt-6"><CardHeader><CardTitle>Execution</CardTitle></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm"><div><p className="text-muted-foreground">Simulation result</p><p className="mt-1">{decision.status === "allowed" ? "Policy accepted the exact request" : decision.status === "review" ? "An independent approver would be required" : "No transaction can be created"}</p></div><Button asChild variant="outline"><Link href="/activity">Open public receipts <ExternalLink /></Link></Button></CardContent></Card>
    </main>
  );
}
