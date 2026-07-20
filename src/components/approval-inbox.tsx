"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, ExternalLink, FileCheck2, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { useAccount, useChainId, useSignMessage, useSignTypedData, useSwitchChain } from "wagmi";
import { buildCommerceApprovalTypedData } from "@/lib/commerce-auth";
import type { ApprovalRequest } from "@/lib/commerce-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ApprovalListResponse = {
  approvals: ApprovalRequest[];
  configured: boolean;
  capturedAt: string;
  error?: string;
};

type CommerceSessionResponse = {
  authenticated: boolean;
  address?: string;
  message?: string;
  error?: string;
};

function formatAmount(approval: ApprovalRequest) {
  const decimals = approval.quote.asset === "USDG" ? 6 : 18;
  const padded = approval.quote.amountMinor.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "").slice(0, 4);
  return `${whole}${fraction ? `.${fraction}` : ""} ${approval.quote.asset}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Approval failed.";
}

export function ApprovalInbox() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();
  const queryClient = useQueryClient();
  const [sessionOwner, setSessionOwner] = useState<string>();
  const sessionUnlocked = Boolean(address && sessionOwner?.toLowerCase() === address.toLowerCase());

  const unlockMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Connect the owner wallet first.");
      const challengeResponse = await fetch(`/api/commerce/session?address=${address}`);
      const challenge = (await challengeResponse.json()) as CommerceSessionResponse;
      if (!challengeResponse.ok) throw new Error(challenge.error ?? "Could not create a commerce login challenge.");
      if (!challenge.authenticated) {
        if (!challenge.message) throw new Error("The commerce login challenge was incomplete.");
        const signature = await signMessageAsync({ message: challenge.message });
        const loginResponse = await fetch("/api/commerce/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, message: challenge.message, signature }),
        });
        const login = (await loginResponse.json()) as CommerceSessionResponse;
        if (!loginResponse.ok) throw new Error(login.error ?? "Commerce login failed.");
      }
      return address;
    },
    onSuccess: (owner) => setSessionOwner(owner),
  });

  const query = useQuery({
    queryKey: ["commerce-approvals", address],
    enabled: sessionUnlocked,
    queryFn: async () => {
      const response = await fetch(`/api/commerce/approvals?owner=${address}`);
      const data = (await response.json()) as ApprovalListResponse;
      if (!response.ok) throw new Error(data.error ?? "Could not load approvals.");
      return data;
    },
    refetchInterval: 15_000,
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ approval, decision }: { approval: ApprovalRequest; decision: "approve" | "reject" }) => {
      let selectedChain = chainId;
      if (selectedChain !== approval.chainId) {
        const switched = await switchChainAsync({ chainId: approval.chainId });
        selectedChain = switched.id;
      }
      const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;
      const typedData = buildCommerceApprovalTypedData(
        approval,
        { decision, expiresAt },
        selectedChain as 4663 | 46630,
      );
      const signature = await signTypedDataAsync(typedData);
      const response = await fetch("/api/commerce/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: approval.id,
          chainId: selectedChain,
          decision: {
            decision,
            approver: address,
            nonce: approval.nonce,
            expiresAt,
            signature,
          },
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Approval could not be recorded.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["commerce-approvals", address] });
    },
  });

  const approvals = query.data?.approvals ?? [];
  const capturedAt = Date.parse(query.data?.capturedAt ?? "1970-01-01T00:00:00.000Z");
  const pending = approvals.filter(
    (approval) => approval.status === "pending" && Date.parse(approval.expiresAt) > capturedAt,
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Badge variant="outline" className="border-primary/25 text-primary"><FileCheck2 /> Approval Inbox</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">Review exact purchase requests.</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            Every decision is short-lived, single-purpose EIP-712 data. Approving never overrides a failed hard policy and never sends a payment by itself.
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/command">Back to Command Center</Link></Button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          ["Pending", pending.length],
          ["Decided", approvals.filter((item) => item.status === "approved" || item.status === "rejected").length],
          ["Owner", address ? `${address.slice(0, 7)}…${address.slice(-5)}` : "Not connected"],
        ].map(([label, value]) => (
          <Card key={String(label)}><CardContent className="pt-5"><p className="text-xs text-muted-foreground">{String(label)}</p><p className="mt-2 text-xl font-semibold">{String(value)}</p></CardContent></Card>
        ))}
      </div>

      {!isConnected ? (
        <Alert className="mt-6"><ShieldAlert /><AlertTitle>Connect the account owner</AlertTitle><AlertDescription>The inbox is filtered to the connected public address. RuleWallet never asks for the private key.</AlertDescription></Alert>
      ) : null}
      {isConnected && !sessionUnlocked ? (
        <Card className="mt-6 border-primary/25">
          <CardHeader><CardTitle>Unlock your private approval inbox</CardTitle><CardDescription>Sign one short-lived login message. It cannot move funds and prevents other people from reading shopping details associated with your public address.</CardDescription></CardHeader>
          <CardContent><Button onClick={() => unlockMutation.mutate()} disabled={unlockMutation.isPending}>{unlockMutation.isPending ? <LoaderCircle className="animate-spin" /> : <ShieldAlert />} Sign to unlock</Button></CardContent>
        </Card>
      ) : null}
      {unlockMutation.error ? (
        <Alert variant="destructive" className="mt-6"><X /><AlertTitle>Inbox login failed</AlertTitle><AlertDescription>{errorMessage(unlockMutation.error)}</AlertDescription></Alert>
      ) : null}
      {isConnected && query.data && !query.data.configured ? (
        <Alert className="mt-6"><ShieldAlert /><AlertTitle>Durable storage is missing</AlertTitle><AlertDescription>Connect Upstash Redis before approvals can be safely queued.</AlertDescription></Alert>
      ) : null}
      {query.error ? (
        <Alert variant="destructive" className="mt-6"><X /><AlertTitle>Inbox unavailable</AlertTitle><AlertDescription>{errorMessage(query.error)}</AlertDescription></Alert>
      ) : null}
      {decisionMutation.error ? (
        <Alert variant="destructive" className="mt-6"><X /><AlertTitle>Decision not recorded</AlertTitle><AlertDescription>{errorMessage(decisionMutation.error)}</AlertDescription></Alert>
      ) : null}

      <section className="mt-8 space-y-4">
        {query.isPending && sessionUnlocked ? <p className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading exact requests…</p> : null}
        {!query.isPending && sessionUnlocked && pending.length === 0 ? (
          <Card className="border-dashed"><CardHeader><CardTitle>Nothing needs approval</CardTitle><CardDescription>Requests below trusted limits can proceed through their configured execution gate. Blocked requests never appear here as approvable.</CardDescription></CardHeader></Card>
        ) : null}
        {pending.map((approval) => (
          <Card key={approval.id} className="border-primary/25">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{approval.quote.category}</Badge><Badge variant="outline" className="text-amber-800">Expires {new Date(approval.expiresAt).toLocaleTimeString()}</Badge></div>
                  <CardTitle className="mt-3">{approval.quote.summary}</CardTitle>
                  <CardDescription className="mt-2">{approval.reason}</CardDescription>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-5 py-4 text-right"><p className="text-xs text-muted-foreground">Exact amount</p><p className="mt-1 text-2xl font-semibold">{formatAmount(approval)}</p></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Merchant</p><p className="mt-1 font-medium">{approval.quote.merchantName}</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Policy account</p><p className="mt-1 font-mono text-xs">{approval.account.slice(0, 10)}…{approval.account.slice(-6)}</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Payment status</p><p className="mt-1 font-medium">Not sent</p></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => decisionMutation.mutate({ approval, decision: "approve" })} disabled={decisionMutation.isPending}><Check /> Approve this request</Button>
                <Button variant="destructive" onClick={() => decisionMutation.mutate({ approval, decision: "reject" })} disabled={decisionMutation.isPending}><X /> Reject</Button>
                <Button asChild variant="outline"><Link href="/app/policies/new">Change merchant limits <ExternalLink /></Link></Button>
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3" /> The signed decision expires after five minutes and cannot be reused for another order, chain, or account.</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
