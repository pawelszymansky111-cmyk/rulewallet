"use client";

import accountArtifact from "@/generated/rulewallet-policy-account-v3.json";
import { AlertTriangle, Check, ExternalLink, LoaderCircle, Play, Search, Wallet, X } from "lucide-react";
import { useState } from "react";
import {
  encodeFunctionData,
  formatUnits,
  getAddress,
  isAddress,
  zeroAddress,
  type Abi,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { robinhoodMainnet, robinhoodTestnet } from "@/lib/chains";
import { ROBINHOOD_MAINNET_USDG } from "@/lib/mainnet-registry";
import {
  mainnetFactoryV3Address,
  ruleWalletFactoryV3Abi,
  testnetFactoryV3Address,
  testnetV3StablecoinAddress,
  verifyFactoryV3,
} from "@/lib/v3-factory";

const accountAbi = accountArtifact.abi as Abi;

type RequestState = {
  kind: number; agent: Address; recipient: Address; asset: Address; amount: bigint; category: number;
  intentHash: Hex; createdAt: bigint; expiresAt: bigint; approvals: number; executed: boolean;
  cancelled: boolean; strategyDigest: Hex; strategyExpiry: bigint;
};

type Prepared = {
  kind: "approve" | "reject" | "execute";
  title: string;
  account: Address;
  data: Hex;
  gas: bigint;
  expected: string;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    if (/rejected|denied/i.test(error.message)) return "Wallet signature rejected. Nothing was sent.";
    return error.message.split("\n")[0].slice(0, 360);
  }
  return "The approval action failed.";
}

export function V3OnchainApprovalDesk() {
  const connection = useAccount();
  const [chainId, setChainId] = useState<4663 | 46630>(46630);
  const client = usePublicClient({ chainId });
  const walletClient = useWalletClient({ chainId });
  const { switchChainAsync } = useSwitchChain();
  const [accountInput, setAccountInput] = useState("");
  const [requestId, setRequestId] = useState("1");
  const [request, setRequest] = useState<RequestState>();
  const [minimumApprovals, setMinimumApprovals] = useState<number>();
  const [capturedAt, setCapturedAt] = useState(0);
  const [prepared, setPrepared] = useState<Prepared>();
  const [receipt, setReceipt] = useState<Hash>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const isMainnet = chainId === 4663;
  const chain = isMainnet ? robinhoodMainnet : robinhoodTestnet;
  const factory = isMainnet ? mainnetFactoryV3Address : testnetFactoryV3Address;
  const stablecoin = isMainnet ? ROBINHOOD_MAINNET_USDG : testnetV3StablecoinAddress;

  async function verifiedAccount() {
    if (!connection.address || !client) throw new Error("Connect an approver wallet first.");
    if (connection.chainId !== chainId) throw new Error(`Switch to ${chain.name} first.`);
    if (!factory || !stablecoin) throw new Error("The verified V3 factory/stablecoin is not configured for this network.");
    if (!isAddress(accountInput) || !/^\d+$/.test(requestId)) throw new Error("Enter a valid V3 account and request ID.");
    const account = getAddress(accountInput);
    const verification = await verifyFactoryV3(client, factory, { chainId, canonicalStablecoin: stablecoin });
    if (!verification.verified) throw new Error("V3 factory provenance failed.");
    const [expected, actual] = await Promise.all([
      client.readContract({ address: factory, abi: ruleWalletFactoryV3Abi, functionName: "VERSION_HASH" }),
      client.readContract({ address: factory, abi: ruleWalletFactoryV3Abi, functionName: "accountVersion", args: [account] }),
    ]);
    if (actual !== expected) throw new Error("The account was not deployed by the verified V3 factory.");
    return { account, owner: connection.address, client };
  }

  async function load() {
    setBusy("load"); setError(undefined); setPrepared(undefined); setReceipt(undefined);
    try {
      const context = await verifiedAccount();
      const [state, threshold] = await Promise.all([
        context.client.readContract({ address: context.account, abi: accountAbi, functionName: "request", args: [BigInt(requestId)] }) as Promise<RequestState>,
        context.client.readContract({ address: context.account, abi: accountAbi, functionName: "minimumApprovals" }) as Promise<number>,
      ]);
      setRequest(state); setMinimumApprovals(Number(threshold)); setCapturedAt(Date.now());
    } catch (caught) { setError(errorMessage(caught)); setRequest(undefined); } finally { setBusy(undefined); }
  }

  async function prepare(kind: Prepared["kind"]) {
    setBusy(`prepare-${kind}`); setError(undefined); setPrepared(undefined); setReceipt(undefined);
    try {
      const context = await verifiedAccount();
      const functionName = kind === "approve" ? "approveRequest" : kind === "reject" ? "rejectRequest" : "executeApprovedRequest";
      const data = encodeFunctionData({ abi: accountAbi, functionName, args: [BigInt(requestId)] });
      await context.client.call({ account: context.owner, to: context.account, data, value: BigInt(0) });
      const gas = await context.client.estimateGas({ account: context.owner, to: context.account, data, value: BigInt(0) });
      setPrepared({
        kind, account: context.account, data, gas,
        title: kind === "approve" ? `Approve request ${requestId}` : kind === "reject" ? `Reject request ${requestId}` : `Execute approved request ${requestId}`,
        expected: kind === "approve" ? "Record one unique active APPROVER_ROLE vote." : kind === "reject" ? "Permanently cancel this pending request." : "Revalidate agent, strategy, approvals, merchant, category, time, every spend limit, pause, expiry, and balance before transfer.",
      });
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(undefined); }
  }

  async function sign() {
    if (!prepared || !connection.address || !client) return;
    setBusy("sign"); setError(undefined);
    try {
      if (connection.chainId !== chainId) await switchChainAsync({ chainId });
      const wallet = walletClient.data;
      if (!wallet) throw new Error("Wallet client unavailable.");
      await client.call({ account: connection.address, to: prepared.account, data: prepared.data, value: BigInt(0) });
      const hash = await wallet.sendTransaction({ account: connection.address, chain, to: prepared.account, data: prepared.data, value: BigInt(0) });
      const confirmed = await client.waitForTransactionReceipt({ hash, confirmations: isMainnet ? 2 : 1 });
      if (confirmed.status !== "success") throw new Error("The onchain approval action reverted.");
      setReceipt(hash); setPrepared(undefined); await load();
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(undefined); }
  }

  const decimals = request?.asset === zeroAddress ? 18 : 6;
  const symbol = request?.asset === zeroAddress ? "ETH" : "USDG";

  return <section className="mt-10">
    <Card className="border-primary/25">
      <CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>Onchain V3 approval desk</CardTitle><CardDescription className="mt-2 max-w-3xl">Read the contract request, record an independent approval or rejection, and execute only after every current hard policy passes again.</CardDescription></div><div className="flex rounded-lg border border-primary/20 bg-primary/[0.04] p-1"><button type="button" className={`rounded-md px-3 py-1.5 text-xs ${!isMainnet ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => setChainId(46630)}>Testnet</button><button type="button" className={`rounded-md px-3 py-1.5 text-xs ${isMainnet ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => setChainId(4663)}>Mainnet</button></div></div></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><div><Label>V3 account</Label><Input className="mt-2 font-mono" value={accountInput} onChange={(event) => setAccountInput(event.target.value)} placeholder="0x…" /></div><div><Label>Request ID</Label><Input className="mt-2" value={requestId} onChange={(event) => setRequestId(event.target.value)} /></div><Button className="self-end" variant="outline" onClick={() => void load()} disabled={Boolean(busy)}>{busy === "load" ? <LoaderCircle className="animate-spin" /> : <Search />} Load request</Button></div>
        {request ? <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">Request {requestId}</p><p className="mt-1 text-sm text-muted-foreground">{request.executed ? "Executed" : request.cancelled ? "Cancelled" : Number(request.expiresAt) * 1000 <= capturedAt ? "Expired" : "Pending"}</p></div><Badge variant="outline">{request.approvals}/{minimumApprovals ?? "?"} approvals</Badge></div><dl className="mt-4 grid gap-3 text-sm md:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Recipient</dt><dd className="break-all font-mono text-xs">{request.recipient}</dd></div><div><dt className="text-xs text-muted-foreground">Exact amount</dt><dd>{formatUnits(request.amount, decimals)} {symbol}</dd></div><div><dt className="text-xs text-muted-foreground">Category</dt><dd>{request.category}</dd></div><div><dt className="text-xs text-muted-foreground">Expires</dt><dd>{new Date(Number(request.expiresAt) * 1000).toLocaleString()}</dd></div><div className="md:col-span-2"><dt className="text-xs text-muted-foreground">Intent hash</dt><dd className="break-all font-mono text-xs">{request.intentHash}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => void prepare("approve")} disabled={Boolean(busy)}><Check /> Prepare approval</Button><Button variant="destructive" onClick={() => void prepare("reject")} disabled={Boolean(busy)}><X /> Prepare rejection</Button><Button variant="outline" onClick={() => void prepare("execute")} disabled={Boolean(busy)}><Play /> Prepare execution</Button></div></div> : null}
        {prepared ? <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-primary">{prepared.title}</p><p className="mt-1 text-sm text-muted-foreground">{prepared.expected}</p></div><Badge variant="outline">Simulation passed · {prepared.gas.toString()} gas</Badge></div><p className="mt-4 max-h-28 overflow-auto break-all rounded-lg bg-white p-3 font-mono text-[10px]">{prepared.data}</p><Button className="mt-4" onClick={() => void sign()} disabled={busy === "sign"}>{busy === "sign" ? <LoaderCircle className="animate-spin" /> : <Wallet />} Sign exact action</Button></div> : null}
        {receipt ? <Alert className="border-primary/30 bg-primary/[0.05]"><Check /><AlertTitle>Onchain action confirmed</AlertTitle><AlertDescription><a href={`${chain.blockExplorers.default.url}/tx/${receipt}`} target="_blank" rel="noreferrer">Open Blockscout receipt <ExternalLink className="inline size-3" /></a></AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive"><AlertTriangle /><AlertTitle>Approval action blocked</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      </CardContent>
    </Card>
  </section>;
}
