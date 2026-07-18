"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Check,
  ExternalLink,
  LoaderCircle,
  Network,
  Plus,
  RotateCcw,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { getAddress, isAddress, type Hash } from "viem";
import { useConnection, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { usePolicyAccount } from "@/components/policy-account-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { robinhoodTestnet } from "@/lib/chains";
import {
  addressBookStorageKey,
  parseAddressBook,
  upsertAddressBookEntry,
  type AddressBookEntry,
} from "@/lib/policy-account";
import { ruleWalletAbi } from "@/lib/rulewallet-contract";
import { ecosystemServices } from "@/lib/service-catalog";
import type { EcosystemService } from "@/lib/service-catalog";

type PreparedChange = AddressBookEntry & { enabled: boolean };

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("user rejected")) {
      return "The wallet signature was rejected. No permission changed.";
    }
    return error.message.split("\n")[0].replace("ContractFunctionExecutionError: ", "");
  }
  return "The wallet or Robinhood Chain testnet RPC rejected this request.";
}

function EcosystemDirectoryCard({
  onSelect,
}: {
  onSelect?: (service: EcosystemService) => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Robinhood Chain ecosystem</CardTitle><CardDescription>Officially documented services for discovery. One-click contract permissions remain blocked until RuleWallet ships audited, selector-limited adapters.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ecosystemServices.map((service) => <div key={service.id} className="flex flex-col rounded-xl border border-grid bg-background/35 p-4"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline">{service.category}</Badge><h3 className="mt-3 font-medium">{service.name}</h3></div><a href={service.website} target="_blank" rel="noreferrer" aria-label={`Open ${service.name}`} className="text-muted-foreground hover:text-primary"><ExternalLink className="size-4" /></a></div><p className="mt-2 flex-1 text-xs leading-5 text-muted-foreground">{service.description}</p><div className="mt-4 flex gap-2">{onSelect && <Button type="button" variant="outline" size="sm" onClick={() => onSelect(service)}>Use label</Button>}<Button asChild variant="ghost" size="sm"><a href={service.source} target="_blank" rel="noreferrer">Verify source</a></Button></div></div>)}
      </CardContent>
    </Card>
  );
}

export function ServiceDirectory() {
  const connection = useConnection();
  const publicClient = usePublicClient({ chainId: robinhoodTestnet.id });
  const walletClient = useWalletClient({ chainId: robinhoodTestnet.id });
  const switchChain = useSwitchChain();
  const policyAccount = usePolicyAccount();
  const [policyInput, setPolicyInput] = useState("");
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [source, setSource] = useState("");
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isAdmin, setIsAdmin] = useState<boolean>();
  const [prepared, setPrepared] = useState<PreparedChange>();
  const [status, setStatus] = useState<"idle" | "checking" | "signing" | "confirming" | "confirmed" | "error">("idle");
  const [message, setMessage] = useState("");
  const [hash, setHash] = useState<Hash>();

  const isTestnet = connection.chainId === robinhoodTestnet.id;
  const storageKey = useMemo(() => {
    if (!connection.address || !policyAccount.address) return undefined;
    return addressBookStorageKey(
      getAddress(connection.address),
      policyAccount.address,
      robinhoodTestnet.id,
    );
  }, [connection.address, policyAccount.address]);

  const checkAdmin = useCallback(async () => {
    if (!publicClient || !policyAccount.address || !connection.address) {
      setIsAdmin(undefined);
      return false;
    }
    try {
      const role = await publicClient.readContract({
        address: policyAccount.address,
        abi: ruleWalletAbi,
        functionName: "DEFAULT_ADMIN_ROLE",
      });
      const allowed = await publicClient.readContract({
        address: policyAccount.address,
        abi: ruleWalletAbi,
        functionName: "hasRole",
        args: [role, connection.address],
      });
      setIsAdmin(allowed);
      return allowed;
    } catch {
      setIsAdmin(false);
      return false;
    }
  }, [connection.address, policyAccount.address, publicClient]);

  const refreshPermissions = useCallback(async (nextEntries: AddressBookEntry[]) => {
    if (!publicClient || !policyAccount.address) return;
    const selectedPolicyAccount = policyAccount.address;
    const results = await Promise.all(
      nextEntries.map(async (entry) => {
        try {
          const allowed = await publicClient.readContract({
            address: selectedPolicyAccount,
            abi: ruleWalletAbi,
            functionName: "allowedTargets",
            args: [entry.address],
          });
          return [entry.address.toLowerCase(), allowed] as const;
        } catch {
          return [entry.address.toLowerCase(), false] as const;
        }
      }),
    );
    setPermissions(Object.fromEntries(results));
  }, [policyAccount.address, publicClient]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextEntries = parseAddressBook(storageKey ? window.localStorage.getItem(storageKey) : null);
      setEntries(nextEntries);
      setPolicyInput(policyAccount.address ?? "");
      setPrepared(undefined);
      void checkAdmin();
      void refreshPermissions(nextEntries);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [checkAdmin, policyAccount.address, refreshPermissions, storageKey]);

  async function selectPolicyAccount() {
    setPrepared(undefined);
    setMessage("");
    if (!connection.address || !publicClient || !isAddress(policyInput)) {
      setStatus("error");
      setMessage("Enter a valid deployed policy-account address.");
      return;
    }
    setStatus("checking");
    try {
      const address = getAddress(policyInput);
      const bytecode = await publicClient.getBytecode({ address });
      if (!bytecode || bytecode === "0x") throw new Error("No contract is deployed at this address.");
      const role = await publicClient.readContract({
        address,
        abi: ruleWalletAbi,
        functionName: "DEFAULT_ADMIN_ROLE",
      });
      const ownsAdmin = await publicClient.readContract({
        address,
        abi: ruleWalletAbi,
        functionName: "hasRole",
        args: [role, connection.address],
      });
      if (!ownsAdmin) throw new Error("The connected wallet is not an admin of this policy account.");
      policyAccount.selectPolicyAccount(address);
      setIsAdmin(true);
      setStatus("idle");
      setMessage("Personal policy account selected on this device.");
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  async function prepareChange(entry: AddressBookEntry, enabled: boolean) {
    setPrepared(undefined);
    setHash(undefined);
    setMessage("");
    if (!connection.address || !publicClient || !policyAccount.address || !isTestnet) return;
    setStatus("checking");
    try {
      if (!(await checkAdmin())) {
        throw new Error("Only the policy-account admin can change trusted addresses.");
      }
      await publicClient.simulateContract({
        address: policyAccount.address,
        abi: ruleWalletAbi,
        functionName: "setTargetAllowed",
        args: [entry.address, enabled],
        account: connection.address,
      });
      setPrepared({ ...entry, enabled });
      setStatus("idle");
      setMessage("Onchain simulation passed. Review the exact permission before signing.");
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  async function prepareCustom() {
    if (!publicClient || !isAddress(target) || !label.trim()) {
      setStatus("error");
      setMessage("Enter a label and a valid EVM address.");
      return;
    }
    const address = getAddress(target);
    const bytecode = await publicClient.getBytecode({ address });
    await prepareChange(
      {
        address,
        label: label.trim().slice(0, 80),
        kind: bytecode && bytecode !== "0x" ? "contract" : "wallet",
        source: source || undefined,
        createdAt: new Date().toISOString(),
      },
      true,
    );
  }

  async function signChange() {
    if (!prepared || !walletClient.data || !publicClient || !connection.address || !policyAccount.address) return;
    setStatus("signing");
    setMessage("Confirm this permission change in your wallet.");
    try {
      const transactionHash = await walletClient.data.writeContract({
        account: connection.address,
        chain: robinhoodTestnet,
        address: policyAccount.address,
        abi: ruleWalletAbi,
        functionName: "setTargetAllowed",
        args: [prepared.address, prepared.enabled],
      });
      setHash(transactionHash);
      setStatus("confirming");
      setMessage("Permission submitted. Waiting for testnet confirmation.");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
      if (receipt.status !== "success") throw new Error("The permission transaction reverted.");

      const nextEntries = upsertAddressBookEntry(entries, prepared);
      if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify(nextEntries));
      setEntries(nextEntries);
      setPermissions((current) => ({
        ...current,
        [prepared.address.toLowerCase()]: prepared.enabled,
      }));
      setStatus("confirmed");
      setMessage(prepared.enabled ? "Trusted address enabled onchain." : "Trusted address disabled onchain.");
      setPrepared(undefined);
      if (prepared.enabled) {
        setLabel("");
        setTarget("");
        setSource("");
      }
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  if (!connection.isConnected || !connection.address) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/15 bg-primary/[0.025]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="size-4 text-primary" /> Connect your admin wallet</CardTitle>
            <CardDescription>Labels stay on this device; the enabled address is enforced by your policy contract.</CardDescription>
          </CardHeader>
        </Card>
        <EcosystemDirectoryCard />
      </div>
    );
  }

  if (!isTestnet) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-300/20 bg-amber-300/[0.035]">
          <CardHeader><CardTitle className="flex items-center gap-2"><Network className="size-4" /> Testnet safety gate</CardTitle><CardDescription>Mainnet writes remain disabled until audit and production controls are complete.</CardDescription></CardHeader>
          <CardContent><Button onClick={() => switchChain.switchChain({ chainId: robinhoodTestnet.id })}><Network /> Switch to chain 46630</Button></CardContent>
        </Card>
        <EcosystemDirectoryCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle>Your policy account</CardTitle><CardDescription className="mt-1">Choose a contract controlled by this wallet. The selection is stored only in this browser.</CardDescription></div>
            <Badge variant="outline" className={isAdmin ? "border-primary/25 text-primary" : "border-amber-500/25 text-amber-800"}>{isAdmin ? "Admin verified" : "Admin not verified"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input aria-label="Policy account address" value={policyInput} onChange={(event) => setPolicyInput(event.target.value)} className="font-mono" placeholder="0x… policy account" />
            <Button type="button" variant="outline" onClick={selectPolicyAccount} disabled={status === "checking"}>{status === "checking" ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} Verify and use</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Current: {policyAccount.address ? shortAddress(policyAccount.address) : "none"}</span>
            <span>·</span><span>{policyAccount.source === "personal" ? "Personal contract" : "Shared public demo"}</span>
            {policyAccount.source === "personal" && <Button type="button" variant="ghost" size="sm" onClick={policyAccount.useDemoAccount}><RotateCcw /> Use demo instead</Button>}
          </div>
          {policyAccount.source !== "personal" && <Alert className="border-amber-300/20 bg-amber-300/[0.04]"><AlertTriangle /><AlertTitle>Shared demo is read-only for most users</AlertTitle><AlertDescription><Link href="/app/deploy" className="text-foreground underline">Deploy your own policy account</Link> to manage personal addresses.</AlertDescription></Alert>}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader><CardTitle>Add a trusted address</CardTitle><CardDescription>For recipient wallets and canary contracts you personally verify.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="contact-label">Label</Label><Input id="contact-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Treasury, payroll, cold wallet…" /></div>
            <div className="space-y-2"><Label htmlFor="contact-address">EVM address</Label><Input id="contact-address" value={target} onChange={(event) => setTarget(event.target.value)} className="font-mono" placeholder="0x…" /></div>
            {source && <p className="text-xs text-muted-foreground">Service context: {source}</p>}
            <Button type="button" onClick={prepareCustom} disabled={!isAdmin || status === "checking"}><Plus /> Preview permission</Button>
            <p className="text-xs leading-5 text-muted-foreground">RuleWallet checks deployed bytecode and shows whether the target is a wallet or contract. A label is not proof of identity.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Exact permission preview</CardTitle><CardDescription>No transaction is sent until you approve this preview in your wallet.</CardDescription></CardHeader>
          <CardContent>
            {prepared ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-primary/15 bg-background/50 font-mono text-xs">
                  {[
                    ["Network", `Robinhood testnet · ${robinhoodTestnet.id}`],
                    ["Policy account", policyAccount.address ?? "Not selected"],
                    ["Target", prepared.address],
                    ["Detected type", prepared.kind],
                    ["Permission", prepared.enabled ? "ALLOW" : "REVOKE"],
                    ["Scope", "Native calls and token-transfer recipient"],
                  ].map(([key, value]) => <div key={key} className="grid gap-1 border-b border-grid px-4 py-3 last:border-0 sm:grid-cols-[140px_1fr]"><span className="text-muted-foreground">{key}</span><span className="break-all">{value}</span></div>)}
                </div>
                <Alert className="border-amber-300/20 bg-amber-300/[0.04]"><AlertTriangle /><AlertTitle>{prepared.kind === "contract" ? "Contract target: elevated risk" : "Verify the recipient"}</AlertTitle><AlertDescription>{prepared.kind === "contract" ? "The current contract does not constrain function selectors. Use only a contract you fully understand; DeFi routers require an audited adapter." : "Compare the complete address using a second trusted channel before signing."}</AlertDescription></Alert>
                <Button type="button" onClick={signChange} disabled={status === "signing" || status === "confirming"}>{status === "signing" || status === "confirming" ? <LoaderCircle className="animate-spin" /> : <Wallet />} Sign permission change</Button>
              </div>
            ) : <div className="rounded-xl border border-dashed border-grid p-8 text-center text-sm text-muted-foreground">Prepare a new address or change an existing permission.</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>My trusted addresses</CardTitle><CardDescription>Onchain permission status with private labels stored locally in this browser.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {entries.length === 0 ? <div className="rounded-xl border border-dashed border-grid p-8 text-center text-sm text-muted-foreground">No saved addresses yet.</div> : entries.map((entry) => {
            const enabled = permissions[entry.address.toLowerCase()] ?? false;
            return <div key={entry.address} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-grid p-4"><div className="min-w-0"><p className="flex items-center gap-2 font-medium">{entry.kind === "contract" ? <Building2 className="size-4 text-amber-700" /> : <UserRound className="size-4 text-primary" />}{entry.label}<Badge variant="outline" className={enabled ? "border-primary/25 text-primary" : "text-muted-foreground"}>{enabled ? "Allowed" : "Disabled"}</Badge></p><p className="mt-2 break-all font-mono text-xs text-muted-foreground">{entry.address}</p></div><Button type="button" variant="outline" onClick={() => prepareChange(entry, !enabled)}>{enabled ? <X /> : <Check />}{enabled ? "Disable" : "Enable"}</Button></div>;
          })}
        </CardContent>
      </Card>

      <EcosystemDirectoryCard onSelect={(service) => { setLabel(service.name); setTarget(""); setSource(service.source); }} />

      {message && <Alert className={status === "error" ? "border-red-400/25 bg-red-50" : "border-primary/20 bg-primary/[0.04]"}>{status === "error" ? <X className="text-red-700" /> : status === "confirmed" ? <Check className="text-primary" /> : <LoaderCircle className={status === "confirming" ? "animate-spin text-primary" : "text-primary"} />}<AlertTitle>{status === "error" ? "Change blocked" : status === "confirmed" ? "Permission confirmed" : "Permission status"}</AlertTitle><AlertDescription>{message}</AlertDescription>{hash && <a href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${hash}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">View transaction <ExternalLink className="size-3" /></a>}</Alert>}
    </div>
  );
}
