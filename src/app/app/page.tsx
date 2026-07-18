import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookUser, Bot, CircleCheck, Clock3, Pause, Plus, Shield, WalletCards } from "lucide-react";
import { DecisionBadge } from "@/components/decision-badge";
import { ModeVisibility } from "@/components/mode-visibility";
import { SimpleConsoleOverview } from "@/components/simple-console-overview";
import { TestnetCommandCenter } from "@/components/testnet-command-center";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Demo dashboard" };

const requests = [
  { id: "req_7f31", agent: "Market scout", action: "Swap 45 USDC → WETH", time: "12s ago", status: "allowed" as const },
  { id: "req_5ab8", agent: "Rebalance agent", action: "Swap 150 USDC → HOOD", time: "4m ago", status: "review" as const },
  { id: "req_19c2", agent: "Market scout", action: "Call unknown contract", time: "18m ago", status: "blocked" as const },
];

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Workspace / testnet</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">RuleWallet console</h1><p className="mt-2 text-muted-foreground">Simple mode guides the setup. Pro mode exposes requests, policy state, and operator controls.</p></div>
        <ModeVisibility mode="pro"><div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/app/services"><BookUser /> Trusted addresses</Link></Button>
          <Button asChild variant="outline"><Link href="/app/agent"><Bot /> Agent automation</Link></Button>
          <Button asChild variant="outline"><Link href="/app/deploy"><WalletCards /> Deploy contract</Link></Button>
          <Button asChild className="bg-primary text-primary-foreground"><Link href="/app/policies/new"><Plus /> New policy</Link></Button>
        </div></ModeVisibility>
      </div>

      <ModeVisibility mode="simple"><SimpleConsoleOverview /></ModeVisibility>
      <ModeVisibility mode="pro"><>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active policies", value: "2", icon: Shield },
          { label: "Connected agents", value: "3", icon: Bot },
          { label: "Allowed today", value: "14", icon: CircleCheck },
          { label: "Needs approval", value: "1", icon: Clock3 },
        ].map((stat) => {
          const Icon = stat.icon;
          return <Card key={stat.label} size="sm"><CardHeader><CardDescription>{stat.label}</CardDescription><CardTitle className="flex items-center justify-between text-2xl"><span>{stat.value}</span><Icon className="size-4 text-primary" /></CardTitle></CardHeader></Card>;
        })}
      </div>

      <div className="mt-6">
        <TestnetCommandCenter />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent requests</CardTitle>
            <CardDescription>Example receipts remain visible while live testnet requests appear in the command center above.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Action</TableHead><TableHead>Decision</TableHead><TableHead className="text-right">Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell><Link href={`/app/requests/${request.id}`} className="font-mono text-xs text-primary hover:underline">{request.id}</Link><p className="mt-1 text-xs text-muted-foreground">{request.agent}</p></TableCell>
                    <TableCell>{request.action}</TableCell>
                    <TableCell><DecisionBadge status={request.status} /></TableCell>
                    <TableCell className="text-right text-muted-foreground">{request.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Active policy</CardTitle><CardDescription>RH testnet trading agent</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-grid bg-background/45 p-4">
              <div className="flex items-center justify-between"><Badge className="bg-primary/10 text-primary">Active</Badge><span className="font-mono text-xs text-muted-foreground">v3</span></div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Per transaction</dt><dd className="font-mono">$250</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Daily limit</dt><dd className="font-mono">$1,000</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Approval above</dt><dd className="font-mono">$100</dd></div>
              </dl>
            </div>
            <Button asChild variant="outline" className="w-full"><Link href="/app/policies/pol_rh_trade_01">View policy <ArrowRight /></Link></Button>
            <Button variant="destructive" className="w-full" disabled title="Persistence is disabled in the prototype"><Pause /> Pause unavailable in demo</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-primary/15 bg-primary/[0.035]">
        <CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="size-4 text-primary" /> Connect an agent</CardTitle><CardDescription>Grant the onchain AGENT_ROLE to a separate testnet address. The agent can propose only policy-bound calls; it never receives the owner wallet seed or admin role.</CardDescription></CardHeader>
      </Card>
      </></ModeVisibility>
    </main>
  );
}
