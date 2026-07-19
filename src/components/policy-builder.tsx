"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, Check, Clipboard, Save, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

function ethLabel(value: number) {
  return `${value.toFixed(4)} ETH`;
}

export function PolicyBuilder() {
  const [name, setName] = useState("Recurring payments agent");
  const [recipientLabel, setRecipientLabel] = useState("Operations wallet");
  const [transactionCap, setTransactionCap] = useState(0.001);
  const [dailyCap, setDailyCap] = useState(0.005);
  const [approvalAbove, setApprovalAbove] = useState(0.0005);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const policyJson = JSON.stringify(
    {
      name,
      network: "robinhood-chain-testnet",
      asset: "native-testnet-eth",
      trustedRecipientLabel: recipientLabel,
      limits: {
        perTransactionEth: transactionCap.toFixed(4),
        rolling24HoursEth: dailyCap.toFixed(4),
      },
      approvalAboveEth: approvalAbove.toFixed(4),
      notifications: alertsEnabled
        ? ["execution", "approval", "failure", "unusual-spending"]
        : [],
      emergencyPause: true,
    },
    null,
    2,
  );

  async function copyPolicy() {
    await navigator.clipboard.writeText(policyJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <Card className="launch-card">
        <CardHeader>
          <CardTitle>Payment policy preview</CardTitle>
          <CardDescription>Design a narrow testnet policy before touching a wallet. This preview does not create an onchain permission.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="policy-name">Policy name</Label><Input id="policy-name" value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} /></div>
            <div className="space-y-2"><Label htmlFor="recipient-label">Recipient label</Label><Input id="recipient-label" value={recipientLabel} onChange={(event) => { setRecipientLabel(event.target.value); setSaved(false); }} /></div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between gap-4"><Label>Maximum per transfer</Label><span className="font-mono text-sm text-primary">{ethLabel(transactionCap)}</span></div>
            <Slider value={[transactionCap]} min={0.0001} max={0.005} step={0.0001} onValueChange={(value) => { setTransactionCap(value[0]); setApprovalAbove((current) => Math.min(current, value[0])); setDailyCap((current) => Math.max(current, value[0])); setSaved(false); }} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between gap-4"><Label>Rolling 24-hour maximum</Label><span className="font-mono text-sm text-primary">{ethLabel(dailyCap)}</span></div>
            <Slider value={[dailyCap]} min={transactionCap} max={0.02} step={0.0005} onValueChange={(value) => { setDailyCap(value[0]); setSaved(false); }} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between gap-4"><Label>Require approval above</Label><span className="font-mono text-sm text-primary">{ethLabel(approvalAbove)}</span></div>
            <Slider value={[approvalAbove]} min={0.0001} max={transactionCap} step={0.0001} onValueChange={(value) => { setApprovalAbove(value[0]); setSaved(false); }} />
          </div>

          <div className="flex items-center justify-between gap-5 rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
            <div><Label htmlFor="policy-alerts" className="flex items-center gap-2"><BellRing className="size-4 text-primary" /> Alert on every outcome</Label><p className="mt-1 text-xs text-muted-foreground">Prepare execution, approval, failure, and unusual-request events.</p></div>
            <Switch id="policy-alerts" checked={alertsEnabled} onCheckedChange={(value) => { setAlertsEnabled(value); setSaved(false); }} />
          </div>

          <div className="flex flex-wrap gap-2"><Badge variant="outline">Direct testnet ETH</Badge><Badge variant="outline">Trusted recipient required</Badge><Badge variant="outline">Emergency pause</Badge><Badge variant="outline">No swaps or approvals</Badge></div>

          <Button onClick={() => setSaved(true)}><Save /> Save local preview</Button>
          {saved && <Alert className="border-primary/20 bg-primary/5"><Check className="text-primary" /><AlertTitle>Preview saved for this session</AlertTitle><AlertDescription>Continue to deployment and trusted recipients when you are ready for separately simulated wallet actions.</AlertDescription></Alert>}
        </CardContent>
      </Card>

      <Card className="launch-card h-fit">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Policy JSON</CardTitle><CardDescription>A readable integration preview. The contract remains the authority.</CardDescription></CardHeader>
        <CardContent>
          <pre className="max-h-[560px] overflow-auto rounded-xl border border-grid bg-background/75 p-4 font-mono text-xs leading-6 text-muted-foreground"><code>{policyJson}</code></pre>
          <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={copyPolicy}><Clipboard /> {copied ? "Copied" : "Copy JSON"}</Button><Button asChild variant="ghost"><Link href="/playground">Test decisions</Link></Button><Button asChild variant="ghost"><Link href="/app/deploy">Deploy test account</Link></Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
