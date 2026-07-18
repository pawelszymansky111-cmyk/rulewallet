"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Network,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  encodeFunctionData,
  formatEther,
  formatUnits,
  getAddress,
  isAddress,
  keccak256,
  parseAbi,
  parseEther,
  parseUnits,
  stringToHex,
  zeroAddress,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { useConnection, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { robinhoodMainnet } from "@/lib/chains";
import {
  buildMainnetFactoryDeployment,
  RULEWALLET_FACTORY_INIT_CODE_HASH,
} from "@/lib/mainnet-factory-deployment";
import {
  ROBINHOOD_MAINNET_USDG,
  experimentalMainnetUiEnabled,
  mainnetFactoryAddress,
  mainnetSharedAccountAddress,
  ruleWalletFactoryAbi,
  ruleWalletV2Abi,
} from "@/lib/mainnet-registry";

const erc20BalanceAbi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);

type PreparedAction = {
  kind: "factory-deploy" | "deploy" | "recipient" | "eth-policy" | "usdg-policy" | "deposit" | "withdraw" | "pause" | "unpause" | "approve" | "execute-approved";
  title: string;
  to?: Address;
  value: bigint;
  data: Hex;
  expectedResult: string;
  payload: Record<string, string | boolean | number>;
};

type Metrics = {
  ethBalance: bigint;
  usdgBalance: bigint;
  policyActive: boolean;
  paused: boolean;
  ethPolicy: readonly [boolean, bigint, bigint, bigint];
  usdgPolicy: readonly [boolean, bigint, bigint, bigint];
  ethRolling: bigint;
  usdgRolling: bigint;
};

type MainnetStatus = {
  latestBlock?: string;
  factoryVerifiedOnchain: boolean;
  autonomyEnabled: boolean;
  signer: { configured: boolean; mode: string; address?: Address; reason?: string };
};

function short(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    if (/rejected|denied/i.test(error.message)) return "The wallet signature was rejected. Nothing was sent.";
    return error.message.split("\n")[0].slice(0, 300);
  }
  return "The requested action could not be completed.";
}

function policySummary(policy: readonly [boolean, bigint, bigint, bigint], symbol: string) {
  if (!policy[0]) return `Disabled for agents (${symbol})`;
  return `${formatUnits(policy[1], 18)} per tx · ${formatUnits(policy[2], 18)} / 24h · ${policy[3] === BigInt(0) ? "no approval threshold" : `approval above ${formatUnits(policy[3], 18)}`}`;
}

export function MainnetControlCenter() {
  const connection = useConnection();
  const publicClient = usePublicClient({ chainId: robinhoodMainnet.id });
  const walletClient = useWalletClient({ chainId: robinhoodMainnet.id });
  const switchChain = useSwitchChain();
  const [accountAddress, setAccountAddress] = useState<Address | undefined>(mainnetSharedAccountAddress);
  const [accountInput, setAccountInput] = useState(mainnetSharedAccountAddress ?? "");
  const [guardian, setGuardian] = useState("");
  const [agent, setAgent] = useState("");
  const [approver, setApprover] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientEnabled, setRecipientEnabled] = useState(true);
  const [asset, setAsset] = useState<"ETH" | "USDG">("ETH");
  const [perTransaction, setPerTransaction] = useState("0.01");
  const [rolling24h, setRolling24h] = useState("0.05");
  const [approvalAbove, setApprovalAbove] = useState("0.005");
  const [fundAmount, setFundAmount] = useState("0.001");
  const [withdrawAmount, setWithdrawAmount] = useState("0.001");
  const [requestId, setRequestId] = useState("1");
  const [prepared, setPrepared] = useState<PreparedAction>();
  const [metrics, setMetrics] = useState<Metrics>();
  const [status, setStatus] = useState<MainnetStatus>();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastHash, setLastHash] = useState<Hash>();
  const [riskAccepted, setRiskAccepted] = useState(false);

  const isMainnet = connection.chainId === robinhoodMainnet.id;
  const explorer = robinhoodMainnet.blockExplorers.default.url;
  const storageKey = useMemo(
    () => connection.address ? `rulewallet:policy-account:v2:4663:${connection.address.toLowerCase()}` : undefined,
    [connection.address],
  );

  const refresh = useCallback(async () => {
    setError("");
    const statusResponse = await fetch("/api/mainnet/status", { cache: "no-store" });
    if (statusResponse.ok) setStatus(await statusResponse.json());
    if (!publicClient || !accountAddress) return;
    try {
      const [ethBalance, usdgBalance, policyActive, paused, ethPolicy, usdgPolicy, ethRolling, usdgRolling, canonicalStablecoin] =
        await Promise.all([
          publicClient.getBalance({ address: accountAddress }),
          publicClient.readContract({ address: ROBINHOOD_MAINNET_USDG, abi: erc20BalanceAbi, functionName: "balanceOf", args: [accountAddress] }),
          publicClient.readContract({ address: accountAddress, abi: ruleWalletV2Abi, functionName: "policyActive" }),
          publicClient.readContract({ address: accountAddress, abi: ruleWalletV2Abi, functionName: "paused" }),
          publicClient.readContract({ address: accountAddress, abi: ruleWalletV2Abi, functionName: "assetPolicies", args: [zeroAddress] }),
          publicClient.readContract({ address: accountAddress, abi: ruleWalletV2Abi, functionName: "assetPolicies", args: [ROBINHOOD_MAINNET_USDG] }),
          publicClient.readContract({ address: accountAddress, abi: ruleWalletV2Abi, functionName: "rollingSpent", args: [zeroAddress] }),
          publicClient.readContract({ address: accountAddress, abi: ruleWalletV2Abi, functionName: "rollingSpent", args: [ROBINHOOD_MAINNET_USDG] }),
          publicClient.readContract({ address: accountAddress, abi: ruleWalletV2Abi, functionName: "canonicalStablecoin" }),
        ]);
      if (canonicalStablecoin !== ROBINHOOD_MAINNET_USDG) {
        throw new Error("Selected account does not use the official canonical USDG address.");
      }
      setMetrics({ ethBalance, usdgBalance, policyActive, paused, ethPolicy, usdgPolicy, ethRolling, usdgRolling });
    } catch (caught) {
      setError(`Could not read the selected V2 account: ${errorMessage(caught)}`);
    }
  }, [accountAddress, publicClient]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (storageKey && !accountAddress) {
        const saved = window.localStorage.getItem(storageKey);
        if (saved && isAddress(saved)) setAccountAddress(getAddress(saved));
      }
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [accountAddress, refresh, storageKey]);

  function requireWallet() {
    if (!experimentalMainnetUiEnabled) throw new Error("Experimental mainnet UI is disabled by configuration.");
    if (!connection.address || !walletClient.data || !publicClient) throw new Error("Connect an owner wallet first.");
    if (!isMainnet) throw new Error("Switch the wallet to Robinhood Chain mainnet (4663).");
    if (!riskAccepted) throw new Error("Acknowledge the experimental unaudited release before preparing a transaction.");
    return { owner: getAddress(connection.address), wallet: walletClient.data, client: publicClient };
  }

  async function prepareFactoryDeployment() {
    setBusy("prepare-factory"); setError(""); setMessage("");
    try {
      const { owner, client } = requireWallet();
      if (mainnetFactoryAddress) throw new Error("A mainnet factory is already configured. A second deployment is unnecessary.");
      const nonce = await client.getTransactionCount({ address: owner, blockTag: "pending" });
      const plan = buildMainnetFactoryDeployment(owner, BigInt(nonce));
      if (plan.dataHash !== RULEWALLET_FACTORY_INIT_CODE_HASH) {
        throw new Error("Factory init-code checksum mismatch. Deployment is blocked.");
      }
      const existingCode = await client.getBytecode({ address: plan.predictedAddress });
      if (existingCode && existingCode !== "0x") {
        throw new Error(`The predicted address ${plan.predictedAddress} already contains code. Refresh the wallet nonce before continuing.`);
      }
      await client.call({ account: owner, data: plan.data });
      const estimatedGas = await client.estimateGas({ account: owner, data: plan.data });
      setPrepared({
        kind: "factory-deploy",
        title: "Deploy RuleWalletFactory V2",
        to: undefined,
        value: plan.value,
        data: plan.data,
        expectedResult: `Factory ${plan.expectedVersion} at ${plan.predictedAddress}, pinned to chain 4663 and canonical USDG ${plan.canonicalStablecoin}`,
        payload: {
          predicted: plan.predictedAddress,
          nonce: nonce.toString(),
          estimatedGas: estimatedGas.toString(),
          initCodeHash: plan.dataHash,
        },
      });
      setMessage("Factory simulation passed. No transaction was sent. Review the contract-creation payload below.");
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  }

  async function prepareDeployment() {
    setBusy("prepare-deploy"); setError(""); setMessage("");
    try {
      const { owner, client } = requireWallet();
      if (!mainnetFactoryAddress) throw new Error("The V2 factory is not deployed/configured. Follow the mainnet deployment guide first.");
      const [factoryChainId, factoryUsdg, factoryVersion] = await Promise.all([
        client.readContract({ address: mainnetFactoryAddress, abi: ruleWalletFactoryAbi, functionName: "deploymentChainId" }),
        client.readContract({ address: mainnetFactoryAddress, abi: ruleWalletFactoryAbi, functionName: "canonicalStablecoin" }),
        client.readContract({ address: mainnetFactoryAddress, abi: ruleWalletFactoryAbi, functionName: "VERSION" }),
      ]);
      if (factoryChainId !== BigInt(4663) || factoryUsdg !== ROBINHOOD_MAINNET_USDG || factoryVersion !== "2.0.0-experimental") {
        throw new Error("Configured factory does not match the pinned chain, canonical USDG, and V2 version.");
      }
      const roles = [guardian, agent, approver];
      if (!roles.every((value) => isAddress(value))) throw new Error("Enter valid, separate guardian, agent, and approver addresses.");
      const normalized = roles.map((value) => getAddress(value));
      if (new Set([owner.toLowerCase(), ...normalized.map((value) => value.toLowerCase())]).size !== 4) {
        throw new Error("Owner, guardian, agent, and approver must use four separate addresses.");
      }
      const salt = keccak256(stringToHex(`rulewallet-v2:${owner.toLowerCase()}`));
      const args = [normalized[0], normalized[1], [normalized[2]], 1, salt] as const;
      const predicted = await client.readContract({
        address: mainnetFactoryAddress,
        abi: ruleWalletFactoryAbi,
        functionName: "predictAccountAddress",
        args: [owner, ...args],
      });
      await client.simulateContract({
        account: owner,
        address: mainnetFactoryAddress,
        abi: ruleWalletFactoryAbi,
        functionName: "deployAccount",
        args,
      });
      setPrepared({
        kind: "deploy",
        title: "Deploy personal RuleWallet V2 account",
        to: mainnetFactoryAddress,
        value: BigInt(0),
        data: encodeFunctionData({ abi: ruleWalletFactoryAbi, functionName: "deployAccount", args }),
        expectedResult: `A non-upgradeable personal account at ${predicted}`,
        payload: { guardian: normalized[0], agent: normalized[1], approver: normalized[2], salt, predicted },
      });
      setMessage("Simulation passed. No transaction has been sent. Review every field below.");
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  }

  async function prepareRecipient() {
    setBusy("prepare-recipient"); setError(""); setMessage("");
    try {
      const { owner, client } = requireWallet();
      if (!accountAddress || !isAddress(recipient)) throw new Error("Select an account and enter a valid recipient.");
      const normalized = getAddress(recipient);
      const args = [normalized, recipientEnabled] as const;
      await client.simulateContract({ account: owner, address: accountAddress, abi: ruleWalletV2Abi, functionName: "setTrustedRecipient", args });
      setPrepared({ kind: "recipient", title: recipientEnabled ? "Enable trusted recipient" : "Revoke trusted recipient", to: accountAddress, value: BigInt(0), data: encodeFunctionData({ abi: ruleWalletV2Abi, functionName: "setTrustedRecipient", args }), expectedResult: `${normalized} becomes ${recipientEnabled ? "trusted" : "revoked"} for agent transfers`, payload: { recipient: normalized, trusted: recipientEnabled } });
      setMessage("Simulation passed. No permission has changed yet.");
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  }

  async function preparePolicy() {
    setBusy("prepare-policy"); setError(""); setMessage("");
    try {
      const { owner, client } = requireWallet();
      if (!accountAddress) throw new Error("Select a RuleWallet V2 account.");
      const token = asset === "ETH" ? zeroAddress : ROBINHOOD_MAINNET_USDG;
      const perTx = parseUnits(perTransaction, 18);
      const rolling = parseUnits(rolling24h, 18);
      const threshold = approvalAbove.trim() ? parseUnits(approvalAbove, 18) : BigInt(0);
      if (perTx <= 0 || rolling < perTx || (threshold !== BigInt(0) && threshold > perTx)) {
        throw new Error("Limits must be positive; rolling 24h ≥ per transaction and approval threshold ≤ per transaction.");
      }
      const args = [token, true, perTx, rolling, threshold] as const;
      await client.simulateContract({ account: owner, address: accountAddress, abi: ruleWalletV2Abi, functionName: "setAssetPolicy", args });
      setPrepared({ kind: asset === "ETH" ? "eth-policy" : "usdg-policy", title: `Set ${asset} agent limits`, to: accountAddress, value: BigInt(0), data: encodeFunctionData({ abi: ruleWalletV2Abi, functionName: "setAssetPolicy", args }), expectedResult: `${asset}: ${perTransaction} per transaction; ${rolling24h} rolling 24h; ${threshold === BigInt(0) ? "no human threshold" : `approval above ${approvalAbove}`}`, payload: { asset: token, enabled: true, perTransaction, rolling24h, approvalAbove: threshold.toString() } });
      setMessage("Simulation passed. This is a separate owner-signed limit change.");
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  }

  async function prepareFunds(kind: "deposit" | "withdraw") {
    setBusy(`prepare-${kind}`); setError(""); setMessage("");
    try {
      const { owner, client } = requireWallet();
      if (!accountAddress) throw new Error("Select a RuleWallet V2 account.");
      const amount = parseEther(kind === "deposit" ? fundAmount : withdrawAmount);
      if (amount <= 0) throw new Error("Amount must be greater than zero.");
      if (kind === "deposit") {
        await client.estimateGas({ account: owner, to: accountAddress, value: amount });
        setPrepared({ kind, title: "Deposit ETH into your policy account", to: accountAddress, value: amount, data: "0x", expectedResult: `${formatEther(amount)} ETH deposited; no platform balance cap is imposed`, payload: { amountWei: amount.toString() } });
      } else {
        const args = [owner, amount] as const;
        await client.simulateContract({ account: owner, address: accountAddress, abi: ruleWalletV2Abi, functionName: "withdrawNative", args });
        setPrepared({ kind, title: "Owner withdrawal", to: accountAddress, value: BigInt(0), data: encodeFunctionData({ abi: ruleWalletV2Abi, functionName: "withdrawNative", args }), expectedResult: `${formatEther(amount)} ETH returned to owner ${owner}; agent limits do not apply`, payload: { recipient: owner, amountWei: amount.toString() } });
      }
      setMessage("Simulation passed. No funds have moved.");
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  }

  async function preparePause(paused: boolean) {
    setBusy("prepare-pause"); setError(""); setMessage("");
    try {
      const { owner, client } = requireWallet();
      if (!accountAddress) throw new Error("Select a RuleWallet V2 account.");
      const functionName = paused ? "pause" : "unpause";
      await client.simulateContract({ account: owner, address: accountAddress, abi: ruleWalletV2Abi, functionName });
      setPrepared({ kind: functionName, title: paused ? "Emergency pause" : "Owner unpause", to: accountAddress, value: BigInt(0), data: encodeFunctionData({ abi: ruleWalletV2Abi, functionName }), expectedResult: paused ? "All agent execution stops; owner withdrawals remain available" : "Agent execution may resume under the current policies", payload: { paused } });
      setMessage("Simulation passed. The pause state has not changed.");
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  }

  function selectAccount() {
    setError("");
    if (!isAddress(accountInput)) {
      setError("Enter a valid deployed V2 account address.");
      return;
    }
    const selected = getAddress(accountInput);
    setAccountAddress(selected);
    if (storageKey) window.localStorage.setItem(storageKey, selected);
    setMessage("Account selected locally. Live reads will verify its V2 interface.");
  }

  async function prepareRequestAction(kind: "approve" | "execute-approved") {
    setBusy(`prepare-${kind}`); setError(""); setMessage("");
    try {
      const { owner: connected, client } = requireWallet();
      if (!accountAddress || !/^\d+$/.test(requestId)) throw new Error("Select an account and enter a numeric request ID.");
      const id = BigInt(requestId);
      const functionName = kind === "approve" ? "approveRequest" : "executeApprovedRequest";
      const args = [id] as const;
      await client.simulateContract({ account: connected, address: accountAddress, abi: ruleWalletV2Abi, functionName, args });
      setPrepared({ kind, title: kind === "approve" ? `Approve request ${id}` : `Execute approved request ${id}`, to: accountAddress, value: BigInt(0), data: encodeFunctionData({ abi: ruleWalletV2Abi, functionName, args }), expectedResult: kind === "approve" ? "One unique APPROVER_ROLE approval is recorded; hard policies remain binding" : "Request executes only if approvals and every current hard policy pass", payload: { requestId: id.toString() } });
      setMessage("Simulation passed. No approval or transfer has been submitted.");
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  }

  async function signPrepared() {
    if (!prepared) return;
    setBusy("sign"); setError(""); setMessage("Confirm the exact transaction in your wallet.");
    try {
      const { owner, wallet, client } = requireWallet();
      const hash = prepared.to
        ? await wallet.sendTransaction({ account: owner, chain: robinhoodMainnet, to: prepared.to, value: prepared.value, data: prepared.data })
        : await wallet.sendTransaction({ account: owner, chain: robinhoodMainnet, value: prepared.value, data: prepared.data });
      setLastHash(hash);
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 2, timeout: 180_000 });
      if (receipt.status !== "success") throw new Error("The mainnet transaction reverted.");
      if (prepared.kind === "factory-deploy") {
        const predicted = prepared.payload.predicted;
        if (!receipt.contractAddress || typeof predicted !== "string" || receipt.contractAddress.toLowerCase() !== predicted.toLowerCase()) {
          throw new Error("The confirmed factory address does not match the simulated address. Stop and inspect the receipt.");
        }
        setMessage(`Factory confirmed at ${receipt.contractAddress}. RuleWallet must now verify it and publish that address before personal onboarding opens.`);
      } else if (prepared.kind === "deploy") {
        const predicted = prepared.payload.predicted;
        if (typeof predicted === "string" && isAddress(predicted)) {
          const selected = getAddress(predicted);
          setAccountAddress(selected);
          if (storageKey) window.localStorage.setItem(storageKey, selected);
        }
      }
      if (prepared.kind !== "factory-deploy") setMessage("Confirmed on Robinhood Chain mainnet. The Blockscout receipt is linked below.");
      setPrepared(undefined);
      await refresh();
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(""); }
  }

  if (!experimentalMainnetUiEnabled) {
    return <Alert><AlertTriangle /><AlertTitle>Mainnet UI disabled</AlertTitle><AlertDescription>Set NEXT_PUBLIC_ENABLE_EXPERIMENTAL_MAINNET=true only for the explicitly experimental release.</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
      <Alert className="border-red-500/25 bg-red-50 text-red-900">
        <AlertTriangle /><AlertTitle>Experimental, unaudited mainnet software</AlertTitle>
        <AlertDescription className="text-red-800">Real assets can be lost. RuleWallet is not affiliated with Robinhood, is not audited or risk-free, and is not suitable for large balances. Autonomous mainnet execution stays off without a verified non-exportable signer.</AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Network", "Robinhood Chain · 4663"],
          ["Factory", status?.factoryVerifiedOnchain ? "Verified bytecode present" : "Not deployed/configured"],
          ["Secure signer", status?.signer.configured ? `Configured · ${short(status.signer.address!)}` : "Disabled"],
          ["Autonomy", status?.autonomyEnabled ? "Enabled" : "Disabled by safety gate"],
        ].map(([label, value]) => <Card key={label} size="sm"><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-sm text-primary">{value}</CardTitle></CardHeader></Card>)}
      </div>

      {!connection.isConnected ? (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="size-4" /> Connect the owner wallet</CardTitle><CardDescription>Use the header. Never enter a seed phrase or private key into RuleWallet.</CardDescription></CardHeader></Card>
      ) : !isMainnet ? (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Network className="size-4" /> Switch to Robinhood Chain mainnet</CardTitle><CardDescription>Chain ID 4663. This changes only your wallet network and does not send a transaction.</CardDescription></CardHeader><CardContent><Button onClick={() => switchChain.switchChain({ chainId: robinhoodMainnet.id })}><Network /> Switch network</Button></CardContent></Card>
      ) : (
        <>
          <label className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.035] p-4 text-sm">
            <input type="checkbox" checked={riskAccepted} onChange={(event) => setRiskAccepted(event.target.checked)} className="mt-0.5 size-4 accent-red-400" />
            <span>I understand this is unaudited experimental mainnet software, transactions use real assets, and I will review every wallet prompt.</span>
          </label>

          <Card>
            {!mainnetFactoryAddress && <CardContent className="space-y-4 pt-6">
              <div>
                <p className="font-medium">0. Deploy the versioned factory</p>
                <p className="mt-1 text-sm text-muted-foreground">One contract-creation transaction. The app simulates the pinned bytecode and shows the complete init code before MetaMask opens.</p>
              </div>
              <Button onClick={prepareFactoryDeployment} disabled={!riskAccepted || Boolean(busy)}>
                {busy === "prepare-factory" ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
                Simulate factory deployment
              </Button>
              <Alert className="border-amber-300/20 bg-amber-300/[0.04]"><AlertTriangle /><AlertTitle>Real mainnet gas required</AlertTitle><AlertDescription>The connected deployer pays gas but sends 0 ETH to the contract. A successful signature still does not activate autonomous execution.</AlertDescription></Alert>
            </CardContent>}
          </Card>

          <Card>
            <CardHeader><CardTitle>1. Personal account</CardTitle><CardDescription>Factory-deployed, non-upgradeable, owner-controlled. Operational roles must use separate addresses.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row"><Input value={accountInput} onChange={(event) => setAccountInput(event.target.value)} placeholder="0x… existing V2 account" className="font-mono" /><Button variant="outline" onClick={selectAccount}>Use account</Button></div>
              {accountAddress ? <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4"><p className="flex items-center gap-2 text-sm font-medium text-primary"><CheckCircle2 className="size-4" /> Selected V2 account</p><p className="mt-2 break-all font-mono text-xs">{accountAddress}</p></div> : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2"><Label>Guardian address</Label><Input value={guardian} onChange={(event) => setGuardian(event.target.value)} placeholder="0x…" /></div>
                  <div className="space-y-2"><Label>Agent address</Label><Input value={agent} onChange={(event) => setAgent(event.target.value)} placeholder="0x…" /></div>
                  <div className="space-y-2"><Label>Approver address</Label><Input value={approver} onChange={(event) => setApprover(event.target.value)} placeholder="0x…" /></div>
                </div>
              )}
              {!accountAddress && <Button onClick={prepareDeployment} disabled={!riskAccepted || Boolean(busy)}>{busy === "prepare-deploy" ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} Simulate deployment</Button>}
              {!mainnetFactoryAddress && <Alert className="border-amber-300/20 bg-amber-300/[0.04]"><AlertTriangle /><AlertTitle>Factory signature required before onboarding opens</AlertTitle><AlertDescription>The contracts and deployment script are prepared, but no factory address is configured. No mainnet transaction was broadcast by this release process.</AlertDescription></Alert>}
            </CardContent>
          </Card>

          {accountAddress && (
            <>
              <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>Live account monitor</CardTitle><CardDescription className="mt-1">Explorer-backed balances and policy state.</CardDescription></div><Button variant="outline" size="sm" onClick={refresh}><RefreshCw /> Refresh</Button></div></CardHeader><CardContent className="space-y-3 text-sm">
                {metrics ? <><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-grid p-3">ETH balance <b className="float-right font-mono">{formatEther(metrics.ethBalance)}</b></div><div className="rounded-lg border border-grid p-3">USDG balance <b className="float-right font-mono">{formatUnits(metrics.usdgBalance, 18)}</b></div></div><p>{policySummary(metrics.ethPolicy, "ETH")}</p><p>{policySummary(metrics.usdgPolicy, "USDG")}</p><p className="text-muted-foreground">Rolling spent: {formatEther(metrics.ethRolling)} ETH · {formatUnits(metrics.usdgRolling, 18)} USDG · {metrics.paused ? "Paused" : metrics.policyActive ? "Active" : "Inactive"}</p></> : <p className="text-muted-foreground">Load or verify a deployed V2 account to display live state.</p>}
              </CardContent></Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card><CardHeader><CardTitle>2. Trusted recipient</CardTitle><CardDescription>Agents can transfer only to enabled recipients.</CardDescription></CardHeader><CardContent className="space-y-3"><Input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="0x… recipient" /><div className="flex gap-2"><Button variant={recipientEnabled ? "default" : "outline"} onClick={() => setRecipientEnabled(true)}>Enable</Button><Button variant={!recipientEnabled ? "destructive" : "outline"} onClick={() => setRecipientEnabled(false)}>Revoke</Button><Button variant="outline" onClick={prepareRecipient}>Simulate</Button></div></CardContent></Card>
                <Card><CardHeader><CardTitle>3. Mandatory agent limits</CardTitle><CardDescription>Each asset requires its own positive per-transaction and rolling 24-hour limits.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex gap-2"><Button variant={asset === "ETH" ? "default" : "outline"} onClick={() => setAsset("ETH")}>ETH</Button><Button variant={asset === "USDG" ? "default" : "outline"} onClick={() => setAsset("USDG")}>USDG</Button></div><div className="grid gap-3 sm:grid-cols-3"><div><Label>Per transaction</Label><Input value={perTransaction} onChange={(event) => setPerTransaction(event.target.value)} /></div><div><Label>Rolling 24h</Label><Input value={rolling24h} onChange={(event) => setRolling24h(event.target.value)} /></div><div><Label>Approval above</Label><Input value={approvalAbove} onChange={(event) => setApprovalAbove(event.target.value)} placeholder="Blank = optional" /></div></div><Button onClick={preparePolicy}>Simulate {asset} policy</Button></CardContent></Card>
                <Card><CardHeader><CardTitle>4. Owner funds</CardTitle><CardDescription>No platform balance cap or owner withdrawal limit. Wallet balance and network gas still apply.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><Label>Deposit ETH</Label><Input value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} /></div><div><Label>Withdraw ETH</Label><Input value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} /></div></div><div className="flex gap-2"><Button variant="outline" onClick={() => prepareFunds("deposit")}>Simulate deposit</Button><Button variant="outline" onClick={() => prepareFunds("withdraw")}>Simulate withdrawal</Button></div></CardContent></Card>
                <Card><CardHeader><CardTitle>5. Emergency controls</CardTitle><CardDescription>Guardian pauses; owner unpauses. Owner withdrawal remains available while paused.</CardDescription></CardHeader><CardContent className="flex gap-2"><Button variant="destructive" onClick={() => preparePause(true)}><Pause /> Simulate pause</Button><Button variant="outline" onClick={() => preparePause(false)}><Play /> Simulate unpause</Button></CardContent></Card>
                <Card><CardHeader><CardTitle>6. Human approval queue</CardTitle><CardDescription>Approvers record signatures independently. Execution rechecks every hard rule.</CardDescription></CardHeader><CardContent className="space-y-3"><Input value={requestId} onChange={(event) => setRequestId(event.target.value)} inputMode="numeric" placeholder="Onchain request ID" /><div className="flex gap-2"><Button variant="outline" onClick={() => prepareRequestAction("approve")}>Simulate approval</Button><Button variant="outline" onClick={() => prepareRequestAction("execute-approved")}>Simulate execution</Button></div></CardContent></Card>
              </div>
            </>
          )}
        </>
      )}

      {prepared && <Card className="border-primary/25"><CardHeader><CardTitle>Exact transaction preview</CardTitle><CardDescription>Simulation passed. Verify these fields before asking your wallet to sign.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="overflow-hidden rounded-xl border border-grid font-mono text-xs">{[["Chain", "Robinhood Chain mainnet · 4663"], ["Action", prepared.title], ["Contract / recipient", prepared.to ?? "Contract creation (no recipient)"], ["Value", `${formatEther(prepared.value)} ETH`], ["Calldata", prepared.data], ["Expected result", prepared.expectedResult]].map(([key, value]) => <div key={key} className="grid gap-1 border-b border-grid px-4 py-3 last:border-0 sm:grid-cols-[170px_1fr]"><span className="text-muted-foreground">{key}</span><span className="break-all">{value}</span></div>)}</div><div className="flex gap-2"><Button onClick={signPrepared} disabled={busy === "sign"}>{busy === "sign" ? <LoaderCircle className="animate-spin" /> : <Wallet />} Sign exact transaction</Button><Button variant="outline" onClick={() => setPrepared(undefined)}>Cancel</Button></div></CardContent></Card>}

      {(message || error) && <Alert className={error ? "border-red-400/25 bg-red-400/[0.04]" : "border-primary/20 bg-primary/[0.04]"}><AlertTriangle /><AlertTitle>{error ? "Action blocked" : "Status"}</AlertTitle><AlertDescription>{error || message}</AlertDescription>{lastHash && <a href={`${explorer}/tx/${lastHash}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">Open Blockscout receipt <ExternalLink className="size-3" /></a>}</Alert>}
    </div>
  );
}
