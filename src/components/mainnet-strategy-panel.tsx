"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, LoaderCircle, RefreshCw, ShieldX, Wallet } from "lucide-react";
import {
  encodeFunctionData,
  getAddress,
  hashTypedData,
  isAddress,
  zeroAddress,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { useConnection, usePublicClient, useWalletClient } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { robinhoodMainnet } from "@/lib/chains";
import type { MainnetAgentExecution, PublicMainnetAgentStrategy } from "@/lib/mainnet-agent-types";
import { strategyTypes } from "@/lib/mainnet-agent-types";
import {
  ROBINHOOD_MAINNET_USDG,
  formatMainnetAssetUnits,
  parseMainnetAssetUnits,
  ruleWalletV2Abi,
} from "@/lib/mainnet-registry";

type StrategyPreview = {
  body: {
    name: string;
    owner: Address;
    account: Address;
    asset: Address;
    recipient: Address;
    amount: string;
    nonce: string;
    expiry: string;
    intervalSeconds: number;
    maxExecutions: number;
  };
  typedData: {
    domain: { name: string; version: string; chainId: 4663; verifyingContract: Address };
    types: typeof strategyTypes;
    primaryType: "Strategy";
    message: {
      chainId: bigint; account: Address; asset: Address; recipient: Address; amount: bigint;
      nonce: bigint; expiry: bigint; intervalSeconds: number; maxExecutions: number;
    };
  };
  digest: Hash;
};

function readableError(error: unknown) {
  if (error instanceof Error) return error.message.split("\n")[0].slice(0, 300);
  return "Strategy operation failed.";
}

function short(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export function MainnetStrategyPanel() {
  const connection = useConnection();
  const publicClient = usePublicClient({ chainId: robinhoodMainnet.id });
  const walletClient = useWalletClient({ chainId: robinhoodMainnet.id });
  const [account, setAccount] = useState("");
  const [name, setName] = useState("Bounded daily transfer");
  const [asset, setAsset] = useState<"ETH" | "USDG">("ETH");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [nonce, setNonce] = useState("1");
  const [expiryDays, setExpiryDays] = useState("30");
  const [intervalHours, setIntervalHours] = useState("24");
  const [maxExecutions, setMaxExecutions] = useState("30");
  const [preview, setPreview] = useState<StrategyPreview>();
  const [revokePreview, setRevokePreview] = useState<{ strategy: PublicMainnetAgentStrategy; digest: Hash; data: Hex }>();
  const [strategies, setStrategies] = useState<PublicMainnetAgentStrategy[]>([]);
  const [executions, setExecutions] = useState<MainnetAgentExecution[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastHash, setLastHash] = useState<Hash>();
  const [autonomyEnabled, setAutonomyEnabled] = useState(false);

  const storageKey = useMemo(
    () => connection.address ? `rulewallet:policy-account:v2:4663:${connection.address.toLowerCase()}` : undefined,
    [connection.address],
  );
  const explorer = robinhoodMainnet.blockExplorers.default.url;

  const refresh = useCallback(async () => {
    const statusResponse = await fetch("/api/mainnet/status", { cache: "no-store" });
    const status = statusResponse.ok ? await statusResponse.json() as { autonomyEnabled?: boolean } : undefined;
    setAutonomyEnabled(status?.autonomyEnabled === true);
    if (!status?.autonomyEnabled) {
      setStrategies([]);
      setExecutions([]);
      return;
    }
    const [strategyResponse, activityResponse] = await Promise.all([
      fetch("/api/mainnet/strategies", { cache: "no-store" }),
      fetch("/api/mainnet/activity", { cache: "no-store" }),
    ]);
    if (strategyResponse.ok) setStrategies((await strategyResponse.json()).strategies ?? []);
    if (activityResponse.ok) setExecutions((await activityResponse.json()).executions ?? []);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (storageKey && !account) {
        const saved = window.localStorage.getItem(storageKey);
        if (saved && isAddress(saved)) setAccount(getAddress(saved));
      }
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [account, refresh, storageKey]);

  function prepareStrategy() {
    setError(""); setMessage(""); setPreview(undefined);
    try {
      if (!connection.address || connection.chainId !== 4663) throw new Error("Connect the owner wallet on Robinhood Chain mainnet.");
      if (!isAddress(account) || !isAddress(recipient)) throw new Error("Enter valid V2 account and recipient addresses.");
      const amountUnits = parseMainnetAssetUnits(amount, asset);
      const nonceValue = BigInt(nonce);
      const days = Number(expiryDays);
      const interval = Number(intervalHours) * 3600;
      const executionsLimit = Number(maxExecutions);
      if (amountUnits <= 0 || nonceValue < 0 || !Number.isInteger(days) || days < 1 || !Number.isInteger(interval) || interval < 300 || !Number.isInteger(executionsLimit) || executionsLimit < 1) {
        throw new Error("Use positive amount, expiry, interval, and execution values.");
      }
      const body = {
        name,
        owner: getAddress(connection.address),
        account: getAddress(account),
        asset: asset === "ETH" ? zeroAddress : ROBINHOOD_MAINNET_USDG,
        recipient: getAddress(recipient),
        amount: amountUnits.toString(),
        nonce: nonceValue.toString(),
        expiry: BigInt(Math.floor(Date.now() / 1000) + days * 86400).toString(),
        intervalSeconds: interval,
        maxExecutions: executionsLimit,
      } as const;
      const typedData = {
        domain: { name: "RuleWallet", version: "2", chainId: 4663 as const, verifyingContract: body.account },
        types: strategyTypes,
        primaryType: "Strategy" as const,
        message: {
          chainId: BigInt(4663), account: body.account, asset: body.asset, recipient: body.recipient,
          amount: BigInt(body.amount), nonce: BigInt(body.nonce), expiry: BigInt(body.expiry),
          intervalSeconds: body.intervalSeconds, maxExecutions: body.maxExecutions,
        },
      };
      setPreview({ body, typedData, digest: hashTypedData(typedData) });
      setMessage("Typed-data preview prepared. Signing authorizes only this exact strategy, still subject to every onchain policy.");
    } catch (caught) { setError(readableError(caught)); }
  }

  async function signAndStore() {
    if (!preview || !walletClient.data || !connection.address) return;
    setBusy("sign"); setError(""); setMessage("Review the EIP-712 authorization in your wallet.");
    try {
      if (!autonomyEnabled) throw new Error("Mainnet strategy storage and execution are disabled in this manual-only release.");
      const signature = await walletClient.data.signTypedData({ account: connection.address, ...preview.typedData });
      const response = await fetch("/api/mainnet/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...preview.body, signature }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Strategy storage rejected the signature.");
      setMessage("Owner signature verified and strategy stored. Execution remains disabled unless the secure signer and autonomy gates are configured.");
      setPreview(undefined);
      setNonce((current) => (BigInt(current) + BigInt(1)).toString());
      await refresh();
    } catch (caught) { setError(readableError(caught)); } finally { setBusy(""); }
  }

  async function prepareRevoke(strategy: PublicMainnetAgentStrategy) {
    setBusy("revoke-preview"); setError("");
    try {
      if (!connection.address || !publicClient || connection.chainId !== 4663) throw new Error("Connect an owner wallet on chain 4663.");
      const typedData = {
        domain: { name: "RuleWallet", version: "2", chainId: 4663 as const, verifyingContract: strategy.account },
        types: strategyTypes,
        primaryType: "Strategy" as const,
        message: {
          chainId: BigInt(4663), account: strategy.account, asset: strategy.asset,
          recipient: strategy.recipient, amount: BigInt(strategy.amount), nonce: BigInt(strategy.nonce),
          expiry: BigInt(strategy.expiry), intervalSeconds: strategy.intervalSeconds, maxExecutions: strategy.maxExecutions,
        },
      };
      const digest = hashTypedData(typedData);
      await publicClient.simulateContract({ account: connection.address, address: strategy.account, abi: ruleWalletV2Abi, functionName: "revokeStrategy", args: [digest] });
      setRevokePreview({ strategy, digest, data: encodeFunctionData({ abi: ruleWalletV2Abi, functionName: "revokeStrategy", args: [digest] }) });
      setMessage("Revocation simulation passed. No transaction has been sent.");
    } catch (caught) { setError(readableError(caught)); } finally { setBusy(""); }
  }

  async function signRevoke() {
    if (!revokePreview || !walletClient.data || !publicClient || !connection.address) return;
    setBusy("revoke"); setError("");
    try {
      const hash = await walletClient.data.sendTransaction({ account: connection.address, chain: robinhoodMainnet, to: revokePreview.strategy.account, value: BigInt(0), data: revokePreview.data });
      setLastHash(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
      if (receipt.status !== "success") throw new Error("Revocation reverted.");
      setMessage("Strategy revoked onchain. The backend cannot override this state.");
      setRevokePreview(undefined);
    } catch (caught) { setError(readableError(caught)); } finally { setBusy(""); }
  }

  return (
    <div className="space-y-6">
      <Alert className="border-amber-500/30 bg-amber-50 text-amber-950"><ShieldX /><AlertTitle>Authorization preview only</AlertTitle><AlertDescription>Strategy data can be inspected and owner-signed, but this release cannot run autonomous mainnet transfers. The compile-time release gate remains disabled.</AlertDescription></Alert>
      <Card>
        <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><KeyRound className="size-4 text-primary" /> EIP-712 scheduled strategy</CardTitle><CardDescription className="mt-1">An owner signature authorizes an exact recurring transfer. It never changes policy and cannot bypass limits, recipients, approvals, pause, expiry, or execution caps.</CardDescription></div><Button variant="outline" size="sm" onClick={refresh}><RefreshCw /> Refresh</Button></div></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2"><div><Label>Strategy name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div><div><Label>V2 account</Label><Input value={account} onChange={(event) => setAccount(event.target.value)} className="font-mono" placeholder="0x…" /></div><div><Label>Trusted recipient</Label><Input value={recipient} onChange={(event) => setRecipient(event.target.value)} className="font-mono" placeholder="0x…" /></div><div><Label>Exact amount per execution</Label><div className="flex gap-2"><Input value={amount} onChange={(event) => setAmount(event.target.value)} /><Button variant={asset === "ETH" ? "default" : "outline"} onClick={() => setAsset("ETH")}>ETH</Button><Button variant={asset === "USDG" ? "default" : "outline"} onClick={() => setAsset("USDG")}>USDG</Button></div></div></div>
          <div className="grid gap-3 sm:grid-cols-4"><div><Label>Owner nonce</Label><Input value={nonce} onChange={(event) => setNonce(event.target.value)} /></div><div><Label>Expiry (days)</Label><Input value={expiryDays} onChange={(event) => setExpiryDays(event.target.value)} /></div><div><Label>Interval (hours)</Label><Input value={intervalHours} onChange={(event) => setIntervalHours(event.target.value)} /></div><div><Label>Max executions</Label><Input value={maxExecutions} onChange={(event) => setMaxExecutions(event.target.value)} /></div></div>
          <Button onClick={prepareStrategy}><ShieldX /> Preview exact authorization</Button>
        </CardContent>
      </Card>

      {preview && <Card className="border-primary/25"><CardHeader><CardTitle>Exact EIP-712 preview</CardTitle><CardDescription>This preview grants no authority by itself. Strategy signing and storage remain disabled while the mainnet autonomy release gate is closed.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="overflow-hidden rounded-xl border border-grid font-mono text-xs">{[["Chain", "Robinhood Chain mainnet · 4663"], ["Account", preview.body.account], ["Asset", preview.body.asset], ["Recipient", preview.body.recipient], ["Amount", `${formatMainnetAssetUnits(BigInt(preview.body.amount), asset)} ${asset}`], ["Nonce", preview.body.nonce], ["Expiry", new Date(Number(preview.body.expiry) * 1000).toISOString()], ["Interval", `${preview.body.intervalSeconds}s`], ["Executions", String(preview.body.maxExecutions)], ["Digest", preview.digest]].map(([key, value]) => <div key={key} className="grid gap-1 border-b border-grid px-4 py-3 last:border-0 sm:grid-cols-[150px_1fr]"><span className="text-muted-foreground">{key}</span><span className="break-all">{value}</span></div>)}</div><div className="flex gap-2"><Button onClick={signAndStore} disabled={!autonomyEnabled || busy === "sign"}>{busy === "sign" ? <LoaderCircle className="animate-spin" /> : <Wallet />} Signing disabled in preview</Button><Button variant="outline" onClick={() => setPreview(undefined)}>Cancel</Button></div></CardContent></Card>}

      {revokePreview && <Card className="border-red-400/25"><CardHeader><CardTitle>Exact revocation transaction</CardTitle><CardDescription>Chain 4663 · contract {revokePreview.strategy.account} · value 0 ETH</CardDescription></CardHeader><CardContent className="space-y-3"><p className="break-all font-mono text-xs">Digest: {revokePreview.digest}</p><p className="break-all font-mono text-xs">Calldata: {revokePreview.data}</p><p className="text-sm text-muted-foreground">Expected result: this strategy digest becomes permanently revoked onchain.</p><div className="flex gap-2"><Button variant="destructive" onClick={signRevoke} disabled={busy === "revoke"}>{busy === "revoke" ? <LoaderCircle className="animate-spin" /> : <Wallet />} Sign revocation</Button><Button variant="outline" onClick={() => setRevokePreview(undefined)}>Cancel</Button></div></CardContent></Card>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Stored strategies</CardTitle><CardDescription>Signatures are server-side; public output excludes them.</CardDescription></CardHeader><CardContent className="space-y-3">{strategies.length === 0 ? <p className="text-sm text-muted-foreground">No mainnet strategies stored, or durable storage is not configured.</p> : strategies.map((strategy) => <div key={strategy.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-grid p-3"><div><p className="text-sm font-medium">{strategy.name} <Badge variant="outline">{strategy.active ? "Active" : "Inactive"}</Badge></p><p className="mt-1 text-xs text-muted-foreground">{formatMainnetAssetUnits(BigInt(strategy.amount), strategy.asset === ROBINHOOD_MAINNET_USDG ? "USDG" : "ETH")} · {short(strategy.recipient)} · next {new Date(strategy.nextRunAt).toLocaleString()}</p></div><Button variant="outline" size="sm" onClick={() => prepareRevoke(strategy)}>Revoke onchain</Button></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Public mainnet receipts</CardTitle><CardDescription>Confirmed, blocked, and failed execution attempts.</CardDescription></CardHeader><CardContent className="space-y-3">{executions.length === 0 ? <p className="text-sm text-muted-foreground">No mainnet execution receipts yet.</p> : executions.slice(0, 10).map((execution) => <div key={execution.id} className="flex items-center justify-between gap-3 rounded-lg border border-grid p-3"><div><p className="flex items-center gap-2 text-sm font-medium">{execution.status === "confirmed" && <CheckCircle2 className="size-4 text-primary" />}{execution.strategyName}</p><p className="mt-1 text-xs text-muted-foreground">{execution.reason ?? execution.status}</p></div>{execution.transactionHash && <Button asChild variant="ghost" size="icon"><a href={`${explorer}/tx/${execution.transactionHash}`} target="_blank" rel="noreferrer" aria-label="Open receipt"><ExternalLink /></a></Button>}</div>)}</CardContent></Card>
      </div>

      {(message || error) && <Alert className={error ? "border-red-400/25 bg-red-400/[0.04]" : "border-primary/20 bg-primary/[0.04]"}><AlertTitle>{error ? "Strategy blocked" : "Strategy status"}</AlertTitle><AlertDescription>{error || message}</AlertDescription>{lastHash && <a href={`${explorer}/tx/${lastHash}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary">Blockscout receipt <ExternalLink className="size-3" /></a>}</Alert>}
    </div>
  );
}
