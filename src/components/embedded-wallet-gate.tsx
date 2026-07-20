"use client";

import { EmbeddedWalletControl } from "@/components/embedded-wallet-control";

export function EmbeddedWalletGate({ configured }: { configured: boolean }) {
  if (configured) return <EmbeddedWalletControl />;
  return (
    <div className="rounded-2xl border border-dashed border-amber-500/35 bg-amber-50/70 p-5">
      <p className="font-medium text-amber-950">Passkey wallet provider not configured</p>
      <p className="mt-1 text-sm leading-6 text-amber-900/75">
        Existing wallets still work. Add the public Privy app and client IDs in Vercel to enable account
        creation; never add a wallet private key.
      </p>
    </div>
  );
}
