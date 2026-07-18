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

type PresetId = "safe-swap" | "human-review" | "oversized" | "unknown-contract" | "stale-price";

const presets: Record<PresetId, { label: string; request: TransactionRequest }> = {
  "safe-swap": {
    label: "Safe swap",
    request: {
      amountUsd: 45,
      token: "USDC",
      target: "Uniswap Router",
      slippageBps: 30,
      oracleAgeSeconds: 12,
      spentTodayUsd: 310,
      marketOpen: true,
    },
  },
  "human-review": {
    label: "Human review",
    request: {
      amountUsd: 150,
      token: "WETH",
      target: "Robinhood Swap",
      slippageBps: 50,
      oracleAgeSeconds: 18,
      spentTodayUsd: 310,
      marketOpen: true,
    },
  },
  oversized: {
    label: "Oversized spend",
    request: {
      amountUsd: 400,
      token: "USDC",
      target: "Uniswap Router",
      slippageBps: 40,
      oracleAgeSeconds: 20,
      spentTodayUsd: 310,
      marketOpen: true,
    },
  },
  "unknown-contract": {
    label: "Unknown contract",
    request: {
      amountUsd: 80,
      token: "USDC",
      target: "Unknown 0x7d…91c",
      slippageBps: 35,
      oracleAgeSeconds: 21,
      spentTodayUsd: 310,
      marketOpen: true,
    },
  },
  "stale-price": {
    label: "Stale price feed",
    request: {
      amountUsd: 65,
      token: "HOOD",
      target: "Robinhood Swap",
      slippageBps: 60,
      oracleAgeSeconds: 180,
      spentTodayUsd: 310,
      marketOpen: true,
    },
  },
};

const initialPreset: PresetId = "safe-swap";

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
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Live policy simulation
            </CardTitle>
            <CardDescription className="mt-1">No wallet or funds required.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">Demo mode</Badge>
            <span className="size-2 animate-pulse rounded-full bg-primary" aria-label="Simulator online" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-0 p-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5 border-b border-grid p-5 sm:p-6 lg:border-r lg:border-b-0">
          <div className="space-y-2">
            <Label htmlFor="scenario">Scenario</Label>
            <Select value={preset} onValueChange={(value) => loadPreset(value as PresetId)}>
              <SelectTrigger id="scenario" className="h-10 w-full bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(presets).map(([id, item]) => (
                  <SelectItem key={id} value={id}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="token">Spend token</Label>
              <Select
                value={request.token}
                onValueChange={(token) => setRequest((current) => ({ ...current, token }))}
              >
                <SelectTrigger id="token" className="h-10 w-full bg-background/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USDC", "WETH", "HOOD", "USDT"].map((token) => (
                    <SelectItem key={token} value={token}>{token}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target</Label>
              <Select
                value={request.target}
                onValueChange={(target) => setRequest((current) => ({ ...current, target }))}
              >
                <SelectTrigger id="target" className="h-10 w-full bg-background/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Uniswap Router", "Robinhood Swap", "Unknown 0x7d…91c"].map((target) => (
                    <SelectItem key={target} value={target}>{target}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Transaction amount</Label>
              <span className="font-mono text-sm text-primary">${request.amountUsd}</span>
            </div>
            <Slider
              value={[request.amountUsd]}
              min={5}
              max={500}
              step={5}
              onValueChange={(value) => setRequest((current) => ({ ...current, amountUsd: value[0] }))}
              aria-label="Transaction amount in US dollars"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$5</span><span>Policy cap: $250</span><span>$500</span>
            </div>
          </div>

          {!compact && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Maximum slippage</Label>
                <span className="font-mono text-sm">{(request.slippageBps / 100).toFixed(2)}%</span>
              </div>
              <Slider
                value={[request.slippageBps]}
                min={10}
                max={300}
                step={10}
                onValueChange={(value) => setRequest((current) => ({ ...current, slippageBps: value[0] }))}
                aria-label="Maximum slippage percentage"
              />
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => loadPreset(initialPreset)}
          >
            <RotateCcw /> Reset simulation
          </Button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Decision</p>
              <DecisionBadge status={decision.status} />
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-muted-foreground">pol_rh_trade_01</p>
              <p className="mt-1 text-xs text-muted-foreground">8 rules evaluated</p>
            </div>
          </div>

          <p className="mb-5 max-w-xl text-sm leading-6 text-muted-foreground">{decision.summary}</p>

          <div className="divide-y divide-border rounded-lg border border-grid bg-background/35">
            {decision.rules.map((rule) => (
              <div key={rule.id} className="flex items-start gap-3 px-3 py-2.5">
                <span className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                  rule.passed ? "bg-primary/10 text-primary" : "bg-red-50 text-red-700",
                )}>
                  {rule.passed ? <Check className="size-3.5" /> : <CircleX className="size-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-sm font-medium">{rule.label}</p>
                    <span className="font-mono text-[11px] text-muted-foreground">{rule.id}</span>
                  </div>
                  {!compact && <p className="mt-0.5 text-xs text-muted-foreground">{rule.detail}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <ChevronRight className="size-3.5 text-primary" />
            Decision generated locally by the open-source policy engine.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
