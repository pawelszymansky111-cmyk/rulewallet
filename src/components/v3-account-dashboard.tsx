"use client";

import accountArtifact from "@/generated/rulewallet-policy-account-v3.json";
import registryArtifact from "@/generated/rulewallet-policy-registry-v3.json";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  ExternalLink,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Send,
  ShieldOff,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  encodeFunctionData,
  erc20Abi,
  formatUnits,
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

type AssetMetrics = {
  balance: bigint;
  rolling: bigint;
  daily: bigint;
  weekly: bigint;
  monthly: bigint;
  rollingLimit: bigint;
};

type Snapshot = {
  registry: Address;
  policyActive: boolean;
  paused: boolean;
  minimumApprovals: number;
  activeApprovers: number;
  totalRequests: bigint;
  activeAgents: Address[];
  eth: AssetMetrics;
  usdg: AssetMetrics;
};

type PreparedAction = {
  title: string;
  chainId: 4663 | 46630;
  to: Address;
  value: bigint;
  data?: Hex;
  gas: bigint;
  expected: string;
};

type SavedAccount = {
  predictedAccount?: string;
  name?: string;
  chainId?: number;
};

function compactError(error: unknown) {
  if (!(error instanceof Error)) return "The account action failed.";
  if (/reject|denied/i.test(error.message)) return "The wallet request was rejected. Nothing was sent.";
  return error.message.split("\n")[0].slice(0, 360);
}

function short(value: string) {
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

function display(value: bigint, decimals: number, maximumFractionDigits = 4) {
  const [whole, fraction = ""] = formatUnits(value, decimals).split(".");
  const trimmed = fraction.slice(0, maximumFractionDigits).replace(/0+$/, "");
  return `${whole}${trimmed ? `.${trimmed}` : ""}`;
}

function remaining(metrics: AssetMetrics) {
  return metrics.rolling >= metrics.rollingLimit
    ? BigInt(0)
    : metrics.rollingLimit - metrics.rolling;
}

export function V3AccountDashboard({
  accountInput,
  onAccountInputChange,
}: {
  accountInput: string;
  onAccountInputChange: (value: string) => void;
}) {
  const connection = useAccount();
  const [chainId, setChainId] = useState<4663 | 46630>(46630);
  const publicClient = usePublicClient({ chainId });
  const walletClient = useWalletClient({ chainId });
  const { switchChainAsync } = useSwitchChain();
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [asset, setAsset] = useState<"ETH" | "USDG">("USDG");
  const [amount, setAmount] = useState("1");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [agentToRevoke, setAgentToRevoke] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [formerOwner, setFormerOwner] = useState("");
  const [prepared, setPrepared] = useState<PreparedAction>();
  const [receipt, setReceipt] = useState<Hash>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  const isMainnet = chainId === 4663;
  const chain = isMainnet ? robinhoodMainnet : robinhoodTestnet;
  const factory = isMainnet ? mainnetFactoryV3Address : testnetFactoryV3Address;
  const stablecoin = isMainnet ? ROBINHOOD_MAINNET_USDG : testnetV3StablecoinAddress;
  const explorer = chain.blockExplorers.default.url;

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (!connection.address) {
        setSavedAccounts([]);
        return;
      }
      const storageKey = `rulewallet:v3-accounts:${connection.address.toLowerCase()}`;
      try {
        const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as SavedAccount[];
        setSavedAccounts(stored.filter((item) => item.chainId === chainId && isAddress(item.predictedAccount ?? "")));
      } catch {
        setSavedAccounts([]);
      }
    });
    return () => { active = false; };
  }, [chainId, connection.address]);

  async function verifiedContext(requireOwner = true) {
    if (!connection.address || !publicClient) throw new Error("Connect the owner wallet first.");
    if (!factory || !stablecoin) throw new Error(`The verified V3 ${isMainnet ? "mainnet" : "testnet"} deployment is not configured.`);
    if (!isAddress(accountInput)) throw new Error("Enter or select a valid V3 account address.");
    const account = getAddress(accountInput);
    const verification = await verifyFactoryV3(publicClient, factory, {
      chainId,
      canonicalStablecoin: stablecoin,
    });
    if (!verification.verified) throw new Error("The configured V3 factory failed pinned-runtime verification.");
    const [expectedVersion, version, accountStablecoin, registry, ownerRole] = await Promise.all([
      publicClient.readContract({ address: factory, abi: ruleWalletFactoryV3Abi, functionName: "VERSION_HASH" }),
      publicClient.readContract({ address: factory, abi: ruleWalletFactoryV3Abi, functionName: "accountVersion", args: [account] }),
      publicClient.readContract({ address: account, abi: accountAbi, functionName: "canonicalStablecoin" }),
      publicClient.readContract({ address: account, abi: accountAbi, functionName: "policyRegistry" }),
      publicClient.readContract({ address: account, abi: accountAbi, functionName: "OWNER_ROLE" }),
    ]);
    if (version !== expectedVersion || getAddress(String(accountStablecoin)) !== stablecoin) {
      throw new Error("This account is not a verified V3 account for the selected network and stablecoin.");
    }
    const registryAddress = getAddress(String(registry));
    const [controller, registryStablecoin, ownsAccount] = await Promise.all([
      publicClient.readContract({ address: registryAddress, abi: registryAbi, functionName: "controller" }),
      publicClient.readContract({ address: registryAddress, abi: registryAbi, functionName: "canonicalStablecoin" }),
      publicClient.readContract({ address: account, abi: accountAbi, functionName: "hasRole", args: [ownerRole, connection.address] }),
    ]);
    if (getAddress(String(controller)) !== account || getAddress(String(registryStablecoin)) !== stablecoin) {
      throw new Error("The account and immutable policy registry are not correctly paired.");
    }
    if (requireOwner && !ownsAccount) throw new Error("The connected wallet does not hold OWNER_ROLE on this account.");
    return { account, registry: registryAddress, stablecoin };
  }

  async function load() {
    setBusy("load");
    setError(undefined);
    setPrepared(undefined);
    try {
      const context = await verifiedContext(false);
      if (!publicClient) return;
      const [
        ethBalance, usdgBalance, policyActive, paused, minimumApprovals,
        activeApprovers, nextRequestId, activeAgents, ethPolicy, usdgPolicy, ethRolling,
        usdgRolling, ethPeriods, usdgPeriods,
      ] = await Promise.all([
        publicClient.getBalance({ address: context.account }),
        publicClient.readContract({ address: context.stablecoin, abi: erc20Abi, functionName: "balanceOf", args: [context.account] }),
        publicClient.readContract({ address: context.account, abi: accountAbi, functionName: "policyActive" }),
        publicClient.readContract({ address: context.account, abi: accountAbi, functionName: "paused" }),
        publicClient.readContract({ address: context.account, abi: accountAbi, functionName: "minimumApprovals" }),
        publicClient.readContract({ address: context.account, abi: accountAbi, functionName: "activeApproverCount" }),
        publicClient.readContract({ address: context.account, abi: accountAbi, functionName: "nextRequestId" }),
        publicClient.readContract({ address: context.account, abi: accountAbi, functionName: "activeAgents" }),
        publicClient.readContract({ address: context.registry, abi: registryAbi, functionName: "assetPolicies", args: [zeroAddress] }),
        publicClient.readContract({ address: context.registry, abi: registryAbi, functionName: "assetPolicies", args: [context.stablecoin] }),
        publicClient.readContract({ address: context.registry, abi: registryAbi, functionName: "rollingSpent", args: [zeroAddress] }),
        publicClient.readContract({ address: context.registry, abi: registryAbi, functionName: "rollingSpent", args: [context.stablecoin] }),
        publicClient.readContract({ address: context.registry, abi: registryAbi, functionName: "assetPeriodSpend", args: [zeroAddress] }),
        publicClient.readContract({ address: context.registry, abi: registryAbi, functionName: "assetPeriodSpend", args: [context.stablecoin] }),
      ]);
      const mapMetrics = (balance: bigint, rolling: bigint, policy: unknown, periods: unknown): AssetMetrics => {
        const policyTuple = policy as readonly [boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
        const periodTuple = periods as readonly [bigint, bigint, bigint];
        return {
          balance,
          rolling,
          rollingLimit: policyTuple[2],
          daily: periodTuple[0],
          weekly: periodTuple[1],
          monthly: periodTuple[2],
        };
      };
      setSnapshot({
        registry: context.registry,
        policyActive: Boolean(policyActive),
        paused: Boolean(paused),
        minimumApprovals: Number(minimumApprovals),
        activeApprovers: Number(activeApprovers),
        totalRequests: BigInt(nextRequestId as bigint) - BigInt(1),
        activeAgents: (activeAgents as Address[]).map(getAddress),
        eth: mapMetrics(ethBalance, BigInt(ethRolling as bigint), ethPolicy, ethPeriods),
        usdg: mapMetrics(BigInt(usdgBalance as bigint), BigInt(usdgRolling as bigint), usdgPolicy, usdgPeriods),
      });
    } catch (caught) {
      setSnapshot(undefined);
      setError(compactError(caught));
    } finally {
      setBusy(undefined);
    }
  }

  async function prepare(kind:
    | "deposit"
    | "withdraw"
    | "pause"
    | "unpause"
    | "disable"
    | "enable"
    | "revoke"
    | "revoke-all"
    | "grant-owner"
    | "begin-admin-transfer"
    | "accept-admin-transfer"
    | "revoke-former-owner"
  ) {
    setBusy(kind);
    setError(undefined);
    setReceipt(undefined);
    try {
      const context = await verifiedContext(kind !== "deposit");
      if (!connection.address || !publicClient) return;
      const decimals = asset === "USDG" ? 6 : 18;
      const parsedAmount = kind === "deposit" || kind === "withdraw" ? parseUnits(amount, decimals) : BigInt(0);
      if ((kind === "deposit" || kind === "withdraw") && parsedAmount <= BigInt(0)) throw new Error("Enter an amount above zero.");

      let title = "";
      let to: Address = context.account;
      let value = BigInt(0);
      let data: Hex | undefined;
      let expected = "";
      if (kind === "deposit" && asset === "ETH") {
        title = "Deposit native ETH";
        value = parsedAmount;
        expected = `${amount} ETH is transferred from the connected wallet to the V3 account.`;
      } else if (kind === "deposit") {
        title = "Deposit canonical USDG";
        to = context.stablecoin;
        data = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [context.account, parsedAmount] });
        expected = `${amount} USDG is transferred directly into the V3 account.`;
      } else if (kind === "withdraw") {
        if (!isAddress(withdrawTo)) throw new Error("Enter a valid withdrawal recipient.");
        title = `Withdraw ${asset}`;
        const functionName = asset === "ETH" ? "withdrawNative" : "withdrawCanonicalStablecoin";
        data = encodeFunctionData({ abi: accountAbi, functionName, args: [getAddress(withdrawTo), parsedAmount] });
        expected = `${amount} ${asset} is withdrawn to ${getAddress(withdrawTo)} by an OWNER_ROLE signature.`;
      } else if (kind === "pause") {
        title = "Emergency pause";
        data = encodeFunctionData({ abi: accountAbi, functionName: "pause" });
        expected = "All new agent requests and executions stop immediately.";
      } else if (kind === "unpause") {
        title = "Unpause account";
        data = encodeFunctionData({ abi: accountAbi, functionName: "unpause" });
        expected = "Agent execution can resume only if the policy is also active.";
      } else if (kind === "disable" || kind === "enable") {
        title = kind === "disable" ? "Disable spending policy" : "Enable spending policy";
        data = encodeFunctionData({ abi: accountAbi, functionName: "setPolicyActive", args: [kind === "enable"] });
        expected = kind === "disable" ? "All agent payment requests remain disabled until re-enabled by the owner." : "The configured spending policy becomes active.";
      } else if (kind === "grant-owner" || kind === "begin-admin-transfer") {
        if (!isAddress(newOwner)) throw new Error("Enter a valid replacement owner address.");
        const replacement = getAddress(newOwner);
        if (replacement === connection.address) throw new Error("The replacement owner must be a different address.");
        if (kind === "grant-owner") {
          const ownerRole = await publicClient.readContract({ address: context.account, abi: accountAbi, functionName: "OWNER_ROLE" });
          title = "Grant replacement OWNER_ROLE";
          data = encodeFunctionData({ abi: accountAbi, functionName: "grantRole", args: [ownerRole, replacement] });
          expected = `${replacement} gains owner capabilities. The current owner remains active until the final revocation step.`;
        } else {
          title = "Schedule default-admin transfer";
          data = encodeFunctionData({ abi: accountAbi, functionName: "beginDefaultAdminTransfer", args: [replacement] });
          expected = `${replacement} may accept default-admin control after the contract's two-day safety delay. This step does not remove the current owner.`;
        }
      } else if (kind === "accept-admin-transfer") {
        title = "Accept delayed default-admin transfer";
        data = encodeFunctionData({ abi: accountAbi, functionName: "acceptDefaultAdminTransfer" });
        expected = "The connected replacement owner accepts default-admin control after the onchain delay. The former OWNER_ROLE must still be revoked separately.";
      } else if (kind === "revoke-former-owner") {
        if (!isAddress(formerOwner)) throw new Error("Enter the exact former owner address.");
        const previous = getAddress(formerOwner);
        if (previous === connection.address) throw new Error("Do not revoke the currently connected replacement owner.");
        const ownerRole = await publicClient.readContract({ address: context.account, abi: accountAbi, functionName: "OWNER_ROLE" });
        title = "Revoke former OWNER_ROLE";
        data = encodeFunctionData({ abi: accountAbi, functionName: "revokeRole", args: [ownerRole, previous] });
        expected = `${previous} loses OWNER_ROLE. Sign only after the replacement owner has accepted default-admin control and recovery has been tested.`;
      } else {
        const agents = kind === "revoke-all"
          ? snapshot?.activeAgents ?? []
          : isAddress(agentToRevoke) ? [getAddress(agentToRevoke)] : [];
        if (!agents.length) throw new Error(kind === "revoke-all" ? "No active agent sessions were found." : "Enter the exact agent address to revoke.");
        title = kind === "revoke-all" ? "Revoke every agent session" : "Revoke agent session";
        data = encodeFunctionData({ abi: accountAbi, functionName: "revokeAgentSessions", args: [agents] });
        expected = `${agents.length} agent address${agents.length === 1 ? "" : "es"} lose AGENT_ROLE; queued approvals and future executions from them can no longer execute.`;
      }
      const gas = await publicClient.estimateGas({
        account: connection.address,
        to,
        value,
        data,
      });
      setPrepared({ title, chainId, to, value, data, gas, expected });
    } catch (caught) {
      setPrepared(undefined);
      setError(compactError(caught));
    } finally {
      setBusy(undefined);
    }
  }

  async function signPrepared() {
    if (!prepared || !connection.address || !walletClient.data || !publicClient) return;
    setBusy("sign");
    setError(undefined);
    try {
      if (connection.chainId !== prepared.chainId) await switchChainAsync({ chainId: prepared.chainId });
      const hash = await walletClient.data.sendTransaction({
        account: connection.address,
        chain,
        to: prepared.to,
        value: prepared.value,
        data: prepared.data,
        gas: prepared.gas,
      });
      const result = await publicClient.waitForTransactionReceipt({ hash });
      if (result.status !== "success") throw new Error("The signed account action reverted.");
      setReceipt(hash);
      setPrepared(undefined);
      await load();
    } catch (caught) {
      setError(compactError(caught));
    } finally {
      setBusy(undefined);
    }
  }

  const selectedMetrics = snapshot ? (asset === "ETH" ? snapshot.eth : snapshot.usdg) : undefined;
  const decimals = asset === "ETH" ? 18 : 6;

  return (
    <Card className="border-primary/25">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><WalletCards className="size-5 text-primary" /> Account dashboard</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">Live balances and spend come from the verified V3 account and its immutable registry. Every action is simulated before the wallet opens.</CardDescription>
          </div>
          <div className="flex rounded-lg border border-primary/20 bg-primary/[0.04] p-1">
            <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${!isMainnet ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => { setChainId(46630); setSnapshot(undefined); setPrepared(undefined); }}>Testnet</button>
            <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${isMainnet ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => { setChainId(4663); setSnapshot(undefined); setPrepared(undefined); }}>Mainnet</button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <Label htmlFor="dashboard-account">V3 account</Label>
            <Input id="dashboard-account" className="mt-2 font-mono" value={accountInput} onChange={(event) => onAccountInputChange(event.target.value)} placeholder="0x… verified policy account" />
          </div>
          <Button className="self-end" variant="outline" onClick={() => void load()} disabled={Boolean(busy)}>{busy === "load" ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Load live account</Button>
        </div>
        {savedAccounts.length ? (
          <div className="flex flex-wrap gap-2">
            {savedAccounts.map((item) => <Button key={item.predictedAccount} size="sm" variant="outline" onClick={() => onAccountInputChange(getAddress(item.predictedAccount!))}>{item.name ?? "Saved account"} · {short(item.predictedAccount!)}</Button>)}
          </div>
        ) : null}

        {snapshot ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-primary/15 bg-primary/[0.025] p-4"><p className="text-xs text-muted-foreground">ETH balance</p><p className="mt-2 text-xl font-semibold">{display(snapshot.eth.balance, 18)} ETH</p></div>
              <div className="rounded-xl border border-primary/15 bg-primary/[0.025] p-4"><p className="text-xs text-muted-foreground">USDG balance</p><p className="mt-2 text-xl font-semibold">{display(snapshot.usdg.balance, 6, 2)} USDG</p></div>
              <div className="rounded-xl border border-primary/15 bg-primary/[0.025] p-4"><p className="text-xs text-muted-foreground">Policy status</p><p className="mt-2 text-xl font-semibold">{snapshot.paused ? "Paused" : snapshot.policyActive ? "Active" : "Disabled"}</p></div>
              <div className="rounded-xl border border-primary/15 bg-primary/[0.025] p-4"><p className="text-xs text-muted-foreground">Agents / requests</p><p className="mt-2 text-xl font-semibold">{snapshot.activeAgents.length} · {snapshot.totalRequests.toString()}</p><p className="mt-1 text-xs text-muted-foreground">Approval rule {snapshot.minimumApprovals} of {snapshot.activeApprovers}</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Available 24h allowance</p><p className="mt-1 font-medium">{display(remaining(selectedMetrics!), decimals)} {asset}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Spent today</p><p className="mt-1 font-medium">{display(selectedMetrics!.daily, decimals)} {asset}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Spent this week</p><p className="mt-1 font-medium">{display(selectedMetrics!.weekly, decimals)} {asset}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Spent this month</p><p className="mt-1 font-medium">{display(selectedMetrics!.monthly, decimals)} {asset}</p></div>
            </div>
            <p className="break-all font-mono text-[10px] text-muted-foreground">Registry: {snapshot.registry}</p>
          </>
        ) : null}

        <div className="rounded-2xl border border-primary/15 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Asset</Label><select className="mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm" value={asset} onChange={(event) => setAsset(event.target.value as "ETH" | "USDG")}><option value="USDG">USDG</option><option value="ETH">ETH</option></select></div>
            <div><Label htmlFor="account-amount">Amount</Label><Input id="account-amount" className="mt-2" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
            <div className="flex items-end gap-2"><Button variant="outline" onClick={() => void prepare("deposit")} disabled={Boolean(busy)}><Send /> Deposit</Button><Button variant="outline" onClick={() => void prepare("withdraw")} disabled={Boolean(busy)}><LogOut /> Withdraw</Button></div>
          </div>
          <div className="mt-4"><Label htmlFor="withdraw-recipient">Withdrawal recipient</Label><Input id="withdraw-recipient" className="mt-2 font-mono" value={withdrawTo} onChange={(event) => setWithdrawTo(event.target.value)} placeholder={connection.address ?? "0x…"} /></div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={() => void prepare("pause")} disabled={Boolean(busy)}><CirclePause /> Emergency pause</Button>
            <Button variant="outline" onClick={() => void prepare("unpause")} disabled={Boolean(busy)}><CirclePlay /> Unpause</Button>
            <Button variant="outline" onClick={() => void prepare(snapshot?.policyActive ? "disable" : "enable")} disabled={Boolean(busy)}><ShieldOff /> {snapshot?.policyActive ? "Disable policy" : "Enable policy"}</Button>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto]"><Input className="font-mono" value={agentToRevoke} onChange={(event) => setAgentToRevoke(event.target.value)} placeholder="Exact agent address to revoke 0x…" /><Button variant="destructive" onClick={() => void prepare("revoke")} disabled={Boolean(busy)}>Revoke agent</Button><Button variant="destructive" onClick={() => void prepare("revoke-all")} disabled={Boolean(busy) || !snapshot?.activeAgents.length}>Revoke all ({snapshot?.activeAgents.length ?? 0})</Button></div>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4">
          <p className="font-medium">Transfer account ownership</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Four separately simulated signatures prevent a one-click takeover: grant the replacement owner role, schedule the delayed default-admin transfer, let the replacement accept after two days, then revoke the former owner.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input aria-label="Replacement owner address" className="font-mono" value={newOwner} onChange={(event) => setNewOwner(event.target.value)} placeholder="Replacement owner 0x…" />
            <Button variant="outline" onClick={() => void prepare("grant-owner")} disabled={Boolean(busy)}>1. Grant owner role</Button>
            <Button variant="outline" onClick={() => void prepare("begin-admin-transfer")} disabled={Boolean(busy)}>2. Start two-day transfer</Button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input aria-label="Former owner address" className="font-mono" value={formerOwner} onChange={(event) => setFormerOwner(event.target.value)} placeholder="Former owner to revoke 0x…" />
            <Button variant="outline" onClick={() => void prepare("accept-admin-transfer")} disabled={Boolean(busy)}>3. Accept as replacement</Button>
            <Button variant="destructive" onClick={() => void prepare("revoke-former-owner")} disabled={Boolean(busy)}>4. Revoke former owner</Button>
          </div>
        </div>

        {prepared ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{prepared.title}</p><p className="mt-1 text-sm text-muted-foreground">{prepared.expected}</p></div><Badge variant="outline">Signature required</Badge></div>
            <dl className="mt-4 grid gap-3 text-xs md:grid-cols-2">
              <div><dt className="text-muted-foreground">Chain</dt><dd className="mt-1 font-mono">{prepared.chainId} · {chain.name}</dd></div>
              <div><dt className="text-muted-foreground">Gas estimate</dt><dd className="mt-1 font-mono">{prepared.gas.toString()}</dd></div>
              <div><dt className="text-muted-foreground">Target</dt><dd className="mt-1 break-all font-mono">{prepared.to}</dd></div>
              <div><dt className="text-muted-foreground">Native value</dt><dd className="mt-1 font-mono">{formatUnits(prepared.value, 18)} ETH</dd></div>
              <div className="md:col-span-2"><dt className="text-muted-foreground">Calldata</dt><dd className="mt-1 max-h-24 overflow-auto break-all rounded-lg bg-white p-3 font-mono text-[10px]">{prepared.data ?? "0x (plain native transfer)"}</dd></div>
            </dl>
            <Button className="mt-4" onClick={() => void signPrepared()} disabled={Boolean(busy)}>{busy === "sign" ? <LoaderCircle className="animate-spin" /> : <WalletCards />} Sign exact action</Button>
          </div>
        ) : null}

        {receipt ? <Alert className="border-primary/30 bg-primary/[0.05]"><CheckCircle2 /><AlertTitle>Confirmed onchain</AlertTitle><AlertDescription><a href={`${explorer}/tx/${receipt}`} target="_blank" rel="noreferrer">Open transaction receipt <ExternalLink className="inline size-3" /></a></AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive"><AlertTriangle /><AlertTitle>Action stopped</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {!factory || !stablecoin ? <Alert className="border-amber-300 bg-amber-50"><Activity /><AlertTitle>Shared V3 deployment not configured</AlertTitle><AlertDescription>Account controls remain read-only until the pinned factory and canonical stablecoin address are configured for this network.</AlertDescription></Alert> : null}
      </CardContent>
    </Card>
  );
}
