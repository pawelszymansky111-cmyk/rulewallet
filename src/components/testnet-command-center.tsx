"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Check,
  ExternalLink,
  FileSignature,
  LoaderCircle,
  Network,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import {
  formatEther,
  isAddress,
  parseEther,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { useConnection, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { robinhoodTestnet } from "@/lib/chains";
import { usePolicyAccount } from "@/components/policy-account-provider";
import {
  nativeAssetAddress,
  ruleWalletAbi,
} from "@/lib/rulewallet-contract";

type ContractSnapshot = {
  active: boolean;
  paused: boolean;
  nonce: bigint;
  rollingSpent: bigint;
  minimumApprovals: number;
  nativePolicy: {
    allowed: boolean;
    maxPerTransaction: bigint;
    maxRolling24Hours: bigint;
    approvalAbove: bigint;
  };
};

type PreparedCall = {
  target: `0x${string}`;
  value: bigint;
  slippageBps: number;
  deadline: bigint;
  nonce: bigint;
  requiresApproval: boolean;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.split("\n")[0].replace("ContractFunctionExecutionError: ", "");
  }
  return "The wallet or testnet RPC rejected the request.";
}

export function TestnetCommandCenter() {
  const policyAccount = usePolicyAccount();
  const policyAccountAddress = policyAccount.address;
  const connection = useConnection();
  const publicClient = usePublicClient({ chainId: robinhoodTestnet.id });
  const walletClient = useWalletClient({ chainId: robinhoodTestnet.id });
  const switchChain = useSwitchChain();
  const [snapshot, setSnapshot] = useState<ContractSnapshot>();
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [slippageBps, setSlippageBps] = useState("0");
  const [prepared, setPrepared] = useState<PreparedCall>();
  const [status, setStatus] = useState<
    "idle" | "reading" | "simulating" | "signing" | "confirming" | "confirmed" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [hash, setHash] = useState<Hash>();
  const [receipt, setReceipt] = useState<TransactionReceipt>();
  const [approvalRequestId, setApprovalRequestId] = useState("");

  const isTestnet = connection.chainId === robinhoodTestnet.id;
  const explorerUrl = hash
    ? `${robinhoodTestnet.blockExplorers.default.url}/tx/${hash}`
    : undefined;

  const refreshContract = useCallback(async () => {
    if (!publicClient || !policyAccountAddress || !connection.address) return;
    setStatus("reading");
    try {
      const [active, paused, nonce, rollingSpent, minimumApprovals, nativePolicy] =
        await Promise.all([
          publicClient.readContract({
            address: policyAccountAddress,
            abi: ruleWalletAbi,
            functionName: "policyActive",
          }),
          publicClient.readContract({
            address: policyAccountAddress,
            abi: ruleWalletAbi,
            functionName: "paused",
          }),
          publicClient.readContract({
            address: policyAccountAddress,
            abi: ruleWalletAbi,
            functionName: "nextNonce",
            args: [connection.address],
          }),
          publicClient.readContract({
            address: policyAccountAddress,
            abi: ruleWalletAbi,
            functionName: "rollingSpent",
            args: [nativeAssetAddress],
          }),
          publicClient.readContract({
            address: policyAccountAddress,
            abi: ruleWalletAbi,
            functionName: "minimumApprovals",
          }),
          publicClient.readContract({
            address: policyAccountAddress,
            abi: ruleWalletAbi,
            functionName: "assetPolicies",
            args: [nativeAssetAddress],
          }),
        ]);
      setSnapshot({
        active,
        paused,
        nonce,
        rollingSpent,
        minimumApprovals,
        nativePolicy: {
          allowed: nativePolicy[0],
          maxPerTransaction: nativePolicy[1],
          maxRolling24Hours: nativePolicy[2],
          approvalAbove: nativePolicy[3],
        },
      });
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }, [connection.address, policyAccountAddress, publicClient]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshContract();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshContract]);

  const previewRows = useMemo(() => {
    if (!prepared) return [];
    return [
      ["Network", `Robinhood testnet · ${robinhoodTestnet.id}`],
      ["Policy account", policyAccountAddress ?? "Not configured"],
      ["Target", prepared.target],
      ["Value", `${formatEther(prepared.value)} ETH`],
      ["Calldata", "0x (empty native transfer)"],
      ["Nonce", prepared.nonce.toString()],
      ["Expires", new Date(Number(prepared.deadline) * 1000).toISOString()],
      [
        "Path",
        prepared.requiresApproval
          ? `${snapshot?.minimumApprovals ?? 0} human approvals`
          : "Direct policy execution",
      ],
    ];
  }, [policyAccountAddress, prepared, snapshot?.minimumApprovals]);

  async function simulate() {
    if (!publicClient || !policyAccountAddress || !connection.address || !snapshot) return;
    setMessage("");
    setHash(undefined);
    setReceipt(undefined);
    setPrepared(undefined);

    if (!isAddress(target)) {
      setStatus("error");
      setMessage("Enter a valid EVM target address.");
      return;
    }

    let value: bigint;
    try {
      value = parseEther(amount);
    } catch {
      setStatus("error");
      setMessage("Enter a valid ETH amount.");
      return;
    }

    const parsedSlippage = Number(slippageBps);
    if (!Number.isInteger(parsedSlippage) || parsedSlippage < 0 || parsedSlippage > 10_000) {
      setStatus("error");
      setMessage("Slippage must be an integer between 0 and 10,000 basis points.");
      return;
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60);
    const call: PreparedCall = {
      target,
      value,
      slippageBps: parsedSlippage,
      deadline,
      nonce: snapshot.nonce,
      requiresApproval: value > snapshot.nativePolicy.approvalAbove,
    };

    setStatus("simulating");
    try {
      await publicClient.simulateContract({
        address: policyAccountAddress,
        abi: ruleWalletAbi,
        functionName: "requestNativeCall",
        args: [
          call.target,
          call.value,
          "0x",
          call.slippageBps,
          call.deadline,
          call.nonce,
        ],
        account: connection.address,
      });
      setPrepared(call);
      setStatus("idle");
      setMessage(
        "Simulation passed against current onchain state. Review every field before signing.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  async function signPreparedCall() {
    if (
      !prepared ||
      !walletClient.data ||
      !publicClient ||
      !policyAccountAddress ||
      !connection.address
    ) return;
    setStatus("signing");
    setMessage("Confirm the exact testnet transaction in your wallet.");
    try {
      const transactionHash = await walletClient.data.writeContract({
        account: connection.address,
        chain: robinhoodTestnet,
        address: policyAccountAddress,
        abi: ruleWalletAbi,
        functionName: "requestNativeCall",
        args: [
          prepared.target,
          prepared.value,
          "0x",
          prepared.slippageBps,
          prepared.deadline,
          prepared.nonce,
        ],
      });
      setHash(transactionHash);
      setStatus("confirming");
      setMessage("Transaction submitted. Waiting for Robinhood Chain confirmation.");
      const confirmedReceipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      });
      setReceipt(confirmedReceipt);
      setStatus("confirmed");
      setMessage(
        prepared.requiresApproval
          ? "Request recorded onchain and routed to the human approval queue."
          : "Policy-enforced transaction confirmed on Robinhood Chain testnet.",
      );
      await refreshContract();
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  async function submitApproval(action: "approve" | "execute") {
    if (!walletClient.data || !publicClient || !policyAccountAddress || !connection.address) return;
    let requestId: bigint;
    try {
      requestId = BigInt(approvalRequestId);
    } catch {
      setStatus("error");
      setMessage("Enter a numeric request ID.");
      return;
    }
    setStatus("signing");
    try {
      const transactionHash =
        action === "approve"
          ? await walletClient.data.writeContract({
              account: connection.address,
              chain: robinhoodTestnet,
              address: policyAccountAddress,
              abi: ruleWalletAbi,
              functionName: "approveRequest",
              args: [requestId],
            })
          : await walletClient.data.writeContract({
              account: connection.address,
              chain: robinhoodTestnet,
              address: policyAccountAddress,
              abi: ruleWalletAbi,
              functionName: "executeApprovedRequest",
              args: [requestId],
            });
      setHash(transactionHash);
      setStatus("confirming");
      const confirmedReceipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      });
      setReceipt(confirmedReceipt);
      setStatus("confirmed");
      setMessage(
        action === "approve"
          ? "Human approval recorded onchain."
          : "Approved request executed onchain.",
      );
      await refreshContract();
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  if (!connection.isConnected) {
    return (
      <Card className="border-primary/15 bg-primary/[0.025]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" /> Testnet command center
          </CardTitle>
          <CardDescription>
            Connect a wallet to inspect the configured policy account and simulate exact calls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/15 bg-primary/[0.04]">
            <ShieldCheck className="text-primary" />
            <AlertTitle>Wallet signature required</AlertTitle>
            <AlertDescription>
              The application cannot sign, hold keys, or move funds without an explicit wallet confirmation.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!isTestnet) {
    return (
      <Card className="border-amber-300/20 bg-amber-300/[0.035]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="size-4 text-amber-700" /> Wrong network
          </CardTitle>
          <CardDescription>RuleWallet only exposes Robinhood Chain testnet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={() => switchChain.switchChain({ chainId: robinhoodTestnet.id })}
          >
            <Network /> Switch to chain 46630
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!policyAccountAddress) {
    return (
      <Card className="border-amber-300/20 bg-amber-300/[0.035]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-700" /> Contract deployment gate
          </CardTitle>
          <CardDescription>
            The audited-library contract build is ready, but no testnet address is configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Deploy through a hardware wallet or interactive signer, verify the source on Blockscout,
            then set <code className="font-mono text-foreground">NEXT_PUBLIC_RULEWALLET_TESTNET_ADDRESS</code>.
          </p>
          <p>This gate prevents the interface from pretending a local simulation is an onchain policy.</p>
          <Button asChild>
            <Link href="/app/deploy"><Wallet /> Deploy on testnet</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Policy", snapshot?.active && !snapshot.paused ? "Active" : "Stopped"],
          ["Native 24h", snapshot ? `${formatEther(snapshot.rollingSpent)} ETH` : "Loading"],
          ["Agent nonce", snapshot?.nonce.toString() ?? "Loading"],
          ["Approvals", snapshot ? `${snapshot.minimumApprovals} required` : "Loading"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-primary/10 bg-card/70 p-4">
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              {label}
            </p>
            <p className="mt-2 text-sm font-medium text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Propose native transfer</CardTitle>
                <CardDescription className="mt-1">
                  Simulation occurs against current contract state before the wallet can sign.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/25 text-primary">
                Chain 46630
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="execution-target">Target address</Label>
              <Input
                id="execution-target"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  setPrepared(undefined);
                }}
                placeholder="0x… allowlisted recipient"
                className="font-mono"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="execution-amount">Amount in testnet ETH</Label>
                <Input
                  id="execution-amount"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setPrepared(undefined);
                  }}
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="execution-slippage">Declared slippage (bps)</Label>
                <Input
                  id="execution-slippage"
                  value={slippageBps}
                  onChange={(event) => {
                    setSlippageBps(event.target.value);
                    setPrepared(undefined);
                  }}
                  inputMode="numeric"
                />
                <p className="text-[11px] text-muted-foreground">
                  Metadata gate only; swaps remain disabled.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={simulate}
              disabled={!snapshot || status === "simulating" || status === "reading"}
            >
              {status === "simulating" ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Activity />
              )}{" "}
              Simulate onchain
            </Button>

            {previewRows.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-primary/10 bg-background/60 font-mono text-xs">
                {previewRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid gap-1 border-b border-grid px-4 py-3 last:border-0 sm:grid-cols-[130px_1fr]"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="break-all text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {prepared && (
              <Button
                type="button"
                className="bg-primary text-primary-foreground"
                onClick={signPreparedCall}
                disabled={status === "signing" || status === "confirming"}
              >
                {status === "signing" || status === "confirming" ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <FileSignature />
                )}{" "}
                Sign exact testnet call
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Human approval queue</CardTitle>
            <CardDescription>
              Approvers sign independently; approvals cannot override a failed hard rule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approval-request-id">Onchain request ID</Label>
              <Input
                id="approval-request-id"
                value={approvalRequestId}
                onChange={(event) => setApprovalRequestId(event.target.value)}
                inputMode="numeric"
                placeholder="1"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => submitApproval("approve")}>
                <Check /> Record approval
              </Button>
              <Button type="button" variant="outline" onClick={() => submitApproval("execute")}>
                <ArrowUpRight /> Execute approved
              </Button>
            </div>
            <div className="rounded-xl border border-grid bg-background/45 p-4 text-xs leading-6 text-muted-foreground">
              The wallet must hold <span className="text-foreground">APPROVER_ROLE</span> to approve.
              Execution remains blocked until the configured threshold is reached and every policy
              limit still passes.
            </div>
          </CardContent>
        </Card>
      </div>

      {message && (
        <Alert
          className={
            status === "error"
              ? "border-red-400/25 bg-red-400/[0.04]"
              : "border-primary/20 bg-primary/[0.04]"
          }
        >
          {status === "error" ? (
            <X className="text-red-700" />
          ) : status === "confirmed" ? (
            <Check className="text-primary" />
          ) : (
            <LoaderCircle
              className={status === "confirming" ? "animate-spin text-primary" : "text-primary"}
            />
          )}
          <AlertTitle>
            {status === "error"
              ? "Request blocked"
              : status === "confirmed"
                ? "Confirmed"
                : "Transaction status"}
          </AlertTitle>
          <AlertDescription>{message}</AlertDescription>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View transaction <ExternalLink className="size-3" />
            </a>
          )}
          {receipt && (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              Block {receipt.blockNumber.toString()} · status {receipt.status}
            </p>
          )}
        </Alert>
      )}
    </div>
  );
}
