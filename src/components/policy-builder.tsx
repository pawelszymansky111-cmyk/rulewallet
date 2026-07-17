"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clipboard, Save, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export function PolicyBuilder() {
  const [name, setName] = useState("Trading research agent");
  const [transactionCap, setTransactionCap] = useState(250);
  const [dailyCap, setDailyCap] = useState(1_000);
  const [approvalAbove, setApprovalAbove] = useState(100);
  const [marketHoursOnly, setMarketHoursOnly] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const policyJson = JSON.stringify({
      name,
      network: "robinhood-chain-testnet",
      limits: { perTransactionUsd: transactionCap, dailyUsd: dailyCap },
      approvalAboveUsd: approvalAbove,
      allowedTokens: ["USDC", "WETH", "HOOD"],
      allowedTargets: ["Uniswap Router", "Robinhood Swap"],
      marketHoursOnly,
    }, null, 2);

  async function copyPolicy() {
    await navigator.clipboard.writeText(policyJson);
    setCopied(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Policy rules</CardTitle>
          <CardDescription>Configure the authority this agent receives. All values are local demo data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-7">
          <div className="space-y-2">
            <Label htmlFor="policy-name">Policy name</Label>
            <Input id="policy-name" value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} className="h-10" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between gap-4"><Label>Per-transaction cap</Label><span className="font-mono text-sm text-primary">${transactionCap}</span></div>
            <Slider value={[transactionCap]} min={25} max={1_000} step={25} onValueChange={(value) => { setTransactionCap(value[0]); setApprovalAbove((current) => Math.min(current, value[0])); setSaved(false); }} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between gap-4"><Label>Daily cap</Label><span className="font-mono text-sm text-primary">${dailyCap.toLocaleString("en-US")}</span></div>
            <Slider value={[dailyCap]} min={100} max={5_000} step={100} onValueChange={(value) => { setDailyCap(value[0]); setSaved(false); }} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between gap-4"><Label>Require approval above</Label><span className="font-mono text-sm text-primary">${approvalAbove}</span></div>
            <Slider value={[approvalAbove]} min={25} max={transactionCap} step={25} onValueChange={(value) => { setApprovalAbove(value[0]); setSaved(false); }} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-grid bg-background/40 p-4">
            <div>
              <Label htmlFor="market-hours">Market-hours only</Label>
              <p className="mt-1 text-xs text-muted-foreground">Block tokenized-equity actions outside the permitted window.</p>
            </div>
            <Switch id="market-hours" checked={marketHoursOnly} onCheckedChange={(value) => { setMarketHoursOnly(value); setSaved(false); }} />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              "USDC",
              "WETH",
              "HOOD",
              "Uniswap Router",
              "Robinhood Swap",
            ].map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
          </div>

          <Button className="bg-primary text-primary-foreground" onClick={() => setSaved(true)}>
            <Save /> Save local demo policy
          </Button>

          {saved && (
            <Alert className="border-primary/20 bg-primary/5">
              <Check className="text-primary" />
              <AlertTitle>Policy saved locally</AlertTitle>
              <AlertDescription>Persistence and onchain deployment are intentionally disabled in this testnet prototype.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Policy preview</CardTitle>
          <CardDescription>Portable JSON for an agent integration.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[520px] overflow-auto rounded-lg border border-grid bg-background/70 p-4 font-mono text-xs leading-6 text-muted-foreground"><code>{policyJson}</code></pre>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={copyPolicy}><Clipboard /> {copied ? "Copied" : "Copy JSON"}</Button>
            <Button asChild variant="ghost"><Link href="/playground">Test rules</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
