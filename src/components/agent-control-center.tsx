"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  Copy,
  ExternalLink,
  Fuel,
  KeyRound,
  LoaderCircle,
  Network,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { isAddress, parseEther, type Address, type Hash } from "viem";
import { useConnection, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExperienceMode } from "@/components/experience-mode-provider";
import { usePolicyAccount } from "@/components/policy-account-provider";
import { buildAdminMessage, type AdminAction, type AgentExecution, type AgentStrategy } from "@/lib/agent-types";
import { robinhoodTestnet } from "@/lib/chains";
import { paymentTemplates } from "@/lib/payment-templates";
import { ruleWalletAbi } from "@/lib/rulewallet-contract";

type AgentStatus = {
  signerConfigured: boolean;
  storageConfigured: boolean;
  schedulerConfigured: boolean;
  address?: Address;
  balanceEth?: string;
  roleGranted: boolean;
  error?: string;
};

function shortAddress(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function errorText(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("User rejected")) return "Signature rejected in MetaMask.";
    return error.message.split("\n")[0];
  }
  return "The request could not be completed.";
}

async function responseJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data as T;
}

export function AgentControlCenter() {
  const { mode } = useExperienceMode();
  const pro = mode === "pro";
  const policyAccount = usePolicyAccount();
  const policyAccountAddress = policyAccount.address;
  const connection = useConnection();
  const publicClient = usePublicClient({ chainId: robinhoodTestnet.id });
  const walletClient = useWalletClient({ chainId: robinhoodTestnet.id });
  const switchChain = useSwitchChain();
  const [name, setName] = useState("Daily agent allowance");
  const [target, setTarget] = useState("");
  const [amountEth, setAmountEth] = useState("0.0001");
  const [cadenceHours, setCadenceHours] = useState<24 | 168>(24);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const statusQuery = useQuery({
    queryKey: ["agent-status", policyAccountAddress],
    queryFn: () => fetch(`/api/agent/status?policyAccount=${policyAccountAddress}`, { cache: "no-store" }).then((response) => responseJson<AgentStatus>(response)),
    enabled: Boolean(policyAccountAddress),
  });
  const strategiesQuery = useQuery({
    queryKey: ["agent-strategies", policyAccountAddress],
    queryFn: () => fetch(`/api/agent/strategies?policyAccount=${policyAccountAddress}`, { cache: "no-store" }).then((response) => responseJson<{ strategies: AgentStrategy[] }>(response)),
    enabled: Boolean(policyAccountAddress),
  });
  const activityQuery = useQuery({
    queryKey: ["agent-activity", policyAccountAddress],
    queryFn: () => fetch(`/api/agent/activity?policyAccount=${policyAccountAddress}`, { cache: "no-store" }).then((response) => responseJson<{ executions: AgentExecution[] }>(response)),
    enabled: Boolean(policyAccountAddress),
  });
  const agent = statusQuery.data;
  const strategies = strategiesQuery.data?.strategies ?? [];
  const executions = activityQuery.data?.executions ?? [];
  const queryError = statusQuery.error ?? strategiesQuery.error ?? activityQuery.error;

  async function refresh() {
    await Promise.all([statusQuery.refetch(), strategiesQuery.refetch(), activityQuery.refetch()]);
  }

  async function signAdminAction(payload: AdminAction) {
    if (!walletClient.data || !connection.address || !policyAccountAddress) {
      throw new Error("Connect the RuleWallet admin in MetaMask.");
    }
    const signature = await walletClient.data.signMessage({
      account: connection.address,
      message: buildAdminMessage(payload, policyAccountAddress),
    });
    return { payload, signature };
  }

  async function setAgentRole(grant: boolean) {
    if (!agent?.address || !walletClient.data || !publicClient || !connection.address || !policyAccountAddress) return;
    setBusy(grant ? "grant-role" : "revoke-role");
    setError("");
    try {
      const role = await publicClient.readContract({ address: policyAccountAddress, abi: ruleWalletAbi, functionName: "AGENT_ROLE" });
      const hash = await walletClient.data.writeContract({
        account: connection.address,
        chain: robinhoodTestnet,
        address: policyAccountAddress,
        abi: ruleWalletAbi,
        functionName: grant ? "grantRole" : "revokeRole",
        args: [role, agent.address],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setMessage(grant ? "Dedicated agent role granted onchain." : "Dedicated agent role revoked onchain.");
      await refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy("");
    }
  }

  async function fundAgentGas() {
    if (!agent?.address || !walletClient.data || !publicClient || !connection.address) return;
    setBusy("fund-agent");
    setError("");
    try {
      const hash = await walletClient.data.sendTransaction({
        account: connection.address,
        chain: robinhoodTestnet,
        to: agent.address,
        value: parseEther("0.0001"),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setMessage("Agent gas wallet funded with 0.0001 testnet ETH.");
      await refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy("");
    }
  }

  async function setContractPaused(paused: boolean) {
    if (!walletClient.data || !publicClient || !connection.address || !policyAccountAddress) return;
    setBusy(paused ? "pause-contract" : "unpause-contract");
    setError("");
    try {
      const hash: Hash = await walletClient.data.writeContract({
        account: connection.address,
        chain: robinhoodTestnet,
        address: policyAccountAddress,
        abi: ruleWalletAbi,
        functionName: paused ? "pause" : "unpause",
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setMessage(paused ? "Emergency pause confirmed onchain." : "Policy account unpaused onchain.");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy("");
    }
  }

  async function createStrategy() {
    setBusy("create");
    setError("");
    try {
      const amount = parseEther(amountEth);
      if (amount <= BigInt(0)) throw new Error("Amount must be greater than zero.");
      const resolvedTarget = target || connection.address;
      if (!resolvedTarget || !isAddress(resolvedTarget)) throw new Error("Enter a valid allowlisted target address.");
      const payload: AdminAction = {
        action: "create-strategy",
        policyAccount: policyAccountAddress!,
        name,
        target: resolvedTarget,
        amountEth,
        cadenceHours,
        nonce: crypto.randomUUID(),
        expiresAt: new Date().getTime() + 5 * 60_000,
      };
      const envelope = await signAdminAction(payload);
      await fetch("/api/agent/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      }).then((response) => responseJson(response));
      setMessage("Strategy created. It is eligible for the next protected scheduler run.");
      await refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy("");
    }
  }

  async function setStrategyActive(strategy: AgentStrategy, active: boolean) {
    setBusy(`toggle-${strategy.id}`);
    setError("");
    try {
      const payload: AdminAction = {
        action: "set-strategy-active",
        policyAccount: policyAccountAddress!,
        strategyId: strategy.id,
        active,
        nonce: crypto.randomUUID(),
        expiresAt: new Date().getTime() + 5 * 60_000,
      };
      const envelope = await signAdminAction(payload);
      await fetch(`/api/agent/strategies/${strategy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      }).then((response) => responseJson(response));
      setMessage(active ? "Strategy resumed." : "Strategy paused before its next run.");
      await refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy("");
    }
  }

  async function runNow(strategy: AgentStrategy) {
    setBusy(`run-${strategy.id}`);
    setError("");
    try {
      const payload: AdminAction = {
        action: "run-strategy",
        policyAccount: policyAccountAddress!,
        strategyId: strategy.id,
        nonce: crypto.randomUUID(),
        expiresAt: new Date().getTime() + 5 * 60_000,
      };
      const envelope = await signAdminAction(payload);
      const result = await fetch(`/api/agent/strategies/${strategy.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      }).then((response) => responseJson<{ execution: AgentExecution }>(response));
      setMessage(
        result.execution.status === "confirmed"
          ? "Autonomous testnet execution confirmed."
          : result.execution.reason ?? "Agent execution did not complete.",
      );
      await refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy("");
    }
  }

  if (!connection.isConnected) {
    return <Alert className="border-primary/15 bg-primary/[0.04]"><Bot className="text-primary" /><AlertTitle>Connect the admin wallet</AlertTitle><AlertDescription>Agent setup and strategy mutations require a verifiable admin signature.</AlertDescription></Alert>;
  }

  if (connection.chainId !== robinhoodTestnet.id) {
    return <Button type="button" onClick={() => switchChain.switchChain({ chainId: robinhoodTestnet.id })}><Network /> Switch to chain 46630</Button>;
  }

  if (!policyAccountAddress) {
    return <Alert className="border-amber-500/25 bg-amber-50"><ShieldAlert /><AlertTitle>Select a policy account first</AlertTitle><AlertDescription>Deploy a personal testnet account or select an existing account before configuring its dedicated agent.</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
      <Alert className="border-primary/20 bg-primary/[0.04]">
        <ShieldCheck className="text-primary" />
        <AlertTitle>{policyAccount.source === "personal" ? "Personal policy account selected" : "Public demo policy account selected"}</AlertTitle>
        <AlertDescription className="break-all font-mono text-xs">{policyAccountAddress}</AlertDescription>
      </Alert>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Signer", agent?.signerConfigured ? "Configured" : "Missing"],
          ["Agent role", agent?.roleGranted ? "Granted" : "Not granted"],
          ["Storage", agent?.storageConfigured ? "Connected" : "Missing"],
          ["Scheduler", agent?.schedulerConfigured ? "Daily · 09:00 UTC" : "Missing"],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-primary/10 bg-card/70 p-4"><p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{label}</p><p className="mt-2 text-sm font-medium text-primary">{value}</p></div>)}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="size-4 text-primary" /> Dedicated agent signer</CardTitle><CardDescription>The private key is server-only. This page receives only its public address and status.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {agent?.address ? <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-grid bg-background/45 p-4"><div><p className="font-mono text-sm">{shortAddress(agent.address)}</p><p className="mt-1 text-xs text-muted-foreground">Gas balance: {agent.balanceEth ?? "0"} testnet ETH</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(agent.address ?? "")}><Copy /> Copy</Button><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={fundAgentGas}>{busy === "fund-agent" ? <LoaderCircle className="animate-spin" /> : <Fuel />} Fund gas · 0.0001 ETH</Button><Button type="button" disabled={Boolean(busy)} variant={agent.roleGranted ? "destructive" : "default"} onClick={() => setAgentRole(!agent.roleGranted)}>{busy.includes("role") ? <LoaderCircle className="animate-spin" /> : agent.roleGranted ? <ShieldAlert /> : <ShieldCheck />}{agent.roleGranted ? "Revoke agent" : "Grant AGENT_ROLE"}</Button></div></div> : <Alert className="border-amber-300/20 bg-amber-300/[0.04]"><ShieldAlert /><AlertTitle>Signer pending</AlertTitle><AlertDescription>The production agent secret has not been configured yet.</AlertDescription></Alert>}
          <div className="flex flex-wrap gap-2 border-t border-grid pt-4"><Button type="button" variant="destructive" disabled={Boolean(busy)} onClick={() => setContractPaused(true)}><CirclePause /> Emergency pause contract</Button><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => setContractPaused(false)}><CirclePlay /> Unpause contract</Button><Button type="button" variant="ghost" onClick={refresh}><RefreshCw /> Refresh</Button></div>
        </CardContent>
      </Card>

      <Card className="launch-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> {pro ? "Strategy presets" : "Start from a payment template"}</CardTitle>
          <CardDescription>{pro ? "Prefill a bounded fixed-transfer strategy. Recipient trust and all onchain limits are still revalidated." : "Choose a familiar use case, then add a recipient you already verified. Templates never bypass your rules."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {paymentTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="rounded-xl border border-grid bg-background/55 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => {
                setName(template.name);
                setAmountEth(template.amountEth);
                setCadenceHours(template.cadenceHours);
                setMessage(`${template.name} template loaded. Add an allowlisted recipient and review the amount.`);
              }}
            >
              <div className="flex items-center justify-between gap-3"><span className="font-medium">{template.name}</span><Badge variant="secondary">{template.cadenceHours === 24 ? "Daily" : "Weekly"}</Badge></div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{pro ? template.proDescription : template.simpleDescription}</p>
              <p className="mt-3 font-mono text-xs text-primary">{template.amountEth} testnet ETH</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{pro ? "Create recurring transfer" : "Schedule a repeated payment"}</CardTitle><CardDescription>{pro ? "Direct testnet ETH only. Targets must already be allowlisted and amounts must remain at or below the human-approval threshold." : "RuleWallet sends only the exact test amount on the schedule you choose. The recipient and amount still have to pass every rule."}</CardDescription></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="strategy-name">Strategy name</Label><Input id="strategy-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="strategy-target">Allowlisted target</Label><Input id="strategy-target" className="font-mono" value={target} placeholder={connection.address ?? "0x…"} onChange={(event) => setTarget(event.target.value)} /><p className="text-[11px] text-muted-foreground">Leave empty to use the connected admin address.</p></div>
          <div className="space-y-2"><Label htmlFor="strategy-amount">Amount in testnet ETH</Label><Input id="strategy-amount" inputMode="decimal" value={amountEth} onChange={(event) => setAmountEth(event.target.value)} /></div>
          <div className="space-y-2"><Label>Cadence</Label><Select value={String(cadenceHours)} onValueChange={(value) => setCadenceHours(Number(value) as 24 | 168)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="24">Daily</SelectItem><SelectItem value="168">Weekly</SelectItem></SelectContent></Select></div>
          <div className="sm:col-span-2"><Button type="button" disabled={Boolean(busy) || !agent?.storageConfigured} onClick={createStrategy}>{busy === "create" ? <LoaderCircle className="animate-spin" /> : <Bot />} Sign and create strategy</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Strategies</CardTitle><CardDescription>Every mutation uses a short-lived, single-use admin signature.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {strategies.length === 0 ? <p className="rounded-xl border border-dashed border-grid p-6 text-center text-sm text-muted-foreground">No recurring strategies yet.</p> : strategies.map((strategy) => <div key={strategy.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-grid p-4"><div><div className="flex items-center gap-2"><p className="font-medium">{strategy.name}</p><Badge variant="outline" className={strategy.active ? "text-primary" : "text-muted-foreground"}>{strategy.active ? "Active" : "Paused"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{strategy.amountEth} ETH → {shortAddress(strategy.target)} · every {strategy.cadenceHours === 24 ? "day" : "week"}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">Next: {new Date(strategy.nextRunAt).toLocaleString()}</p></div><div className="flex gap-2"><Button type="button" variant="outline" disabled={Boolean(busy) || !strategy.active} onClick={() => runNow(strategy)}>{busy === `run-${strategy.id}` ? <LoaderCircle className="animate-spin" /> : <Play />} Run now</Button><Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => setStrategyActive(strategy, !strategy.active)}>{busy === `toggle-${strategy.id}` ? <LoaderCircle className="animate-spin" /> : strategy.active ? <CirclePause /> : <CirclePlay />}{strategy.active ? "Pause" : "Resume"}</Button></div></div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Latest public receipts</CardTitle><CardDescription>Confirmed and blocked automation attempts are visible without connecting a wallet.</CardDescription></CardHeader>
        <CardContent className="space-y-3">{executions.slice(0, 8).map((execution) => <div key={execution.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-grid pb-3 last:border-0"><div><p className="text-sm font-medium">{execution.strategyName}</p><p className="mt-1 text-xs text-muted-foreground">{execution.amountEth} ETH · {execution.trigger} · {execution.reason ?? "Policy checks passed"}</p></div><div className="flex items-center gap-2"><Badge variant="outline" className={execution.status === "confirmed" ? "text-primary" : "text-amber-800"}>{execution.status}</Badge>{execution.transactionHash && <Button asChild variant="ghost" size="icon"><a href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${execution.transactionHash}`} target="_blank" rel="noreferrer" aria-label="Open receipt"><ExternalLink /></a></Button>}</div></div>)}</CardContent>
      </Card>

      {message && <Alert className="border-primary/20 bg-primary/[0.04]"><CheckCircle2 className="text-primary" /><AlertTitle>Updated</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
      {(error || queryError) && <Alert variant="destructive"><ShieldAlert /><AlertTitle>Action failed</AlertTitle><AlertDescription>{error || errorText(queryError)}</AlertDescription></Alert>}
    </div>
  );
}
