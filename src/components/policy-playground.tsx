"use client";

import { useState } from "react";
import { Check, ChevronRight, CircleX, RotateCcw, ShieldCheck } from "lucide-react";
import { DecisionBadge } from "@/components/decision-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { demoPolicy, evaluatePolicy, type TransactionRequest } from "@/lib/policy";

type PresetId = "safe-payment" | "human-review" | "oversized" | "untrusted" | "rolling-limit";

const presets: Record<PresetId, { label: string; request: TransactionRequest }> = {
  "safe-payment": {
    label: "Safe scheduled payment",
    request: { amountEth: 0.0001, asset: "Testnet ETH", recipient: "Payroll wallet", spentRolling24HoursEth: 0.0012, accountBalanceEth: 0.01 },
  },
  "human-review": {
    label: "Needs human approval",
    request: { amountEth: 0.0007, asset: "Testnet ETH", recipient: "Contractor wallet", spentRolling24HoursEth: 0.0012, accountBalanceEth: 0.01 },
  },
  oversized: {
    label: "Over per-transfer limit",
    request: { amountEth: 0.002, asset: "Testnet ETH", recipient: "Payroll wallet", spentRolling24HoursEth: 0.0012, accountBalanceEth: 0.01 },
  },
  untrusted: {
    label: "Untrusted recipient",
    request: { amountEth: 0.0002, asset: "Testnet ETH", recipient: "Unknown 0x7d…91c", spentRolling24HoursEth: 0.0012, accountBalanceEth: 0.01 },
  },
  "rolling-limit": {
    label: "Over rolling limit",
    request: { amountEth: 0.0005, asset: "Testnet ETH", recipient: "Payroll wallet", spentRolling24HoursEth: 0.0047, accountBalanceEth: 0.01 },
  },
};

const initialPreset: PresetId = "safe-payment";

export function PolicyPlayground({ compact = false }: { compact?: boolean }) {
  const [preset, setPreset] = useState<PresetId>(initialPreset);
  const [request, setRequest] = useState<TransactionRequest>(presets[initialPreset].request);
  const decision = evaluatePolicy(demoPolicy, request);

  function loadPreset(value: PresetId) {
    setPreset(value);
    setRequest({ ...presets[value].request });
  }

  return (
    <Card className="lime-shadow border border-primary/10 bg-card/95 py-0">
      <CardHeader className="border-b border-grid px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Live policy simulation</CardTitle>
            <CardDescription className="mt-1">Try the safety rules without a wallet or funds.</CardDescription>
          </div>
          <div className="flex items-center gap-2"><Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">Demo mode</Badge><span className="size-2 animate-pulse rounded-full bg-primary" aria-label="Simulator online" /></div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-0 p-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5 border-b border-grid p-5 sm:p-6 lg:border-r lg:border-b-0">
          <div className="space-y-2">
            <Label htmlFor="scenario">Scenario</Label>
            <Select value={preset} onValueChange={(value) => loadPreset(value as PresetId)}>
              <SelectTrigger id="scenario" className="h-10 w-full bg-background/60"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(presets).map(([id, item]) => <SelectItem key={id} value={id}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="asset">Asset</Label>
              <Select value={request.asset} onValueChange={(asset) => setRequest((current) => ({ ...current, asset }))}>
                <SelectTrigger id="asset" className="h-10 w-full bg-background/60"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Testnet ETH">Testnet ETH</SelectItem><SelectItem value="Unsupported token">Unsupported token</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Select value={request.recipient} onValueChange={(recipient) => setRequest((current) => ({ ...current, recipient }))}>
                <SelectTrigger id="recipient" className="h-10 w-full bg-background/60"><SelectValue /></SelectTrigger>
                <SelectContent>{["Payroll wallet", "Contractor wallet", "Unknown 0x7d…91c"].map((recipient) => <SelectItem key={recipient} value={recipient}>{recipient}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Transfer amount</Label><span className="font-mono text-sm text-primary">{request.amountEth.toFixed(4)} ETH</span></div>
            <Slider value={[request.amountEth]} min={0.0001} max={0.002} step={0.0001} onValueChange={(value) => setRequest((current) => ({ ...current, amountEth: value[0] }))} aria-label="Transfer amount in testnet ETH" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>0.0001</span><span>Policy limit: 0.0010</span><span>0.0020</span></div>
          </div>

          {!compact && <div className="space-y-3"><div className="flex items-center justify-between"><Label>Already spent in 24h</Label><span className="font-mono text-sm">{request.spentRolling24HoursEth.toFixed(4)} ETH</span></div><Slider value={[request.spentRolling24HoursEth]} min={0} max={0.005} step={0.0001} onValueChange={(value) => setRequest((current) => ({ ...current, spentRolling24HoursEth: value[0] }))} aria-label="Amount spent during the rolling 24-hour window" /></div>}

          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => loadPreset(initialPreset)}><RotateCcw /> Reset simulation</Button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><p className="mb-1 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Decision</p><DecisionBadge status={decision.status} /></div>
            <div className="text-right"><p className="font-mono text-xs text-muted-foreground">{demoPolicy.id}</p><p className="mt-1 text-xs text-muted-foreground">{decision.rules.length} rules evaluated</p></div>
          </div>
          <p className="mb-5 max-w-xl text-sm leading-6 text-muted-foreground">{decision.summary}</p>
          <div className="divide-y divide-border rounded-lg border border-grid bg-background/35">
            {decision.rules.map((rule) => <div key={rule.id} className="flex items-start gap-3 px-3 py-2.5"><span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", rule.passed ? "bg-primary/10 text-primary" : "bg-red-50 text-red-700")}>{rule.passed ? <Check className="size-3.5" /> : <CircleX className="size-3.5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><p className="text-sm font-medium">{rule.label}</p><span className="font-mono text-[11px] text-muted-foreground">{rule.id}</span></div>{!compact && <p className="mt-0.5 text-xs text-muted-foreground">{rule.detail}</p>}</div></div>)}
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><ChevronRight className="size-3.5 text-primary" />Decision generated locally by the open-source policy engine.</div>
        </div>
      </CardContent>
    </Card>
  );
}
