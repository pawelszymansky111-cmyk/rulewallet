"use client";

import {
  useCreateWallet,
  useExportWallet,
  usePrivy,
  useSetWalletRecovery,
  useWallets,
} from "@privy-io/react-auth";
import { Check, Copy, Download, KeyRound, LifeBuoy, LogOut, Plus, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function shortAddress(address: string) {
  return `${address.slice(0, 7)}…${address.slice(-5)}`;
}

export function EmbeddedWalletControl() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const { exportWallet } = useExportWallet();
  const { setWalletRecovery } = useSetWalletRecovery();
  const [copied, setCopied] = useState<string>();
  const [providerAction, setProviderAction] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const embedded = wallets.filter((wallet) => wallet.walletClientType === "privy");
  const embeddedAddressKey = embedded.map((wallet) => wallet.address).join(",");

  useEffect(() => {
    if (!walletsReady) return;
    const addresses = embeddedAddressKey ? embeddedAddressKey.split(",") : [];
    window.localStorage.setItem("rulewallet:embedded-wallets", JSON.stringify(addresses));
    window.dispatchEvent(new CustomEvent("rulewallet:embedded-wallets", { detail: addresses }));
  }, [embeddedAddressKey, walletsReady]);

  async function copy(address: string) {
    await navigator.clipboard.writeText(address);
    setCopied(address);
    window.setTimeout(() => setCopied(undefined), 1_500);
  }

  async function addWallet() {
    setError(undefined);
    setNotice(undefined);
    setProviderAction("create");
    let created = false;
    const needsRecoverySetup = embedded.length === 0;
    try {
      await createWallet(embedded.length > 0 ? { createAdditional: true } : undefined);
      created = true;
      if (needsRecoverySetup) {
        setProviderAction("recovery");
        await setWalletRecovery();
        setNotice("Wallet created and the provider recovery flow completed.");
      } else {
        setNotice("Additional wallet created. Verify its provider recovery coverage and secure export before funding it.");
      }
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "The provider flow did not finish.";
      setError(created
        ? `The wallet was created, but recovery setup did not finish: ${detail}`
        : `Wallet creation failed: ${detail}`);
    } finally {
      setProviderAction(undefined);
    }
  }

  async function configureRecovery() {
    setError(undefined);
    setNotice(undefined);
    setProviderAction("recovery");
    try {
      await setWalletRecovery();
      setNotice("The provider recovery flow completed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Recovery setup failed.");
    } finally {
      setProviderAction(undefined);
    }
  }

  async function exportEmbeddedWallet(address: string) {
    setError(undefined);
    setNotice(undefined);
    setProviderAction(`export:${address}`);
    try {
      await exportWallet({ address });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet export failed.");
    } finally {
      setProviderAction(undefined);
    }
  }

  return (
    <Card className="border-primary/25 bg-white/90">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" /> Passkey wallet
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Create a recoverable embedded owner wallet without installing an extension. RuleWallet never
              receives or stores its private key.
            </CardDescription>
          </div>
          {authenticated ? (
            <Button variant="outline" onClick={() => void logout()}>
              <LogOut /> Sign out
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ready ? <p className="text-sm text-muted-foreground">Loading secure wallet provider…</p> : null}
        {ready && !authenticated ? (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5">
            <p className="font-medium">Sign in with a passkey, email, or an existing wallet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A new embedded wallet is created only after you authenticate with the configured provider.
            </p>
            <Button className="mt-4" onClick={() => login({ loginMethods: ["passkey", "email", "wallet"] })}>
              <ShieldCheck /> Create or unlock wallet
            </Button>
          </div>
        ) : null}
        {authenticated && walletsReady && embedded.length === 0 ? (
          <div className="rounded-xl border border-dashed border-primary/30 p-5">
            <p className="font-medium">No embedded wallet found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one protected by your authenticated provider session.
            </p>
            <Button className="mt-4" onClick={() => void addWallet()} disabled={Boolean(providerAction)}>
              <Plus /> {providerAction === "create" ? "Creating wallet…" : providerAction === "recovery" ? "Set recovery to finish…" : "Create wallet with recovery"}
            </Button>
          </div>
        ) : null}
        {embedded.map((wallet) => (
          <div
            key={wallet.address}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.035] p-4"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Wallet className="size-5" />
              </span>
              <div>
                <p className="font-medium">Embedded wallet {embedded.indexOf(wallet) + 1}</p>
                <p className="font-mono text-xs text-muted-foreground">{shortAddress(wallet.address)}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => void copy(wallet.address)}>
              {copied === wallet.address ? <Check /> : <Copy />}
              {copied === wallet.address ? "Copied" : "Copy address"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void exportEmbeddedWallet(wallet.address)}
              disabled={Boolean(providerAction)}
            >
              <Download />
              {providerAction === `export:${wallet.address}` ? "Opening secure export…" : "Export securely"}
            </Button>
          </div>
        ))}
        {authenticated && walletsReady && embedded.length > 0 ? (
          <div className="space-y-4 rounded-xl border border-dashed border-primary/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Recovery and portability</p>
                <p className="mt-1 text-xs text-muted-foreground">Recovery and export open the wallet provider&apos;s isolated flow. RuleWallet cannot read the recovery secret or exported key.</p>
              </div>
              <Button variant="outline" onClick={() => void configureRecovery()} disabled={Boolean(providerAction)}>
                <LifeBuoy /> {providerAction === "recovery" ? "Opening recovery…" : "Set recovery method"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/15 pt-4">
              <div>
                <p className="text-sm font-medium">Need a separate role address?</p>
                <p className="mt-1 text-xs text-muted-foreground">Create another embedded address for a low-value beta guardian or approver.</p>
              </div>
              <Button variant="outline" onClick={() => void addWallet()} disabled={Boolean(providerAction)}><Plus /> {providerAction === "create" ? "Creating…" : "Create another wallet"}</Button>
            </div>
          </div>
        ) : null}
        {notice ? <p role="status" className="text-sm text-primary">{notice}</p> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <p className="text-xs leading-5 text-muted-foreground">
          Embedded wallet availability depends on `NEXT_PUBLIC_PRIVY_APP_ID` and the provider dashboard. New
          wallets use an explicit create-then-recovery flow. Do not fund a new wallet until recovery is complete.
          For larger balances, use a hardware wallet as owner and
          independently recovered guardian and approver wallets.
        </p>
      </CardContent>
    </Card>
  );
}
