"use client";

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  LoaderCircle,
  Network,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  stringToHex,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { useEffect, useState } from "react";
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

type DeploymentPreview = {
  chainId: 4663 | 46630;
  factory: Address;
  predictedAccount: Address;
  guardian: Address;
  agent: Address;
  approver: Address;
  salt: Hex;
  calldata: Hex;
  name: string;
};

type DeploymentResult = DeploymentPreview & { transactionHash: Hash };

function shortAddress(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function message(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("User rejected")) return "The wallet signature was rejected.";
    return error.message.split("\n")[0];
  }
  return "The deployment request failed.";
}

export function V3AccountManager({
  initialChainId = 46630,
  onAccountCreated,
}: {
  initialChainId?: 4663 | 46630;
  onAccountCreated?: (account: Address) => void;
}) {
  const connection = useAccount();
  const [selectedChainId, setSelectedChainId] = useState<4663 | 46630>(initialChainId);
  const publicClient = usePublicClient({ chainId: selectedChainId });
  const walletClient = useWalletClient({ chainId: selectedChainId });
  const { switchChainAsync } = useSwitchChain();
  const [name, setName] = useState("Everyday spending");
  const [guardian, setGuardian] = useState("");
  const [agent, setAgent] = useState("");
  const [approver, setApprover] = useState("");
  const [preview, setPreview] = useState<DeploymentPreview>();
  const [result, setResult] = useState<DeploymentResult>();
  const [busy, setBusy] = useState<"preview" | "deploy">();
  const [error, setError] = useState<string>();
  const [embeddedRoleWallets, setEmbeddedRoleWallets] = useState<string[]>([]);

  const isMainnet = selectedChainId === robinhoodMainnet.id;
  const factory = isMainnet ? mainnetFactoryV3Address : testnetFactoryV3Address;
  const stablecoin = isMainnet ? ROBINHOOD_MAINNET_USDG : testnetV3StablecoinAddress;
  const chain = isMainnet ? robinhoodMainnet : robinhoodTestnet;
  const explorer = chain.blockExplorers.default.url;

  useEffect(() => {
    function update(event?: Event) {
      const supplied = event instanceof CustomEvent ? event.detail : undefined;
      const stored = supplied ?? JSON.parse(window.localStorage.getItem("rulewallet:embedded-wallets") ?? "[]");
      setEmbeddedRoleWallets(Array.isArray(stored) ? stored.filter((value): value is string => isAddress(value)) : []);
    }
    update();
    window.addEventListener("rulewallet:embedded-wallets", update);
    return () => window.removeEventListener("rulewallet:embedded-wallets", update);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = selectedChainId === 4663 ? "/api/mainnet/status" : "/api/agent/status";
    void fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : undefined)
      .then((status) => {
        const signer = selectedChainId === 4663 ? status?.signer?.address : status?.address;
        if (signer && isAddress(signer)) setAgent((current) => current || getAddress(signer));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [selectedChainId]);

  function validateRoles(owner: Address) {
    if (!name.trim() || name.trim().length > 48) throw new Error("Choose an account name up to 48 characters.");
    if (!isAddress(guardian) || !isAddress(agent) || !isAddress(approver)) {
      throw new Error("Enter valid guardian, agent, and approver addresses.");
    }
    const roles = [owner, getAddress(guardian), getAddress(agent), getAddress(approver)].map((value) =>
      value.toLowerCase(),
    );
    if (new Set(roles).size !== roles.length) {
      throw new Error("Owner, guardian, agent, and approver must be separate addresses.");
    }
    return {
      guardian: getAddress(guardian),
      agent: getAddress(agent),
      approver: getAddress(approver),
    };
  }

  async function createPreview() {
    setError(undefined);
    setResult(undefined);
    if (!connection.address || !publicClient) {
      setError("Connect the owner wallet first.");
      return;
    }
    if (!factory || !stablecoin) {
      setError(
        isMainnet
          ? "The pinned V3 mainnet factory is not configured. No real-funds account can be deployed."
          : "The V3 testnet factory and six-decimal test stablecoin are not configured.",
      );
      return;
    }
    setBusy("preview");
    try {
      const roles = validateRoles(connection.address);
      const verification = await verifyFactoryV3(publicClient, factory, {
        chainId: selectedChainId,
        canonicalStablecoin: stablecoin,
      });
      if (!verification.verified) {
        throw new Error("Factory provenance failed. Runtime, helpers, chain, version, or stablecoin differs from this release.");
      }
      const salt = keccak256(
        stringToHex(`${connection.address.toLowerCase()}:${name.trim()}:${crypto.randomUUID()}`),
      );
      const args = [roles.guardian, roles.agent, [roles.approver], 1, salt] as const;
      const predictedAccount = await publicClient.readContract({
        address: factory,
        abi: ruleWalletFactoryV3Abi,
        functionName: "predictAccountAddress",
        args: [connection.address, ...args],
      }) as Address;
      await publicClient.simulateContract({
        address: factory,
        abi: ruleWalletFactoryV3Abi,
        functionName: "deployAccount",
        args,
        account: connection.address,
      });
      setPreview({
        chainId: selectedChainId,
        factory,
        predictedAccount: getAddress(predictedAccount),
        guardian: roles.guardian,
        agent: roles.agent,
        approver: roles.approver,
        salt,
        calldata: encodeFunctionData({
          abi: ruleWalletFactoryV3Abi,
          functionName: "deployAccount",
          args,
        }),
        name: name.trim(),
      });
    } catch (caught) {
      setPreview(undefined);
      setError(message(caught));
    } finally {
      setBusy(undefined);
    }
  }

  async function deploy() {
    if (!preview || !connection.address || !publicClient) return;
    setBusy("deploy");
    setError(undefined);
    try {
      if (connection.chainId !== preview.chainId) {
        await switchChainAsync({ chainId: preview.chainId });
      }
      const currentWallet = walletClient.data;
      if (!currentWallet) throw new Error("The owner wallet is not available on the selected network.");
      const args = [preview.guardian, preview.agent, [preview.approver], 1, preview.salt] as const;
      const simulation = await publicClient.simulateContract({
        address: preview.factory,
        abi: ruleWalletFactoryV3Abi,
        functionName: "deployAccount",
        args,
        account: connection.address,
      });
      const transactionHash = await currentWallet.writeContract(simulation.request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
      if (receipt.status !== "success") throw new Error("The account deployment reverted.");
      const deployed = { ...preview, transactionHash };
      setResult(deployed);
      onAccountCreated?.(deployed.predictedAccount);
      setPreview(undefined);
      const storageKey = `rulewallet:v3-accounts:${connection.address.toLowerCase()}`;
      const existing = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as DeploymentResult[];
      window.localStorage.setItem(storageKey, JSON.stringify([...existing, deployed]));
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <Card className="border-primary/25">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Plus className="size-5 text-primary" /> Create a named V3 account</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              The versioned factory creates a personal non-upgradeable account. Previewing is read-only;
              deployment happens only after you press Sign and confirm in your wallet.
            </CardDescription>
          </div>
          <div className="flex rounded-lg border border-primary/20 bg-primary/[0.04] p-1">
            <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${!isMainnet ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => { setSelectedChainId(46630); setPreview(undefined); }}>Testnet</button>
            <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${isMainnet ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => { setSelectedChainId(4663); setPreview(undefined); }}>Mainnet</button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label htmlFor="account-name">Account name</Label><Input id="account-name" className="mt-2" value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div><Label>Network</Label><div className="mt-2 flex h-10 items-center rounded-lg border border-primary/20 bg-muted/50 px-3 text-sm"><Network className="mr-2 size-4 text-primary" /> {chain.name} · {selectedChainId}</div></div>
          <div><Label htmlFor="guardian-address">Guardian address</Label><Input id="guardian-address" className="mt-2 font-mono" value={guardian} onChange={(event) => setGuardian(event.target.value)} placeholder="Separate emergency wallet 0x…" /></div>
          <div><Label htmlFor="agent-address">Agent address</Label><Input id="agent-address" className="mt-2 font-mono" value={agent} onChange={(event) => setAgent(event.target.value)} placeholder="Restricted automation signer 0x…" /></div>
          <div className="md:col-span-2"><Label htmlFor="approver-address">Approver address</Label><Input id="approver-address" className="mt-2 font-mono" value={approver} onChange={(event) => setApprover(event.target.value)} placeholder="Independent reviewer 0x…" /></div>
        </div>

        {embeddedRoleWallets.length > 1 ? (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-4">
            <p className="text-sm font-medium">Quick-fill embedded role addresses</p>
            <p className="mt-1 text-xs text-muted-foreground">Convenient for a low-value beta. Independent devices and recovery methods provide stronger separation.</p>
            <div className="mt-3 flex flex-wrap gap-2">{embeddedRoleWallets.filter((value) => value.toLowerCase() !== connection.address?.toLowerCase()).map((value, index) => <div key={value} className="flex gap-1"><Button type="button" size="sm" variant="outline" onClick={() => setGuardian(value)}>Wallet {index + 2} → guardian</Button><Button type="button" size="sm" variant="outline" onClick={() => setApprover(value)}>→ approver</Button></div>)}</div>
          </div>
        ) : null}

        {!factory || !stablecoin ? (
          <Alert className="border-amber-500/30 bg-amber-50"><ShieldAlert /><AlertTitle>{isMainnet ? "V3 mainnet deployment is closed" : "V3 testnet operator setup is incomplete"}</AlertTitle><AlertDescription>{isMainnet ? "A runtime-pinned 3.0.0-commerce-beta factory has not been configured. Existing preview controls do not make an older factory compatible." : "Deploy and verify the shared V3 factory and six-decimal test token, then set the public addresses in Vercel."}</AlertDescription></Alert>
        ) : null}

        <Button onClick={() => void createPreview()} disabled={Boolean(busy) || !factory || !stablecoin}>
          {busy === "preview" ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
          Simulate exact deployment
        </Button>

        {preview ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.035] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-medium text-primary">Simulation passed</p><p className="mt-1 text-sm text-muted-foreground">Review the exact chain, factory, predicted account, roles, value, and calldata.</p></div>
              <Badge variant="outline">0 ETH value</Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Chain</dt><dd className="mt-1 font-mono">{preview.chainId}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Factory</dt><dd className="mt-1 break-all font-mono text-xs">{preview.factory}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Predicted account</dt><dd className="mt-1 break-all font-mono text-xs">{preview.predictedAccount}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Approval rule</dt><dd className="mt-1">1 of 1 independent approver</dd></div>
              <div className="md:col-span-2"><dt className="text-xs text-muted-foreground">Calldata</dt><dd className="mt-1 max-h-24 overflow-auto break-all rounded-lg bg-white p-3 font-mono text-[10px]">{preview.calldata}</dd></div>
            </dl>
            <Alert className="mt-4"><Wallet /><AlertTitle>Wallet signature required</AlertTitle><AlertDescription>{isMainnet ? "This is a real mainnet contract deployment and spends real ETH for gas. No assets are deposited automatically." : "This spends valueless testnet ETH for gas. No account funding occurs automatically."}</AlertDescription></Alert>
            <Button className="mt-4" onClick={() => void deploy()} disabled={Boolean(busy)}>{busy === "deploy" ? <LoaderCircle className="animate-spin" /> : <Wallet />} Sign deployment in wallet</Button>
          </div>
        ) : null}

        {result ? (
          <Alert className="border-primary/35 bg-primary/[0.05]"><CheckCircle2 /><AlertTitle>{result.name} deployed</AlertTitle><AlertDescription><span className="font-mono">{shortAddress(result.predictedAccount)}</span>{" "}<a href={`${explorer}/tx/${result.transactionHash}`} target="_blank" rel="noreferrer">Open receipt <ExternalLink className="inline size-3" /></a></AlertDescription></Alert>
        ) : null}
        {error ? <Alert variant="destructive"><ShieldAlert /><AlertTitle>Account not created</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <p className="text-xs text-muted-foreground"><Copy className="mr-1 inline size-3" /> Names are saved on this device in the current beta; ownership and account addresses are always discoverable from the factory onchain.</p>
      </CardContent>
    </Card>
  );
}
