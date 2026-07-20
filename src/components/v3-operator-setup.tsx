"use client";

import factoryArtifact from "@/generated/rulewallet-factory-v3.json";
import testTokenArtifact from "@/generated/rulewallet-test-usdg.json";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Factory,
  Fuel,
  LoaderCircle,
  Network,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import {
  encodeDeployData,
  getAddress,
  getContractAddress,
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
import { robinhoodMainnet, robinhoodTestnet } from "@/lib/chains";
import { ROBINHOOD_MAINNET_USDG } from "@/lib/mainnet-registry";
import { verifyFactoryV3 } from "@/lib/v3-factory";

const factoryAbi = factoryArtifact.abi as Abi;
const factoryBytecode = factoryArtifact.bytecode as Hex;
const tokenAbi = testTokenArtifact.abi as Abi;
const tokenBytecode = testTokenArtifact.bytecode as Hex;

type DeploymentPreview = {
  kind: "test-token" | "factory";
  chainId: 4663 | 46630;
  nonce: bigint;
  predictedAddress: Address;
  data: Hex;
  gas: bigint;
  stablecoin?: Address;
};

type DeploymentReceipt = {
  address: Address;
  transactionHash: Hash;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("User rejected")) return "The wallet rejected the transaction.";
    return error.message.split("\n")[0];
  }
  return "The operator transaction failed.";
}

export function V3OperatorSetup() {
  const account = useAccount();
  const [chainId, setChainId] = useState<4663 | 46630>(46630);
  const publicClient = usePublicClient({ chainId });
  const walletClient = useWalletClient({ chainId });
  const { switchChainAsync } = useSwitchChain();
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState<DeploymentPreview>();
  const [testToken, setTestToken] = useState<DeploymentReceipt>();
  const [factory, setFactory] = useState<DeploymentReceipt>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const isMainnet = chainId === 4663;
  const chain = isMainnet ? robinhoodMainnet : robinhoodTestnet;
  const explorer = chain.blockExplorers.default.url;

  async function prepare(kind: DeploymentPreview["kind"]) {
    setError(undefined);
    setFactory(undefined);
    if (!account.address || !publicClient) {
      setError("Connect the operator wallet first.");
      return;
    }
    if (kind === "test-token" && isMainnet) {
      setError("The valueless test token is permanently blocked from Robinhood Chain mainnet.");
      return;
    }
    const stablecoin = isMainnet ? ROBINHOOD_MAINNET_USDG : testToken?.address;
    if (kind === "factory" && !stablecoin) {
      setError("Deploy and confirm the six-decimal tUSDG test token first.");
      return;
    }
    setBusy(`prepare-${kind}`);
    try {
      if (kind === "factory" && stablecoin) {
        const [code, decimals] = await Promise.all([
          publicClient.getCode({ address: stablecoin }),
          publicClient.readContract({
            address: stablecoin,
            abi: tokenAbi,
            functionName: "decimals",
          }),
        ]);
        if (!code || code === "0x" || decimals !== 6) {
          throw new Error("Stablecoin verification failed: deployed code with exactly six decimals is required.");
        }
      }
      const nonce = await publicClient.getTransactionCount({ address: account.address });
      const data = kind === "test-token"
        ? encodeDeployData({ abi: tokenAbi, bytecode: tokenBytecode, args: [BigInt(chainId)] })
        : encodeDeployData({ abi: factoryAbi, bytecode: factoryBytecode, args: [BigInt(chainId), stablecoin!] });
      const gas = await publicClient.estimateGas({ account: account.address, data });
      setPreview({
        kind,
        chainId,
        nonce: BigInt(nonce),
        predictedAddress: getContractAddress({ from: account.address, nonce: BigInt(nonce) }),
        data,
        gas,
        stablecoin,
      });
    } catch (caught) {
      setPreview(undefined);
      setError(errorMessage(caught));
    } finally {
      setBusy(undefined);
    }
  }

  async function deploy() {
    if (!preview || !account.address || !publicClient) return;
    setBusy("deploy");
    setError(undefined);
    try {
      if (account.chainId !== preview.chainId) await switchChainAsync({ chainId: preview.chainId });
      const wallet = walletClient.data;
      if (!wallet) throw new Error("Wallet client unavailable on the selected network.");
      const currentNonce = await publicClient.getTransactionCount({ address: account.address });
      if (BigInt(currentNonce) !== preview.nonce) {
        throw new Error("The operator nonce changed after preview. Simulate again before signing.");
      }
      const transactionHash = preview.kind === "test-token"
        ? await wallet.deployContract({
            account: account.address,
            chain,
            abi: tokenAbi,
            bytecode: tokenBytecode,
            args: [BigInt(preview.chainId)],
          })
        : await wallet.deployContract({
            account: account.address,
            chain,
            abi: factoryAbi,
            bytecode: factoryBytecode,
            args: [BigInt(preview.chainId), preview.stablecoin!],
          });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
      if (receipt.status !== "success" || !receipt.contractAddress) {
        throw new Error("Deployment did not produce a successful contract receipt.");
      }
      if (getAddress(receipt.contractAddress) !== preview.predictedAddress) {
        throw new Error("Deployed address differs from the exact preview.");
      }
      if (preview.kind === "test-token") {
        setTestToken({ address: getAddress(receipt.contractAddress), transactionHash });
      } else {
        const verification = await verifyFactoryV3(publicClient, getAddress(receipt.contractAddress), {
          chainId: preview.chainId,
          canonicalStablecoin: preview.stablecoin!,
        });
        if (!verification.verified) {
          throw new Error("Deployed factory failed the complete runtime and helper provenance check.");
        }
        setFactory({ address: getAddress(receipt.contractAddress), transactionHash });
      }
      setPreview(undefined);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(undefined);
    }
  }

  async function faucet() {
    if (!testToken || !account.address || !walletClient.data || !publicClient) return;
    setBusy("faucet");
    setError(undefined);
    try {
      const simulation = await publicClient.simulateContract({
        address: testToken.address,
        abi: tokenAbi,
        functionName: "faucet",
        account: account.address,
      });
      const hash = await walletClient.data.writeContract(simulation.request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The tUSDG faucet transaction reverted.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Factory className="size-5 text-primary" /> V3 platform deployment</CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                Operator-only flow. Each creation transaction is estimated, shown in full, and rechecks the nonce
                before the wallet opens. Nothing broadcasts automatically.
              </CardDescription>
            </div>
            <div className="flex rounded-lg border border-primary/20 bg-primary/[0.04] p-1">
              <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${!isMainnet ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => { setChainId(46630); setPreview(undefined); setFactory(undefined); }}>Testnet</button>
              <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${isMainnet ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => { setChainId(4663); setPreview(undefined); setFactory(undefined); }}>Mainnet</button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert className={isMainnet ? "border-red-400/35 bg-red-50" : "border-amber-400/30 bg-amber-50"}>
            <AlertTriangle />
            <AlertTitle>{isMainnet ? "Real mainnet gas and immutable production contracts" : "Valueless public testnet deployment"}</AlertTitle>
            <AlertDescription>
              {isMainnet
                ? "Deploying the factory spends real ETH for gas. It does not fund user accounts or enable autonomy. Review the bytecode, constructor arguments, predicted address, and gas before signing."
                : "tUSDG has no value and is not the official mainnet token. It cannot be constructed for chain 4663."}
            </AlertDescription>
          </Alert>
          <label className="flex items-start gap-3 rounded-xl border border-primary/20 p-4 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-green-600" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I understand which network is selected and will review every field before signing in my wallet.</span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            {!isMainnet ? (
              <Card className="bg-muted/25">
                <CardHeader><Badge variant="outline" className="w-fit">Step 1</Badge><CardTitle className="mt-2 text-lg">Deploy tUSDG</CardTitle><CardDescription>Six decimals, 1,000-token daily faucet, testnet-only constructor.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {testToken ? <p className="break-all font-mono text-xs text-primary">{testToken.address}</p> : null}
                  <Button variant="outline" onClick={() => void prepare("test-token")} disabled={!confirmed || Boolean(busy)}><Fuel /> Simulate token</Button>
                  {testToken ? <Button variant="outline" onClick={() => void faucet()} disabled={Boolean(busy)}><Wallet /> Mint 1,000 tUSDG</Button> : null}
                </CardContent>
              </Card>
            ) : null}
            <Card className="bg-muted/25">
              <CardHeader><Badge variant="outline" className="w-fit">{isMainnet ? "Step 1" : "Step 2"}</Badge><CardTitle className="mt-2 text-lg">Deploy V3 factory</CardTitle><CardDescription>Creates and pins the registry helper and account deployer in its constructor.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {factory ? <p className="break-all font-mono text-xs text-primary">{factory.address}</p> : null}
                <Button variant="outline" onClick={() => void prepare("factory")} disabled={!confirmed || Boolean(busy) || (!isMainnet && !testToken)}><Factory /> Simulate factory</Button>
              </CardContent>
            </Card>
          </div>

          {preview ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.035] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">Exact {preview.kind === "factory" ? "factory" : "test-token"} creation request</p><p className="mt-1 text-sm text-muted-foreground">Simulation and gas estimation passed.</p></div><Badge variant="outline">Value 0 ETH</Badge></div>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Chain</dt><dd className="mt-1 font-mono">{preview.chainId}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Estimated gas</dt><dd className="mt-1 font-mono">{preview.gas.toString()}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Nonce</dt><dd className="mt-1 font-mono">{preview.nonce.toString()}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Predicted address</dt><dd className="mt-1 break-all font-mono text-xs">{preview.predictedAddress}</dd></div>
                {preview.stablecoin ? <div className="md:col-span-2"><dt className="text-xs text-muted-foreground">Canonical stablecoin constructor argument</dt><dd className="mt-1 break-all font-mono text-xs">{preview.stablecoin}</dd></div> : null}
                <div className="md:col-span-2"><dt className="text-xs text-muted-foreground">Complete creation bytecode</dt><dd className="mt-1 max-h-32 overflow-auto break-all rounded-lg bg-white p-3 font-mono text-[9px] leading-4">{preview.data}</dd></div>
              </dl>
              <Button className="mt-4" onClick={() => void deploy()} disabled={Boolean(busy)}>{busy === "deploy" ? <LoaderCircle className="animate-spin" /> : <Wallet />} Sign exact creation transaction</Button>
            </div>
          ) : null}

          {factory ? (
            <Alert className="border-primary/35 bg-primary/[0.05]"><CheckCircle2 /><AlertTitle>Factory runtime and helpers verified</AlertTitle><AlertDescription>
              <a href={`${explorer}/tx/${factory.transactionHash}`} target="_blank" rel="noreferrer">Open deployment receipt <ExternalLink className="inline size-3" /></a>
              <span className="mt-3 block">Set <code>{isMainnet ? "NEXT_PUBLIC_RULEWALLET_MAINNET_V3_FACTORY_ADDRESS" : "NEXT_PUBLIC_RULEWALLET_TESTNET_V3_FACTORY_ADDRESS"}</code> to <code>{factory.address}</code>{!isMainnet && testToken ? <> and <code>NEXT_PUBLIC_RULEWALLET_TESTNET_STABLECOIN_ADDRESS</code> to <code>{testToken.address}</code></> : null}.</span>
            </AlertDescription></Alert>
          ) : null}
          {error ? <Alert variant="destructive"><AlertTriangle /><AlertTitle>Operator action stopped</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <p className="text-xs text-muted-foreground"><ShieldCheck className="mr-1 inline size-3" /> The UI never accepts a deployer private key. Public addresses are safe to copy into Vercel; wallet secrets are not.</p>
        </CardContent>
      </Card>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Network className="size-3" /> Selected network: {chain.name} · <Copy className="size-3" /> Copy only public contract addresses.</div>
    </div>
  );
}
