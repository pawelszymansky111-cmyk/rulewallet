"use client";

import accountArtifact from "@/generated/rulewallet-policy-account-v3.json";
import registryArtifact from "@/generated/rulewallet-policy-registry-v3.json";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Pause,
  Play,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import {
  encodeFunctionData,
  getAddress,
  isAddress,
  parseUnits,
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
const registryAbi = registryArtifact.abi as Abi;

const categories = [
  [0, "Direct payment"],
  [1, "Travel"],
  [2, "Food"],
  [3, "Tickets"],
  [4, "Shopping"],
  [5, "Subscriptions"],
  [6, "Payroll"],
  [7, "Services"],
  [8, "Other"],
] as const;

type ActionKind =
  | "asset"
  | "merchant"
  | "merchant-asset"
  | "category"
  | "schedule"
  | "activate"
  | "deactivate"
  | "pause"
  | "unpause";

type PreparedAction = {
  kind: ActionKind;
  chainId: 4663 | 46630;
  account: Address;
  target: Address;
  title: string;
  data: Hex;
  gas: bigint;
  expected: string;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    if (/rejected|denied/i.test(error.message)) return "The wallet signature was rejected. Nothing was sent.";
    return error.message.split("\n")[0].slice(0, 360);
  }
  return "The policy action failed.";
}

export function V3PolicyWorkspace({
  initialChainId = 46630,
  selectedAccount,
  onSelectedAccountChange,
  initialMerchant = "",
  initialCategory = 4,
  initialAssetSymbol = "USDG",
  initialPerTransaction = "50",
}: {
  initialChainId?: 4663 | 46630;
  selectedAccount?: string;
  onSelectedAccountChange?: (value: string) => void;
  initialMerchant?: string;
  initialCategory?: number;
  initialAssetSymbol?: "ETH" | "USDG";
  initialPerTransaction?: string;
}) {
  const connection = useAccount();
  const [chainId, setChainId] = useState<4663 | 46630>(initialChainId);
  const publicClient = usePublicClient({ chainId });
  const walletClient = useWalletClient({ chainId });
  const { switchChainAsync } = useSwitchChain();
  const [localAccountInput, setLocalAccountInput] = useState("");
  const accountInput = selectedAccount ?? localAccountInput;
  const setAccountInput = onSelectedAccountChange ?? setLocalAccountInput;
  const [merchant, setMerchant] = useState(initialMerchant);
  const [assetSymbol, setAssetSymbol] = useState<"ETH" | "USDG">(initialAssetSymbol);
  const [category, setCategory] = useState(initialCategory);
  const [autonomous, setAutonomous] = useState(false);
  const [perTransaction, setPerTransaction] = useState(initialPerTransaction);
  const [rolling24Hours, setRolling24Hours] = useState("150");
  const [approvalAbove, setApprovalAbove] = useState("25");
  const [daily, setDaily] = useState("150");
  const [weekly, setWeekly] = useState("500");
  const [monthly, setMonthly] = useState("1500");
  const [merchantDaily, setMerchantDaily] = useState("100");
  const [merchantTransactions, setMerchantTransactions] = useState("5");
  const [expiryDays, setExpiryDays] = useState("30");
  const [weekdays, setWeekdays] = useState("127");
  const [startMinute, setStartMinute] = useState("0");
  const [endMinute, setEndMinute] = useState("0");
  const [prepared, setPrepared] = useState<PreparedAction>();
  const [receipt, setReceipt] = useState<Hash>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  const isMainnet = chainId === 4663;
  const chain = isMainnet ? robinhoodMainnet : robinhoodTestnet;
  const factory = isMainnet ? mainnetFactoryV3Address : testnetFactoryV3Address;
  const stablecoin = isMainnet ? ROBINHOOD_MAINNET_USDG : testnetV3StablecoinAddress;
  const decimals = assetSymbol === "USDG" ? 6 : 18;
  const asset = assetSymbol === "USDG" ? stablecoin : zeroAddress;

  async function verifiedContext() {
    if (!connection.address || !publicClient) throw new Error("Connect the owner wallet first.");
    if (connection.chainId !== chainId) throw new Error(`Switch your wallet to ${chain.name} first.`);
    if (!factory || !stablecoin) throw new Error(`The verified V3 ${isMainnet ? "mainnet" : "testnet"} factory is not configured.`);
    if (!isAddress(accountInput)) throw new Error("Enter a valid V3 policy-account address.");
    const account = getAddress(accountInput);
    const verification = await verifyFactoryV3(publicClient, factory, { chainId, canonicalStablecoin: stablecoin });
    if (!verification.verified) throw new Error("Factory runtime or helper provenance does not match this V3 release.");
    const [version, accountVersion, registry, accountStablecoin, ownerRole] = await Promise.all([
      publicClient.readContract({ address: factory, abi: ruleWalletFactoryV3Abi, functionName: "VERSION_HASH" }),
      publicClient.readContract({ address: factory, abi: ruleWalletFactoryV3Abi, functionName: "accountVersion", args: [account] }),
      publicClient.readContract({ address: account, abi: accountAbi, functionName: "policyRegistry" }) as Promise<Address>,
      publicClient.readContract({ address: account, abi: accountAbi, functionName: "canonicalStablecoin" }) as Promise<Address>,
      publicClient.readContract({ address: account, abi: accountAbi, functionName: "OWNER_ROLE" }) as Promise<Hex>,
    ]);
    if (accountVersion !== version || getAddress(accountStablecoin) !== stablecoin) throw new Error("Account provenance or stablecoin binding is invalid.");
    const [controller, registryStablecoin, isOwner] = await Promise.all([
      publicClient.readContract({ address: registry, abi: registryAbi, functionName: "controller" }) as Promise<Address>,
      publicClient.readContract({ address: registry, abi: registryAbi, functionName: "canonicalStablecoin" }) as Promise<Address>,
      publicClient.readContract({ address: account, abi: accountAbi, functionName: "hasRole", args: [ownerRole, connection.address] }) as Promise<boolean>,
    ]);
    if (getAddress(controller) !== account || getAddress(registryStablecoin) !== stablecoin) throw new Error("Policy registry provenance is invalid.");
    if (!isOwner) throw new Error("The connected wallet does not hold OWNER_ROLE on this account.");
    return { owner: connection.address, account, registry, client: publicClient };
  }

  function amount(value: string) {
    if (!value.trim()) return BigInt(0);
    return parseUnits(value, decimals);
  }

  async function prepare(kind: ActionKind) {
    setBusy(`prepare-${kind}`);
    setError(undefined);
    setReceipt(undefined);
    setPrepared(undefined);
    try {
      const context = await verifiedContext();
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + Number(expiryDays) * 86_400);
      let target = context.registry;
      let title = "";
      let expected = "";
      let data: Hex;
      if (kind === "asset") {
        if (!asset) throw new Error("Stablecoin is not configured.");
        data = encodeFunctionData({ abi: registryAbi, functionName: "setAssetPolicy", args: [asset, {
          allowed: true,
          maxPerTransaction: amount(perTransaction),
          maxRolling24Hours: amount(rolling24Hours),
          approvalAbove: amount(approvalAbove),
          dailyLimit: amount(daily),
          weeklyLimit: amount(weekly),
          monthlyLimit: amount(monthly),
          expiresAt,
        }] });
        title = `Set ${assetSymbol} account limits`;
        expected = `Enable ${assetSymbol} with per-transaction, rolling 24-hour, daily, weekly, monthly, approval, and expiry controls.`;
      } else if (kind === "merchant") {
        if (!isAddress(merchant)) throw new Error("Enter a valid merchant or provider payment address.");
        data = encodeFunctionData({ abi: registryAbi, functionName: "setMerchantPolicy", args: [getAddress(merchant), {
          trusted: true,
          autonomous,
          category,
          expiresAt,
        }] });
        title = autonomous ? "Trust merchant for bounded automatic payments" : "Trust merchant with approval required";
        expected = `${getAddress(merchant)} becomes a category ${category} merchant until the selected expiry. ${autonomous ? "Payments may skip confirmation only while every other policy passes." : "Every payment still requires approval."}`;
      } else if (kind === "merchant-asset") {
        if (!isAddress(merchant) || !asset) throw new Error("Enter a valid merchant and select a configured asset.");
        data = encodeFunctionData({ abi: registryAbi, functionName: "setMerchantAssetPolicy", args: [getAddress(merchant), asset, {
          allowed: true,
          maxPerTransaction: amount(perTransaction),
          dailyLimit: amount(merchantDaily),
          maxTransactionsPerDay: Number(merchantTransactions),
        }] });
        title = `Set ${assetSymbol} limits for merchant`;
        expected = `Allow at most ${perTransaction} ${assetSymbol} per transaction, ${merchantDaily} per day, and ${merchantTransactions} payments per day to this merchant.`;
      } else if (kind === "category") {
        if (!asset) throw new Error("Stablecoin is not configured.");
        data = encodeFunctionData({ abi: registryAbi, functionName: "setCategoryBudget", args: [category, asset, {
          allowed: true,
          dailyLimit: amount(daily),
          weeklyLimit: amount(weekly),
          monthlyLimit: amount(monthly),
          expiresAt,
        }] });
        title = `Set ${categories.find(([id]) => id === category)?.[1] ?? "category"} budget`;
        expected = `Enable category ${category} with ${daily}/${weekly}/${monthly} ${assetSymbol} daily/weekly/monthly limits.`;
      } else if (kind === "schedule") {
        if (!isAddress(merchant)) throw new Error("Enter a valid merchant address.");
        data = encodeFunctionData({ abi: registryAbi, functionName: "setMerchantTimePolicy", args: [getAddress(merchant), {
          enabled: true,
          weekdays: Number(weekdays),
          startMinuteUtc: Number(startMinute),
          endMinuteUtc: Number(endMinute),
        }] });
        title = "Set merchant time window";
        expected = `Allow the selected weekdays bitmap and UTC-minute window. 0–0 means the full permitted day.`;
      } else {
        target = context.account;
        const functionName = kind === "activate" || kind === "deactivate" ? "setPolicyActive" : kind;
        const args = kind === "activate" ? [true] : kind === "deactivate" ? [false] : [];
        data = encodeFunctionData({ abi: accountAbi, functionName, args });
        title = kind === "activate" ? "Activate policy" : kind === "deactivate" ? "Deactivate policy" : kind === "pause" ? "Emergency pause" : "Owner unpause";
        expected = kind === "pause" ? "Stop all agent execution immediately; owner withdrawals stay available." : `${title} after an owner wallet signature.`;
      }
      await context.client.call({ account: context.owner, to: target, data, value: BigInt(0) });
      const gas = await context.client.estimateGas({ account: context.owner, to: target, data, value: BigInt(0) });
      setPrepared({ kind, chainId, account: context.account, target, title, data, gas, expected });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(undefined);
    }
  }

  async function signPrepared() {
    if (!prepared || !connection.address || !publicClient) return;
    setBusy("sign");
    setError(undefined);
    try {
      if (connection.chainId !== prepared.chainId) await switchChainAsync({ chainId: prepared.chainId });
      const wallet = walletClient.data;
      if (!wallet) throw new Error("Wallet client is unavailable on the selected chain.");
      await publicClient.call({ account: connection.address, to: prepared.target, data: prepared.data, value: BigInt(0) });
      const hash = await wallet.sendTransaction({ account: connection.address, chain, to: prepared.target, data: prepared.data, value: BigInt(0) });
      const result = await publicClient.waitForTransactionReceipt({ hash, confirmations: isMainnet ? 2 : 1 });
      if (result.status !== "success") throw new Error("The policy transaction reverted.");
      setReceipt(hash);
      setPrepared(undefined);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <Card className="border-primary/25">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Spending rules</CardTitle>
            <CardDescription className="mt-2 max-w-3xl">Configure the same merchant, asset, category, approval, budget, and time checks that the V3 account enforces during every direct or scheduled payment.</CardDescription>
          </div>
          <div className="flex rounded-lg border border-primary/20 bg-primary/[0.04] p-1">
            <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${!isMainnet ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => { setChainId(46630); setPrepared(undefined); }}>Testnet</button>
            <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${isMainnet ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => { setChainId(4663); setPrepared(undefined); }}>Mainnet</button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className={isMainnet ? "border-amber-500/30 bg-amber-50" : "border-primary/25 bg-primary/[0.04]"}>
          <AlertTriangle /><AlertTitle>{isMainnet ? "Real assets and gas" : "Valueless test assets"}</AlertTitle>
          <AlertDescription>{isMainnet ? "Each configuration is a real mainnet transaction. RuleWallet shows and simulates exact calldata before your wallet opens." : "Use this network to test the complete flow before repeating any configuration on mainnet."}</AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Label htmlFor="v3-policy-account">V3 policy account</Label><Input id="v3-policy-account" className="mt-2 font-mono" value={accountInput} onChange={(event) => setAccountInput(event.target.value)} placeholder="0x… personal V3 account" /></div>
          <div><Label htmlFor="v3-merchant">Merchant or provider payment address</Label><Input id="v3-merchant" className="mt-2 font-mono" value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="Verified recipient 0x…" /></div>
          <div><Label htmlFor="v3-category">Category</Label><select id="v3-category" className="mt-2 h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={category} onChange={(event) => setCategory(Number(event.target.value))}>{categories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
          <div><Label>Asset</Label><div className="mt-2 flex gap-2"><Button type="button" variant={assetSymbol === "USDG" ? "default" : "outline"} onClick={() => setAssetSymbol("USDG")}>USDG</Button><Button type="button" variant={assetSymbol === "ETH" ? "default" : "outline"} onClick={() => setAssetSymbol("ETH")}>ETH</Button></div></div>
          <div><Label>Payment behavior</Label><label className="mt-2 flex h-10 items-center gap-3 rounded-lg border border-input bg-white px-3 text-sm"><input type="checkbox" checked={autonomous} onChange={(event) => setAutonomous(event.target.checked)} /> Skip confirmation only inside every signed rule</label></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Per transaction", perTransaction, setPerTransaction],
            ["Rolling 24h", rolling24Hours, setRolling24Hours],
            ["Approval above", approvalAbove, setApprovalAbove],
            ["Daily", daily, setDaily],
            ["Weekly", weekly, setWeekly],
            ["Monthly", monthly, setMonthly],
          ].map(([label, value, setter]) => <div key={String(label)}><Label>{String(label)}</Label><Input className="mt-2" inputMode="decimal" value={String(value)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} /></div>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Merchant daily</Label><Input className="mt-2" value={merchantDaily} onChange={(event) => setMerchantDaily(event.target.value)} /></div>
          <div><Label>Merchant tx/day</Label><Input className="mt-2" value={merchantTransactions} onChange={(event) => setMerchantTransactions(event.target.value)} /></div>
          <div><Label>Expires in days</Label><Input className="mt-2" value={expiryDays} onChange={(event) => setExpiryDays(event.target.value)} /></div>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/[0.025] p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><Store className="size-4 text-primary" /> Configure rules one wallet-signed step at a time</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void prepare("asset")} disabled={Boolean(busy)}>1. Asset limits</Button>
            <Button variant="outline" onClick={() => void prepare("merchant")} disabled={Boolean(busy)}>2. Trust merchant</Button>
            <Button variant="outline" onClick={() => void prepare("merchant-asset")} disabled={Boolean(busy)}>3. Merchant limits</Button>
            <Button variant="outline" onClick={() => void prepare("category")} disabled={Boolean(busy)}>4. Category budget</Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div><Label>Weekdays bitmap</Label><Input className="mt-2" value={weekdays} onChange={(event) => setWeekdays(event.target.value)} /></div>
            <div><Label>Start minute UTC</Label><Input className="mt-2" value={startMinute} onChange={(event) => setStartMinute(event.target.value)} /></div>
            <div><Label>End minute UTC</Label><Input className="mt-2" value={endMinute} onChange={(event) => setEndMinute(event.target.value)} /></div>
          </div>
          <Button className="mt-3" variant="outline" onClick={() => void prepare("schedule")} disabled={Boolean(busy)}><Clock3 /> 5. Time window</Button>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/15 pt-4">
            <Button onClick={() => void prepare("activate")} disabled={Boolean(busy)}><Play /> Activate</Button>
            <Button variant="outline" onClick={() => void prepare("deactivate")} disabled={Boolean(busy)}>Deactivate</Button>
            <Button variant="destructive" onClick={() => void prepare("pause")} disabled={Boolean(busy)}><Pause /> Emergency pause</Button>
            <Button variant="outline" onClick={() => void prepare("unpause")} disabled={Boolean(busy)}>Unpause</Button>
          </div>
        </div>

        {busy?.startsWith("prepare") ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Verifying provenance and simulating the exact action…</p> : null}
        {prepared ? <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-primary">{prepared.title}</p><p className="mt-1 text-sm text-muted-foreground">{prepared.expected}</p></div><Badge variant="outline">Simulation passed · {prepared.gas.toString()} gas</Badge></div>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Chain</dt><dd className="font-mono">{prepared.chainId}</dd></div><div><dt className="text-xs text-muted-foreground">Target</dt><dd className="break-all font-mono text-xs">{prepared.target}</dd></div><div className="md:col-span-2"><dt className="text-xs text-muted-foreground">Exact calldata</dt><dd className="mt-1 max-h-28 overflow-auto break-all rounded-lg bg-white p-3 font-mono text-[10px]">{prepared.data}</dd></div></dl>
          <Button className="mt-4" onClick={() => void signPrepared()} disabled={busy === "sign"}>{busy === "sign" ? <LoaderCircle className="animate-spin" /> : <Wallet />} Sign this exact action</Button>
        </div> : null}
        {receipt ? <Alert className="border-primary/35 bg-primary/[0.05]"><CheckCircle2 /><AlertTitle>Policy update confirmed</AlertTitle><AlertDescription><a href={`${chain.blockExplorers.default.url}/tx/${receipt}`} target="_blank" rel="noreferrer">Open public receipt <ExternalLink className="inline size-3" /></a></AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive"><AlertTriangle /><AlertTitle>Action blocked</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      </CardContent>
    </Card>
  );
}
