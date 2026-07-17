"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Fuel,
  LoaderCircle,
  Network,
  Rocket,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import {
  formatEther,
  isAddress,
  parseEther,
  zeroAddress,
  type Abi,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import {
  useBalance,
  useConnection,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import artifact from "@/generated/rulewallet-policy-account.json";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { robinhoodTestnet } from "@/lib/chains";

const contractAbi = artifact.abi as Abi;
const contractBytecode = artifact.bytecode as Hex;
const storageKey = "rulewallet:testnet-deployment:v1";

type DeploymentRecord = {
  address: Address;
  owner: Address;
  transactionHash: Hash;
};

type Action = "deploy" | "policy" | "target" | "fund";

const setup = {
  maxPerTransaction: parseEther("0.002"),
  maxRolling24Hours: parseEther("0.005"),
  approvalAbove: parseEther("0.001"),
  funding: parseEther("0.001"),
} as const;

function messageFrom(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("User rejected")) return "Transaction rejected in MetaMask.";
    return error.message.split("\n")[0];
  }
  return "The wallet or testnet RPC rejected the transaction.";
}

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function TestnetDeploymentWizard() {
  const connection = useConnection();
  const publicClient = usePublicClient({ chainId: robinhoodTestnet.id });
  const walletClient = useWalletClient({ chainId: robinhoodTestnet.id });
  const switchChain = useSwitchChain();
  const balance = useBalance({
    address: connection.address,
    chainId: robinhoodTestnet.id,
    query: { enabled: Boolean(connection.address) },
  });
  const [confirmed, setConfirmed] = useState(false);
  const [deployment, setDeployment] = useState<DeploymentRecord>();
  const [activeAction, setActiveAction] = useState<Action>();
  const [completed, setCompleted] = useState<Action[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const isTestnet = connection.chainId === robinhoodTestnet.id;
  const isBusy = Boolean(activeAction);
  const explorer = robinhoodTestnet.blockExplorers.default.url;

  useEffect(() => {
    if (!connection.address) return;
    const timeoutId = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (!saved) return;
        const record = JSON.parse(saved) as DeploymentRecord;
        if (
          isAddress(record.address) &&
          isAddress(record.owner) &&
          record.owner.toLowerCase() === connection.address?.toLowerCase()
        ) {
          setDeployment(record);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [connection.address]);

  async function deploy() {
    if (!connection.address || !walletClient.data || !publicClient || !isTestnet) return;
    setActiveAction("deploy");
    setError("");
    try {
      const hash = await walletClient.data.deployContract({
        account: connection.address,
        chain: robinhoodTestnet,
        abi: contractAbi,
        bytecode: contractBytecode,
        args: [
          connection.address,
          connection.address,
          connection.address,
          [connection.address],
          1,
        ],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success" || !receipt.contractAddress) {
        throw new Error("Deployment did not produce a contract address.");
      }
      const record: DeploymentRecord = {
        address: receipt.contractAddress,
        owner: connection.address,
        transactionHash: hash,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(record));
      setDeployment(record);
      setCompleted((current) => [...new Set([...current, "deploy" as const])]);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setActiveAction(undefined);
    }
  }

  async function writeSetup(action: Exclude<Action, "deploy">) {
    if (!deployment || !connection.address || !walletClient.data || !publicClient || !isTestnet) {
      return;
    }
    setActiveAction(action);
    setError("");
    try {
      let hash: Hash;
      if (action === "policy") {
        hash = await walletClient.data.writeContract({
          account: connection.address,
          chain: robinhoodTestnet,
          address: deployment.address,
          abi: contractAbi,
          functionName: "setAssetPolicy",
          args: [
            zeroAddress,
            true,
            setup.maxPerTransaction,
            setup.maxRolling24Hours,
            setup.approvalAbove,
          ],
        });
      } else if (action === "target") {
        hash = await walletClient.data.writeContract({
          account: connection.address,
          chain: robinhoodTestnet,
          address: deployment.address,
          abi: contractAbi,
          functionName: "setTargetAllowed",
          args: [connection.address, true],
        });
      } else {
        hash = await walletClient.data.sendTransaction({
          account: connection.address,
          chain: robinhoodTestnet,
          to: deployment.address,
          value: setup.funding,
        });
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The setup transaction reverted.");
      setCompleted((current) => [...new Set([...current, action])]);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setActiveAction(undefined);
    }
  }

  async function copyAddress() {
    if (!deployment) return;
    await navigator.clipboard.writeText(deployment.address);
    setCopied(true);
  }

  if (!connection.isConnected || !connection.address) {
    return (
      <Card className="border-primary/15 bg-primary/[0.025]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="size-4 text-primary" /> Connect MetaMask</CardTitle>
          <CardDescription>Use the Connect wallet button in the header. Never enter a seed phrase here.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isTestnet) {
    return (
      <Card className="border-amber-300/20 bg-amber-300/[0.035]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Network className="size-4 text-amber-200" /> Switch network</CardTitle>
          <CardDescription>This deployment is locked to Robinhood Chain Testnet, chain ID 46630.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => switchChain.switchChain({ chainId: robinhoodTestnet.id })}>
            <Network /> Switch to testnet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>1. Deploy the policy account</CardTitle>
              <CardDescription className="mt-1">One MetaMask transaction. No private key leaves your wallet.</CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/25 text-primary">Chain 46630</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-xl border border-grid bg-background/40 p-4 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Connected signer</p><p className="mt-1 font-mono">{shortAddress(connection.address)}</p></div>
            <div><p className="text-xs text-muted-foreground">Testnet balance</p><p className="mt-1 font-mono">{balance.data ? `${formatEther(balance.data.value)} ETH` : "Loading…"}</p></div>
            <div><p className="text-xs text-muted-foreground">Initial roles</p><p className="mt-1">Admin · guardian · agent · approver</p></div>
            <div><p className="text-xs text-muted-foreground">Approval threshold</p><p className="mt-1">1 of 1</p></div>
          </div>

          <Alert className="border-amber-300/20 bg-amber-300/[0.04] text-amber-100">
            <ShieldAlert />
            <AlertTitle>Single-wallet demo configuration</AlertTitle>
            <AlertDescription className="text-amber-100/70">Suitable only for this testnet launch. Use separate agent and guardian addresses plus a multisig before meaningful value.</AlertDescription>
          </Alert>

          {!deployment && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-grid p-4 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-emerald-400" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>I confirm this is testnet ETH and accept assigning all initial roles to the connected address.</span>
            </label>
          )}

          {deployment ? (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.045] p-4">
              <p className="flex items-center gap-2 font-medium text-primary"><CheckCircle2 className="size-4" /> Contract deployed</p>
              <p className="mt-3 break-all font-mono text-xs">{deployment.address}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={copyAddress}><Copy /> {copied ? "Copied" : "Copy address"}</Button>
                <Button asChild variant="outline" size="sm"><a href={`${explorer}/address/${deployment.address}`} target="_blank" rel="noreferrer">Explorer <ExternalLink /></a></Button>
                <Button asChild variant="outline" size="sm"><a href={`${explorer}/tx/${deployment.transactionHash}`} target="_blank" rel="noreferrer">Deployment tx <ExternalLink /></a></Button>
              </div>
            </div>
          ) : (
            <Button type="button" size="lg" disabled={!confirmed || isBusy} onClick={deploy}>
              {activeAction === "deploy" ? <LoaderCircle className="animate-spin" /> : <Rocket />}
              {activeAction === "deploy" ? "Waiting for confirmation…" : "Deploy with MetaMask"}
            </Button>
          )}
        </CardContent>
      </Card>

      {deployment && (
        <Card>
          <CardHeader>
            <CardTitle>2. Safe demo setup</CardTitle>
            <CardDescription>Approve each transparent transaction separately. These values can be changed later by the admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { id: "policy" as const, title: "Set native ETH limits", detail: "0.002 ETH per call · 0.005 ETH per 24h · approval above 0.001 ETH" },
              { id: "target" as const, title: "Allow your address as canary target", detail: shortAddress(connection.address) },
              { id: "fund" as const, title: "Fund the policy account", detail: "Deposit 0.001 testnet ETH" },
            ].map((item) => {
              const done = completed.includes(item.id);
              return (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-grid p-4">
                  <div><p className="flex items-center gap-2 font-medium">{done ? <CheckCircle2 className="size-4 text-primary" /> : <Fuel className="size-4 text-muted-foreground" />}{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div>
                  <Button type="button" variant={done ? "outline" : "default"} disabled={done || isBusy} onClick={() => writeSetup(item.id)}>
                    {activeAction === item.id ? <LoaderCircle className="animate-spin" /> : done ? <CheckCircle2 /> : <Wallet />}
                    {activeAction === item.id ? "Confirming…" : done ? "Complete" : "Approve"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive"><ShieldAlert /><AlertTitle>Transaction not completed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      )}
    </div>
  );
}
