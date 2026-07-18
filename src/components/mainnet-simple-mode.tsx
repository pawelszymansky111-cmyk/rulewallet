"use client";

import Link from "next/link";
import { ArrowRight, Eye, Settings2, ShieldAlert, Wallet } from "lucide-react";
import { useExperienceMode } from "@/components/experience-mode-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const phases = [
  ["1", "Connect the owner wallet", "Confirm Robinhood Chain mainnet and check the public address. Never enter a recovery phrase."],
  ["2", "Create or select an account", "A personal policy account separates owner authority from agent, guardian, and approver roles."],
  ["3", "Set recipients and limits", "Enable exactly who may receive funds and configure mandatory per-transfer and rolling limits."],
  ["4", "Start with a canary", "Deposit the smallest useful amount, verify one receipt, and rehearse pause and withdrawal."],
] as const;

export function MainnetSimpleMode() {
  const { setMode } = useExperienceMode();

  return (
    <div className="space-y-6">
      <Alert className="border-red-400/25 bg-red-400/[0.04]"><ShieldAlert /><AlertTitle>Do not continue casually</AlertTitle><AlertDescription>This environment uses real assets. The contracts are experimental and unaudited. Use the public testnet demo unless you understand every role and wallet prompt.</AlertDescription></Alert>
      <div className="grid gap-4 md:grid-cols-2">{phases.map(([number, title, text]) => <Card key={number}><CardHeader><p className="font-mono text-xs text-primary">{number}</p><CardTitle>{title}</CardTitle><CardDescription className="leading-6">{text}</CardDescription></CardHeader></Card>)}</div>
      <Card className="border-primary/20 bg-primary/[0.035]"><CardHeader><Settings2 className="mb-2 size-5 text-primary" /><CardTitle>Advanced controls are intentionally behind Pro mode</CardTitle><CardDescription>Pro mode reveals factory deployment, role addresses, raw transaction previews, asset policies, owner funding, emergency controls, approval queues, and EIP-712 strategies.</CardDescription><div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => setMode("pro")}>Enable Pro mode <ArrowRight /></Button><Button asChild variant="outline"><Link href="/demo"><Eye /> Use the testnet demo</Link></Button><Button asChild variant="ghost"><a href="/app" target="_blank" rel="noreferrer"><Wallet /> Open testnet console</a></Button></div></CardHeader></Card>
    </div>
  );
}
