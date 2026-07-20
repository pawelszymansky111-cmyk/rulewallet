"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  BellRing,
  CircleCheck,
  CircleX,
  ExternalLink,
  LoaderCircle,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  Webhook,
} from "lucide-react";
import { useExperienceMode } from "@/components/experience-mode-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationStatus = {
  configured: boolean;
  adapter: "authenticated-webhook" | "disabled";
  topics: string[];
  destinations: string[];
  message: string;
};

async function getNotificationStatus() {
  const response = await fetch("/api/agent/notifications/status", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Notification status is unavailable.");
  return data as NotificationStatus;
}

const topics = [
  ["Execution confirmed", "A scheduled transfer reached the chain and produced a receipt."],
  ["Approval required", "A transfer crossed the configured human-review threshold."],
  ["Execution failed", "RPC, signer, simulation, or confirmation did not complete."],
  ["Unusual request stopped", "A limit, role, recipient, pause, or balance rule blocked execution."],
] as const;

export function NotificationCenter() {
  const { mode } = useExperienceMode();
  const pro = mode === "pro";
  const statusQuery = useQuery({
    queryKey: ["notification-status"],
    queryFn: getNotificationStatus,
  });

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6"><Link href="/app"><ArrowLeft /> Back to dashboard</Link></Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Console / notifications</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight"><BellRing className="size-7 text-primary" /> {pro ? "Notification delivery" : "Know when something happens"}</h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            {pro
              ? "RuleWallet emits a versioned event envelope to an authenticated HTTPS adapter after durable execution recording. Delivery cannot change policy or transaction state."
              : "RuleWallet records every result first, then can send a signed-integration alert to email, Telegram, Slack, or your incident tool. Alerts never get permission to move funds."}
          </p>
        </div>
        {statusQuery.data && <Badge variant="outline" className={statusQuery.data.configured ? "border-primary/25 bg-primary/5 text-primary" : "border-amber-500/25 bg-amber-50 text-amber-800"}>{statusQuery.data.configured ? <CircleCheck /> : <CircleX />}{statusQuery.data.configured ? "External delivery ready" : "External delivery off"}</Badge>}
      </div>

      {statusQuery.error && (
        <Alert variant="destructive" className="mt-8"><ShieldAlert /><AlertTitle>Could not read notification status</AlertTitle><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{statusQuery.error.message}</span><Button type="button" variant="outline" size="sm" onClick={() => statusQuery.refetch()}><RefreshCw /> Retry</Button></AlertDescription></Alert>
      )}

      {!statusQuery.data && !statusQuery.error && (
        <Card className="mt-8"><CardContent className="flex min-h-40 items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin text-primary" /> Checking delivery configuration…</CardContent></Card>
      )}

      {statusQuery.data && (
        <div className="mt-8 space-y-6">
          <Alert className={statusQuery.data.configured ? "border-primary/25 bg-primary/[0.055]" : "border-amber-500/25 bg-amber-50"}>
            {statusQuery.data.configured ? <CircleCheck className="text-primary" /> : <ShieldAlert className="text-amber-700" />}
            <AlertTitle>{statusQuery.data.configured ? "Authenticated delivery is configured" : "In-app receipts are active; external alerts need setup"}</AlertTitle>
            <AlertDescription>{statusQuery.data.message}</AlertDescription>
          </Alert>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="launch-card">
              <CardHeader><CardTitle>Event coverage</CardTitle><CardDescription>Stable topics that downstream adapters can route independently.</CardDescription></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {topics.map(([title, text]) => (
                  <div key={title} className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
                    <CircleCheck className="size-4 text-primary" />
                    <p className="mt-3 text-sm font-medium">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="launch-card">
              <CardHeader><CardTitle>Delivery destinations</CardTitle><CardDescription>Connect one secure server-side webhook to the provider you already use.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {[
                  [Mail, "Email"],
                  [MessageCircle, "Telegram or Slack"],
                  [Webhook, "Incident webhook"],
                ].map(([Icon, label]) => (
                  <div key={label as string} className="flex items-center justify-between rounded-xl border border-grid p-4">
                    <span className="flex items-center gap-3 text-sm font-medium"><Icon className="size-4 text-primary" />{label as string}</span>
                    <Badge variant="secondary">Via adapter</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="launch-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Webhook className="size-5 text-primary" /> Secure setup boundary</CardTitle><CardDescription>No webhook URL, bearer token, or signing key is ever returned to the browser.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-3">
              <div><p className="font-medium">1. Choose a destination</p><p className="mt-2 leading-6 text-muted-foreground">Use an HTTPS endpoint that can route the typed event to your preferred channel.</p></div>
              <div><p className="font-medium">2. Add server secrets</p><p className="mt-2 leading-6 text-muted-foreground">Configure the URL, a 16+ character bearer token, and a separate 32-byte HMAC key in Vercel—not in client code.</p></div>
              <div><p className="font-medium">3. Verify and test</p><p className="mt-2 leading-6 text-muted-foreground">Reject stale or duplicate delivery IDs, verify the raw-body signature, then test with a blocked testnet request.</p></div>
              <div className="md:col-span-3 flex flex-wrap gap-2 border-t border-grid pt-4">
                <Button asChild variant="outline"><Link href="/activity"><Activity /> View receipt history</Link></Button>
                <Button asChild variant="ghost"><Link href="/docs#notifications">Configuration guide</Link></Button>
                <Button asChild variant="ghost"><a href="https://github.com/pawelszymansky111-cmyk/rulewallet" target="_blank" rel="noreferrer">Source repository <ExternalLink /></a></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
